import crypto from "crypto";
import { Response } from "express";
import { AuthRequest } from "../middleware/authMiddleware.js";
import WebhookEndpoint from "../models/WebhookEndpoint.js";

export async function getWebhooksHandler(req: AuthRequest, res: Response): Promise<void> {
  try {
    const orgId = req.orgId;
    if (!orgId) {
      res.status(400).json({ message: "Organization ID required" });
      return;
    }
    const webhooks = await WebhookEndpoint.find({ orgId }).sort({ createdAt: -1 });
    res.status(200).json(webhooks);
  } catch (error: any) {
    res.status(500).json({ message: error.message || "Failed to fetch webhooks" });
  }
}

export async function createWebhookHandler(req: AuthRequest, res: Response): Promise<void> {
  try {
    const orgId = req.orgId;
    const userId = req.user?._id;
    const { name, url, events } = req.body;

    if (!orgId || !userId || !name || !url) {
      res.status(400).json({ message: "Name and Endpoint URL are required" });
      return;
    }

    const secret = `whsec_${crypto.randomBytes(24).toString("hex")}`;
    const webhook = await WebhookEndpoint.create({
      orgId,
      name,
      url,
      secret,
      events: Array.isArray(events) && events.length > 0 ? events : ["task.created", "project.updated"],
      status: "active",
      createdBy: userId,
    });

    res.status(201).json(webhook);
  } catch (error: any) {
    res.status(500).json({ message: error.message || "Failed to create webhook" });
  }
}

export async function deleteWebhookHandler(req: AuthRequest, res: Response): Promise<void> {
  try {
    const orgId = req.orgId;
    const { id } = req.params;
    await WebhookEndpoint.findOneAndDelete({ _id: id, orgId });
    res.status(200).json({ message: "Webhook deleted successfully" });
  } catch (error: any) {
    res.status(500).json({ message: error.message || "Failed to delete webhook" });
  }
}
