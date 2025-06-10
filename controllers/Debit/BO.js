const express = require("express");
const router = express.Router();
const { Op } = require("sequelize");
const { sequelize } = require("../../config/db");
const initModels = require("../../models/init-models");

const models = initModels(sequelize);
const { debit_card_details, userlogins } = models;

router.get("/instakitIds", async (req, res) => {

    try {
        const requestedBy = req.headers.requestedby;

        if (!requestedBy) {
            return res.status(400).json({ error: "Missing 'requestedBy' in headers" });
        }

        const results = await debit_card_details.findAll({
            where: { ro_assigned_to: requestedBy },
            attributes: ["docket_id"]
        });

        const docketIds = results.map(row => row.docket_id);

        res.json(docketIds);

    } catch (error) {
        console.error("Error fetching BO details:", error);
        res.status(500).json({ error: "Failed to fetch BO details" });
    }
});

router.get("/boiddropdown", async (req, res) => {

    try {
        const boUsers = await userlogins.findAll({
            where: {
                emp_id: {
                    [Op.like]: 'B%' // starts with 'B'
                }
            },
            attributes: ['emp_id', 'branchid_name', 'emp_name'],
        });
        // console.log('bo data dropdown: ', boUsers)

        res.json(boUsers);
    } catch (error) {
        console.error("Error fetching BO details:", error);
        res.status(500).json({ error: "Failed to fetch BO details" });
    }
});

router.get("/bo-report", async (req, res) => {
    const emp = req.headers["emp_id"];
    const empId = emp.split('-')[0];
    // console.log("id: ", empId);

    if (!empId) {
        return res.status(400).json({ error: "emp_id is required in request headers" });
    }

    try {
        const results = await debit_card_details.findAll({
            where: { ro_assigned_to: empId },
            attributes: [
                "docket_id",
                "customer_id",
                // "ho_assigned_to",
                "ro_assigned_to",
                "cust_assigned_from",
                "bo_assigned_date",
                "bo_accepted_date",
                "ro_assigned_date",
                "bo_status",
                "issue_date",
                "bo_name",
                // "bo_name",
                // "bo_status"
            ],
            order: [["docket_id", "ASC"]],
        });

        const formattedResults = results.map((row) => {
            const status = row.dataValues.bo_status;

            let action_status = "Pending";
            if (status === "Assigned") {
                action_status = "After Assign (RO)";
            } else if (status === "Accepted") {
                action_status = "After Accept (BO)";
            } else if (!status) {
                action_status = "Before Assign (RO)";
            }

            return {
                docket_id: row.docket_id,
                customer_id: row.customer_id,
                ro_assigned_date: row.ro_assigned_date,
                bo_status: row.bo_status,
                // ho_assigned_to: row.ho_assigned_to,
                ro_assigned_to: row.ro_assigned_to,
                bo_accepted_date: row.bo_accepted_date,
                bo_assigned_date: row.bo_assigned_date,
                bo_name: row.bo_name,
                issue_date: row.issue_date
            };
        });

        res.json(formattedResults);
    } catch (error) {
        console.error("Error fetching BO report details:", error);
        res.status(500).json({ error: "Failed to fetch BO report details" });
    }
});

router.get("/details", async (req, res) => {
    const empId = req.headers["emp_id"];
    // console.log("id: ", empId)

    if (!empId) {
        return res.status(400).json({ error: "emp_id is required in request headers" });
    }

    try {
        const bos = await debit_card_details.findAll({
            where: { ho_by: empId }, // 🟢 Filter by ho_by = emp_id
            attributes: [
                ["docket_id", "instakit_no"],
                ["ro_assigned_to", "bo_id"],
                ["bo_name", "bo_name"],
                ["bo_status", "assigned_status"],
                ["pod", "po_number"]
            ],
            order: [["docket_id", "ASC"]]
        });
        // console.log("response data: ", bos)

        res.json(ros);
    } catch (error) {
        console.error("Error fetching BO details:", error);
        res.status(500).json({ error: "Failed to fetch BO details" });
    }
});


router.get("/detailslog", async (req, res) => {
    const emp = req.headers["emp_id"];
    const empId = emp.split('-')[0];
    // console.log("id detailslog: ", empId)

    if (!empId) {
        return res.status(400).json({ error: "emp_id is required in request headers" });
    }

    try {
        const bos = await debit_card_details.findAll({
            where: { ro_assigned_to: empId, bo_status: "Pending" }, // 🟢 Filter by ho_by = emp_id
            attributes: [
                ["docket_id", "instakit_no"],
                ["ro_assigned_to", "bo_id"],
                ["bo_name", "bo_name"],
                ["bo_status", "assigned_status"],
                ["ro_assigned_date", "ro_assigned_date"]
            ],
            order: [["docket_id", "ASC"]]
        });
        // console.log("response data: ", bos)

        res.json(bos);
    } catch (error) {
        console.error("Error fetching BO details:", error);
        res.status(500).json({ error: "Failed to fetch BO details" });
    }
});


router.post("/accept", async (req, res) => {
    const { docketIds } = req.body;

    if (!Array.isArray(docketIds) || docketIds.length === 0) {
        return res.status(400).json({ error: "docketIds must be a non-empty array" });
    }

    try {
        const result = await debit_card_details.update(
            {
                bo_status: "Accepted",
                bo_accepted_date: new Date()
            },
            {
                where: {
                    docket_id: docketIds
                }
            }
        );

        res.status(200).json({
            message: "BO status updated to Accepted successfully",
            updatedCount: result[0]
        });
    } catch (error) {
        console.error("Error updating bo_status:", error);
        res.status(500).json({ error: "Failed to update bo_status" });
    }
});

router.get("/detailsassign", async (req, res) => {
    const emp = req.headers["emp_id"];
    const empId = emp.split('-')[0];
    // console.log("id: ", empId)

    if (!empId) {
        return res.status(400).json({ error: "emp_id is required in request headers" });
    }

    try {
        const ros = await debit_card_details.findAll({
            where: { ro_assigned_to: empId, bo_status: "Accepted" },
            attributes: [
                ["docket_id", "instakit_no"],
                ["ho_assigned_to", "unit_id"],
                ["bo_name", "unit_name"],
                ["status", "assigned_status"],
                ["ro_assigned_date", "ro_assigned_date"],
                ["ro_status", "ro_status"]
            ],
            order: [["docket_id", "ASC"]]
        });
        // console.log("response data: ", ros)

        res.json(ros);
    } catch (error) {
        console.error("Error fetching RO details:", error);
        res.status(500).json({ error: "Failed to fetch RO details" });
    }
});


router.get("/instakits", async (req, res) => {
    try {
        const instakits = await debit_card_details.findAll({
            where: {
                bo_status: {
                    [Op.or]: [null, "", "Assigned"] // choose what makes sense
                }
            },
            attributes: ["docket_id"],
            order: [["docket_id", "ASC"]],
        });

        const docketIds = instakits.map(row => row.docket_id);
        res.json(docketIds);
    } catch (error) {
        console.error("Error fetching instakit list:", error);
        res.status(500).json({ error: "Failed to fetch docket IDs" });
    }
});

module.exports = router;