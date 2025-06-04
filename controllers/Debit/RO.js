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
        const ros = await debit_card_details.findAll({
            where: { ho_by: empId }, // 🟢 Filter by ho_by = emp_id
            attributes: [
                ["docket_id", "instakit_no"],
                ["ho_assigned_to", "unit_id"],
                ["ro_name", "unit_name"],
                ["status", "assigned_status"],
                ["pod", "po_number"]
            ],
            order: [["docket_id", "ASC"]]
        });
        console.log("response data: ",ros)

        res.json(ros);
    } catch (error) {
        console.error("Error fetching RO details:", error);
        res.status(500).json({ error: "Failed to fetch RO details" });
    }
});


router.get("/detailslog", async (req, res) => {
    const empId = req.headers["emp_id"];
    console.log("id: ", empId)

    if (!empId) {
        return res.status(400).json({ error: "emp_id is required in request headers" });
    }

    try {
        const ros = await debit_card_details.findAll({
            where: { ho_assigned_to: empId }, // 🟢 Filter by ho_by = emp_id
            attributes: [
                ["docket_id", "instakit_no"],
                ["ho_assigned_to", "unit_id"],
                ["ro_name", "unit_name"],
                ["status", "assigned_status"],
                ["pod", "po_number"]
            ],
            order: [["docket_id", "ASC"]]
        });
        console.log("response data: ",ros)

        res.json(ros);
    } catch (error) {
        console.error("Error fetching RO details:", error);
        res.status(500).json({ error: "Failed to fetch RO details" });
    }
});

module.exports = router;


