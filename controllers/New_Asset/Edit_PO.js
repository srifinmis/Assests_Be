const express = require("express");
const router = express.Router();
const { sequelize } = require("../../config/db");
const initModels = require("../../models/init-models");
const models = initModels(sequelize);
const multer = require('multer');
const path = require('path');
const fs = require('fs-extra'); // Using fs-extra for better file operations
const {
  po_processing,
  po_products_staging,
  po_processing_assignment_staging,
  po_processing_staging,
} = models;

// Configure multer for file upload
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, '../../utils/uploads');
    // Create directory if it doesn't exist
    fs.ensureDirSync(uploadDir);
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    // Sanitize po_num for filename to match CreatePO.js
    const poNum = req.params.poNum;
    const sanitizedPONum = poNum.replace(/[^a-zA-Z0-9-]/g, "-");
    cb(null, `PO-${sanitizedPONum}.pdf`);
  }
});

const upload = multer({
  storage: storage,
  fileFilter: function (req, file, cb) {
    if (file.mimetype !== 'application/pdf') {
      return cb(new Error('Only PDF files are allowed'));
    }
    cb(null, true);
  }
});

// Get available POs for editing (pending or rejected)
router.get("/available", async (req, res) => {
  try {
    const availablePOs = await po_processing_assignment_staging.findAll({
      where: {
        po_status: ['Pending', 'Rejected']
      },
      attributes: ['po_num', 'po_status', 'requested_at'], // include requested_at
    });

    res.json(availablePOs);
  } catch (error) {
    console.error("Error fetching available POs:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});


// Get PO details for editing
router.get("/:poNum", async (req, res) => {
  try {
    const { poNum } = req.params;

    // Find the PO in staging
    const po = await po_processing_staging.findOne({
      where: { po_num: poNum }
    });

    if (!po) {
      return res.status(404).json({ error: "PO not found" });
    }

    // Get PO products
    const products = await po_products_staging.findAll({
      where: { po_num: poNum }
    });

    // Get assignment details
    const assignment = await po_processing_assignment_staging.findOne({
      where: { po_num: poNum }
    });
  
    // console.log("assignment",assignment);
    res.json({
      po_details: po,
      products: products,
      assignment: assignment
    });
  } catch (error) {
    console.error("Error fetching PO details:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Update PO
router.put("/:poNum", upload.single('po_pdf'), async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const { poNum } = req.params;
    const poData = JSON.parse(req.body.po_data);
    console.log("edit: ", poData)

    // Get existing PO details including po_url
    const existingPO = await po_processing_staging.findOne({
      where: { po_num: poNum }
    });

    if (!existingPO) {
      await transaction.rollback();
      return res.status(404).json({ error: "PO not found" });
    }
    const existingAssignment = await po_processing_assignment_staging.findOne({
      where: { po_num: poNum }
    });

    if (!existingAssignment) {
      await transaction.rollback();
      return res.status(404).json({ error: "PO assignment status not found" });
    }

    // If the status is Rejected, we proceed with updating and resetting status to Pending
    const shouldResetStatus = existingAssignment.po_status === "Rejected";



    // If new PDF is uploaded, handle file replacement
    let po_url = existingPO.po_url;
    if (req.file) {
      // Delete old PDF if it exists
      if (existingPO.po_url) {
        const oldFilePath = path.join(__dirname, '../../utils', existingPO.po_url);
        if (await fs.pathExists(oldFilePath)) {
          try {
            await fs.remove(oldFilePath);
          } catch (err) {
            console.error('Error deleting old PDF:', err);
          }
        }
      }

      // Use the same URL structure as CreatePO.js
      const sanitizedPONum = poNum.replace(/[^a-zA-Z0-9-]/g, "-");
      po_url = `/utils/uploads/PO-${sanitizedPONum}.pdf`;
    }

    // Rest of the update logic...
    const {
      po_date,
      asset_type,
      asset_creation_at,
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
      gst,
      updated_by
    } = poData;

    // Update PO details in staging
    await po_processing_staging.update({
      po_date,
      asset_type,
      asset_creation_at,
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
      gst: gst || 18,
      subtotal: totals.subtotal,
      total: totals.grandTotal,
      po_url,
      updatedat: new Date()
    }, {
      where: { po_num: poNum },
      transaction
    });

    // Delete existing products
    await po_products_staging.destroy({
      where: { po_num: poNum },
      transaction
    });

    // Create new products
    for (let i = 0; i < line_items.length; i++) {
      const item = line_items[i];
      const gstValue = gst || 18; // Use GST from poData
      const cgst = gstValue / 2;
      const sgst = gstValue / 2;

      await po_products_staging.create({
        product_id: `${poNum}-product-${i + 1}`,
        po_num: poNum,
        item_description: item.asset_name,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total_price_excl_gst: item.quantity * item.unit_price,
        cgst: parseFloat(cgst.toFixed(2)),
        sgst: parseFloat(sgst.toFixed(2)),
        total_price_incl_gst: parseFloat((item.quantity * item.unit_price * (1 + gstValue / 100)).toFixed(2))
      }, { transaction });
    }

    // Update assignment status if needed
    if (updated_by && shouldResetStatus) {
      await po_processing_assignment_staging.update({
        po_status: "Pending",
        requested_by: updated_by,
        requested_at: new Date()
      }, {
        where: { po_num: poNum },
        transaction
      });
    }

    await transaction.commit();
    res.json({ message: "PO updated successfully" });
  } catch (error) {
    await transaction.rollback();
    console.error("Error updating PO:", error);
    res.status(500).json({ error: "Failed to update PO" });
  }
});

module.exports = router;