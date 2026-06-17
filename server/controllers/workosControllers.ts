import { Response } from "express";
import InsightSnapshot from "../models/InsightSnapshot.js";
import { AuthRequest } from "../middleware/authMiddleware.js";
import { buildOrgWorkosSummary, buildProjectWorkosSummary, buildUserWorkosSummary } from "../services/workosSummary.js";

async function maybeGetCachedSnapshot(params: { orgId: any; scopeType: "Org" | "Project" | "User"; scopeId: any; maxAgeMs: number }) {
    const cutoff = new Date(Date.now() - params.maxAgeMs);
    return InsightSnapshot.findOne({
        orgId: params.orgId,
        scopeType: params.scopeType,
        scopeId: params.scopeId,
        computedAt: { $gte: cutoff },
    }).sort({ computedAt: -1 });
}

export const getOrgSummary = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        if (!req.orgId) {
            res.status(400).json({ message: "Organization context is required" });
            return;
        }
        const orgId = req.orgId;
        if (req.params.id !== 'me' && String(req.params.id) !== String(orgId)) {
            res.status(403).json({ message: "Access denied. Organization mismatch." });
            return;
        }

        const cached = await maybeGetCachedSnapshot({ orgId, scopeType: "Org", scopeId: orgId, maxAgeMs: 60_000 });
        if (cached) {
            res.status(200).json({ message: "WorkOS org summary (cached)", data: cached.payload });
            return;
        }

        const payload = await buildOrgWorkosSummary({ orgId });
        await InsightSnapshot.create({ orgId, scopeType: "Org", scopeId: orgId, computedAt: new Date(), payload });
        res.status(200).json({ message: "WorkOS org summary", data: payload });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const getProjectSummary = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        if (!req.orgId) {
            res.status(400).json({ message: "Organization context is required" });
            return;
        }
        const orgId = req.orgId;
        const projectId = req.params.id;

        const cached = await maybeGetCachedSnapshot({ orgId, scopeType: "Project", scopeId: projectId, maxAgeMs: 60_000 });
        if (cached) {
            res.status(200).json({ message: "WorkOS project summary (cached)", data: cached.payload });
            return;
        }

        const payload = await buildProjectWorkosSummary({ orgId, projectId });
        await InsightSnapshot.create({ orgId, scopeType: "Project", scopeId: projectId, computedAt: new Date(), payload });
        res.status(200).json({ message: "WorkOS project summary", data: payload });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const getUserSummary = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        if (!req.orgId) {
            res.status(400).json({ message: "Organization context is required" });
            return;
        }
        const orgId = req.orgId;
        const userId = req.params.id;

        const cached = await maybeGetCachedSnapshot({ orgId, scopeType: "User", scopeId: userId, maxAgeMs: 60_000 });
        if (cached) {
            res.status(200).json({ message: "WorkOS user summary (cached)", data: cached.payload });
            return;
        }

        const payload = await buildUserWorkosSummary({ orgId, userId });
        await InsightSnapshot.create({ orgId, scopeType: "User", scopeId: userId, computedAt: new Date(), payload });
        res.status(200).json({ message: "WorkOS user summary", data: payload });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

