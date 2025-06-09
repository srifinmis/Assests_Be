const express = require('express');
const router = express.Router();
const multer = require('multer');
const XLSX = require('xlsx');
const { Op } = require("sequelize");
const ExcelJS = require('exceljs');
const fs = require('fs');
const path = require('path');
const { sequelize } = require("../config/db");
const initModels = require("../models/init-models");
const { raw } = require('body-parser');

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
    // console.log('hobulk upload: ', req.body)

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
        const docketIdsFromExcel = records.map(record => String(record["Instakit"]).trim());
        const filteredRecords = existingDetails.filter(row => docketIdsFromExcel.includes(row.docket_id));

        for (const row of filteredRecords) {
            const rowData = row.toJSON();
            rowData.debit_id = null; // Set debit_id to null as per your logic
            await debit_card_details_workflow.create(rowData);

        }
        // Step 2: Create new rows based on flag
        const isRO = flag === 'RO';
        const isBO = flag === 'BO';

        if (!isRO && !isBO) {
            fs.unlinkSync(filePath);
            return res.status(400).json({ message: '❌ Invalid flag. Must be "RO" or "BO".' });
        }

        const unitIds = records.map(r => r["Unit ID"]).filter(Boolean);

        const whereCondition = isBO
            ? {
                [Op.or]: unitIds.map(prefix => ({
                    branchid_name: {
                        [Op.like]: `${prefix}-%`,
                    },
                })),
            }
            : { emp_id: unitIds };
        console.log('where : ', whereCondition);

        const existingUsers = await userlogins.findAll({
            where: whereCondition,
            raw: true
        });
        console.log('existingUsers : ', existingUsers);

        // Dynamically map based on the flag
        const existingUnitIds = isBO
            ? existingUsers.map(u => u.branchid_name.split('-')[0])
            : existingUsers.map(u => u.emp_id);

        const missingEmpIds = unitIds.filter(id => !existingUnitIds.includes(id));

        if (missingEmpIds.length > 0) {
            fs.unlinkSync(filePath);

            const workbook = new ExcelJS.Workbook();

            // Sheet 1: Missing IDs
            const worksheet = workbook.addWorksheet('Missing Unit IDs');
            worksheet.columns = [
                { header: 'Unit IDs Not Found ', key: 'empId', width: 30 }
            ];
            missingEmpIds.forEach(id => {
                worksheet.addRow({ empId: id });
            });

            // Set response headers
            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            res.setHeader('Content-Disposition', 'attachment; filename=missing_unit_ids.xlsx');

            // Send the Excel workbook
            await workbook.xlsx.write(res);
            return res.end();
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
            const workbook = new ExcelJS.Workbook();
            const worksheet = workbook.addWorksheet('Missing Instakit IDs');
            worksheet.columns = [
                { header: 'InstakitNo. Not Found', key: 'empId', width: 30 }
            ];
            missingDocketIds.forEach(id => {
                worksheet.addRow({ empId: id });
            });
            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            res.setHeader('Content-Disposition', 'attachment; filename=missing_Instakitids.xlsx');
            await workbook.xlsx.write(res);
            return res.end();

            // return res.status(400).json({
            //     message: `❌ Upload aborted. Some Instakit(s) are missing in the File Please Check Again.-- [ ${missingDocketIds} ]`,
            //     missing: missingDocketIds,
            // });
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
        const docketIdsFromExcel = records.map(record => String(record["Instakit"]).trim());
        const filteredRecords = existingDetails.filter(row => docketIdsFromExcel.includes(row.docket_id));

        for (const row of filteredRecords) {
            const rowData = row.toJSON();
            rowData.debit_id = null; // Set debit_id to null as per your logic
            console.log('assign to bo ----------: ', rowData)
            await debit_card_details_workflow.create(rowData);
        }

        const unitIds = records.map(r => r["Unit ID"]).filter(Boolean);
        const existingUsers = await userlogins.findAll({
            where: {
                [Op.or]: unitIds.map(prefix => ({
                    branchid_name: { [Op.like]: `${prefix}-%` }
                }))
            }
        });
        const existingEmpIds = existingUsers.map(u => u.branchid_name.split('-')[0])
        const missingEmpIds = unitIds.filter(id => !existingEmpIds.includes(id));

        if (missingEmpIds.length > 0) {
            fs.unlinkSync(filePath);
            const workbook = new ExcelJS.Workbook();
            const worksheet = workbook.addWorksheet('Missing Unit IDs');
            worksheet.columns = [
                { header: 'Unit IDs Not Found', key: 'empId', width: 30 }
            ];
            missingEmpIds.forEach(id => {
                worksheet.addRow({ empId: id });
            });
            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            res.setHeader('Content-Disposition', 'attachment; filename=missing_Instakitids.xlsx');
            await workbook.xlsx.write(res);
            return res.end();
            // return res.status(400).json({
            //     message: `❌ Upload aborted. Check Unit IDs do not exist in the system: [${missingEmpIds.join(', ')}]`,
            //     missing: missingEmpIds,
            // });
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
        //
        if (docketIds.length > 0) {
            const existdocketId = await debit_card_details.findAll({
                where: {
                    docket_id: docketIds,
                },
                raw: true,
            });

            const foundIds = existdocketId.map(r => r.docket_id);
            const missingdocketIds = docketIds.filter(id => !foundIds.includes(id));

            if (missingdocketIds.length > 0) {
                const workbook = new ExcelJS.Workbook();
                const worksheet = workbook.addWorksheet('Missing Instakit IDs');
                worksheet.columns = [
                    { header: 'InstakitNo. Not Found', key: 'empId', width: 30 }
                ];
                missingdocketIds.forEach(id => {
                    worksheet.addRow({ empId: id });
                });
                res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
                res.setHeader('Content-Disposition', 'attachment; filename=missing_Instakitids.xlsx');
                await workbook.xlsx.write(res);
                return res.end();
            }
        }
        //

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
                message: "❌ Some records are already assigned. Please make sure the records exist and are marked as 'Accepted' before assigning them."
            });
        }

        const existingDocketIds = existingRecords.map(r => r.docket_id);
        const missingDocketIds = docketIds.filter(id => !existingDocketIds.includes(id));

        if (missingDocketIds.length > 0 && existingDocketIds.length > 0) {
            // ❌ Some exist, some don't – abort
            fs.unlinkSync(filePath);
            const workbook = new ExcelJS.Workbook();
            const worksheet = workbook.addWorksheet('Missing Instakit IDs');
            worksheet.columns = [
                { header: 'InstakitNo. Not Found', key: 'empId', width: 30 }
            ];
            missingDocketIds.forEach(id => {
                worksheet.addRow({ empId: id });
            });
            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            res.setHeader('Content-Disposition', 'attachment; filename=missing_Instakitids.xlsx');
            await workbook.xlsx.write(res);
            return res.end();
            // return res.status(400).json({
            //     message: `❌ Upload aborted. Some docket_id(s) are Not Valid -- [ ${missingDocketIds} ]`,
            //     missing: missingDocketIds,
            // });
        } else {
            // ✅ All exist – update
            const transaction = await sequelize.transaction();

            try {
                for (const record of rows) {
                    const updatedFields = {
                        bo_status: 'Pending',
                        ro_status: 'Assigned',
                        ro_assigned_date: new Date(),
                        ro_assigned_to: record.ro_assigned_to,
                        bo_name: record.bo_name,
                        pod: record.pod,
                        remarks: record.remarks,
                        loan_app_no: '' || null,
                        customer_id: '' || null,
                        issue_date: '' || null,
                        cust_assigned_from: '' || null,
                        bo_accepted_date: '' || null,
                        bo_assigned_date: '' || null,
                    };

                    // Only include 'debit_id' if it's allowed to be null
                    if (debit_card_details.rawAttributes.debit_id.allowNull) {
                        updatedFields.debit_id = null;
                    }

                    // Fetch current values to prevent overwriting with null
                    const currentRecord = await debit_card_details.findOne({
                        where: { docket_id: record.docket_id }
                    });

                    if (currentRecord) {
                        const currentValues = currentRecord.toJSON();
                        // Merge current values with updated fields
                        Object.keys(currentValues).forEach(key => {
                            if (!(key in updatedFields)) {
                                updatedFields[key] = currentValues[key];
                            }
                        });
                    }

                    await debit_card_details.update(updatedFields, {
                        where: { docket_id: record.docket_id },
                        transaction,
                    });
                }

                await transaction.commit();
                fs.unlinkSync(filePath);
                return res.status(200).json({ message: "✅ Assigned to Branch Successfully." });
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
            docket_id: String(record["Instakit"]).trim(),
            pod: record["Pod"],
            remarks: record["Remarks"] || null,
            ro_status: 'Accepted',
        }));

        const docketIds = rows.map(r => r.docket_id);

        if (docketIds.length > 0) {
            const existdocketId = await debit_card_details.findAll({
                where: {
                    docket_id: docketIds,
                },
                raw: true,
            });

            const foundIds = existdocketId.map(r => r.docket_id);
            const missingdocketIds = docketIds.filter(id => !foundIds.includes(id));

            if (missingdocketIds.length > 0) {
                const workbook = new ExcelJS.Workbook();
                // Sheet 1: Missing IDs
                const worksheet = workbook.addWorksheet('Missing Instakit IDs');
                worksheet.columns = [
                    { header: 'InstakitNo. Not Found', key: 'empId', width: 30 }
                ];
                missingdocketIds.forEach(id => {
                    worksheet.addRow({ empId: id });
                });
                res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
                res.setHeader('Content-Disposition', 'attachment; filename=missing_Instakitids.xlsx');
                await workbook.xlsx.write(res);
                return res.end();
            }
        }

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
                message: "❌ No InstakitNo to Accept / Already Accepted."
            });
        }

        const existingDocketIds = existingRecords.map(r => r.docket_id);
        const missingDocketIds = docketIds.filter(id => !existingDocketIds.includes(id));

        if (missingDocketIds.length > 0 && existingDocketIds.length > 0) {
            // ❌ Some exist, some don't – abort
            fs.unlinkSync(filePath);
            const workbook = new ExcelJS.Workbook();
            // Sheet 1: Missing IDs
            const worksheet = workbook.addWorksheet('Missing Instakit IDs');
            worksheet.columns = [
                { header: 'InstakitNo. Not Found / Status not in Pending', key: 'empId', width: 30 }
            ];
            missingDocketIds.forEach(id => {
                worksheet.addRow({ empId: id });
            });
            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            res.setHeader('Content-Disposition', 'attachment; filename=missing_Instakitids.xlsx');
            await workbook.xlsx.write(res);
            return res.end();
            // return res.status(400).json({
            //     message: `❌ Upload aborted. Some docket_id(s) are missing / Status not in Pending -- [ ${missingDocketIds} ]`,
            //     missing: missingDocketIds,
            // });
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

        if (docketIds.length > 0) {
            const existdocketId = await debit_card_details.findAll({
                where: {
                    docket_id: docketIds,
                },
                raw: true,
            });

            const foundIds = existdocketId.map(r => r.docket_id);
            const missingdocketIds = docketIds.filter(id => !foundIds.includes(id));

            if (missingdocketIds.length > 0) {
                const workbook = new ExcelJS.Workbook();
                // Sheet 1: Missing IDs
                const worksheet = workbook.addWorksheet('Missing Instakit IDs');
                worksheet.columns = [
                    { header: 'InstakitNo. Not Found', key: 'empId', width: 30 }
                ];
                missingdocketIds.forEach(id => {
                    worksheet.addRow({ empId: id });
                });
                res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
                res.setHeader('Content-Disposition', 'attachment; filename=missing_Instakitids.xlsx');
                await workbook.xlsx.write(res);
                return res.end();
            }
        }

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
            const workbook = new ExcelJS.Workbook();
            const worksheet = workbook.addWorksheet('Missing Instakit IDs');
            worksheet.columns = [
                { header: 'InstakitNo. Not Found / Status not in Pending', key: 'empId', width: 30 }
            ];
            missingDocketIds.forEach(id => {
                worksheet.addRow({ empId: id });
            });
            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            res.setHeader('Content-Disposition', 'attachment; filename=missing_Instakitids.xlsx');
            await workbook.xlsx.write(res);
            return res.end();

            // return res.status(400).json({
            //     message: `❌ Upload aborted. Some docket_id(s) are missing in the DB -- [ ${missingDocketIds} ]`,
            //     missing: missingDocketIds,
            // });
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
            return res.status(200).json({ message: "✅ Accepted Successfully." });
        }

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "❌ Failed to process file.", error: error.message });
    }
});


module.exports = router;