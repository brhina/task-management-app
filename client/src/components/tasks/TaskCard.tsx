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
        bg-white border border-gray-200 rounded-xl p-3 cursor-grab active:cursor-grabbing
        hover:border-primary/40 hover:shadow-cardHover transition-all space-y-2.5
        ${isDragging ? 'opacity-50 shadow-xl ring-2 ring-primary/40 z-50' : ''}
      `}
    >
      <div className="flex items-start justify-between gap-2">
        <h4 className="text-xs font-bold text-slate-800 line-clamp-2 flex-1 leading-snug">
          {task.title}
        </h4>
        <span
          className={`shrink-0 inline-flex px-1.5 py-0.5 text-[9px] font-bold rounded ${getPriorityColor(task.priority)}`}
        >
          {task.priority}
        </span>
      </div>

      {task.description && (
        <p className="text-[11px] text-slate-500 line-clamp-1">{task.description}</p>
      )}

      {/* Progress Bar */}
      {task.status !== 'Pending' && task.progress != null && task.progress > 0 && (
        <div className="space-y-0.5">
          <div className="flex justify-between text-[9px] font-bold text-slate-400">
            <span>Progress</span>
            <span>{task.progress}%</span>
          </div>
          <div className="h-1 rounded-full bg-slate-100 overflow-hidden">
            <div className="h-full bg-primary rounded-full" style={{ width: `${task.progress}%` }} />
          </div>
        </div>
      )}

      {/* Footer Info */}
      <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-100">
        {task.dueDate ? (
          <span
            className={`text-[10px] font-medium ${dueDateOverdue ? 'text-rose-500 font-bold' : 'text-slate-500'}`}
          >
            {dueDateOverdue ? 'Overdue' : new Date(task.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </span>
        ) : (
          <span className="text-[10px] text-slate-400">No due date</span>
        )}

        {task.assignedTo && typeof task.assignedTo === 'object' && (
          <div className="flex items-center gap-1.5 ml-auto">
            {task.assignedTo.profileImageUrl ? (
              <img className="h-5 w-5 rounded-full ring-1 ring-slate-200" src={task.assignedTo.profileImageUrl} alt="" />
            ) : (
              <div className="h-5 w-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[8px] font-black border border-primary/20">
                {task.assignedTo.name?.charAt(0)?.toUpperCase()}
              </div>
            )}
            <span className="text-[10px] font-medium text-slate-600 truncate max-w-[80px]">
              {task.assignedTo.name?.split(' ')[0]}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
