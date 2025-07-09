const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('bulk_assignmentdetails_staging', {
    assignment_id: {
      autoIncrement: true,
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true
    },
    emp_id: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    asset_id: {
      type: DataTypes.STRING(50),
      allowNull: true,
      references: {
        model: 'assetmaster_staging',
        key: 'asset_id'
      }
    },
    assigned_type: {
      type: DataTypes.STRING(100),
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
      allowNull: true,
      defaultValue: Sequelize.Sequelize.literal('CURRENT_TIMESTAMP')
    },
    remarks: {
      type: DataTypes.STRING(500),
      allowNull: true
    },
    bulk_id: {
      type: DataTypes.INTEGER,
      allowNull: true
    }
  }, {
    sequelize,
    tableName: 'bulk_assignmentdetails_staging',
    schema: 'staging',
    timestamps: false,
    indexes: [
      {
        name: "bulk_assignmentdetails_staging_pkey",
        unique: true,
        fields: [
          { name: "assignment_id" },
        ]
      },
    ]
  });
};
