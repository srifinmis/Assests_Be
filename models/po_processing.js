const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('po_processing', {
    po_num: {
      type: DataTypes.STRING(50),
      allowNull: false,
      primaryKey: true
    },
    po_date: {
      type: DataTypes.DATEONLY,
      allowNull: true
    },
    asset_type: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    asset_creation_at: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    client_name: {
      type: DataTypes.STRING(150),
      allowNull: true
    },
    client_phone_num: {
      type: DataTypes.STRING(15),
      allowNull: true
    },
    client_email: {
      type: DataTypes.STRING(150),
      allowNull: true
    },
    client_address: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    client_gst_num: {
      type: DataTypes.STRING(50),
      allowNull: true
    },
    vendor_name: {
      type: DataTypes.STRING(150),
      allowNull: true
    },
    vendor_phone_num: {
      type: DataTypes.STRING(15),
      allowNull: true
    },
    vendor_email: {
      type: DataTypes.STRING(150),
      allowNull: true
    },
    vendor_address: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    vendor_gst_num: {
      type: DataTypes.STRING(50),
      allowNull: true
    },
    shipping_name: {
      type: DataTypes.STRING(150),
      allowNull: true
    },
    shipping_phone_num: {
      type: DataTypes.STRING(15),
      allowNull: true
    },
    shipping_address: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    payment_terms: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    delivery_terms: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    warranty: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    po_url: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    createdat: {
      type: DataTypes.DATE,
      allowNull: true,
      defaultValue: Sequelize.Sequelize.fn('now')
    },
    updatedat: {
      type: DataTypes.DATE,
      allowNull: true,
      defaultValue: Sequelize.Sequelize.fn('now')
    },
    invoice_num: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    invoice_date: {
      type: DataTypes.DATEONLY,
      allowNull: true
    },
    invoice_url: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    utr_num: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    payment_date: {
      type: DataTypes.DATEONLY,
      allowNull: true
    },
    payment_receipt_url: {
      type: DataTypes.TEXT,
      allowNull: true
    }
  }, {
    sequelize,
    tableName: 'po_processing',
    schema: 'public',
    timestamps: false,
    indexes: [
      {
        name: "po_processing_pkey",
        unique: true,
        fields: [
          { name: "po_num" },
        ]
      },
    ]
  });
};
