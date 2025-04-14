const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('approver', {
    request_num: {
      autoIncrement: true,
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true
    },
    assignment_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'assignmentdetails',
        key: 'assignment_id'
      }
    },
    requested_by: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    requested_at: {
      type: DataTypes.DATE,
      allowNull: true,
      defaultValue: Sequelize.Sequelize.literal('CURRENT_TIMESTAMP')
    },
    assigned_to: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    requested_to: {
      type: DataTypes.STRING(100),
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
    approval_status: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    remarks: {
      type: DataTypes.STRING(500),
      allowNull: true
    }
  }, {
    sequelize,
    tableName: 'approver',
    schema: 'public',
    timestamps: false,
    indexes: [
      {
        name: "approver_pkey",
        unique: true,
        fields: [
          { name: "request_num" },
        ]
      },
    ]
  });
};
