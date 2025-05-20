//routes/authRoutes.js
const express = require("express");
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
const CreatePORoutes = require("../controllers/CreatePO")
const InvoiceRoutes = require("../controllers/New_Asset/Upload_Invoice")
const RecieptRoutes = require("../controllers/New_Asset/Upload_Reciept")
const DepreciationRoutes = require("../controllers/New_Asset/AssetDepreciation")

//bulk
const BulkRoutes = require("../controllers/BulkUpload")
const RoleRoutes = require("../controllers/RoleBase/RoleChangeController")

const PurchaseOrderApprovalRoutes = require("../controllers/Approval/PurchaseOrder");

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

router.use("/CreatePO", CreatePORoutes);
router.use("/approval/purchaseorder", PurchaseOrderApprovalRoutes);
router.use("/invoices", InvoiceRoutes); 
router.use("/reciept", RecieptRoutes); 
router.use("/depreciation", DepreciationRoutes); 

router.use("/bulk", BulkRoutes); 
router.use("/role", RoleRoutes); 

module.exports = router;
