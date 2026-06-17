import { useCallback } from 'react';
import { useDroppable } from '@dnd-kit/core';
import TaskCard from './TaskCard';
import type { Task, TaskStatus } from '../../types';

const COLUMNS: { status: TaskStatus; label: string; color: string; headerBg: string }[] = [
    { status: 'Pending', label: 'Pending', color: 'text-yellow-400', headerBg: 'bg-yellow-500/10 border-yellow-500/20' },
    { status: 'In Progress', label: 'In Progress', color: 'text-blue-400', headerBg: 'bg-blue-500/10 border-blue-500/20' },
    { status: 'In Review', label: 'In Review', color: 'text-purple-400', headerBg: 'bg-purple-500/10 border-purple-500/20' },
    { status: 'Completed', label: 'Completed', color: 'text-green-400', headerBg: 'bg-green-500/10 border-green-500/20' },
];

function DroppableColumn({ column, tasks, onTaskClick }: {
    column: typeof COLUMNS[number];
    tasks: Task[];
    onTaskClick?: (taskId: string) => void;
}) {
    const { setNodeRef, isOver } = useDroppable({ id: column.status });

    return (
        <div className="flex flex-col min-w-0">
            <div className={`flex items-center gap-2 px-3 py-2 rounded-t-xl border ${column.headerBg}`}>
                <h3 className={`text-sm font-semibold ${column.color}`}>{column.label}</h3>
                <span className="text-xs font-medium text-slate-400 bg-slate-800 rounded-full px-2 py-0.5 tabular-nums">
                    {tasks.length}
                </span>
            </div>
            <div
                ref={setNodeRef}
                className={`
                    flex-1 rounded-b-xl p-2 space-y-2 min-h-[200px] transition-colors
                    ${isOver ? 'bg-slate-700/50 ring-2 ring-inset ring-primary/30' : 'bg-slate-800/50'}
                `}
            >
                {tasks.map(task => (
                    <TaskCard
                        key={task._id}
                        task={task}
                        onClick={() => onTaskClick?.(task._id)}
                    />
                ))}
                {tasks.length === 0 && (
                    <div className="flex items-center justify-center h-24 text-xs text-slate-500">
                        No tasks
                    </div>
                )}
            </div>
        </div>
    );
}

interface TaskBoardProps {
    tasks: Task[];
    onTaskClick?: (taskId: string) => void;
}

export default function TaskBoard({ tasks, onTaskClick }: TaskBoardProps) {
    const tasksByStatus = useCallback((status: TaskStatus) => {
        return tasks.filter(t => t.status === status);
    }, [tasks]);

    return (
        <div className="w-full overflow-hidden">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {COLUMNS.map(column => (
                    <DroppableColumn
                        key={column.status}
                        column={column}
                        tasks={tasksByStatus(column.status)}
                        onTaskClick={onTaskClick}
                    />
                ))}
            </div>
        </div>
    );
}
