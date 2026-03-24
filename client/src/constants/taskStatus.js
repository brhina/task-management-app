/**
 * Task status constants
 */
export const TASK_STATUS = {
    PENDING: 'Pending',
    IN_PROGRESS: 'In Progress',
    COMPLETED: 'Completed'
};

/**
 * Task priority constants
 */
export const TASK_PRIORITY = {
    HIGH: 'High',
    MEDIUM: 'Medium',
    LOW: 'Low'
};

/**
 * Get status color classes
 */
export const getStatusColor = (status) => {
    switch (status) {
        case TASK_STATUS.PENDING:
            return 'bg-yellow-100 text-yellow-800';
        case TASK_STATUS.IN_PROGRESS:
            return 'bg-blue-100 text-blue-800';
        case TASK_STATUS.COMPLETED:
            return 'bg-green-100 text-green-800';
        default:
            return 'bg-gray-100 text-gray-800';
    }
};

/**
 * Get priority color classes
 */
export const getPriorityColor = (priority) => {
    switch (priority) {
        case TASK_PRIORITY.HIGH:
            return 'bg-red-100 text-red-800';
        case TASK_PRIORITY.MEDIUM:
            return 'bg-yellow-100 text-yellow-800';
        case TASK_PRIORITY.LOW:
            return 'bg-green-100 text-green-800';
        default:
            return 'bg-gray-100 text-gray-800';
    }
};

