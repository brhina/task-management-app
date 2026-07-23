import type { Response } from "express";
import CustomRole from "../models/CustomRole.js";
import OrgMembership from "../models/OrgMembership.js";
import {
  PERMISSIONS,
  ROLE_PERMISSIONS,
  ROLE_LABELS,
  SYSTEM_ROLES,
  type Permission,
} from "../constants/permissions.js";
import { AuthRequest } from "../middleware/authMiddleware.js";
import { auditAsync } from "../services/auditService.js";

export const listPermissionsCatalog = async (
  _req: AuthRequest,
  res: Response,
): Promise<void> => {
  res.status(200).json({
    message: "Permissions catalog",
    data: {
      permissions: PERMISSIONS,
      systemRoles: SYSTEM_ROLES.map((role) => ({
        role,
        label: ROLE_LABELS[role],
        permissions: ROLE_PERMISSIONS[role],
      })),
    },
  });
};

export const getMyPermissions = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  res.status(200).json({
    message: "Current permissions",
    data: {
      role: req.membershipRole,
      customRoleId: req.membership?.customRoleId || null,
      permissions: req.permissions || [],
    },
  });
};

export const listCustomRoles = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  try {
    if (!req.orgId) {
      res.status(400).json({ message: "Organization context is required" });
      return;
    }

    const roles = await CustomRole.find({ orgId: req.orgId }).sort({ name: 1 });
    res.status(200).json({
      message: "Roles fetched",
      data: {
        systemRoles: SYSTEM_ROLES.map((role) => ({
          role,
          label: ROLE_LABELS[role],
          permissions: ROLE_PERMISSIONS[role],
          isSystem: true,
        })),
        customRoles: roles,
      },
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const createCustomRole = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  try {
    if (!req.orgId) {
      res.status(400).json({ message: "Organization context is required" });
      return;
    }

    const { name, description, permissions } = req.body;
    if (!name?.trim()) {
      res.status(400).json({ message: "Role name is required" });
      return;
    }

    const cleaned = Array.from(
      new Set(
        (permissions || []).filter((p: string) =>
          (PERMISSIONS as readonly string[]).includes(p),
        ),
      ),
    ) as Permission[];

    const role = await CustomRole.create({
      orgId: req.orgId,
      name: name.trim(),
      description: description?.trim(),
      permissions: cleaned,
      isSystem: false,
      createdBy: req.user._id,
    });

    auditAsync(req, "role.created", "CustomRole", role._id, {
      name: role.name,
      permissions: cleaned,
    });

    res.status(201).json({ message: "Custom role created", data: role });
  } catch (error: any) {
    if (error.code === 11000) {
      res.status(400).json({ message: "A role with this name already exists" });
      return;
    }
    res.status(500).json({ message: error.message });
  }
};

export const updateCustomRole = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  try {
    if (!req.orgId) {
      res.status(400).json({ message: "Organization context is required" });
      return;
    }

    const role = await CustomRole.findOne({
      _id: req.params.id,
      orgId: req.orgId,
    });
    if (!role) {
      res.status(404).json({ message: "Custom role not found" });
      return;
    }
    if (role.isSystem) {
      res.status(400).json({ message: "System roles cannot be modified" });
      return;
    }

    if (req.body.name !== undefined) role.name = String(req.body.name).trim();
    if (req.body.description !== undefined) {
      role.description = String(req.body.description).trim();
    }
    if (req.body.permissions !== undefined) {
      role.permissions = Array.from(
        new Set(
          (req.body.permissions || []).filter((p: string) =>
            (PERMISSIONS as readonly string[]).includes(p),
          ),
        ),
      ) as Permission[];
    }

    await role.save();
    auditAsync(req, "role.updated", "CustomRole", role._id, {
      name: role.name,
      permissions: role.permissions,
    });

    res.status(200).json({ message: "Custom role updated", data: role });
  } catch (error: any) {
    if (error.code === 11000) {
      res.status(400).json({ message: "A role with this name already exists" });
      return;
    }
    res.status(500).json({ message: error.message });
  }
};

export const deleteCustomRole = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  try {
    if (!req.orgId) {
      res.status(400).json({ message: "Organization context is required" });
      return;
    }

    const role = await CustomRole.findOne({
      _id: req.params.id,
      orgId: req.orgId,
    });
    if (!role) {
      res.status(404).json({ message: "Custom role not found" });
      return;
    }
    if (role.isSystem) {
      res.status(400).json({ message: "System roles cannot be deleted" });
      return;
    }

    const inUse = await OrgMembership.countDocuments({
      orgId: req.orgId,
      customRoleId: role._id,
      status: "Active",
    });
    if (inUse > 0) {
      res.status(400).json({
        message: `Cannot delete role assigned to ${inUse} member(s). Reassign them first.`,
      });
      return;
    }

    await role.deleteOne();
    auditAsync(req, "role.deleted", "CustomRole", role._id, {
      name: role.name,
    });

    res.status(200).json({ message: "Custom role deleted" });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};
