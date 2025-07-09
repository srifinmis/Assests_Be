const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('assetmaster_staging', {
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
    description: {
      type: DataTypes.TEXT,
      allowNull: true
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
    },
    bulk_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'bulk_upload_staging',
        key: 'bulk_id'
      }
    }
  }, {
    sequelize,
    tableName: 'assetmaster_staging',
    schema: 'staging',
    timestamps: false,
    indexes: [
      {
        name: "assetmaster_staging_pkey",
        unique: true,
        fields: [
          { name: "asset_id" },
        ]
      },
    ]
  });
};
