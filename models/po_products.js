const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('po_products', {
    product_id: {
      type: DataTypes.STRING(50),
      allowNull: false,
      primaryKey: true
    },
    po_num: {
      type: DataTypes.STRING(50),
      allowNull: true,
      references: {
        model: 'po_processing',
        key: 'po_num'
      }
    },
    item_description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    quantity: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    unit_price: {
      type: DataTypes.DECIMAL,
      allowNull: true
    },
    total_price_excl_gst: {
      type: DataTypes.DECIMAL,
      allowNull: true
    },
    cgst: {
      type: DataTypes.DECIMAL,
      allowNull: true
    },
    sgst: {
      type: DataTypes.DECIMAL,
      allowNull: true
    },
    total_price_incl_gst: {
      type: DataTypes.DECIMAL,
      allowNull: true
    }
  }, {
    sequelize,
    tableName: 'po_products',
    schema: 'public',
    timestamps: false,
    indexes: [
      {
        name: "po_products_pkey",
        unique: true,
        fields: [
          { name: "product_id" },
        ]
      },
    ]
  });
};
