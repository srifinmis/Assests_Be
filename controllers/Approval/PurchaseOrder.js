const express = require("express");
const router = express.Router();
const path = require('path');
const fs = require('fs-extra');
const { sequelize } = require("../../config/db");
const initModels = require("../../models/init-models");
const models = initModels(sequelize);
const {
  po_processing_assignment_staging,
  po_processing_staging,
  po_processing,
  po_processing_assignment,
  po_products_staging,
  po_products,
  userlogins
} = models;

// Get PO PDF
router.get("/get_po_pdf/:poNum", async (req, res) => {
  try {
    const poNum = req.params.poNum;
    if (!poNum) {
      return res.status(400).json({ error: "PO number is required" });
    }

    // Sanitize poNum for filename
    const sanitizedPONum = poNum.replace(/[^a-zA-Z0-9-]/g, "-");
    console.log("po-senitized: ", sanitizedPONum)
    const fileName = `PO-${sanitizedPONum}.pdf`;
    const filePath = path.join(__dirname, '../../utils/uploads', fileName);

    // Check if file exists
    if (!await fs.pathExists(filePath)) {
      return res.status(404).json({ error: "PDF file not found" });
    }

    // Stream the file
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${fileName}"`);

    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);

  } catch (error) {
    console.error("Error serving PO PDF:", error);
    res.status(500).json({ error: "Failed to serve PO PDF" });
  }
});

// Get all POs for approval
router.get("/po", async (req, res) => {
  try {
    console.log("Fetching POs for approval...");

    // Verify database connection
    try {
      await sequelize.authenticate();
      console.log('Database connection has been established successfully.');
    } catch (dbError) {
      console.error('Unable to connect to the database:', dbError);
      return res.status(500).json({ error: "Database connection failed" });
    }

    // Verify models are properly initialized
    if (!po_processing_assignment_staging || !po_processing_staging) {
      console.error("Models not properly initialized");
      return res.status(500).json({ error: "Database models not initialized" });
    }

    // First, get all pending assignments
    const assignments = await po_processing_assignment_staging.findAll({
      where: {
        po_status: "Pending"
      },
      raw: true
    });

    console.log(`Found ${assignments.length} pending assignments`);

    // Then, get the corresponding PO details
    const poNumbers = assignments.map(assignment => assignment.po_num);
    const poDetails = await po_processing_staging.findAll({
      where: {
        po_num: poNumbers
      },
      raw: true
    });

    console.log(`Found ${poDetails.length} PO details`);

    // Create a map of PO details for easy lookup
    const poDetailsMap = poDetails.reduce((acc, po) => {
      acc[po.po_num] = po;
      return acc;
    }, {});

    // Combine the data
    const formattedPos = assignments.map(assignment => {
      const poDetail = poDetailsMap[assignment.po_num] || {};
      return {
        assignment_id: assignment.assignment_id,
        po_num: assignment.po_num,
        po_status: assignment.po_status,
        requested_by: assignment.requested_by,
        requested_at: assignment.requested_at,
        po_date: poDetail.po_date,
        vendor_name: poDetail.vendor_name,
        total: poDetail.total,
        po_url: poDetail.po_url,
        status: poDetail.status
      };
    });

    console.log("Successfully formatted PO data");
    res.json(formattedPos);
  } catch (error) {
    console.error("Detailed error in fetching POs:", {
      message: error.message,
      stack: error.stack,
      name: error.name
    });

    // Check for specific database errors
    if (error.name === 'SequelizeConnectionError') {
      return res.status(500).json({ error: "Database connection error" });
    }
    if (error.name === 'SequelizeValidationError') {
      return res.status(400).json({ error: "Invalid data in database" });
    }
    if (error.name === 'SequelizeDatabaseError') {
      return res.status(500).json({ error: "Database error occurred" });
    }

    res.status(500).json({
      error: "Failed to fetch POs",
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Handle PO approval/rejection
router.post("/action", async (req, res) => {
  try {
    const { assignmentIds, action, approved_by, remarksList } = req.body;

    if (!assignmentIds || !Array.isArray(assignmentIds) || assignmentIds.length === 0) {
      return res.status(400).json({ error: "No POs selected for action" });
    }

    if (!action || !['approve', 'reject'].includes(action)) {
      return res.status(400).json({ error: "Invalid action" });
    }

    // Check for remarks only if action is reject
    if (action === 'reject') {
      const hasEmptyRemarks = remarksList.some(item => !item.remarks?.trim());
      if (hasEmptyRemarks) {
        return res.status(400).json({ error: "Remarks are mandatory for rejection" });
      }
    }

    const transaction = await sequelize.transaction();

    try {
      // Get all assignments that are being processed
      const assignments = await po_processing_assignment_staging.findAll({
        where: { assignment_id: assignmentIds },
        transaction
      });

      if (action === 'approve') {
        // Process each assignment
        for (const assignment of assignments) {
          // 1. Move from po_processing_staging to po_processing
          const poDetails = await po_processing_staging.findOne({
            where: { po_num: assignment.po_num },
            transaction
          });

          if (poDetails) {
            await po_processing.create({
              ...poDetails.toJSON(),
              created_at: new Date(),
              created_by: approved_by
            }, { transaction });

            // 2. Move from po_processing_assignment_staging to po_processing_assignment
            await po_processing_assignment.create({
              ...assignment.toJSON(),
              created_at: new Date(),
              created_by: approved_by,
              po_status: "Approved"
            }, { transaction });

            // 3. Move from po_products_staging to po_products
            const poProducts = await po_products_staging.findAll({
              where: { po_num: assignment.po_num },
              transaction
            });

            for (const product of poProducts) {
              await po_products.create({
                ...product.toJSON(),
                created_at: new Date(),
                created_by: approved_by
              }, { transaction });
            }
            await po_processing_assignment_staging.update(
              {
                po_status: "Approved",
                approved_at: new Date(),
                approved_by: approved_by
              },
              {
                where: { assignment_id: assignment.assignment_id },
                transaction
              }
            );

            // Delete from staging tables after successful move
            // await po_processing_staging.destroy({
            //   where: { po_num: assignment.po_num },
            //   transaction
            // });

            // await po_processing_assignment_staging.destroy({
            //   where: { assignment_id: assignment.assignment_id },
            //   transaction
            // });

            // await po_products_staging.destroy({
            //   where: { po_num: assignment.po_num },
            //   transaction
            // });
          }
        }
      } else {
        // For rejection, just update the status
        await po_processing_assignment_staging.update(
          {
            po_status: 'Rejected',
            approved_by,
            approved_at: new Date(),
            remarks: remarksList[0]?.remarks
          },
          {
            where: { assignment_id: assignmentIds },
            transaction
          }
        );

        // Update PO status in staging
        for (const assignment of assignments) {
          await po_processing_staging.update(
            {
              status: 'Rejected'
            },
            {
              where: { po_num: assignment.po_num },
              transaction
            }
          );
        }
      }

      await transaction.commit();
      res.json({
        success: true,
        message: action === 'approve'
          ? 'POs approved and moved to main tables successfully'
          : 'POs rejected successfully'
      });
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  } catch (error) {
    console.error("Error processing PO action:", error);
    res.status(500).json({ error: "Failed to process PO action" });
  }
});

module.exports = router;
