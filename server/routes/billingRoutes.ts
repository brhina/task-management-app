import { Router } from "express";
import protect, { orgAdminOnly } from "../middleware/authMiddleware.js";
import {
  getBillingMetricsHandler,
  updatePlanHandler,
  initiateTelebirrHandler,
  verifyTelebirrHandler,
  getTelebirrStatusHandler,
  telebirrNotifyHandler,
  sandboxCompleteHandler,
  savePaymentMethodHandler,
  getInvoiceReceiptHandler,
} from "../controllers/billingControllers.js";

const router = Router();

// Provider callback — HMAC auth only (no JWT)
router.post("/telebirr/notify", telebirrNotifyHandler as any);

router.use(protect as any);
router.use(orgAdminOnly as any);

router.get("/metrics", getBillingMetricsHandler as any);
router.post("/upgrade", updatePlanHandler as any);
router.post("/telebirr/initiate", initiateTelebirrHandler as any);
router.post("/telebirr/verify", verifyTelebirrHandler as any);
router.get(
  "/telebirr/status/:merchantOrderId",
  getTelebirrStatusHandler as any
);
router.post("/telebirr/sandbox/complete", sandboxCompleteHandler as any);
router.post("/payment-methods", savePaymentMethodHandler as any);
router.get("/invoices/:invoiceId/receipt", getInvoiceReceiptHandler as any);

export default router;
