import { Response } from "express";
import Milestone from "../models/Milestone.js";
import Task from "../models/Task.js";
import Project from "../models/Project.js";
import { AuthRequest } from "../middleware/authMiddleware.js";

async function withProgress(milestone: any) {
  const taskIds = milestone.taskIds || [];
  if (taskIds.length === 0) {
    return { ...milestone.toObject(), progress: 0, completedTasks: 0, totalTasks: 0 };
  }
  const tasks = await Task.find({ _id: { $in: taskIds } }).select("status");
  const completed = tasks.filter((t) => t.status === "Completed").length;
  const progress =
    tasks.length > 0 ? Math.round((completed / tasks.length) * 100) : 0;
  return {
    ...milestone.toObject(),
    progress,
    completedTasks: completed,
    totalTasks: tasks.length,
  };
}

export const listMilestones = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  try {
    if (!req.orgId) {
      res.status(400).json({ message: "Organization context is required" });
      return;
    }

    const filter: Record<string, unknown> = { orgId: req.orgId };
    if (req.query.projectId) filter.projectId = req.query.projectId;

    const milestones = await Milestone.find(filter).sort({ targetDate: 1 });
    const data = await Promise.all(milestones.map(withProgress));
    res.status(200).json({ message: "Milestones fetched", data });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const getMilestoneById = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  try {
    if (!req.orgId) {
      res.status(400).json({ message: "Organization context is required" });
      return;
    }

    const milestone = await Milestone.findOne({
      _id: req.params.id,
      orgId: req.orgId,
    });
    if (!milestone) {
      res.status(404).json({ message: "Milestone not found" });
      return;
    }

    const data = await withProgress(milestone);
    const tasks = await Task.find({
      _id: { $in: milestone.taskIds || [] },
      orgId: req.orgId,
    }).populate("assignedTo", "name email");

    res.status(200).json({ message: "Milestone fetched", data: { ...data, tasks } });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const createMilestone = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  try {
    if (!req.orgId) {
      res.status(400).json({ message: "Organization context is required" });
      return;
    }

    const project = await Project.findOne({
      _id: req.body.projectId,
      orgId: req.orgId,
    });
    if (!project) {
      res.status(404).json({ message: "Project not found" });
      return;
    }

    const milestone = await Milestone.create({
      orgId: req.orgId,
      projectId: req.body.projectId,
      title: req.body.title,
      description: req.body.description,
      targetDate: req.body.targetDate,
      status: req.body.status || "Planned",
      taskIds: req.body.taskIds || [],
    });

    res.status(201).json({
      message: "Milestone created",
      data: await withProgress(milestone),
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const updateMilestone = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  try {
    if (!req.orgId) {
      res.status(400).json({ message: "Organization context is required" });
      return;
    }

    const milestone = await Milestone.findOne({
      _id: req.params.id,
      orgId: req.orgId,
    });
    if (!milestone) {
      res.status(404).json({ message: "Milestone not found" });
      return;
    }

    const fields = [
      "title",
      "description",
      "targetDate",
      "status",
      "taskIds",
    ] as const;
    for (const f of fields) {
      if (req.body[f] !== undefined) (milestone as any)[f] = req.body[f];
    }
    await milestone.save();
    res.status(200).json({
      message: "Milestone updated",
      data: await withProgress(milestone),
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const deleteMilestone = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  try {
    if (!req.orgId) {
      res.status(400).json({ message: "Organization context is required" });
      return;
    }

    const milestone = await Milestone.findOne({
      _id: req.params.id,
      orgId: req.orgId,
    });
    if (!milestone) {
      res.status(404).json({ message: "Milestone not found" });
      return;
    }
    await milestone.deleteOne();
    res.status(200).json({ message: "Milestone deleted" });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const linkMilestoneTasks = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  try {
    if (!req.orgId) {
      res.status(400).json({ message: "Organization context is required" });
      return;
    }

    const milestone = await Milestone.findOne({
      _id: req.params.id,
      orgId: req.orgId,
    });
    if (!milestone) {
      res.status(404).json({ message: "Milestone not found" });
      return;
    }

    const { taskIds = [], unlinkTaskIds = [] } = req.body;
    const current = new Set((milestone.taskIds || []).map(String));
    for (const id of taskIds) current.add(String(id));
    for (const id of unlinkTaskIds) current.delete(String(id));
    milestone.taskIds = [...current] as any;
    await milestone.save();

    res.status(200).json({
      message: "Milestone tasks updated",
      data: await withProgress(milestone),
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};
