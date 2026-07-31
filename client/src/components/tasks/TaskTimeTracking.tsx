import { useState, useEffect, useCallback, type FormEvent } from 'react';
import api from '../../utils/axios';
import { apiPaths } from '../../utils/apiPaths';
import type { TimeEntry } from '../../types';
import { Timer, Square, Play, Plus } from 'lucide-react';

interface Props {
  taskId: string;
  canEdit?: boolean;
}

export default function TaskTimeTracking({ taskId, canEdit = true }: Props) {
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [running, setRunning] = useState<TimeEntry | null>(null);
  const [manualHours, setManualHours] = useState('1');
  const [description, setDescription] = useState('');
  const [billable, setBillable] = useState(true);
  const [reportHours, setReportHours] = useState(0);

  const refresh = useCallback(async () => {
    try {
      const [listRes, reportRes] = await Promise.all([
        api.get(apiPaths.TIME_ENTRIES.LIST, { params: { taskId } }),
        api.get(apiPaths.TIME_ENTRIES.REPORT, { params: { taskId } }),
      ]);
      const list: TimeEntry[] = listRes.data.data || [];
      setEntries(list.filter((e) => !e.running));
      setRunning(list.find((e) => e.running) || null);
      setReportHours(reportRes.data.data?.totalHours || 0);
    } catch (err) {
      console.error(err);
    }
  }, [taskId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const start = async () => {
    await api.post(apiPaths.TASKS.TIMER_START.replace(':id', taskId), { billable });
    await refresh();
  };

  const stop = async () => {
    await api.post(apiPaths.TASKS.TIMER_STOP.replace(':id', taskId));
    await refresh();
  };

  const addManual = async (e: FormEvent) => {
    e.preventDefault();
    const hours = parseFloat(manualHours);
    if (!hours || hours <= 0) return;
    const end = new Date();
    const startTime = new Date(end.getTime() - hours * 3600000);
    await api.post(apiPaths.TIME_ENTRIES.CREATE, {
      taskId,
      startTime: startTime.toISOString(),
      endTime: end.toISOString(),
      description,
      billable,
    });
    setDescription('');
    await refresh();
  };

  const formatDuration = (start: string, end?: string) => {
    if (!end) return '…';
    const h = (new Date(end).getTime() - new Date(start).getTime()) / 3600000;
    return `${h.toFixed(2)}h`;
  };

  return (
    <div className="rounded-2xl border border-gray-200/60 bg-gray-100/40 p-4">
      <h3 className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
        <Timer className="w-4 h-4" /> Time tracking
      </h3>
      <p className="text-xs text-slate-500 mb-3">
        Total logged: <span className="text-slate-600">{reportHours.toFixed(2)}h</span>
      </p>
      <div className="flex flex-wrap gap-2 mb-3">
        {running ? (
          <button
            type="button"
            onClick={stop}
            className="inline-flex items-center gap-1.5 rounded-lg bg-red-600/80 px-3 py-1.5 text-sm text-slate-800 disabled:opacity-50"
            disabled={!canEdit}
          >
            <Square className="w-3.5 h-3.5" /> Stop timer
          </button>
        ) : (
          <button
            type="button"
            onClick={start}
            className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600/80 px-3 py-1.5 text-sm text-slate-800 disabled:opacity-50"
            disabled={!canEdit}
          >
            <Play className="w-3.5 h-3.5" /> Start timer
          </button>
        )}
        <label className="flex items-center gap-1.5 text-xs text-slate-500">
          <input
            type="checkbox"
            checked={billable}
            onChange={(e) => setBillable(e.target.checked)}
          />
          Billable
        </label>
      </div>
      <form onSubmit={addManual} className="flex flex-wrap gap-2 mb-3">
        <input
          type="number"
          min="0.25"
          step="0.25"
          value={manualHours}
          onChange={(e) => setManualHours(e.target.value)}
          className="w-20 rounded-lg bg-white border border-gray-200 px-2 py-1 text-sm text-slate-700"
        />
        <input
          type="text"
          placeholder="Description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="flex-1 min-w-[120px] rounded-lg bg-white border border-gray-200 px-2 py-1 text-sm text-slate-700"
        />
        <button
          type="submit"
          className="inline-flex items-center gap-1 rounded-lg border border-slate-600 px-2 py-1 text-sm text-slate-600 disabled:opacity-50"
          disabled={!canEdit}
        >
          <Plus className="w-3.5 h-3.5" /> Log
        </button>
      </form>
      <ul className="space-y-1 max-h-32 overflow-y-auto text-xs text-slate-500">
        {entries.slice(0, 10).map((e) => (
          <li key={e._id} className="flex justify-between gap-2">
            <span>{e.description || 'Time entry'}</span>
            <span>
              {formatDuration(e.startTime, e.endTime)}
              {e.billable ? '' : ' (nb)'}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
