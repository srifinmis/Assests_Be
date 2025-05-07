const { sequelize } = require("../config/db");
const initModels = require("../models/init-models");

const models = initModels(sequelize);
const { 
  po_products,
  asset_types,
  asset_depreciation_values,
  assetmaster_staging
} = models;

const { Op } = require("sequelize");

async function calculateDepreciation(asset, transaction) {
  try {
    // ✅ Fetch asset details
    const assetDetails = await assetmaster_staging.findOne({
      where: { asset_id: asset.asset_id },
      attributes: ['po_num', 'brand', 'model', 'asset_type', 'warranty_status'],
      transaction,
    });

    if (!assetDetails) {
      console.warn(`⚠️ Asset not found in staging for asset_id: ${asset.asset_id}`);
      return;
    }

    const { po_num, brand, model, asset_type, warranty_status } = assetDetails;

    // ✅ Use warranty from assetmaster_staging
    const warrantyYears = Number(warranty_status) || 0;

    // ✅ Match PO product
    const matchingProduct = await po_products.findOne({
      where: {
        po_num,
        item_description: {
          [Op.iLike]: `%${brand}%${model}%`,
        },
      },
      attributes: ['unit_price', 'cgst', 'sgst', 'quantity'],
      transaction,
    });

    if (!matchingProduct) {
      console.warn(`⚠️ No matching product found for asset ${asset.asset_id} in PO ${po_num}`);
      return;
    }

    const unit_price = Number(matchingProduct.unit_price) || 0;
    const quantity = Number(matchingProduct.quantity) || 1;
    const perAssetPrice = unit_price / quantity;

    const gstRate = ((Number(matchingProduct.cgst) || 0)) / 100;
    const total_price_incl_gst = +(perAssetPrice + (perAssetPrice * gstRate)).toFixed(2);

    // ✅ Depreciation settings
    const typeData = await asset_types.findOne({
      where: { asset_type },
      attributes: ['salvage_percent', 'depreciation_percent'],
      transaction,
    });

    if (!typeData) {
      console.warn(`⚠️ No depreciation config for asset_type: ${asset_type}`);
      return;
    }

    const salvage_percent = Number(typeData.salvage_percent) || 0;
    const depreciation_percent = Number(typeData.depreciation_percent) || 0;

    const salvageValue = total_price_incl_gst - (total_price_incl_gst * (salvage_percent / 100));
    const depreciationPerYear = +(salvageValue * (depreciation_percent / 100)).toFixed(2); 

    let depreciationValues = {};
    let remainingValue = total_price_incl_gst; 

    for (let year = 1; year <= 5; year++) {
      const yearKey = `year_${year}_${year + 1}_val`;

      if (year <= warrantyYears) {
        remainingValue = +(remainingValue - depreciationPerYear).toFixed(2);
        depreciationValues[yearKey] = Math.max(remainingValue, 0);
 
      } else {
        depreciationValues[yearKey] = 0; 
      }
    }

    // ✅ Insert depreciation record
    await asset_depreciation_values.create(
      {
        asset_id: asset.asset_id,
        asset_type,
        asset_value: perAssetPrice,
        salvage_value: salvageValue,
        depreciation_value: depreciationPerYear,
        total_price_incl_gst,

        ...depreciationValues,
      },
      { transaction }
    );

  } catch (error) {
    console.error("❌ Error calculating depreciation for asset_id:", asset.asset_id, error);
    throw error;
  }
};

module.exports = calculateDepreciation;
