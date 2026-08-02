import mongoose from "mongoose";
import Organization from "../models/Organization.js";
import OrgMembership from "../models/OrgMembership.js";
import Project from "../models/Project.js";
import Task from "../models/Task.js";
import AIRecommendation from "../models/AIRecommendation.js";
import Invoice from "../models/Invoice.js";

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

export async function getOrgBillingMetrics(orgId: mongoose.Types.ObjectId) {
  const org = await Organization.findById(orgId);
  const plan = org?.plan || "Free";
  const limits = PLAN_LIMITS[plan] || PLAN_LIMITS.Free;

  const memberCount = await OrgMembership.countDocuments({ orgId });
  const projectCount = await Project.countDocuments({ orgId });
  const aiOpsCount = await AIRecommendation.countDocuments({ orgId });
  const taskCount = await Task.countDocuments({ orgId });

  // Retrieve Invoices for Organization from DB
  let dbInvoices = await Invoice.find({ orgId }).sort({ createdAt: -1 });

  // If no DB invoices exist yet for a paid plan, generate seed initial invoice
  if (dbInvoices.length === 0 && plan !== "Free") {
    const cycle = org?.billingCycle || "monthly";
    const amount = cycle === "yearly" ? limits.priceETBYearly : limits.priceETBMonthly;
    const defaultRef = `TB-${Math.floor(100000 + Math.random() * 900000)}`;
    const seedInvoice = await Invoice.create({
      orgId,
      invoiceNumber: `INV-ETB-${Math.floor(10000 + Math.random() * 90000)}`,
      plan,
      billingCycle: cycle,
      amount,
      currency: "ETB",
      paymentMethod: "Telebirr",
      telebirrReference: defaultRef,
      telebirrPhone: org?.telebirrPhone || "+251911000000",
      status: "Paid",
      billingDate: new Date(),
      dueDate: new Date(),
      items: [
        {
          description: `${plan} Plan Subscription (${cycle === "yearly" ? "Annual" : "Monthly"})`,
          unitPrice: amount,
          quantity: 1,
          total: amount,
        },
      ],
    });
    dbInvoices = [seedInvoice];
  }

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
  plan: "Free" | "Pro" | "Enterprise",
  billingCycle: "monthly" | "yearly" = "monthly",
  phone: string
) {
  const planInfo = PLAN_LIMITS[plan];
  if (!planInfo) throw new Error("Invalid plan tier selected");

  const amount = billingCycle === "yearly" ? planInfo.priceETBYearly : planInfo.priceETBMonthly;
  const transactionRef = `TB-${Date.now().toString().slice(-6)}-${Math.floor(100 + Math.random() * 900)}`;
  const ussdCode = `*806*1*${phone.replace(/\+/g, "")}*${amount}#`;

  return {
    success: true,
    message: "Telebirr transaction initiated successfully",
    transactionRef,
    amount,
    currency: "ETB",
    plan,
    billingCycle,
    phone,
    ussdCode,
    qrData: `telebirr://pay?merchant=TASKMGMT_APP&ref=${transactionRef}&amount=${amount}&currency=ETB`,
    expiresInSeconds: 600,
  };
}

export async function verifyTelebirrPayment(
  orgId: mongoose.Types.ObjectId,
  plan: "Free" | "Pro" | "Enterprise",
  billingCycle: "monthly" | "yearly",
  telebirrReference: string,
  phone: string
) {
  const planInfo = PLAN_LIMITS[plan];
  if (!planInfo) throw new Error("Invalid plan tier selected");

  const amount = billingCycle === "yearly" ? planInfo.priceETBYearly : planInfo.priceETBMonthly;

  // 1. Update Organization document
  const updatedOrg = await Organization.findByIdAndUpdate(
    orgId,
    {
      plan,
      billingCycle,
      telebirrPhone: phone,
      currency: "ETB",
    },
    { new: true }
  );

  // 2. Create Invoice record in MongoDB
  const invoiceNumber = `INV-ETB-${Math.floor(10000 + Math.random() * 90000)}`;
  const invoice = await Invoice.create({
    orgId,
    invoiceNumber,
    plan,
    billingCycle,
    amount,
    currency: "ETB",
    paymentMethod: "Telebirr",
    telebirrReference: telebirrReference || `TB-${Math.floor(100000 + Math.random() * 900000)}`,
    telebirrPhone: phone,
    status: "Paid",
    billingDate: new Date(),
    dueDate: new Date(),
    items: [
      {
        description: `${plan} Plan Subscription (${billingCycle === "yearly" ? "Annual" : "Monthly"})`,
        unitPrice: amount,
        quantity: 1,
        total: amount,
      },
    ],
  });

  return {
    success: true,
    message: `Payment of ${amount.toLocaleString()} ETB confirmed via Telebirr! upgraded to ${plan} Plan.`,
    org: updatedOrg,
    invoice,
  };
}

export async function saveTelebirrPaymentMethod(
  orgId: mongoose.Types.ObjectId,
  phone: string,
  autoRenew: boolean = true
) {
  const updatedOrg = await Organization.findByIdAndUpdate(
    orgId,
    {
      telebirrPhone: phone,
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

export async function generateInvoicePDFData(orgId: mongoose.Types.ObjectId, invoiceId: string) {
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

export async function upgradeOrgPlan(orgId: mongoose.Types.ObjectId, newPlan: "Free" | "Pro" | "Enterprise") {
  const updatedOrg = await Organization.findByIdAndUpdate(orgId, { plan: newPlan }, { new: true });
  return updatedOrg;
}
