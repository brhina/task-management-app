import mongoose from "mongoose";
import Project from "../../models/Project.js";
import Task from "../../models/Task.js";
import type { ExecutionContext } from "../config/context.js";

export async function listProjects(ctx: ExecutionContext) {
  return Project.find({ orgId: ctx.orgId }).sort({ createdAt: -1 }).limit(50);
}

export async function getProject(
  ctx: ExecutionContext,
  projectId: string,
  includeTasks = false,
) {
  const project = await Project.findOne({
    _id: projectId,
    orgId: ctx.orgId,
  });
  if (!project) return null;

  if (!includeTasks) return { project, tasks: undefined };

  const tasks = await Task.find({ orgId: ctx.orgId, projectId: project._id })
    .sort({ createdAt: -1 })
    .select("title status priority dueDate assignedTo progress effortHours");

  return { project, tasks };
}

export async function createProject(
  ctx: ExecutionContext,
  data: {
    name: string;
    description?: string;
    status?: string;
    startDate?: Date;
    targetDate?: Date;
    ownerId?: string;
    dryRun?: boolean;
  },
) {
  if (data.dryRun) {
    return {
      dryRun: true,
      preview: {
        orgId: ctx.orgId,
        name: data.name,
        description: data.description,
        status: data.status || "Planned",
        startDate: data.startDate,
        targetDate: data.targetDate,
        ownerId: data.ownerId || ctx.userId,
      },
    };
  }

  const project = await Project.create({
    orgId: ctx.orgId,
    name: data.name.trim(),
    description: data.description?.trim(),
    status: data.status || "Planned",
    startDate: data.startDate,
    targetDate: data.targetDate,
    ownerId: data.ownerId || ctx.userId,
  });

  return { project };
}

export async function updateProject(
  ctx: ExecutionContext,
  projectId: string,
  data: Partial<{
    name: string;
    description: string;
    status: string;
    startDate: Date;
    targetDate: Date;
    ownerId: string;
    dryRun: boolean;
  }>,
) {
  const project = await Project.findOne({
    _id: projectId,
    orgId: ctx.orgId,
  });
  if (!project) return null;

  if (data.dryRun) {
    return {
      dryRun: true,
      preview: { ...project.toObject(), ...data },
    };
  }

  if (data.name) project.name = data.name;
  if (data.description !== undefined) project.description = data.description;
  if (data.status) project.status = data.status as any;
  if (data.startDate) project.startDate = data.startDate;
  if (data.targetDate) project.targetDate = data.targetDate;
  if (data.ownerId) project.ownerId = new mongoose.Types.ObjectId(data.ownerId);

  const updated = await project.save();
  return { project: updated };
}
