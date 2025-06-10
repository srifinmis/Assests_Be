var DataTypes = require("sequelize").DataTypes;
var _debit_card_details = require("./debit_card_details");
var _debit_card_details_workflow = require("./debit_card_details_workflow");
var _modules = require("./modules");
var _roles = require("./roles");
var _roles_modules = require("./roles_modules");
var _userlogins = require("./userlogins");

function initModels(sequelize) {
  var debit_card_details = _debit_card_details(sequelize, DataTypes);
  var debit_card_details_workflow = _debit_card_details_workflow(sequelize, DataTypes);
  var modules = _modules(sequelize, DataTypes);
  var roles = _roles(sequelize, DataTypes);
  var roles_modules = _roles_modules(sequelize, DataTypes);
  var userlogins = _userlogins(sequelize, DataTypes);

  modules.belongsToMany(roles, { as: 'role_id_roles', through: roles_modules, foreignKey: "module_id", otherKey: "role_id" });
  roles.belongsToMany(modules, { as: 'module_id_modules', through: roles_modules, foreignKey: "role_id", otherKey: "module_id" });
  roles_modules.belongsTo(modules, { as: "module", foreignKey: "module_id"});
  modules.hasMany(roles_modules, { as: "roles_modules", foreignKey: "module_id"});
  roles_modules.belongsTo(roles, { as: "role", foreignKey: "role_id"});
  roles.hasMany(roles_modules, { as: "roles_modules", foreignKey: "role_id"});

  return {
    debit_card_details,
    debit_card_details_workflow,
    modules,
    roles,
    roles_modules,
    userlogins,
  };
}
module.exports = initModels;
module.exports.initModels = initModels;
module.exports.default = initModels;
