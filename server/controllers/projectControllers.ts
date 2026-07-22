import { Response } from "express";
import Project from "../models/Project.js";
import Task from "../models/Task.js";
import { AuthRequest } from "../middleware/authMiddleware.js";

export const listProjects = async (
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

    const filter: any = { orgId: req.orgId };
    const isSearch = Boolean(search);

    if (isSearch) {
      filter.$text = { $search: search as string };
    }

    const projection = isSearch ? { score: { $meta: "textScore" } } : {};
    const sortOptions: any = isSearch
      ? { score: { $meta: "textScore" }, createdAt: -1 }
      : { createdAt: -1 };

    const total = await Project.countDocuments(filter);

    const projects = await Project.find(filter, projection)
      .sort(sortOptions)
      .skip(skip)
      .limit(limit);

    res.status(200).json({
      message: "Projects fetched successfully",
      data: {
        projects,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const getProjectById = async (
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

    const tasks = await Task.find({ orgId: req.orgId, projectId: project._id })
      .sort({ createdAt: -1 })
      .select("title status priority dueDate assignedTo progress createdAt");

    res
      .status(200)
      .json({
        message: "Project fetched successfully",
        data: { project, tasks },
      });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const createProject = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  try {
    if (!req.orgId) {
      res.status(400).json({ message: "Organization context is required" });
      return;
    }

    const { name, description, status, startDate, targetDate, ownerId } =
      req.body;
    if (!name || !String(name).trim()) {
      res.status(400).json({ message: "Project name is required" });
      return;
    }

    const project = await Project.create({
      orgId: req.orgId,
      name: String(name).trim(),
      description: description ? String(description).trim() : undefined,
      status,
      startDate,
      targetDate,
      ownerId: ownerId || req.user._id,
    });

    res
      .status(201)
      .json({ message: "Project created successfully", data: project });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const updateProject = async (
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

    project.name = req.body.name ?? project.name;
    project.description = req.body.description ?? project.description;
    project.status = req.body.status ?? project.status;
    project.startDate = req.body.startDate ?? project.startDate;
    project.targetDate = req.body.targetDate ?? project.targetDate;
    project.ownerId = req.body.ownerId ?? project.ownerId;

    const updated = await project.save();
    res
      .status(200)
      .json({ message: "Project updated successfully", data: updated });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const deleteProject = async (
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

    await Task.updateMany(
      { orgId: req.orgId, projectId: project._id },
      { $unset: { projectId: "" } },
    );
    await project.deleteOne();
    res.status(200).json({ message: "Project deleted successfully" });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};
