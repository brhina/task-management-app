import { Response } from "express";
import { AuthRequest } from "../middleware/authMiddleware.js";
import {
  getOrgBillingMetrics,
  upgradeOrgPlan,
  initiateTelebirrPayment,
  verifyTelebirrPayment,
  saveTelebirrPaymentMethod,
  generateInvoicePDFData,
} from "../services/billingService.js";

export async function getBillingMetricsHandler(req: AuthRequest, res: Response): Promise<void> {
  try {
    const orgId = req.orgId;
    if (!orgId) {
      res.status(400).json({ message: "Organization ID required" });
      return;
    }
    const metrics = await getOrgBillingMetrics(orgId);
    res.status(200).json(metrics);
  } catch (error: any) {
    res.status(500).json({ message: error.message || "Failed to fetch billing metrics" });
  }
}

export async function updatePlanHandler(req: AuthRequest, res: Response): Promise<void> {
  try {
    const orgId = req.orgId;
    const { plan } = req.body;
    if (!orgId || !plan || !["Free", "Pro", "Enterprise"].includes(plan)) {
      res.status(400).json({ message: "Valid plan tier (Free, Pro, Enterprise) required" });
      return;
    }
    const updated = await upgradeOrgPlan(orgId, plan);
    res.status(200).json({ message: `Successfully updated organization plan to ${plan}`, org: updated });
  } catch (error: any) {
    res.status(500).json({ message: error.message || "Failed to update subscription plan" });
  }
}

export async function initiateTelebirrHandler(req: AuthRequest, res: Response): Promise<void> {
  try {
    const orgId = req.orgId;
    const { plan, billingCycle = "monthly", phone } = req.body;
    if (!orgId || !plan || !phone) {
      res.status(400).json({ message: "Plan, phone number, and organization ID are required" });
      return;
    }
    const result = await initiateTelebirrPayment(orgId, plan, billingCycle, phone);
    res.status(200).json(result);
  } catch (error: any) {
    res.status(500).json({ message: error.message || "Failed to initiate Telebirr payment" });
  }
}

export async function verifyTelebirrHandler(req: AuthRequest, res: Response): Promise<void> {
  try {
    const orgId = req.orgId;
    const { plan, billingCycle = "monthly", telebirrReference, phone } = req.body;
    if (!orgId || !plan || !phone) {
      res.status(400).json({ message: "Plan, phone number, and organization ID are required for Telebirr verification" });
      return;
    }
    const result = await verifyTelebirrPayment(orgId, plan, billingCycle, telebirrReference, phone);
    res.status(200).json(result);
  } catch (error: any) {
    res.status(500).json({ message: error.message || "Failed to verify Telebirr payment" });
  }
}

export async function savePaymentMethodHandler(req: AuthRequest, res: Response): Promise<void> {
  try {
    const orgId = req.orgId;
    const { phone, autoRenew } = req.body;
    if (!orgId || !phone) {
      res.status(400).json({ message: "Telebirr phone number required" });
      return;
    }
    const result = await saveTelebirrPaymentMethod(orgId, phone, autoRenew);
    res.status(200).json(result);
  } catch (error: any) {
    res.status(500).json({ message: error.message || "Failed to save Telebirr payment method" });
  }
}

export async function getInvoiceReceiptHandler(req: AuthRequest, res: Response): Promise<void> {
  try {
    const orgId = req.orgId;
    const invoiceId = Array.isArray(req.params.invoiceId) ? req.params.invoiceId[0] : req.params.invoiceId;
    if (!orgId || !invoiceId) {
      res.status(400).json({ message: "Invoice ID required" });
      return;
    }
    const receiptData = await generateInvoicePDFData(orgId, invoiceId);
    res.status(200).json(receiptData);
  } catch (error: any) {
    res.status(500).json({ message: error.message || "Failed to fetch invoice receipt" });
  }
}
