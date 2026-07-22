import mongoose from "mongoose";

export interface ITimeEntry {
  orgId: mongoose.Types.ObjectId;
  taskId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  startTime: Date;
  endTime?: Date;
  description?: string;
  billable: boolean;
  running: boolean;
}

export interface ITimeEntryDocument extends ITimeEntry, mongoose.Document {
  createdAt: Date;
  updatedAt: Date;
}

const timeEntrySchema = new mongoose.Schema<ITimeEntryDocument>(
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
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    startTime: { type: Date, required: true },
    endTime: { type: Date },
    description: { type: String, trim: true },
    billable: { type: Boolean, default: true },
    running: { type: Boolean, default: false, index: true },
  },
  { timestamps: true },
);

timeEntrySchema.index({ orgId: 1, taskId: 1, startTime: -1 });
timeEntrySchema.index({ orgId: 1, userId: 1, running: 1 });

const TimeEntry = mongoose.model<ITimeEntryDocument>("TimeEntry", timeEntrySchema);
export default TimeEntry;
