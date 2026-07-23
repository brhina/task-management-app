import cron from "node-cron";
import Organization from "../models/Organization.js";
import OrgMembership from "../models/OrgMembership.js";
import Task from "../models/Task.js";
import User from "../models/User.js";
import { emailTemplate, sendEmail } from "../services/emailService.js";
import {
  roleHasPermission,
} from "../constants/permissions.js";
import CustomRole from "../models/CustomRole.js";

async function membershipCanViewReports(membership: any): Promise<boolean> {
  if (membership.role === "Custom" && membership.customRoleId) {
    const custom = await CustomRole.findById(membership.customRoleId).lean();
    return Boolean(custom?.permissions?.includes("report:view"));
  }
  return roleHasPermission(membership.role, "report:view");
}

/** Weekly org analytics email to members with report:view */
export async function processScheduledReports(): Promise<number> {
  const orgs = await Organization.find({}).select("_id name");
  let sent = 0;
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  for (const org of orgs) {
    const [total, completed, overdue, completedWeek] = await Promise.all([
      Task.countDocuments({ orgId: org._id }),
      Task.countDocuments({ orgId: org._id, status: "Completed" }),
      Task.countDocuments({
        orgId: org._id,
        status: { $ne: "Completed" },
        dueDate: { $lt: now },
      }),
      Task.countDocuments({
        orgId: org._id,
        status: "Completed",
        updatedAt: { $gte: weekAgo },
      }),
    ]);

    const completionRate =
      total > 0 ? Math.round((completed / total) * 100) : 0;

    const memberships = await OrgMembership.find({
      orgId: org._id,
      status: "Active",
    });

    for (const membership of memberships) {
      const allowed = await membershipCanViewReports(membership);
      if (!allowed) continue;

      const user = await User.findById(membership.userId).select("email name");
      if (!user?.email) continue;

      const body = `
        <p>Hi ${user.name},</p>
        <p>Weekly analytics for <strong>${org.name}</strong>:</p>
        <ul>
          <li><strong>${total}</strong> total tasks (${completionRate}% complete)</li>
          <li><strong>${completedWeek}</strong> completed this week</li>
          <li><strong>${overdue}</strong> currently overdue</li>
        </ul>
        <p>Open Reports for trends, burndown, and team performance.</p>
      `;

      await sendEmail({
        to: user.email,
        subject: `${org.name} — weekly analytics report`,
        html: emailTemplate({
          title: "Weekly analytics report",
          body,
          ctaLabel: "Open Reports",
          ctaUrl: `${process.env.CLIENT_URL || "http://localhost:5173"}/admin/reports`,
        }),
      });
      sent += 1;
    }
  }

  return sent;
}

export function startReportJobs(): void {
  // Monday 9:00 — weekly scheduled reports
  cron.schedule("0 9 * * 1", async () => {
    try {
      const n = await processScheduledReports();
      if (n > 0) console.log(`Scheduled analytics reports sent: ${n}`);
    } catch (err) {
      console.error("Scheduled report job failed:", err);
    }
  });

  console.log("Report jobs started (weekly analytics email)");
}
