import { useState, useEffect, useCallback } from 'react';
import api from '../../utils/axios';
import { apiPaths } from '../../utils/apiPaths';
import type { TaskActivityItem } from '../../types';
import { History } from 'lucide-react';

interface Props {
  taskId: string;
}

export default function TaskActivityFeed({ taskId }: Props) {
  const [items, setItems] = useState<TaskActivityItem[]>([]);
  const [open, setOpen] = useState(true);

  const fetchActivity = useCallback(async () => {
    try {
      const res = await api.get(apiPaths.TASKS.ACTIVITY.replace(':id', taskId));
      setItems(res.data.data || []);
    } catch (err) {
      console.error(err);
    }
  }, [taskId]);

  useEffect(() => {
    fetchActivity();
  }, [fetchActivity]);

  const actorName = (a: TaskActivityItem) =>
    typeof a.actorId === 'object' ? a.actorId.name : 'Someone';

  const label = (a: TaskActivityItem) => {
    if (a.field) return `${a.action}: ${a.field} ${a.from ?? ''} → ${a.to ?? ''}`;
    return a.action.replace(/_/g, ' ');
  };

  return (
    <div className="rounded-2xl border border-gray-200/60 bg-gray-100/40 p-4">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between text-sm font-semibold text-slate-700"
      >
        <span className="flex items-center gap-2">
          <History className="w-4 h-4" /> Activity
        </span>
        <span className="text-xs text-slate-500">{open ? 'Hide' : 'Show'}</span>
      </button>
      {open && (
        <ul className="mt-3 space-y-2 max-h-56 overflow-y-auto">
          {items.length === 0 && (
            <li className="text-sm text-slate-500">No activity yet.</li>
          )}
          {items.map((a) => (
            <li key={a._id} className="text-xs text-slate-500 border-l-2 border-gray-200 pl-2">
              <span className="text-slate-600">{actorName(a)}</span> {label(a)}
              <div className="text-slate-600">
                {new Date(a.createdAt).toLocaleString()}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
