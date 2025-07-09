// controllers/New_Asset/Upload_Receipt.js
const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require('path');
const fs = require('fs-extra');
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

// Configure multer for local storage
const storage = multer.diskStorage({
  destination: async function (req, file, cb) {
    const uploadDir = path.join(__dirname, '../../utils/uploads');
    // await fs.ensureDir(uploadDir);
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const po_number = req.body.po_number;
    const sanitizedPONum = po_number.replace(/[^a-zA-Z0-9-]/g, "-");
    cb(null, `${sanitizedPONum}_invoice_${Date.now()}.pdf`);
  }
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed'));
    }
  },
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});

router.post("/upload", upload.single("invoice"), async (req, res) => {

    let transaction;
    try {
      // console.log("uploaded file:", req.file);
      // console.log("upload request api: ", req.body)
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }
  
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
  
      // Check if PO exists and is not already invoiced
      const existingInvoice = await invoice_assignment_staging.findOne({
        where: { po_num: po_number }
      });
  
      if (existingInvoice) {
        return res.status(400).json({ error: "Invoice already exists for this PO" });
      }
  
      // Get the local file path
      const localFilePath = req.file.path;
      const fileName = path.basename(localFilePath);
      const fileUrl = `/utils/uploads/${fileName}`;
  
      // Create invoice record
      const invoice = await invoice_assignment_staging.create({
        po_num: po_number,
        invoice_num: invoice_number,
        invoice_date: invoice_date,
        // invoice_amount: invoice_amount,
        // gst_amount: gst_amount || 0,
        // total_amount: total_amount || invoice_amount,
        invoice_status: "Pending",
        requested_by: requested_by,
        requested_at: new Date(),
        invoice_url: fileUrl
      });
      await po_processing_staging.update(
        {
          invoice_num: invoice_number,
          invoice_url: fileUrl,
          updated_at: new Date(),
          invoice_date: invoice_date
        },
        { where: { po_num: po_number } }
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
              warranty_status: Warranty_status,
              po_num: po_number,
              po_date: invoice_date,
              base_location: base_location,
              state: state,
            },
            { transaction }
          );
        }
      }
  
  
      // Send email notification
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
      try {
        await sendEmail({
          to: approver.email,
          subject: `Invoice Approval Request - ${invoice_number}`,
          html: `
            <h2>New Invoice Approval Request</h2>
            <p>A new invoice <strong>${invoice_number}</strong> has been submitted for approval.</p>
            <p><strong>PO Number:</strong> ${po_number}</p>
            <p><strong>Amount:</strong> ${invoice_amount || "0"}</p>
            <p><a href="${fileUrl}">View Invoice PDF</a></p>
            <p>Please review and take necessary action.</p>
          `,
        });
      } catch (emailError) {
        console.error("Failed to send email:", emailError);
      }
  
      res.status(201).json({
        success: true,
        message: "Invoice uploaded successfully",
        data: {
          invoice_id: invoice.invoice_id,
          file_url: fileUrl
        }
      });
  
    } catch (error) {
      console.error("Error uploading invoice:", error);
      res.status(500).json({ error: "Failed to upload invoice" });
    }
  });

  module.exports = router;