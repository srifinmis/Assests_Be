const express = require("express");
const router = express.Router();
const { sequelize } = require("../../config/db");
const initModels = require("../../models/init-models");

const models = initModels(sequelize);
const { debit_card_details } = models;

router.get("/details", async (req, res) => {
    const empId = req.headers["emp_id"];
    console.log("id: ", empId)

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
        console.log("response data: ", bos)

        res.json(ros);
    } catch (error) {
        console.error("Error fetching BO details:", error);
        res.status(500).json({ error: "Failed to fetch BO details" });
    }
});


router.get("/detailslog", async (req, res) => {
    const empId = req.headers["emp_id"];
    console.log("id: ", empId)

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
                ["pod", "po_number"]
            ],
            order: [["docket_id", "ASC"]]
        });
        console.log("response data: ", bos)

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

module.exports = router;