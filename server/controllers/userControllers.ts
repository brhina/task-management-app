import { Response } from "express";
import Task from "../models/Task.js";
import User from "../models/User.js";
import Team from "../models/Team.js";
import Project from "../models/Project.js";
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
          customRoleId: membership?.customRoleId ? String(membership.customRoleId) : undefined,
          membershipId: membership?._id ? String(membership._id) : undefined,
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

export const getUserPerformance = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  try {
    if (!req.orgId) {
      res.status(400).json({ message: "Organization context is required" });
      return;
    }
    const userId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      res.status(400).json({ message: "Invalid user ID" });
      return;
    }

    const user = await User.findById(userId).select("-password");
    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }

    const membership = await OrgMembership.findOne({
      orgId: req.orgId,
      userId: user._id,
    });

    // Find teams assigned to user
    const userTeams = await Team.find({
      orgId: req.orgId,
      memberIds: user._id,
    }).select("name description");

    const userObjId = new mongoose.Types.ObjectId(userId);
    const orgObjId = new mongoose.Types.ObjectId(req.orgId.toString());
    const now = new Date();

    const topLevelMatch = {
      $or: [{ parentTaskId: null }, { parentTaskId: { $exists: false } }],
    };

    const [byStatus, byPriority, byProject, overdue, recentTasks, completedLast30] =
      await Promise.all([
        Task.aggregate([
          { $match: { orgId: orgObjId, assignedTo: userObjId, ...topLevelMatch } },
          { $group: { _id: "$status", count: { $sum: 1 } } },
        ]),
        Task.aggregate([
          { $match: { orgId: orgObjId, assignedTo: userObjId, ...topLevelMatch } },
          { $group: { _id: "$priority", count: { $sum: 1 } } },
        ]),
        Task.aggregate([
          { $match: { orgId: orgObjId, assignedTo: userObjId, ...topLevelMatch } },
          {
            $group: {
              _id: "$projectId",
              total: { $sum: 1 },
              completed: {
                $sum: { $cond: [{ $eq: ["$status", "Completed"] }, 1, 0] },
              },
            },
          },
          {
            $lookup: {
              from: "projects",
              localField: "_id",
              foreignField: "_id",
              as: "project",
            },
          },
          { $unwind: { path: "$project", preserveNullAndEmptyArrays: true } },
          {
            $project: {
              projectName: { $ifNull: ["$project.name", "Unassigned Project"] },
              total: 1,
              completed: 1,
            },
          },
        ]),
        Task.countDocuments({
          orgId: req.orgId,
          assignedTo: user._id,
          status: { $ne: "Completed" },
          dueDate: { $lt: now },
          ...topLevelMatch,
        }),
        Task.find({
          orgId: req.orgId,
          assignedTo: user._id,
        })
          .sort({ updatedAt: -1 })
          .limit(15)
          .select("title status priority dueDate projectId updatedAt parentTaskId assignedTo")
          .populate("projectId", "name")
          .populate({
            path: "parentTaskId",
            select: "title status priority projectId assignedTo",
            populate: { path: "projectId", select: "name" },
          }),
        Task.countDocuments({
          orgId: req.orgId,
          assignedTo: user._id,
          status: "Completed",
          updatedAt: { $gte: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000) },
          ...topLevelMatch,
        }),
      ]);

    const statusMap: Record<string, number> = {};
    byStatus.forEach((r: any) => {
      statusMap[r._id] = r.count;
    });
    const priorityMap: Record<string, number> = {};
    byPriority.forEach((r: any) => {
      priorityMap[r._id] = r.count;
    });

    const totalTasks = Object.values(statusMap).reduce((a, b) => a + b, 0);
    const completedTasks = statusMap["Completed"] || 0;
    const inProgressTasks = statusMap["In Progress"] || 0;
    const pendingTasks = statusMap["Pending"] || 0;
    const completionRate =
      totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    const activeWorkload = pendingTasks + inProgressTasks;
    let workloadStatus = "Idle";
    if (activeWorkload > 8) workloadStatus = "Heavy";
    else if (activeWorkload > 3) workloadStatus = "Balanced";
    else if (activeWorkload > 0) workloadStatus = "Light";

    res.status(200).json({
      message: "User performance data",
      data: {
        user: {
          _id: user._id,
          name: user.name,
          email: user.email,
          profileImageUrl: user.profileImageUrl,
          role: membership?.role || "OrgMember",
          teams: userTeams,
        },
        statistics: {
          totalTasks,
          completedTasks,
          inProgressTasks,
          pendingTasks,
          overdueTasks: overdue,
          completedLast30Days: completedLast30,
          completionRate,
          workloadStatus,
          byStatus: statusMap,
          byPriority: priorityMap,
          byProject,
        },
        recentTasks,
      },
    });
  } catch (error: any) {
    console.error("Error fetching user performance:", error.message);
    res.status(500).json({ message: error.message });
  }
};
