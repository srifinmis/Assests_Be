const express = require("express");
const router = express.Router();
const { sequelize } = require("../../config/db");
const initModels = require("../../models/init-models");
const models = initModels(sequelize);
const sendEmail = require("../../utils/sendEmail");
const { Op } = require("sequelize");

const {
  assignmentdetails_staging,
  assetmaster,
  userlogins,
  approver_staging,
  approver,
  assignmentdetails,
} = models;

// API to fetch pending under assignments with Free-Under type
router.get("/free-under-assets", async (req, res) => {
  try {
    // Find all pending approval requests
    const pendingApprovals = await approver_staging.findAll({
      where: { approval_status: "Pending" },
      attributes: ["request_num", "assignment_id"],
    });

    if (!pendingApprovals.length) {
      return res.json({ message: "No pending approvals found." });
    }

    // Extract assignment IDs
    const assignmentIds = pendingApprovals.map((a) => a.assignment_id);

    // Fetch assignment details where assigned_type is "Free-Assign" and status is "In Progress"
    const assignments = await assignmentdetails_staging.findAll({
      where: {
        assignment_id: assignmentIds,
        assigned_type: "Free-Under",
        assignment_status: "In Progress",
      },
      attributes: ["assignment_id", "asset_id", "assignment_status"],
      include: [
        {
          model: assetmaster,
          as: "asset",
          attributes: ["asset_type", "brand", "model", "imei_num"], // Fetch asset details
        },
        {
          model: userlogins,
          as: "system",
          attributes: [
            "emp_id",
            "emp_name",
            "designation_name",
            "department_name",
            "branchid_name",
            "areaid_name",
            "regionid_name",
            "clusterid_name",
            "state",
          ],
        },
      ],
    });

    if (!assignments.length) {
      return res.json({ message: "No matching assignments found for pending approvals." });
    }

    // Map results to match the required response format
    const results = assignments.map((assign) => {
      const approval = pendingApprovals.find((a) => a.assignment_id === assign.assignment_id);
      return {
        request_num: approval.request_num,
        asset_id: assign.asset_id,
        asset_type: assign.asset?.asset_type, // Include asset_type
        asset_name: `${assign.asset?.brand} - ${assign.asset?.model}`, // Construct Asset Name
        imei_num: assign.asset?.imei_num,
        system: assign.system, // Ensure assigned_to details are inside 'system'
        assignment_status: assign.assignment_status,
      };
    });

    res.json(results);
  } catch (error) {
    console.error("Error fetching pending assignments:", error);
    res.status(500).json({ error: "An error occurred while retrieving data." });
  }
});

// Approve Assignments

// router.post("/approve", async (req, res) => {
//   const { approved_by, requestNums, remarks } = req.body;

//   // Start transaction
//   const transaction = await sequelize.transaction();

//   try {
//     // Fetch approver details
//     const approver = await models.userlogins.findOne({
//       where: { emp_id: approved_by },
//       attributes: ["emp_id", "emp_name", "email"],
//       transaction,
//     });

//     if (!approver) {
//       await transaction.rollback();
//       return res.status(404).json({ error: "Approver not found." });
//     }

//     // Update approver_staging table
//     await models.approver_staging.update(
//       {
//         approved_by,
//         approved_at: new Date(),
//         approval_status: "Accepted",
//         remarks: remarks || null,
//       },
//       {
//         where: {
//           request_num: { [Op.in]: requestNums },
//           approval_status: "Pending",
//         },
//         transaction,
//       }
//     );

//     // Update assignmentdetails_staging table
//     await models.assignmentdetails_staging.update(
//       {
//         assigned_type: "Accepted",
//         assignment_status: "Accepted",
//         updatedat: new Date(),
//       },
//       {
//         where: {
//           assignment_id: { [Op.in]: requestNums },
//           assignment_status: "In Progress",
//         },
//         transaction,
//       }
//     );

//     // Fetch assignment details from staging
//     const approvedAssignments = await models.assignmentdetails_staging.findAll({
//       where: {
//         assignment_id: { [Op.in]: requestNums },
//         assignment_status: "Accepted",
//       },
//       attributes: ["asset_id", "assignment_id", "assigned_type"],
//       transaction,
//     });

//     for (const record of approvedAssignments) {
//       const existingAssignment = await models.assignmentdetails.findOne({
//         where: { asset_id: record.asset_id },
//         transaction,
//       });

//       if (existingAssignment) {
//         // Update existing record
//         await models.assignmentdetails.update(
//           {
//             assignment_id: record.assignment_id,
//             assigned_type: "Accepted",
//             assignment_status: "Assigned", // Changed from "Accepted" to "Assigned"
//             updatedat: new Date(),
//           },
//           {
//             where: { asset_id: record.asset_id },
//             transaction,
//           }
//         );
//       } else {
//         // Create new record
//         await models.assignmentdetails.create(
//           {
//             asset_id: record.asset_id,
//             assignment_id: record.assignment_id,
//             assigned_type: "Accepted",
//             assignment_status: "Under Maintenance", // Changed from "Accepted" to "Under Maintenance"
//             createdat: new Date(),
//             updatedat: new Date(),
//           },
//           { transaction }
//         );
//       }
//     }

//     // Move records from approver_staging to approver table
//     const approvedApprovers = await models.approver_staging.findAll({
//       where: { request_num: { [Op.in]: requestNums } },
//       transaction,
//     });

//     for (const approverRecord of approvedApprovers) {
//       await models.approver.create(approverRecord.toJSON(), { transaction });
//     }

//     // Send email notification
//     await sendEmail({
//       to: approver.email,
//       subject: "Asset Assignment Approved",
//       html: `Your approval for the asset assignment request(s) ${requestNums.join(", ")} has been successfully processed.`,
//     });

//     await transaction.commit();
//     res.status(200).json({ message: "Records approved successfully." });
//   } catch (error) {
//     console.error("Error approving assignments:", error);
//     await transaction.rollback();
//     res.status(500).json({ error: "Internal Server Error" });
//   }
// });

router.post("/approve", async (req, res) => {
  const { approved_by, requestNums, remarks } = req.body;

  // Start transaction
  const transaction = await sequelize.transaction();

  try {
      console.log("Starting approval process...");

      // Fetch approver details
      const approver = await models.userlogins.findOne({
          where: { emp_id: approved_by },
          attributes: ["emp_id", "emp_name", "email"],
          transaction,
      });

      if (!approver) {
          console.error("Approver not found:", approved_by);
          await transaction.rollback();
          return res.status(404).json({ error: "Approver not found." });
      }

      // Update approver_staging table
      await approver_staging.update(
          {
              approved_by,
              approved_at: new Date().toISOString(),
              approval_status: "Accepted",
              remarks: remarks || null,
          },
          {
              where: {
                  request_num: { [Op.in]: requestNums },
                  approval_status: "Pending",
              },
              transaction,
          }
      );

      // Fetch approved assignments
      const approvedAssignments = await assignmentdetails_staging.findAll({
          where: {
              assignment_id: { [Op.in]: requestNums },
              assignment_status: "In Progress",
          },
          attributes: ["assignment_id", "asset_id", "system_id", "remarks"],
          transaction,
      });

      const assetIds = approvedAssignments.map((record) => record.asset_id);

      // Check which assets already exist in assignmentdetails
      const existingAssignments = await assignmentdetails.findAll({
          where: { asset_id: { [Op.in]: assetIds } },
          attributes: ["asset_id"],
          transaction,
      });

      const existingAssetIds = existingAssignments.map((record) => record.asset_id);

      // Prepare bulk update and insert data
      const updates = [];
      const inserts = [];

      for (const record of approvedAssignments) {
          const { asset_id, system_id } = record;

          if (existingAssetIds.includes(asset_id)) {
              // Prepare update data for existing records
              updates.push({
                  asset_id,
                  assignment_status: "Under Maintenance",
                  updated_at: new Date(),
                  remarks: remarks || null,
                  system_id,
              });
          } else {
              // Prepare insert data for new records
              inserts.push({
                  asset_id,
                  assignment_status: "Under Maintenance",
                  updated_at: new Date(),
                  remarks: remarks || null,
                  system_id,
              });
          }
      }

      // Bulk update existing records
      if (updates.length > 0) {
          for (const updateData of updates) {
              await assignmentdetails.update(updateData, {
                  where: { asset_id: updateData.asset_id },
                  transaction,
              });
          }
      }

      // Bulk insert new records
      if (inserts.length > 0) {
          await assignmentdetails.bulkCreate(inserts, { transaction });
      }

      // Update assignmentdetails_staging table
      await assignmentdetails_staging.update(
          {
              assigned_type: "Accepted",
              assignment_status: "Accepted",
              remarks: remarks || null,
              updatedat: new Date(),
          },
          {
              where: {
                  assignment_id: { [Op.in]: requestNums },
                  assignment_status: "In Progress",
              },
              transaction,
          }
      );

      console.log("Approval process completed successfully.");

      // Send approval email
      await sendEmail({
          to: approver.email,
          subject: "Asset Assignment Approved",
          html: `
              <p>Hello ${approver.emp_name},</p>
              <p>Your approval for asset assignment requests (<strong>${requestNums.join(", ")}</strong>) has been successfully processed.</p>
              <p>Remarks: ${remarks || "No remarks provided."}</p>
              <p>Regards,</p>
              <p>Asset Management Team</p>
          `,
      });

      // Commit transaction
      await transaction.commit();

      res.status(200).json({ message: "Records approved successfully." });
  } catch (error) {
      console.error("Error approving assignments:", error);
      await transaction.rollback();
      res.status(500).json({ error: "Internal Server Error" });
  }
});


// Reject Assignments
router.post("/reject", async (req, res) => {
  const { approved_by, requestNums, remarks } = req.body;

  if (!remarks) {
    return res.status(400).json({ error: "Remarks are mandatory for rejection." });
  }

  // Start transaction
  const transaction = await sequelize.transaction();

  try {
    // Fetch user details in ONE query
    const users = await models.userlogins.findAll({
      where: {
        emp_id: { [Op.in]: [approved_by] },
      },
      attributes: ["emp_id", "emp_name", "email", "designation_name", "branchid_name", "regionid_name", "system_id"],
      transaction,
    });

    const approver = users.find(user => user.emp_id === approved_by);
    if (!approver) {
      await transaction.rollback();
      return res.status(404).json({ error: "Approver not found." });
    }

    // Update approver_staging table
    await approver_staging.update(
      {
        approved_by,
        approved_at: new Date().toISOString(),
        approval_status: "Rejected",
        remarks: String(remarks), // Ensure remarks is a string
      },
      {
        where: {
          request_num: { [Op.in]: requestNums },
          approval_status: "Pending",
        },
        transaction,
      }
    );

    // Update assignmentdetails_staging table
    await assignmentdetails_staging.update(
      {
        assigned_type: "Rejected", // Updated assigned_type to "Rejected"
        assignment_status: "Rejected", // Updated status to "Rejected"
        remarks: String(remarks), // Ensure remarks is a string
        updatedat: new Date(),
      },
      {
        where: {
          assignment_id: { [Op.in]: requestNums },
          assignment_status: "In Progress",
        },
        transaction,
      }
    );

    // Fetch rejected approvers
    const rejectedApprovers = await approver_staging.findAll({
      where: { request_num: { [Op.in]: requestNums } },
      transaction,
    });

    // Send email notifications
    const approverEmail = approver.email;
    await sendEmail({
      to: approverEmail,
      subject: "Asset Assignment Rejected",
      html: `Your rejection for the asset assignment request(s) ${requestNums.join(", ")} has been successfully processed.`,
    });

    // Fetch requested_by emails for rejected assets
    const requestedByEmails = await approver_staging.findAll({
      where: { assignment_id: { [Op.in]: requestNums } },
      attributes: ["requested_by"],
      transaction,
    });

    const requestedEmails = requestedByEmails.map(record => record.requested_by);

    const usersRequestingAssets = await models.userlogins.findAll({
      where: {
        emp_id: { [Op.in]: requestedEmails },
      },
      attributes: ["email"],
      transaction,
    });

    usersRequestingAssets.forEach(async (user) => {
      await sendEmail({
        to: user.email,
        subject: "Asset Assignment Rejected",
        html: `Your asset assignment request(s) ${requestNums.join(", ")} have been rejected. Please contact the approver for further details.`,
      });
    });

    // Commit the transaction
    await transaction.commit();

    res.status(200).json({ message: "Records rejected successfully." });
  } catch (error) {
    console.error("Error rejecting assignments:", error);
    await transaction.rollback();
    res.status(500).json({ error: "Internal Server Error" });
  }
});

module.exports = router;
