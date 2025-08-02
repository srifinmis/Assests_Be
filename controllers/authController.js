const bcrypt = require("bcrypt");
// const bcrypt = require('bcryptjs');
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

    const user = await userlogins.findOne({ where: { emp_id: emp_id.toUpperCase() } });
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

    const designationcheck = user.designation_name;
    // console.log('designation : ', designationcheck);
    const validHODesignations = ['HO', 'Head Office', 'Vice President', 'Assistant Vice President', 'Associate', 'Principal Manager', 'Assistant Manager', 'Lead Manager'];
    const validRegionDesignations = ['RO', 'BCM', 'Regional Credit Manager', 'Manager', 'Executive', 'Regional Manager'];
    const validBranchDesignations = ['Branch Manager', 'CSM', 'Sr CSM', 'Area Manager', 'Assistant Branch Manager'];

    const assignedTo =
      validBranchDesignations.includes(designationcheck)
        ? user.branchid_name
        : validRegionDesignations.includes(designationcheck)
          ? user.regionid_name
          : validHODesignations.includes(designationcheck)
            ? (user.regionid_name || user.branchid_name)
            : null;
    // user.emp_id;
    // console.log('assigned to : ', assignedTo)

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
    // console.log('Modules: ', modulesList)

    // Fetch the states_assigned from userlogins table
    const statesAssigned = user.states_assigned || [];

    // Generate the JWT token
    const token = jwt.sign(
      {
        id: user.emp_id,
        debit: assignedTo,
        Role: roleNames,
        modules: modulesList,
        branch: user.branchid_name,
        statesAssigned: statesAssigned,
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );

    res.json({
      message: "Login successful",
      token,
      user: {
        emp_id: user.emp_id,
        emp_id_second: assignedTo,
        // emp_id: assignedTo,
        // emp_id_second: user.emp_id,
        debitusers: assignedTo,
        name: user.emp_name,
        role: user.designation_name,
        branch: user.branchid_name
      },
      allowedModules: modulesList,
      branch: user.branchid_name,
      statesAssigned: statesAssigned
    });
  } catch (error) {
    console.error("Login Error:", error);
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};
