import { useCallback, useEffect, useState, useContext, type FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Plus } from 'lucide-react';
import PageShell from '../../components/common/PageShell';
import Modal from '../../components/common/Modal';
import api from '../../utils/axios';
import { apiPaths } from '../../utils/apiPaths';
import { UserContext } from '../../context/UserContext';
import type { Milestone, Sprint, Task } from '../../types';

export default function ProjectSprints() {
  const { hasPermission } = useContext(UserContext);
  const { id } = useParams<{ id: string }>();
  const [sprints, setSprints] = useState<Sprint[]>([]);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [name, setName] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [capacityHours, setCapacityHours] = useState(40);
  const [selectedSprint, setSelectedSprint] = useState<string>('');
  const [retro, setRetro] = useState('');
  const [msTitle, setMsTitle] = useState('');
  const [msDate, setMsDate] = useState('');
  const [showCreateSprint, setShowCreateSprint] = useState(false);
  const [showCreateMilestone, setShowCreateMilestone] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    const [sRes, mRes, tRes] = await Promise.all([
      api.get(apiPaths.SPRINTS.LIST, { params: { projectId: id } }),
      api.get(apiPaths.MILESTONES.LIST, { params: { projectId: id } }),
      api.get(apiPaths.TASKS.GET_ALL_TASKS, {
        params: { projectId: id, topLevel: 'true', limit: 100 },
      }),
    ]);
    setSprints(sRes.data.data || []);
    setMilestones(mRes.data.data || []);
    setTasks(tRes.data.data?.tasks || []);
  }, [id]);

  useEffect(() => {
    load().catch(console.error);
  }, [load]);

  const createSprint = async (e: FormEvent) => {
    e.preventDefault();
    await api.post(apiPaths.SPRINTS.CREATE, {
      projectId: id,
      name,
      startDate,
      endDate,
      capacityHours,
    });
    setName('');
    setStartDate('');
    setEndDate('');
    setCapacityHours(40);
    setShowCreateSprint(false);
    await load();
  };

  const createMilestone = async (e: FormEvent) => {
    e.preventDefault();
    await api.post(apiPaths.MILESTONES.CREATE, {
      projectId: id,
      title: msTitle,
      targetDate: msDate,
    });
    setMsTitle('');
    setMsDate('');
    setShowCreateMilestone(false);
    await load();
  };

  const assignTask = async (taskId: string, sprintId: string | null) => {
    if (!sprintId) {
      await api.put(apiPaths.TASKS.UPDATE_TASK.replace(':id', taskId), {
        sprintId: null,
      });
    } else {
      await api.put(apiPaths.SPRINTS.TASKS.replace(':id', sprintId), {
        taskIds: [taskId],
      });
    }
    await load();
  };

  const saveRetro = async (sprintId: string) => {
    await api.put(apiPaths.SPRINTS.UPDATE.replace(':id', sprintId), {
      retrospectiveNotes: retro,
    });
    await load();
  };

  const loadSprintDetail = async (sprintId: string) => {
    setSelectedSprint(sprintId);
    const res = await api.get(apiPaths.SPRINTS.GET.replace(':id', sprintId));
    setRetro(res.data.data?.sprint?.retrospectiveNotes || '');
  };

  return (
    <PageShell
      title="Sprints & Milestones"
      subtitle="Plan iterations and track milestones"
      actions={
        <div className="flex gap-2">
          <button
            type="button"
            className="btn-primary"
            onClick={() => setShowCreateSprint(true)}
            disabled={!hasPermission('project:update')}
          >
            <Plus className="w-4 h-4 inline mr-1" />
            New sprint
          </button>
          <button
            type="button"
            className="btn-primary"
            onClick={() => setShowCreateMilestone(true)}
            disabled={!hasPermission('project:update')}
          >
            <Plus className="w-4 h-4 inline mr-1" />
            New milestone
          </button>
          <Link to={`/projects/${id}/gantt`} className="btn-secondary">
            Gantt
          </Link>
          <Link to="/projects" className="btn-secondary">
            Back
          </Link>
        </div>
      }
    >
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-slate-700">Sprints</h3>
          {sprints.map((s) => (
            <div key={s._id} className="card">
              <div className="flex justify-between gap-2 mb-2">
                <div>
                  <div className="text-sm text-slate-700 font-medium">{s.name}</div>
                  <div className="text-xs text-slate-500">
                    {new Date(s.startDate).toLocaleDateString()} –{' '}
                    {new Date(s.endDate).toLocaleDateString()} · {s.status}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Link
                    to={`/sprints/${s._id}/board`}
                    className="btn-secondary text-xs"
                  >
                    Board
                  </Link>
                  <button
                    type="button"
                    className="btn-secondary text-xs"
                    onClick={() => loadSprintDetail(s._id)}
                  >
                    Retro
                  </button>
                </div>
              </div>
              {selectedSprint === s._id && (
                <div className="mt-2 space-y-2">
                  <textarea
                    className="input-field w-full text-sm"
                    rows={3}
                    value={retro}
                    onChange={(e) => setRetro(e.target.value)}
                    placeholder="Retrospective notes"
                  />
                  <button
                    type="button"
                    className="btn-primary text-xs disabled:opacity-50"
                    onClick={() => saveRetro(s._id)}
                    disabled={!hasPermission('project:update')}
                  >
                    Save notes
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-slate-700">Milestones</h3>
          {milestones.map((m) => (
            <div key={m._id} className="card text-sm">
              <div className="text-slate-700 font-medium">{m.title}</div>
              <div className="text-xs text-slate-500">
                {new Date(m.targetDate).toLocaleDateString()} · {m.status} ·{' '}
                {m.progress ?? 0}%
              </div>
            </div>
          ))}

          <h3 className="text-sm font-semibold text-slate-700 pt-2">
            Assign tasks to sprint
          </h3>
          {tasks.map((t) => (
            <div
              key={t._id}
              className="flex items-center justify-between gap-2 text-sm border-b border-gray-200 py-1.5"
            >
              <span className="text-slate-600 truncate">{t.title}</span>
              <select
                className="input-field text-xs"
                value={t.sprintId || ''}
                onChange={(e) =>
                  assignTask(t._id, e.target.value || null)
                }
                disabled={!hasPermission('task:assign')}
              >
                <option value="">Unassigned</option>
                {sprints.map((s) => (
                  <option key={s._id} value={s._id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
          ))}
        </div>
      </div>

      <Modal
        isOpen={showCreateSprint}
        onClose={() => setShowCreateSprint(false)}
        title="Create Sprint"
        subtitle="Add a new sprint to this project"
        footer={
          <>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => setShowCreateSprint(false)}
            >
              Cancel
            </button>
            <button
              type="submit"
              form="create-sprint-form"
              className="btn-primary"
              disabled={!hasPermission('project:update')}
            >
              Create sprint
            </button>
          </>
        }
      >
        <form id="create-sprint-form" onSubmit={createSprint} className="space-y-4">
          <input
            className="input-field w-full text-sm"
            placeholder="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
          <input
            type="date"
            className="input-field w-full text-sm"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            required
          />
          <input
            type="date"
            className="input-field w-full text-sm"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            required
          />
          <input
            type="number"
            className="input-field w-full text-sm"
            value={capacityHours}
            onChange={(e) => setCapacityHours(Number(e.target.value))}
            placeholder="Capacity hours"
          />
        </form>
      </Modal>

      <Modal
        isOpen={showCreateMilestone}
        onClose={() => setShowCreateMilestone(false)}
        title="Create Milestone"
        subtitle="Add a new milestone to this project"
        footer={
          <>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => setShowCreateMilestone(false)}
            >
              Cancel
            </button>
            <button
              type="submit"
              form="create-milestone-form"
              className="btn-primary"
              disabled={!hasPermission('project:update')}
            >
              Create milestone
            </button>
          </>
        }
      >
        <form id="create-milestone-form" onSubmit={createMilestone} className="space-y-4">
          <input
            className="input-field w-full text-sm"
            placeholder="Title"
            value={msTitle}
            onChange={(e) => setMsTitle(e.target.value)}
            required
          />
          <input
            type="date"
            className="input-field w-full text-sm"
            value={msDate}
            onChange={(e) => setMsDate(e.target.value)}
            required
          />
        </form>
      </Modal>
    </PageShell>
  );
}
