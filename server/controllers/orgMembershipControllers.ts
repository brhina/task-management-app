import { Response } from "express";
import OrgMembership from "../models/OrgMembership.js";
import Invite from "../models/Invite.js";
import CustomRole from "../models/CustomRole.js";
import { AuthRequest } from "../middleware/authMiddleware.js";
import { shortRandomId } from "../utils/slugUtils.js";
import {
  ELEVATED_ROLES,
  SYSTEM_ROLES,
  isSystemRole,
  isOrgOwnerRole,
} from "../constants/permissions.js";
import { auditAsync } from "../services/auditService.js";

const elevatedRoleFilter = { $in: ELEVATED_ROLES };

function paramId(value: string | string[]): string {
  return Array.isArray(value) ? value[0] : value;
}

async function requireElevatedAdmin(
  req: AuthRequest,
  orgId: string,
  res: Response,
): Promise<boolean> {
  const canManage =
    (req.orgId &&
      String(req.orgId) === String(orgId) &&
      (req.permissions?.includes("member:manage") ||
        ELEVATED_ROLES.includes(req.membershipRole as any))) ||
    false;

  if (canManage) return true;

  const membership = await OrgMembership.findOne({
    orgId,
    userId: req.user._id,
    role: elevatedRoleFilter,
    status: "Active",
  });
  if (!membership) {
    res.status(403).json({
      message: "Only org admins can perform this action",
    });
    return false;
  }
  return true;
}

export const getMyOrgs = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  try {
    const memberships = await OrgMembership.find({
      userId: req.user._id,
      status: "Active",
    })
      .populate("orgId", "name slug plan")
      .populate("customRoleId", "name permissions")
      .sort({ createdAt: 1 });

    const orgs = memberships.map((m) => ({
      _id: (m.orgId as any)._id,
      name: (m.orgId as any).name,
      slug: (m.orgId as any).slug,
      plan: (m.orgId as any).plan,
      membershipId: m._id,
      role: m.role,
      customRoleId: m.customRoleId
        ? (m.customRoleId as any)._id || m.customRoleId
        : null,
      customRoleName: (m.customRoleId as any)?.name || null,
      capacityHoursPerWeek: m.capacityHoursPerWeek,
      joinedAt: m.createdAt,
    }));

    res.status(200).json(orgs);
  } catch (error: any) {
    console.error("Get my orgs error:", error.message);
    res.status(500).json({ message: "Server error" });
  }
};

export const leaveOrg = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  try {
    const { orgId: orgIdParam } = req.params;
    const orgId = paramId(orgIdParam);

    const membership = await OrgMembership.findOne({
      orgId,
      userId: req.user._id,
      status: "Active",
    });
    if (!membership) {
      res
        .status(404)
        .json({ message: "You are not a member of this organization" });
      return;
    }

    const orgMemberCount = await OrgMembership.countDocuments({
      orgId,
      status: "Active",
    });
    if (orgMemberCount <= 1) {
      res.status(400).json({
        message:
          "Cannot leave organization as the last member. Delete the organization instead.",
      });
      return;
    }

    if (isOrgOwnerRole(membership.role)) {
      const ownerCount = await OrgMembership.countDocuments({
        orgId,
        role: elevatedRoleFilter,
        status: "Active",
      });
      if (ownerCount <= 1) {
        res.status(400).json({
          message:
            "Cannot leave as the last owner. Transfer ownership first.",
        });
        return;
      }
    }

    await OrgMembership.deleteOne({ _id: membership._id });
    auditAsync(req, "member.left", "Organization", orgId, {});

    res.status(200).json({ message: "Successfully left the organization" });
  } catch (error: any) {
    console.error("Leave org error:", error.message);
    res.status(500).json({ message: "Server error" });
  }
};

export const generateInviteToken = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  try {
    const { orgId: orgIdParam } = req.params;
    const orgId = paramId(orgIdParam);
    const { email, role = "OrgMember", customRoleId } = req.body;

    const ok = await requireElevatedAdmin(req, orgId, res);
    if (!ok) return;

    if (role === "Owner") {
      res.status(400).json({
        message: "Use OrgAdmin for the owner role (full permissions)",
      });
      return;
    }

    let resolvedRole = role;
    if (customRoleId) {
      const custom = await CustomRole.findOne({
        _id: customRoleId,
        orgId,
      });
      if (!custom) {
        res.status(400).json({ message: "Custom role not found" });
        return;
      }
      resolvedRole = "Custom";
    } else if (!isSystemRole(role) && role !== "Custom") {
      res.status(400).json({
        message: `Invalid role. Allowed: ${SYSTEM_ROLES.join(", ")}`,
      });
      return;
    }

    const token = `inv_${shortRandomId(12)}`;
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const invite = await Invite.create({
      orgId,
      email,
      token,
      role: resolvedRole,
      customRoleId: customRoleId || undefined,
      expiresAt,
      createdBy: req.user._id,
    });

    auditAsync(req, "member.invited", "Invite", invite._id, {
      email,
      role: resolvedRole,
    });

    res
      .status(201)
      .json({ inviteToken: token, expiresAt, inviteId: invite._id });
  } catch (error: any) {
    console.error("Generate invite token error:", error.message);
    res.status(500).json({ message: "Server error" });
  }
};

export const joinOrgByInvite = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  try {
    const { inviteToken } = req.body;

    const invite = await Invite.findOne({
      token: inviteToken,
      expiresAt: { $gt: new Date() },
    });

    if (!invite) {
      res.status(400).json({ message: "Invalid or expired invite token" });
      return;
    }

    if (
      invite.email &&
      req.user.email?.toLowerCase() !== invite.email.toLowerCase()
    ) {
      res.status(403).json({
        message: "This invite is restricted to a different email address",
      });
      return;
    }

    const existingMembership = await OrgMembership.findOne({
      orgId: invite.orgId,
      userId: req.user._id,
    });

    if (existingMembership) {
      existingMembership.status = "Active";
      existingMembership.role = invite.role;
      existingMembership.customRoleId = invite.customRoleId;
      await existingMembership.save();
    } else {
      await OrgMembership.create({
        orgId: invite.orgId,
        userId: req.user._id,
        role: invite.role,
        customRoleId: invite.customRoleId,
        status: "Active",
      });
    }

    await Invite.deleteOne({ _id: invite._id });
    auditAsync(
      { ...req, orgId: invite.orgId } as AuthRequest,
      "member.joined",
      "Organization",
      invite.orgId,
      { role: invite.role },
    );

    res.status(200).json({
      message: "Successfully joined organization",
      orgId: invite.orgId,
      role: invite.role,
    });
  } catch (error: any) {
    console.error("Join org by invite error:", error.message);
    res.status(500).json({ message: "Server error" });
  }
};

export const getOrgMembers = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  try {
    const { orgId: orgIdParam } = req.params;
    const orgId = paramId(orgIdParam);

    const membership = await OrgMembership.findOne({
      orgId,
      userId: req.user._id,
      status: "Active",
    });
    if (!membership) {
      res.status(403).json({ message: "Not a member of this organization" });
      return;
    }

    const members = await OrgMembership.find({
      orgId,
      status: "Active",
    })
      .populate("userId", "name email profileImageUrl")
      .populate("customRoleId", "name permissions");

    res.status(200).json(members);
  } catch (error: any) {
    console.error("Get org members error:", error.message);
    res.status(500).json({ message: "Server error" });
  }
};

export const updateMemberRole = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  try {
    const { orgId: orgIdParam, memberId: memberIdParam } = req.params;
    const orgId = paramId(orgIdParam);
    const memberId = paramId(memberIdParam);
    const { role, customRoleId } = req.body;

    const ok = await requireElevatedAdmin(req, orgId, res);
    if (!ok) return;

    const membership = await OrgMembership.findOne({ _id: memberId, orgId });
    if (!membership) {
      res.status(404).json({ message: "Membership not found" });
      return;
    }

    if (isOrgOwnerRole(membership.role) && !isOrgOwnerRole(role) && !customRoleId) {
      const ownerCount = await OrgMembership.countDocuments({
        orgId,
        role: elevatedRoleFilter,
        status: "Active",
      });
      if (ownerCount <= 1) {
        res.status(400).json({
          message: "Cannot demote the last owner. Transfer ownership first.",
        });
        return;
      }
    }

    if (customRoleId) {
      const custom = await CustomRole.findOne({ _id: customRoleId, orgId });
      if (!custom) {
        res.status(400).json({ message: "Custom role not found" });
        return;
      }
      membership.role = "Custom";
      membership.customRoleId = customRoleId;
    } else {
      // Normalize legacy Owner alias → OrgAdmin (the owner role)
      const normalizedRole = role === "Owner" ? "OrgAdmin" : role;
      if (normalizedRole === "OrgAdmin" && !isOrgOwnerRole(req.membershipRole)) {
        res.status(403).json({
          message: "Only an org owner can assign the owner (OrgAdmin) role",
        });
        return;
      }
      if (!isSystemRole(normalizedRole) && normalizedRole !== "Custom") {
        res.status(400).json({
          message: `Invalid role. Allowed: ${SYSTEM_ROLES.join(", ")}`,
        });
        return;
      }
      membership.role = normalizedRole;
      membership.customRoleId = undefined;
    }

    await membership.save();
    auditAsync(req, "member.role_changed", "OrgMembership", membership._id, {
      role: membership.role,
      customRoleId: membership.customRoleId,
      userId: membership.userId,
    });

    res.status(200).json({ message: "Member role updated", membership });
  } catch (error: any) {
    console.error("Update member role error:", error.message);
    res.status(500).json({ message: "Server error" });
  }
};

export const removeMember = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  try {
    const { orgId: orgIdParam, memberId: memberIdParam } = req.params;
    const orgId = paramId(orgIdParam);
    const memberId = paramId(memberIdParam);

    const ok = await requireElevatedAdmin(req, orgId, res);
    if (!ok) return;

    const membership = await OrgMembership.findOne({ _id: memberId, orgId });
    if (!membership) {
      res.status(404).json({ message: "Membership not found" });
      return;
    }

    if (String(membership.userId) === String(req.user._id)) {
      res.status(400).json({ message: "Use leave organization to remove yourself" });
      return;
    }

    if (isOrgOwnerRole(membership.role)) {
      const ownerCount = await OrgMembership.countDocuments({
        orgId,
        role: elevatedRoleFilter,
        status: "Active",
      });
      if (ownerCount <= 1) {
        res.status(400).json({
          message: "Cannot remove the last owner",
        });
        return;
      }
    }

    await OrgMembership.deleteOne({ _id: membership._id });
    auditAsync(req, "member.removed", "User", membership.userId, {
      membershipId: memberId,
    });

    res.status(200).json({ message: "Member removed" });
  } catch (error: any) {
    console.error("Remove member error:", error.message);
    res.status(500).json({ message: "Server error" });
  }
};
