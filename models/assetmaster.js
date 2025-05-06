const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('assetmaster', {
    asset_id: {
      type: DataTypes.STRING(20),
      allowNull: false,
      primaryKey: true
    },
    asset_type: {
      type: DataTypes.STRING(50),
      allowNull: false,
      references: {
        model: 'asset_types',
        key: 'asset_type'
      }
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
      type: DataTypes.STRING(50),
      allowNull: false
    },
    warranty_status: {
      type: DataTypes.STRING(50),
      allowNull: false
    },
    po_num: {
      type: DataTypes.STRING(50),
      allowNull: false
    },
    po_date: {
      type: DataTypes.DATEONLY,
      allowNull: false
    },
    base_location: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    state: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    remarks: {
      type: DataTypes.TEXT,
      allowNull: true
    }
  }, {
    sequelize,
    tableName: 'assetmaster',
    schema: 'public',
    hasTrigger: true,
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
