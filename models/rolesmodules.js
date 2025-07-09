const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('rolesmodules', {
    role_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true
    },
    module_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true
    },
    emp_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'userlogins',
        key: 'emp_id'
      }
    },
    assigned_at: {
      type: DataTypes.DATE,
      allowNull: true,
      defaultValue: Sequelize.Sequelize.literal('CURRENT_TIMESTAMP')
    }
  }, {
    sequelize,
    tableName: 'rolesmodules',
    schema: 'public',
    timestamps: false,
    indexes: [
      {
        name: "rolesmodules_pkey1",
        unique: true,
        fields: [
          { name: "role_id" },
          { name: "module_id" },
        ]
      },
    ]
  });
};
