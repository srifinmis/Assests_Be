const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('employee_master', {
    system_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true
    },
    employee_id: {
      type: DataTypes.STRING(50),
      allowNull: true
    },
    employee_name: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    email: {
      type: DataTypes.STRING(255),
      allowNull: false
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
    },
    access_status: {
      type: DataTypes.STRING(30),
      allowNull: true
    }
  }, {
    sequelize,
    tableName: 'employee_master',
    schema: 'public',
    timestamps: false,
    indexes: [
      {
        name: "employee_master_pkey",
        unique: true,
        fields: [
          { name: "system_id" },
        ]
      },
    ]
  });
};
