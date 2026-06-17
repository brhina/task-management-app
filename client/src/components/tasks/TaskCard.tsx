import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { getPriorityColor } from '../../constants/taskStatus';
import { isOverdue } from '../../utils/dateUtils';
import type { Task } from '../../types';

interface TaskCardProps {
  task: Task;
  onClick?: () => void;
}

export default function TaskCard({ task, onClick }: TaskCardProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: task._id,
    data: { task },
  });

  const style = transform ? { transform: CSS.Translate.toString(transform) } : undefined;

  const dueDateOverdue = isOverdue(task.dueDate) && task.status !== 'Completed';

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      onClick={onClick}
      className={`
                bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 cursor-grab active:cursor-grabbing
                hover:border-slate-600 hover:bg-slate-750 transition-all
                ${isDragging ? 'opacity-50 shadow-lg shadow-primary/20 ring-2 ring-primary/40 z-50' : ''}
            `}
    >
      <div className="flex items-center justify-between gap-2">
        <h4 className="text-xs font-medium text-slate-200 line-clamp-1 flex-1">{task.title}</h4>
        <span
          className={`shrink-0 inline-flex px-1 py-0.5 text-[9px] font-semibold rounded ${getPriorityColor(task.priority)}`}
        >
          {task.priority.charAt(0)}
        </span>
      </div>

      <div className="flex items-center justify-between gap-2 mt-1.5">
        {task.dueDate && (
          <span
            className={`text-[10px] ${dueDateOverdue ? 'text-rose-400 font-medium' : 'text-slate-500'}`}
          >
            {new Date(task.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </span>
        )}
        {task.assignedTo && typeof task.assignedTo === 'object' && (
          <div className="flex items-center gap-1 ml-auto">
            {task.assignedTo.profileImageUrl ? (
              <img className="h-4 w-4 rounded-full" src={task.assignedTo.profileImageUrl} alt="" />
            ) : (
              <div className="h-4 w-4 rounded-full bg-primary/20 text-primary flex items-center justify-center text-[7px] font-bold">
                {task.assignedTo.name?.charAt(0)?.toUpperCase()}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
