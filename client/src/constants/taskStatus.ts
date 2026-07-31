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
      return 'bg-amber-50 text-amber-700 border-amber-200';
    case TASK_STATUS.IN_PROGRESS:
      return 'bg-blue-50 text-blue-700 border-blue-200';
    case TASK_STATUS.IN_REVIEW:
      return 'bg-purple-50 text-purple-700 border-purple-200';
    case TASK_STATUS.COMPLETED:
      return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    default:
      return 'bg-gray-50 text-gray-600 border-gray-200';
  }
};

export const getPriorityColor = (priority: string): string => {
  switch (priority) {
    case TASK_PRIORITY.CRITICAL:
      return 'bg-red-50 text-red-700 border-red-200';
    case TASK_PRIORITY.HIGH:
      return 'bg-orange-50 text-orange-700 border-orange-200';
    case TASK_PRIORITY.MEDIUM:
      return 'bg-amber-50 text-amber-700 border-amber-200';
    case TASK_PRIORITY.LOW:
      return 'bg-gray-50 text-gray-600 border-gray-200';
    default:
      return 'bg-gray-50 text-gray-600 border-gray-200';
  }
};
