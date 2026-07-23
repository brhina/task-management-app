import { Request, Response, NextFunction } from "express";
import mongoose from "mongoose";
import User from "../models/User.js";
import Organization from "../models/Organization.js";
import OrgMembership, { type OrgRole } from "../models/OrgMembership.js";
import CustomRole from "../models/CustomRole.js";
import { verifyToken } from "../utils/jwtUtils.js";
import {
  ELEVATED_ROLES,
  roleHasPermission,
  type Permission,
} from "../constants/permissions.js";

export interface AuthRequest extends Request {
  user?: any;
  org?: any;
  orgId?: mongoose.Types.ObjectId;
  membership?: any;
  membershipRole?: OrgRole;
  permissions?: Permission[];
}

async function resolveMembershipPermissions(
  membership: any,
): Promise<Permission[]> {
  if (membership.role === "Custom" && membership.customRoleId) {
    const custom = await CustomRole.findById(membership.customRoleId).lean();
    return (custom?.permissions || []) as Permission[];
  }
  const { getPermissionsForSystemRole } = await import(
    "../constants/permissions.js"
  );
  return getPermissionsForSystemRole(membership.role);
}

const protect = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      res.status(401).json({
        message: "Access denied. No token provided.",
      });
      return;
    }

    const token = authHeader.split(" ")[1];

    if (!token) {
      res.status(401).json({
        message: "Access denied. Invalid token format.",
      });
      return;
    }

    const decoded = verifyToken(token);

    const user = await User.findById(decoded.id).select("-password");

    if (!user) {
      res.status(401).json({
        message: "Access denied. User not found.",
      });
      return;
    }

    req.user = user;

    // Resolve active organization context.
    const orgHeader = req.headers["x-org-id"];
    const orgIdRaw = Array.isArray(orgHeader) ? orgHeader[0] : orgHeader;

    let orgId: mongoose.Types.ObjectId | null = null;
    if (
      typeof orgIdRaw === "string" &&
      mongoose.Types.ObjectId.isValid(orgIdRaw)
    ) {
      orgId = new mongoose.Types.ObjectId(orgIdRaw);
    }

    let membership;
    if (orgId) {
      membership = await OrgMembership.findOne({
        orgId,
        userId: user._id,
        status: "Active",
      });
    } else {
      membership = await OrgMembership.findOne({
        userId: user._id,
        status: "Active",
      }).sort({ createdAt: 1 });
      orgId = membership?.orgId ?? null;
    }

    if (!membership || !orgId) {
      res.status(403).json({
        message: "Access denied. No organization membership found.",
      });
      return;
    }

    const org = await Organization.findById(orgId);
    if (!org) {
      res.status(403).json({
        message: "Access denied. Organization not found.",
      });
      return;
    }

    req.orgId = orgId;
    req.org = org;
    req.membership = membership;
    req.membershipRole = membership.role;
    req.permissions = await resolveMembershipPermissions(membership);
    next();
  } catch (error: any) {
    console.error("Auth middleware error:", error.message);

    if (error.name === "JsonWebTokenError") {
      res.status(401).json({
        message: "Access denied. Invalid token.",
      });
      return;
    }

    if (error.name === "TokenExpiredError") {
      res.status(401).json({
        message: "Access denied. Token expired.",
      });
      return;
    }

    res.status(500).json({
      message: "Server error during authentication.",
    });
  }
};

/** True when membership can manage the organization (Owner / OrgAdmin or custom). */
export function hasOrgAdminAccess(req: AuthRequest): boolean {
  if (!req.membershipRole) return false;
  if (ELEVATED_ROLES.includes(req.membershipRole as any)) return true;
  return Boolean(req.permissions?.includes("org:manage"));
}

const orgAdminOnly = (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): void => {
  if (!req.user || !req.membership) {
    res.status(401).json({
      message: "Access denied. Authentication required.",
    });
    return;
  }

  if (!hasOrgAdminAccess(req)) {
    res.status(403).json({
      message: "Access denied. Organization admin privileges required.",
    });
    return;
  }

  next();
};

export function requirePermission(...required: Permission[]) {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user || !req.membership) {
      res.status(401).json({
        message: "Access denied. Authentication required.",
      });
      return;
    }

    const perms = req.permissions || [];
    const ok = required.every((p) => perms.includes(p));
    if (!ok) {
      res.status(403).json({
        message: `Access denied. Required permission: ${required.join(", ")}`,
      });
      return;
    }
    next();
  };
}

export function requireAnyPermission(...required: Permission[]) {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user || !req.membership) {
      res.status(401).json({
        message: "Access denied. Authentication required.",
      });
      return;
    }

    const perms = req.permissions || [];
    const ok = required.some((p) => perms.includes(p));
    if (!ok) {
      res.status(403).json({
        message: `Access denied. Requires one of: ${required.join(", ")}`,
      });
      return;
    }
    next();
  };
}

export { orgAdminOnly, roleHasPermission };
export default protect;
