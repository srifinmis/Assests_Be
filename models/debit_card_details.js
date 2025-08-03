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
      allowNull: true,
      unique: "debit_card_details_docket_id_key"
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
    bo_accepted_date: {
      type: DataTypes.DATEONLY,
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
    },
    send_to: {
      type: DataTypes.STRING(20),
      allowNull: true
    },
    loan_app_no: {
      type: DataTypes.STRING(30),
      allowNull: true
    },
    customer_id: {
      type: DataTypes.STRING(30),
      allowNull: true
    },
    issue_date: {
      type: DataTypes.DATEONLY,
      allowNull: true
    },
    cust_assigned_from: {
      type: DataTypes.STRING(50),
      allowNull: true
    },
    ho_asigned_by: {
      type: DataTypes.STRING(50),
      allowNull: true
    },
    ro_accepted_by: {
      type: DataTypes.STRING(50),
      allowNull: true
    },
    ro_asigned_by: {
      type: DataTypes.STRING(50),
      allowNull: true
    },
    bo_accepted_by: {
      type: DataTypes.STRING(50),
      allowNull: true
    },
    bo_asigned_by: {
      type: DataTypes.STRING(50),
      allowNull: true
    },
    updatedby: {
      type: DataTypes.DATE,
      allowNull: true,
      defaultValue: Sequelize.Sequelize.literal('CURRENT_TIMESTAMP')
    }
  }, {
    sequelize,
    tableName: 'debit_card_details',
    schema: 'public',
    timestamps: false,
    indexes: [
      {
        name: "debit_card_details_docket_id_key",
        unique: true,
        fields: [
          { name: "docket_id" },
        ]
      },
      {
        name: "debit_card_details_pkey",
        unique: true,
        fields: [
          { name: "debit_id" },
        ]
      },
    ]
  });
};
