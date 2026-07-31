import { Response } from "express";
import Task from "../models/Task.js";
import Milestone from "../models/Milestone.js";
import Dependency from "../models/Dependency.js";
import Project from "../models/Project.js";
import OrgMembership from "../models/OrgMembership.js";
import TimeEntry from "../models/TimeEntry.js";
import User from "../models/User.js";
import { AuthRequest } from "../middleware/authMiddleware.js";

export const getProjectGantt = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  try {
    if (!req.orgId) {
      res.status(400).json({ message: "Organization context is required" });
      return;
    }

    const project = await Project.findOne({
      _id: req.params.id,
      orgId: req.orgId,
    });
    if (!project) {
      res.status(404).json({ message: "Project not found" });
      return;
    }

    const tasks = await Task.find({
      orgId: req.orgId,
      projectId: project._id,
      parentTaskId: { $exists: false },
    })
      .select(
        "title status priority startDate dueDate effortHours progress assignedTo sprintId",
      )
      .populate("assignedTo", "name");

    const taskIds = tasks.map((t) => t._id);
    const dependencies = await Dependency.find({
      orgId: req.orgId,
      $or: [{ fromTaskId: { $in: taskIds } }, { toTaskId: { $in: taskIds } }],
    });

    const milestones = await Milestone.find({
      orgId: req.orgId,
      projectId: project._id,
    }).sort({ targetDate: 1 });

    res.status(200).json({
      message: "Gantt data",
      data: { project, tasks, dependencies, milestones },
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const getResourceAllocation = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  try {
    if (!req.orgId) {
      res.status(400).json({ message: "Organization context is required" });
      return;
    }

    const from = req.query.from
      ? new Date(req.query.from as string)
      : new Date(Date.now() - 7 * 86400000);
    const to = req.query.to ? new Date(req.query.to as string) : new Date();

    const memberships = await OrgMembership.find({
      orgId: req.orgId,
      status: "Active",
    });

    const userIds = memberships.map((m) => m.userId);
    const users = await User.find({ _id: { $in: userIds } }).select(
      "name email profileImageUrl role",
    );

    const openTasks = await Task.find({
      orgId: req.orgId,
      assignedTo: { $in: userIds },
      status: { $ne: "Completed" },
      parentTaskId: { $exists: false },
    })
      .select("assignedTo effortHours title status priority dueDate projectId")
      .populate("projectId", "name");

    const timeEntries = await TimeEntry.find({
      orgId: req.orgId,
      userId: { $in: userIds },
      startTime: { $gte: from, $lte: to },
      running: false,
      endTime: { $exists: true },
    });

    const weeks =
      Math.max(1, (to.getTime() - from.getTime()) / (7 * 86400000));

    const allocation = memberships.map((m) => {
      const user = users.find((u) => String(u._id) === String(m.userId));
      const memberTasks = openTasks.filter(
        (t) => String(t.assignedTo) === String(m.userId),
      );
      const assignedHours = memberTasks.reduce(
        (s, t) => s + (t.effortHours || 0),
        0,
      );
      const memberEntries = timeEntries.filter(
        (e) => String(e.userId) === String(m.userId),
      );
      const loggedHours = memberEntries.reduce((s, e) => {
        if (!e.endTime) return s;
        return s + (e.endTime.getTime() - e.startTime.getTime()) / 3600000;
      }, 0);

      const capacityPerWeek = m.capacityHoursPerWeek ?? 40;
      const capacityInWindow = capacityPerWeek * weeks;
      const overloaded = assignedHours > capacityInWindow;
      const utilizationPercent =
        capacityInWindow > 0
          ? Math.round((assignedHours / capacityInWindow) * 100)
          : 0;

      let statusCategory: 'overloaded' | 'heavy' | 'optimal' | 'available' = 'available';
      if (overloaded || utilizationPercent > 100) {
        statusCategory = 'overloaded';
      } else if (utilizationPercent >= 85) {
        statusCategory = 'heavy';
      } else if (utilizationPercent >= 50) {
        statusCategory = 'optimal';
      }

      return {
        userId: m.userId,
        user,
        role: m.role,
        capacityHoursPerWeek: capacityPerWeek,
        capacityInWindow,
        assignedHours,
        loggedHours,
        openTaskCount: memberTasks.length,
        overloaded,
        statusCategory,
        utilizationPercent,
        tasks: memberTasks,
      };
    });

    // Summary Metrics
    const totalCapacity = allocation.reduce((s, a) => s + a.capacityInWindow, 0);
    const totalAssigned = allocation.reduce((s, a) => s + a.assignedHours, 0);
    const totalLogged = allocation.reduce((s, a) => s + a.loggedHours, 0);
    const overloadedCount = allocation.filter((a) => a.overloaded).length;
    const teamUtilization =
      totalCapacity > 0 ? Math.round((totalAssigned / totalCapacity) * 100) : 0;

    res.status(200).json({
      message: "Resource allocation",
      data: {
        from,
        to,
        weeks,
        summary: {
          totalCapacity,
          totalAssigned,
          totalLogged,
          overloadedCount,
          teamUtilization,
          totalMembers: allocation.length,
        },
        allocation,
      },
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const getResourceConflicts = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  try {
    if (!req.orgId) {
      res.status(400).json({ message: "Organization context is required" });
      return;
    }

    const from = req.query.from
      ? new Date(req.query.from as string)
      : new Date(Date.now() - 7 * 86400000);
    const to = req.query.to ? new Date(req.query.to as string) : new Date();
    const weeks = Math.max(1, (to.getTime() - from.getTime()) / (7 * 86400000));

    const memberships = await OrgMembership.find({
      orgId: req.orgId,
      status: "Active",
    });
    const userIds = memberships.map((m) => m.userId);
    const users = await User.find({ _id: { $in: userIds } }).select("name email profileImageUrl");
    const openTasks = await Task.find({
      orgId: req.orgId,
      assignedTo: { $in: userIds },
      status: { $ne: "Completed" },
      parentTaskId: { $exists: false },
    }).select("assignedTo effortHours title priority status dueDate");

    const memberStats = memberships.map((m) => {
      const user = users.find((u) => String(u._id) === String(m.userId));
      const memberTasks = openTasks.filter((t) => String(t.assignedTo) === String(m.userId));
      const assignedHours = memberTasks.reduce((s, t) => s + (t.effortHours || 0), 0);
      const capacity = (m.capacityHoursPerWeek ?? 40) * weeks;
      const overloadHours = Math.max(0, assignedHours - capacity);
      return {
        userId: m.userId,
        user,
        capacity,
        assignedHours,
        overloadHours,
        tasks: memberTasks,
      };
    });

    const conflicts = memberStats.filter((c) => c.overloadHours > 0);
    const availableMembers = memberStats.filter((c) => c.assignedHours < c.capacity);

    // Build smart rebalancing suggestions
    const rebalanceSuggestions = conflicts.map((conf) => {
      const suggestedTarget = availableMembers.length > 0
        ? availableMembers.sort((a, b) => a.assignedHours - b.assignedHours)[0]
        : null;

      return {
        overloadedUserId: conf.userId,
        overloadedUser: conf.user,
        overloadHours: conf.overloadHours,
        assignedHours: conf.assignedHours,
        capacity: conf.capacity,
        tasksCount: conf.tasks.length,
        suggestedTargetUser: suggestedTarget ? suggestedTarget.user : null,
        suggestedTargetAvailableHours: suggestedTarget ? (suggestedTarget.capacity - suggestedTarget.assignedHours) : 0,
      };
    });

    res.status(200).json({
      message: "Resource conflicts",
      data: {
        conflicts,
        rebalanceSuggestions,
        totalConflicts: conflicts.length,
      },
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const updateMemberCapacity = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  try {
    if (!req.orgId) {
      res.status(400).json({ message: "Organization context is required" });
      return;
    }
    const { userId } = req.params;
    const capacityHoursPerWeek = Number(req.body.capacityHoursPerWeek);

    if (isNaN(capacityHoursPerWeek) || capacityHoursPerWeek < 0) {
      res.status(400).json({ message: "Invalid capacity hours parameter" });
      return;
    }

    const membership = await OrgMembership.findOne({
      orgId: req.orgId,
      userId,
    });

    if (!membership) {
      res.status(404).json({ message: "Member not found in active organization" });
      return;
    }

    membership.capacityHoursPerWeek = capacityHoursPerWeek;
    await membership.save();

    res.status(200).json({
      message: "Member capacity updated successfully",
      data: membership,
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};
