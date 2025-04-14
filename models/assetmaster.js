const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('assetmaster', {
    asset_id: {
      autoIncrement: true,
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true
    },
    asset_type: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    brand: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    model: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    imei_num: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    warranty_status: {
      type: DataTypes.STRING(30),
      allowNull: true
    },
    po_num: {
      type: DataTypes.STRING(50),
      allowNull: true
    },
    po_date: {
      type: DataTypes.DATE,
      allowNull: true
    },
    base_location: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    state: {
      type: DataTypes.STRING(30),
      allowNull: true
    },
    remarks: {
      type: DataTypes.TEXT,
      allowNull: true
    }
  }, {
    sequelize,
    tableName: 'assetmaster',
    schema: 'public',
    timestamps: false,
    indexes: [
      {
        name: "assetmaster_pkey",
        unique: true,
        fields: [
          { name: "asset_id" },
        ]
      },
    ]
  });
};
