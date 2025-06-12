const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('reagion_branchmap', {
    id: {
      autoIncrement: true,
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true
    },
    regionid_name: {
      type: DataTypes.STRING(30),
      allowNull: true
    },
    branchid_name: {
      type: DataTypes.STRING(30),
      allowNull: true
    }
  }, {
    sequelize,
    tableName: 'reagion_branchmap',
    schema: 'public',
    timestamps: false,
    indexes: [
      {
        name: "reagion_branchmap_pkey",
        unique: true,
        fields: [
          { name: "id" },
        ]
      },
    ]
  });
};
