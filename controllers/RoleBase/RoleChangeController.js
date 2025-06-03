const express = require('express');
const router = express.Router();

const { sequelize } = require('../../config/db');
const initModels = require('../../models/init-models');

const models = initModels(sequelize);
const { userlogins, roles } = models;

const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { Op } = require("sequelize");

router.get('/emp_idname', async (req, res) => {
    try {
        // Fetch all users with non-null and non-empty passwords
        const employeedata = await userlogins.findAll({
            attributes: ["emp_id", "emp_name", "role_ids_assigned"],
            where: {
                [Op.and]: [
                    { passwd_hash: { [Op.ne]: null } },
                    { passwd_hash: { [Op.ne]: "" } }
                ],
            },
        });

        if (!employeedata || employeedata.length === 0) {
            return res.status(404).json({ message: "No employees found" });
        }

        // Fetch all roles once
        const allRoles = await roles.findAll({ attributes: ['role_id', 'role_name'] });

        // Create a map of role_id -> role_name
        const roleMap = {};
        allRoles.forEach(role => {
            roleMap[role.role_id] = role.role_name;
        });

        // Map each employee to their role names
        const enrichedData = employeedata.map(emp => {
            const roleIds = emp.role_ids_assigned?.split(',').map(id => parseInt(id.trim())) || [];
            const roleNames = roleIds.map(id => roleMap[id]).filter(Boolean);

            return {
                emp_id: emp.emp_id,
                emp_name: emp.emp_name,
                role_ids_assigned: emp.role_ids_assigned,
                role_names: roleNames
            };
        });

        res.status(200).json({ message: "Employee fetch successful", data: enrichedData });

    } catch (error) {
        console.error("Employee Data Error:", error);
        res.status(500).json({ message: "Internal server error", error: error.message });
    }
});

router.get('/list', async (req, res) => {
    try {
        const rolesdata = await roles.findAll({
            attributes: ["role_id", "role_name"],
        });

        if (!rolesdata || rolesdata.length === 0) {
            return res.status(404).json({ message: "No roles found" });
        }

        res.status(200).json({ message: "Roles fetched successfully", data: rolesdata });
    } catch (error) {
        console.error("Roles Fetch Error:", error);
        res.status(500).json({ message: "Internal server error", error: error.message });
    }
});

router.post('/update', async (req, res) => {
    const data = req.body;

    const roleMapping = {
        "IT-Admin": 1,
        "IT-RO_Staff": 2,
        "IT-HO_Staff": 3,
        "IT-Approver": 4,
        "IT-Accounts": 5,
        "IT-HO_USER": 6,
        "IT-RO_USER": 7,
        "IT-BO_USER": 8
    };

    try {
        const employee = await userlogins.findOne({
            where: { emp_id: data.emp_id }
        });

        if (!employee) {
            return res.status(404).json({ message: "Employee not found" });
        }

        const roleIds = data.roles.map(role => roleMapping[role]).filter(id => id !== undefined);

        if (roleIds.length === 0) {
            return res.status(400).json({ message: "Invalid roles provided" });
        }

        const roleIdsString = roleIds.join(',');

        await userlogins.update(
            {
                role_ids_assigned: roleIdsString,
                states_assigned: data.states_assigned || null  // Store as string or null
            },
            { where: { emp_id: data.emp_id } }
        );

        return res.status(200).json({ message: "User roles updated successfully" });

    } catch (error) {
        console.error("Employee Role Update Error:", error);
        return res.status(500).json({ message: "Internal server error", error: error.message });
    }
});

module.exports = router;
