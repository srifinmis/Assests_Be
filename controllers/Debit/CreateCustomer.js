const express = require("express");
const router = express.Router();
const { sequelize } = require("../../config/db");
const initModels = require("../../models/init-models");
const { Op } = require('sequelize');
const models = initModels(sequelize);
const { debit_card_details } = models;

//create customer
router.post("/createcustomer", async (req, res) => {
    try {
        const { customerID, loanApplicationNo, instakitNo, issuedDate, requestedBy } = req.body;

        const record = await debit_card_details.findOne({
            where: { docket_id: instakitNo }
        });

        if (!record) {
            return res.status(404).json({ message: "InstakitNo not matching." });
        }
        if (record.bo_status === 'Assigned') {
            return res.status(400).json({ message: "❌ Record already assigned." });
        }
        if (record.customer_id) {
            return res.status(400).json({ message: "❌ Record already assigned to a person." });
        }

        // Update the record
        await debit_card_details.update(
            {
                customer_id: customerID,
                loan_app_no: loanApplicationNo,
                issue_date: issuedDate,
                cust_assigned_from: requestedBy,
                bo_status: 'Assigned',
                bo_assigned_date: new Date()
            },
            { where: { docket_id: instakitNo } }
        );
        return res.status(200).json({ message: "✅ Assigned to Customer successfully." });

    } catch (err) {
        console.error("Internal error:", err);
        res.status(500).json({ error: "Internal Server Error", details: err.message });
    }
});

//all customer details
router.get("/customerdetails", async (req, res) => {
    try {
        const { requestedBy } = req.query;

        if (!requestedBy) {
            return res.status(400).json({ error: "requestedBy parameter is required" });
        }
        const records = await debit_card_details.findAll({
            where: {
                ro_assigned_to: requestedBy,
                bo_status: 'Assigned'
            }
        });
        console.log("reqestedby: ", requestedBy)
        console.log("customers: ", records)

        if (records.length === 0) {
            return res.status(404).json({ message: "No records found for the given requestedBy" });
        }

        res.status(200).json({ data: records });


    } catch (err) {
        console.error("Internal error:", err);
        res.status(500).json({ error: "Internal Server Error", details: err.message });
    }
});

//edit
router.get("/customer/byid", async (req, res) => {
    try {
        const { docket_id } = req.query;
        console.log("recived docket_id : ", docket_id)

        if (!docket_id) {
            return res.status(400).json({ error: "docket Id parameter is required" });
        }
        const records = await debit_card_details.findAll({
            where: {
                docket_id: docket_id
            }
        });
        // console.log("customers: ",records)

        if (records.length === 0) {
            return res.status(404).json({ message: "No records found for the given Instakit No" });
        }

        res.status(200).json({ data: records });


    } catch (err) {
        console.error("Internal error:", err);
        res.status(500).json({ error: "Internal Server Error", details: err.message });
    }
});


router.post("/updatecustomer", async (req, res) => {
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
            { where: { docket_id: instakitNo } }
        );
        return res.status(200).json({ message: "✅ Record updated successfully." });

    } catch (err) {
        console.error("Internal error:", err);
        res.status(500).json({ error: "Internal Server Error", details: err.message });
    }
});


module.exports = router;
