const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const nodemailer = require("nodemailer");
require("dotenv").config();

const { sequelize } = require("../config/db");
const initModels = require("../models/init-models");

const models = initModels(sequelize);
const { userlogins } = models; // Correct Model Reference ✅

// console.log("Loaded Models:", models);  // Debugging: See all models
// console.log("Userlogins Model:", userlogins); // Debugging: Check if userlogins exists

// 🔹 Function to Send Reset Email
const sendResetEmail = async (email, token) => {
    const transporter = nodemailer.createTransport({
    //   service: "gmail",
      host: "smtp.gmail.com",  // ✅ Explicitly set SMTP host
      port: 587,               // ✅ Use 587 instead of 465
      secure: false,           // ✅ Required for port 587
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
      tls: {
        ciphers: "SSLv3",
        rejectUnauthorized: false, // ✅ Prevent SSL certificate issues
      }
    });
  
    const resetUrl = `http://localhost:3000/reset-password/${token}`;
  
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: "Password Reset Request",
      html: `<p>Click the link below to reset your password:</p>
             <a href="${resetUrl}">${resetUrl}</a>`,
    });
};

// 🔹 Forgot Password Handler
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await userlogins.findOne({ where: { email } });
    console.log('hi', email, user )
    if (!user) return res.status(404).json({ message: "User not found" });

    const token = jwt.sign({ id: userlogins.system_id }, process.env.JWT_SECRET, {
      expiresIn: "1h",
    });

    // ✅ Use `update()` Instead of `save()`
    await userlogins.update(
      { resetToken: token, resetTokenExpiry: Date.now() + 3600000 },
      { where: { system_id: userlogins.system_id } }
    );

    await sendResetEmail(email, token);
    res.json({ message: "Reset link sent to your email" });
  } catch (err) {
    console.error("Forgot Password Error:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// 🔹 Reset Password Handler
exports.resetPassword = async (req, res) => {
  try {
    const { token, password } = req.body;
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // ✅ Correct Model Reference
    const user = await userlogins.findOne({
      where: { system_id: decoded.id, resetToken: token },
    });

    if (!user || !user.resetTokenExpiry || user.resetTokenExpiry < Date.now()) {
      return res.status(400).json({ message: "Invalid or expired token" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    // ✅ Use `update()` Instead of `save()`
    await userlogins.update(
      { password: hashedPassword, resetToken: null, resetTokenExpiry: null },
      { where: { system_id: user.system_id } }
    );

    res.json({ message: "Password reset successful" });
  } catch (err) {
    console.error("Reset Password Error:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};
