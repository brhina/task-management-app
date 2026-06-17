import { Request } from 'express';

export interface IUser {
  _id: string;
  name: string;
  email: string;
  password: string;
  profileImageUrl?: string;
  role: 'Admin' | 'Member';
  createdAt: Date;
  updatedAt: Date;
}

export interface ITodoItem {
  text: string;
  isCompleted: boolean;
}

export interface ITask {
  _id: string;
  title: string;
  description: string;
  priority: 'Low' | 'Medium' | 'High';
  status: 'Pending' | 'In Progress' | 'In Review' | 'Completed';
  dueDate: Date;
  assignedTo: string | IUser;
  createdBy: string;
  attachments: string[];
  todoCheckList: ITodoItem[];
  progress: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface AuthRequest extends Request {
  user?: IUser;
}

export interface AuthResponseBody {
  message: string;
  token?: string;
  user?: {
    _id: string;
    name: string;
    email: string;
    role: string;
    profileImageUrl?: string;
    token?: string;
  };
  _id?: string;
  name?: string;
  email?: string;
  role?: string;
  profileImageUrl?: string;
}

export interface TaskListResponse {
  message: string;
  data: {
    tasks: ITask[];
    statusSummary: {
      all: number;
      pending: number;
      inProgress: number;
      inReview: number;
      completed: number;
    };
  };
}

export interface DashboardResponse {
  statistics: {
    allTasks: number;
    pendingTasks: number;
    completedTasks: number;
    overdueTasks: number;
  };
  charts: {
    taskDistribution: Record<string, number>;
    taskPriorityLevels: Record<string, number>;
  };
  recentTasks: ITask[];
  recentCompletedTasks: ITask[];
}

export interface JwtPayload {
  id: string;
  iat: number;
  exp: number;
}
