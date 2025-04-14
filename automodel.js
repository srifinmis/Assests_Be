require('dotenv').config();
const SequelizeAuto = require('sequelize-auto');
const path = require('path');

// Load environment variables
const DB_NAME = process.env.DB_NAME || 'it_asset_management_new';
const DB_USER = process.env.DB_USER || 'jarvis';
const DB_PASS = process.env.DB_PASS || '2650';
const DB_HOST = process.env.DB_HOST || '192.168.80.38';
const DB_PORT = process.env.DB_PORT || '5555';

console.log("🔹 Connecting to Database with:");
console.log(`   🏢 Host: ${DB_HOST}`);
console.log(`   👤 User: ${DB_USER}`);
console.log(`   🔑 Password: ${DB_PASS}`);
console.log(`   📦 Database: ${DB_NAME}`);
console.log(`   🚪 Port: ${DB_PORT}`);

const auto = new SequelizeAuto(DB_NAME, DB_USER, DB_PASS, {
  host: DB_HOST,
  port: DB_PORT,
  dialect: 'postgres',
  directory: path.join(__dirname, 'models'), // Output directory for models
  additional: {
    timestamps: false // Adjust based on your database schema
  }
});

// Run auto-generation
auto.run()
  .then(() => console.log("✅ Model generation completed successfully!"))
  .catch(err => console.error("❌ Error generating models:", err));
