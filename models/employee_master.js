const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('employee_master', {
    system_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true
    },
    emp_id: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    emp_name: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    passwd_hash: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    email: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    emp_mob: {
      type: DataTypes.STRING(20),
      allowNull: true
    },
    host_name: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    designation_name: {
      type: DataTypes.STRING(200),
      allowNull: true
    },
    department_name: {
      type: DataTypes.STRING(200),
      allowNull: true
    },
    reporting_manager: {
      type: DataTypes.STRING(200),
      allowNull: true
    },
    branchid_name: {
      type: DataTypes.STRING(200),
      allowNull: true
    },
    areaid_name: {
      type: DataTypes.STRING(200),
      allowNull: true
    },
    regionid_name: {
      type: DataTypes.STRING(200),
      allowNull: true
    },
    clusterid_name: {
      type: DataTypes.STRING(200),
      allowNull: true
    },
    state: {
      type: DataTypes.STRING(200),
      allowNull: true
    },
    access_status: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: true
    },
    updated_at: {
      type: DataTypes.DATE,
      allowNull: true
    },
    sso_provider: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    sso_id: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    emp_status: {
      type: DataTypes.STRING(50),
      allowNull: true
    },
    role_ids_assigned: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    states_assigned: {
      type: DataTypes.TEXT,
      allowNull: true
    }
  }, {
    sequelize,
    tableName: 'employee_master',
    schema: 'public',
    timestamps: false,
    indexes: [
      {
        name: "emp_id_unique",
        unique: true,
        fields: [
          { name: "emp_id" },
        ]
      },
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
