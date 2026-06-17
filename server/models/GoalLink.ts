import mongoose from "mongoose";

export type GoalLinkType = "GoalToProject" | "GoalToTask";

export interface IGoalLink {
    orgId: mongoose.Types.ObjectId;
    goalId: mongoose.Types.ObjectId;
    linkType: GoalLinkType;
    projectId?: mongoose.Types.ObjectId;
    taskId?: mongoose.Types.ObjectId;
}

export interface IGoalLinkDocument extends IGoalLink, mongoose.Document {
    createdAt: Date;
    updatedAt: Date;
}

const goalLinkSchema = new mongoose.Schema<IGoalLinkDocument>({
    orgId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Organization",
        required: true,
        index: true,
    },
    goalId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Goal",
        required: true,
        index: true,
    },
    linkType: {
        type: String,
        enum: ["GoalToProject", "GoalToTask"],
        required: true,
        index: true,
    },
    projectId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Project",
        required: false,
        index: true,
    },
    taskId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Task",
        required: false,
        index: true,
    },
}, { timestamps: true });

goalLinkSchema.index({ orgId: 1, goalId: 1, projectId: 1 }, { unique: true, sparse: true });
goalLinkSchema.index({ orgId: 1, goalId: 1, taskId: 1 }, { unique: true, sparse: true });

const GoalLink = mongoose.model<IGoalLinkDocument>("GoalLink", goalLinkSchema);

export default GoalLink;

