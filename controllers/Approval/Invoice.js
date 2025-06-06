const express = require("express");
const router = express.Router();
const { sequelize } = require("../../config/db");
const initModels = require("../../models/init-models");
const models = initModels(sequelize);
const { Op } = require("sequelize");
const path = require('path');
const fs = require('fs-extra');
const sendEmail = require("../../utils/sendEmail");
const calculateDepreciation = require("../../utils/Depreciation");


const { invoice_assignment_staging, userlogins, po_processing_staging, po_processing, assetmaster_staging } = models;

// GET /api/invoice-approvals
router.get("/invoice", async (req, res) => {
  try {
    const data = await invoice_assignment_staging.findAll({
      where: { invoice_status: "Pending" },
      attributes: ["assignment_id", "po_num", "invoice_num", "invoice_status", "requested_by"],
      include: [
        {
          model: po_processing_staging,
          as: "po_num_po_processing_staging",
          attributes: ["invoice_url", "asset_creation_at"]
        }
      ]
    });

    const poNums = data.map(p => p.po_num);

    // Step 3: Fetch asset data separately
    const assetData = await assetmaster_staging.findAll({
      where: {
        po_num: { [Op.in]: poNums }
      },
      attributes: ["asset_id", "asset_type", "brand", "model", "imei_num", "po_num", "po_date", "base_location", "state"]
    });

    // Step 4: Map assets to their PO numbers
    const poAssetMap = {};
    for (const asset of assetData) {
      if (!poAssetMap[asset.po_num]) {
        poAssetMap[asset.po_num] = [];
      }
      poAssetMap[asset.po_num].push({
        asset_id: asset.asset_id,
        asset_type: asset.asset_type,
        brand: asset.brand,
        model: asset.model,
        imei_num: asset.imei_num,
        po_num: asset.po_num,
        po_date: asset.po_date,
        base_location: asset.base_location,
        state: asset.state
      });
    }

    const formatted = data.map(item => ({
      assignment_id: item.assignment_id,
      po_num: item.po_num,
      invoice_num: item.invoice_num,
      invoice_status: item.invoice_status,
      requested_by: item.requested_by,
      invoice_url: item.po_num_po_processing_staging?.invoice_url || null,
      asset_creation_at: item.po_num_po_processing_staging?.asset_creation_at || null,
      assets: poAssetMap[item.po_num] || []
    }));

    res.json(formatted);
  } catch (error) {
    console.error("Error fetching PO approvals:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.get("/get_invoice_pdf/:invoice_url", async (req, res) => {
  try {
    let invoice_url = req.params.invoice_url;

    if (!invoice_url) {
      return res.status(400).json({ error: "Invoice Url is required" });
    }

    console.log("Invoice URL param:", invoice_url);

    // Extract only the part after "/uploads/"
    const uploadsIndex = invoice_url.indexOf("/uploads/");
    if (uploadsIndex !== -1) {
      invoice_url = invoice_url.substring(uploadsIndex + "/uploads/".length);
    }

    const fileName = invoice_url;
    const filePath = path.join(__dirname, '../../utils/uploads', fileName);

    if (!await fs.pathExists(filePath)) {
      return res.status(404).json({ error: "PDF file not found" });
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${fileName}"`);

    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);

  } catch (error) {
    console.error("Error serving invoice PDF:", error);
    res.status(500).json({ error: "Failed to serve invoice PDF" });
  }
});

router.post("/action", async (req, res) => {
  const { action, assignmentIds, approved_by, remark } = req.body;
  const normalizedAction = action?.trim().toLowerCase();

  if (normalizedAction === "reject" && !remark) {
    return res.status(400).json({ error: "Remarks are mandatory for rejection." });
  }

  const transaction = await sequelize.transaction();

  try {
    // ✅ Approver validation
    const approver = await userlogins.findOne({
      where: { emp_id: approved_by },
      attributes: ["emp_id", "email", "emp_name"],
      transaction,
    });

    if (!approver) {
      await transaction.rollback();
      return res.status(404).json({ error: "Approver not found" });
    }

    const newStatus = normalizedAction === "approve" ? "Approved" : "Rejected";

    // ✅ Update invoice assignment staging
    await invoice_assignment_staging.update(
      {
        invoice_status: newStatus,
        approved_by,
        approved_at: new Date(),
        remarks: String(remark),
      },
      {
        where: {
          assignment_id: { [Op.in]: assignmentIds },
        },
        transaction,
      }
    );

    if (normalizedAction === "reject") {
      // Step 1: Fetch the rejected po_nums from payment_assignment_staging
      const rejectedPoData = await invoice_assignment_staging.findAll({
        where: {
          assignment_id: { [Op.in]: assignmentIds },
        },
        attributes: ['po_num'],
        raw: true,
        transaction,
      });

      const rejectedPoNums = rejectedPoData.map(p => p.po_num);

      // Step 2: Delete from assetmaster_staging where po_num is in rejectedPoNums
      await assetmaster_staging.destroy({
        where: {
          po_num: { [Op.in]: rejectedPoNums },
        },
        transaction,
      });
    }

    let invoiceData = [];

    if (normalizedAction === "approve") {
      // ✅ Get PO and Invoice mapping
      invoiceData = await invoice_assignment_staging.findAll({
        where: { assignment_id: { [Op.in]: assignmentIds } },
        attributes: ["po_num", "invoice_num"],
        raw: true,
        transaction,
      });

      // ✅ Update po_processing from staging
      for (const data of invoiceData) {
        const poProcessingData = await po_processing_staging.findOne({
          where: {
            po_num: data.po_num,
            invoice_num: data.invoice_num,
          },
          attributes: ["po_num", "invoice_num", "invoice_date", "invoice_url"],
          raw: true,
          transaction,
        });

        if (poProcessingData) {
          await po_processing.update(
            {
              po_num: poProcessingData.po_num,
              invoice_num: poProcessingData.invoice_num,
              invoice_date: poProcessingData.invoice_date,
              invoice_url: poProcessingData.invoice_url,
            },
            {
              where: { po_num: poProcessingData.po_num },
              transaction,
            }
          );
        }
      }

      // ✅ Only if invoices exist
      if (invoiceData.length > 0) {
        const approvedPoNums = invoiceData.map(d => d.po_num);

        // Step 1: Filter POs with asset_creation_at = 'invoice' from po_processing
        const poNumsWithInvoiceAssetCreation = await po_processing.findAll({
          where: {
            po_num: { [Op.in]: approvedPoNums },
            asset_creation_at: 'invoice',
          },
          attributes: ['po_num'],
          raw: true,
          transaction,
        });

        // Step 2: Extract PO numbers
        const eligiblePoNums = poNumsWithInvoiceAssetCreation.map(p => p.po_num);

        // Step 3: Fetch assets only for those eligible POs
        let stagedAssets = [];
        if (eligiblePoNums.length > 0) {
          stagedAssets = await assetmaster_staging.findAll({
            where: {
              po_num: { [Op.in]: eligiblePoNums },
            },
            raw: true,
            transaction,
          });
        }

        // Step 4: Proceed only if staged assets exist
        if (stagedAssets.length > 0) {
          await models.assetmaster.bulkCreate(stagedAssets, {
            transaction,
            ignoreDuplicates: true,
          });

          for (const asset of stagedAssets) {
            await calculateDepreciation(asset, transaction);
          }
        }
      }
    }

    // ✅ Notify requestors
    const invoiceRequests = await invoice_assignment_staging.findAll({
      where: { assignment_id: { [Op.in]: assignmentIds } },
      attributes: ["assignment_id", "requested_by"],
      transaction,
    });

    const requestorEmpIds = invoiceRequests.map(req => req.requested_by);
    const requestorUsers = await userlogins.findAll({
      where: { emp_id: { [Op.in]: requestorEmpIds } },
      attributes: ["emp_id", "email"],
      transaction,
    });

    for (const req of invoiceRequests) {
      const user = requestorUsers.find(u => u.emp_id === req.requested_by);
      if (user?.email) {
        await sendEmail({
          to: user.email,
          subject: `Invoice ${newStatus}`,
          text: `Your invoice has been ${newStatus.toLowerCase()} by ${approver.emp_name}.`,
        });
      }
    }

    await transaction.commit();
    return res.status(200).json({ message: `Invoices ${newStatus.toLowerCase()} successfully.` });

  } catch (error) {
    console.error("Error in invoice approval:", error);
    await transaction.rollback();
    return res.status(500).json({ error: "An error occurred while processing your request." });
  }
});

module.exports = router;
