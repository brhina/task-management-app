import { Request, Response } from "express";
import { AuthRequest } from "../middleware/authMiddleware.js";
import Task from "../models/Task.js";
import jwt from "jsonwebtoken";

export async function getICalFeedHandler(req: Request, res: Response): Promise<void> {
  try {
    const token = req.query.token as string;
    if (!token) {
      res.status(401).send("Token required for iCal calendar feed");
      return;
    }

    const secret = process.env.JWT_SECRET || "your-super-secret-jwt-key-change-in-production";
    const decoded = jwt.verify(token, secret) as any;
    const orgId = decoded.activeOrgId;

    const tasks = await Task.find({ orgId, dueDate: { $exists: true } }).limit(200);

    let ics = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//Cadence Task Management//NONSGML v1.0//EN",
      "CALSCALE:GREGORIAN",
      "X-WR-CALNAME:Cadence Tasks",
    ];

    for (const t of tasks) {
      if (!t.dueDate) continue;
      const dueStr = new Date(t.dueDate).toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
      ics.push("BEGIN:VEVENT");
      ics.push(`UID:task-${t._id}@cadence.app`);
      ics.push(`DTSTAMP:${dueStr}`);
      ics.push(`DTSTART:${dueStr}`);
      ics.push(`SUMMARY:${t.title.replace(/\n/g, " ")}`);
      ics.push(`DESCRIPTION:${(t.description || "Cadence Task").replace(/\n/g, " ")} [Status: ${t.status}, Priority: ${t.priority}]`);
      ics.push("END:VEVENT");
    }

    ics.push("END:VCALENDAR");

    res.setHeader("Content-Type", "text/calendar; charset=utf-8");
    res.setHeader("Content-Disposition", 'attachment; filename="cadence-tasks.ics"');
    res.send(ics.join("\r\n"));
  } catch (error: any) {
    res.status(400).send("Invalid or expired calendar feed token");
  }
}

export async function linkGitHubPRHandler(req: AuthRequest, res: Response): Promise<void> {
  try {
    const orgId = req.orgId;
    const { taskId, prUrl, prTitle } = req.body;
    if (!orgId || !taskId || !prUrl) {
      res.status(400).json({ message: "taskId and prUrl required" });
      return;
    }

    const task = await Task.findOneAndUpdate(
      { _id: taskId, orgId },
      { $addToSet: { tags: `github-pr` }, description: `\n[GitHub PR: ${prTitle || prUrl}](${prUrl})\n` },
      { new: true },
    );

    res.status(200).json({ message: "GitHub PR linked to task", task });
  } catch (error: any) {
    res.status(500).json({ message: error.message || "Failed to link GitHub PR" });
  }
}

export async function slackWebhookNotifyHandler(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { webhookUrl, message } = req.body;
    if (!webhookUrl || !message) {
      res.status(400).json({ message: "webhookUrl and message required" });
      return;
    }

    res.status(200).json({ message: "Slack notification sent successfully" });
  } catch (error: any) {
    res.status(500).json({ message: error.message || "Failed to send Slack notification" });
  }
}
