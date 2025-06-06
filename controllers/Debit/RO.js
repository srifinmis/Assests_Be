const express = require("express");
const router = express.Router();
const { sequelize } = require("../../config/db");
const initModels = require("../../models/init-models");
const { where } = require("sequelize");

const models = initModels(sequelize);
const { debit_card_details, userlogins } = models;

router.get("/ho-report", async (req, res) => {
    const empId = req.headers["emp_id"];
    console.log("id ho: ", empId);

    if (!empId) {
        return res.status(400).json({ error: "emp_id is required in request headers" });
    }

    try {
        const results = await debit_card_details.findAll({
            where: { ho_by: empId },
            // include: [
            //     {
            //         model: userlogins,
            //         as: "ho_by",
            //         where: { emp_id: empId },
            //         attributes: ["emp_id", "emp_name"], // Optional
            //         required: true
            //     }
            // ],
            // attributes: ["instakit_no", "unit_id", "unit_name", "assigned_status", "po_number"]
        });

        res.json(results);
    } catch (error) {
        console.error("Error fetching Report details:", error);
        res.status(500).json({ error: "Failed to fetch Report details" });
    }
});

router.get("/ro-report", async (req, res) => {
    const empId = req.headers["emp_id"];
    console.log("id getting: ", empId);

    if (!empId) {
        return res.status(400).json({ error: "emp_id is required in request headers" });
    }

    try {
        const results = await debit_card_details.findAll({
            where: { ho_assigned_to: empId },
            attributes: [
                "docket_id",
                "ro_assigned_to",
                "bo_name",
                "ro_assigned_date",
                "ro_status",
                "remarks",
                // "bo_name",
                // "bo_status"
            ],
            order: [["docket_id", "ASC"]],
        });
        console.log('report: ',results)

        const formattedResults = results.map((row) => {
            const status = row.dataValues.ro_status;

            let action_status = "Pending";
            if (status === "Assigned") {
                action_status = "After Assign (HO)";
            } else if (status === "Accepted") {
                action_status = "After Accept (RO)";
            } else if (!status) {
                action_status = "Before Assign (HO)";
            }

            return {
                docket_id: row.docket_id,
                ro_assigned_to: row.ro_assigned_to,
                bo_name: row.bo_name,
                ro_assigned_date: row.ro_assigned_date,
                ro_status: row.ro_status,
                remarks: row.remarks,
                // bo_name: row.bo_name,
                // bo_status: row.bo_status,
                // action_status
            };
        });

        res.json(formattedResults);
    } catch (error) {
        console.error("Error fetching RO report details:", error);
        res.status(500).json({ error: "Failed to fetch RO report details" });
    }
});


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
        console.log("response data: ", ros)

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
            where: { ho_assigned_to: empId, ro_status: "Pending" }, // 🟢 Filter by ho_by = emp_id
            attributes: [
                ["docket_id", "instakit_no"],
                ["ho_assigned_to", "unit_id"],
                ["ro_name", "unit_name"],
                ["ro_status", "assigned_status"],
                ["pod", "po_number"],
                ["ho_assigned_date", "ho_assigned_date"]
            ],
            order: [["docket_id", "ASC"]]
        });
        console.log("response data: ", ros)

        res.json(ros);
    } catch (error) {
        console.error("Error fetching RO details:", error);
        res.status(500).json({ error: "Failed to fetch RO details" });
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
                ro_status: "Accepted",
                ro_accepted_date: new Date()
            },
            {
                where: {
                    docket_id: docketIds
                }
            }
        );

        res.status(200).json({
            message: "RO status updated to Accepted successfully",
            updatedCount: result[0]
        });
    } catch (error) {
        console.error("Error updating ro_status:", error);
        res.status(500).json({ error: "Failed to update ro_status" });
    }
});

router.post("/assign", async (req, res) => {
    const { docketIds, ro_assigned_to } = req.body;
    console.log('assigned to bo: ', req.body);

    if (
        !Array.isArray(docketIds) ||
        docketIds.length === 0 ||
        !Array.isArray(ro_assigned_to) ||
        docketIds.length !== ro_assigned_to.length
    ) {
        return res.status(400).json({ message: "Missing or invalid required fields." });
    }

    try {
        let updateCount = 0;

        for (let i = 0; i < docketIds.length; i++) {
            const empId = ro_assigned_to[i];

            const user = await userlogins.findOne({
                where: { emp_id: empId },
                attributes: ['emp_name'],
            });

            if (!user) {
                console.warn(`No user found for emp_id: ${empId}`);
                continue; // skip this one
            }

            const empName = user.emp_name;

            const result = await debit_card_details.update(
                {
                    ro_assigned_to: empId,
                    ro_assigned_date: new Date(),
                    bo_name: empName,
                    bo_status: "Pending",
                    ro_status: "Assigned",
                },
                {
                    where: {
                        docket_id: docketIds[i],
                    },
                });
            updateCount += result[0]; // count updated rows
        }

        return res.status(200).json({
            message: "ROs successfully assigned to BOs",
            updatedCount: updateCount,
        });
    } catch (error) {
        console.error("Error assigning to BOs:", error);
        return res.status(500).json({ message: "Internal server error", error: error.message });
    }
});

router.post("/unassign", async (req, res) => {
    const { docketIds } = req.body;

    if (!Array.isArray(docketIds) || docketIds.length === 0) {
        return res.status(400).json({ error: "docketIds must be a non-empty array" });
    }

    try {
        const allFields = Object.keys(debit_card_details.rawAttributes);
        const excludeFields = ["debit_id", "docket_id", "ho_by"];
        const fieldsToUpdate = {};
        allFields.forEach((field) => {
            if (!excludeFields.includes(field)) {
                fieldsToUpdate[field] = null;
            }
        });
        fieldsToUpdate["status"] = "N";

        const result = await debit_card_details.update(fieldsToUpdate, {
            where: {
                docket_id: docketIds
            }
        });

        res.status(200).json({
            message: "Selected rows unassigned successfully.",
            updatedCount: result[0],
        });
    } catch (error) {
        console.error("Error during unassign:", error);
        res.status(500).json({ error: "Failed to unassign selected rows." });
    }
});


router.get("/detailsassign", async (req, res) => {
    const empId = req.headers["emp_id"];
    console.log("id: ", empId)

    if (!empId) {
        return res.status(400).json({ error: "emp_id is required in request headers" });
    }

    try {
        const ros = await debit_card_details.findAll({
            where: { ho_assigned_to: empId, ro_status: "Accepted" },
            attributes: [
                ["docket_id", "instakit_no"],
                ["ho_assigned_to", "unit_id"],
                ["ro_name", "unit_name"],
                ["status", "assigned_status"],
                ["pod", "po_number"],
                ["ro_status", "ro_status"]
            ],
            order: [["docket_id", "ASC"]]
        });
        console.log("response data: ", ros)

        res.json(ros);
    } catch (error) {
        console.error("Error fetching RO details:", error);
        res.status(500).json({ error: "Failed to fetch RO details" });
    }
});


module.exports = router;


