// routes/assetDepreciation.js
const express = require('express');
const router = express.Router();

const { sequelize, Sequelize } = require("../../config/db");
const initModels = require("../../models/init-models");

const models = initModels(sequelize);
const { 
  assetmaster, 
  asset_depreciation_values,
  po_processing // Include the po_processing table here
} = models;

router.get('/asset-depreciation-values', async (req, res) => {
  try {
    // Step 1: Fetch all depreciation records
    const depreciationData = await asset_depreciation_values.findAll();

    // Step 2: Get all unique asset_ids
    const assetIds = depreciationData.map(item => item.asset_id);

    // Step 3: Fetch assetmaster data for those asset_ids
    const assetData = await assetmaster.findAll({
      where: { asset_id: assetIds },
      attributes: [
        'asset_id',
        'brand',
        'model',
        'imei_num',
        'po_num',
        'state',
        'base_location',
        'warranty_status'
      ]
    });

    // Step 4: Get the unique PO numbers
    const poNumbers = [...new Set(assetData.map(item => item.po_num))];

    // Step 5: Fetch the corresponding invoice_num and utr_num for each po_num
    const poProcessingData = await po_processing.findAll({
      where: { po_num: poNumbers },
      attributes: ['po_num', 'invoice_num', 'utr_num']
    });

    // Step 6: Create a mapping from po_num to invoice and utr number
    const poMap = {};
    poProcessingData.forEach(po => {
      poMap[po.po_num] = {
        invoice_num: po.invoice_num || '',
        utr_num: po.utr_num || ''
      };
    });

    // Step 7: Create a mapping from asset_id to asset info
    const assetMap = {};
    assetData.forEach(asset => {
      assetMap[asset.asset_id] = asset.toJSON();
    });

    // Step 8: Combine depreciation and assetmaster data
    const formatted = depreciationData.map(entry => {
      const asset = assetMap[entry.asset_id] || {};
      const poDetails = poMap[asset.po_num] || {};

      return {
        asset_id: entry.asset_id,
        asset_type: entry.asset_type,
        brand: asset.brand || '',
        model: asset.model || '',
        serial_number: asset.imei_num || '',
        po_number: asset.po_num || '',
        state: asset.state || '',
        base_location: asset.base_location || '',
        warranty: asset.warranty_status || '',
        invoice_number: poDetails.invoice_num,  // Add invoice number
        utr_number: poDetails.utr_num,          // Add UTR number
        asset_value: entry.asset_value,
        asset_value_gst: entry.total_price_incl_gst,
        salvage_value: entry.salvage_value,
        depreciation_value: entry.depreciation_value,
        year1: entry.year_1_2_val,
        year2: entry.year_2_3_val,
        year3: entry.year_3_4_val,
        year4: entry.year_4_5_val,
        year5: entry.year_5_6_val,
      };
    });

    res.json(formatted);
  } catch (err) {
    console.error("Error fetching depreciation data:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;
