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
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    mfr_serial_no: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    bt_number: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    bt_mac_address: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    firmware: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    sim_number: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    connection: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    network: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    sim_icicd: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    connection_number: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    network_type: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    warranty_status: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    po_num: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    po_date: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    base_location: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    state: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    remarks: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    asset_purchased_from: {
      type: DataTypes.STRING(100),
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
