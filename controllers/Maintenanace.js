const express = require("express");
const router = express.Router();
const { sequelize } = require("../config/db");
const initModels = require("../models/init-models");
const models = initModels(sequelize);
const { assignmentdetails_staging, approver_staging, userlogins } = models;
const sendEmail = require("../utils/sendEmail");

router.post("/maintenance", async (req, res) => {
    const transaction = await sequelize.transaction();
    try {
        console.log("Received request body:", req.body);

        const { asset_id, requested_by } = req.body;

        if (!asset_id || !requested_by) {
            await transaction.rollback();
            return res.status(400).json({ error: "Missing required fields." });
        }

        // Fetch requestor details
        const requestor = await userlogins.findOne({
            where: { emp_id: requested_by },
            attributes: ["emp_id", "emp_name", "email"],
            transaction
        });

        if (!requestor) {
            await transaction.rollback();
            return res.status(404).json({ error: "Requestor not found." });
        }

        // Fetch approver details
        const approverDetails = await userlogins.findOne({
            where: { designation_name: "HO" },
            attributes: ["emp_id", "email"],
            transaction
        }) || { emp_id: "0000", email: "default-approver@company.com" };

        // Send email notification to approver
        await sendEmail({
            to: approverDetails.email,
            subject: "New Asset Under Maintenance Request",
            html: `<p>A new asset maintenance request has been submitted for Asset ID: ${asset_id}.</p>`,
        });

        // Create a record in assignmentdetails_staging
        const asset = await assignmentdetails_staging.create({
            asset_id,
            assigned_to: null, // No assignee for maintenance
            assigned_type: "Free-Under",
            assignment_status: "In Progress",
            assigned_date: new Date(), // ✅ Set assigned_date explicitly
        }, { transaction });

        // Create a record in approver_staging
        await approver_staging.create({
            assignment_id: asset.assignment_id,
            requested_by,
            requested_to: approverDetails.emp_id,
            approval_status: "Pending"
        }, { transaction });

        await transaction.commit();
        res.json({ message: "Asset moved to Under Maintenance successfully!" });

    } catch (error) {
        console.error("Error processing request:", error);
        await transaction.rollback();
        res.status(500).json({ error: "Failed to move asset.", details: error.message });
    }
});

module.exports = router;
