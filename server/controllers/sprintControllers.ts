import { Response } from "express";
import Sprint from "../models/Sprint.js";
import Task from "../models/Task.js";
import Project from "../models/Project.js";
import { AuthRequest } from "../middleware/authMiddleware.js";

export const listSprints = async (
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
    if (req.query.status) filter.status = req.query.status;

    const sprints = await Sprint.find(filter).sort({ startDate: -1 });
    res.status(200).json({ message: "Sprints fetched", data: sprints });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const getSprintById = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  try {
    if (!req.orgId) {
      res.status(400).json({ message: "Organization context is required" });
      return;
    }

    const sprint = await Sprint.findOne({
      _id: req.params.id,
      orgId: req.orgId,
    });
    if (!sprint) {
      res.status(404).json({ message: "Sprint not found" });
      return;
    }

    const tasks = await Task.find({
      orgId: req.orgId,
      sprintId: sprint._id,
    }).populate("assignedTo", "name email profileImageUrl");

    const completed = tasks.filter((t) => t.status === "Completed");
    const velocityHours = completed.reduce(
      (sum, t) => sum + (t.effortHours || 0),
      0,
    );

    res.status(200).json({
      message: "Sprint fetched",
      data: {
        sprint,
        tasks,
        velocity: {
          completedTasks: completed.length,
          totalTasks: tasks.length,
          velocityHours,
        },
      },
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const createSprint = async (
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

    const sprint = await Sprint.create({
      orgId: req.orgId,
      projectId: req.body.projectId,
      name: req.body.name,
      startDate: req.body.startDate,
      endDate: req.body.endDate,
      goalIds: req.body.goalIds,
      capacityHours: req.body.capacityHours,
      status: req.body.status || "Planned",
      retrospectiveNotes: req.body.retrospectiveNotes,
      createdBy: req.user._id,
    });

    res.status(201).json({ message: "Sprint created", data: sprint });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const updateSprint = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  try {
    if (!req.orgId) {
      res.status(400).json({ message: "Organization context is required" });
      return;
    }

    const sprint = await Sprint.findOne({
      _id: req.params.id,
      orgId: req.orgId,
    });
    if (!sprint) {
      res.status(404).json({ message: "Sprint not found" });
      return;
    }

    const fields = [
      "name",
      "startDate",
      "endDate",
      "goalIds",
      "capacityHours",
      "status",
      "retrospectiveNotes",
    ] as const;
    for (const f of fields) {
      if (req.body[f] !== undefined) (sprint as any)[f] = req.body[f];
    }
    await sprint.save();
    res.status(200).json({ message: "Sprint updated", data: sprint });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const deleteSprint = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  try {
    if (!req.orgId) {
      res.status(400).json({ message: "Organization context is required" });
      return;
    }

    const sprint = await Sprint.findOne({
      _id: req.params.id,
      orgId: req.orgId,
    });
    if (!sprint) {
      res.status(404).json({ message: "Sprint not found" });
      return;
    }

    await Task.updateMany(
      { orgId: req.orgId, sprintId: sprint._id },
      { $unset: { sprintId: 1 } },
    );
    await sprint.deleteOne();
    res.status(200).json({ message: "Sprint deleted" });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const assignSprintTasks = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  try {
    if (!req.orgId) {
      res.status(400).json({ message: "Organization context is required" });
      return;
    }

    const sprint = await Sprint.findOne({
      _id: req.params.id,
      orgId: req.orgId,
    });
    if (!sprint) {
      res.status(404).json({ message: "Sprint not found" });
      return;
    }

    const { taskIds = [], unassignTaskIds = [] } = req.body;

    if (Array.isArray(taskIds) && taskIds.length > 0) {
      await Task.updateMany(
        { _id: { $in: taskIds }, orgId: req.orgId },
        { sprintId: sprint._id },
      );
    }

    if (Array.isArray(unassignTaskIds) && unassignTaskIds.length > 0) {
      await Task.updateMany(
        { _id: { $in: unassignTaskIds }, orgId: req.orgId, sprintId: sprint._id },
        { $unset: { sprintId: 1 } },
      );
    }

    const tasks = await Task.find({ orgId: req.orgId, sprintId: sprint._id });
    res.status(200).json({ message: "Sprint tasks updated", data: tasks });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};
