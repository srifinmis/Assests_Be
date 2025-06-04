const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('debit_card_details', {
    debit_id: {
      autoIncrement: true,
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true
    },
    docket_id: {
      type: DataTypes.STRING(40),
      allowNull: true
    },
    ho_by: {
      type: DataTypes.STRING(30),
      allowNull: true
    },
    ho_assigned_to: {
      type: DataTypes.STRING(20),
      allowNull: true
    },
    ho_assigned_date: {
      type: DataTypes.DATEONLY,
      allowNull: true
    },
    ro_accepted_by: {
      type: DataTypes.STRING(30),
      allowNull: true
    },
    ro_accepted_date: {
      type: DataTypes.DATEONLY,
      allowNull: true
    },
    ro_assigned_to: {
      type: DataTypes.STRING(30),
      allowNull: true
    },
    ro_assigned_date: {
      type: DataTypes.DATEONLY,
      allowNull: true
    },
    ro_status: {
      type: DataTypes.STRING(30),
      allowNull: true
    },
    bo_accepted_by: {
      type: DataTypes.STRING(30),
      allowNull: true
    },
    bo_accepted_date: {
      type: DataTypes.DATEONLY,
      allowNull: true
    },
    bo_assigned_to_customer: {
      type: DataTypes.STRING(30),
      allowNull: true
    },
    bo_assigned_date: {
      type: DataTypes.DATEONLY,
      allowNull: true
    },
    bo_status: {
      type: DataTypes.STRING(50),
      allowNull: true
    },
    role_id: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    status: {
      type: DataTypes.STRING(20),
      allowNull: true
    },
    remarks: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    ro_name: {
      type: DataTypes.STRING(50),
      allowNull: true
    },
    bo_name: {
      type: DataTypes.STRING(50),
      allowNull: true
    },
    pod: {
      type: DataTypes.STRING(80),
      allowNull: true
    }
  }, {
    sequelize,
    tableName: 'debit_card_details',
    schema: 'public',
    timestamps: false,
    indexes: [
      {
        name: "drebit_card_details_pkey",
        unique: true,
        fields: [
          { name: "debit_id" },
        ]
      },
    ]
  });
};
