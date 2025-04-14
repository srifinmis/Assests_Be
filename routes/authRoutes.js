//routes/authRoutes.js
const express = require("express");
// const multer = require("multer"); // ✅ Import multer

const { login } = require("../controllers/authController");
const { forgotPassword, resetPassword } = require("../controllers/forgotpassword");

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

//po
// const { generatePreview, submitPurchaseOrder, getPOPreview, fetchassettype, fetchGSTRates } = require("../controllers/CreatePO"); // ✅ PO-related routes
const CreatePORoutes = require("../controllers/CreatePO")
const InvoiceRoutes = require("../controllers/New_Asset/Upload_Invoice")
const RecieptRoutes = require("../controllers/New_Asset/Upload_Reciept")

const router = express.Router();
// const upload = multer({ storage: multer.memoryStorage() });

router.post("/login", login);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);

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

router.use("/CreatePO", CreatePORoutes); 
router.use("/invoices", InvoiceRoutes); 
router.use("/reciept", RecieptRoutes); 

module.exports = router;
