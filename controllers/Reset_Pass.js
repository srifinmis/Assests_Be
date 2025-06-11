// routes/resetPassword.js

const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");

const { sequelize } = require("../config/db");
const initModels = require("../models/init-models");
const models = initModels(sequelize);
const { userlogins } = models;

router.post("/password", async (req, res) => {
  const { token, newPassword } = req.body;

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const { emp_id } = decoded;

    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

    await userlogins.update(
      { password: hashedPassword },
      { where: { emp_id } }
    );
    console.log('response: ', response)

    res.status(200).json({ message: "Password reset successful." });
  } catch (error) {
    console.error("❌ Reset Password Error:", error);
    res.status(400).json({ message: "Invalid or expired token." });
  }
});

module.exports = router;