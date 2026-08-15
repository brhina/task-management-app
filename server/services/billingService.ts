import crypto from "crypto";
import mongoose from "mongoose";
import Organization from "../models/Organization.js";
import OrgMembership from "../models/OrgMembership.js";
import Project from "../models/Project.js";
import Task from "../models/Task.js";
import AIRecommendation from "../models/AIRecommendation.js";
import Invoice from "../models/Invoice.js";
import PaymentTransaction, {
  PaymentBillingCycle,
  PaymentPlan,
} from "../models/PaymentTransaction.js";
import {
  buildNotifyUrl,
  createTelebirrOrder,
  getTelebirrMode,
  isSandboxMode,
  normalizeEthiopianPhone,
  signNotify,
  TelebirrNotifyPayload,
  verifyNotifySignature,
} from "./telebirrProvider.js";

export const PLAN_LIMITS: Record<string, any> = {
  Free: {
    maxMembers: 5,
    maxProjects: 3,
    maxAIOperations: 50,
    storageMB: 500,
    priceETBMonthly: 0,
    priceETBYearly: 0,
    features: [
      "5 Team Members",
      "3 Active Projects",
      "50 AI Ops/mo",
      "Basic Task Board",
      "Telebirr Express Pay Supported",
    ],
  },
  Pro: {
    maxMembers: 25,
    maxProjects: 20,
    maxAIOperations: 1000,
    storageMB: 5000,
    priceETBMonthly: 2500,
    priceETBYearly: 24000,
    features: [
      "25 Team Members",
      "20 Active Projects",
      "1,000 AI Ops/mo",
      "Gantt Charts & API Keys",
      "Telebirr Direct & USSD Pay",
      "Automated ETB Invoicing",
    ],
  },
  Enterprise: {
    maxMembers: 9999,
    maxProjects: 9999,
    maxAIOperations: 50000,
    storageMB: 500000,
    priceETBMonthly: 15000,
    priceETBYearly: 144000,
    features: [
      "Unlimited Members & Projects",
      "50,000 AI Ops/mo",
      "SSO/SAML 2.0 & Custom Branding",
      "GDPR Export & IP Allowlisting",
      "Dedicated Telebirr Account Manager",
      "Priority SLA Support",
    ],
  },
};

const PAYMENT_TTL_MS = 10 * 60 * 1000;

function assertPaidPlan(plan: string): asserts plan is PaymentPlan {
  if (plan !== "Pro" && plan !== "Enterprise") {
    throw new Error("Only Pro or Enterprise plans require Telebirr payment");
  }
}

function periodEndFromNow(billingCycle: PaymentBillingCycle): Date {
  const end = new Date();
  if (billingCycle === "yearly") {
    end.setFullYear(end.getFullYear() + 1);
  } else {
    end.setMonth(end.getMonth() + 1);
  }
  return end;
}

function newMerchantOrderId(): string {
  return `ORD-${Date.now().toString(36).toUpperCase()}-${crypto
    .randomBytes(4)
    .toString("hex")
    .toUpperCase()}`;
}

function newInvoiceNumber(): string {
  return `INV-ETB-${Date.now().toString(36).toUpperCase()}-${crypto
    .randomBytes(2)
    .toString("hex")
    .toUpperCase()}`;
}

export async function getOrgBillingMetrics(orgId: mongoose.Types.ObjectId) {
  const org = await Organization.findById(orgId);
  const plan = org?.plan || "Free";
  const limits = PLAN_LIMITS[plan] || PLAN_LIMITS.Free;

  const memberCount = await OrgMembership.countDocuments({ orgId });
  const projectCount = await Project.countDocuments({ orgId });
  const aiOpsCount = await AIRecommendation.countDocuments({ orgId });
  const taskCount = await Task.countDocuments({ orgId });

  const dbInvoices = await Invoice.find({ orgId }).sort({ createdAt: -1 });

  const formattedInvoices = dbInvoices.map((inv) => ({
    id: inv.invoiceNumber,
    date: new Date(inv.billingDate).toISOString().split("T")[0],
    amount: `${inv.amount.toLocaleString()} ETB`,
    rawAmount: inv.amount,
    currency: inv.currency || "ETB",
    plan: inv.plan,
    billingCycle: inv.billingCycle,
    paymentMethod: inv.paymentMethod,
    telebirrReference: inv.telebirrReference || "N/A",
    telebirrPhone: inv.telebirrPhone || "",
    status: inv.status,
  }));

  return {
    plan,
    billingCycle: org?.billingCycle || "monthly",
    currency: "ETB",
    currencySymbol: "ETB",
    subscriptionStatus: org?.subscriptionStatus || "none",
    currentPeriodStart: org?.currentPeriodStart || null,
    currentPeriodEnd: org?.currentPeriodEnd || null,
    telebirrMode: getTelebirrMode(),
    telebirrPaymentMethod: {
      phone: org?.telebirrPhone || "",
      autoRenew: org?.telebirrAutoRenew ?? true,
      provider: "Ethio Telecom - Telebirr",
    },
    limits,
    usage: {
      members: memberCount,
      projects: projectCount,
      aiOps: aiOpsCount,
      tasks: taskCount,
      estimatedStorageMB: Math.round(taskCount * 0.2 + projectCount * 0.5),
    },
    invoices: formattedInvoices,
  };
}

export async function initiateTelebirrPayment(
  orgId: mongoose.Types.ObjectId,
  userId: mongoose.Types.ObjectId,
  plan: "Free" | "Pro" | "Enterprise",
  billingCycle: "monthly" | "yearly" = "monthly",
  phone: string
) {
  assertPaidPlan(plan);
  const cycle: PaymentBillingCycle =
    billingCycle === "yearly" ? "yearly" : "monthly";
  const planInfo = PLAN_LIMITS[plan];
  const amount =
    cycle === "yearly" ? planInfo.priceETBYearly : planInfo.priceETBMonthly;
  if (!amount || amount <= 0) {
    throw new Error("Invalid plan amount");
  }

  const normalizedPhone = normalizeEthiopianPhone(phone);
  const merchantOrderId = newMerchantOrderId();
  const expiresAt = new Date(Date.now() + PAYMENT_TTL_MS);

  const invoice = await Invoice.create({
    orgId,
    invoiceNumber: newInvoiceNumber(),
    plan,
    billingCycle: cycle,
    amount,
    currency: "ETB",
    paymentMethod: "Telebirr",
    telebirrPhone: normalizedPhone,
    status: "Pending",
    billingDate: new Date(),
    dueDate: expiresAt,
    items: [
      {
        description: `${plan} Plan Subscription (${cycle === "yearly" ? "Annual" : "Monthly"})`,
        unitPrice: amount,
        quantity: 1,
        total: amount,
      },
    ],
  });

  const order = await createTelebirrOrder({
    merchantOrderId,
    amount,
    currency: "ETB",
    phone: normalizedPhone,
    plan,
    billingCycle: cycle,
    notifyUrl: buildNotifyUrl(),
    title: `${plan} ${cycle} subscription`,
  });

  const txn = await PaymentTransaction.create({
    orgId,
    initiatedBy: userId,
    plan,
    billingCycle: cycle,
    amount,
    currency: "ETB",
    phone: normalizedPhone,
    merchantOrderId,
    providerRef: order.providerRef,
    status: "Pending",
    invoiceId: invoice._id,
    expiresAt,
    providerPayload: order.raw,
    idempotencyKey: merchantOrderId,
  });

  await Invoice.findByIdAndUpdate(invoice._id, {
    paymentTransactionId: txn._id,
    telebirrReference: order.providerRef,
  });

  return {
    success: true,
    message: "Telebirr payment initiated. Complete payment to activate your plan.",
    merchantOrderId,
    transactionRef: order.providerRef,
    amount,
    currency: "ETB",
    plan,
    billingCycle: cycle,
    phone: normalizedPhone,
    ussdCode: order.ussdCode,
    qrData: order.qrData,
    paymentUrl: order.paymentUrl,
    expiresInSeconds: Math.floor(PAYMENT_TTL_MS / 1000),
    mode: order.mode,
    invoiceNumber: invoice.invoiceNumber,
  };
}

/**
 * Single activation path: only Pending → Paid activates the org plan.
 * Idempotent for already-Paid transactions.
 */
export async function confirmPaymentFromProvider(
  merchantOrderId: string,
  opts: {
    amount: number;
    status: "Paid" | "Failed";
    providerRef?: string;
    phone?: string;
  }
) {
  const txn = await PaymentTransaction.findOne({ merchantOrderId });
  if (!txn) {
    throw new Error("Payment transaction not found");
  }

  if (txn.status === "Paid") {
    const invoice = txn.invoiceId
      ? await Invoice.findById(txn.invoiceId)
      : null;
    const org = await Organization.findById(txn.orgId);
    return {
      success: true,
      alreadyProcessed: true,
      message: "Payment already confirmed",
      org,
      invoice,
      transaction: txn,
    };
  }

  if (txn.status === "Expired" || txn.status === "Failed") {
    throw new Error(`Cannot confirm payment in status ${txn.status}`);
  }

  if (txn.expiresAt.getTime() < Date.now() && opts.status === "Paid") {
    txn.status = "Expired";
    await txn.save();
    if (txn.invoiceId) {
      await Invoice.findByIdAndUpdate(txn.invoiceId, { status: "Failed" });
    }
    throw new Error("Payment session expired");
  }

  if (Number(opts.amount) !== Number(txn.amount)) {
    throw new Error("Payment amount mismatch");
  }

  if (opts.status === "Failed") {
    txn.status = "Failed";
    await txn.save();
    if (txn.invoiceId) {
      await Invoice.findByIdAndUpdate(txn.invoiceId, { status: "Failed" });
    }
    return {
      success: false,
      message: "Payment failed",
      transaction: txn,
    };
  }

  const now = new Date();
  const periodEnd = periodEndFromNow(txn.billingCycle);

  const updatedOrg = await Organization.findByIdAndUpdate(
    txn.orgId,
    {
      $set: {
        plan: txn.plan,
        billingCycle: txn.billingCycle,
        telebirrPhone: opts.phone || txn.phone,
        currency: "ETB",
        subscriptionStatus: "active",
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
      },
      $unset: { pendingPlan: 1 },
    },
    { new: true }
  );

  txn.status = "Paid";
  txn.paidAt = now;
  if (opts.providerRef) {
    txn.providerRef = opts.providerRef;
  }
  await txn.save();

  let invoice = null;
  if (txn.invoiceId) {
    invoice = await Invoice.findByIdAndUpdate(
      txn.invoiceId,
      {
        status: "Paid",
        telebirrReference: txn.providerRef || opts.providerRef || "",
        telebirrPhone: opts.phone || txn.phone,
        billingDate: now,
      },
      { new: true }
    );
  }

  return {
    success: true,
    alreadyProcessed: false,
    message: `Payment of ${txn.amount.toLocaleString()} ETB confirmed. Upgraded to ${txn.plan}.`,
    org: updatedOrg,
    invoice,
    transaction: txn,
  };
}

export async function handleTelebirrNotify(
  payload: TelebirrNotifyPayload,
  signature: string | undefined
) {
  if (!verifyNotifySignature(payload, signature)) {
    const err = new Error("Invalid Telebirr notify signature");
    (err as any).statusCode = 401;
    throw err;
  }

  if (!payload.merchantOrderId || payload.amount == null || !payload.status) {
    const err = new Error("Invalid notify payload");
    (err as any).statusCode = 400;
    throw err;
  }

  return confirmPaymentFromProvider(payload.merchantOrderId, {
    amount: Number(payload.amount),
    status: payload.status,
    providerRef: payload.providerRef,
    phone: payload.phone,
  });
}

export async function getPaymentStatus(
  orgId: mongoose.Types.ObjectId,
  merchantOrderId: string
) {
  const txn = await PaymentTransaction.findOne({ merchantOrderId, orgId });
  if (!txn) {
    throw new Error("Payment transaction not found");
  }

  if (txn.status === "Pending" && txn.expiresAt.getTime() < Date.now()) {
    txn.status = "Expired";
    await txn.save();
    if (txn.invoiceId) {
      await Invoice.findByIdAndUpdate(txn.invoiceId, { status: "Failed" });
    }
  }

  const invoice = txn.invoiceId ? await Invoice.findById(txn.invoiceId) : null;
  const org = await Organization.findById(orgId).select(
    "plan billingCycle subscriptionStatus currentPeriodStart currentPeriodEnd telebirrPhone"
  );

  return {
    merchantOrderId: txn.merchantOrderId,
    transactionRef: txn.providerRef,
    status: txn.status,
    plan: txn.plan,
    billingCycle: txn.billingCycle,
    amount: txn.amount,
    currency: txn.currency,
    phone: txn.phone,
    expiresAt: txn.expiresAt,
    paidAt: txn.paidAt,
    mode: getTelebirrMode(),
    invoice: invoice
      ? {
          invoiceNumber: invoice.invoiceNumber,
          status: invoice.status,
          telebirrReference: invoice.telebirrReference,
          amount: invoice.amount,
        }
      : null,
    org: org
      ? {
          plan: org.plan,
          billingCycle: org.billingCycle,
          subscriptionStatus: org.subscriptionStatus,
          currentPeriodStart: org.currentPeriodStart,
          currentPeriodEnd: org.currentPeriodEnd,
        }
      : null,
  };
}

/**
 * Sandbox-only: org admin completes payment by having the server
 * issue a signed notify against itself (never trusts unsigned client claims).
 */
export async function completeSandboxPayment(
  orgId: mongoose.Types.ObjectId,
  merchantOrderId: string
) {
  if (!isSandboxMode()) {
    const err = new Error("Sandbox complete is only available when TELEBIRR_MODE=sandbox");
    (err as any).statusCode = 403;
    throw err;
  }

  const txn = await PaymentTransaction.findOne({ merchantOrderId, orgId });
  if (!txn) {
    throw new Error("Payment transaction not found");
  }
  if (txn.status !== "Pending") {
    return getPaymentStatus(orgId, merchantOrderId);
  }

  const payload: TelebirrNotifyPayload = {
    merchantOrderId: txn.merchantOrderId,
    amount: txn.amount,
    status: "Paid",
    providerRef: txn.providerRef,
    phone: txn.phone,
  };
  const signature = signNotify(payload);
  const result = await handleTelebirrNotify(payload, signature);
  const statusPayload = await getPaymentStatus(orgId, merchantOrderId);
  return {
    ...result,
    ...statusPayload,
    success: true,
    status: statusPayload.status,
  };
}

export async function saveTelebirrPaymentMethod(
  orgId: mongoose.Types.ObjectId,
  phone: string,
  autoRenew: boolean = true
) {
  const normalizedPhone = normalizeEthiopianPhone(phone);
  const updatedOrg = await Organization.findByIdAndUpdate(
    orgId,
    {
      telebirrPhone: normalizedPhone,
      telebirrAutoRenew: autoRenew,
    },
    { new: true }
  );
  return {
    success: true,
    message: "Telebirr payment method updated successfully",
    telebirrPhone: updatedOrg?.telebirrPhone,
    telebirrAutoRenew: updatedOrg?.telebirrAutoRenew,
  };
}

export async function generateInvoicePDFData(
  orgId: mongoose.Types.ObjectId,
  invoiceId: string
) {
  const invoice = await Invoice.findOne({ invoiceNumber: invoiceId, orgId });
  if (!invoice) {
    throw new Error("Invoice not found");
  }
  const org = await Organization.findById(orgId);

  return {
    invoiceNumber: invoice.invoiceNumber,
    organizationName: org?.name || "Organization",
    billingDate: new Date(invoice.billingDate).toLocaleDateString(),
    dueDate: new Date(invoice.dueDate).toLocaleDateString(),
    plan: invoice.plan,
    billingCycle: invoice.billingCycle,
    amountETB: invoice.amount,
    formattedAmount: `${invoice.amount.toLocaleString()} ETB`,
    paymentMethod: "Ethio Telecom Telebirr",
    telebirrReference: invoice.telebirrReference || "N/A",
    telebirrPhone: invoice.telebirrPhone || org?.telebirrPhone || "N/A",
    status: invoice.status,
    items: invoice.items,
  };
}

/** Paid upgrades must go through Telebirr. Only Free (downgrade) is allowed here. */
export async function upgradeOrgPlan(
  orgId: mongoose.Types.ObjectId,
  newPlan: "Free" | "Pro" | "Enterprise"
) {
  if (newPlan !== "Free") {
    const err = new Error(
      "Paid plan changes require a verified Telebirr payment. Use /api/billing/telebirr/initiate."
    );
    (err as any).statusCode = 402;
    throw err;
  }
  return downgradeToFree(orgId);
}

export async function downgradeToFree(orgId: mongoose.Types.ObjectId) {
  const updatedOrg = await Organization.findByIdAndUpdate(
    orgId,
    {
      $set: {
        plan: "Free",
        subscriptionStatus: "canceled",
      },
      $unset: {
        currentPeriodStart: 1,
        currentPeriodEnd: 1,
        pendingPlan: 1,
      },
    },
    { new: true }
  );
  return updatedOrg;
}
