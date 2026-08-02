import { Response } from "express";
import mongoose from "mongoose";
import Organization from "../models/Organization.js";
import OrgMembership from "../models/OrgMembership.js";
import User from "../models/User.js";
import Invoice from "../models/Invoice.js";
import { AuthRequest } from "../middleware/authMiddleware.js";
import { slugify, shortRandomId } from "../utils/slugUtils.js";
import {
  applyWorkspaceTemplate,
  WORKSPACE_TEMPLATES,
} from "../services/workspaceTemplateService.js";
import { getWorkspaceTemplate } from "../constants/workspaceTemplates.js";
import { PLAN_LIMITS } from "../services/billingService.js";
import { auditAsync } from "../services/auditService.js";
import { ELEVATED_ROLES } from "../constants/permissions.js";

const elevatedRoleFilter = { $in: ELEVATED_ROLES };

function paramId(value: string | string[]): string {
  return Array.isArray(value) ? value[0] : value;
}

export const listWorkspaceTemplates = async (
  _req: AuthRequest,
  res: Response,
): Promise<void> => {
  res.status(200).json({
    message: "Workspace templates",
    data: WORKSPACE_TEMPLATES.map((t) => ({
      id: t.id,
      name: t.name,
      description: t.description,
      projectCount: t.projects.length,
      teamCount: t.teams.length,
      recommendedPlan: t.projects.length > 3 ? "Pro" : "Free",
    })),
  });
};

export const createOrg = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  try {
    const { name, plan = "Free", billingCycle = "monthly", telebirrPhone, templateId } = req.body;

    if (!name || !name.trim()) {
      res.status(400).json({ message: "Organization name is required" });
      return;
    }

    const validPlan = ["Free", "Pro", "Enterprise"].includes(plan) ? plan : "Free";
    const limits = PLAN_LIMITS[validPlan] || PLAN_LIMITS.Free;

    // Enforce 1 Free organization workspace limit per user
    if (validPlan === "Free") {
      const userFreeOrgCount = await Organization.countDocuments({
        createdBy: req.user._id,
        plan: "Free",
      });
      if (userFreeOrgCount >= 1) {
        res.status(403).json({
          message:
            "Limit reached: Accounts are limited to 1 Free organization workspace. Please upgrade to a Pro or Enterprise plan to create additional workspaces.",
          upgradeRequired: true,
          userFreeOrgCount,
        });
        return;
      }
    }

    // Check workspace template compatibility with plan limits
    if (templateId) {
      const templateSeed = getWorkspaceTemplate(templateId);
      if (templateSeed && templateSeed.projects.length > limits.maxProjects) {
        res.status(400).json({
          message: `Selected template '${templateSeed.name}' requires ${templateSeed.projects.length} projects, which exceeds your ${validPlan} plan limit of ${limits.maxProjects} projects. Please upgrade your subscription tier.`,
          upgradeRequired: true,
        });
        return;
      }
    }

    const baseSlug = slugify(name.trim()) || `org-${shortRandomId(6)}`;
    let slug = baseSlug;
    while (true) {
      const exists = await Organization.findOne({ slug }).select("_id");
      if (!exists) break;
      slug = `${baseSlug}-${shortRandomId(4)}`;
    }

    const org = await Organization.create({
      name: name.trim(),
      slug,
      plan: validPlan,
      billingCycle: ["monthly", "yearly"].includes(billingCycle) ? billingCycle : "monthly",
      telebirrPhone: telebirrPhone || "",
      createdBy: req.user._id,
    });

    await OrgMembership.create({
      orgId: org._id,
      userId: req.user._id,
      role: "OrgAdmin",
      status: "Active",
    });

    // Create initial invoice record for paid subscriptions
    if (validPlan !== "Free") {
      const amount = billingCycle === "yearly" ? limits.priceETBYearly : limits.priceETBMonthly;
      await Invoice.create({
        orgId: org._id,
        invoiceNumber: `INV-ETB-${Math.floor(10000 + Math.random() * 90000)}`,
        plan: validPlan,
        billingCycle: org.billingCycle,
        amount,
        currency: "ETB",
        paymentMethod: "Telebirr",
        telebirrReference: `TB-${Math.floor(100000 + Math.random() * 900000)}`,
        telebirrPhone: telebirrPhone || "+251911000000",
        status: "Paid",
        billingDate: new Date(),
        dueDate: new Date(),
        items: [
          {
            description: `${validPlan} Plan Workspace Subscription (${org.billingCycle === "yearly" ? "Annual" : "Monthly"})`,
            unitPrice: amount,
            quantity: 1,
            total: amount,
          },
        ],
      });
    }

    let appliedTemplate: string | null = null;
    if (templateId) {
      const template = await applyWorkspaceTemplate(
        org._id,
        req.user._id,
        templateId,
      );
      appliedTemplate = template?.id || null;
    }

    auditAsync(
      { ...req, orgId: org._id } as AuthRequest,
      "org.created",
      "Organization",
      org._id,
      { name: org.name, plan: org.plan, templateId: appliedTemplate },
    );

    res.status(201).json({
      _id: org._id,
      name: org.name,
      slug: org.slug,
      plan: org.plan,
      billingCycle: org.billingCycle,
      role: "OrgAdmin",
      templateId: appliedTemplate,
    });
  } catch (error: any) {
    console.error("Create org error:", error.message);
    res.status(500).json({ message: "Server error" });
  }
};

export const getOrgById = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  try {
    const { orgId } = req.params;

    const membership = await OrgMembership.findOne({
      orgId,
      userId: req.user._id,
      status: "Active",
    });
    if (!membership) {
      res.status(403).json({ message: "Not a member of this organization" });
      return;
    }

    const org = await Organization.findById(orgId);
    if (!org) {
      res.status(404).json({ message: "Organization not found" });
      return;
    }

    const memberCount = await OrgMembership.countDocuments({
      orgId,
      status: "Active",
    });

    res.status(200).json({
      _id: org._id,
      name: org.name,
      slug: org.slug,
      plan: org.plan,
      createdBy: org.createdBy,
      memberCount,
      createdAt: org.createdAt,
    });
  } catch (error: any) {
    console.error("Get org error:", error.message);
    res.status(500).json({ message: "Server error" });
  }
};

export const updateOrg = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  try {
    const { orgId } = req.params;
    const { name, plan } = req.body;

    const membership = await OrgMembership.findOne({
      orgId,
      userId: req.user._id,
      role: elevatedRoleFilter,
      status: "Active",
    });
    if (!membership) {
      res
        .status(403)
        .json({ message: "Only org admins can update organization" });
      return;
    }

    const org = await Organization.findById(orgId);
    if (!org) {
      res.status(404).json({ message: "Organization not found" });
      return;
    }

    if (name && name.trim() !== org.name) {
      org.name = name.trim();
      const baseSlug = slugify(name.trim()) || `org-${shortRandomId(6)}`;
      let slug = baseSlug;
      while (true) {
        const exists = await Organization.findOne({
          slug,
          _id: { $ne: org._id },
        }).select("_id");
        if (!exists) break;
        slug = `${baseSlug}-${shortRandomId(4)}`;
      }
      org.slug = slug;
    }

    if (plan) {
      org.plan = plan;
    }

    await org.save();
    auditAsync(req, "org.updated", "Organization", org._id, {
      name: org.name,
      plan: org.plan,
    });

    res.status(200).json({
      _id: org._id,
      name: org.name,
      slug: org.slug,
      plan: org.plan,
    });
  } catch (error: any) {
    console.error("Update org error:", error.message);
    res.status(500).json({ message: "Server error" });
  }
};

export const deleteOrg = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  try {
    const orgId = paramId(req.params.orgId);

    const membership = await OrgMembership.findOne({
      orgId,
      userId: req.user._id,
      role: elevatedRoleFilter,
      status: "Active",
    });
    if (!membership) {
      res
        .status(403)
        .json({ message: "Only org admins can delete organization" });
      return;
    }

    const memberCount = await OrgMembership.countDocuments({
      orgId,
      status: "Active",
    });
    if (memberCount > 1) {
      res
        .status(400)
        .json({
          message:
            "Cannot delete organization with more than 1 member. Remove all members first.",
        });
      return;
    }

    await OrgMembership.deleteMany({ orgId });
    await Organization.deleteOne({ _id: orgId });
    auditAsync(req, "org.deleted", "Organization", orgId, {});

    res.status(200).json({ message: "Organization deleted successfully" });
  } catch (error: any) {
    console.error("Delete org error:", error.message);
    res.status(500).json({ message: "Server error" });
  }
};

export const addMemberByEmail = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  try {
    const { orgId } = req.params;
    const { email, role = "OrgMember", customRoleId } = req.body;

    if (!email || !email.trim()) {
      res.status(400).json({ message: "Email is required" });
      return;
    }

    const adminMembership = await OrgMembership.findOne({
      orgId,
      userId: req.user._id,
      role: elevatedRoleFilter,
      status: "Active",
    });
    if (!adminMembership) {
      res.status(403).json({ message: "Only org admins can add members" });
      return;
    }

    if (role === "Owner") {
      res.status(400).json({
        message: "Use OrgAdmin for the owner role (full permissions)",
      });
      return;
    }

    const user = await User.findOne({ email: email.trim().toLowerCase() });
    if (!user) {
      res.status(404).json({ message: "User not found with this email" });
      return;
    }

    // Check organization subscription member limit
    const org = await Organization.findById(orgId);
    const plan = org?.plan || "Free";
    const limits = PLAN_LIMITS[plan] || PLAN_LIMITS.Free;
    const currentMemberCount = await OrgMembership.countDocuments({
      orgId,
      status: "Active",
    });

    if (currentMemberCount >= limits.maxMembers) {
      res.status(403).json({
        message: `Plan limit reached: Your organization is on the ${plan} plan which allows a maximum of ${limits.maxMembers} members. Upgrade your plan in Enterprise Settings to add more team members.`,
        upgradeRequired: true,
        currentMemberCount,
        maxMembers: limits.maxMembers,
      });
      return;
    }

    const resolvedRole = customRoleId ? "Custom" : role;
    const existingMembership = await OrgMembership.findOne({
      orgId,
      userId: user._id,
    });
    if (existingMembership) {
      if (existingMembership.status === "Active") {
        res
          .status(400)
          .json({ message: "User is already a member of this organization" });
        return;
      }
      existingMembership.status = "Active";
      existingMembership.role = resolvedRole;
      existingMembership.customRoleId = customRoleId || undefined;
      await existingMembership.save();
    } else {
      await OrgMembership.create({
        orgId,
        userId: user._id,
        role: resolvedRole,
        customRoleId: customRoleId || undefined,
        status: "Active",
      });
    }

    auditAsync(req, "member.added", "User", user._id, {
      email: user.email,
      role: resolvedRole,
      customRoleId,
    });

    res.status(200).json({
      message: "Member added successfully",
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        profileImageUrl: user.profileImageUrl,
      },
      role: resolvedRole,
      customRoleId: customRoleId || null,
    });
  } catch (error: any) {
    console.error("Add member error:", error.message);
    res.status(500).json({ message: "Server error" });
  }
};

export const checkUserExists = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  try {
    const email = req.params.email as string;

    if (!email) {
      res.status(400).json({ message: "Email is required" });
      return;
    }

    const user = await User.findOne({
      email: email.trim().toLowerCase(),
    }).select("_id name email profileImageUrl");

    if (!user) {
      res.status(200).json({ exists: false, user: null });
      return;
    }

    if (!req.orgId) {
      res.status(200).json({ exists: false, user: null });
      return;
    }

    const membership = await OrgMembership.findOne({
      orgId: req.orgId,
      userId: user._id,
      status: "Active",
    });

    res.status(200).json({
      exists: !!membership,
      user: membership ? user : null,
    });
  } catch (error: any) {
    console.error("Check user error:", error.message);
    res.status(500).json({ message: "Server error" });
  }
};
