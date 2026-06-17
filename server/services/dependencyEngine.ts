import mongoose from "mongoose";
import Dependency, { type IDependencyDocument } from "../models/Dependency.js";
import Task from "../models/Task.js";

type NodeId = string;

export interface DependencyAnalysis {
    cycles: NodeId[][];
    blockedTaskIds: NodeId[];
    criticalPath: NodeId[];
    bottlenecks: Array<{ taskId: NodeId; blockedDependents: number }>;
}

function buildAdjacency(edges: Array<{ from: NodeId; to: NodeId }>): Map<NodeId, NodeId[]> {
    const adj = new Map<NodeId, NodeId[]>();
    for (const { from, to } of edges) {
        const list = adj.get(from) || [];
        list.push(to);
        adj.set(from, list);
        if (!adj.has(to)) adj.set(to, []);
    }
    return adj;
}

function findCycles(adj: Map<NodeId, NodeId[]>): NodeId[][] {
    const visited = new Set<NodeId>();
    const inStack = new Set<NodeId>();
    const stack: NodeId[] = [];
    const cycles: NodeId[][] = [];

    const dfs = (u: NodeId) => {
        visited.add(u);
        inStack.add(u);
        stack.push(u);

        for (const v of adj.get(u) || []) {
            if (!visited.has(v)) {
                dfs(v);
            } else if (inStack.has(v)) {
                const idx = stack.indexOf(v);
                if (idx >= 0) cycles.push(stack.slice(idx));
            }
        }

        stack.pop();
        inStack.delete(u);
    };

    for (const node of adj.keys()) {
        if (!visited.has(node)) dfs(node);
    }
    return cycles;
}

function topoSort(adj: Map<NodeId, NodeId[]>): NodeId[] {
    const inDeg = new Map<NodeId, number>();
    for (const [u, vs] of adj.entries()) {
        if (!inDeg.has(u)) inDeg.set(u, 0);
        for (const v of vs) {
            inDeg.set(v, (inDeg.get(v) || 0) + 1);
        }
    }

    const q: NodeId[] = [];
    for (const [n, d] of inDeg.entries()) {
        if (d === 0) q.push(n);
    }

    const out: NodeId[] = [];
    while (q.length) {
        const n = q.shift()!;
        out.push(n);
        for (const v of adj.get(n) || []) {
            inDeg.set(v, (inDeg.get(v) || 0) - 1);
            if (inDeg.get(v) === 0) q.push(v);
        }
    }
    return out;
}

export async function analyzeDependencies(params: { orgId: mongoose.Types.ObjectId }): Promise<DependencyAnalysis> {
    const [deps, tasks] = await Promise.all([
        Dependency.find({ orgId: params.orgId, status: "Active" }).select("fromTaskId toTaskId type"),
        Task.find({ orgId: params.orgId }).select("_id status effortHours"),
    ]);

    const taskStatus = new Map<NodeId, string>();
    const effort = new Map<NodeId, number>();
    for (const t of tasks) {
        const id = String(t._id);
        taskStatus.set(id, t.status);
        effort.set(id, Number(t.effortHours ?? 1));
    }

    const edges = deps
        .filter((d: IDependencyDocument) => d.type === "FS")
        .map((d: any) => ({ from: String(d.fromTaskId), to: String(d.toTaskId) }))
        .filter(e => taskStatus.has(e.from) && taskStatus.has(e.to));

    const adj = buildAdjacency(edges);
    const cycles = findCycles(adj);

    // blocked = has incoming prereq not completed
    const incoming = new Map<NodeId, NodeId[]>();
    for (const { from, to } of edges) {
        const list = incoming.get(to) || [];
        list.push(from);
        incoming.set(to, list);
    }

    const blockedTaskIds: NodeId[] = [];
    for (const [to, prereqs] of incoming.entries()) {
        const blocked = prereqs.some(p => taskStatus.get(p) !== "Completed");
        if (blocked && taskStatus.get(to) !== "Completed") blockedTaskIds.push(to);
    }

    // bottlenecks: tasks that block many dependents
    const blockedDependentsCount = new Map<NodeId, number>();
    for (const [to, prereqs] of incoming.entries()) {
        if (taskStatus.get(to) === "Completed") continue;
        for (const p of prereqs) {
            if (taskStatus.get(p) !== "Completed") {
                blockedDependentsCount.set(p, (blockedDependentsCount.get(p) || 0) + 1);
            }
        }
    }

    const bottlenecks = Array.from(blockedDependentsCount.entries())
        .map(([taskId, blockedDependents]) => ({ taskId, blockedDependents }))
        .sort((a, b) => b.blockedDependents - a.blockedDependents)
        .slice(0, 10);

    // critical path: longest path by effort in DAG (ignore cycles by using topo sort output)
    const order = topoSort(adj);
    const dist = new Map<NodeId, number>();
    const prev = new Map<NodeId, NodeId | null>();
    for (const n of order) {
        dist.set(n, effort.get(n) || 1);
        prev.set(n, null);
    }
    for (const u of order) {
        const base = dist.get(u) || 0;
        for (const v of adj.get(u) || []) {
            const cand = base + (effort.get(v) || 1);
            if (cand > (dist.get(v) || 0)) {
                dist.set(v, cand);
                prev.set(v, u);
            }
        }
    }
    let end: NodeId | null = null;
    let best = -Infinity;
    for (const [n, d] of dist.entries()) {
        if (d > best) {
            best = d;
            end = n;
        }
    }
    const criticalPath: NodeId[] = [];
    while (end) {
        criticalPath.unshift(end);
        end = prev.get(end) || null;
    }

    return { cycles, blockedTaskIds, criticalPath, bottlenecks };
}

