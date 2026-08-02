import { Router } from "express";
import protect from "../middleware/authMiddleware.js";
import {
  getBillingMetricsHandler,
  updatePlanHandler,
  initiateTelebirrHandler,
  verifyTelebirrHandler,
  savePaymentMethodHandler,
  getInvoiceReceiptHandler,
} from "../controllers/billingControllers.js";

const router = Router();

router.use(protect as any);

router.get("/metrics", getBillingMetricsHandler as any);
router.post("/upgrade", updatePlanHandler as any);
router.post("/telebirr/initiate", initiateTelebirrHandler as any);
router.post("/telebirr/verify", verifyTelebirrHandler as any);
router.post("/payment-methods", savePaymentMethodHandler as any);
router.get("/invoices/:invoiceId/receipt", getInvoiceReceiptHandler as any);

export default router;
