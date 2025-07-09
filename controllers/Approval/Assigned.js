const express = require("express");
const router = express.Router();
const { sequelize } = require("../../config/db");
const initModels = require("../../models/init-models");
const models = initModels(sequelize);
const sendEmail = require("../../utils/sendEmail");
const { Op, Sequelize } = require("sequelize");


const {
  assignmentdetails_staging,
  assetmaster,
  employee_master,
  approver_staging,
  assignmentdetails,
} = models;

// API to fetch pending asset assignments with Free-Assign type
router.get("/free-assign-assets", async (req, res) => {
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
        assigned_type: "Free-Assign",
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
          model: employee_master,
          as: "emp",
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
          required: false,
          on: Sequelize.literal(
            `CAST("assignmentdetails_staging"."emp_id" AS TEXT) = "emp"."emp_id"`
          )
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

router.post('/action', async (req, res) => {
  const { requestNums, action, approved_by, remarks } = req.body;

  if (!requestNums || !action || !approved_by) {
    return res.status(400).json({ message: 'Missing required parameters' });
  }

  if (action === 'rejected' && !remarks) {
    return res.status(400).json({ message: 'Remarks are mandatory for rejection' });
  }

  const approvalStatus = action === 'approved' ? 'Accepted' : 'Rejected';
  const approvalDate = new Date().toISOString();
  const remarksToUpdate = action === 'rejected' ? remarks : null;

  const assignedType = action === 'approved' ? 'Assigned' : 'Rejected';  // Update to 'Assigned' for approved action
  const assignmentStatus = action === 'approved' ? 'Assigned' : 'Rejected';  // Update to 'Assigned' for approved action

  const transaction = await sequelize.transaction();

  try {
    // Process each request number in bulk
    for (let requestNum of requestNums) {
      const approverRecord = await approver_staging.findOne({
        where: { request_num: requestNum, approval_status: 'Pending' },
        transaction,
      });

      if (!approverRecord) {
        await transaction.rollback();
        return res.status(404).json({ message: `Approver record not found for request ${requestNum}` });
      }

      const assignmentId = approverRecord.assignment_id;

      const approverUser = await models.employee_master.findOne({
        where: { emp_id: approved_by },
        attributes: ["emp_id", "emp_name", "email"],
        transaction,
      });

      if (!approverUser) {
        await transaction.rollback();
        return res.status(404).json({ message: "Approver user not found." });
      }

      // Fetch the requested_by user
      const requestedByUser = await models.employee_master.findOne({
        where: { emp_id: approverRecord.requested_by },
        attributes: ["emp_id", "emp_name", "email"],
        transaction,
      });

      await approver_staging.update(
        {
          approved_by,
          approved_at: approvalDate,
          approval_status: approvalStatus,
          remarks: remarksToUpdate,
        },
        {
          where: { request_num: requestNum, approval_status: 'Pending' },
          transaction,
        }
      );

      await assignmentdetails_staging.update(
        {
          assigned_type: assignedType,
          assignment_status: assignmentStatus,
          remarks: remarksToUpdate,
          updatedat: approvalDate,
        },
        {
          where: { assignment_id: assignmentId, assignment_status: 'In Progress' },
          transaction,
        }
      );

      if (action === 'approved') {
        // Fetch assignmentRow from assignmentdetails_staging
        const assignmentRow = await assignmentdetails_staging.findOne({
          where: { assignment_id: assignmentId },
          transaction,
        });

        if (!assignmentRow) {
          // No matching assignment row found
          await transaction.rollback();
          return res.status(404).json({ message: `Assignment record not found for assignment_id ${assignmentId}` });
        }

        // Check if the asset_id exists in assignmentdetails
        const assignmentExists = await assignmentdetails.findOne({
          where: { asset_id: assignmentRow.asset_id },
          transaction,
        });

        if (assignmentExists) {
          // If asset_id exists, update the record in assignmentdetails with 'Assigned' status
          await assignmentdetails.update(
            {
              assignment_id: assignmentId, // ✅ New ID from staging
              emp_id: assignmentRow.emp_id,
              assigned_date: assignmentRow.assigned_date,
              assignment_status: assignmentStatus, // Usually 'Assigned'
              branchid_name: assignmentRow.branchid_name,
              regionid_name: assignmentRow.regionid_name,
              remarks: remarksToUpdate,
              updatedat: approvalDate, // ✅ Use only this
            },
            {
              where: { asset_id: assignmentRow.asset_id },
              transaction,
            });
        } else {
          // If asset_id doesn't exist, create a new record with 'Assigned' status
          await assignmentdetails.create({
            assignment_id: assignmentRow.assignment_id,
            asset_id: assignmentRow.asset_id,
            emp_id: assignmentRow.emp_id,
            assigned_date: assignmentRow.assigned_date,
            assignment_status: 'Assigned',  // Set status to 'Assigned'
            branchid_name: assignmentRow.branchid_name,
            regionid_name: assignmentRow.regionid_name,
            updatedat: approvalDate,
            remarks: remarksToUpdate,
          }, { transaction });
        }
      }

      // EMAIL LOGIC
      if (action === 'approved') {
        // Send approval email to approver
        await sendEmail({
          to: approverUser.email,
          subject: "Asset Free Pool Request Approved",
          html: `
              <p>Hello ${approverUser.emp_name},</p>
              <p>Your approval for asset Free Pool request <strong>${requestNum}</strong> has been successfully processed.</p>
              <p>Remarks: ${remarks || "No remarks provided."}</p>
              <p>Regards,<br/>Asset Management Team</p>
            `,
        });

        // Send approval email to requestor
        if (requestedByUser) {
          await sendEmail({
            to: requestedByUser.email,
            subject: "Your Asset Free Pool Request Approved",
            html: `
                <p>Hello ${requestedByUser.emp_name},</p>
                <p>Your asset Free Pool request <strong>${requestNum}</strong> has been <b>approved</b>.</p>
                <p>Remarks: ${remarks || "No remarks provided."}</p>
                <p>Regards,<br/>Asset Management Team</p>
              `,
          });
        }
      } else if (action === 'rejected') {
        // Send rejection email to approver
        await sendEmail({
          to: approverUser.email,
          subject: "Asset Free Pool Request Rejected",
          html: `
              <p>Hello ${approverUser.emp_name},</p>
              <p>Your rejection for asset Free Pool request <strong>${requestNum}</strong> has been successfully processed.</p>
              <p>Remarks: ${remarks}</p>
              <p>Regards,<br/>Asset Management Team</p>
            `,
        });

        // Send rejection email to requestor
        if (requestedByUser) {
          await sendEmail({
            to: requestedByUser.email,
            subject: "Your Asset Free Pool Request Rejected",
            html: `
                <p>Hello ${requestedByUser.emp_name},</p>
                <p>Your asset Free Pool request <strong>${requestNum}</strong> has been <b>rejected</b>.</p>
                <p>Remarks: ${remarks}</p>
                <p>Regards,<br/>Asset Management Team</p>
              `,
          });
        }
      }
    }

    await transaction.commit();
    res.status(200).json({ message: `All records ${approvalStatus.toLowerCase()} successfully.` });
  } catch (error) {
    console.error("Error processing bulk action:", error);
    await transaction.rollback();
    res.status(500).json({ message: "Internal Server Error" });
  }
});

module.exports = router;
