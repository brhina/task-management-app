import mongoose from "mongoose";
import Organization from "../models/Organization.js";
import OrgMembership from "../models/OrgMembership.js";
import Project from "../models/Project.js";
import Task from "../models/Task.js";
import AIRecommendation from "../models/AIRecommendation.js";

export const PLAN_LIMITS = {
  Free: {
    maxMembers: 5,
    maxProjects: 3,
    maxAIOperations: 50,
    storageMB: 500,
    features: ["Basic Task Board", "Single Team"],
  },
  Pro: {
    maxMembers: 25,
    maxProjects: 20,
    maxAIOperations: 1000,
    storageMB: 5000,
    features: ["Advanced WorkOS", "Gantt Charts", "API Keys", "iCal Feeds"],
  },
  Enterprise: {
    maxMembers: 9999,
    maxProjects: 9999,
    maxAIOperations: 50000,
    storageMB: 500000,
    features: ["SSO & SAML", "Custom Branding", "GDPR Compliance Export", "IP Allowlisting", "Unlimited AI"],
  },
};

export async function getOrgBillingMetrics(orgId: mongoose.Types.ObjectId) {
  const org = await Organization.findById(orgId);
  const plan = org?.plan || "Free";
  const limits = PLAN_LIMITS[plan];

  const memberCount = await OrgMembership.countDocuments({ orgId });
  const projectCount = await Project.countDocuments({ orgId });
  const aiOpsCount = await AIRecommendation.countDocuments({ orgId });
  const taskCount = await Task.countDocuments({ orgId });

  return {
    plan,
    limits,
    usage: {
      members: memberCount,
      projects: projectCount,
      aiOps: aiOpsCount,
      tasks: taskCount,
      estimatedStorageMB: Math.round(taskCount * 0.2 + projectCount * 0.5),
    },
    invoices: [
      { id: "inv_10928", date: "2026-07-01", amount: plan === "Enterprise" ? "$299.00" : plan === "Pro" ? "$49.00" : "$0.00", status: "Paid" },
      { id: "inv_10811", date: "2026-06-01", amount: plan === "Enterprise" ? "$299.00" : plan === "Pro" ? "$49.00" : "$0.00", status: "Paid" },
    ],
  };
}

export async function upgradeOrgPlan(orgId: mongoose.Types.ObjectId, newPlan: "Free" | "Pro" | "Enterprise") {
  const updatedOrg = await Organization.findByIdAndUpdate(orgId, { plan: newPlan }, { new: true });
  return updatedOrg;
}
