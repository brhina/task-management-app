import mongoose from "mongoose";

export interface ITodo {
    text: string;
    isCompleted: boolean;
}

export interface ITask {
    orgId: mongoose.Types.ObjectId;
    title: string;
    description: string;
    priority: 'Low' | 'Medium' | 'High';
    status: 'Pending' | 'In Progress' | 'In Review' | 'Completed';
    dueDate: Date;
    projectId?: mongoose.Types.ObjectId;
    goalIds?: mongoose.Types.ObjectId[];
    tags?: string[];
    category?: string;
    impactScore?: number; // 0-10
    effortHours?: number;
    collaborators?: mongoose.Types.ObjectId[];
    blockersText?: string[];
    assignedTo: mongoose.Types.ObjectId;
    createdBy: mongoose.Types.ObjectId;
    attachments: string[];
    todoCheckList: ITodo[];
    progress: number;
}

export interface ITaskDocument extends ITask, mongoose.Document {
    createdAt: Date;
    updatedAt: Date;
}

const todoSchema = new mongoose.Schema<ITodo>({
    text: {
        type: String,
        required: true,
    },
    isCompleted: {
        type: Boolean,
        default: false,
    },
});

const taskSchema = new mongoose.Schema<ITaskDocument>({
    orgId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Organization",
        required: true,
        index: true,
    },
    title: {
        type: String,
        required: true,
    },
    description: {
        type: String,
        required: true,
    },
    priority: {
        type: String,
        enum: ["Low", "Medium", "High"],
        default: "Medium",
    },
    status: {
        type: String,
        enum: ["Pending", "In Progress", "In Review", "Completed"],
        default: "Pending",
    },
    dueDate: {
        type: Date,
        required: true,
    },
    projectId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Project",
        required: false,
        index: true,
    },
    goalIds: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "Goal",
    }],
    tags: [{
        type: String,
        trim: true,
    }],
    category: {
        type: String,
        trim: true,
    },
    impactScore: {
        type: Number,
        min: 0,
        max: 10,
        default: 5,
    },
    effortHours: {
        type: Number,
        min: 0,
        default: 1,
    },
    collaborators: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
    }],
    blockersText: [{
        type: String,
        trim: true,
    }],
    assignedTo: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
    attachments: [{
        type: String,
    }],
    todoCheckList: [todoSchema],
    progress: {
        type: Number,
        default: 0,
    },
}, { timestamps: true });

const Task = mongoose.model<ITaskDocument>("Task", taskSchema);

export default Task;
