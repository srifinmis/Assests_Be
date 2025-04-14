const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('assignmentdetails_logs_staging', {
    id: {
      autoIncrement: true,
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true
    },
    assignment_id: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    system_id: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    asset_id: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    assigned_date: {
      type: DataTypes.DATE,
      allowNull: true
    },
    assignment_status: {
      type: DataTypes.STRING(30),
      allowNull: true
    },
    remarks: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    branchid_name: {
      type: DataTypes.STRING(50),
      allowNull: true
    },
    regionid_name: {
      type: DataTypes.STRING(50),
      allowNull: true
    },
    updatedat: {
      type: DataTypes.DATE,
      allowNull: true
    }
  }, {
    sequelize,
    tableName: 'assignmentdetails_logs_staging',
    schema: 'staging',
    timestamps: false,
    indexes: [
      {
        name: "assignmentdetails_logs_staging_pkey",
        unique: true,
        fields: [
          { name: "id" },
        ]
      },
    ]
  });
};
