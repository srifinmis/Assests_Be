const express = require("express");
const { sequelize } = require("../config/db");
const initModels = require("../models/init-models");

const router = express.Router();
const models = initModels(sequelize);
const { assignmentdetails, assetmaster } = models; // Correct Model Reference ✅

// Get all assignments with asset details
router.get("/", async (req, res) => {
    try {
      const assignments = await assignmentdetails.findAll({
        include: [{ model: assetmaster, as: "asset" }, { model: userlogins, as: "system" }], // ✅ Correct alias
      });
      res.json(assignments);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
});

// Fetch a specific assignment by ID
router.get("/:id", async (req, res) => {
    try {
      const assignment = await assignmentdetails.findByPk(req.params.id, {
        include: [{ model: assetmaster, as: "asset" }, { model: userlogins, as: "system" }],
      });
      if (!assignment) return res.status(404).json({ message: "Assignment not found" });
      res.json(assignment);
    } catch (error) {
      console.error("Error fetching assignment:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

// Assign an asset
router.post("/", async (req, res) => {
  try {
    const newAssignment = await assignmentdetails.create(req.body);
    res.status(201).json(newAssignment);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Unassign an asset
router.delete("/:id", async (req, res) => {
  try {
    const assignment = await assignmentdetails.findByPk(req.params.id);
    if (!assignment) return res.status(404).json({ message: "Assignment not found" });

    // 🔹 Delete related approver records first
    await models.approver.destroy({
      where: { assignment_id: req.params.id }
    });

    // 🔹 Now delete the assignment
    await assignment.destroy();
    res.json({ message: "Assignment removed successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


module.exports = router;
