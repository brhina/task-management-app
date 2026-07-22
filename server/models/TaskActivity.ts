import mongoose from "mongoose";

export interface ITaskActivity {
  orgId: mongoose.Types.ObjectId;
  taskId: mongoose.Types.ObjectId;
  actorId: mongoose.Types.ObjectId;
  action: string;
  field?: string;
  from?: string;
  to?: string;
  meta?: Record<string, unknown>;
}

export interface ITaskActivityDocument extends ITaskActivity, mongoose.Document {
  createdAt: Date;
  updatedAt: Date;
}

const taskActivitySchema = new mongoose.Schema<ITaskActivityDocument>(
  {
    orgId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
      index: true,
    },
    taskId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Task",
      required: true,
      index: true,
    },
    actorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    action: { type: String, required: true },
    field: { type: String },
    from: { type: String },
    to: { type: String },
    meta: { type: mongoose.Schema.Types.Mixed },
  },
  { timestamps: true },
);

taskActivitySchema.index({ orgId: 1, taskId: 1, createdAt: -1 });

const TaskActivity = mongoose.model<ITaskActivityDocument>(
  "TaskActivity",
  taskActivitySchema,
);
export default TaskActivity;
