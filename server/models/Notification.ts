import mongoose from "mongoose";

export type NotificationType =
  | "task_assigned"
  | "task_status_changed"
  | "mention"
  | "comment_added"
  | "due_date_approaching"
  | "digest"
  | "general";

export interface INotification {
  orgId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  type: NotificationType;
  title: string;
  message: string;
  read: boolean;
  link?: string;
  meta?: Record<string, unknown>;
}

export interface INotificationDocument extends INotification, mongoose.Document {
  createdAt: Date;
  updatedAt: Date;
}

const notificationSchema = new mongoose.Schema<INotificationDocument>(
  {
    orgId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: [
        "task_assigned",
        "task_status_changed",
        "mention",
        "comment_added",
        "due_date_approaching",
        "digest",
        "general",
      ],
      required: true,
    },
    title: { type: String, required: true },
    message: { type: String, required: true },
    read: { type: Boolean, default: false, index: true },
    link: { type: String },
    meta: { type: mongoose.Schema.Types.Mixed },
  },
  { timestamps: true },
);

notificationSchema.index({ userId: 1, read: 1, createdAt: -1 });
notificationSchema.index({ orgId: 1, userId: 1, createdAt: -1 });

const Notification = mongoose.model<INotificationDocument>(
  "Notification",
  notificationSchema,
);
export default Notification;
