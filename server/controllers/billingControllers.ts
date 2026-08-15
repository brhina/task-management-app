import { Response } from "express";
import mongoose from "mongoose";
import { AuthRequest } from "../middleware/authMiddleware.js";
import {
  getOrgBillingMetrics,
  upgradeOrgPlan,
  initiateTelebirrPayment,
  handleTelebirrNotify,
  getPaymentStatus,
  completeSandboxPayment,
  saveTelebirrPaymentMethod,
  generateInvoicePDFData,
} from "../services/billingService.js";

export async function getBillingMetricsHandler(
  req: AuthRequest,
  res: Response
): Promise<void> {
  try {
    const orgId = req.orgId;
    if (!orgId) {
      res.status(400).json({ message: "Organization ID required" });
      return;
    }
    const metrics = await getOrgBillingMetrics(orgId);
    res.status(200).json(metrics);
  } catch (error: any) {
    res
      .status(500)
      .json({ message: error.message || "Failed to fetch billing metrics" });
  }
}

export async function updatePlanHandler(
  req: AuthRequest,
  res: Response
): Promise<void> {
  try {
    const orgId = req.orgId;
    const { plan } = req.body;
    if (!orgId || !plan || !["Free", "Pro", "Enterprise"].includes(plan)) {
      res
        .status(400)
        .json({ message: "Valid plan tier (Free, Pro, Enterprise) required" });
      return;
    }
    const updated = await upgradeOrgPlan(orgId, plan);
    res.status(200).json({
      message: `Successfully updated organization plan to ${plan}`,
      org: updated,
    });
  } catch (error: any) {
    const status = error.statusCode || 500;
    res
      .status(status)
      .json({ message: error.message || "Failed to update subscription plan" });
  }
}

export async function initiateTelebirrHandler(
  req: AuthRequest,
  res: Response
): Promise<void> {
  try {
    const orgId = req.orgId;
    const userId = req.user?._id;
    const { plan, billingCycle = "monthly", phone } = req.body;
    if (!orgId || !userId || !plan || !phone) {
      res.status(400).json({
        message: "Plan, phone number, and organization ID are required",
      });
      return;
    }
    const result = await initiateTelebirrPayment(
      orgId,
      new mongoose.Types.ObjectId(String(userId)),
      plan,
      billingCycle,
      phone
    );
    res.status(200).json(result);
  } catch (error: any) {
    const status = error.message?.includes("Invalid Ethiopian") ? 400 : 500;
    res
      .status(status)
      .json({ message: error.message || "Failed to initiate Telebirr payment" });
  }
}

/** @deprecated Client-trusted verify removed — use status poll + provider notify */
export async function verifyTelebirrHandler(
  _req: AuthRequest,
  res: Response
): Promise<void> {
  res.status(410).json({
    message:
      "Client-side payment verification is disabled. Complete payment via Telebirr; poll GET /api/billing/telebirr/status/:merchantOrderId.",
  });
}

export async function getTelebirrStatusHandler(
  req: AuthRequest,
  res: Response
): Promise<void> {
  try {
    const orgId = req.orgId;
    const merchantOrderId = Array.isArray(req.params.merchantOrderId)
      ? req.params.merchantOrderId[0]
      : req.params.merchantOrderId;
    if (!orgId || !merchantOrderId) {
      res
        .status(400)
        .json({ message: "Organization ID and merchant order ID required" });
      return;
    }
    const result = await getPaymentStatus(orgId, merchantOrderId);
    res.status(200).json(result);
  } catch (error: any) {
    const status = error.message?.includes("not found") ? 404 : 500;
    res
      .status(status)
      .json({ message: error.message || "Failed to fetch payment status" });
  }
}

export async function telebirrNotifyHandler(
  req: AuthRequest | any,
  res: Response
): Promise<void> {
  try {
    const signature =
      (req.headers["x-telebirr-signature"] as string) ||
      (req.headers["x-signature"] as string) ||
      req.body?.signature;
    const payload = {
      merchantOrderId: String(
        req.body?.merchantOrderId || req.body?.outTradeNo || ""
      ),
      amount: Number(req.body?.amount ?? req.body?.totalAmount),
      status: (req.body?.status === "Failed" ? "Failed" : "Paid") as
        | "Paid"
        | "Failed",
      providerRef: req.body?.providerRef || req.body?.tradeNo,
      phone: req.body?.phone || req.body?.msisdn,
    };
    const result = await handleTelebirrNotify(payload, signature);
    res.status(200).json({
      success: result.success,
      message: result.message,
      alreadyProcessed: result.alreadyProcessed || false,
    });
  } catch (error: any) {
    const status = error.statusCode || 500;
    res
      .status(status)
      .json({ message: error.message || "Failed to process Telebirr notify" });
  }
}

export async function sandboxCompleteHandler(
  req: AuthRequest,
  res: Response
): Promise<void> {
  try {
    const orgId = req.orgId;
    const { merchantOrderId } = req.body;
    if (!orgId || !merchantOrderId) {
      res
        .status(400)
        .json({ message: "merchantOrderId and organization ID required" });
      return;
    }
    const result = await completeSandboxPayment(orgId, merchantOrderId);
    res.status(200).json(result);
  } catch (error: any) {
    const status = error.statusCode || 500;
    res
      .status(status)
      .json({ message: error.message || "Failed to complete sandbox payment" });
  }
}

export async function savePaymentMethodHandler(
  req: AuthRequest,
  res: Response
): Promise<void> {
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
    const status = error.message?.includes("Invalid Ethiopian") ? 400 : 500;
    res.status(status).json({
      message: error.message || "Failed to save Telebirr payment method",
    });
  }
}

export async function getInvoiceReceiptHandler(
  req: AuthRequest,
  res: Response
): Promise<void> {
  try {
    const orgId = req.orgId;
    const invoiceId = Array.isArray(req.params.invoiceId)
      ? req.params.invoiceId[0]
      : req.params.invoiceId;
    if (!orgId || !invoiceId) {
      res.status(400).json({ message: "Invoice ID required" });
      return;
    }
    const receiptData = await generateInvoicePDFData(orgId, invoiceId);
    res.status(200).json(receiptData);
  } catch (error: any) {
    res
      .status(500)
      .json({ message: error.message || "Failed to fetch invoice receipt" });
  }
}
