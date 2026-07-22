import { Response } from "express";
import Task from "../models/Task.js";
import User from "../models/User.js";
import OrgMembership from "../models/OrgMembership.js";
import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import { AuthRequest } from "../middleware/authMiddleware.js";

export const getAllUsers = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  try {
    if (!req.orgId) {
      res.status(400).json({ message: "Organization context is required" });
      return;
    }

    const { search, page: pageStr, limit: limitStr } = req.query;
    const page = Math.max(1, parseInt(pageStr as string, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(limitStr as string, 10) || 50));
    const skip = (page - 1) * limit;

    const memberships = await OrgMembership.find({
      orgId: new mongoose.Types.ObjectId(req.orgId),
      status: "Active",
    });
    const userIds = memberships.map((m) => m.userId);

    let filter: any = { _id: { $in: userIds } };
    const isSearch = Boolean(search);

    if (isSearch) {
      filter.$text = { $search: search as string };
    }

    const total = await User.countDocuments(filter);

    const projection = isSearch ? { score: { $meta: "textScore" } } : {};
    const sortOptions: any = isSearch
      ? { score: { $meta: "textScore" } }
      : {};

    const users = await User.find(filter, projection)
      .sort(sortOptions)
      .skip(skip)
      .limit(limit)
      .select("-password");

    const usersWithTaskCounts = await Promise.all(
      users.map(async (user) => {
        const userId = (user._id as any).toString();
        const membership = memberships.find(
          (m) => m.userId.toString() === userId,
        );
        const pendingTasks = await Task.countDocuments({
          orgId: req.orgId,
          assignedTo: user._id,
          status: "Pending",
        });
        const inProgressTasks = await Task.countDocuments({
          orgId: req.orgId,
          assignedTo: user._id,
          status: "In Progress",
        });
        const completedTasks = await Task.countDocuments({
          orgId: req.orgId,
          assignedTo: user._id,
          status: "Completed",
        });
        return {
          ...user.toObject(),
          role: membership?.role || "OrgMember",
          pendingTasks,
          inProgressTasks,
          completedTasks,
        };
      }),
    );
    res.status(200).json({
      users: usersWithTaskCounts,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    console.error("Error fetching users:", error.message);
    res.status(500).json({ message: "Server error" });
  }
};

export const getUserById = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  try {
    if (!req.orgId) {
      res.status(400).json({ message: "Organization context is required" });
      return;
    }

    const membership = await OrgMembership.findOne({
      orgId: req.orgId,
      userId: req.params.id,
      status: "Active",
    });
    if (!membership) {
      res.status(404).json({ message: "User not found" });
      return;
    }

    const user = await User.findById(req.params.id).select("-password");
    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }
    res.status(200).json(user);
  } catch (error: any) {
    console.error("Error fetching user:", error.message);
    res.status(500).json({ message: "Server error" });
  }
};

export const deleteUser = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  try {
    if (!req.orgId) {
      res.status(400).json({ message: "Organization context is required" });
      return;
    }

    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({ message: "Invalid user ID" });
      return;
    }
    const user = await User.findById(id);
    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }

    // Multi-tenant safe behavior: remove from the current org.
    const membership = await OrgMembership.findOne({
      orgId: req.orgId,
      userId: id,
    });
    if (!membership) {
      res
        .status(404)
        .json({ message: "User is not a member of this organization" });
      return;
    }

    await OrgMembership.deleteOne({ orgId: req.orgId, userId: id });

    const remainingMemberships = await OrgMembership.countDocuments({
      userId: id,
    });
    if (remainingMemberships === 0) {
      await user.deleteOne();
    }

    res.status(200).json({ message: "User removed from organization" });
  } catch (error: any) {
    console.error("Error deleting user:", error.message);
    res.status(500).json({ message: "Server error" });
  }
};
