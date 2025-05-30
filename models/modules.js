const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('modules', {
    module_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true
    },
    module_name: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    description: {
      type: DataTypes.STRING(255),
      allowNull: true
    }
  }, {
    sequelize,
    tableName: 'modules',
    schema: 'public',
    timestamps: false,
    indexes: [
      {
        name: "modules_pkey",
        unique: true,
        fields: [
          { name: "module_id" },
        ]
      },
    ]
  });
};
