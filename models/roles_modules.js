const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('roles_modules', {
    role_module_id: {
      autoIncrement: true,
      type: DataTypes.INTEGER,
      allowNull: false
    },
    role_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true,
      references: {
        model: 'roles',
        key: 'role_id'
      }
    },
    module_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true,
      references: {
        model: 'modules',
        key: 'module_id'
      }
    },
    assigned_at: {
      type: DataTypes.DATE,
      allowNull: true,
      defaultValue: Sequelize.Sequelize.literal('CURRENT_TIMESTAMP')
    }
  }, {
    sequelize,
    tableName: 'roles_modules',
    schema: 'public',
    timestamps: false,
    indexes: [
      {
        name: "roles_modules_pkey",
        unique: true,
        fields: [
          { name: "role_id" },
          { name: "module_id" },
        ]
      },
    ]
  });
};
