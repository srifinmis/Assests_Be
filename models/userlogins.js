const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('userlogins', {
    system_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true
    },
    emp_id: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    emp_name: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    email: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    passwd_hash: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: true,
      defaultValue: Sequelize.Sequelize.literal('CURRENT_TIMESTAMP')
    },
    updated_at: {
      type: DataTypes.DATE,
      allowNull: true,
      defaultValue: "2025-01-01 00:00:00+00"
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
    access_status: {
      type: DataTypes.STRING(30),
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
    role_ids_assigned: {
      type: DataTypes.STRING(50),
      allowNull: true
    },
    states_assigned: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    emp_mobile: {
      type: DataTypes.STRING(100),
      allowNull: true
    }
  }, {
    sequelize,
    tableName: 'userlogins',
    schema: 'public',
    timestamps: false,
    indexes: [
      {
        name: "userlogins_pkey",
        unique: true,
        fields: [
          { name: "system_id" },
        ]
      },
    ]
  });
};
