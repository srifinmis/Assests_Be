var DataTypes = require("sequelize").DataTypes;
var _approver = require("./approver");
var _approver_staging = require("./approver_staging");
var _asset_depreciation_values = require("./asset_depreciation_values");
var _asset_types = require("./asset_types");
var _asset_types_staging = require("./asset_types_staging");
var _assetmaster = require("./assetmaster");
var _assetmaster_staging = require("./assetmaster_staging");
var _assignmentdetails = require("./assignmentdetails");
var _assignmentdetails_logs = require("./assignmentdetails_logs");
var _assignmentdetails_logs_staging = require("./assignmentdetails_logs_staging");
var _assignmentdetails_staging = require("./assignmentdetails_staging");
var _bulk_assignmentdetails_staging = require("./bulk_assignmentdetails_staging");
var _bulk_upload_staging = require("./bulk_upload_staging");
var _debit_card_details = require("./debit_card_details");
var _debit_card_details_workflow = require("./debit_card_details_workflow");
var _employee_hierarchy = require("./employee_hierarchy");
var _employee_master = require("./employee_master");
var _invoice_assignment_staging = require("./invoice_assignment_staging");
var _modules = require("./modules");
var _payment_assignment_staging = require("./payment_assignment_staging");
var _po_processing = require("./po_processing");
var _po_processing_assignment = require("./po_processing_assignment");
var _po_processing_assignment_staging = require("./po_processing_assignment_staging");
var _po_processing_staging = require("./po_processing_staging");
var _po_products = require("./po_products");
var _po_products_staging = require("./po_products_staging");
var _reagion_branchmap = require("./reagion_branchmap");
var _roles = require("./roles");
var _roles_modules = require("./roles_modules");
var _userlogins = require("./userlogins");
var _userroles = require("./userroles");

function initModels(sequelize) {
  var approver = _approver(sequelize, DataTypes);
  var approver_staging = _approver_staging(sequelize, DataTypes);
  var asset_depreciation_values = _asset_depreciation_values(sequelize, DataTypes);
  var asset_types = _asset_types(sequelize, DataTypes);
  var asset_types_staging = _asset_types_staging(sequelize, DataTypes);
  var assetmaster = _assetmaster(sequelize, DataTypes);
  var assetmaster_staging = _assetmaster_staging(sequelize, DataTypes);
  var assignmentdetails = _assignmentdetails(sequelize, DataTypes);
  var assignmentdetails_logs = _assignmentdetails_logs(sequelize, DataTypes);
  var assignmentdetails_logs_staging = _assignmentdetails_logs_staging(sequelize, DataTypes);
  var assignmentdetails_staging = _assignmentdetails_staging(sequelize, DataTypes);
  var bulk_assignmentdetails_staging = _bulk_assignmentdetails_staging(sequelize, DataTypes);
  var bulk_upload_staging = _bulk_upload_staging(sequelize, DataTypes);
  var debit_card_details = _debit_card_details(sequelize, DataTypes);
  var debit_card_details_workflow = _debit_card_details_workflow(sequelize, DataTypes);
  var employee_hierarchy = _employee_hierarchy(sequelize, DataTypes);
  var employee_master = _employee_master(sequelize, DataTypes);
  var invoice_assignment_staging = _invoice_assignment_staging(sequelize, DataTypes);
  var modules = _modules(sequelize, DataTypes);
  var payment_assignment_staging = _payment_assignment_staging(sequelize, DataTypes);
  var po_processing = _po_processing(sequelize, DataTypes);
  var po_processing_assignment = _po_processing_assignment(sequelize, DataTypes);
  var po_processing_assignment_staging = _po_processing_assignment_staging(sequelize, DataTypes);
  var po_processing_staging = _po_processing_staging(sequelize, DataTypes);
  var po_products = _po_products(sequelize, DataTypes);
  var po_products_staging = _po_products_staging(sequelize, DataTypes);
  var reagion_branchmap = _reagion_branchmap(sequelize, DataTypes);
  var roles = _roles(sequelize, DataTypes);
  var roles_modules = _roles_modules(sequelize, DataTypes);
  var userlogins = _userlogins(sequelize, DataTypes);
  var userroles = _userroles(sequelize, DataTypes);

  modules.belongsToMany(roles, { as: 'role_id_roles', through: roles_modules, foreignKey: "module_id", otherKey: "role_id" });
  roles.belongsToMany(modules, { as: 'module_id_modules', through: roles_modules, foreignKey: "role_id", otherKey: "module_id" });
  assetmaster.belongsTo(asset_types, { as: "asset_type_asset_type", foreignKey: "asset_type"});
  asset_types.hasMany(assetmaster, { as: "assetmasters", foreignKey: "asset_type"});
  assignmentdetails.belongsTo(assetmaster, { as: "asset", foreignKey: "asset_id"});
  assetmaster.hasMany(assignmentdetails, { as: "assignmentdetails", foreignKey: "asset_id"});
  approver.belongsTo(assignmentdetails, { as: "assignment", foreignKey: "assignment_id"});
  assignmentdetails.hasMany(approver, { as: "approvers", foreignKey: "assignment_id"});
  assignmentdetails.belongsTo(employee_master, { as: "emp", foreignKey: "emp_id"});
  employee_master.hasMany(assignmentdetails, { as: "assignmentdetails", foreignKey: "emp_id"});
  roles_modules.belongsTo(modules, { as: "module", foreignKey: "module_id"});
  modules.hasMany(roles_modules, { as: "roles_modules", foreignKey: "module_id"});
  po_processing_assignment.belongsTo(po_processing, { as: "po_num_po_processing", foreignKey: "po_num"});
  po_processing.hasMany(po_processing_assignment, { as: "po_processing_assignments", foreignKey: "po_num"});
  po_products.belongsTo(po_processing, { as: "po_num_po_processing", foreignKey: "po_num"});
  po_processing.hasMany(po_products, { as: "po_products", foreignKey: "po_num"});
  roles_modules.belongsTo(roles, { as: "role", foreignKey: "role_id"});
  roles.hasMany(roles_modules, { as: "roles_modules", foreignKey: "role_id"});
  userroles.belongsTo(userlogins, { as: "system", foreignKey: "system_id"});
  userlogins.hasMany(userroles, { as: "userroles", foreignKey: "system_id"});
  assetmaster_staging.belongsTo(asset_types, { as: "asset_type_asset_type", foreignKey: "asset_type"});
  asset_types.hasMany(assetmaster_staging, { as: "assetmaster_stagings", foreignKey: "asset_type"});
  assignmentdetails_staging.belongsTo(assetmaster, { as: "asset", foreignKey: "asset_id"});
  assetmaster.hasMany(assignmentdetails_staging, { as: "assignmentdetails_stagings", foreignKey: "asset_id"});
  bulk_assignmentdetails_staging.belongsTo(assetmaster_staging, { as: "asset", foreignKey: "asset_id"});
  assetmaster_staging.hasMany(bulk_assignmentdetails_staging, { as: "bulk_assignmentdetails_stagings", foreignKey: "asset_id"});
  approver_staging.belongsTo(assignmentdetails_staging, { as: "assignment", foreignKey: "assignment_id"});
  assignmentdetails_staging.hasMany(approver_staging, { as: "approver_stagings", foreignKey: "assignment_id"});
  po_processing_staging.belongsTo(bulk_upload_staging, { as: "bulk", foreignKey: "bulk_id"});
  bulk_upload_staging.hasMany(po_processing_staging, { as: "po_processing_stagings", foreignKey: "bulk_id"});
  assignmentdetails_staging.belongsTo(employee_master, { as: "emp", foreignKey: "emp_id"});
  employee_master.hasMany(assignmentdetails_staging, { as: "assignmentdetails_stagings", foreignKey: "emp_id"});
  invoice_assignment_staging.belongsTo(po_processing_staging, { as: "po_num_po_processing_staging", foreignKey: "po_num"});
  po_processing_staging.hasMany(invoice_assignment_staging, { as: "invoice_assignment_stagings", foreignKey: "po_num"});
  payment_assignment_staging.belongsTo(po_processing_staging, { as: "po_num_po_processing_staging", foreignKey: "po_num"});
  po_processing_staging.hasMany(payment_assignment_staging, { as: "payment_assignment_stagings", foreignKey: "po_num"});
  po_processing_assignment_staging.belongsTo(po_processing_staging, { as: "po_num_po_processing_staging", foreignKey: "po_num"});
  po_processing_staging.hasMany(po_processing_assignment_staging, { as: "po_processing_assignment_stagings", foreignKey: "po_num"});
  po_products_staging.belongsTo(po_processing_staging, { as: "po_num_po_processing_staging", foreignKey: "po_num"});
  po_processing_staging.hasMany(po_products_staging, { as: "po_products_stagings", foreignKey: "po_num"});
  bulk_assignmentdetails_staging.belongsTo(userlogins, { as: "system", foreignKey: "system_id"});
  userlogins.hasMany(bulk_assignmentdetails_staging, { as: "bulk_assignmentdetails_stagings", foreignKey: "system_id"});

  return {
    approver,
    approver_staging,
    asset_depreciation_values,
    asset_types,
    asset_types_staging,
    assetmaster,
    assetmaster_staging,
    assignmentdetails,
    assignmentdetails_logs,
    assignmentdetails_logs_staging,
    assignmentdetails_staging,
    bulk_assignmentdetails_staging,
    bulk_upload_staging,
    debit_card_details,
    debit_card_details_workflow,
    employee_hierarchy,
    employee_master,
    invoice_assignment_staging,
    modules,
    payment_assignment_staging,
    po_processing,
    po_processing_assignment,
    po_processing_assignment_staging,
    po_processing_staging,
    po_products,
    po_products_staging,
    reagion_branchmap,
    roles,
    roles_modules,
    userlogins,
    userroles,
  };
}
module.exports = initModels;
module.exports.initModels = initModels;
module.exports.default = initModels;
