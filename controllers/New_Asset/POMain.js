const express = require('express');
const router = express.Router();
const { Op } = require('sequelize');
const { sequelize } = require('../../config/db');
const initModels = require('../../models/init-models');

const models = initModels(sequelize);
const { po_processing_staging, po_processing_assignment_staging } = models;

// Get PO details from staging tables
router.get('/po-details', async (req, res) => {
  try {
    const poDetails = await po_processing_staging.findAll({
      attributes: [
        'po_num',
        'asset_type',
        'asset_creation_at',
        'po_date'
      ],
      include: [{
        model: po_processing_assignment_staging,
        attributes: ['po_status'],
        required: false,
        as: 'po_processing_assignment_stagings'
      }],
      raw: true,
      nest: true
    });

    // Format the response
    const formattedResponse = poDetails.map(po => ({
      po_number: po.po_num,
      asset_type: po.asset_type,
      asset_creation_at: po.asset_creation_at,
      po_date: po.po_date,
      po_status: po.po_processing_assignment_stagings?.po_status || 'Pending'
    }));

    res.status(200).json(formattedResponse);
  } catch (error) {
    console.error('Error fetching PO details:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
