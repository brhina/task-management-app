import { useState, useEffect, useContext, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Modal from '../../components/common/Modal';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import api from '../../utils/axios';
import { apiPaths } from '../../utils/apiPaths';
import { UserContext } from '../../context/UserContext';
import Projects from './Projects';
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

export interface EditProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string | null;
  onUpdated?: () => void;
}

export function EditProjectModal({ isOpen, onClose, projectId, onUpdated }: EditProjectModalProps) {
  const { hasPermission } = useContext(UserContext);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<ProjectStatus>('Active');
  const [startDate, setStartDate] = useState('');
  const [targetDate, setTargetDate] = useState('');
  const [saving, setSaving] = useState(false);
  const [tasks, setTasks] = useState<Task[]>([]);

  useEffect(() => {
    if (isOpen && projectId) {
      setLoading(true);
      setError('');
      api
        .get(apiPaths.PROJECTS.GET_BY_ID.replace(':id', projectId))
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
    }
  }, [isOpen, projectId]);

  const totalTasks = tasks.length;
  const completedTasks = tasks.filter((t) => t.status === 'Completed').length;
  const overdueTasks = tasks.filter(
    (t) => t.status !== 'Completed' && new Date(t.dueDate) < new Date()
  ).length;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!projectId) return;
    if (!name.trim()) {
      setError('Project name is required');
      return;
    }
    try {
      setSaving(true);
      setError('');
      await api.put(apiPaths.PROJECTS.UPDATE.replace(':id', projectId), {
        name: name.trim(),
        description: description.trim(),
        status,
        startDate: startDate || undefined,
        targetDate: targetDate || undefined,
      });
      onUpdated?.();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update project');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Edit Project"
      subtitle="Update project details, status, and target timelines"
      footer={
        <>
          <button type="button" onClick={onClose} className="btn-secondary">
            Cancel
          </button>
          <button
            type="submit"
            form="edit-project-form"
            className="btn-primary disabled:opacity-50"
            disabled={saving || loading || !hasPermission('project:update')}
          >
            {saving ? 'Saving...' : 'Update Project'}
          </button>
        </>
      }
    >
      {loading ? (
        <div className="flex justify-center py-10">
          <LoadingSpinner size="md" text="Loading project details..." />
        </div>
      ) : (
        <form id="edit-project-form" onSubmit={handleSubmit} className="space-y-4">
          {error && <div className="alert-error">{error}</div>}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">
                Project name *
              </label>
              <input
                className="input-field w-full"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Q3 Customer Onboarding"
                autoFocus
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">
                Status
              </label>
              <select
                className="input-field w-full"
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
            <label className="block text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">
              Description
            </label>
            <textarea
              className="input-field w-full"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What outcome does this project deliver?"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">
                Start Date
              </label>
              <input
                type="date"
                className="input-field w-full"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">
                Target Date
              </label>
              <input
                type="date"
                className="input-field w-full"
                value={targetDate}
                onChange={(e) => setTargetDate(e.target.value)}
              />
            </div>
          </div>

          {/* Quick Stats Banner */}
          {totalTasks > 0 && (
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-xs">
              <div className="flex items-center justify-between text-slate-600 font-semibold">
                <span>Task Metrics</span>
                <span className="text-slate-800 font-bold">
                  {completedTasks} / {totalTasks} Tasks Completed
                </span>
              </div>
              <div className="h-1.5 rounded-full bg-slate-200 overflow-hidden">
                <div
                  className="h-full rounded-full bg-emerald-500 transition-all"
                  style={{ width: `${Math.round((completedTasks / totalTasks) * 100)}%` }}
                />
              </div>
              {overdueTasks > 0 && (
                <div className="text-[11px] text-rose-600 font-medium">
                  ⚠️ {overdueTasks} task{overdueTasks > 1 ? 's are' : ' is'} overdue
                </div>
              )}
            </div>
          )}
        </form>
      )}
    </Modal>
  );
}

// Route wrapper for direct route /projects/:id/edit
function EditProject() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  return (
    <Projects
      initialEditingProjectId={id || null}
      onModalClose={() => navigate('/projects')}
    />
  );
}

export default EditProject;
