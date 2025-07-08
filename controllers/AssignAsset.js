//controllers/AssignAsset.js
const express = require("express");
const router = express.Router();
const { sequelize } = require("../config/db");
const initModels = require("../models/init-models");
const models = initModels(sequelize);
const { assignmentdetails, employee_master, assetmaster } = models;
const sendEmail = require("../utils/sendEmail"); // Import the email utility
const { Op, Sequelize } = require("sequelize");


// Route to fetch asset details based on assetId
// router.get("/details/:assetId", async (req, res) => {
//     try {
//       const { assetId } = req.params;

//       const asset = await assetmaster.findOne({
//         where: { asset_id: assetId },
//         attributes: ["asset_id", "brand", "model", "imei_num"],
//         include: [
//           {
//             model: assignmentdetails,
//             as: "assignmentdetails",
//             include: [{ model: employee_master, as: "system", attributes: ["emp_name"] }],
//           },
//         ],
//       });

//       if (!asset) return res.status(404).json({ error: "Asset not found" });

//       res.json(asset);
//     } catch (error) {
//       console.error("Error fetching asset details:", error);
//       res.status(500).json({ error: "Internal Server Error" });
//     }
// });
router.get("/details/:encodedAssetIds", async (req, res) => {

  const { encodedAssetIds } = req.params;

  try {
    // Decode the assetId if necessary (if it contains encoded characters like '%2F')
    const decodedAssetId = decodeURIComponent(encodedAssetIds);

    // Query the database using the decoded assetId
    const asset = await assetmaster.findOne({
      where: { asset_id: decodedAssetId },  // Use the decoded assetId for the query
      attributes: ["asset_id", "brand", "model", "imei_num"],
      include: [
        {
          model: assignmentdetails,
          as: "assignmentdetails",
          attributes: ["assignment_id", "emp_id", "assigned_date", "assignment_status"],
          include: [{
            model: employee_master,
            as: "emp",
            attributes: ["emp_name"],
            required: false,
            on: Sequelize.literal(
              `CAST("assignmentdetails"."emp_id" AS TEXT) = "assignmentdetails->emp"."emp_id"`
            )
          }],
        },
      ],
    });

    if (!asset) {
      return res.status(404).json({ error: "Asset not found" });
    }
    console.log('result of assets: ', asset)
    res.json(asset);
  } catch (error) {
    console.error("Error fetching asset details:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Route to get all users
router.get("/users", async (req, res) => {
  try {
    const users = await employee_master.findAll({
      attributes: ["emp_id", "emp_name", "email", "designation_name", "branchid_name", "regionid_name"], // Fetch only necessary fields
    });

    res.status(200).json(users);
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).json({ error: "Failed to fetch users" });
  }
});

router.post("/assign", async (req, res) => {
  const transaction = await sequelize.transaction();
  try {

    const { asset_id, assigned_to, requested_by } = req.body;

    // 🔹 Fetch user details in ONE query
    const users = await models.employee_master.findAll({
      where: {
        emp_id: { [Op.in]: [assigned_to, requested_by] },
      },
      attributes: ["emp_id", "emp_name", "email", "designation_name", "branchid_name", "regionid_name", "emp_id"],
      transaction
    });

    // Extract user data
    const requestor = users.find(user => user.emp_id === requested_by);
    const assignee = users.find(user => user.emp_id === assigned_to);

    if (!requestor || !assignee || !assignee.emp_id) {
      await transaction.rollback();
      return res.status(404).json({ error: "Requestor, Assignee, or System ID not found." });
    }

    // Extract emp_id, branch, and region
    const { emp_id, branchid_name, regionid_name } = assignee;

    // 🔹 Fetch or fallback to default approver
    let approverDetails = await models.employee_master.findOne({
      where: { designation_name: "HO" },
      attributes: ["emp_id", "email"],
      transaction
    });

    const fallbackEmail = "default-approver@company.com";
    if (!approverDetails) {
      console.warn("No HO approver found! Using fallback approver.");
      approverDetails = { emp_id: "0000", email: fallbackEmail };
    }

    // 🔹 Send email asynchronously first
    await sendEmail({
      to: approverDetails.email,
      subject: "New Asset Assignment Request",
      html: `
                <p>A new asset assignment request has been submitted for:</p>
                <p><strong>Asset ID:</strong> ${asset_id}</p>        
                <p><strong>Requested by:</strong> ${requestor.emp_name || "Unknown User"}</p>  
                <p><strong>Assigned to:</strong> ${assignee.emp_name || "Unknown User"}</p>  
                <br>
                <p>Please review and approve.</p>
            `,
    });

    // 🔹 Insert into assignmentdetails_staging after successful email sending
    const asset = await models.assignmentdetails_staging.create(
      {
        asset_id,
        assigned_to,
        emp_id,
        assigned_type: "Free-Assign",
        assignment_status: "In Progress",
        assigned_date: new Date().toISOString(),
        remarks: "Assigning asset",
        branchid_name,
        regionid_name
      },
      { transaction }
    );

    // 🔹 Insert into approver_staging
    await models.approver_staging.create({
      assignment_id: asset.assignment_id,
      requested_by,
      assigned_to,
      requested_to: approverDetails.emp_id,
      approval_status: "Pending",
      remarks: "Pending approval"
    }, { transaction });

    // 🔹 Commit transaction after successful email and database insertions
    await transaction.commit();

    return res.json({
      message: "Asset assigned successfully! Approval request sent.",
      assignment_id: asset.assignment_id,  // Assignment ID
      request_no: asset.assignment_id, // Request No (assuming assignment_id is the request number)
    });

  } catch (error) {
    console.error("Error assigning asset:", error);
    await transaction.rollback();
    return res.status(500).json({ error: error.message || "Failed to assign asset." });
  }
});

module.exports = router;
