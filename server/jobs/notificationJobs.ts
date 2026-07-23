import cron from "node-cron";
import Task from "../models/Task.js";
import User from "../models/User.js";
import NotificationPreference from "../models/NotificationPreference.js";
import OrgMembership from "../models/OrgMembership.js";
import { notifyUser } from "../services/notificationService.js";
import { emailTemplate, sendEmail } from "../services/emailService.js";

/** Due date reminders: tasks due within next 24h, not completed */
export async function processDueDateReminders(): Promise<number> {
  const now = new Date();
  const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  const tasks = await Task.find({
    status: { $ne: "Completed" },
    dueDate: { $gte: now, $lte: in24h },
    parentTaskId: { $exists: false },
  }).limit(100);

  let n = 0;
  for (const task of tasks) {
    await notifyUser({
      orgId: String(task.orgId),
      userId: String(task.assignedTo),
      type: "due_date_approaching",
      title: "Task due soon",
      message: `"${task.title}" is due ${task.dueDate.toLocaleString()}`,
      link: `/user/task/${task._id}`,
      meta: { taskId: String(task._id) },
    });
    n += 1;
  }
  return n;
}

export async function processDigests(frequency: "daily" | "weekly"): Promise<number> {
  const prefs = await NotificationPreference.find({
    digestFrequency: frequency,
  });

  let sent = 0;
  const since =
    frequency === "daily"
      ? new Date(Date.now() - 24 * 60 * 60 * 1000)
      : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  for (const pref of prefs) {
    const memberships = await OrgMembership.find({
      userId: pref.userId,
      status: "Active",
    });
    if (memberships.length === 0) continue;

    const orgIds = memberships.map((m) => m.orgId);
    const assigned = await Task.countDocuments({
      orgId: { $in: orgIds },
      assignedTo: pref.userId,
      status: { $ne: "Completed" },
    });
    const completed = await Task.countDocuments({
      orgId: { $in: orgIds },
      assignedTo: pref.userId,
      status: "Completed",
      updatedAt: { $gte: since },
    });
    const overdue = await Task.countDocuments({
      orgId: { $in: orgIds },
      assignedTo: pref.userId,
      status: { $ne: "Completed" },
      dueDate: { $lt: new Date() },
    });

    const user = await User.findById(pref.userId).select("email name");
    if (!user?.email) continue;

    const body = `
      <p>Hi ${user.name},</p>
      <p>Your ${frequency} Cadence digest:</p>
      <ul>
        <li><strong>${assigned}</strong> open tasks assigned to you</li>
        <li><strong>${completed}</strong> completed in the last ${frequency === "daily" ? "day" : "week"}</li>
        <li><strong>${overdue}</strong> overdue</li>
      </ul>
    `;

    await sendEmail({
      to: user.email,
      subject: `Cadence ${frequency} digest`,
      html: emailTemplate({
        title: `${frequency === "daily" ? "Daily" : "Weekly"} digest`,
        body,
        ctaLabel: "Open Cadence",
        ctaUrl: process.env.CLIENT_URL || "http://localhost:5173",
      }),
    });

    await notifyUser({
      orgId: String(orgIds[0]),
      userId: String(pref.userId),
      type: "digest",
      title: `${frequency === "daily" ? "Daily" : "Weekly"} digest`,
      message: `${assigned} open, ${completed} completed, ${overdue} overdue`,
      link: "/user/dashboard",
    });
    sent += 1;
  }
  return sent;
}

export function startNotificationJobs(): void {
  // Every hour: due date reminders
  cron.schedule("0 * * * *", async () => {
    try {
      const n = await processDueDateReminders();
      if (n > 0) console.log(`Due date reminders sent: ${n}`);
    } catch (err) {
      console.error("Due date reminder job failed:", err);
    }
  });

  // Daily digest at 8:00
  cron.schedule("0 8 * * *", async () => {
    try {
      const n = await processDigests("daily");
      if (n > 0) console.log(`Daily digests sent: ${n}`);
    } catch (err) {
      console.error("Daily digest job failed:", err);
    }
  });

  // Weekly digest Monday 8:00
  cron.schedule("0 8 * * 1", async () => {
    try {
      const n = await processDigests("weekly");
      if (n > 0) console.log(`Weekly digests sent: ${n}`);
    } catch (err) {
      console.error("Weekly digest job failed:", err);
    }
  });

  console.log("Notification jobs started (due reminders + digests)");
}
