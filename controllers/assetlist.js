const express = require("express");
const { Op, Sequelize } = require("sequelize");

const router = express.Router();
const { sequelize } = require("../config/db");
const initModels = require("../models/init-models");

const models = initModels(sequelize);
const { assignmentdetails, assignmentdetails_staging, assetmaster, userlogins } = models;

router.get("/details/:category/:type", async (req, res) => {
  try {
    const { category, type } = req.params;
    
    // Condition to match asset type
    let whereCondition = sequelize.where(
      sequelize.fn("LOWER", sequelize.col("asset_type")),
      type.trim().toLowerCase()
    );

    let assignmentWhere = {};
    let stagingWhere = {};

    if (category === "assigned") {
      assignmentWhere.assignment_status = "Assigned";
      stagingWhere.assigned_type = "Assign-Free";
    } else if (category === "maintenance") {
      assignmentWhere.assignment_status = "Under Maintenance";
      stagingWhere.assigned_type = "Under-Free";
    } else if (category === "free-pool") {
      assignmentWhere.assignment_status = "Free Pool";
      stagingWhere.assigned_type = { [Op.in]: ["Free-Under", "Free-Assign"] };
    }
    else{
      assignmentWhere.assignment_status = { [Op.in]: ["Assigned", "Under Maintenance", "Free Pool"] };
      stagingWhere.assigned_type = { [Op.in]: ["Assign-Free", "Under-Free", "Free-Under", "Free-Assign"] };
    }

    let assignedAssets = [];
    let inProgressAssets = [];
    let freePoolAssets = [];

    // Fetch excluded asset IDs from staging
    let excludedAssetIds = [];
    if (["assigned", "maintenance", "free-pool", "total-assets"].includes(category)) {
      const duplicateAssets = await assignmentdetails_staging.findAll({
        attributes: ["asset_id"],
        where: {
          assignment_status: "In Progress",
          assigned_type: stagingWhere.assigned_type,
        },
        raw: true,
      });
      excludedAssetIds = duplicateAssets.map((asset) => asset.asset_id);
    }

    // Fetch assigned and under-maintenance assets from assignmentdetails
    if (Object.keys(assignmentWhere).length) {
      assignedAssets = await assignmentdetails.findAll({
        include: [
          {
            model: assetmaster,
            as: "asset",
            attributes: ["asset_id", "brand", "model", "imei_num"],
            where: whereCondition, // Filter by type
          },
          {
            model: userlogins,
            as: "system",
            attributes: ["emp_id", "emp_name", "designation_name", "department_name", "branchid_name", "areaid_name", "regionid_name", "clusterid_name", "state"],
          },
        ],
        where: {
          ...assignmentWhere,
          asset_id: { [Op.notIn]: excludedAssetIds },
        },
        raw: true,
        nest: true,
      });
    }

    // Fetch in-progress assets from staging
    if (Object.keys(stagingWhere).length) {
      inProgressAssets = await assignmentdetails_staging.findAll({
        include: [
          {
            model: assetmaster,
            as: "asset",
            attributes: ["asset_id", "brand", "model", "imei_num"],
            where: whereCondition, // Filter by type
          },
          {
            model: userlogins,
            as: "system",
            attributes: ["emp_id", "emp_name", "designation_name", "department_name", "branchid_name", "areaid_name", "regionid_name", "clusterid_name", "state"],
          },
        ],
        where: stagingWhere,
        raw: true,
        nest: true,
      });
    }

    let unassignedAssets = [];
if (category === "free-pool" || category === "total-assets") {
  unassignedAssets = await assetmaster.findAll({
    attributes: ["asset_id", "brand", "model", "imei_num"],
    where: {
      asset_id: {
        [Op.notIn]: Sequelize.literal(`(
          SELECT asset_id FROM assignmentdetails
        )`),
        [Op.notIn]: Sequelize.literal(`(
          SELECT asset_id FROM staging.assignmentdetails_staging 
          WHERE assignment_status != 'Rejected'
        )`),
      },
      asset_type: { [Op.iLike]: type.trim() },
    },
    raw: true,
  });
}


    // Format Assigned & In-Progress Assets
    const formattedAssets = [...assignedAssets, ...inProgressAssets].map((asset) => ({
      asset_id: asset.asset_id,
      brand: asset.asset?.brand || "Unknown",
      model: asset.asset?.model || "Unknown",
      imei_num: asset.asset?.imei_num || "Unknown",
      assignment_status: asset.assignment_status || asset.assigned_type || "Free Pool",
      assigned_to: asset.system
        ? {
            emp_id: asset.system.emp_id || "N/A",
            emp_name: asset.system.emp_name || "N/A",
            designation_name: asset.system.designation_name || "N/A",
            department_name: asset.system.department_name || "N/A",
            branchid_name: asset.system?.branchid_name || "N/A",
            areaid_name: asset.system?.areaid_name || "N/A",
            regionid_name: asset.system?.regionid_name || "N/A",
            clusterid_name: asset.system?.clusterid_name || "N/A",
            state: asset.system?.state || "N/A",
          }
        : {},
    }));

    // Format Free Pool & Unassigned Assets
    const freePoolFormatted = [...freePoolAssets, ...unassignedAssets].map((asset) => ({
      asset_id: asset.asset_id,
      brand: asset.brand || "Unknown",
      model: asset.model || "Unknown",
      imei_num: asset.imei_num || "Unknown",
      assignment_status: "Free Pool",
      assigned_to: {},
    }));

    // Merge all lists
    let finalAssets = [...formattedAssets, ...freePoolFormatted];

    res.json(finalAssets);
  } catch (error) {
    console.error("Error fetching asset details:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

module.exports = router;