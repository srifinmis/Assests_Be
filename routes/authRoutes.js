//routes/authRoutes.js
const express = require("express");
// const upload = require("../middleware/upload");
// const multer = require("multer"); // ✅ Import multer

const { login } = require("../controllers/authController");
const ForgotRoutes = require("../controllers/forgotpassword");
const ResetRoutes = require("../controllers/Reset_Pass");

const assetRoutes = require("../controllers/dashboard"); // ✅ Import assets.js
const AssetListRoutes = require("../controllers/assetlist");
const AssignAssetRoutes = require("../controllers/AssignAsset");
const MaintenanceAssetRoutes = require("../controllers/Maintenanace");
const FreePoolAssetRoutes = require("../controllers/FreeAsset");

//Approvals
const AssignedRoutes = require("../controllers/Approval/Assigned")
const MaintenanaceRoutes = require("../controllers/Approval/UnderMaintenance")
const FreePoolRoutes = require("../controllers/Approval/FreePool")
const PurchaseOrderRoutes = require("../controllers/Approval/PurchaseOrder")
const InvoiceApproveRoutes = require("../controllers/Approval/Invoice")
const PaymentRoutes = require("../controllers/Approval/Payment")
const BulkRoute = require("../controllers/Approval/bulk_upload")

//po
const PORoutes = require("../controllers/New_Asset/POMain")
const CreatePORoutes = require("../controllers/CreatePO")
const EditPORoutes = require("../controllers/New_Asset/Edit_PO")

const InvoiceRoutes = require("../controllers/New_Asset/Upload_Invoice")
const RecieptRoutes = require("../controllers/New_Asset/Upload_Reciept")
const DepreciationRoutes = require("../controllers/New_Asset/AssetDepreciation")

//bulk
const BulkRoutes = require("../controllers/BulkUpload")
const RoleRoutes = require("../controllers/RoleBase/RoleChangeController")

const PurchaseOrderApprovalRoutes = require("../controllers/Approval/PurchaseOrder");

const RORoutes = require("../controllers/Debit/RO")
const CreateRouter = require("../controllers/Debit/CreateCustomer")

const router = express.Router();
// const upload = multer({ storage: multer.memoryStorage() });

router.post("/login", login);
router.use("/forgot", ForgotRoutes);
router.use("/reset", ResetRoutes);

router.use("/dashboard", assetRoutes);
router.use("/assetlist", AssetListRoutes);
router.use("/assignasset", AssignAssetRoutes);
router.use("/maintenanceasset", MaintenanceAssetRoutes);
router.use("/freepoolasset", FreePoolAssetRoutes);

router.use("/approval", AssignedRoutes);
router.use("/underapproval", MaintenanaceRoutes);
router.use("/freeapproval", FreePoolRoutes);
router.use("/purchaseorder", PurchaseOrderRoutes);
router.use("/invoice", InvoiceApproveRoutes);
router.use("/payment", PaymentRoutes);
router.use("/bulkupload", BulkRoute);

router.use("/po", PORoutes);
router.use("/CreatePO", CreatePORoutes);
router.use("/edit-po", EditPORoutes);
router.use("/approval/purchaseorder", PurchaseOrderApprovalRoutes);
router.use("/invoices", InvoiceRoutes);
router.use("/reciept", RecieptRoutes);
router.use("/depreciation", DepreciationRoutes);

router.use("/bulk", BulkRoutes);
router.use("/role", RoleRoutes);

// Debit Card apis
router.use("/ros", RORoutes);
router.use("/bo",CreateRouter)


module.exports = router;


// //routes/authRoutes.js
// const express = require("express");
// // const multer = require("multer"); // ✅ Import multer

// const { login } = require("../controllers/authController");
// const ForgotRoutes = require("../controllers/forgotpassword");
// const ResetRoutes = require("../controllers/Reset_Pass");

// const assetRoutes = require("../controllers/dashboard"); // ✅ Import assets.js
// const AssetListRoutes = require("../controllers/assetlist");
// const AssignAssetRoutes = require("../controllers/AssignAsset");
// const MaintenanceAssetRoutes = require("../controllers/Maintenanace");
// const FreePoolAssetRoutes = require("../controllers/FreeAsset");

// //Approvals
// const AssignedRoutes = require("../controllers/Approval/Assigned")
// const MaintenanaceRoutes = require("../controllers/Approval/UnderMaintenance")
// const FreePoolRoutes = require("../controllers/Approval/FreePool")
// const PurchaseOrderRoutes = require("../controllers/Approval/PurchaseOrder")
// const InvoiceApproveRoutes = require("../controllers/Approval/Invoice")
// const PaymentRoutes = require("../controllers/Approval/Payment")
// const BulkRoute = require("../controllers/Approval/bulk_upload")

// //po
// const PORoutes = require("../controllers/New_Asset/POMain")
// const CreatePORoutes = require("../controllers/CreatePO")
// const EditPORoutes = require("../controllers/New_Asset/Edit_PO")
// const InvoiceRoutes = require("../controllers/New_Asset/Upload_Invoice")
// const RecieptRoutes = require("../controllers/New_Asset/Upload_Reciept")
// const DepreciationRoutes = require("../controllers/New_Asset/AssetDepreciation")

// //bulk
// const BulkRoutes = require("../controllers/BulkUpload")
// const RoleRoutes = require("../controllers/RoleBase/RoleChangeController")

// const PurchaseOrderApprovalRoutes = require("../controllers/Approval/PurchaseOrder");

// const router = express.Router();
// // const upload = multer({ storage: multer.memoryStorage() });

// router.post("/login", login);

// // Asset Management Routes
// router.use("/assets", assetRoutes);
// router.use("/asset-list", AssetListRoutes);
// router.use("/assign-asset", AssignAssetRoutes);
// router.use("/maintenance", MaintenanceAssetRoutes);
// router.use("/free-pool", FreePoolAssetRoutes);

// // Approval Routes
// router.use("/approvals/assigned", AssignedRoutes);
// router.use("/approvals/maintenance", MaintenanaceRoutes);
// router.use("/approvals/free-pool", FreePoolRoutes);
// router.use("/approvals/purchase-order", PurchaseOrderRoutes);
// router.use("/approvals/invoice", InvoiceApproveRoutes);
// router.use("/approvals/payment", PaymentRoutes);
// router.use("/approvals/bulk", BulkRoute);

// // PO Routes
// router.use("/po", PORoutes);
// router.use("/create-po", CreatePORoutes);
// router.use("/edit-po", EditPORoutes);
// router.use("/invoice", InvoiceRoutes);
// router.use("/receipt", RecieptRoutes);
// router.use("/depreciation", DepreciationRoutes);

// // Bulk Routes
// router.use("/bulk", BulkRoutes);
// router.use("/roles", RoleRoutes);

// // Password Management Routes
// router.use("/forgot-password", ForgotRoutes);
// router.use("/reset-password", ResetRoutes);

// module.exports = router;
