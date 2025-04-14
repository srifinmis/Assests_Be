const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('asset_types', {
    id: {
      autoIncrement: true,
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true
    },
    asset_type: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: "asset_types_asset_type_unique"
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
    tableName: 'asset_types',
    schema: 'public',
    timestamps: false,
    indexes: [
      {
        name: "asset_types_asset_type_unique",
        unique: true,
        fields: [
          { name: "asset_type" },
        ]
      },
      {
        name: "asset_types_pkey",
        unique: true,
        fields: [
          { name: "id" },
        ]
      },
    ]
  });
};
