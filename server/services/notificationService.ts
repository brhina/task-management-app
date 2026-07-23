import Notification, { type NotificationType } from "../models/Notification.js";
import NotificationPreference, {
  type NotifyChannel,
} from "../models/NotificationPreference.js";
import User from "../models/User.js";
import { emailTemplate, sendEmail } from "./emailService.js";
import { emitToUser, emitToOrg } from "./socketService.js";

const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:5173";

async function getPrefs(userId: string) {
  let prefs = await NotificationPreference.findOne({ userId });
  if (!prefs) {
    prefs = await NotificationPreference.create({ userId });
  }
  return prefs;
}

function channelAllows(
  channel: NotifyChannel,
  medium: "in_app" | "email",
): boolean {
  if (channel === "none") return false;
  if (channel === "both") return true;
  return channel === medium;
}

function prefKeyForType(
  type: NotificationType,
): keyof Awaited<ReturnType<typeof getPrefs>> | null {
  switch (type) {
    case "task_assigned":
      return "taskAssigned";
    case "mention":
      return "mentions";
    case "task_status_changed":
      return "statusChanged";
    case "comment_added":
      return "comments";
    case "due_date_approaching":
      return "dueDateReminder";
    default:
      return null;
  }
}

export async function notifyUser(params: {
  orgId: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  link?: string;
  meta?: Record<string, unknown>;
  actorId?: string;
}): Promise<void> {
  try {
    if (params.actorId && String(params.actorId) === String(params.userId)) {
      return; // don't notify yourself
    }

    const prefs = await getPrefs(params.userId);
    const key = prefKeyForType(params.type);
    const channel: NotifyChannel = key
      ? ((prefs as any)[key] as NotifyChannel)
      : "in_app";

    let notification = null;
    if (channelAllows(channel, "in_app")) {
      notification = await Notification.create({
        orgId: params.orgId,
        userId: params.userId,
        type: params.type,
        title: params.title,
        message: params.message,
        link: params.link,
        meta: params.meta,
        read: false,
      });

      emitToUser(params.userId, "notification", {
        _id: notification._id,
        type: notification.type,
        title: notification.title,
        message: notification.message,
        link: notification.link,
        read: false,
        createdAt: notification.createdAt,
      });
    }

    if (channelAllows(channel, "email")) {
      const user = await User.findById(params.userId).select("email name");
      if (user?.email) {
        const url = params.link
          ? `${CLIENT_URL}${params.link.startsWith("/") ? "" : "/"}${params.link}`
          : CLIENT_URL;
        await sendEmail({
          to: user.email,
          subject: params.title,
          html: emailTemplate({
            title: params.title,
            body: `<p>${params.message}</p>`,
            ctaLabel: "Open in Cadence",
            ctaUrl: url,
          }),
          text: params.message,
        });
      }
    }
  } catch (err) {
    console.error("notifyUser failed:", err);
  }
}

export async function notifyMany(
  userIds: string[],
  params: Omit<Parameters<typeof notifyUser>[0], "userId">,
): Promise<void> {
  const unique = [...new Set(userIds.map(String).filter(Boolean))];
  await Promise.all(unique.map((userId) => notifyUser({ ...params, userId })));
}

export function broadcastTaskUpdate(
  orgId: string,
  payload: { taskId: string; action: string; task?: unknown },
): void {
  emitToOrg(orgId, "task_updated", payload);
}
