const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('assignmentdetails', {
    assignment_id: {
      autoIncrement: true,
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true
    },
<<<<<<< HEAD
    system_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'userlogins',
        key: 'system_id'
=======
    emp_id: {
      type: DataTypes.STRING(255),
      allowNull: true,
      references: {
        model: 'employee_master',
        key: 'emp_id'
>>>>>>> f5038431975edc9258ce158491b133f9b478183c
      }
    },
    asset_id: {
      type: DataTypes.STRING(20),
      allowNull: true,
      references: {
        model: 'assetmaster',
        key: 'asset_id'
      }
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
<<<<<<< HEAD
=======
    },
    assigned_to: {
      type: DataTypes.STRING(200),
      allowNull: true
>>>>>>> f5038431975edc9258ce158491b133f9b478183c
    }
  }, {
    sequelize,
    tableName: 'assignmentdetails',
    schema: 'public',
    timestamps: false,
    indexes: [
      {
        name: "assignmentdetails_pkey",
        unique: true,
        fields: [
          { name: "assignment_id" },
        ]
      },
    ]
  });
};
