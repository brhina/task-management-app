import { Response } from "express";
import Task from "../models/Task.js";
import Milestone from "../models/Milestone.js";
import Dependency from "../models/Dependency.js";
import Project from "../models/Project.js";
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
