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

// API to fetch "Under-Free" and "Assign-Free" pending approvals
router.get("/free-assets", async (req, res) => {
  try {
    // Get all pending approval requests
    const pendingApprovals = await approver_staging.findAll({
      where: { approval_status: "Pending" },
      attributes: ["request_num", "assignment_id"],
    });

    if (!pendingApprovals.length) {
      return res.json({ message: "No pending approvals found." });
    }

    // Extract assignment IDs
    const assignmentIds = pendingApprovals.map((a) => a.assignment_id);

    // Fetch matching assignment details
    const assignments = await assignmentdetails_staging.findAll({
      where: {
        assignment_id: { [Op.in]: assignmentIds },
        assigned_type: { [Op.in]: ["Under-Free", "Assign-Free"] },
        assignment_status: "In Progress",
      },
      attributes: ["assignment_id", "asset_id", "assignment_status"],
      include: [
        {
          model: assetmaster,
          as: "asset",
          attributes: ["asset_type", "brand", "model", "imei_num"],
        },
        {
          model: userlogins,
          as: "system",
          attributes: ["emp_id", "emp_name", "designation_name", "department_name"],
        },
      ],
    });

    if (!assignments.length) {
      return res.json({ message: "No matching assignments found for pending approvals." });
    }

    // Map results
    const results = assignments.map((assign) => {
      const approval = pendingApprovals.find((a) => a.assignment_id === assign.assignment_id);
      return {
        request_num: approval.request_num,
        asset_id: assign.asset_id,
        asset_type: assign.asset?.asset_type,
        asset_name: `${assign.asset?.brand} - ${assign.asset?.model}`,
        imei_num: assign.asset?.imei_num,
        system: assign.system,
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
//   const transaction = await sequelize.transaction();

//   try {
//     // Fetch approver details
//     const approver = await userlogins.findOne({
//       where: { emp_id: approved_by },
//       attributes: ["emp_id", "email"],
//       transaction,
//     });

//     if (!approver) {
//       await transaction.rollback();
//       return res.status(404).json({ error: "Approver not found." });
//     }

//     // Update staging tables
//     await Promise.all([
//       approver_staging.update(
//         {
//           approved_by,
//           approved_at: new Date(),
//           approval_status: "Accepted",
//           remarks: remarks || null,
//         },
//         {
//           where: { request_num: { [Op.in]: requestNums }, approval_status: "Pending" },
//           transaction,
//         }
//       ),
//       assignmentdetails_staging.update(
//         {
//           assigned_type: "Accepted",
//           assignment_status: "Accepted",
//           remarks: remarks || null,
//           updatedat: new Date(),
//         },
//         {
//           where: { assignment_id: { [Op.in]: requestNums }, assignment_status: "In Progress" },
//           transaction,
//         }
//       ),
//     ]);

//     // Delete existing records in main table
//     await assignmentdetails.destroy({
//       where: { assignment_id: { [Op.in]: requestNums } },
//       transaction,
//     });

//     // Send approval email
//     await sendEmail({
//       to: approver.email,
//       subject: "Asset Assignment Approved",
//       html: `Your approval for asset assignment requests (${requestNums.join(", ")}) has been processed.`,
//     });

//     await transaction.commit();
//     res.status(200).json({ message: "Records approved successfully." });
//   } catch (error) {
//     console.error("Error approving assignments:", error);
//     await transaction.rollback();
//     res.status(500).json({ error: "Internal Server Error" });
//   }
// });

// Approve Assignments
router.post("/approve", async (req, res) => {
  const { approved_by, requestNums, remarks } = req.body;
  const transaction = await sequelize.transaction();

  try {
    // Fetch approver details
    const approver = await userlogins.findOne({
      where: { emp_id: approved_by },
      attributes: ["emp_id", "email"],
      transaction,
    });

    if (!approver) {
      await transaction.rollback();
      return res.status(404).json({ error: "Approver not found." });
    }

    // Fetch asset IDs linked to requestNums
    const assignedAssets = await assignmentdetails_staging.findAll({
      where: { assignment_id: { [Op.in]: requestNums }, assignment_status: "In Progress" },
      attributes: ["asset_id"],
      raw: true,
      transaction,
    });

    const assetIdsToUpdate = assignedAssets.map((a) => a.asset_id);

    // Update staging tables
    await Promise.all([
      approver_staging.update(
        {
          approved_by,
          approved_at: new Date(),
          approval_status: "Accepted",
          remarks: remarks || null,
        },
        {
          where: { request_num: { [Op.in]: requestNums }, approval_status: "Pending" },
          transaction,
        }
      ),
      assignmentdetails_staging.update(
        {
          assigned_type: "Accepted",
          assignment_status: "Accepted",
          remarks: remarks || null,
          updatedat: new Date(),
        },
        {
          where: { assignment_id: { [Op.in]: requestNums }, assignment_status: "In Progress" },
          transaction,
        }
      ),
    ]);

    // Instead of deleting, update assignment_status in assignmentdetails
    if (assetIdsToUpdate.length > 0) {
      await assignmentdetails.update(
        { assignment_status: "Free Pool", updatedat: new Date() },
        { where: { asset_id: { [Op.in]: assetIdsToUpdate } }, transaction }
      );
    }

    // Send approval email
    await sendEmail({
      to: approver.email,
      subject: "Asset Assignment Approved",
      html: `Your approval for asset assignment requests (${requestNums.join(", ")}) has been processed.`,
    });

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
