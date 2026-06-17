import { useDroppable } from '@dnd-kit/core';
import type { User } from '../../types';

interface UserDropZoneProps {
    user: User;
    taskCount: number;
}

export default function UserDropZone({ user, taskCount }: UserDropZoneProps) {
    const { setNodeRef, isOver } = useDroppable({
        id: `user-${user._id}`,
        data: { type: 'user', user },
    });

    const initials = user.name
        .split(' ')
        .map(n => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);

    return (
        <div
            ref={setNodeRef}
            className={`
                flex items-center gap-3 p-2.5 rounded-xl border transition-all
                ${isOver
                    ? 'border-primary bg-primary/10 ring-2 ring-primary/30 scale-[1.02]'
                    : 'border-slate-700/60 bg-slate-800/50 hover:border-slate-600 hover:bg-slate-800'
                }
            `}
        >
            {user.profileImageUrl ? (
                <img
                    className="h-8 w-8 rounded-full ring-2 ring-slate-700"
                    src={user.profileImageUrl}
                    alt={user.name}
                />
            ) : (
                <div className="h-8 w-8 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold ring-2 ring-slate-700">
                    {initials}
                </div>
            )}
            <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-slate-200 truncate">{user.name}</div>
                <div className="text-[10px] text-slate-500 truncate">{taskCount} task{taskCount !== 1 ? 's' : ''}</div>
            </div>
            {isOver && (
                <div className="text-[10px] font-semibold text-primary animate-pulse">Drop here</div>
            )}
        </div>
    );
}
