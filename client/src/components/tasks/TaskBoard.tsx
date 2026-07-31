import { useCallback } from 'react';
import { useDroppable } from '@dnd-kit/core';
import TaskCard from './TaskCard';
import type { Task, TaskStatus } from '../../types';

const COLUMNS: { status: TaskStatus; label: string; color: string; headerBg: string }[] = [
  {
    status: 'Pending',
    label: 'Pending',
    color: 'text-amber-700',
    headerBg: 'bg-amber-50 border-amber-200',
  },
  {
    status: 'In Progress',
    label: 'In Progress',
    color: 'text-blue-700',
    headerBg: 'bg-blue-50 border-blue-200',
  },
  {
    status: 'In Review',
    label: 'In Review',
    color: 'text-purple-700',
    headerBg: 'bg-purple-50 border-purple-200',
  },
  {
    status: 'Completed',
    label: 'Completed',
    color: 'text-emerald-700',
    headerBg: 'bg-emerald-50 border-emerald-200',
  },
];

function DroppableColumn({
  column,
  tasks,
  onTaskClick,
}: {
  column: (typeof COLUMNS)[number];
  tasks: Task[];
  onTaskClick?: (taskId: string) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: column.status });

  return (
    <div className="flex flex-col min-w-0">
      <div className={`flex items-center justify-between px-3.5 py-2.5 rounded-t-xl border ${column.headerBg}`}>
        <h3 className={`text-xs font-bold ${column.color}`}>{column.label}</h3>
        <span className="text-[11px] font-bold text-slate-700 bg-white border border-slate-200 rounded-full px-2 py-0.5 tabular-nums shadow-sm">
          {tasks.length}
        </span>
      </div>
      <div
        ref={setNodeRef}
        className={`
          flex-1 rounded-b-xl p-2 space-y-2 min-h-[220px] transition-colors border-x border-b border-gray-200/80
          ${isOver ? 'bg-primary/5 ring-2 ring-inset ring-primary/30' : 'bg-slate-50/50'}
        `}
      >
        {tasks.map((task) => (
          <TaskCard key={task._id} task={task} onClick={() => onTaskClick?.(task._id)} />
        ))}
        {tasks.length === 0 && (
          <div className="flex items-center justify-center h-24 text-xs font-medium text-slate-400 italic">
            No {column.label.toLowerCase()} tasks
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
  const tasksByStatus = useCallback(
    (status: TaskStatus) => {
      return tasks.filter((t) => t.status === status);
    },
    [tasks]
  );

  return (
    <div className="w-full overflow-hidden">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {COLUMNS.map((column) => (
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
