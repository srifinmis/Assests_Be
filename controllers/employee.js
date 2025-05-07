const express = require("express");
const router = express.Router();

const { sequelize } = require("../config/db");
const initModels = require("../models/init-models");

const models = initModels(sequelize);
const { userlogins } = models;

// Get all employees
router.get("/", async (req, res) => {
  try {
    const employees = await userlogins.findAll({
      attributes: ["emp_id", "emp_name", "email"], // Fetch only required fields
    });
    res.json(employees);
  } catch (error) {
    res.status(500).json({ error: "Error fetching employee data" });
  }
});

// Get employee by ID
router.get("/:emp_id", async (req, res) => {
  try {
    const employee = await userlogins.findOne({ where: { emp_id: req.params.emp_id } });
    if (!employee) {
      return res.status(404).json({ error: "Employee not found" });
    }
    res.json(employee);
  } catch (error) {
    res.status(500).json({ error: "Error fetching employee data" });
  }
});

module.exports = router;
