const express = require("express");
const router = express.Router();
// const Sequelize = require("sequelize"); // ✅ Add this
const { sequelize } = require("../../config/db");
const initModels = require("../../models/init-models");
const models = initModels(sequelize);
const sendEmail = require("../../utils/sendEmail");
const { Op } = require("sequelize");

const { payment_assignment_staging, userlogins, po_processing_staging, po_processing, assetmaster_staging,} = models;

// GET /api/payment-approvals
router.get("/receipt", async (req, res) => {
  try {
    // Step 1: Fetch payment assignments with payment_receipt_url
    const paymentData = await payment_assignment_staging.findAll({
      where: { payment_status: "Pending" },
      attributes: ["assignment_id", "po_num", "utr_num", "payment_status", "requested_by"],
      include: [
        {
          model: po_processing_staging,
          as: "po_num_po_processing_staging",
          attributes: ["payment_receipt_url"]
        }
      ]
    });

    // Step 2: Extract PO numbers
    const poNums = paymentData.map(p => p.po_num);

    // Step 3: Fetch asset data separately
    const assetData = await assetmaster_staging.findAll({
      where: {
        po_num: { [Op.in]: poNums }
      },
      attributes: ["asset_id", "asset_type", "brand", "model", "imei_num","po_num", "po_date", "base_location", "state"]
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
        imei_num:asset.imei_num,
        po_num: asset.po_num,
        po_date: asset.po_date,
        base_location: asset.base_location,
        state: asset.state
      });
    }

    // Step 5: Combine everything
    const formatted = paymentData.map(item => ({
      assignment_id: item.assignment_id,
      po_num: item.po_num,
      utr_num: item.utr_num,
      payment_status: item.payment_status,
      requested_by: item.requested_by,
      payment_url: item.po_num_po_processing_staging?.payment_receipt_url || null,
      assets: poAssetMap[item.po_num] || []
    }));

    res.json(formatted);
  } catch (error) {
    console.error("Error fetching PO approvals:", error);
    res.status(500).json({ error: "Internal Server Error" });
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
    // Get approver details
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

    // ✅ Update payment status in staging table
    await payment_assignment_staging.update(
      {
        payment_status: newStatus,
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

    let invoiceData = [];

    if (normalizedAction === "approve") {
      // ✅ On approval, match and update the po_processing table
    
      // Fetch data from payment_assignment_staging
      invoiceData = await payment_assignment_staging.findAll({
        where: { assignment_id: { [Op.in]: assignmentIds } },
        attributes: ["po_num", "utr_num"],
        raw: true,
        transaction,
      });
    
      for (const data of invoiceData) {
        const poProcessingData = await po_processing_staging.findOne({
          where: {
            po_num: data.po_num,
            utr_num: data.utr_num,
          },
          attributes: ["po_num", "utr_num", "invoice_date", "payment_receipt_url"],
          raw: true,
          transaction,
        });
    
        if (poProcessingData) {
          await po_processing.update(
            {
              po_num: poProcessingData.po_num,
              utr_num: poProcessingData.utr_num,
              invoice_date: poProcessingData.invoice_date,
              payment_url: poProcessingData.payment_receipt_url,
            },
            {
              where: {
                po_num: poProcessingData.po_num,
              },
              transaction,
            }
          );
        }
      }
    
      // ✅ After updating po_processing
      const approvedPoNums = invoiceData.map((d) => d.po_num);
    
      // ✅ Move assets from staging to assetmaster
      const stagedAssets = await assetmaster_staging.findAll({
        where: { po_num: { [Op.in]: approvedPoNums } },
        raw: true,
        transaction,
      });
    
      await models.assetmaster.bulkCreate(stagedAssets, { transaction });
    }
    
    // ✅ Fetch requester emails
    const invoiceRequests = await payment_assignment_staging.findAll({
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

    // ✅ Notify requestors (invoice status)
    for (const req of invoiceRequests) {
      const user = requestorUsers.find(u => u.emp_id === req.requested_by);
      if (user?.email) {
        await sendEmail({
          to: user.email,
          subject: `Invoice ${req.assignment_id} ${newStatus}`,
          html: `Your payment receipt request <strong>${req.assignment_id}</strong> has been <strong>${newStatus}</strong>. ${
            remark ? `<br/><strong>Remarks:</strong> ${remark}` : ""
          }`,
        });
      }
    }

    // ✅ Notify approver
    await sendEmail({
      to: approver.email,
      subject: `Invoice ${newStatus} Confirmation`,
      html: `You have successfully <strong>${newStatus}</strong> the following payment receipt request(s): <strong>${assignmentIds.join(", ")}</strong>.`,
    });

    await transaction.commit();
    res.status(200).json({ message: `Invoice ${newStatus} successful.` });
  } catch (error) {
    console.error("Invoice action error:", error);
    await transaction.rollback();
    res.status(500).json({ error: "Internal Server Error" });
  }
});

module.exports = router;
