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
      "name email profileImageUrl",
    );

    const openTasks = await Task.find({
      orgId: req.orgId,
      assignedTo: { $in: userIds },
      status: { $ne: "Completed" },
      parentTaskId: { $exists: false },
    }).select("assignedTo effortHours title status dueDate");

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

      return {
        userId: m.userId,
        user,
        capacityHoursPerWeek: capacityPerWeek,
        capacityInWindow,
        assignedHours,
        loggedHours,
        openTaskCount: memberTasks.length,
        overloaded,
        utilizationPercent:
          capacityInWindow > 0
            ? Math.round((assignedHours / capacityInWindow) * 100)
            : 0,
        tasks: memberTasks,
      };
    });

    res.status(200).json({
      message: "Resource allocation",
      data: { from, to, weeks, allocation },
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

    // Reuse allocation and filter overloaded
    req.query.from =
      req.query.from ||
      new Date(Date.now() - 7 * 86400000).toISOString();
    req.query.to = req.query.to || new Date().toISOString();

    const memberships = await OrgMembership.find({
      orgId: req.orgId,
      status: "Active",
    });
    const userIds = memberships.map((m) => m.userId);
    const users = await User.find({ _id: { $in: userIds } }).select("name email");
    const openTasks = await Task.find({
      orgId: req.orgId,
      assignedTo: { $in: userIds },
      status: { $ne: "Completed" },
      parentTaskId: { $exists: false },
    }).select("assignedTo effortHours title");

    const from = new Date(req.query.from as string);
    const to = new Date(req.query.to as string);
    const weeks = Math.max(1, (to.getTime() - from.getTime()) / (7 * 86400000));

    const conflicts = memberships
      .map((m) => {
        const assignedHours = openTasks
          .filter((t) => String(t.assignedTo) === String(m.userId))
          .reduce((s, t) => s + (t.effortHours || 0), 0);
        const capacity = (m.capacityHoursPerWeek ?? 40) * weeks;
        return {
          user: users.find((u) => String(u._id) === String(m.userId)),
          assignedHours,
          capacity,
          overloadHours: Math.max(0, assignedHours - capacity),
        };
      })
      .filter((c) => c.overloadHours > 0);

    res.status(200).json({ message: "Resource conflicts", data: conflicts });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};
