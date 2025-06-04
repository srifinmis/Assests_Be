const express = require("express");
const router = express.Router();
const { sequelize } = require("../../config/db");
const initModels = require("../../models/init-models");

const models = initModels(sequelize);
const { debit_card_details } = models;

router.post("/createcustomer", async (req, res) => {
    try {
        const { customerID, loanApplicationNo, instakitNo, issuedDate, requestedBy } = req.body;

        const record = await debit_card_details.findOne({
            where: { docket_id: instakitNo }
        });

        if (!record) {
            return res.status(404).json({ message: "InstakitNo not matching." });
        }

        // Update the record
        await debit_card_details.update(
            {
                customer_id: customerID,
                loan_app_no: loanApplicationNo,
                issue_date: issuedDate,
                cust_assigned_from: requestedBy,
                bo_assigned_date: new Date()
                // updated_at: new Date(), // optional if you want to track updates
            },
            {
                where: { docket_id: instakitNo }
            }
        );

        return res.status(200).json({ message: "✅ Record updated successfully." });

    } catch (err) {
        console.error("Internal error:", err);
        res.status(500).json({ error: "Internal Server Error", details: err.message });
    }
});

module.exports = router;
