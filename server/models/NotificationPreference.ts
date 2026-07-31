import mongoose from "mongoose";

export type NotifyChannel = "in_app" | "email" | "both" | "none";
export type DigestFrequency = "none" | "daily" | "weekly";

export interface INotificationPreference {
  userId: mongoose.Types.ObjectId;
  taskAssigned: NotifyChannel;
  mentions: NotifyChannel;
  statusChanged: NotifyChannel;
  comments: NotifyChannel;
  dueDateReminder: NotifyChannel;
  digestFrequency: DigestFrequency;
  soundEnabled: boolean;
  doNotDisturb: boolean;
}

export interface INotificationPreferenceDocument
  extends INotificationPreference,
    mongoose.Document {
  createdAt: Date;
  updatedAt: Date;
}

const channelEnum = ["in_app", "email", "both", "none"] as const;

const notificationPreferenceSchema =
  new mongoose.Schema<INotificationPreferenceDocument>(
    {
      userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
        unique: true,
        index: true,
      },
      taskAssigned: { type: String, enum: channelEnum, default: "both" },
      mentions: { type: String, enum: channelEnum, default: "both" },
      statusChanged: { type: String, enum: channelEnum, default: "in_app" },
      comments: { type: String, enum: channelEnum, default: "in_app" },
      dueDateReminder: { type: String, enum: channelEnum, default: "both" },
      digestFrequency: {
        type: String,
        enum: ["none", "daily", "weekly"],
        default: "daily",
      },
      soundEnabled: { type: Boolean, default: true },
      doNotDisturb: { type: Boolean, default: false },
    },
    { timestamps: true },
  );

const NotificationPreference = mongoose.model<INotificationPreferenceDocument>(
  "NotificationPreference",
  notificationPreferenceSchema,
);
export default NotificationPreference;
