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
    debit_card_details, debit_card_details_workflow, userlogins
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
    const { requested_by, flag } = req.body;
    console.log('hobulk upload: ', req.body)

    try {
        const filePath = req.file.path;
        const workbook = XLSX.readFile(filePath);
        const firstSheet = workbook.SheetNames[0];
        const records = XLSX.utils.sheet_to_json(workbook.Sheets[firstSheet]);

        if (!records.length) {
            fs.unlinkSync(filePath);
            return res.status(400).json({ message: '❌ Empty Excel file.' });
        }

        const existingDetails = await debit_card_details.findAll();
        for (const row of existingDetails) {
            const existingWorkflow = await debit_card_details_workflow.findOne({
                where: { docket_id: row.docket_id }
            });

            if (existingWorkflow) {
                await debit_card_details_workflow.update(row.toJSON(), {
                    where: { docket_id: row.docket_id }
                });
                // await debit_card_details_workflow.create(row.toJSON());
                // const rowData = row.toJSON();
                // rowData.debit_id = null;

                // await debit_card_details_workflow.create(rowData);

            } else {
                await debit_card_details_workflow.create(row.toJSON());
            }
        }
        // Step 2: Create new rows based on flag
        const isRO = flag === 'RO';
        const isBO = flag === 'BO';

        if (!isRO && !isBO) {
            fs.unlinkSync(filePath);
            return res.status(400).json({ message: '❌ Invalid flag. Must be "RO" or "BO".' });
        }

        const unitIds = records.map(r => r["Unit ID"]);

        const whereCondition = isBO
            ? { branchid_name: unitIds }
            : { emp_id: unitIds };

        console.log('where : ', whereCondition);

        const existingUsers = await userlogins.findAll({
            where: whereCondition
        });

        console.log('existingUsers : ', existingUsers);

        // Dynamically map based on the flag
        const existingUnitIds = isBO
            ? existingUsers.map(u => u.branchid_name)
            : existingUsers.map(u => u.emp_id);

        const missingEmpIds = unitIds.filter(id => !existingUnitIds.includes(id));

        if (missingEmpIds.length > 0) {
            fs.unlinkSync(filePath);
            return res.status(400).json({
                message: `❌ Upload aborted. Check Unit IDs do not exist in the system: [${missingEmpIds.join(', ')}]`,
                missing: missingEmpIds,
            });
        }

        const newRows = records.map(record => ({
            docket_id: String(record["Instakit"]).trim(),
            ho_assigned_to: record["Unit ID"],
            ro_assigned_to: isBO ? record["Unit ID"] : null,
            status: record["Assignment Status"],
            pod: record["Pod"],
            remarks: record["Remarks"] || null,
            ho_assigned_date: new Date(),
            ho_by: requested_by,
            send_to: isRO ? 'RO' : 'BO',
            ro_name: isRO ? record["Unit Name"] : null,
            ro_status: isRO ? 'Pending' : null,
            bo_name: isBO ? record["Unit Name"] : null,
            bo_status: isBO ? 'Pending' : null,
            ro_assigned_date: isBO ? new Date() : null,
        }));

        const docketIds = newRows.map(r => r.docket_id);

        // Step 3: Check if dockets exist
        const existingRecords = await debit_card_details.findAll({
            where: { docket_id: docketIds }
        });

        const existingDocketIds = existingRecords.map(r => r.docket_id);
        const missingDocketIds = docketIds.filter(id => !existingDocketIds.includes(id));

        if (missingDocketIds.length > 0 && existingDocketIds.length > 0) {
            fs.unlinkSync(filePath);
            return res.status(400).json({
                message: `❌ Upload aborted. Some Instakit(s) are missing in the File Please Check Again.-- [ ${missingDocketIds} ]`,
                missing: missingDocketIds,
            });
        } else if (missingDocketIds.length === docketIds.length) {
            // All new - insert
            await debit_card_details.bulkCreate(newRows);
            fs.unlinkSync(filePath);
            return res.status(200).json({ message: "✅ All new records inserted." });
        } else {
            // All exist - update with blanks for other columns
            const allColumns = Object.keys(debit_card_details.rawAttributes);

            for (const record of newRows) {
                const fullRecord = {};
                for (const column of allColumns) {
                    if (column === 'debit_id' || column === 'createdAt' || column === 'updatedAt') continue;
                    fullRecord[column] = record.hasOwnProperty(column) ? record[column] : null;
                }
                await debit_card_details.update(fullRecord, {
                    where: { docket_id: record.docket_id }
                });
            }

            fs.unlinkSync(filePath);
            return res.status(200).json({ message: "✅ All existing records updated." });
        }

    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "❌ Failed to process file.", error: error.message });
    }
});

//RO will assign to bo bulkly RO assigns to BO
// POST /bulk/upload-roassignbo
router.post('/upload-roassignbo', upload.single('file'), async (req, res) => {
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

        const existingDetails = await debit_card_details.findAll();
        for (const row of existingDetails) {
            const existingWorkflow = await debit_card_details_workflow.findOne({
                where: { docket_id: row.docket_id }
            });

            if (existingWorkflow) {
                await debit_card_details_workflow.update(row.toJSON(), {
                    where: { docket_id: row.docket_id }
                });
                // await debit_card_details_workflow.create(row.toJSON());
                // const rowData = row.toJSON();
                // rowData.debit_id = null;

                // await debit_card_details_workflow.create(rowData);

            } else {
                await debit_card_details_workflow.create(row.toJSON());
            }
        }

        const unitIds = records.map(r => r["Unit ID"]);
        const existingUsers = await userlogins.findAll({
            where: {
                emp_id: unitIds
            }
        });
        const existingEmpIds = existingUsers.map(u => u.emp_id);
        const missingEmpIds = unitIds.filter(id => !existingEmpIds.includes(id));

        if (missingEmpIds.length > 0) {
            fs.unlinkSync(filePath);
            return res.status(400).json({
                message: `❌ Upload aborted. Check Unit IDs do not exist in the system: [${missingEmpIds.join(', ')}]`,
                missing: missingEmpIds,
            });
        }

        // Prepare rows
        const rows = records.map((record) => ({
            docket_id: String(record["Instakit"]),
            ro_assigned_to: record["Unit ID"] || "",
            bo_name: record["Unit Name"] || "",
            pod: record["Pod"] || "",
            remarks: record["Remarks"] || null,
        }));

        const docketIds = rows.map(r => r.docket_id);

        // Fetch existing records from DB
        const existingRecords = await debit_card_details.findAll({
            where: {
                docket_id: docketIds,
                ro_status: 'Accepted'
            },
        });
        if (existingRecords.length === 0) {
            return res.status(400).json({
                // message: "❌  TO Assign to Branch No record found with 'Accepted' status to Assign / Already Assigned."
                message: "❌ Some records are already assigned or not in the correct status. Please make sure the records exist and are marked as 'Accepted' before assigning them."
            });
        }

        const existingDocketIds = existingRecords.map(r => r.docket_id);
        const missingDocketIds = docketIds.filter(id => !existingDocketIds.includes(id));

        if (missingDocketIds.length > 0 && existingDocketIds.length > 0) {
            // ❌ Some exist, some don't – abort
            fs.unlinkSync(filePath);
            return res.status(400).json({
                message: `❌ Upload aborted. Some docket_id(s) are Not Valid -- [ ${missingDocketIds} ]`,
                missing: missingDocketIds,
            });
        } else {
            // ✅ All exist – update
            const transaction = await sequelize.transaction();
            try {
                for (const record of rows) {
                    await debit_card_details.update(
                        {
                            bo_status: 'Pending',
                            ro_status: 'Assigned',
                            ro_assigned_date: new Date(),
                            ro_assigned_to: record.ro_assigned_to,
                            bo_name: record.bo_name,
                            pod: record.pod,
                            remarks: record.remarks,
                        },
                        {
                            where: { docket_id: record.docket_id },
                            transaction,
                        });
                }
                await transaction.commit();
                fs.unlinkSync(filePath);
                return res.status(200).json({ message: "✅ All existing records updated." });
            } catch (error) {
                await transaction.rollback();
                console.error(error);
                return res.status(500).json({ message: "❌ Failed to process file.", error: error.message });
            }
        }

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "❌ Failed to process file.", error: error.message });
    }
});


// POST /bulk/upload-ro accept
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
            pod: record["Pod"],
            remarks: record["Remarks"] || null,
            ro_status: 'Accepted'
        }));

        const docketIds = rows.map(r => r.docket_id);

        // Fetch existing records from DB
        const existingRecords = await debit_card_details.findAll({
            where: {
                docket_id: docketIds,
                ro_status: "Pending"
            },
            raw: true
        });

        if (existingRecords.length === 0) {
            return res.status(400).json({
                message: "❌ No existing records found with the specified instakitNo / 'Pending' status to Accept."
            });
        }

        const existingDocketIds = existingRecords.map(r => r.docket_id);
        const missingDocketIds = docketIds.filter(id => !existingDocketIds.includes(id));

        if (missingDocketIds.length > 0 && existingDocketIds.length > 0) {
            // ❌ Some exist, some don't – abort
            fs.unlinkSync(filePath);
            return res.status(400).json({
                message: `❌ Upload aborted. Some docket_id(s) are missing in DB / Status not in Pending -- [ ${missingDocketIds} ]`,
                missing: missingDocketIds,
            });
        } else {
            // ✅ All exist – update
            for (const record of rows) {
                await debit_card_details.update(
                    { ro_status: "Accepted", ro_accepted_date: new Date() },
                    {
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

// POST /bulk/upload-bo accept code
router.post('/upload-bo', upload.single('file'), async (req, res) => {
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
            pod: record["Pod"],
            remarks: record["Remarks"] || null,
            bo_status: 'Accepted'
        }));

        const docketIds = rows.map(r => r.docket_id);

        // Fetch existing records from DB
        const existingRecords = await debit_card_details.findAll({
            where: {
                docket_id: docketIds,
                bo_status: 'Pending'
            },
        });
        if (existingRecords.length === 0) {
            return res.status(400).json({
                message: "❌ Invalid InstakitNo / Already Accepted"
            });
        }

        const existingDocketIds = existingRecords.map(r => r.docket_id);
        const missingDocketIds = docketIds.filter(id => !existingDocketIds.includes(id));

        if (missingDocketIds.length > 0 && existingDocketIds.length > 0) {
            // ❌ Some exist, some don't – abort
            fs.unlinkSync(filePath);
            return res.status(400).json({
                message: `❌ Upload aborted. Some docket_id(s) are missing in the DB -- [ ${missingDocketIds} ]`,
                missing: missingDocketIds,
            });
        } else {
            // ✅ All exist – update
            for (const record of rows) {
                await debit_card_details.update(
                    { bo_status: "Accepted", bo_accepted_date: new Date() },
                    {
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
