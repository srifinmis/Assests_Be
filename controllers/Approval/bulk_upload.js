// routes/bulkUpload.js
const express = require("express");
const router = express.Router();

const { sequelize } = require("../../config/db");
const initModels = require("../../models/init-models");

const models = initModels(sequelize);
const {
  bulk_upload_staging,
  assetmaster_staging,
  bulk_assignmentdetails_staging,
  po_processing_staging
} = models;

// GET /api/bulk-uploads
router.get("/uploads", async (req, res) => {
  try {
    const bulkUploads = await bulk_upload_staging.findAll({
      attributes: ["bulk_id", "bulk_status", "requested_by"],
      where: { bulk_status: "Pending" },
      order: [["bulk_id", "DESC"]],
    });

    const result = await Promise.all(
      bulkUploads.map(async (bulk) => {
        const bulk_id = bulk.bulk_id; // Assuming bulk_id === bulk_id

        const [assets, rawAssignments, poProcessing] = await Promise.all([
          assetmaster_staging.findAll({ where: { bulk_id } }),
          bulk_assignmentdetails_staging.findAll({ where: { bulk_id } }),
          
          po_processing_staging.findAll({ where: { bulk_id } }),
        ]);
        
        const systemIds = rawAssignments.map(a => a.system_id).filter(Boolean);
        
        const userDetails = await models.userlogins.findAll({
          where: { system_id: systemIds },
          attributes: ["system_id", "emp_id", "emp_name", "email", "designation_name", "department_name"],
        });
        
        const userMap = userDetails.reduce((map, user) => {
          map[user.system_id] = user;
          return map;
        }, {});
        
        const assignments = rawAssignments.map(assignment => {
          const user = userMap[assignment.system_id] || {};
          return {
            ...assignment.dataValues,
            emp_id: user.emp_id || null,
            emp_name: user.emp_name || null,
            email: user.email || null,
            designation_name: user.designation_name || null,
            department_name: user.department_name || null,
          };
        });
        

        return {
          ...bulk.dataValues,
          assets,
          assignments,
          poProcessing,
        };
      })
    );

    res.status(200).json(result);
  } catch (err) {
    console.error("Error fetching extended bulk upload data:", err);
    res.status(500).json({ message: "Internal server error" });
  }
});

// GET /api/bulkupload/uploads/:bulkId
router.get("/uploads/:bulkId", async (req, res) => {
  try {
    const { bulkId } = req.params;

    const bulk = await bulk_upload_staging.findOne({
      where: { bulk_id: bulkId },
      attributes: ["bulk_id", "bulk_status", "requested_by"],
    });

    if (!bulk) {
      return res.status(404).json({ message: "Bulk upload not found." });
    }

    const [assets, rawAssignments, poProcessing] = await Promise.all([
      assetmaster_staging.findAll({ where: { bulk_id: bulkId } }),
      bulk_assignmentdetails_staging.findAll({ where: { bulk_id: bulkId } }),
      po_processing_staging.findAll({ where: { bulk_id: bulkId } }),
    ]);

    // Fetch employee details based on system_ids from rawAssignments
    const systemIds = rawAssignments.map(a => a.system_id).filter(Boolean);

    const userDetails = await models.userlogins.findAll({
      where: { system_id: systemIds },
      attributes: ["system_id", "emp_id", "emp_name", "email", "designation_name", "department_name"],
    });

    // Create a map of system_id to employee details
    const userMap = userDetails.reduce((map, user) => {
      map[user.system_id] = user;
      return map;
    }, {});

    // Attach employee details to each assignment
    const assignments = rawAssignments.map(assignment => {
      const user = userMap[assignment.system_id] || {};
      return {
        ...assignment.dataValues,
        emp_id: user.emp_id || null,
        emp_name: user.emp_name || null,
        email: user.email || null,
        designation_name: user.designation_name || null,
        department_name: user.department_name || null,
      };
    });

    res.status(200).json({
      ...bulk.dataValues,
      assets,
      assignments,
      poProcessing,
    });
  } catch (err) {
    console.error("Error fetching bulk upload details:", err);
    res.status(500).json({ message: "Internal server error" });
  }
});

router.post("/uploads/:bulkId/action", async (req, res) => {
  const { bulkId } = req.params;
  const { action, remarks, approved_by } = req.body;

  if (!["approve", "reject"].includes(action)) {
    return res.status(400).json({ message: "Invalid action type." });
  }

  if (action === "reject" && !remarks) {
    return res.status(400).json({ message: "Remarks are mandatory for rejection." });
  }

  try {
    const bulk = await bulk_upload_staging.findOne({ where: { bulk_id: bulkId } });
    if (!bulk) {
      return res.status(404).json({ message: "Bulk upload not found." });
    }

    const currentTimestamp = new Date();

    if (action === "reject") {
      // Delete all data related to the bulkId from staging tables
      await Promise.all([
        po_processing_staging.destroy({ where: { bulk_id: bulkId } }),
        assetmaster_staging.destroy({ where: { bulk_id: bulkId } }),
        bulk_assignmentdetails_staging.destroy({ where: { bulk_id: bulkId } }),
      ]);

      // Update bulk_upload_staging with rejection info
      await bulk_upload_staging.update({
        bulk_status: "Rejected",
        approved_by,
        approved_at: currentTimestamp,
        remarks,
      }, { where: { bulk_id: bulkId } });

      return res.status(200).json({ message: "Bulk upload rejected and staging data deleted." });
    }

    if (action === "approve") {
      const [
        stagingAssets,
        stagingAssignments,
        stagingPOs
      ] = await Promise.all([
        assetmaster_staging.findAll({ where: { bulk_id: bulkId } }),
        bulk_assignmentdetails_staging.findAll({ where: { bulk_id: bulkId } }),
        po_processing_staging.findAll({ where: { bulk_id: bulkId } }),
      ]);

      const t = await sequelize.transaction();

      try {
        // Insert into final tables
        await Promise.all([
          models.assetmaster.bulkCreate(stagingAssets.map(a => a.dataValues), { transaction: t }),
          models.assignmentdetails.bulkCreate(stagingAssignments.map(a => a.dataValues), { transaction: t }),
          models.assignmentdetails_staging.bulkCreate(stagingAssignments.map(a => ({
            ...a.dataValues,
            assigned_type: "Bulk-Approved", // optional: mark it came from bulk
            updatedat: currentTimestamp,
          })), { transaction: t }),
          models.po_processing.bulkCreate(stagingPOs.map(p => p.dataValues), { transaction: t }),
        ]);

        // Update bulk_upload_staging
        await bulk_upload_staging.update({
          bulk_status: "Approved",
          approved_by,
          approved_at: currentTimestamp,
          remarks: remarks || null,
        }, { where: { bulk_id: bulkId }, transaction: t });

        await t.commit();
        return res.status(200).json({ message: "Bulk upload approved and data moved to final tables." });

      } catch (err) {
        await t.rollback();
        console.error("Error during bulk approve transaction:", err);
        return res.status(500).json({ message: "Failed to approve bulk upload." });
      }
    }
  } catch (err) {
    console.error("Error processing bulk upload action:", err);
    res.status(500).json({ message: "Internal server error." });
  }
});

module.exports = router;
