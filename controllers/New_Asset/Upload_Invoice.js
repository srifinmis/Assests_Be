// controllers/New_Asset/Upload_Receipt.js
const express = require("express");
const router = express.Router();
const multer = require("multer");
const { uploadToS3 } = require("../../utils/s3Service"); // ✅ Add this
const { v4: uuidv4 } = require("uuid");
const { sequelize } = require("../../config/db");
const initModels = require("../../models/init-models");
const sendEmail = require("../../utils/sendEmail");
require("dotenv").config();

const models = initModels(sequelize);
const {
  po_processing,
  po_products,
  po_processing_staging,
  invoice_assignment_staging,
  assetmaster_staging,
  userlogins
} = models;

const storage = multer.memoryStorage();
const upload = multer({ storage });
// ✅ Fetch PO Numbers from `po_processing`
router.get("/po_no", async (req, res) => {
  try {
    const poNumbers = await po_processing.findAll({ attributes: ["po_num"] });
    const result = poNumbers.map((po) => po.po_num);
    res.json(result);
  } catch (error) {
    console.error("❌ Error fetching PO numbers:", error);
    res.status(500).json({ error: "Internal Server Error" });
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

// routes/asset.js
router.get('/next-asset-ids/:count', async (req, res) => {
  try {
    const count = parseInt(req.params.count, 10);
    if (isNaN(count) || count < 1 || count > 100) {
      return res.status(400).json({ error: 'Invalid count' });
    }

    // Get the maximum numeric asset_id directly
    const [result] = await sequelize.query(`
      SELECT MAX(asset_id) AS max_id FROM assetmaster
    `);

    const maxId = result[0]?.max_id || 0;

    // Generate next `count` IDs
    const nextIds = Array.from({ length: count }, (_, i) => maxId + i + 1);

    res.json({ nextAssetIds: nextIds });

  } catch (err) {
    console.error('Error in next-asset-ids:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post("/upload_receipt", upload.single("invoiceFile"), async (req, res) => {
  console.log("Body:", req.body);
  console.log("File:", req.file);

  const transaction = await sequelize.transaction(); // Begin transaction

  try {
    const {
      invoice_number,
      invoice_date,
      po_number,
      requested_by,
      base_location,
      state,
      assetData,
      asset_type,
    } = req.body;

    const file = req.file;

    if (!po_number || !invoice_number || !invoice_date || !base_location || !state || !assetData || !file || !asset_type) {
      return res.status(400).json({ error: "Missing required fields or file." });
    }

    const parsedAssetData = JSON.parse(assetData);

    // ✅ Validate file extension (PDF only)
    const validExtensions = ["pdf"];
    const fileExtension = file.originalname.split(".").pop().toLowerCase();

    if (!validExtensions.includes(fileExtension)) {
      return res.status(400).json({ error: "❌ Invalid file type. Only PDF files are allowed." });
    }

    const s3Key = `IT_Asset_Management/Payments/${po_number}_receipt_${Date.now()}.pdf`;

    // ✅ Upload to S3
    const s3Url = await uploadToS3(file.buffer, s3Key, file.mimetype);

    // ✅ Update PO processing table
    await po_processing_staging.update(
      {
        invoice_num: invoice_number,
        invoice_date: invoice_date,
        invoice_url: s3Url,
        updated_at: new Date(),
      },
      { where: { po_num: po_number }, transaction }
    );

    // ✅ Insert asset details into assetmaster_staging
    for (const item of parsedAssetData) {
      await assetmaster_staging.create(
        {
          asset_id: item.asset_id,
          asset_type: asset_type,
          brand: item.brand,
          model: item.model,
          imei_num: item.serial_no,
          po_num: po_number,
          base_location: base_location,
          state: state,
        },
        { transaction }
      );
    }

    // ✅ Fetch PO requestor
    const requestor = await userlogins.findOne({
      where: { emp_id: requested_by },
      attributes: ["emp_id", "emp_name", "email"],
    });

    if (!requestor) {
      await transaction.rollback();
      return res.status(404).json({ error: "Requestor not found." });
    }

    // ✅ Fetch approver
    const approver = await userlogins.findOne({
      where: { designation_name: "HO" },
      attributes: ["emp_id", "emp_name", "email"],
    }) || {
      emp_id: "0000",
      emp_name: "Default Approver",
      email: "default-approver@company.com",
    };

    // ✅ Create invoice assignment staging entry
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

    // ✅ Commit transaction
    await transaction.commit();

    // ✅ Send approval email
    await sendEmail({
      to: approver.email,
      subject: `🧾 New Payment Receipt Approval - PO ${po_number}`,
      html: `
        <h3>New Payment Receipt Uploaded for Approval</h3>
        <p><strong>PO Number:</strong> ${po_number}</p>
        <p><strong>Payment Receipt Number:</strong> ${invoice_number}</p>
        <p><strong>Requested By:</strong> ${requestor.emp_name} (${requestor.emp_id})</p>
        <p><a href="${s3Url}">View Payment Receipt PDF</a></p>
      `,
      attachments: [
        {
          filename: `${po_number}_receipt.pdf`,
          content: file.buffer,
          contentType: file.mimetype,
        },
      ],
    });

    res.status(200).json({
      message: "Payment Receipt uploaded and approval request sent.",
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