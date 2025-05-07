const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");

const { sequelize } = require("../config/db");
const initModels = require("../models/init-models");
const models = initModels(sequelize);
const { userlogins } = models;

const sendEmail = require("../utils/sendEmail");

router.post("/password", async (req, res) => {
  const { emp_id } = req.body;

  try {
    const user = await userlogins.findOne({ where: { emp_id } });

    if (!user || !user.email) {
      // Don't disclose info to avoid enumeration
      return res.status(200).json({ message: "Reset link sent if the employee exists." });
    }

    const token = jwt.sign(
      { email: user.email, emp_id: user.emp_id },
      process.env.JWT_SECRET,
      { expiresIn: "5m" }
    );
    const resetLink = `http://192.168.80.38:3333/ResetPassword?token=${token}`;

    const html = `
      <h3>Password Reset Request</h3>
      <p>Hello ${user.emp_name},</p>
      <p>Click the link below to reset your password:</p>
      <a href="${resetLink}" target="_blank">${resetLink}</a>
      <p>This link will expire in 5 minutes.</p>
    `;

    await sendEmail({
      to: user.email,
      subject: "SRIFIN - Reset Password",
      html,
    });

    res.status(200).json({ message: "Reset link sent to the employee mail. This link will expire in 5 minutes." });
  } catch (err) {
    console.error("❌ Forgot Password Error:", err);
    res.status(500).json({ message: "Something went wrong." });
  }
});

module.exports = router;
