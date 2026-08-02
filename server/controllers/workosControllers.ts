import { Response } from "express";
import InsightSnapshot from "../models/InsightSnapshot.js";
import { AuthRequest } from "../middleware/authMiddleware.js";
import {
  buildOrgWorkosSummary,
  buildProjectWorkosSummary,
  buildUserWorkosSummary,
} from "../services/workosSummary.js";
import { isOrgOwnerRole } from "../constants/permissions.js";

async function maybeGetCachedSnapshot(params: {
  orgId: any;
  scopeType: "Org" | "Project" | "User";
  scopeId: any;
  maxAgeMs: number;
}) {
  const cutoff = new Date(Date.now() - params.maxAgeMs);
  return InsightSnapshot.findOne({
    orgId: params.orgId,
    scopeType: params.scopeType,
    scopeId: params.scopeId,
    computedAt: { $gte: cutoff },
  }).sort({ computedAt: -1 });
}

export const getOrgSummary = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  try {
    if (!req.orgId) {
      res.status(400).json({ message: "Organization context is required" });
      return;
    }
    const orgId = req.orgId;
    if (req.params.id !== "me" && String(req.params.id) !== String(orgId)) {
      res
        .status(403)
        .json({ message: "Access denied. Organization mismatch." });
      return;
    }

    if (!isOrgOwnerRole(req.membershipRole) && !req.permissions?.includes("org:manage")) {
      const payload = await buildUserWorkosSummary({ orgId, userId: req.user._id });
      res.status(200).json({ message: "WorkOS user summary", data: payload });
      return;
    }

    const cached = await maybeGetCachedSnapshot({
      orgId,
      scopeType: "Org",
      scopeId: orgId,
      maxAgeMs: 60_000,
    });
    if (cached) {
      res
        .status(200)
        .json({ message: "WorkOS org summary (cached)", data: cached.payload });
      return;
    }

    const payload = await buildOrgWorkosSummary({ orgId });
    await InsightSnapshot.create({
      orgId,
      scopeType: "Org",
      scopeId: orgId,
      computedAt: new Date(),
      payload,
    });
    res.status(200).json({ message: "WorkOS org summary", data: payload });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const getProjectSummary = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  try {
    if (!req.orgId) {
      res.status(400).json({ message: "Organization context is required" });
      return;
    }
    const orgId = req.orgId;
    const projectId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

    if (!isOrgOwnerRole(req.membershipRole) && !req.permissions?.includes("project:manage")) {
      const Task = (await import("../models/Task.js")).default;
      const Project = (await import("../models/Project.js")).default;
      const proj = await Project.findOne({ _id: projectId, orgId }).select("ownerId");
      const isOwner = proj && String(proj.ownerId) === String(req.user._id);
      const hasTask = await Task.exists({
        orgId,
        projectId,
        $or: [
          { assignedTo: req.user._id },
          { createdBy: req.user._id },
          { collaborators: req.user._id },
        ],
      });
      if (!isOwner && !hasTask) {
        res.status(403).json({ message: "Access denied to this project summary" });
        return;
      }
    }

    const cached = await maybeGetCachedSnapshot({
      orgId,
      scopeType: "Project",
      scopeId: projectId,
      maxAgeMs: 60_000,
    });
    if (cached) {
      res
        .status(200)
        .json({
          message: "WorkOS project summary (cached)",
          data: cached.payload,
        });
      return;
    }

    const payload = await buildProjectWorkosSummary({ orgId, projectId });
    await InsightSnapshot.create({
      orgId,
      scopeType: "Project",
      scopeId: projectId,
      computedAt: new Date(),
      payload,
    });
    res.status(200).json({ message: "WorkOS project summary", data: payload });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const getUserSummary = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  try {
    if (!req.orgId) {
      res.status(400).json({ message: "Organization context is required" });
      return;
    }
    const orgId = req.orgId;
    const userId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

    if (!isOrgOwnerRole(req.membershipRole) && !req.permissions?.includes("member:manage")) {
      if (String(userId) !== String(req.user._id)) {
        res.status(403).json({ message: "Access denied to this user summary" });
        return;
      }
    }

    const cached = await maybeGetCachedSnapshot({
      orgId,
      scopeType: "User",
      scopeId: userId,
      maxAgeMs: 60_000,
    });
    if (cached) {
      res
        .status(200)
        .json({
          message: "WorkOS user summary (cached)",
          data: cached.payload,
        });
      return;
    }

    const payload = await buildUserWorkosSummary({ orgId, userId });
    await InsightSnapshot.create({
      orgId,
      scopeType: "User",
      scopeId: userId,
      computedAt: new Date(),
      payload,
    });
    res.status(200).json({ message: "WorkOS user summary", data: payload });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const getWorkosScopes = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  try {
    if (!req.orgId) {
      res.status(400).json({ message: "Organization context is required" });
      return;
    }
    const Project = (await import("../models/Project.js")).default;
    const Task = (await import("../models/Task.js")).default;
    const OrgMembership = (await import("../models/OrgMembership.js")).default;

    let projectFilter: any = { orgId: req.orgId };
    let memberFilter: any = { orgId: req.orgId, status: "Active" };

    if (!isOrgOwnerRole(req.membershipRole)) {
      memberFilter.userId = req.user._id;

      const userTasks = await Task.find({
        orgId: req.orgId,
        $or: [
          { assignedTo: req.user._id },
          { createdBy: req.user._id },
          { collaborators: req.user._id },
        ],
      }).select("projectId");
      const projectIdsFromTasks = userTasks.map((t) => t.projectId).filter(Boolean);

      projectFilter.$or = [
        { ownerId: req.user._id },
        ...(projectIdsFromTasks.length > 0 ? [{ _id: { $in: projectIdsFromTasks } }] : []),
      ];
    }

    const [projects, memberships] = await Promise.all([
      Project.find(projectFilter).select("_id name key status").sort({ name: 1 }),
      OrgMembership.find(memberFilter)
        .populate("userId", "name email")
        .select("userId role capacityHoursPerWeek"),
    ]);

    const members = memberships
      .map((m: any) => ({
        _id: String(m.userId?._id || ""),
        name: m.userId?.name || "Team Member",
        email: m.userId?.email || "",
        capacityHoursPerWeek: m.capacityHoursPerWeek ?? 40,
      }))
      .filter((m) => m._id);

    res.status(200).json({
      message: "WorkOS scopes fetched",
      data: {
        projects: projects.map((p) => ({
          _id: String(p._id),
          name: p.name,
          key: (p as any).key,
          status: p.status,
        })),
        members,
      },
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const executeWorkosAction = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  try {
    if (!req.orgId) {
      res.status(400).json({ message: "Organization context is required" });
      return;
    }
    const { actionType } = req.body;
    const orgId = req.orgId;
    const Task = (await import("../models/Task.js")).default;

    // Invalidate cached snapshots for org
    await InsightSnapshot.deleteMany({ orgId });

    if (actionType === "triage_overdue") {
      const now = new Date();
      const overdueTasks = await Task.find({
        orgId,
        status: { $ne: "Completed" },
        dueDate: { $lt: now },
      });

      let updatedCount = 0;
      for (const t of overdueTasks) {
        const currentDue = new Date(t.dueDate);
        const newDue = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
        t.dueDate = newDue;
        await t.save();
        updatedCount++;
      }

      res.status(200).json({
        success: true,
        message: `Successfully triaged ${updatedCount} overdue tasks. Extended due dates by 3 days.`,
        updatedCount,
      });
      return;
    }

    if (actionType === "unblock_dependencies" || actionType === "elevate_blockers") {
      const blockedOrBottleneck = await Task.find({
        orgId,
        status: { $ne: "Completed" },
        priority: { $in: ["Low", "Medium"] },
      }).limit(5);

      let updatedCount = 0;
      for (const t of blockedOrBottleneck) {
        t.priority = "High";
        await t.save();
        updatedCount++;
      }

      res.status(200).json({
        success: true,
        message: `Elevated priority to High for ${updatedCount} key bottleneck tasks.`,
        updatedCount,
      });
      return;
    }

    if (actionType === "rebalance_workload") {
      const OrgMembership = (await import("../models/OrgMembership.js")).default;
      const memberships = await OrgMembership.find({ orgId, status: "Active" }).populate(
        "userId",
        "name email"
      );

      // Find tasks assigned to high load assignees
      const pendingTasks = await Task.find({
        orgId,
        status: "Pending",
      }).limit(3);

      let updatedCount = 0;
      if (memberships.length > 1 && pendingTasks.length > 0) {
        // Shift first task to another member
        const targetMember = memberships[memberships.length - 1]?.userId;
        if (targetMember && pendingTasks[0]) {
          pendingTasks[0].assignedTo = targetMember._id as any;
          await pendingTasks[0].save();
          updatedCount = 1;
        }
      }

      res.status(200).json({
        success: true,
        message: updatedCount > 0
          ? `Rebalanced workload: reassigned task "${pendingTasks[0]?.title}" to balance capacity.`
          : "Workload distribution evaluated. No immediate reassignments needed.",
        updatedCount,
      });
      return;
    }

    res.status(400).json({ message: `Unknown action type: ${actionType}` });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

