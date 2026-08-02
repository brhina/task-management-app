import { Response } from "express";
import TimeEntry from "../models/TimeEntry.js";
import Task from "../models/Task.js";
import { AuthRequest } from "../middleware/authMiddleware.js";
import { isOrgOwnerRole } from "../constants/permissions.js";
import { logTaskActivity } from "../services/activityLogger.js";
import mongoose from "mongoose";

export const listTimeEntries = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  try {
    if (!req.orgId) {
      res.status(400).json({ message: "Organization context is required" });
      return;
    }

    const filter: Record<string, unknown> = { orgId: req.orgId };
    if (req.query.taskId) filter.taskId = req.query.taskId;
    if (req.query.userId && isOrgOwnerRole(req.membershipRole)) {
      filter.userId = req.query.userId;
    } else if (!isOrgOwnerRole(req.membershipRole)) {
      filter.userId = req.user._id;
    }

    const entries = await TimeEntry.find(filter)
      .sort({ startTime: -1 })
      .populate("userId", "name email")
      .populate("taskId", "title");

    res.status(200).json({ message: "Time entries fetched", data: entries });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const createTimeEntry = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  try {
    if (!req.orgId) {
      res.status(400).json({ message: "Organization context is required" });
      return;
    }

    const { taskId, startTime, endTime, description, billable } = req.body;
    const task = await Task.findOne({ _id: taskId, orgId: req.orgId });
    if (!task) {
      res.status(404).json({ message: "Task not found" });
      return;
    }

    const entry = await TimeEntry.create({
      orgId: req.orgId,
      taskId,
      userId: req.user._id,
      startTime: startTime || new Date(),
      endTime,
      description,
      billable: billable !== false,
      running: false,
    });

    await logTaskActivity({
      orgId: req.orgId,
      taskId,
      actorId: req.user._id,
      action: "time_logged",
      meta: { entryId: String(entry._id) },
    });

    res.status(201).json({ message: "Time entry created", data: entry });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const updateTimeEntry = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  try {
    if (!req.orgId) {
      res.status(400).json({ message: "Organization context is required" });
      return;
    }

    const entry = await TimeEntry.findOne({
      _id: req.params.id,
      orgId: req.orgId,
    });
    if (!entry) {
      res.status(404).json({ message: "Time entry not found" });
      return;
    }

    if (
      String(entry.userId) !== String(req.user._id) &&
      !isOrgOwnerRole(req.membershipRole)
    ) {
      res.status(403).json({ message: "Not authorized" });
      return;
    }

    if (req.body.startTime !== undefined) entry.startTime = req.body.startTime;
    if (req.body.endTime !== undefined) entry.endTime = req.body.endTime;
    if (req.body.description !== undefined)
      entry.description = req.body.description;
    if (req.body.billable !== undefined) entry.billable = req.body.billable;
    if (req.body.running !== undefined) entry.running = req.body.running;

    await entry.save();
    res.status(200).json({ message: "Time entry updated", data: entry });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const deleteTimeEntry = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  try {
    if (!req.orgId) {
      res.status(400).json({ message: "Organization context is required" });
      return;
    }

    const entry = await TimeEntry.findOne({
      _id: req.params.id,
      orgId: req.orgId,
    });
    if (!entry) {
      res.status(404).json({ message: "Time entry not found" });
      return;
    }

    if (
      String(entry.userId) !== String(req.user._id) &&
      !isOrgOwnerRole(req.membershipRole)
    ) {
      res.status(403).json({ message: "Not authorized" });
      return;
    }

    await entry.deleteOne();
    res.status(200).json({ message: "Time entry deleted" });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const startTimer = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  try {
    if (!req.orgId) {
      res.status(400).json({ message: "Organization context is required" });
      return;
    }

    const task = await Task.findOne({ _id: req.params.id, orgId: req.orgId });
    if (!task) {
      res.status(404).json({ message: "Task not found" });
      return;
    }

    const existing = await TimeEntry.findOne({
      orgId: req.orgId,
      userId: req.user._id,
      running: true,
    });
    if (existing) {
      res.status(400).json({
        message: "You already have a running timer",
        data: existing,
      });
      return;
    }

    const taskId = String(req.params.id);
    const entry = await TimeEntry.create({
      orgId: req.orgId,
      taskId,
      userId: req.user._id,
      startTime: new Date(),
      billable: req.body.billable !== false,
      description: req.body.description,
      running: true,
    });

    await logTaskActivity({
      orgId: req.orgId,
      taskId,
      actorId: req.user._id,
      action: "timer_started",
    });

    res.status(201).json({ message: "Timer started", data: entry });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const stopTimer = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  try {
    if (!req.orgId) {
      res.status(400).json({ message: "Organization context is required" });
      return;
    }

    const entry = await TimeEntry.findOne({
      orgId: req.orgId,
      userId: req.user._id,
      taskId: req.params.id,
      running: true,
    });

    if (!entry) {
      res.status(404).json({ message: "No running timer for this task" });
      return;
    }

    entry.endTime = new Date();
    entry.running = false;
    await entry.save();

    await logTaskActivity({
      orgId: req.orgId,
      taskId: String(req.params.id),
      actorId: req.user._id,
      action: "timer_stopped",
    });

    res.status(200).json({ message: "Timer stopped", data: entry });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const timeReport = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  try {
    if (!req.orgId) {
      res.status(400).json({ message: "Organization context is required" });
      return;
    }

    const match: Record<string, unknown> = {
      orgId: new mongoose.Types.ObjectId(req.orgId),
      running: false,
      endTime: { $exists: true },
    };

    if (req.query.taskId) {
      match.taskId = new mongoose.Types.ObjectId(req.query.taskId as string);
    }
    if (req.query.userId && isOrgOwnerRole(req.membershipRole)) {
      match.userId = new mongoose.Types.ObjectId(req.query.userId as string);
    } else if (!isOrgOwnerRole(req.membershipRole)) {
      match.userId = new mongoose.Types.ObjectId(req.user._id.toString());
    }
    if (req.query.from || req.query.to) {
      match.startTime = {};
      if (req.query.from) {
        (match.startTime as any).$gte = new Date(req.query.from as string);
      }
      if (req.query.to) {
        (match.startTime as any).$lte = new Date(req.query.to as string);
      }
    }

    if (req.query.projectId) {
      const taskIds = await Task.find({
        orgId: req.orgId,
        projectId: req.query.projectId,
      }).distinct("_id");
      match.taskId = { $in: taskIds };
    }

    const entries = await TimeEntry.find(match);
    let totalMs = 0;
    let billableMs = 0;
    let nonBillableMs = 0;

    for (const e of entries) {
      if (!e.endTime) continue;
      const ms = e.endTime.getTime() - e.startTime.getTime();
      totalMs += ms;
      if (e.billable) billableMs += ms;
      else nonBillableMs += ms;
    }

    const byUser: Record<string, number> = {};
    const byTask: Record<string, number> = {};
    for (const e of entries) {
      if (!e.endTime) continue;
      const hours =
        (e.endTime.getTime() - e.startTime.getTime()) / (1000 * 60 * 60);
      const uid = String(e.userId);
      const tid = String(e.taskId);
      byUser[uid] = (byUser[uid] || 0) + hours;
      byTask[tid] = (byTask[tid] || 0) + hours;
    }

    res.status(200).json({
      message: "Time report",
      data: {
        totalHours: totalMs / (1000 * 60 * 60),
        billableHours: billableMs / (1000 * 60 * 60),
        nonBillableHours: nonBillableMs / (1000 * 60 * 60),
        entryCount: entries.length,
        byUser,
        byTask,
        entries,
      },
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};
