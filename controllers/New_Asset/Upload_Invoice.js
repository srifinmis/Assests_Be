// controllers/New_Asset/Upload_Receipt.js
const express = require("express");
const router = express.Router();
const multer = require("multer");
const { uploadToS3 } = require("../../utils/s3Service"); // ✅ Add this
// const { v4: uuidv4 } = require("uuid");
const { sequelize } = require("../../config/db");
const initModels = require("../../models/init-models");
const sendEmail = require("../../utils/sendEmail");
require("dotenv").config();
const { Op } = require('sequelize');
const Sequelize = require('sequelize');

const models = initModels(sequelize);
const {
  asset_types,
  po_processing,
  po_products,
  po_processing_staging,
  invoice_assignment_staging,
  assetmaster_staging,
  assetmaster,
  userlogins
} = models;

const storage = multer.memoryStorage();
const upload = multer({ storage });

// router.get('/po_no', async (req, res) => {
//   try {
//     // 1. Get po_num from assetmaster
//     const poNumsInAssetmaster = await models.assetmaster.findAll({
//       attributes: ['po_num'],
//       raw: true,
//     });

//     // 2. Get po_num from assetmaster_staging
//     const poNumsInStaging = await models.assetmaster_staging.findAll({
//       attributes: ['po_num'],
//       raw: true,
//     });

//     // 3. Get po_num from invoice_assignment_staging where invoice_status is 'Approved'
//     const approvedPOs = await models.invoice_assignment_staging.findAll({
//       where: { invoice_status: 'Approved' },
//       attributes: ['po_num'],
//       raw: true,
//     });

//     // Extract po_nums that are approved
//     const approvedPoNums = approvedPOs.map(row => row.po_num);

//     // Combine exclusions: from assetmaster, assetmaster_staging, and approved invoice_status
//     const poNumsToExclude = [
//       ...poNumsInAssetmaster.map(row => row.po_num),
//       ...poNumsInStaging.map(row => row.po_num),
//       ...approvedPoNums,  // Add approved po_num to exclude list
//     ];

//     // 4. Get unassigned POs from po_processing not in exclusion list
//     const unassignedPOs = await models.po_processing.findAll({
//       where: {
//         po_num: {
//           [Op.notIn]: poNumsToExclude,
//         },
//       },
//       attributes: ['po_num'],
//       raw: true,
//     });

//     // Map and send the remaining po_nums that are unassigned
//     const poNumbers = unassignedPOs.map(po => po.po_num);
//     res.status(200).json(poNumbers);
//   } catch (err) {
//     console.error('Error fetching unassigned POs:', err);
//     res.status(500).json({ error: 'Internal server error' });
//   }
// });

router.get('/po_no', async (req, res) => {
  try {
    // 1. Get po_num from assetmaster
    const poNumsInAssetmaster = await models.assetmaster.findAll({
      attributes: ['po_num'],
      raw: true,
    });

    // 2. Get po_num from assetmaster_staging
    const poNumsInStaging = await models.assetmaster_staging.findAll({
      attributes: ['po_num'],
      raw: true,
    });
    const stagingPoNums = poNumsInStaging.map(row => row.po_num);

    // 3. Get ALL po_num from invoice_assignment_staging
    const allInvoicePOs = await models.invoice_assignment_staging.findAll({
      attributes: ['po_num'],
      raw: true,
    });
    const invoicePoNums = allInvoicePOs.map(row => row.po_num);

    // 4. Get po_num from invoice_assignment_staging where invoice_status is 'Approved'
    const approvedPOs = await models.invoice_assignment_staging.findAll({
      where: { invoice_status: 'Approved' },
      attributes: ['po_num'],
      raw: true,
    });
    const approvedPoNums = approvedPOs.map(row => row.po_num);

    // 5. Unassigned POs: not in assetmaster, not in staging, not approved
    const exclusionList = [
      ...poNumsInAssetmaster.map(row => row.po_num),
      ...stagingPoNums,
      ...approvedPoNums,
    ];

    const unassignedPOs = await models.po_processing.findAll({
      where: {
        po_num: {
          [Op.notIn]: exclusionList,
        },
      },
      attributes: ['po_num'],
      raw: true,
    });

    const unassignedPoNums = unassignedPOs.map(po => po.po_num);

    // 6. Staged but not invoiced POs: in assetmaster_staging, not in invoice_assignment_staging
    const stagedNotInvoicedPoNums = stagingPoNums.filter(po => !invoicePoNums.includes(po));

    // 7. Combine both and remove duplicates
    const combinedPoNums = [...new Set([...unassignedPoNums, ...stagedNotInvoicedPoNums])];

    res.status(200).json(combinedPoNums);
  } catch (err) {
    console.error('Error fetching PO numbers:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});



// ✅ Fetch PO product details (with asset_creation_at check)
router.get("/po_details/:poNumber", async (req, res) => {
  let { poNumber } = req.params;
  poNumber = decodeURIComponent(poNumber).trim(); // Decode and trim the incoming param

  try {
    // ✅ Find the PO from po_processing
    const po = await po_processing.findOne({
      where: sequelize.where(
        sequelize.fn("TRIM", sequelize.col("po_num")),
        poNumber
      ),
    });

    if (!po) {
      return res.status(404).json({ error: "PO not found" });
    }

    // ✅ Get PO Products from po_products
    const poProducts = await po_products.findAll({
      where: { po_num: po.po_num },
      attributes: [
        ["item_description", "item_description"],
        ["quantity", "quantity"]
      ]
    });

    // ✅ Attach asset_type from po_processing to each product
    const productsWithType = poProducts.map((product) => ({
      asset_type: po.asset_type,
      item_description: product.item_description,
      quantity: product.quantity,
    }));

    res.status(200).json({
      asset_creation_at: po.asset_creation_at,
      asset_type: po.asset_type,
      products: productsWithType
    });
  } catch (err) {
    console.error("❌ Error fetching PO details:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Generate asset IDs
router.get('/next-asset-ids/:po_num', async (req, res) => {
  const { po_num } = req.params;
  poNumber = decodeURIComponent(po_num).trim();

  try {
    // Step 1: Get asset_type from po_processing for the given po_num
    const poData = await po_processing.findOne({ where: { po_num }, raw: true });
    if (!poData || !poData.asset_type) {
      return res.status(404).json({ message: "PO not found or asset_type missing." });
    }

    const assetType = poData.asset_type;

    // Step 2: Get asset_code for this asset_type from asset_types
    const assetTypeData = await asset_types.findOne({
      where: { asset_type: assetType },
      raw: true,
    });

    if (!assetTypeData || !assetTypeData.asset_code) {
      return res.status(404).json({ message: "Asset code not found for asset_type." });
    }

    const assetCode = assetTypeData.asset_code;

    // Step 3: Get the quantity from po_products for the selected po_num
    const poProducts = await po_products.findAll({
      where: { po_num },
      attributes: ['quantity'],
      raw: true,
    });

    if (!poProducts.length) {
      return res.status(404).json({ message: "No products found for this PO number." });
    }

    // Step 4: Calculate the total quantity
    const totalQuantity = poProducts.reduce((sum, product) => sum + product.quantity, 0);

    // Validate total quantity
    if (totalQuantity <= 0) {
      return res.status(400).json({ message: "Invalid total quantity for PO." });
    }

    // Step 5: Get max asset_id from assetmaster
    const maxMain = await assetmaster.findOne({
      where: { asset_type: assetType },
      attributes: [
        [assetmaster.sequelize.fn('MAX', assetmaster.sequelize.col('asset_id')), 'max_id']
      ],
      raw: true,
    });

    // Step 6: Get max asset_id from assetmaster_staging
    const maxStaging = await assetmaster_staging.findOne({
      where: { asset_type: assetType },
      attributes: [
        [assetmaster_staging.sequelize.fn('MAX', assetmaster_staging.sequelize.col('asset_id')), 'max_id']
      ],
      raw: true,
    });

    // Step 7: Extract numeric part of ID and get the next starting number
    const extractNumber = (id) => {
      if (!id) return 0;
      const parts = id.split('/');
      return parseInt(parts[2]) || 0;
    };

    const max1 = extractNumber(maxMain?.max_id);
    const max2 = extractNumber(maxStaging?.max_id);
    let start = Math.max(max1, max2);

    // Step 8: Generate the asset_ids based on the total quantity
    const assetIds = [];
    for (let i = 1; i <= totalQuantity; i++) {
      const id = `SCPL/${assetCode}/${String(start + i).padStart(4, '0')}`;
      assetIds.push(id);
    }

    return res.json({
      po_num,
      asset_type: assetType,
      asset_code: assetCode,
      generated_asset_ids: assetIds
    });

  } catch (error) {
    console.error("Error in /next-asset-ids:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

router.get('/locations', async (req, res) => {
  try {
    const states = await userlogins.findAll({
      attributes: [
        [Sequelize.fn('DISTINCT', Sequelize.col('state')), 'state']
      ],
      where: {
        state: { [Sequelize.Op.ne]: null }
      },
      raw: true
    });

    const branches = await userlogins.findAll({
      attributes: [
        [Sequelize.fn('DISTINCT', Sequelize.col('branchid_name')), 'branchid_name']
      ],
      where: {
        branchid_name: { [Sequelize.Op.ne]: null }
      },
      raw: true
    });

    res.json({
      states: states.map(s => s.state),
      baseLocations: branches.map(b => b.branchid_name)
    });
  } catch (error) {
    console.error('Error fetching location options:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// routes/invoices.js
router.post("/upload_invoice", upload.single("invoiceFile"), async (req, res) => {
  console.log("Body:", req.body);
  console.log("File:", req.file);

  const transaction = await sequelize.transaction();

  try {
    const {
      invoice_number,
      invoice_date,
      po_number,
      requested_by,
      base_location,
      state,
      Warranty_status,
      assetData,
      asset_type,
    } = req.body;

    const file = req.file;

    if (!po_number || !invoice_number || !invoice_date || !requested_by || !file) {
      return res.status(400).json({ error: "Missing required fields or file." });
    }

    const validExtensions = ["pdf"];
    const fileExtension = file.originalname.split(".").pop().toLowerCase();

    if (!validExtensions.includes(fileExtension)) {
      return res.status(400).json({ error: "❌ Invalid file type. Only PDF files are allowed." });
    }

    let parsedAssetData = [];

    if (assetData && base_location && state && asset_type) {
      // Parse asset data only if asset creation is intended
      parsedAssetData = JSON.parse(assetData);

      const serialNumbersToCheck = parsedAssetData
        .map((item) => item.serial_no?.trim())
        .filter(Boolean);

      const [existingFromAssetmaster, existingFromStaging] = await Promise.all([
        assetmaster.findAll({
          where: {
            imei_num: {
              [Op.in]: serialNumbersToCheck,
            },
          },
          attributes: ["imei_num"],
        }),
        assetmaster_staging.findAll({
          where: {
            imei_num: {
              [Op.in]: serialNumbersToCheck,
            },
          },
          attributes: ["imei_num"],
        }),
      ]);

      const existingSerials = new Set([
        ...existingFromAssetmaster.map((row) => row.imei_num),
        ...existingFromStaging.map((row) => row.imei_num),
      ]);

      if (existingSerials.size > 0) {
        await transaction.rollback();
        return res.status(400).json({
          message: "Duplicate serial numbers found in database.",
          duplicateSerials: Array.from(existingSerials),
        });
      }
    }

    const s3Key = `IT_Asset_Management/Invoices/${po_number}_invoice_${Date.now()}.pdf`;
    const s3Url = await uploadToS3(file.buffer, s3Key, file.mimetype);

    // Update PO invoice fields
    await po_processing_staging.update(
      {
        invoice_num: invoice_number,
        invoice_date: invoice_date,
        invoice_url: s3Url,
        updated_at: new Date(),
      },
      { where: { po_num: po_number }, transaction }
    );

    // Insert asset data only if available
    if (parsedAssetData.length > 0) {
      for (const item of parsedAssetData) {
        await assetmaster_staging.create(
          {
            asset_id: item.asset_id,
            asset_type: asset_type,
            brand: item.brand,
            model: item.model,
            imei_num: item.serial_no,
            warranty_status:Warranty_status,
            po_num: po_number,
            po_date: invoice_date,
            base_location: base_location,
            state: state,
          },
          { transaction }
        );
      }
    }

    const requestor = await userlogins.findOne({
      where: { emp_id: requested_by },
      attributes: ["emp_id", "emp_name", "email"],
    });

    if (!requestor) {
      await transaction.rollback();
      return res.status(404).json({ error: "Requestor not found." });
    }

    const approver = await userlogins.findOne({
      where: { designation_name: "HO" },
      attributes: ["emp_id", "emp_name", "email"],
    }) || {
      emp_id: "0000",
      emp_name: "Default Approver",
      email: "default-approver@company.com",
    };

    const latestAssignmentId = await invoice_assignment_staging.max("assignment_id");
    const newAssignmentId = latestAssignmentId ? latestAssignmentId + 1 : 1;

    await invoice_assignment_staging.create(
      {
        assignment_id: newAssignmentId,
        po_num: po_number,
        invoice_num: invoice_number,
        invoice_status: "Pending",
        requested_by: requestor.emp_id,
        requested_at: new Date(),
      },
      { transaction }
    );

    await transaction.commit();

    await sendEmail({
      to: approver.email,
      subject: `🧾 New InvoiceApproval - PO ${po_number}`,
      html: `
        <h3>New InvoiceUploaded for Approval</h3>
        <p><strong>PO Number:</strong> ${po_number}</p>
        <p><strong>InvoiceNumber:</strong> ${invoice_number}</p>
        <p><strong>Requested By:</strong> ${requestor.emp_name} (${requestor.emp_id})</p>
        <p><a href="${s3Url}">View InvoicePDF</a></p>
      `,
      attachments: [
        {
          filename: `${po_number}_invoice.pdf`,
          content: file.buffer,
          contentType: file.mimetype,
        },
      ],
    });

    res.status(200).json({
      message: "Invoice uploaded and approval request sent.",
      requestor: requestor.emp_id,
      approver: approver.emp_id,
    });

  } catch (err) {
    console.error("❌ Upload Error:", err);
    await transaction.rollback();
    res.status(500).json({ error: "Failed to upload invoice and send approval request." });
  }
});

module.exports = router;