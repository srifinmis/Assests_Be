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
      allowNull: true
    },
    imei_num: {
      type: DataTypes.STRING(50),
      allowNull: true
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    mfr_serial_no: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    bt_number: {
      type: DataTypes.STRING(50),
      allowNull: true
    },
    bt_mac_address: {
      type: DataTypes.STRING(50),
      allowNull: true
    },
    firmware: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    sim_number: {
      type: DataTypes.STRING(50),
      allowNull: true
    },
    connection: {
      type: DataTypes.STRING(50),
      allowNull: true
    },
    network: {
      type: DataTypes.STRING(50),
      allowNull: true
    },
    sim_icicd: {
      type: DataTypes.STRING(50),
      allowNull: true
    },
    connection_number: {
      type: DataTypes.STRING(50),
      allowNull: true
    },
    network_type: {
      type: DataTypes.STRING(50),
      allowNull: true
    },
    warranty_status: {
      type: DataTypes.STRING(50),
      allowNull: true
    },
    po_num: {
      type: DataTypes.STRING(50),
      allowNull: true
    },
    po_date: {
      type: DataTypes.DATEONLY,
      allowNull: true
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
