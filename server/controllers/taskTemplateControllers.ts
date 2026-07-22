import { Response } from "express";
import TaskTemplate from "../models/TaskTemplate.js";
import Task from "../models/Task.js";
import { AuthRequest } from "../middleware/authMiddleware.js";
import { logTaskActivity } from "../services/activityLogger.js";

export const listTemplates = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  try {
    if (!req.orgId) {
      res.status(400).json({ message: "Organization context is required" });
      return;
    }

    const templates = await TaskTemplate.find({ orgId: req.orgId }).sort({
      name: 1,
    });
    res.status(200).json({ message: "Templates fetched", data: templates });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const getTemplate = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  try {
    if (!req.orgId) {
      res.status(400).json({ message: "Organization context is required" });
      return;
    }

    const template = await TaskTemplate.findOne({
      _id: req.params.id,
      orgId: req.orgId,
    });
    if (!template) {
      res.status(404).json({ message: "Template not found" });
      return;
    }
    res.status(200).json({ message: "Template fetched", data: template });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const createTemplate = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  try {
    if (!req.orgId) {
      res.status(400).json({ message: "Organization context is required" });
      return;
    }

    const template = await TaskTemplate.create({
      orgId: req.orgId,
      name: req.body.name,
      title: req.body.title,
      description: req.body.description,
      priority: req.body.priority || "Medium",
      tags: req.body.tags,
      category: req.body.category,
      impactScore: req.body.impactScore,
      effortHours: req.body.effortHours,
      checklist: req.body.checklist || [],
      customFields: req.body.customFields || {},
      createdBy: req.user._id,
    });

    res.status(201).json({ message: "Template created", data: template });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const updateTemplate = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  try {
    if (!req.orgId) {
      res.status(400).json({ message: "Organization context is required" });
      return;
    }

    const template = await TaskTemplate.findOne({
      _id: req.params.id,
      orgId: req.orgId,
    });
    if (!template) {
      res.status(404).json({ message: "Template not found" });
      return;
    }

    const fields = [
      "name",
      "title",
      "description",
      "priority",
      "tags",
      "category",
      "impactScore",
      "effortHours",
      "checklist",
      "customFields",
    ] as const;
    for (const f of fields) {
      if (req.body[f] !== undefined) (template as any)[f] = req.body[f];
    }
    await template.save();
    res.status(200).json({ message: "Template updated", data: template });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const deleteTemplate = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  try {
    if (!req.orgId) {
      res.status(400).json({ message: "Organization context is required" });
      return;
    }

    const template = await TaskTemplate.findOne({
      _id: req.params.id,
      orgId: req.orgId,
    });
    if (!template) {
      res.status(404).json({ message: "Template not found" });
      return;
    }
    await template.deleteOne();
    res.status(200).json({ message: "Template deleted" });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const createTaskFromTemplate = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  try {
    if (!req.orgId) {
      res.status(400).json({ message: "Organization context is required" });
      return;
    }

    const template = await TaskTemplate.findOne({
      _id: req.params.id,
      orgId: req.orgId,
    });
    if (!template) {
      res.status(404).json({ message: "Template not found" });
      return;
    }

    const assignedTo = req.body.assignedTo || req.user._id;
    const dueDate = req.body.dueDate || new Date(Date.now() + 7 * 86400000);

    const task = await Task.create({
      orgId: req.orgId,
      title: req.body.title || template.title,
      description: template.description,
      priority: template.priority,
      status: "Pending",
      dueDate,
      startDate: req.body.startDate,
      projectId: req.body.projectId,
      tags: template.tags,
      category: template.category,
      impactScore: template.impactScore,
      effortHours: template.effortHours,
      assignedTo,
      createdBy: req.user._id,
      attachments: [],
      todoCheckList: (template.checklist || []).map((c) => ({
        text: c.text,
        isCompleted: false,
      })),
      progress: 0,
      customFields: template.customFields || {},
    });

    await logTaskActivity({
      orgId: req.orgId,
      taskId: task._id,
      actorId: req.user._id,
      action: "created_from_template",
      meta: { templateId: String(template._id) },
    });

    res.status(201).json({ message: "Task created from template", data: task });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const saveTaskAsTemplate = async (
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

    const customFields =
      task.customFields instanceof Map
        ? Object.fromEntries(task.customFields)
        : task.customFields || {};

    const template = await TaskTemplate.create({
      orgId: req.orgId,
      name: req.body.name || `${task.title} Template`,
      title: task.title,
      description: task.description,
      priority: task.priority,
      tags: task.tags,
      category: task.category,
      impactScore: task.impactScore,
      effortHours: task.effortHours,
      checklist: (task.todoCheckList || []).map((c) => ({
        text: c.text,
        isCompleted: false,
      })),
      customFields,
      createdBy: req.user._id,
    });

    res.status(201).json({ message: "Saved as template", data: template });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};
