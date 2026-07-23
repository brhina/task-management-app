import { useState, useEffect, useContext, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import PageShell from '../../components/common/PageShell';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import api from '../../utils/axios';
import { apiPaths } from '../../utils/apiPaths';
import { UserContext } from '../../context/UserContext';
import type { ProjectStatus, Task } from '../../types';

const STATUS_OPTIONS: ProjectStatus[] = ['Planned', 'Active', 'Paused', 'Completed', 'Archived'];

interface ProjectResponse {
  project: {
    _id: string;
    name: string;
    description?: string;
    status: ProjectStatus;
    startDate?: string;
    targetDate?: string;
  };
  tasks: Task[];
}

function EditProject() {
  const { user, canAccessAdminSuite, hasPermission } = useContext(UserContext);
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<ProjectStatus>('Active');
  const [startDate, setStartDate] = useState('');
  const [targetDate, setTargetDate] = useState('');
  const [saving, setSaving] = useState(false);
  const [tasks, setTasks] = useState<Task[]>([]);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    api
      .get(apiPaths.PROJECTS.GET_BY_ID.replace(':id', id))
      .then((r) => {
        const data: ProjectResponse = r.data.data || r.data;
        const proj = data.project || data;
        setName(proj.name || '');
        setDescription(proj.description || '');
        setStatus(proj.status || 'Active');
        setStartDate(proj.startDate ? new Date(proj.startDate).toISOString().slice(0, 10) : '');
        setTargetDate(proj.targetDate ? new Date(proj.targetDate).toISOString().slice(0, 10) : '');
        setTasks(data.tasks || []);
      })
      .catch((err: any) => {
        setError(err.response?.data?.message || 'Failed to load project');
      })
      .finally(() => setLoading(false));
  }, [id]);

  const totalTasks = tasks.length;
  const completedTasks = tasks.filter((t) => t.status === 'Completed').length;
  const overdueTasks = tasks.filter(
    (t) => t.status !== 'Completed' && new Date(t.dueDate) < new Date()
  ).length;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Project name is required');
      return;
    }
    try {
      setSaving(true);
      setError('');
      await api.put(apiPaths.PROJECTS.UPDATE.replace(':id', id || ''), {
        name: name.trim(),
        description: description.trim(),
        status,
        startDate: startDate || undefined,
        targetDate: targetDate || undefined,
      });
      navigate('/admin/projects');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update project');
    } finally {
      setSaving(false);
    }
  };
  if (!user || !canAccessAdminSuite()) {
    return (
      <PageShell title="Access Denied" subtitle="You don't have permission to access this page." />
    );
  }

  if (loading) {
    return (
      <PageShell title="Edit Project" subtitle="Loading project...">
        <div className="flex justify-center py-16">
          <LoadingSpinner size="lg" text="Loading project data..." />
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell title="Edit Project" subtitle="Update project details">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          {error && <div className="alert-error">{error}</div>}

          <form onSubmit={handleSubmit} className="card space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <label className="block text-xs font-medium text-slate-400 uppercase tracking-wide mb-1">
                  Project name *
                </label>
                <input
                  className="input-dark w-full"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., Q3 Customer Onboarding"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 uppercase tracking-wide mb-1">
                  Status
                </label>
                <select
                  className="input-dark w-full"
                  value={status}
                  onChange={(e) => setStatus(e.target.value as ProjectStatus)}
                >
                  {STATUS_OPTIONS.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 uppercase tracking-wide mb-1">
                Description
              </label>
              <textarea
                className="input-dark w-full"
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What outcome does this project deliver?"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 uppercase tracking-wide mb-1">
                  Start Date
                </label>
                <input
                  type="date"
                  className="input-dark w-full"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 uppercase tracking-wide mb-1">
                  Target Date
                </label>
                <input
                  type="date"
                  className="input-dark w-full"
                  value={targetDate}
                  onChange={(e) => setTargetDate(e.target.value)}
                />
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => navigate('/admin/projects')}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button className="btn-primary disabled:opacity-50" disabled={saving || !hasPermission('project:update')} type="submit">
                {saving ? 'Saving...' : 'Update Project'}
              </button>
            </div>
          </form>
        </div>

        <div className="space-y-4">
          <div className="card">
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">
              Project Stats
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-400">Total Tasks</span>
                <span className="text-sm font-bold text-slate-200">{totalTasks}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-400">Completed</span>
                <span className="text-sm font-bold text-emerald-400">{completedTasks}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-400">Overdue</span>
                <span className={`text-sm font-bold ${overdueTasks > 0 ? 'text-rose-400' : 'text-slate-400'}`}>
                  {overdueTasks}
                </span>
              </div>
              {totalTasks > 0 && (
                <div className="pt-2 border-t border-slate-700/50">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-slate-500">Completion</span>
                    <span className="text-xs font-medium text-slate-300">
                      {Math.round((completedTasks / totalTasks) * 100)}%
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full bg-slate-700 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-emerald-500 transition-all"
                      style={{ width: `${(completedTasks / totalTasks) * 100}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </PageShell>
  );
}

export default EditProject;
