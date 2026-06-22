import mongoose from "mongoose";
import Task from "../../models/Task.js";
import { runAutomations } from "../../services/automationRunner.js";
import type { ExecutionContext } from "../config/context.js";

export async function listTasks(
  ctx: ExecutionContext,
  filter: {
    status?: string;
    projectId?: string;
    assignedTo?: string;
  } = {},
) {
  const query: Record<string, unknown> = { orgId: ctx.orgId };
  if (filter.status) query.status = filter.status;
  if (filter.projectId) query.projectId = filter.projectId;
  if (filter.assignedTo) query.assignedTo = filter.assignedTo;
  else if (ctx.role !== "OrgAdmin") query.assignedTo = ctx.userId;

  return Task.find(query)
    .populate("assignedTo", "name email")
    .sort({ dueDate: 1 })
    .limit(100);
}

export async function getTask(ctx: ExecutionContext, taskId: string) {
  return Task.findOne({ _id: taskId, orgId: ctx.orgId }).populate(
    "assignedTo",
    "name email",
  );
}

export async function createTask(
  ctx: ExecutionContext,
  data: {
    title: string;
    description: string;
    priority?: string;
    dueDate: Date;
    assignedTo: string;
    projectId?: string;
    goalIds?: string[];
    effortHours?: number;
    impactScore?: number;
    dryRun?: boolean;
  },
) {
  if (data.dryRun) {
    return {
      dryRun: true,
      preview: { ...data, orgId: ctx.orgId, createdBy: ctx.userId },
    };
  }

  const task = await Task.create({
    orgId: ctx.orgId,
    title: data.title,
    description: data.description,
    priority: data.priority || "Medium",
    dueDate: data.dueDate,
    assignedTo: data.assignedTo,
    projectId: data.projectId,
    goalIds: data.goalIds,
    effortHours: data.effortHours ?? 1,
    impactScore: data.impactScore ?? 5,
    createdBy: ctx.userId,
  });

  await runAutomations({
    orgId: new mongoose.Types.ObjectId(ctx.orgId),
    trigger: "task_created",
    task,
  });

  return { task };
}

export async function updateTask(
  ctx: ExecutionContext,
  taskId: string,
  data: Record<string, unknown> & { dryRun?: boolean },
) {
  const task = await Task.findOne({ _id: taskId, orgId: ctx.orgId });
  if (!task) return null;

  if (data.dryRun) {
    return { dryRun: true, preview: { ...task.toObject(), ...data } };
  }

  const fields = [
    "title",
    "description",
    "priority",
    "dueDate",
    "assignedTo",
    "projectId",
    "goalIds",
    "effortHours",
    "impactScore",
    "status",
    "blockersText",
  ] as const;

  for (const field of fields) {
    if (data[field] !== undefined) (task as any)[field] = data[field];
  }

  const updated = await task.save();
  return { task: updated };
}

export async function assignTask(
  ctx: ExecutionContext,
  taskId: string,
  assignedTo: string,
  dryRun = false,
) {
  if (ctx.role !== "OrgAdmin") {
    throw new Error("Only org admins can reassign tasks");
  }

  const task = await Task.findOne({ _id: taskId, orgId: ctx.orgId });
  if (!task) return null;

  if (dryRun) {
    return { dryRun: true, preview: { taskId, assignedTo } };
  }

  task.assignedTo = new mongoose.Types.ObjectId(assignedTo);
  const updated = await task.save();
  return { task: updated };
}
