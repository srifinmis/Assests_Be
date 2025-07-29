require("dotenv").config();
const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const path = require('path');
const { sequelize } = require("./config/db");
const uploadRoute = require('./routes/upload');
const authRoutes = require("./routes/authRoutes");
//29 op
const { Pool } = require('pg');

const app = express();
app.use(express.json());
app.use(cors());
app.use(bodyParser.json());

// 29 op
const pool = new Pool({
  user: 'jarvis',
  host: '192.168.80.38',
  database: 'it_assetmanagement_final',
  password: '2650',
  port: 5555,
});

// Serve static files from utils/uploads directory
app.use('/utils/uploads', express.static(path.join(__dirname, 'utils/uploads')));

app.use("/api", authRoutes);
app.use('/api/bulk', uploadRoute);

// 29 op
app.get('/api/fetch/table', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM roles');
    res.json(result.rows);
  } catch (err) {
    console.error('Error executing query', err);
    res.status(500).json({ error: 'Database query failed' });
  }
});

const PORT = process.env.PORT || 2727; 

sequelize.sync().then(() => {
  console.log("✅ Database synchronized!");
  app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
});

