const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('asset_depreciation_values', {
    id: {
      autoIncrement: true,
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true
    },
    asset_id: {
      type: DataTypes.STRING(50),
      allowNull: true
    },
    asset_type: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    total_price_incl_gst: {
      type: DataTypes.DECIMAL,
      allowNull: true
    },
    year_1_2_val: {
      type: DataTypes.DECIMAL,
      allowNull: true
    },
    year_2_3_val: {
      type: DataTypes.DECIMAL,
      allowNull: true
    },
    year_3_4_val: {
      type: DataTypes.DECIMAL,
      allowNull: true
    },
    year_4_5_val: {
      type: DataTypes.DECIMAL,
      allowNull: true
    },
    year_5_6_val: {
      type: DataTypes.DECIMAL,
      allowNull: true
    }
  }, {
    sequelize,
    tableName: 'asset_depreciation_values',
    schema: 'public',
    timestamps: false,
    indexes: [
      {
        name: "asset_depreciation_values_pkey",
        unique: true,
        fields: [
          { name: "id" },
        ]
      },
    ]
  });
};
