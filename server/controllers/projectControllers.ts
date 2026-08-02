import { Response } from "express";
import Project from "../models/Project.js";
import Task from "../models/Task.js";
import Organization from "../models/Organization.js";
import { PLAN_LIMITS } from "../services/billingService.js";
import { AuthRequest } from "../middleware/authMiddleware.js";
import { isOrgOwnerRole } from "../constants/permissions.js";

async function userCanAccessProject(req: AuthRequest, projectId: any, ownerId: any): Promise<boolean> {
  if (isOrgOwnerRole(req.membershipRole) || req.permissions?.includes("project:manage")) {
    return true;
  }
  const userIdStr = req.user._id.toString();
  if (ownerId && ownerId.toString() === userIdStr) {
    return true;
  }
  const hasTask = await Task.exists({
    orgId: req.orgId,
    projectId,
    $or: [
      { assignedTo: req.user._id },
      { createdBy: req.user._id },
      { collaborators: req.user._id },
    ],
  });
  return Boolean(hasTask);
}

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

    let filter: any = { orgId: req.orgId };

    if (!isOrgOwnerRole(req.membershipRole) && !req.permissions?.includes("project:manage")) {
      const userTasks = await Task.find({
        orgId: req.orgId,
        $or: [
          { assignedTo: req.user._id },
          { createdBy: req.user._id },
          { collaborators: req.user._id },
        ],
      }).select("projectId");
      const projectIdsFromTasks = userTasks
        .map((t) => t.projectId)
        .filter((id) => id != null);

      filter.$or = [
        { ownerId: req.user._id },
        ...(projectIdsFromTasks.length > 0 ? [{ _id: { $in: projectIdsFromTasks } }] : []),
      ];
    }

    const isSearch = Boolean(search);

    if (isSearch) {
      filter.$text = { $search: search as string };
    }

    const projection = isSearch ? { score: { $meta: "textScore" } } : {};
    const sortOptions: any = isSearch
      ? { score: { $meta: "textScore" }, createdAt: -1 }
      : { createdAt: -1 };

    const total = await Project.countDocuments(filter);

    const rawProjects = await Project.find(filter, projection)
      .populate("ownerId", "name email")
      .sort(sortOptions)
      .skip(skip)
      .limit(limit);

    // Compute task counts & milestones/sprints metrics per project
    const Sprint = (await import("../models/Sprint.js")).default;
    const Milestone = (await import("../models/Milestone.js")).default;

    const projectsWithMetrics = await Promise.all(
      rawProjects.map(async (p) => {
        const taskQuery: any = { orgId: req.orgId, projectId: p._id };
        if (!isOrgOwnerRole(req.membershipRole) && !req.permissions?.includes("project:manage")) {
          taskQuery.$or = [
            { assignedTo: req.user._id },
            { createdBy: req.user._id },
            { collaborators: req.user._id },
          ];
        }

        const [tasks, activeSprints, milestones] = await Promise.all([
          Task.find(taskQuery).select("status dueDate progress"),
          Sprint.countDocuments({ projectId: p._id, status: "Active" }),
          Milestone.find({ projectId: p._id }).select("status targetDate"),
        ]);

        const totalTasks = tasks.length;
        const completedTasks = tasks.filter((t) => t.status === "Completed").length;
        const inProgressTasks = tasks.filter((t) => t.status === "In Progress" || t.status === "In Review").length;
        const overdueTasks = tasks.filter(
          (t) => t.status !== "Completed" && t.dueDate && new Date(t.dueDate).getTime() < Date.now()
        ).length;

        const progressPercent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

        return {
          ...p.toObject(),
          metrics: {
            totalTasks,
            completedTasks,
            inProgressTasks,
            overdueTasks,
            progressPercent,
            activeSprints,
            totalMilestones: milestones.length,
            completedMilestones: milestones.filter((m) => m.status === "Completed").length,
          },
        };
      })
    );

    res.status(200).json({
      message: "Projects fetched successfully",
      data: {
        projects: projectsWithMetrics,
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

    if (!(await userCanAccessProject(req, project._id, project.ownerId))) {
      res.status(403).json({ message: "Access denied to this project" });
      return;
    }

    const taskQuery: any = { orgId: req.orgId, projectId: project._id };
    if (!isOrgOwnerRole(req.membershipRole) && !req.permissions?.includes("project:manage")) {
      taskQuery.$or = [
        { assignedTo: req.user._id },
        { createdBy: req.user._id },
        { collaborators: req.user._id },
      ];
    }

    const tasks = await Task.find(taskQuery)
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

    // Plan quota limit check
    const org = await Organization.findById(req.orgId);
    const plan = org?.plan || "Free";
    const limits = PLAN_LIMITS[plan] || PLAN_LIMITS.Free;
    const projectCount = await Project.countDocuments({ orgId: req.orgId });

    if (projectCount >= limits.maxProjects) {
      res.status(403).json({
        message: `Plan limit reached: Your organization is on the ${plan} plan which allows a maximum of ${limits.maxProjects} projects. Upgrade your plan in Enterprise Center to create more projects.`,
        upgradeRequired: true,
      });
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

    if (!isOrgOwnerRole(req.membershipRole) && !req.permissions?.includes("project:manage")) {
      if (String(project.ownerId) !== String(req.user._id)) {
        res.status(403).json({ message: "Access denied. Only project owner or admins can update this project." });
        return;
      }
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

    if (!isOrgOwnerRole(req.membershipRole) && !req.permissions?.includes("project:delete")) {
      if (String(project.ownerId) !== String(req.user._id)) {
        res.status(403).json({ message: "Access denied. Only project owner or admins can delete this project." });
        return;
      }
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
