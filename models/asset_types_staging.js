const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('asset_types_staging', {
    id: {
      autoIncrement: true,
      type: DataTypes.INTEGER,
      allowNull: false
    },
    asset_type: {
      type: DataTypes.STRING(100),
      allowNull: false,
      primaryKey: true
    },
    salvage_percent: {
      type: DataTypes.DECIMAL,
      allowNull: true
    },
    depreciation_percent: {
      type: DataTypes.DECIMAL,
      allowNull: true
    },
    depreciation_years: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    cgst_percent: {
      type: DataTypes.DECIMAL,
      allowNull: true
    },
    sgst_percent: {
      type: DataTypes.DECIMAL,
      allowNull: true
    }
  }, {
    sequelize,
    tableName: 'asset_types_staging',
    schema: 'staging',
    timestamps: false,
    indexes: [
      {
        name: "asset_types_staging_pkey",
        unique: true,
        fields: [
          { name: "asset_type" },
        ]
      },
    ]
  });
};
