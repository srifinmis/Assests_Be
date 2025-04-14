const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const { sequelize } = require('../config/db'); 
const initModels = require('../models/init-models'); 

const models = initModels(sequelize); 
const { userlogins } = models; 

exports.login = async (req, res) => {
  const { emp_id, password } = req.body;
  try {
    if (!userlogins) {
      return res.status(500).json({ message: "Model userlogins not found" });
    }

    const user = await userlogins.findOne({ where: { emp_id } });
    if (!user) return res.status(400).json({ message: "User not found" });

    if (user.emp_status !== "ACCEPTED" || user.access_status !== "GRANTED") return res.status(400).json({ message: "ACCESS DENIED!" })
      
    const validPassword = await bcrypt.compare(password, user.passwd_hash);
    if (!validPassword) return res.status(400).json({ message: "Invalid Employee ID or Password. Please try again ! " });

    const token = jwt.sign({ id: user.system_id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN });

    res.json({ 
      message: "Login successful", 
      token,
      user: { 
        emp_id: user.emp_id, 
        name: user.emp_name, 
        role: user.designation_name 
      } 
     });
  } catch (error) {
    console.error("Login Error:", error);
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};
