import type { Response } from "express";
import mongoose from "mongoose";
import Team from "../models/Team.js";
import Task from "../models/Task.js";
import Project from "../models/Project.js";
import OrgMembership from "../models/OrgMembership.js";
import { AuthRequest } from "../middleware/authMiddleware.js";
import { auditAsync } from "../services/auditService.js";

export const listTeams = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  try {
    if (!req.orgId) {
      res.status(400).json({ message: "Organization context is required" });
      return;
    }

    const teams = await Team.find({ orgId: req.orgId })
      .populate("leadId", "name email profileImageUrl")
      .populate("memberIds", "name email profileImageUrl")
      .populate("parentTeamId", "name")
      .sort({ name: 1 });

    res.status(200).json({ message: "Teams fetched", data: teams });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const getTeamById = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  try {
    if (!req.orgId) {
      res.status(400).json({ message: "Organization context is required" });
      return;
    }

    const team = await Team.findOne({ _id: req.params.id, orgId: req.orgId })
      .populate("leadId", "name email profileImageUrl")
      .populate("memberIds", "name email profileImageUrl")
      .populate("parentTeamId", "name");

    if (!team) {
      res.status(404).json({ message: "Team not found" });
      return;
    }

    const memberIds = team.memberIds.map((m: any) => m._id || m);
    const [taskCount, projectCount] = await Promise.all([
      Task.countDocuments({ orgId: req.orgId, teamId: team._id }),
      Project.countDocuments({ orgId: req.orgId, teamId: team._id }),
    ]);

    const openTasks = await Task.countDocuments({
      orgId: req.orgId,
      teamId: team._id,
      status: { $ne: "Completed" },
    });

    res.status(200).json({
      message: "Team fetched",
      data: {
        ...team.toObject(),
        stats: {
          memberCount: memberIds.length,
          taskCount,
          openTasks,
          projectCount,
        },
      },
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const createTeam = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  try {
    if (!req.orgId) {
      res.status(400).json({ message: "Organization context is required" });
      return;
    }

    const { name, description, leadId, memberIds, parentTeamId } = req.body;
    if (!name?.trim()) {
      res.status(400).json({ message: "Team name is required" });
      return;
    }

    if (parentTeamId) {
      const parent = await Team.findOne({
        _id: parentTeamId,
        orgId: req.orgId,
      });
      if (!parent) {
        res.status(400).json({ message: "Parent team not found" });
        return;
      }
    }

    const uniqueMembers = Array.from(
      new Set<string>(
        (memberIds || [])
          .filter((id: string) => mongoose.Types.ObjectId.isValid(id))
          .map((id: string) => String(id)),
      ),
    );

    if (uniqueMembers.length) {
      const count = await OrgMembership.countDocuments({
        orgId: req.orgId,
        userId: { $in: uniqueMembers },
        status: "Active",
      });
      if (count !== uniqueMembers.length) {
        res.status(400).json({
          message: "All team members must be active org members",
        });
        return;
      }
    }

    const team = await Team.create({
      orgId: req.orgId,
      name: name.trim(),
      description: description?.trim(),
      leadId: leadId || undefined,
      memberIds: uniqueMembers,
      parentTeamId: parentTeamId || undefined,
      createdBy: req.user._id,
    });

    auditAsync(req, "team.created", "Team", team._id, { name: team.name });

    const populated = await Team.findById(team._id)
      .populate("leadId", "name email profileImageUrl")
      .populate("memberIds", "name email profileImageUrl");

    res.status(201).json({ message: "Team created", data: populated });
  } catch (error: any) {
    if (error.code === 11000) {
      res.status(400).json({ message: "A team with this name already exists" });
      return;
    }
    res.status(500).json({ message: error.message });
  }
};

export const updateTeam = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  try {
    if (!req.orgId) {
      res.status(400).json({ message: "Organization context is required" });
      return;
    }

    const team = await Team.findOne({ _id: req.params.id, orgId: req.orgId });
    if (!team) {
      res.status(404).json({ message: "Team not found" });
      return;
    }

    const { name, description, leadId, memberIds, parentTeamId } = req.body;

    if (name !== undefined) team.name = String(name).trim();
    if (description !== undefined) team.description = String(description).trim();
    if (leadId !== undefined) team.leadId = leadId || undefined;
    if (parentTeamId !== undefined) {
      if (parentTeamId && String(parentTeamId) === String(team._id)) {
        res.status(400).json({ message: "Team cannot be its own parent" });
        return;
      }
      team.parentTeamId = parentTeamId || undefined;
    }
    if (memberIds !== undefined) {
      const uniqueMembers = Array.from(
        new Set<string>(
          (memberIds || [])
            .filter((id: string) => mongoose.Types.ObjectId.isValid(id))
            .map((id: string) => String(id)),
        ),
      );
      team.memberIds = uniqueMembers as any;
    }

    await team.save();
    auditAsync(req, "team.updated", "Team", team._id, { name: team.name });

    const populated = await Team.findById(team._id)
      .populate("leadId", "name email profileImageUrl")
      .populate("memberIds", "name email profileImageUrl")
      .populate("parentTeamId", "name");

    res.status(200).json({ message: "Team updated", data: populated });
  } catch (error: any) {
    if (error.code === 11000) {
      res.status(400).json({ message: "A team with this name already exists" });
      return;
    }
    res.status(500).json({ message: error.message });
  }
};

export const deleteTeam = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  try {
    if (!req.orgId) {
      res.status(400).json({ message: "Organization context is required" });
      return;
    }

    const team = await Team.findOneAndDelete({
      _id: req.params.id,
      orgId: req.orgId,
    });
    if (!team) {
      res.status(404).json({ message: "Team not found" });
      return;
    }

    await Team.updateMany(
      { orgId: req.orgId, parentTeamId: team._id },
      { $unset: { parentTeamId: 1 } },
    );
    await Task.updateMany(
      { orgId: req.orgId, teamId: team._id },
      { $unset: { teamId: 1 } },
    );
    await Project.updateMany(
      { orgId: req.orgId, teamId: team._id },
      { $unset: { teamId: 1 } },
    );

    auditAsync(req, "team.deleted", "Team", team._id, { name: team.name });
    res.status(200).json({ message: "Team deleted" });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const getTeamDashboard = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  try {
    if (!req.orgId) {
      res.status(400).json({ message: "Organization context is required" });
      return;
    }

    const team = await Team.findOne({ _id: req.params.id, orgId: req.orgId });
    if (!team) {
      res.status(404).json({ message: "Team not found" });
      return;
    }

    const memberIds = team.memberIds;
    const now = new Date();

    const [byStatus, byPriority, overdue, recentTasks, completedLast30] =
      await Promise.all([
        Task.aggregate([
          { $match: { orgId: req.orgId, teamId: team._id } },
          { $group: { _id: "$status", count: { $sum: 1 } } },
        ]),
        Task.aggregate([
          { $match: { orgId: req.orgId, teamId: team._id } },
          { $group: { _id: "$priority", count: { $sum: 1 } } },
        ]),
        Task.countDocuments({
          orgId: req.orgId,
          teamId: team._id,
          status: { $ne: "Completed" },
          dueDate: { $lt: now },
        }),
        Task.find({ orgId: req.orgId, teamId: team._id })
          .sort({ updatedAt: -1 })
          .limit(10)
          .select("title status priority dueDate assignedTo updatedAt")
          .populate("assignedTo", "name"),
        Task.countDocuments({
          orgId: req.orgId,
          teamId: team._id,
          status: "Completed",
          updatedAt: { $gte: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000) },
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

    res.status(200).json({
      message: "Team dashboard",
      data: {
        team: {
          _id: team._id,
          name: team.name,
          memberCount: memberIds.length,
        },
        statistics: {
          totalTasks: Object.values(statusMap).reduce((a, b) => a + b, 0),
          overdueTasks: overdue,
          completedLast30Days: completedLast30,
          byStatus: statusMap,
          byPriority: priorityMap,
        },
        recentTasks,
      },
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};
