const express = require("express");
const router = express.Router();
const { sequelize } = require("../config/db");
const initModels = require("../models/init-models");
const models = initModels(sequelize);
const { assignmentdetails_staging, assignmentdetails, approver_staging, userlogins } = models;
const sendEmail = require("../utils/sendEmail");

router.post("/freepool", async (req, res) => {
    const transaction = await sequelize.transaction();
    try {
        console.log("Received request body:", req.body);

        const { asset_id, requested_by } = req.body;

        if (!asset_id || !requested_by) {
            await transaction.rollback();
            return res.status(400).json({ error: "Missing required fields." });
        }

        // Fetch asset details to determine assigned_type
        const assetDetails = await assignmentdetails.findOne({
            where: { asset_id },
            attributes: ["assignment_status"],
            transaction
        });

        if (!assetDetails) {
            await transaction.rollback();
            return res.status(404).json({ error: "Asset not found in assignment details." });
        }

        let assignedType;
        if (assetDetails.assignment_status === "Assigned") {
            assignedType = "Assign-Free";
        } else if (assetDetails.assignment_status === "Under Maintenance") {
            assignedType = "Under-Free";
        } else {
            await transaction.rollback();
            return res.status(400).json({ error: "Invalid assignment status for Free Pool." });
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
        });

        if (!approverDetails) {
            await transaction.rollback();
            return res.status(404).json({ error: "Approver not found." });
        }

        // Send email notification to approver
        await sendEmail({
            to: approverDetails.email,
            subject: "New Free Pool Asset Request",
            html: `<p>A new asset has been moved to the Free Pool. Asset ID: ${asset_id}.</p>`,
        });

        // Create a record in assignmentdetails_staging
        const asset = await assignmentdetails_staging.create({
            asset_id,
            assigned_to: "", // No assignee for free pool
            assigned_type: assignedType, // ✅ Dynamically setting assigned_type
            assignment_status: "In Progress",
            assigned_date: new Date(), 
        }, { transaction });

        // Create a record in approver_staging
        await approver_staging.create({
            assignment_id: asset.assignment_id,
            requested_by,
            requested_to: approverDetails.emp_id,
            approval_status: "Pending"
        }, { transaction });

        await transaction.commit();
        res.json({ message: "Asset moved to Free Pool successfully!" });

    } catch (error) {
        console.error("Error processing request:", error);
        await transaction.rollback();
        res.status(500).json({ error: "Failed to move asset.", details: error.message });
    }
});

module.exports = router;
