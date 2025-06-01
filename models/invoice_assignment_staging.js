const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('invoice_assignment_staging', {
    assignment_id: {
      autoIncrement: true,
      autoIncrementIdentity: true,
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true
    },
    po_num: {
      type: DataTypes.STRING(50),
      allowNull: true,
      references: {
        model: 'po_processing_staging',
        key: 'po_num'
      }
    },
    invoice_num: {
      type: DataTypes.STRING(50),
      allowNull: true
    },
    invoice_status: {
      type: DataTypes.STRING(50),
      allowNull: true
    },
    requested_by: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    requested_at: {
      type: DataTypes.DATE,
      allowNull: true
    },
    approved_by: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    approved_at: {
      type: DataTypes.DATE,
      allowNull: true
    },
    remarks: {
      type: DataTypes.STRING(500),
      allowNull: true
    }
  }, {
    sequelize,
    tableName: 'invoice_assignment_staging',
    schema: 'staging',
    timestamps: false,
    indexes: [
      {
        name: "invoice_assignment_staging_pkey",
        unique: true,
        fields: [
          { name: "assignment_id" },
        ]
      },
    ]
  });
};
