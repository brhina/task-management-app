import mongoose from "mongoose";
import Organization from "../models/Organization.js";
import OrgMembership from "../models/OrgMembership.js";
import Task from "../models/Task.js";
import User from "../models/User.js";
import { shortRandomId, slugify } from "../utils/slugUtils.js";

async function ensureUserOrg(userId: mongoose.Types.ObjectId, displayName: string): Promise<mongoose.Types.ObjectId> {
    const existing = await OrgMembership.findOne({ userId, status: "Active" }).sort({ createdAt: 1 });
    if (existing) return existing.orgId;

    const baseSlug = slugify(displayName) || `org-${shortRandomId(6)}`;
    let slug = baseSlug;
    // eslint-disable-next-line no-constant-condition
    while (true) {
        // eslint-disable-next-line no-await-in-loop
        const exists = await Organization.findOne({ slug }).select("_id");
        if (!exists) break;
        slug = `${baseSlug}-${shortRandomId(4)}`;
    }

    const org = await Organization.create({
        name: `${displayName}'s Workspace`,
        slug,
        createdBy: userId,
    });

    await OrgMembership.create({
        orgId: org._id,
        userId,
        role: "OrgAdmin",
        status: "Active",
    });

    return org._id;
}

export async function runLegacyOrgMigration(): Promise<void> {
    // Backfill tasks missing orgId, and ensure all existing users have at least one org.
    const users = await User.find().select("_id name email");
    const userOrgMap = new Map<string, mongoose.Types.ObjectId>();

    for (const user of users) {
        const orgId = await ensureUserOrg(user._id, user.name || user.email);
        userOrgMap.set(String(user._id), orgId);
    }

    const tasksMissingOrg = await Task.find({ orgId: { $exists: false } }).select("_id createdBy assignedTo");
    if (tasksMissingOrg.length === 0) return;

    const bulk = Task.collection.initializeUnorderedBulkOp();
    for (const task of tasksMissingOrg) {
        const ownerId = task.createdBy || task.assignedTo;
        const orgId = ownerId ? userOrgMap.get(String(ownerId)) : undefined;
        if (!orgId) continue;

        bulk.find({ _id: task._id }).updateOne({ $set: { orgId } });
    }

    if (bulk.length > 0) {
        await bulk.execute();
    }
}

