const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const { sequelize } = require('../config/db');
const initModels = require('../models/init-models');

const models = initModels(sequelize);
const { userlogins, roles, roles_modules, modules } = models;

exports.login = async (req, res) => {
  const { emp_id, password } = req.body;
  try {
    if (!userlogins) {
      return res.status(500).json({ message: "Model userlogins not found" });
    }

    const user = await userlogins.findOne({ where: { emp_id } });
    if (!user) return res.status(400).json({ message: "User not found" });

    if (user.emp_status !== "ACCEPTED" || user.access_status !== "GRANTED") 
      return res.status(400).json({ message: "ACCESS DENIED!" });

    const validPassword = await bcrypt.compare(password, user.passwd_hash);
    if (!validPassword) return res.status(400).json({ message: "Invalid Employee ID or Password. Please try again!" });

    const roleIds = user.role_ids_assigned.split(',').map(id => parseInt(id.trim(), 10));

    // Fetch role name
    const rolesData = await roles.findAll({
      where: { role_id: roleIds },
      attributes: ['role_id', 'role_name']
    });

    if (!rolesData || rolesData.length === 0) {
      return res.status(404).json({ message: "Roles not found" });
    }
    const roleNames = rolesData.map(role => role.role_name);

    // Fetch all modules for the role
    const roleModules = await roles_modules.findAll({
      where: { role_id: roleIds },
      include: [{
        model: modules,
        as: "module",
        attributes: ['module_id', 'module_name']
      }],
      attributes: ['role_id', 'module_id']
    });

    const modulesList = [...new Set(
      roleModules.map(rm => rm.module?.module_name).filter(Boolean)
    )];

    // Fetch the states_assigned from userlogins table
    const statesAssigned = user.states_assigned || []; // Default to empty array if no states are assigned

    // Generate the JWT token
    const token = jwt.sign(
      {
        id: user.system_id,
        Role: roleNames,
        modules: modulesList,
        statesAssigned: statesAssigned,  // Add states_assigned to the JWT payload
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );

    res.json({
      message: "Login successful",
      token,
      user: {
        emp_id: user.emp_id,
        name: user.emp_name,
        role: user.designation_name
      },
      allowedModules: modulesList,
      statesAssigned: statesAssigned  // Include states_assigned in the response
    });
  } catch (error) {
    console.error("Login Error:", error);
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};
