// const express = require("express");
// const router = express.Router();
// const multer = require("multer");
// const xlsx = require("xlsx");
// const { sequelize } = require("../config/db");
// const initModels = require("../models/init-models");

// const models = initModels(sequelize);
// const {
//   assetmaster_staging,
//   bulk_assignmentdetails_staging,
//   po_processing_staging,
//   userlogins,
//   bulk_upload_staging,
// } = models;

// const upload = multer({ storage: multer.memoryStorage() });

// router.post("/upload", upload.single("file"), async (req, res) => {
//   const t = await sequelize.transaction();
//   try {
//     const { requested_by } = req.body;
//     if (!requested_by || !req.file) {
//       return res.status(400).json({ error: "Missing required fields or file." });
//     }

//     const workbook = xlsx.read(req.file.buffer, { type: "buffer" });
//     const bulk = await bulk_upload_staging.create(
//       {
//         bulk_status: "Pending",
//         requested_by,
//       },
//       { transaction: t }
//     );
//     const bulk_id = bulk.bulk_id;

//     for (const sheetName of workbook.SheetNames) {
//       const sheet = workbook.Sheets[sheetName];
//       const rows = xlsx.utils.sheet_to_json(sheet);
//       if (!rows.length) continue;

//       const safeDate = (date) => {
//         const parsed = new Date(date);
//         return isNaN(parsed.getTime()) ? null : parsed;
//       };

//       const firstRow = rows[0];
//       const po_num = firstRow["PO NUM"];
//       const invoice_date = safeDate(firstRow["Purchased Date"]);
//       const asset_type = firstRow["Asst Type"];
//       const asset_creation_at = "payment"; // or derive from logic/default
//       const client_name = firstRow["Requested By"];
//       const vendor_name = firstRow["Asset Purchased From"];
//       const invoice_num = firstRow["Invoice num"];

//       await po_processing_staging.create(
//         {
//           po_num,
//           invoice_date,
//           asset_type,
//           asset_creation_at,
//           client_name,
//           vendor_name,
//           po_url: null,
//           bulk_id,
//           invoice_num,
//         },
//         { transaction: t }
//       );

//       for (const row of rows) {
//         const {
//           "Asset Number": asset_id,
//           "Asst Type": asset_type,
//           "Make": brand,
//           "Model": model,
//           "Serial Number": imei_num,
//           "Description": description,
//           "Purchased Date": raw_invoice_date,
//           "Location": base_location,
//           "State": state,
//           "Asset Status": assignment_status,
//           "Remarks": asset_remarks,
//           "EMP ID": emp_id,
//         } = row;

//         const po_date = safeDate(raw_invoice_date);

//         const asset = await assetmaster_staging.create(
//           {
//             asset_id,
//             asset_type,
//             brand,
//             model,
//             imei_num,
//             description,
//             po_num,
//             po_date,
//             base_location,
//             state,
//             warranty_status: assignment_status,
//             remarks: asset_remarks || null,
//             bulk_id,
//           },
//           { transaction: t }
//         );

//         if (!emp_id || !asset.asset_id) continue;

//         const user = await userlogins.findOne({ where: { emp_id } });
//         if (!user) continue;

//         const { system_id, branch_id, region_id } = user;

//         await bulk_assignmentdetails_staging.create(
//           {
//             asset_id: asset.asset_id,
//             emp_id,
//             system_id,
//             Location: branch_id,
//             State: region_id, 
//             assignment_status,
//             remarks: asset_remarks,
//             assigned_by: requested_by,
//             assigned_at: new Date(),
//             bulk_id,
//           },
//           { transaction: t }
//         );
//       }
//     }

//     await t.commit();
//     res.status(201).json({ message: "Bulk upload created successfully", bulk_id });

//   } catch (error) {
//     await t.rollback();
//     console.error("Bulk Upload Error:", error);
//     res.status(500).json({ error: "Bulk upload failed" });
//   }
// });

// module.exports = router;
 

const express = require("express");
const router = express.Router();
const multer = require("multer");
const xlsx = require("xlsx");
const { sequelize } = require("../config/db");
const initModels = require("../models/init-models");

const models = initModels(sequelize);
const {
  assetmaster_staging,
  bulk_assignmentdetails_staging,
  po_processing_staging,
  userlogins,
  bulk_upload_staging,
} = models;

const upload = multer({ storage: multer.memoryStorage() });

router.post("/upload", upload.single("file"), async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { requested_by } = req.body;
    if (!requested_by || !req.file) {
      return res.status(400).json({ error: "Missing required fields or file." });
    }

    const workbook = xlsx.read(req.file.buffer, { type: "buffer" });

    const bulk = await bulk_upload_staging.create(
      {
        bulk_status: "Pending",
        requested_by,
      },
      { transaction: t }
    );
    const bulk_id = bulk.bulk_id;

    const safeDate = (date) => {
      const parsed = new Date(date);
      return isNaN(parsed.getTime()) ? null : parsed;
    };

    for (const sheetName of workbook.SheetNames) {
      const sheet = workbook.Sheets[sheetName];
      const rows = xlsx.utils.sheet_to_json(sheet);
      if (!rows.length) continue;

      // Group rows by po_num
      const grouped = rows.reduce((acc, row) => {
        const poNum = row["PO NUM"]?.trim();
        if (!poNum) return acc;
        if (!acc[poNum]) acc[poNum] = [];
        acc[poNum].push(row);
        return acc;
      }, {});

      for (const po_num of Object.keys(grouped)) {
        const poRows = grouped[po_num];
        const first = poRows[0];

        const invoice_date = safeDate(first["Purchased Date"]);
        const asset_type = first["Asst Type"]?.trim();
        const client_name = first["Requested By"]?.trim() || "Unknown";
        const vendor_name = first["Asset Purchased From"]?.trim();
        const invoice_num = first["Invoice num"]?.trim();

        // Create po_processing_staging record for each po_num
        await po_processing_staging.create({
          po_num,
          invoice_date,
          asset_type,
          asset_creation_at: "payment", // fixed logic
          client_name,
          vendor_name,
          po_url: null,
          bulk_id,
          invoice_num,
        }, { transaction: t });

        for (const row of poRows) {
          const asset_id = row["Asset Number"]?.trim();
          const asset_type = row["Asst Type"]?.trim();
          const brand = row["Make"]?.trim();
          const model = row["Model"]?.trim();
          const imei_num = row["Serial Number"]?.trim();
          const description = row["Description"]?.trim();
          const po_date = safeDate(row["Purchased Date"]);
          const base_location = row["Location"]?.trim();
          const state = row["State"]?.trim();
          const assignment_status = row["Asset Status"]?.trim() || "Free Pool";
          const asset_remarks = row["Remarks"]?.trim() || null;
          const emp_id = row["EMP ID"]?.trim();
          const employee_name = row["Employe Name"]?.trim();
          const host_name = row["Host Name"]?.trim() || null;

          // Save asset regardless of assignment
          const asset = await assetmaster_staging.create(
            {
              asset_id,
              asset_type,
              brand,
              model,
              imei_num,
              description,
              po_num,
              po_date,
              base_location,
              state,
              warranty_status: assignment_status,
              remarks: asset_remarks,
              bulk_id,
              host_name,
            },
            { transaction: t }
          );

          // Assign if emp_id is valid and not "Freepool"
          if (!emp_id || employee_name?.toLowerCase() === "freepool") continue;

          const user = await userlogins.findOne({ where: { emp_id } });
          if (!user) continue;

          const { system_id, branch_id, region_id } = user;

          await bulk_assignmentdetails_staging.create(
            {
              asset_id: asset.asset_id,
              emp_id,
              system_id,
              Location: branch_id,
              State: region_id,
              assignment_status,
              remarks: asset_remarks,
              assigned_by: requested_by,
              assigned_at: new Date(),
              bulk_id,
            },
            { transaction: t }
          );
        }
      }
    }

    await t.commit();
    res.status(201).json({ message: "Bulk upload successful", bulk_id });

  } catch (error) {
    await t.rollback();
    console.error("Bulk Upload Error:", error);
    res.status(500).json({ error: "Bulk upload failed", details: error.message });
  }
});

module.exports = router;
