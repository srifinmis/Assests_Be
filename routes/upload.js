const express = require('express');
const router = express.Router();
const multer = require('multer');
const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');
const { sequelize } = require("../config/db");
const initModels = require("../models/init-models");

const models = initModels(sequelize);
const {
    debit_card_details,
} = models;

const storage = multer.diskStorage({
    destination: 'uploads/',
    filename: (_, file, cb) => {
        cb(null, Date.now() + '-' + file.originalname);
    },
});
const upload = multer({ storage });

// POST /bulk/upload-ho
router.post('/upload-ho', upload.single('file'), async (req, res) => {
    const { requested_by } = req.body;

    try {
        const filePath = req.file.path;
        const workbook = XLSX.readFile(filePath);
        const firstSheet = workbook.SheetNames[0];
        const records = XLSX.utils.sheet_to_json(workbook.Sheets[firstSheet]);

        if (!records.length) {
            fs.unlinkSync(filePath);
            return res.status(400).json({ message: '❌ Empty Excel file.' });
        }

        // Prepare rows
        const rows = records.map((record) => ({
            docket_id: String(record["Instakit"]),
            ho_assigned_to: record["Unit ID"],
            ro_name: record["Unit Name"],
            status: record["Assignment Status"],
            pod: record["Pod"],
            remarks: record["Remarks"] || null,
            ho_assigned_date: new Date(),
            ho_by: requested_by,
            send_to: 'RO',
            ro_status: 'Pending'
        }));

        const docketIds = rows.map(r => r.docket_id);

        // Fetch existing records from DB
        const existingRecords = await debit_card_details.findAll({
            where: {
                docket_id: docketIds,
            },
        });

        const existingDocketIds = existingRecords.map(r => r.docket_id);
        const missingDocketIds = docketIds.filter(id => !existingDocketIds.includes(id));

        if (missingDocketIds.length > 0 && existingDocketIds.length > 0) {
            // ❌ Some exist, some don't – abort
            fs.unlinkSync(filePath);
            return res.status(400).json({
                message: '❌ Upload aborted. Some docket_id(s) are missing in the DB.',
                missing: missingDocketIds,
            });
        } else if (missingDocketIds.length === docketIds.length) {
            // 🆕 All are new – insert
            await debit_card_details.bulkCreate(rows);
            fs.unlinkSync(filePath);
            return res.status(200).json({ message: "✅ All new records inserted." });
        } else {
            // ✅ All exist – update
            for (const record of rows) {
                await debit_card_details.update(record, {
                    where: { docket_id: record.docket_id }
                });
            }
            fs.unlinkSync(filePath);
            return res.status(200).json({ message: "✅ All existing records updated." });
        }

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "❌ Failed to process file.", error: error.message });
    }
});

// POST /bulk/upload-ro
router.post('/upload-ro', upload.single('file'), async (req, res) => {
    const { requested_by } = req.body;

    try {
        const filePath = req.file.path;
        const workbook = XLSX.readFile(filePath);
        const firstSheet = workbook.SheetNames[0];
        const records = XLSX.utils.sheet_to_json(workbook.Sheets[firstSheet]);

        if (!records.length) {
            fs.unlinkSync(filePath);
            return res.status(400).json({ message: '❌ Empty Excel file.' });
        }

        // Prepare rows
        const rows = records.map((record) => ({
            docket_id: String(record["Instakit"]),
            // ho_assigned_to: record["Unit ID"],
            // ro_name: record["Unit Name"],
            // status: record["Assignment Status"],
            // pod: record["Pod"],
            // remarks: record["Remarks"] || null,
            // ho_assigned_date: new Date(),
            // ho_by: requested_by,
            // send_to: 'RO',
            ro_status: 'Accepted'
        }));

        const docketIds = rows.map(r => r.docket_id);

        // Fetch existing records from DB
        const existingRecords = await debit_card_details.findAll({
            where: {
                docket_id: docketIds,
            },
        });

        const existingDocketIds = existingRecords.map(r => r.docket_id);
        const missingDocketIds = docketIds.filter(id => !existingDocketIds.includes(id));

        if (missingDocketIds.length > 0 && existingDocketIds.length > 0) {
            // ❌ Some exist, some don't – abort
            fs.unlinkSync(filePath);
            return res.status(400).json({
                message: '❌ Upload aborted. Some docket_id(s) are missing in the DB.',
                missing: missingDocketIds,
            });
        } else {
            // ✅ All exist – update
            for (const record of rows) {
                await debit_card_details.update(record, {
                    where: { docket_id: record.docket_id }
                });
            }
            fs.unlinkSync(filePath);
            return res.status(200).json({ message: "✅ All existing records updated." });
        }

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "❌ Failed to process file.", error: error.message });
    }
});


module.exports = router;
