require("dotenv").config();
const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const { sequelize } = require("./config/db");
const authRoutes = require("./routes/authRoutes");

const app = express();
app.use(express.json());
app.use(cors());
app.use(bodyParser.json());

app.use("/api", authRoutes);

const PORT = process.env.PORT || 2727; 

sequelize.sync().then(() => {
  console.log("✅ Database synchronized!");
  app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
});

