import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import PageShell from '../../components/common/PageShell';
import api from '../../utils/axios';
import { apiPaths } from '../../utils/apiPaths';
import type { Milestone, Task } from '../../types';

interface GanttDep {
  fromTaskId: string | { _id: string };
  toTaskId: string | { _id: string };
  type?: string;
}

function dayMs(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

export default function ProjectGantt() {
  const { id } = useParams<{ id: string }>();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [deps, setDeps] = useState<GanttDep[]>([]);
  const [projectName, setProjectName] = useState('Project');
  const [dragging, setDragging] = useState<{
    taskId: string;
    edge: 'start' | 'end';
  } | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    const res = await api.get(apiPaths.PROJECTS.GANTT.replace(':id', id));
    const data = res.data.data;
    setProjectName(data.project?.name || 'Project');
    setTasks(data.tasks || []);
    setMilestones(data.milestones || []);
    setDeps(data.dependencies || []);
  }, [id]);

  useEffect(() => {
    load().catch(console.error);
  }, [load]);

  const { rangeStart, totalDays } = useMemo(() => {
    const dates: number[] = [];
    for (const t of tasks) {
      if (t.startDate) dates.push(dayMs(new Date(t.startDate)));
      if (t.dueDate) dates.push(dayMs(new Date(t.dueDate)));
    }
    for (const m of milestones) {
      dates.push(dayMs(new Date(m.targetDate)));
    }
    if (dates.length === 0) {
      const now = dayMs(new Date());
      return { rangeStart: now, totalDays: 30 };
    }
    const min = Math.min(...dates);
    const max = Math.max(...dates);
    const start = min - 2 * 86400000;
    const days = Math.max(14, Math.ceil((max - start) / 86400000) + 3);
    return { rangeStart: start, totalDays: days };
  }, [tasks, milestones]);

  const pct = (date: Date) => {
    const offset = (dayMs(date) - rangeStart) / 86400000;
    return Math.max(0, Math.min(100, (offset / totalDays) * 100));
  };

  const widthPct = (start: Date, end: Date) => {
    const s = pct(start);
    const e = pct(end);
    return Math.max(1.5, e - s);
  };

  const updateDates = async (
    taskId: string,
    startDate?: string,
    dueDate?: string,
  ) => {
    await api.put(apiPaths.TASKS.UPDATE_TASK.replace(':id', taskId), {
      startDate,
      dueDate,
    });
    await load();
  };

  const onBarMouseDown = (
    e: React.MouseEvent,
    taskId: string,
    edge: 'start' | 'end',
  ) => {
    e.preventDefault();
    e.stopPropagation();
    setDragging({ taskId, edge });
  };

  useEffect(() => {
    if (!dragging) return;
    const onMove = (e: MouseEvent) => {
      const el = document.getElementById('gantt-track');
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const x = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
      const dayOffset = Math.round((x / rect.width) * totalDays);
      const date = new Date(rangeStart + dayOffset * 86400000);
      const task = tasks.find((t) => t._id === dragging.taskId);
      if (!task) return;
      const iso = date.toISOString();
      if (dragging.edge === 'start') {
        setTasks((prev) =>
          prev.map((t) =>
            t._id === dragging.taskId ? { ...t, startDate: iso } : t,
          ),
        );
      } else {
        setTasks((prev) =>
          prev.map((t) =>
            t._id === dragging.taskId ? { ...t, dueDate: iso } : t,
          ),
        );
      }
    };
    const onUp = async () => {
      const task = tasks.find((t) => t._id === dragging.taskId);
      setDragging(null);
      if (task) {
        await updateDates(task._id, task.startDate, task.dueDate);
      }
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [dragging, rangeStart, totalDays, tasks]);

  return (
    <PageShell
      title={`Gantt — ${projectName}`}
      subtitle="Drag bar ends to adjust start/due dates"
      actions={
        <div className="flex gap-2">
          <Link to={`/admin/projects/${id}/sprints`} className="btn-secondary">
            Sprints
          </Link>
          <Link to="/admin/projects" className="btn-secondary">
            Back
          </Link>
        </div>
      }
    >
      <div className="card overflow-x-auto">
        <div className="min-w-[700px]">
          <div className="flex text-[10px] text-slate-500 mb-2 pl-40">
            {Array.from({ length: Math.min(totalDays, 45) }).map((_, i) =>
              i % 3 === 0 ? (
                <span
                  key={i}
                  style={{ width: `${(3 / totalDays) * 100}%` }}
                  className="shrink-0"
                >
                  {new Date(rangeStart + i * 86400000).toLocaleDateString(
                    'en-US',
                    { month: 'short', day: 'numeric' },
                  )}
                </span>
              ) : null,
            )}
          </div>

          {/* Milestones */}
          <div id="gantt-track" className="relative mb-4 h-6 ml-40">
            {milestones.map((m) => (
              <div
                key={m._id}
                title={m.title}
                className="absolute top-0 w-0.5 h-6 bg-amber-400"
                style={{ left: `${pct(new Date(m.targetDate))}%` }}
              >
                <span className="absolute -top-4 left-1/2 -translate-x-1/2 whitespace-nowrap text-[9px] text-amber-400">
                  {m.title}
                </span>
              </div>
            ))}
          </div>

          <ul className="space-y-2">
            {tasks.map((t) => {
              const start = new Date(t.startDate || t.dueDate);
              const end = new Date(t.dueDate);
              const left = pct(start);
              const width = widthPct(start, end);
              return (
                <li key={t._id} className="flex items-center gap-2">
                  <div className="w-40 shrink-0 text-xs text-slate-300 truncate pr-2">
                    <Link
                      to={`/admin/task/${t._id}`}
                      className="hover:text-cyan-400"
                    >
                      {t.title}
                    </Link>
                  </div>
                  <div className="flex-1 relative h-7 bg-slate-950/50 rounded">
                    <div
                      className="absolute top-1 h-5 rounded bg-cyan-600/70 border border-cyan-500/40"
                      style={{ left: `${left}%`, width: `${width}%` }}
                    >
                      <button
                        type="button"
                        className="absolute left-0 top-0 bottom-0 w-2 cursor-ew-resize bg-cyan-300/50"
                        onMouseDown={(e) => onBarMouseDown(e, t._id, 'start')}
                      />
                      <button
                        type="button"
                        className="absolute right-0 top-0 bottom-0 w-2 cursor-ew-resize bg-cyan-300/50"
                        onMouseDown={(e) => onBarMouseDown(e, t._id, 'end')}
                      />
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>

          {deps.length > 0 && (
            <p className="text-xs text-slate-500 mt-4">
              {deps.length} dependency link(s) — shown as task relationships in
              task detail.
            </p>
          )}
        </div>
      </div>
    </PageShell>
  );
}
