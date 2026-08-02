import { useCallback, useEffect, useState, useContext } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, Clock, Zap, Layers } from 'lucide-react';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import PageShell from '../../components/common/PageShell';
import StatCard from '../../components/common/StatCard';
import TaskBoard from '../../components/tasks/TaskBoard';
import TaskCard from '../../components/tasks/TaskCard';
import api from '../../utils/axios';
import { apiPaths } from '../../utils/apiPaths';
import { UserContext } from '../../context/UserContext';
import type { Sprint, Task, TaskStatus } from '../../types';

export default function SprintBoard() {
  const { hasPermission } = useContext(UserContext);
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [sprint, setSprint] = useState<Sprint | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [velocity, setVelocity] = useState({
    completedTasks: 0,
    totalTasks: 0,
    velocityHours: 0,
  });

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );

  const load = useCallback(async () => {
    if (!id) return;
    const res = await api.get(apiPaths.SPRINTS.GET.replace(':id', id));
    setSprint(res.data.data.sprint);
    setTasks(res.data.data.tasks || []);
    setVelocity(
      res.data.data.velocity || {
        completedTasks: 0,
        totalTasks: 0,
        velocityHours: 0,
      },
    );
  }, [id]);

  useEffect(() => {
    load().catch(console.error);
  }, [load]);

  const handleDragStart = (event: DragStartEvent) => {
    const task = tasks.find((t) => t._id === event.active.id);
    setActiveTask(task || null);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    if (!hasPermission('task:update')) return;
    setActiveTask(null);
    const { active, over } = event;
    if (!over) return;
    const newStatus = String(over.id) as TaskStatus;
    const taskId = String(active.id);
    const task = tasks.find((t) => t._id === taskId);
    if (!task || task.status === newStatus) return;
    setTasks((prev) =>
      prev.map((t) => (t._id === taskId ? { ...t, status: newStatus } : t)),
    );
    try {
      await api.put(apiPaths.TASKS.UPDATE_TASK_STATUS.replace(':id', taskId), {
        status: newStatus,
      });
      await load();
    } catch (err) {
      console.error(err);
      await load();
    }
  };

  const completionPct = velocity.totalTasks > 0
    ? Math.round((velocity.completedTasks / velocity.totalTasks) * 100)
    : 0;

  return (
    <PageShell
      title={sprint ? `Sprint board — ${sprint.name}` : 'Sprint board'}
      subtitle={
        sprint
          ? `${velocity.completedTasks}/${velocity.totalTasks} done · velocity ${velocity.velocityHours}h`
          : 'Loading…'
      }
      actions={
        sprint ? (
          <div className="flex flex-col gap-1 p-1">
            <Link
              to={`/projects/${sprint.projectId}/sprints`}
              className="w-full text-left px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-2 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-4 h-4 text-slate-500" />
              Back to Sprints
            </Link>
          </div>
        ) : null
      }
    >
      <div className="space-y-5">
        {sprint && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <StatCard
              title="Sprint Status"
              value={sprint.status}
              icon={Zap}
              colorTheme={sprint.status === 'Active' ? 'cyan' : sprint.status === 'Completed' ? 'emerald' : 'slate'}
              subtext={`Target: ${new Date(sprint.endDate).toLocaleDateString()}`}
            />
            <StatCard
              title="Tasks Completed"
              value={`${velocity.completedTasks} / ${velocity.totalTasks}`}
              icon={CheckCircle2}
              colorTheme="emerald"
              progressBarValue={completionPct}
              subtext={`${completionPct}% completion rate`}
            />
            <StatCard
              title="Sprint Velocity"
              value={`${velocity.velocityHours}h`}
              icon={Clock}
              colorTheme="indigo"
              subtext="Total effort completed"
            />
            <StatCard
              title="Active Board Tasks"
              value={tasks.length}
              icon={Layers}
              colorTheme="slate"
              subtext="Sprint board scope"
            />
          </div>
        )}

        <DndContext
          sensors={sensors}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <TaskBoard
            tasks={tasks}
            onTaskClick={(taskId) => navigate(`/tasks/${taskId}`)}
          />
          <DragOverlay>
            {activeTask ? <TaskCard task={activeTask} /> : null}
          </DragOverlay>
        </DndContext>
      </div>
    </PageShell>
  );
}
