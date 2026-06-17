import type { TaskStatus, TaskPriority } from '../types';

export const TASK_STATUS: Record<string, TaskStatus> = {
  PENDING: 'Pending',
  IN_PROGRESS: 'In Progress',
  IN_REVIEW: 'In Review',
  COMPLETED: 'Completed',
};

export const TASK_PRIORITY: Record<string, TaskPriority> = {
  CRITICAL: 'Critical',
  HIGH: 'High',
  MEDIUM: 'Medium',
  LOW: 'Low',
};

export const getStatusColor = (status: string): string => {
  switch (status) {
    case TASK_STATUS.PENDING:
      return 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30';
    case TASK_STATUS.IN_PROGRESS:
      return 'bg-blue-500/15 text-blue-400 border-blue-500/30';
    case TASK_STATUS.IN_REVIEW:
      return 'bg-purple-500/15 text-purple-400 border-purple-500/30';
    case TASK_STATUS.COMPLETED:
      return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30';
    default:
      return 'bg-slate-500/15 text-slate-400 border-slate-500/30';
  }
};

export const getPriorityColor = (priority: string): string => {
  switch (priority) {
    case TASK_PRIORITY.CRITICAL:
      return 'bg-rose-500/15 text-rose-400 border-rose-500/30';
    case TASK_PRIORITY.HIGH:
      return 'bg-orange-500/15 text-orange-400 border-orange-500/30';
    case TASK_PRIORITY.MEDIUM:
      return 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30';
    case TASK_PRIORITY.LOW:
      return 'bg-slate-500/15 text-slate-400 border-slate-500/30';
    default:
      return 'bg-slate-500/15 text-slate-400 border-slate-500/30';
  }
};
