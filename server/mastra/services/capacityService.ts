import mongoose from "mongoose";
import OrgMembership from "../../models/OrgMembership.js";
import Task from "../../models/Task.js";
import User from "../../models/User.js";
import type { ExecutionContext } from "../config/context.js";

export async function getCapacity(ctx: ExecutionContext) {
  const memberships = await OrgMembership.find({
    orgId: ctx.orgId,
    status: "Active",
  });

  const users = await User.find({
    _id: { $in: memberships.map((m) => m.userId) },
  }).select("name email");

  const userMap = new Map(users.map((u) => [String(u._id), u]));

  return memberships.map((m) => ({
    userId: String(m.userId),
    name: userMap.get(String(m.userId))?.name,
    email: userMap.get(String(m.userId))?.email,
    capacityHoursPerWeek: Number(m.capacityHoursPerWeek ?? 40),
    role: m.role,
  }));
}

export async function getWorkload(ctx: ExecutionContext, daysAhead = 7) {
  const cutoff = Date.now() + daysAhead * 24 * 60 * 60 * 1000;
  const tasks = await Task.find({
    orgId: ctx.orgId,
    status: { $ne: "Completed" },
    dueDate: { $lte: new Date(cutoff) },
  }).populate("assignedTo", "name email");

  const loadMap = new Map<string, { hours: number; taskCount: number }>();
  for (const t of tasks) {
    const uid = String((t as any).assignedTo?._id || t.assignedTo);
    const entry = loadMap.get(uid) || { hours: 0, taskCount: 0 };
    entry.hours += Number(t.effortHours ?? 1);
    entry.taskCount += 1;
    loadMap.set(uid, entry);
  }

  return Array.from(loadMap.entries()).map(([userId, data]) => ({
    userId,
    ...data,
  }));
}

export async function calculateUtilization(ctx: ExecutionContext) {
  const [capacity, workload] = await Promise.all([
    getCapacity(ctx),
    getWorkload(ctx),
  ]);

  const workloadMap = new Map(workload.map((w) => [w.userId, w.hours]));

  return capacity.map((c) => {
    const load = workloadMap.get(c.userId) || 0;
    const weeklyCapacity = c.capacityHoursPerWeek;
    const utilizationPercent =
      weeklyCapacity > 0
        ? Math.round((load / weeklyCapacity) * 100)
        : 0;
    return {
      ...c,
      workloadHours: load,
      utilizationPercent,
      overloaded: utilizationPercent > 100,
    };
  });
}

export async function getOrgIdObjectId(orgId: string) {
  return new mongoose.Types.ObjectId(orgId);
}
