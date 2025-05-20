//controllers/CreatePO.js
const express = require("express");
const router = express.Router();

const { sequelize } = require("../config/db");
const initModels = require("../models/init-models");

const models = initModels(sequelize); 
const { po_processing_assignment_staging, po_processing_staging,po_products_staging, asset_types, userlogins  } = models;


const path = require('path');
const fs = require('fs-extra');  // Changed to fs-extra
const { generatePOPDF } = require("../utils/pdfGenerator");
const { uploadToS3 } = require('../utils/s3Service');  // Adjust path as needed
const sendEmail = require("../utils/sendEmail"); 

const { S3Client, GetObjectCommand } = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
const s3 = new S3Client({ region: process.env.AWS_REGION });
const BUCKET_NAME = "sfin-reporting-layer-logs";
const PO_DIRECTORY = "IT_Asset_Management/PO";

router.get("/next-po-number", async (req, res) => {
  try {
    const latestPO = await po_processing_assignment_staging.findOne({
      order: [["po_num", "DESC"]],
      where: {
        po_num: {
          [require("sequelize").Op.like]: "IT Equip:%",
        },
      },
    });

    let nextNumber = 1;
    if (latestPO && latestPO.po_num) {
      const match = latestPO.po_num.match(/IT Equip:\s*(\d+)/);
      if (match && match[1]) {
        nextNumber = parseInt(match[1]) + 1;
      }
    }

    const nextPONum = `IT Equip: ${nextNumber.toString().padStart(4, "0")}`;

    res.json({ po_num: nextPONum });
  } catch (err) {
    console.error("Error fetching next PO number:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});


router.get("/asset-types", async (req, res) => {
  try {
    const assetTypes = await asset_types.findAll();
    res.json(assetTypes);
  } catch (error) {
    res.status(500).json({ error: 'Error fetching asset types' });
  }
});

router.post('/preview', async (req, res) => {
  try {
    const poData = req.body;
    if (!poData || !poData.po_num) {
      return res.status(400).json({ message: 'Missing PO data or PO number' });
    }

    // Generate PDF
    const pdfPath = await generatePOPDF(poData);
    if (!await fs.pathExists(pdfPath)) {
      return res.status(400).json({ error: "PDF not found." });
    }

    // Stream the PDF file to the response
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="PO-${poData.po_num}.pdf"`);

    const stream = fs.createReadStream(pdfPath);
    stream.pipe(res);

    // Clean up the temporary file after streaming
    stream.on('end', () => {
      fs.remove(pdfPath).catch(err => console.error('Error cleaning up temp file:', err));
    });
  } catch (error) {
    console.error('❌ Error in preview_po:', error);
    res.status(500).json({ message: 'Failed to generate PO preview', error: error.message });
  }
});

router.post("/request_po", async (req, res) => {
  try {
    const poData = req.body;

    const {
      po_num,
      po_date,
      asset_type,
      asset_creation,
      gst,
      client_name,
      client_email,
      client_gst_num,
      client_phone_num,
      client_address,
      vendor_name,
      vendor_phone_num,
      vendor_email,
      vendor_gst_num,
      vendor_address,
      shipping_name,
      shipping_phone_num,
      shipping_address,
      delivery_terms,
      payment_terms,
      warranty,
      line_items,
      totals,
      requested_by,
    } = poData;

    if (!po_num || !line_items || !Array.isArray(line_items) || line_items.length === 0) {
      return res.status(400).json({ error: "Invalid PO data. PO number and items are required." });
    }

    const existingPO = await po_processing_staging.findByPk(po_num);
    if (existingPO) {
      return res.status(400).json({ error: "PO Number already exists." });
    }

    // ✅ 1. Create PO record in po_processing_staging
    const newPO = await po_processing_staging.create({
      po_num,
      po_date,
      asset_type,
      asset_creation_at: asset_creation,
      gst,
      client_name,
      client_email,
      client_gst_num,
      client_phone_num,
      client_address,
      vendor_name,
      vendor_phone_num,
      vendor_email,
      vendor_gst_num,
      vendor_address,
      shipping_name,
      shipping_phone_num,
      shipping_address,
      delivery_terms,
      payment_terms,
      warranty,
      subtotal: totals.subtotal,
      total: totals.grandTotal,
      status: "Pending",
      requested_by,
      created_at: new Date(),
    });

    // ✅ 2. Insert each line item into po_products_staging
    for (let i = 0; i < line_items.length; i++) {
      const item = line_items[i];

      const gstValue = poData.gst;
      const cgst = gstValue / 2;
      const sgst = gstValue / 2;

      await po_products_staging.create({
        product_id: `${po_num}-product-${i + 1}`, // 🛠 unique ID
        po_num,
        item_description: item.asset_name,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total_price_excl_gst: item.quantity * item.unit_price,
        cgst: parseFloat(cgst.toFixed(2)),
        sgst: parseFloat(sgst.toFixed(2)),
        total_price_incl_gst: parseFloat((item.quantity * item.unit_price * (1 + gstValue / 100)).toFixed(2)),
      });
    }

    // ✅ 3. Fetch requestor details
    const requestor = await userlogins.findOne({
      where: { emp_id: requested_by },
      attributes: ["emp_id", "emp_name", "email"],
    });

    if (!requestor) {
      return res.status(404).json({ error: "Requestor not found." });
    }

    const lastAssignment = await po_processing_assignment_staging.findOne({
      order: [["assignment_id", "DESC"]],
    });
    const nextAssignmentId = lastAssignment ? lastAssignment.assignment_id + 1 : 1;

    await po_processing_assignment_staging.create({
      assignment_id: nextAssignmentId,
      po_num,
      po_status: "Pending",
      requested_by: requestor.emp_id,
      requested_at: new Date(),
    });

    // ✅ 4. Generate PDF and save locally
    let poUrl = null;
    const uploadDir = path.join(__dirname, "../utils/uploads");

    try {
      // Ensure upload directory exists
      await fs.ensureDir(uploadDir);

      const tempPdfPath = await generatePOPDF(poData);
      if (!await fs.pathExists(tempPdfPath)) {
        return res.status(400).json({ error: "PDF not found." });
      }

      // Sanitize po_num for filename
      const sanitizedPONum = po_num.replace(/[^a-zA-Z0-9-]/g, "-");
      const fileName = `PO-${sanitizedPONum}.pdf`;
      const localFilePath = path.join(uploadDir, fileName);

      // Copy the generated PDF to uploads directory
      await fs.copy(tempPdfPath, localFilePath);

      // Update PO record with web-accessible URL path
      poUrl = `/utils/uploads/${fileName}`;  // Store web-accessible path instead of absolute path
      await po_processing_staging.update(
        { po_url: poUrl },
        { where: { po_num: po_num } }
      );

      // Clean up the temporary file
      await fs.remove(tempPdfPath);

    } catch (err) {
      console.error("❌ Error generating or saving PO PDF locally:", err);
      return res.status(500).json({ error: "Failed to generate or save PO PDF locally." });
    }

    // ✅ 5. Send email
    const approverDetails = await userlogins.findOne({
      where: { designation_name: "HO" },
      attributes: ["emp_id", "email"],
    }) || { emp_id: "0000", email: "default-approver@company.com" };

    let emailStatus = "failed";
    try {
      await sendEmail({
        to: approverDetails.email,
        subject: `PO Approval Request - ${po_num}`,
        html: `<h2>New PO Approval Request</h2>
          <p>A new PO <strong>${po_num}</strong> has been submitted for approval.</p>
          <p><strong>Requested By:</strong> ${requestor.emp_name} (${requestor.emp_id})</p>
          <p>Please review and take necessary action.</p>`,
      });
      emailStatus = "sent";
    } catch (err) {
      console.error("Failed to send email:", err);
    }
    
    res.status(201).json({
      success: "true",
      message: "PO submitted for approval",
      emailStatus,
    });
  } catch (err) {
    console.error("Internal error:", err);
    res.status(500).json({ error: "Internal Server Error", details: err.message });
  }
});

// Add new endpoint to get saved PO PDF
router.get("/get_po_pdf/:poNum", async (req, res) => {
  try {
    const poNum = req.params.poNum;
    if (!poNum) {
      return res.status(400).json({ error: "PO number is required" });
    }

    // Sanitize poNum for filename
    const sanitizedPONum = poNum.replace(/[^a-zA-Z0-9-]/g, "-");
    const fileName = `PO-${sanitizedPONum}.pdf`;
    const filePath = path.join(__dirname, '../utils/uploads', fileName);

    // Check if file exists
    if (!await fs.pathExists(filePath)) {
      return res.status(404).json({ error: "PDF file not found" });
    }

    // Stream the file
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${fileName}"`);
    
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);

  } catch (error) {
    console.error("Error serving PO PDF:", error);
    res.status(500).json({ error: "Failed to serve PO PDF" });
  }
});

module.exports = router;