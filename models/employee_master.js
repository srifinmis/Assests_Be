const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('employee_master', {
    system_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    emp_id: {
      type: DataTypes.STRING(255),
      allowNull: false,
      primaryKey: true,
      unique: "emp_id_unique"
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
      type: DataTypes.STRING(15),
      allowNull: true
    },
    host_name: {
      type: DataTypes.STRING(100),
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
    reporting_manager: {
      type: DataTypes.STRING(255),
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
    },
<<<<<<< HEAD
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
=======
>>>>>>> f5038431975edc9258ce158491b133f9b478183c
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
      type: DataTypes.STRING(30),
      allowNull: true
    },
    role_ids_assigned: {
      type: DataTypes.STRING(50),
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
          { name: "emp_id" },
        ]
      },
    ]
  });
};
