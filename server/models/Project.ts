import mongoose from "mongoose";

export type ProjectStatus = "Planned" | "Active" | "Paused" | "Completed" | "Archived";

export interface IProject {
    orgId: mongoose.Types.ObjectId;
    name: string;
    description?: string;
    ownerId: mongoose.Types.ObjectId;
    status: ProjectStatus;
    startDate?: Date;
    targetDate?: Date;
}

export interface IProjectDocument extends IProject, mongoose.Document {
    createdAt: Date;
    updatedAt: Date;
}

const projectSchema = new mongoose.Schema<IProjectDocument>({
    orgId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Organization",
        required: true,
        index: true,
    },
    name: {
        type: String,
        required: true,
        trim: true,
    },
    description: {
        type: String,
        required: false,
        trim: true,
    },
    ownerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
        index: true,
    },
    status: {
        type: String,
        enum: ["Planned", "Active", "Paused", "Completed", "Archived"],
        default: "Active",
        index: true,
    },
    startDate: {
        type: Date,
        required: false,
    },
    targetDate: {
        type: Date,
        required: false,
    },
}, { timestamps: true });

projectSchema.index({ orgId: 1, name: 1 });

const Project = mongoose.model<IProjectDocument>("Project", projectSchema);

export default Project;

