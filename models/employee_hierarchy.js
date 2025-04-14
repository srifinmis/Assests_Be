const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('employee_hierarchy', {
    employee_id: {
      type: DataTypes.STRING(50),
      allowNull: false,
      primaryKey: true
    },
    employee_name: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    employee_status: {
      type: DataTypes.STRING(50),
      allowNull: true
    },
    designation_name: {
      type: DataTypes.STRING(50),
      allowNull: true
    },
    department_name: {
      type: DataTypes.STRING(50),
      allowNull: true
    },
    branchid_name: {
      type: DataTypes.STRING(50),
      allowNull: true
    },
    areaid_name: {
      type: DataTypes.STRING(50),
      allowNull: true
    },
    regionid_name: {
      type: DataTypes.STRING(50),
      allowNull: true
    },
    clusterid_name: {
      type: DataTypes.STRING(50),
      allowNull: true
    },
    state: {
      type: DataTypes.STRING(50),
      allowNull: true
    }
  }, {
    sequelize,
    tableName: 'employee_hierarchy',
    schema: 'public',
    timestamps: false,
    indexes: [
      {
        name: "employee_hierarchy_pkey",
        unique: true,
        fields: [
          { name: "employee_id" },
        ]
      },
    ]
  });
};
