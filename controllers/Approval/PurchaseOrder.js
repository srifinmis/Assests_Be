const express = require("express");
const router = express.Router();
const { sequelize } = require("../../config/db");
const initModels = require("../../models/init-models");
const models = initModels(sequelize);
const sendEmail = require("../../utils/sendEmail");
const { Op } = require("sequelize");

const {
  po_processing_assignment_staging,
  po_processing_staging,
  po_products_staging,
  po_processing,
  po_products,
  po_processing_assignment,
  userlogins
} = models;

// GET /api/po-approvals
router.get("/po", async (req, res) => {
  try {
    const data = await po_processing_assignment_staging.findAll({
      where: { po_status: "Pending" },
      attributes: ["assignment_id", "po_num", "po_status", "requested_by"],
      include: [
        {
          model: models.po_processing_staging,
          as: "po_num_po_processing_staging",
          attributes: ["po_url"]
        }
      ]
    });

    const formatted = data.map(item => ({
      assignment_id: item.assignment_id,
      po_num: item.po_num,
      po_status: item.po_status,
      requested_by: item.requested_by,
      po_url: item.po_num_po_processing_staging?.po_url || null
    }));

    res.json(formatted);
  } catch (error) {
    console.error("Error fetching PO approvals:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// POST /api/po-approvals/action
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

    if (normalizedAction === "approve") {
      const assignments = await po_processing_assignment_staging.findAll({
        where: { assignment_id: { [Op.in]: assignmentIds } },
        // attributes: ["assignment_id", "po_num"],
        transaction,
      });

      const poNums = assignments.map(a => a.po_num);

      // ✅ Copy PO records (excluding product-related fields)
      const poData = await po_processing_staging.findAll({
        where: { po_num: { [Op.in]: poNums } },
        raw: true,
        transaction,
      });

      await po_processing.bulkCreate(poData, { transaction });

      // ✅ Copy PO products
      const productData = await po_products_staging.findAll({
        where: { po_num: { [Op.in]: poNums } },
        raw: true,
        transaction,
      });

      await po_products.bulkCreate(productData, { transaction });

      // ✅ Copy assignments
      await po_processing_assignment.bulkCreate(
        assignments.map(a => a.toJSON()),
        { transaction }
      );
    }

    const newStatus = normalizedAction === "approve" ? "Accepted" : "Rejected";

    // ✅ Update status in staging table
    await po_processing_assignment_staging.update(
      {
        po_status: newStatus,
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

    // ✅ Fetch requester emails
    const poRequests = await po_processing_assignment_staging.findAll({
      where: { assignment_id: { [Op.in]: assignmentIds } },
      attributes: ["assignment_id", "requested_by"],
      transaction,
    });

    const requestorEmpIds = poRequests.map(req => req.requested_by);
    const requestorUsers = await userlogins.findAll({
      where: { emp_id: { [Op.in]: requestorEmpIds } },
      attributes: ["emp_id", "email"],
      transaction,
    });

    // ✅ Notify requestors
    for (const req of poRequests) {
      const user = requestorUsers.find(u => u.emp_id === req.requested_by);
      if (user?.email) {
        await sendEmail({
          to: user.email,
          subject: `PO ${req.assignment_id} ${newStatus}`,
          html: `Your PO request <strong>${req.assignment_id}</strong> has been <strong>${newStatus}</strong>. ${
            remark ? `<br/><strong>Remarks:</strong> ${remark}` : ""
          }`,
        });
      }
    }

    // ✅ Notify approver
    await sendEmail({
      to: approver.email,
      subject: `PO ${newStatus} Confirmation`,
      html: `You have successfully <strong>${newStatus}</strong> the following PO request(s): <strong>${assignmentIds.join(", ")}</strong>.`,
    });

    await transaction.commit();
    res.status(200).json({ message: `PO ${newStatus} successful.` });
  } catch (error) {
    console.error("PO action error:", error);
    await transaction.rollback();
    res.status(500).json({ error: "Internal Server Error" });
  }
});

module.exports = router;
