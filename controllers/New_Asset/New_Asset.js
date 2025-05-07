const express = require("express");
const router = express.Router();
const { sequelize } = require("../../config/db");
const initModels = require("../../models/init-models");

const models = initModels(sequelize);
const { 
  po_processing, 
  assetmaster, 
  assignmentdetails, 
  asset_types, 
  asset_depreciation_values  
} = models;

/**
 * ✅ API: Get All PO Numbers
 */
router.get("/po-numbers", async (req, res) => {
  try {
    const poNumbers = await po_processing.findAll({ attributes: ["po_num"] });
    res.json(poNumbers.map(po => po.po_num));
  } catch (error) {
    console.error("❌ Error fetching PO numbers:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * ✅ API: Get Invoice Number by PO Number
 */
router.get("/get-invoice/:poNum", async (req, res) => {
  try {
    const { poNum } = req.params;
    const poRecord = await po_processing.findOne({
      where: { po_num: poNum },
      attributes: ["invoice_num"],
    });

    if (!poRecord) {
      return res.status(404).json({ error: "PO Number not found" });
    }

    res.json({ invoice_number: poRecord.invoice_num });
  } catch (error) {
    console.error("❌ Error fetching invoice number:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * ✅ API: Add New Assets and Calculate Depreciation
 */
router.post("/add", async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const assets = req.body;

    const createdAssets = await Promise.all(
      assets.map(async (asset) => {
        // ✅ Insert into `assetmaster`
        const newAsset = await assetmaster.create({ ...asset }, { transaction: t });

        // ✅ Insert into `assignmentdetails`
        await assignmentdetails.create(
          {
            asset_id: newAsset.asset_id,
            assignment_status: "FreePool",
            assigned_date: new Date(),
            remarks: "New asset added to FreePool",
          },
          { transaction: t }
        );

        // ✅ Calculate Depreciation
        await calculateDepreciation(newAsset, t);

        return newAsset;
      })
    );

    await t.commit();
    res.status(201).json({ message: "Assets added successfully!", createdAssets });
  } catch (error) {
    await t.rollback();
    console.error("❌ Error inserting assets:", error);
    res.status(500).json({ error: "Failed to add assets", details: error.message });
  }
});

/**
 * ✅ Function: Calculate Depreciation Based on Warranty
 */
async function calculateDepreciation(asset, transaction) {
  try {
    // ✅ Fetch PO details
    const poDetails = await po_processing.findOne({
      where: { po_num: asset.po_num },
      attributes: ["unit_price", "cgst", "sgst"],
      transaction,
    });

    if (!poDetails) {
      console.warn(`⚠️ No PO details found for po_num: ${asset.po_num}`);
      return;
    }

    // ✅ Convert values to numbers
    const unit_price = Number(poDetails.unit_price) || 0;
    const cgst = Number(poDetails.cgst) || 0;
    const sgst = Number(poDetails.sgst) || 0;

    // ✅ Compute total price including GST
    const gst = (cgst + sgst) / 2;
    const total_price_incl_gst = unit_price + (unit_price * (gst / 100));

    // ✅ Fetch Asset Type Data
    const assetType = await asset_types.findOne({
      where: { asset_type: asset.asset_type },
      attributes: ["salvage_percent", "depreciation_percent"],
      transaction,
    });

    if (!assetType) {
      console.warn(`⚠️ No depreciation data found for category: ${asset.asset_type}`);
      return;
    }

    const salvage_percent = Number(assetType.salvage_percent) || 0;
    const depreciation_percent = Number(assetType.depreciation_percent) || 0;

    // ✅ Fetch Warranty Period
    const warrantyYears = Number(asset.warranty_years) || 0;
    if (warrantyYears <= 0) {
      console.warn(`⚠️ Invalid warranty period: ${warrantyYears} years. Skipping depreciation.`);
      return;
    }

    // ✅ Calculate Salvage Value & Depreciation
    const salvageValue = total_price_incl_gst - (total_price_incl_gst * (salvage_percent / 100));
    const depreciationPerYear = salvageValue * (depreciation_percent / 100);

    // ✅ Generate Depreciation Values Based on Warranty Period
    let depreciationValues = {};
    let remainingValue = total_price_incl_gst;

    for (let year = 1; year <= 5; year++) {
      if (year <= warrantyYears) {
        remainingValue -= depreciationPerYear;
        depreciationValues[`year_${year}_${year + 1}_val`] = Math.max(remainingValue, 0);
      } else {
        depreciationValues[`year_${year}_${year + 1}_val`] = 0; // After warranty, value is 0
      }
    }

    // ✅ Insert into `asset_depreciation_values`
    await asset_depreciation_values.create(
      {
        asset_id: asset.asset_id,
        asset_type: asset.asset_type,
        total_price_incl_gst,
        ...depreciationValues,
      },
      { transaction }
    );

  } catch (error) {
    console.error("❌ Error calculating depreciation:", error);
    throw error;
  }
}

module.exports = router;
