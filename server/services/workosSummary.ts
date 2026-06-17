import mongoose from "mongoose";
import Task from "../models/Task.js";
import User from "../models/User.js";
import OrgMembership from "../models/OrgMembership.js";
import Project from "../models/Project.js";
import Goal from "../models/Goal.js";
import { analyzeDependencies } from "./dependencyEngine.js";
import {
    urgencyScore,
    impactScorePoints,
    strategicAlignmentPoints,
    delayTolerancePenalty,
    clamp,
    classifyPriority,
    classifyRisk,
    healthFromRiskAndOverdue,
} from "./workosScoring.js";

function calcTaskRisk(task: any, blocked: boolean, assigneeOverloaded: boolean): number {
    let score = 0;
    score += urgencyScore(task); // up to 30
    if (blocked) score += 15;
    if (assigneeOverloaded) score += 15;
    if (task.progress != null && task.status !== "Completed") {
        const p = clamp(Number(task.progress), 0, 100);
        if (p === 0) score += 8;
        else if (p < 30) score += 5;
    }
    return clamp(score, 0, 100);
}

function calcTaskPriority(task: any, params: { dependencyWeight: number; riskWeight: number }): { score: number; level: string; reasoning: string[] } {
    const urgency = urgencyScore(task); // 0..30
    const impact = impactScorePoints(task.impactScore); // 0..25
    const dep = clamp(params.dependencyWeight, 0, 20);
    const risk = clamp(params.riskWeight, 0, 20);
    const align = strategicAlignmentPoints((task.goalIds || []).length); // 0..10
    const delayPenalty = delayTolerancePenalty(task.priority); // 0..8

    const score = clamp(urgency + impact + dep + risk + align - delayPenalty, 0, 100);
    const level = classifyPriority(score);

    const reasoning: string[] = [];
    if (urgency >= 20) reasoning.push("Due soon/overdue");
    if (impact >= 18) reasoning.push("High business impact");
    if (dep >= 12) reasoning.push("Dependency bottleneck");
    if (risk >= 12) reasoning.push("Elevated risk");
    if (align >= 6) reasoning.push("Aligned to goals");
    if (delayPenalty >= 6) reasoning.push("Delay tolerated (lower priority)");

    return { score, level, reasoning };
}

export async function buildOrgWorkosSummary(params: { orgId: mongoose.Types.ObjectId }) {
    const [tasks, memberships, goals, projects, depAnalysis] = await Promise.all([
        Task.find({ orgId: params.orgId }).populate("assignedTo", "name email").sort({ dueDate: 1 }),
        OrgMembership.find({ orgId: params.orgId, status: "Active" }),
        Goal.find({ orgId: params.orgId }).select("_id"),
        Project.find({ orgId: params.orgId }).select("_id status"),
        analyzeDependencies({ orgId: params.orgId }),
    ]);

    const overdue = tasks.filter((t: any) => t.status !== "Completed" && new Date(t.dueDate).getTime() < Date.now());
    const blockedSet = new Set(depAnalysis.blockedTaskIds);

    // workload: effort in next 7 days / capacity
    const capacityMap = new Map<string, number>();
    for (const m of memberships) capacityMap.set(String(m.userId), Number(m.capacityHoursPerWeek ?? 40));

    const next7 = Date.now() + 7 * 24 * 60 * 60 * 1000;
    const loadMap = new Map<string, number>();
    for (const t of tasks as any[]) {
        if (!t.assignedTo?._id) continue;
        if (t.status === "Completed") continue;
        if (t.dueDate && new Date(t.dueDate).getTime() > next7) continue;
        const uid = String(t.assignedTo._id);
        loadMap.set(uid, (loadMap.get(uid) || 0) + Number(t.effortHours ?? 1));
    }

    let totalCapacity = 0;
    let totalLoad = 0;
    let overloaded = false;
    const workloadRecommendations: string[] = [];
    for (const [uid, cap] of capacityMap.entries()) {
        totalCapacity += cap;
        const load = loadMap.get(uid) || 0;
        totalLoad += load;
        if (load > cap * 1.1) {
            overloaded = true;
            workloadRecommendations.push(`Rebalance workload: user ${uid} is over capacity (${Math.round(load)}h / ${cap}h).`);
        }
    }
    const capacityUtilization = totalCapacity > 0 ? Math.round((totalLoad / totalCapacity) * 100) : 0;

    // Per-task scoring
    const taskCards = (tasks as any[]).map((t) => {
        const isBlocked = blockedSet.has(String(t._id));
        const uid = String(t.assignedTo?._id || "");
        const cap = capacityMap.get(uid) || 40;
        const load = loadMap.get(uid) || 0;
        const assigneeOverloaded = load > cap * 1.1;
        const riskScore = calcTaskRisk(t, isBlocked, assigneeOverloaded);
        const riskWeight = Math.round((clamp(riskScore, 0, 100) / 100) * 20);
        const dependencyWeight = isBlocked ? 12 : 0;
        const p = calcTaskPriority(t, { dependencyWeight, riskWeight });
        return {
            _id: String(t._id),
            title: t.title,
            description: t.description,
            status: t.status,
            priority: { ...p },
            risk: { score: riskScore, level: classifyRisk(riskScore) },
            dueDate: t.dueDate,
            assignedTo: t.assignedTo,
            effortHours: t.effortHours,
            impactScore: t.impactScore,
            goalIds: t.goalIds || [],
            projectId: t.projectId || null,
            blocked: isBlocked,
        };
    });

    const topPriority = taskCards
        .filter(t => t.status !== "Completed")
        .sort((a, b) => (b.priority.score - a.priority.score))
        .slice(0, 10);

    const avgRisk = taskCards.length ? Math.round(taskCards.reduce((acc, t) => acc + t.risk.score, 0) / taskCards.length) : 0;
    const riskLevel = classifyRisk(avgRisk);
    const blockedCount = depAnalysis.blockedTaskIds.length;

    const health_status = healthFromRiskAndOverdue({ riskScore: avgRisk, overdueCount: overdue.length, blockedCount });

    const next_best_actions: string[] = [];
    if (overdue.length) next_best_actions.push(`Triage overdue tasks (${overdue.length}) and renegotiate due dates or scope.`);
    if (blockedCount) next_best_actions.push(`Unblock work: resolve prerequisites for ${blockedCount} blocked tasks.`);
    if (overloaded) next_best_actions.push("Rebalance capacity for overloaded assignees.");
    if (topPriority[0]) next_best_actions.push(`Start highest leverage task: "${topPriority[0].title}".`);

    const automations: string[] = [
        "On task completion: notify stakeholders and create next dependent task(s).",
        "Daily summary: send overdue + blocked + top priorities to org admins.",
        "Overdue escalation: if task overdue > 2 days, alert org admin.",
    ];

    const suggested_schedule = topPriority.slice(0, 5).map((t) => ({
        taskId: t._id,
        suggestion: `Block ${Math.max(1, Math.round(Number(t.effortHours ?? 1)))}h deep-work for "${t.title}" before ${new Date(t.dueDate).toLocaleDateString()}.`,
    }));

    const priorityScore = topPriority[0]?.priority?.score ?? 0;
    const priorityLevel = classifyPriority(priorityScore);

    return {
        summary: `Org has ${tasks.length} tasks across ${projects.length} projects and ${goals.length} goals.`,
        objective: "Maximize execution effectiveness by prioritizing high-impact, low-friction work and preventing risks early.",
        health_status,
        priority: {
            score: priorityScore,
            level: priorityLevel,
            reasoning: topPriority[0]?.priority?.reasoning ?? [],
        },
        risk: {
            score: avgRisk,
            level: riskLevel,
            risks: [
                overdue.length ? `${overdue.length} overdue tasks` : null,
                blockedCount ? `${blockedCount} blocked tasks` : null,
                overloaded ? "Capacity overload detected" : null,
            ].filter(Boolean),
            mitigations: [
                overdue.length ? "Re-plan overdue tasks: adjust due dates, split scope, or reassign." : null,
                blockedCount ? "Resolve prerequisites on the critical path first." : null,
                overloaded ? "Reassign tasks or reduce WIP for overloaded members." : null,
            ].filter(Boolean),
        },
        workload: {
            capacity_utilization: capacityUtilization,
            overloaded,
            recommendations: workloadRecommendations.length ? workloadRecommendations : ["No overload detected."],
        },
        tasks: taskCards,
        subtasks: [],
        milestones: [],
        dependencies: [],
        critical_path: depAnalysis.criticalPath,
        blockers: depAnalysis.blockedTaskIds,
        next_best_actions,
        automations,
        goal_alignment: {
            score: goals.length ? 60 : 20,
            related_goals: goals.map(g => String(g._id)).slice(0, 20),
        },
        estimated_effort: {
            hours: Math.round(taskCards.filter(t => t.status !== "Completed").reduce((acc, t) => acc + Number(t.effortHours ?? 1), 0)),
            confidence: "medium",
        },
        suggested_schedule,
        resource_requirements: [],
        recommendations: [
            "Capture effort + impact for all tasks to improve priority accuracy.",
            "Add dependencies for cross-team handoffs to prevent hidden blockers.",
            "Use goals to eliminate misaligned low-value work.",
        ],
    };
}

export async function buildProjectWorkosSummary(params: { orgId: mongoose.Types.ObjectId; projectId: string }) {
    const project = await Project.findOne({ orgId: params.orgId, _id: params.projectId });
    if (!project) throw new Error("Project not found");

    const tasks = await Task.find({ orgId: params.orgId, projectId: project._id }).populate("assignedTo", "name email");
    const orgSummary = await buildOrgWorkosSummary({ orgId: params.orgId });

    const projectTasks = (orgSummary.tasks as any[]).filter(t => String(t.projectId) === String(project._id));
    const top = projectTasks.filter(t => t.status !== "Completed").sort((a, b) => b.priority.score - a.priority.score).slice(0, 10);

    return {
        ...orgSummary,
        summary: `Project "${project.name}" has ${tasks.length} tasks.`,
        tasks: projectTasks,
        next_best_actions: [
            ...(top[0] ? [`Start: "${top[0].title}".`] : []),
            ...orgSummary.next_best_actions,
        ].slice(0, 5),
    };
}

export async function buildUserWorkosSummary(params: { orgId: mongoose.Types.ObjectId; userId: string }) {
    const user = await User.findById(params.userId).select("_id name email");
    if (!user) throw new Error("User not found");

    const tasks = await Task.find({ orgId: params.orgId, assignedTo: user._id }).populate("assignedTo", "name email");
    const orgSummary = await buildOrgWorkosSummary({ orgId: params.orgId });
    const myTasks = (orgSummary.tasks as any[]).filter(t => String(t.assignedTo?._id) === String(user._id));
    const top = myTasks.filter(t => t.status !== "Completed").sort((a, b) => b.priority.score - a.priority.score).slice(0, 10);

    return {
        ...orgSummary,
        summary: `${user.name} has ${tasks.length} tasks.`,
        tasks: myTasks,
        next_best_actions: [
            ...(top[0] ? [`Do next: "${top[0].title}".`] : []),
            ...orgSummary.next_best_actions,
        ].slice(0, 5),
    };
}

