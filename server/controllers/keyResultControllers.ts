import { Response } from "express";
import KeyResult from "../models/KeyResult.js";
import Goal from "../models/Goal.js";
import Task from "../models/Task.js";
import Project from "../models/Project.js";
import GoalLink from "../models/GoalLink.js";
import { AuthRequest } from "../middleware/authMiddleware.js";

async function computeProgress(kr: any): Promise<number> {
  if (kr.targetValue && kr.targetValue > 0 && kr.currentValue != null) {
    return Math.min(100, Math.round((kr.currentValue / kr.targetValue) * 100));
  }

  const taskIds = [...(kr.linkedTaskIds || [])];
  if ((kr.linkedProjectIds || []).length > 0) {
    const projectTasks = await Task.find({
      projectId: { $in: kr.linkedProjectIds },
    }).select("_id status");
    taskIds.push(...projectTasks.map((t) => t._id));
  }

  if (taskIds.length === 0) return 0;
  const tasks = await Task.find({ _id: { $in: taskIds } }).select("status");
  if (tasks.length === 0) return 0;
  const completed = tasks.filter((t) => t.status === "Completed").length;
  return Math.round((completed / tasks.length) * 100);
}

export const listKeyResults = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  try {
    if (!req.orgId) {
      res.status(400).json({ message: "Organization context is required" });
      return;
    }

    const filter: Record<string, unknown> = { orgId: req.orgId };
    if (req.query.objectiveId) filter.objectiveId = req.query.objectiveId;

    const krs = await KeyResult.find(filter).sort({ createdAt: 1 });
    const data = await Promise.all(
      krs.map(async (kr) => ({
        ...kr.toObject(),
        progressPercent: await computeProgress(kr),
      })),
    );
    res.status(200).json({ message: "Key results fetched", data });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const createKeyResult = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  try {
    if (!req.orgId) {
      res.status(400).json({ message: "Organization context is required" });
      return;
    }

    const goal = await Goal.findOne({
      _id: req.body.objectiveId,
      orgId: req.orgId,
    });
    if (!goal) {
      res.status(404).json({ message: "Goal not found" });
      return;
    }

    const kr = await KeyResult.create({
      orgId: req.orgId,
      objectiveId: req.body.objectiveId,
      title: req.body.title,
      metric: req.body.metric,
      targetValue: req.body.targetValue,
      currentValue: req.body.currentValue ?? 0,
      linkedProjectIds: req.body.linkedProjectIds || [],
      linkedTaskIds: req.body.linkedTaskIds || [],
    });

    res.status(201).json({
      message: "Key result created",
      data: { ...kr.toObject(), progressPercent: await computeProgress(kr) },
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const updateKeyResult = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  try {
    if (!req.orgId) {
      res.status(400).json({ message: "Organization context is required" });
      return;
    }

    const kr = await KeyResult.findOne({
      _id: req.params.id,
      orgId: req.orgId,
    });
    if (!kr) {
      res.status(404).json({ message: "Key result not found" });
      return;
    }

    const fields = [
      "title",
      "metric",
      "targetValue",
      "currentValue",
      "linkedProjectIds",
      "linkedTaskIds",
    ] as const;
    for (const f of fields) {
      if (req.body[f] !== undefined) (kr as any)[f] = req.body[f];
    }

    // Auto-sync currentValue from linked completion when requested
    if (req.body.autoProgress) {
      const pct = await computeProgress(kr);
      if (kr.targetValue) {
        kr.currentValue = Math.round((pct / 100) * kr.targetValue);
      }
    }

    await kr.save();
    res.status(200).json({
      message: "Key result updated",
      data: { ...kr.toObject(), progressPercent: await computeProgress(kr) },
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const deleteKeyResult = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  try {
    if (!req.orgId) {
      res.status(400).json({ message: "Organization context is required" });
      return;
    }

    const kr = await KeyResult.findOne({
      _id: req.params.id,
      orgId: req.orgId,
    });
    if (!kr) {
      res.status(404).json({ message: "Key result not found" });
      return;
    }
    await kr.deleteOne();
    res.status(200).json({ message: "Key result deleted" });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const getOkrTree = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  try {
    if (!req.orgId) {
      res.status(400).json({ message: "Organization context is required" });
      return;
    }

    const goal = await Goal.findOne({
      _id: req.params.id,
      orgId: req.orgId,
    });
    if (!goal) {
      res.status(404).json({ message: "Goal not found" });
      return;
    }

    const keyResults = await KeyResult.find({
      orgId: req.orgId,
      objectiveId: goal._id,
    });

    const links = await GoalLink.find({
      orgId: req.orgId,
      goalId: goal._id,
    });

    const projectIds = [
      ...new Set([
        ...links
          .filter((l) => l.linkType === "GoalToProject" && l.projectId)
          .map((l) => String(l.projectId)),
        ...keyResults.flatMap((kr) =>
          (kr.linkedProjectIds || []).map(String),
        ),
      ]),
    ];

    const projects = await Project.find({
      _id: { $in: projectIds },
      orgId: req.orgId,
    });

    const linkedTaskIds = links
      .filter((l) => l.linkType === "GoalToTask" && l.taskId)
      .map((l) => l.taskId);

    const tasks = await Task.find({
      orgId: req.orgId,
      $or: [
        { projectId: { $in: projectIds } },
        { _id: { $in: linkedTaskIds } },
        { _id: { $in: keyResults.flatMap((kr) => kr.linkedTaskIds || []) } },
      ],
    }).select("title status projectId progress dueDate");

    const krsWithProgress = await Promise.all(
      keyResults.map(async (kr) => ({
        ...kr.toObject(),
        progressPercent: await computeProgress(kr),
        projects: projects.filter((p) =>
          (kr.linkedProjectIds || []).some((id) => String(id) === String(p._id)),
        ),
        tasks: tasks.filter((t) =>
          (kr.linkedTaskIds || []).some((id) => String(id) === String(t._id)),
        ),
      })),
    );

    res.status(200).json({
      message: "OKR tree",
      data: {
        goal,
        keyResults: krsWithProgress,
        projects,
        tasks,
      },
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};
