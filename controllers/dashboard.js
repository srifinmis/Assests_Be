const express = require("express");
const router = express.Router();
const { Op } = require("sequelize");
const { sequelize } = require("../config/db");
const initModels = require("../models/init-models");

const models = initModels(sequelize);

const { assignmentdetails, assetmaster, assignmentdetails_staging } = models;

// router.get("/summary", async (req, res) => {
//   try {
//     const assetTypes = [
//       "Laptop", "Mobile", "Biometric", "Printer", "DATA Card", "SIM Card", "CUG SIM Card", "License"
//     ];

//     const summary = await Promise.all(
//       assetTypes.map(async (type) => {
//         const total = await assetmaster.count({ where: { asset_type: type } });

//         // Fetch Assigned Asset IDs
//         const assignedAssetIds = await assignmentdetails.findAll({
//           attributes: ["asset_id"],
//           include: [{ model: assetmaster, as: "asset", where: { asset_type: type } }],
//           where: { assignment_status: "Assigned" },
//           raw: true
//         });

//         const assignedAssetIdList = assignedAssetIds.map(a => a.asset_id);

//         // Count Assigned Assets Excluding Duplicates
//         const assignedCount = assignedAssetIdList.length + await assignmentdetails_staging.count({
//           include: [{ model: assetmaster, as: "asset", where: { asset_type: type } }],
//           where: {
//             assigned_type: "Assign-Free",
//             asset_id: { [Op.notIn]: assignedAssetIdList }
//           }
//         });

//         // Fetch Under Maintenance Asset IDs
//         const underMaintenanceAssetIds = await assignmentdetails.findAll({
//           attributes: ["asset_id"],
//           include: [{ model: assetmaster, as: "asset", where: { asset_type: type } }],
//           where: { assignment_status: "Under Maintenance" },
//           raw: true
//         });

//         const underMaintenanceAssetIdList = underMaintenanceAssetIds.map(a => a.asset_id);

//         // Count Under Maintenance Assets Excluding Duplicates
//         const underMaintenance = underMaintenanceAssetIdList.length + await assignmentdetails_staging.count({
//           include: [{ model: assetmaster, as: "asset", where: { asset_type: type } }],
//           where: {
//             assigned_type: "Under-Free",
//             asset_id: { [Op.notIn]: underMaintenanceAssetIdList }
//           }
//         });

//         // Compute Free Pool
//         const freePool = total - (assignedCount + underMaintenance);

//         return {
//           name: type,
//           total,
//           assigned: assignedCount,
//           underMaintenance,
//           free: freePool
//         };
//       })
//     );

//     res.json(summary);
//   } catch (error) {
//     console.error("Error fetching asset summary:", error);
//     res.status(500).json({ error: "Internal Server Error" });
//   }
// });

router.get('/distinct-states', async (req, res) => {
  try {
    // Fetching distinct state values
    const states = await assetmaster.findAll({
      attributes: [[sequelize.fn('DISTINCT', sequelize.col('state')), 'state']], // Getting distinct state values
      order: [['state', 'ASC']], // Sorting states alphabetically
    });

    // Responding with the list of distinct states
    res.json(states.map(state => state.state));
  } catch (error) {
    console.error('Error fetching distinct states:', error);
    res.status(500).send('Server error');
  }
});

router.get("/assigned-states", async (req, res) => {
  try {
    const assignedStates = await assetmaster.findAll({
      attributes: [[sequelize.fn('DISTINCT', sequelize.col('state')), 'state']],
      include: [{
        model: assignmentdetails,
        as: "assignmentdetails",
        required: true,
        where: {
          assignment_status: "Assigned"
        }
      }],
      where: {
        state: { [Op.not]: null }
      },
      raw: true
    });

    res.json(assignedStates.map((item) => item.state));
  } catch (error) {
    console.error("Error fetching assigned states:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.get("/summary", async (req, res) => {
  try {
    const statesAssignedRaw = req.headers.statesassigned;
    const statesAssigned = statesAssignedRaw ? statesAssignedRaw.split(",") : [];

    console.log("statesAssigned from header:", statesAssigned);

    if (statesAssigned.length === 0) {
      return res.status(400).json({ error: "No states assigned provided." });
    }

    const assetTypes = [
      "Laptop", "Mobile", "Biometric", "Printer", "DATA Card", "SIM Card", "CUG SIM Card", "License"
    ];

    const summary = await Promise.all(
      assetTypes.map(async (type) => {
        const total = await assetmaster.count({
          where: {
            asset_type: type,
            state: { [Op.in]: statesAssigned },
          }
        });

        const assignedAssetIds = await assignmentdetails.findAll({
          attributes: ["asset_id"],
          include: [{
            model: assetmaster,
            as: "asset",
            where: {
              asset_type: type,
              state: { [Op.in]: statesAssigned }
            }
          }],
          where: { assignment_status: "Assigned" },
          raw: true
        });

        const assignedAssetIdList = assignedAssetIds?.map(a => a.asset_id) || [];

        const assignedCount = assignedAssetIdList.length +
          await assignmentdetails_staging.count({
            include: [{
              model: assetmaster,
              as: "asset",
              where: {
                asset_type: type,
                state: { [Op.in]: statesAssigned }
              }
            }],
            where: {
              assigned_type: "Assign-Free",
              asset_id: { [Op.notIn]: assignedAssetIdList }
            }
          });

        const underMaintenanceAssetIds = await assignmentdetails.findAll({
          attributes: ["asset_id"],
          include: [{
            model: assetmaster,
            as: "asset",
            where: {
              asset_type: type,
              state: { [Op.in]: statesAssigned }
            }
          }],
          where: { assignment_status: "Under Maintenance" },
          raw: true
        });

        const underMaintenanceAssetIdList = underMaintenanceAssetIds?.map(a => a.asset_id) || [];

        const underMaintenance = underMaintenanceAssetIdList.length +
          await assignmentdetails_staging.count({
            include: [{
              model: assetmaster,
              as: "asset",
              where: {
                asset_type: type,
                state: { [Op.in]: statesAssigned }
              }
            }],
            where: {
              assigned_type: "Under-Free",
              asset_id: { [Op.notIn]: underMaintenanceAssetIdList }
            }
          });

        const freePool = total - (assignedCount + underMaintenance);

        return {
          name: type,
          total,
          assigned: assignedCount,
          underMaintenance,
          free: freePool
        };
      })
    );

    res.json(summary);
  } catch (error) {
    console.error("Error fetching asset summary:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});


module.exports = router;
