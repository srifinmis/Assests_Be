const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('po_processing_assignment', {
    assignment_id: {
      type: DataTypes.INTEGER,
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
    po_status: {
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
    tableName: 'po_processing_assignment',
    schema: 'public',
    timestamps: false,
    indexes: [
      {
        name: "po_processing_assignment_pkey",
        unique: true,
        fields: [
          { name: "assignment_id" },
        ]
      },
    ]
  });
};
