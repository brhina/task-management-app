import type { Response } from "express";
import Task from "../models/Task.js";
import Project from "../models/Project.js";
import Sprint from "../models/Sprint.js";
import TaskActivity from "../models/TaskActivity.js";
import TimeEntry from "../models/TimeEntry.js";
import OrgMembership from "../models/OrgMembership.js";
import Dependency from "../models/Dependency.js";
import { AuthRequest } from "../middleware/authMiddleware.js";

function daysAgo(n: number): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - n);
  return d;
}

function toDayKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export const getTrends = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  try {
    if (!req.orgId) {
      res.status(400).json({ message: "Organization context is required" });
      return;
    }

    const days = Math.min(
      90,
      Math.max(7, parseInt(String(req.query.days || "30"), 10) || 30),
    );
    const since = daysAgo(days - 1);

    const [created, completedActivities, openByStatus] = await Promise.all([
      Task.aggregate([
        {
          $match: {
            orgId: req.orgId,
            createdAt: { $gte: since },
          },
        },
        {
          $group: {
            _id: {
              $dateToString: { format: "%Y-%m-%d", date: "$createdAt" },
            },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]),
      TaskActivity.aggregate([
        {
          $match: {
            orgId: req.orgId,
            createdAt: { $gte: since },
            $or: [
              { action: "status_changed", to: "Completed" },
              { action: "completed" },
              { field: "status", to: "Completed" },
            ],
          },
        },
        {
          $group: {
            _id: {
              $dateToString: { format: "%Y-%m-%d", date: "$createdAt" },
            },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]),
      Task.aggregate([
        { $match: { orgId: req.orgId } },
        { $group: { _id: "$status", count: { $sum: 1 } } },
      ]),
    ]);

    const createdMap = Object.fromEntries(
      created.map((r: any) => [r._id, r.count]),
    );
    const completedMap = Object.fromEntries(
      completedActivities.map((r: any) => [r._id, r.count]),
    );

    const series: {
      date: string;
      created: number;
      completed: number;
      net: number;
    }[] = [];
    for (let i = 0; i < days; i++) {
      const d = daysAgo(days - 1 - i);
      const key = toDayKey(d);
      const c = createdMap[key] || 0;
      const done = completedMap[key] || 0;
      series.push({ date: key, created: c, completed: done, net: done - c });
    }

    const statusDist = Object.fromEntries(
      openByStatus.map((r: any) => [r._id, r.count]),
    );

    // Simple predictive estimate: avg completions/day * remaining open
    const recentCompletions = series
      .slice(-7)
      .reduce((s, r) => s + r.completed, 0);
    const avgPerDay = recentCompletions / 7;
    const openTasks =
      (statusDist["Pending"] || 0) +
      (statusDist["In Progress"] || 0) +
      (statusDist["In Review"] || 0);
    const estimatedDaysToClear =
      avgPerDay > 0 ? Math.ceil(openTasks / avgPerDay) : null;

    res.status(200).json({
      message: "Trends",
      data: {
        days,
        series,
        statusDistribution: statusDist,
        productivity: {
          avgCompletionsLast7Days: Math.round(avgPerDay * 100) / 100,
          openTasks,
          estimatedDaysToClear,
        },
      },
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const getTeamPerformance = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  try {
    if (!req.orgId) {
      res.status(400).json({ message: "Organization context is required" });
      return;
    }

    const memberships = await OrgMembership.find({
      orgId: req.orgId,
      status: "Active",
    }).populate("userId", "name email profileImageUrl");

    const now = new Date();
    const weekAgo = daysAgo(7);

    const members = await Promise.all(
      memberships.map(async (m: any) => {
        const userId = m.userId?._id || m.userId;
        if (!userId) return null;

        const [assigned, completed, overdue, completedThisWeek, timeAgg] =
          await Promise.all([
            Task.countDocuments({ orgId: req.orgId, assignedTo: userId }),
            Task.countDocuments({
              orgId: req.orgId,
              assignedTo: userId,
              status: "Completed",
            }),
            Task.countDocuments({
              orgId: req.orgId,
              assignedTo: userId,
              status: { $ne: "Completed" },
              dueDate: { $lt: now },
            }),
            Task.countDocuments({
              orgId: req.orgId,
              assignedTo: userId,
              status: "Completed",
              updatedAt: { $gte: weekAgo },
            }),
            TimeEntry.aggregate([
              {
                $match: {
                  orgId: req.orgId,
                  userId,
                  endTime: { $ne: null },
                  startTime: { $gte: weekAgo },
                },
              },
              {
                $group: {
                  _id: null,
                  hours: {
                    $sum: {
                      $divide: [
                        { $subtract: ["$endTime", "$startTime"] },
                        3600000,
                      ],
                    },
                  },
                },
              },
            ]),
          ]);

        const completionRate =
          assigned > 0 ? Math.round((completed / assigned) * 100) : 0;
        const hoursLogged = Math.round((timeAgg[0]?.hours || 0) * 10) / 10;
        const capacity = m.capacityHoursPerWeek || 40;
        const workloadScore = Math.min(
          100,
          Math.round(((assigned - completed) / Math.max(1, capacity / 4)) * 100),
        );

        return {
          userId,
          name: m.userId?.name || "Unknown",
          email: m.userId?.email || "",
          profileImageUrl: m.userId?.profileImageUrl,
          role: m.role,
          assigned,
          completed,
          overdue,
          completedThisWeek,
          completionRate,
          hoursLoggedThisWeek: hoursLogged,
          capacityHoursPerWeek: capacity,
          workloadScore,
        };
      }),
    );

    const data = members.filter(Boolean).sort(
      (a: any, b: any) => b.completedThisWeek - a.completedThisWeek,
    );

    res.status(200).json({ message: "Team performance", data });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const getSprintVelocityReport = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  try {
    if (!req.orgId) {
      res.status(400).json({ message: "Organization context is required" });
      return;
    }

    const projectId = req.query.projectId as string | undefined;
    const filter: any = { orgId: req.orgId };
    if (projectId) filter.projectId = projectId;

    const sprints = await Sprint.find(filter)
      .sort({ startDate: -1 })
      .limit(20)
      .lean();

    const report = await Promise.all(
      sprints.map(async (sprint) => {
        const tasks = await Task.find({
          orgId: req.orgId,
          sprintId: sprint._id,
        }).select("status effortHours");

        const totalTasks = tasks.length;
        const completedTasks = tasks.filter(
          (t) => t.status === "Completed",
        ).length;
        const velocityHours = tasks
          .filter((t) => t.status === "Completed")
          .reduce((s, t) => s + (t.effortHours || 0), 0);
        const plannedHours = tasks.reduce(
          (s, t) => s + (t.effortHours || 0),
          0,
        );

        return {
          sprintId: sprint._id,
          name: sprint.name,
          projectId: sprint.projectId,
          status: sprint.status,
          startDate: sprint.startDate,
          endDate: sprint.endDate,
          capacityHours: sprint.capacityHours || 0,
          totalTasks,
          completedTasks,
          completionRate:
            totalTasks > 0
              ? Math.round((completedTasks / totalTasks) * 100)
              : 0,
          velocityHours,
          plannedHours,
        };
      }),
    );

    const completedSprints = report.filter((s) => s.status === "Completed");
    const avgVelocity =
      completedSprints.length > 0
        ? Math.round(
            (completedSprints.reduce((s, r) => s + r.velocityHours, 0) /
              completedSprints.length) *
              10,
          ) / 10
        : 0;

    res.status(200).json({
      message: "Sprint velocity",
      data: {
        sprints: report.reverse(),
        averageVelocityHours: avgVelocity,
      },
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const getBurndown = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  try {
    if (!req.orgId) {
      res.status(400).json({ message: "Organization context is required" });
      return;
    }

    const sprintId = req.query.sprintId as string;
    if (!sprintId) {
      res.status(400).json({ message: "sprintId is required" });
      return;
    }

    const sprint = await Sprint.findOne({
      _id: sprintId,
      orgId: req.orgId,
    });
    if (!sprint) {
      res.status(404).json({ message: "Sprint not found" });
      return;
    }

    const tasks = await Task.find({
      orgId: req.orgId,
      sprintId: sprint._id,
    }).select("_id effortHours status createdAt");

    const totalScope = tasks.reduce((s, t) => s + (t.effortHours || 1), 0);
    const taskIds = tasks.map((t) => t._id);

    const start = new Date(sprint.startDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(sprint.endDate);
    end.setHours(0, 0, 0, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const lastDay = today < end ? today : end;

    const completions = await TaskActivity.find({
      orgId: req.orgId,
      taskId: { $in: taskIds },
      createdAt: { $gte: start, $lte: new Date(end.getTime() + 86400000) },
      $or: [
        { action: "status_changed", to: "Completed" },
        { field: "status", to: "Completed" },
        { action: "completed" },
      ],
    })
      .select("taskId createdAt")
      .lean();

    const effortByTask = Object.fromEntries(
      tasks.map((t) => [String(t._id), t.effortHours || 1]),
    );

    const completedByDay: Record<string, number> = {};
    const seenTasks = new Set<string>();
    completions
      .sort(
        (a: any, b: any) =>
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
      )
      .forEach((c: any) => {
        const tid = String(c.taskId);
        if (seenTasks.has(tid)) return;
        seenTasks.add(tid);
        const key = toDayKey(new Date(c.createdAt));
        completedByDay[key] =
          (completedByDay[key] || 0) + (effortByTask[tid] || 1);
      });

    // Fallback: already-completed tasks without activity → count on sprint start
    tasks.forEach((t) => {
      if (t.status === "Completed" && !seenTasks.has(String(t._id))) {
        const key = toDayKey(start);
        completedByDay[key] =
          (completedByDay[key] || 0) + (t.effortHours || 1);
      }
    });

    const dayCount =
      Math.max(
        1,
        Math.round((end.getTime() - start.getTime()) / 86400000) + 1,
      );
    const idealPerDay = totalScope / Math.max(1, dayCount - 1);

    const points: {
      date: string;
      remaining: number;
      ideal: number;
      burned: number;
      scope: number;
    }[] = [];

    let burned = 0;
    const cursor = new Date(start);
    let dayIndex = 0;
    while (cursor <= lastDay) {
      const key = toDayKey(cursor);
      burned += completedByDay[key] || 0;
      const remaining = Math.max(0, totalScope - burned);
      const ideal = Math.max(0, totalScope - idealPerDay * dayIndex);
      points.push({
        date: key,
        remaining,
        ideal: Math.round(ideal * 10) / 10,
        burned,
        scope: totalScope,
      });
      cursor.setDate(cursor.getDate() + 1);
      dayIndex++;
    }

    // Burnup companion series
    const burnup = points.map((p) => ({
      date: p.date,
      completed: p.burned,
      scope: p.scope,
    }));

    res.status(200).json({
      message: "Burndown",
      data: {
        sprint: {
          _id: sprint._id,
          name: sprint.name,
          startDate: sprint.startDate,
          endDate: sprint.endDate,
          status: sprint.status,
        },
        totalScope,
        burndown: points,
        burnup,
      },
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const getCumulativeFlow = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  try {
    if (!req.orgId) {
      res.status(400).json({ message: "Organization context is required" });
      return;
    }

    const days = Math.min(
      60,
      Math.max(7, parseInt(String(req.query.days || "30"), 10) || 30),
    );
    const since = daysAgo(days - 1);

    const activities = await TaskActivity.find({
      orgId: req.orgId,
      createdAt: { $gte: since },
      $or: [{ field: "status" }, { action: "status_changed" }, { action: "created" }],
    })
      .select("taskId action field from to createdAt")
      .sort({ createdAt: 1 })
      .lean();

    const tasks = await Task.find({ orgId: req.orgId }).select(
      "status createdAt",
    );
    // Approximate CFD from current status + activity timeline
    const statuses = ["Pending", "In Progress", "In Review", "Completed"];

    // Build daily snapshots by replaying: start all tasks as Pending on create, then apply transitions
    type State = Record<string, string>;
    const state: State = {};
    tasks.forEach((t) => {
      if (new Date(t.createdAt) < since) {
        state[String(t._id)] = t.status;
      }
    });

    const series: {
      date: string;
      Pending: number;
      "In Progress": number;
      "In Review": number;
      Completed: number;
    }[] = [];

    const actsByDay: Record<string, typeof activities> = {};
    activities.forEach((a: any) => {
      const key = toDayKey(new Date(a.createdAt));
      if (!actsByDay[key]) actsByDay[key] = [];
      actsByDay[key].push(a);
    });

    // Also register creates on/after since
    tasks.forEach((t) => {
      if (new Date(t.createdAt) >= since) {
        const key = toDayKey(new Date(t.createdAt));
        if (!actsByDay[key]) actsByDay[key] = [];
        actsByDay[key].push({
          taskId: t._id,
          action: "created",
          to: "Pending",
          createdAt: t.createdAt,
        } as any);
      }
    });

    for (let i = 0; i < days; i++) {
      const d = daysAgo(days - 1 - i);
      const key = toDayKey(d);
      const dayActs = actsByDay[key] || [];
      dayActs.forEach((a: any) => {
        const tid = String(a.taskId);
        if (a.action === "created") {
          state[tid] = "Pending";
        } else if (a.to && statuses.includes(a.to)) {
          state[tid] = a.to;
        }
      });

      const counts: Record<string, number> = {
        Pending: 0,
        "In Progress": 0,
        "In Review": 0,
        Completed: 0,
      };
      Object.values(state).forEach((s) => {
        if (counts[s] !== undefined) counts[s]++;
      });
      series.push({
        date: key,
        Pending: counts.Pending,
        "In Progress": counts["In Progress"],
        "In Review": counts["In Review"],
        Completed: counts.Completed,
      });
    }

    res.status(200).json({ message: "Cumulative flow", data: { days, series } });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const getProjectHealth = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  try {
    if (!req.orgId) {
      res.status(400).json({ message: "Organization context is required" });
      return;
    }

    const projects = await Project.find({ orgId: req.orgId });
    const now = new Date();

    const data = await Promise.all(
      projects.map(async (project) => {
        const tasks = await Task.find({
          orgId: req.orgId,
          projectId: project._id,
        }).select("status dueDate effortHours");

        const total = tasks.length;
        const completed = tasks.filter((t) => t.status === "Completed").length;
        const overdue = tasks.filter(
          (t) =>
            t.status !== "Completed" &&
            t.dueDate &&
            new Date(t.dueDate) < now,
        ).length;
        const completionRate =
          total > 0 ? Math.round((completed / total) * 100) : 0;

        const deps = await Dependency.countDocuments({
          orgId: req.orgId,
          $or: [
            { fromTaskId: { $in: tasks.map((t) => t._id) } },
            { toTaskId: { $in: tasks.map((t) => t._id) } },
          ],
        }).catch(() => 0);

        // Health score 0-100
        let score = 100;
        score -= Math.min(40, overdue * 8);
        score -= Math.min(30, Math.max(0, 70 - completionRate) * 0.5);
        if (project.targetDate && new Date(project.targetDate) < now && project.status !== "Completed") {
          score -= 20;
        }
        score = Math.max(0, Math.min(100, Math.round(score)));

        const health =
          score >= 75 ? "healthy" : score >= 50 ? "at_risk" : "critical";

        return {
          projectId: project._id,
          name: project.name,
          status: project.status,
          targetDate: project.targetDate,
          totalTasks: total,
          completedTasks: completed,
          overdueTasks: overdue,
          completionRate,
          dependencyCount: deps,
          healthScore: score,
          health,
        };
      }),
    );

    res.status(200).json({
      message: "Project health",
      data: data.sort((a, b) => a.healthScore - b.healthScore),
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const getWorkloadHeatmap = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  try {
    if (!req.orgId) {
      res.status(400).json({ message: "Organization context is required" });
      return;
    }

    const memberships = await OrgMembership.find({
      orgId: req.orgId,
      status: "Active",
    }).populate("userId", "name");

    const now = new Date();
    const startOfWeek = daysAgo(now.getDay()); // rough week start

    const cells: {
      userId: string;
      name: string;
      day: string;
      taskCount: number;
      effortHours: number;
    }[] = [];

    for (const m of memberships) {
      const user: any = m.userId;
      if (!user?._id) continue;
      for (let i = 0; i < 7; i++) {
        const day = new Date(startOfWeek);
        day.setDate(startOfWeek.getDate() + i);
        const next = new Date(day);
        next.setDate(day.getDate() + 1);

        const tasks = await Task.find({
          orgId: req.orgId,
          assignedTo: user._id,
          status: { $ne: "Completed" },
          $or: [
            { dueDate: { $gte: day, $lt: next } },
            {
              startDate: { $lte: day },
              dueDate: { $gte: day },
            },
          ],
        }).select("effortHours");

        cells.push({
          userId: String(user._id),
          name: user.name,
          day: toDayKey(day),
          taskCount: tasks.length,
          effortHours: tasks.reduce((s, t) => s + (t.effortHours || 0), 0),
        });
      }
    }

    res.status(200).json({ message: "Workload heatmap", data: cells });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const getAnalyticsDashboard = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  try {
    if (!req.orgId) {
      res.status(400).json({ message: "Organization context is required" });
      return;
    }

    // Compose key KPIs for the analytics hub
    const now = new Date();
    const [
      totalTasks,
      completed,
      overdue,
      byPriority,
      byStatus,
      memberCount,
      projectCount,
    ] = await Promise.all([
      Task.countDocuments({ orgId: req.orgId }),
      Task.countDocuments({ orgId: req.orgId, status: "Completed" }),
      Task.countDocuments({
        orgId: req.orgId,
        status: { $ne: "Completed" },
        dueDate: { $lt: now },
      }),
      Task.aggregate([
        { $match: { orgId: req.orgId } },
        { $group: { _id: "$priority", count: { $sum: 1 } } },
      ]),
      Task.aggregate([
        { $match: { orgId: req.orgId } },
        { $group: { _id: "$status", count: { $sum: 1 } } },
      ]),
      OrgMembership.countDocuments({ orgId: req.orgId, status: "Active" }),
      Project.countDocuments({ orgId: req.orgId }),
    ]);

    res.status(200).json({
      message: "Analytics dashboard",
      data: {
        kpis: {
          totalTasks,
          completedTasks: completed,
          overdueTasks: overdue,
          completionRate:
            totalTasks > 0 ? Math.round((completed / totalTasks) * 100) : 0,
          memberCount,
          projectCount,
        },
        priorityDistribution: Object.fromEntries(
          byPriority.map((r: any) => [r._id, r.count]),
        ),
        statusDistribution: Object.fromEntries(
          byStatus.map((r: any) => [r._id, r.count]),
        ),
      },
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};
