const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('bulk_upload_staging', {
    bulk_id: {
      autoIncrement: true,
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true
    },
    bulk_status: {
      type: DataTypes.STRING(50),
      allowNull: false
    },
    requested_by: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    requested_at: {
      type: DataTypes.DATE,
      allowNull: true,
      defaultValue: Sequelize.Sequelize.literal('CURRENT_TIMESTAMP')
    },
    approved_by: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    approved_at: {
      type: DataTypes.DATE,
      allowNull: true
    },
    remarks: {
      type: DataTypes.TEXT,
      allowNull: true
    }
  }, {
    sequelize,
    tableName: 'bulk_upload_staging',
    schema: 'staging',
    timestamps: false,
    indexes: [
      {
        name: "bulk_upload_staging_pkey",
        unique: true,
        fields: [
          { name: "bulk_id" },
        ]
      },
    ]
  });
};
