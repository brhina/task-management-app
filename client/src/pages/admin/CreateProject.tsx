import { useContext, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import PageShell from '../../components/common/PageShell';
import api from '../../utils/axios';
import { apiPaths } from '../../utils/apiPaths';
import { UserContext } from '../../context/UserContext';
import type { ProjectStatus } from '../../types';

const STATUS_OPTIONS: ProjectStatus[] = ['Planned', 'Active', 'Paused', 'Completed', 'Archived'];

function CreateProject() {
  const { user } = useContext(UserContext);
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<ProjectStatus>('Active');
  const [creating, setCreating] = useState(false);

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Project name is required');
      return;
    }
    try {
      setCreating(true);
      setError('');
      await api.post(apiPaths.PROJECTS.CREATE, { name: name.trim(), description: description.trim(), status });
      navigate('/admin/projects');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create project');
    } finally {
      setCreating(false);
    }
  };

  if (!user || user.role !== 'Admin') {
    return <PageShell title="Access Denied" subtitle="You don't have permission to access this page." />;
  }

  return (
    <PageShell title="Create Project" subtitle="Set up a new project to organize work">
      <div className="space-y-4">
        {error && <div className="alert-error">{error}</div>}

        <form onSubmit={handleCreate} className="card space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-slate-400 uppercase tracking-wide mb-1">Project name *</label>
              <input className="input-dark w-full" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g., Q3 Customer Onboarding" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 uppercase tracking-wide mb-1">Status</label>
              <select className="input-dark w-full" value={status} onChange={(e) => setStatus(e.target.value as ProjectStatus)}>
                {STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-400 uppercase tracking-wide mb-1">Description</label>
            <textarea className="input-dark w-full" rows={3} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What outcome does this project deliver?" />
          </div>
          <div className="flex justify-end gap-3">
            <button type="button" onClick={() => navigate('/admin/projects')} className="btn-secondary">Cancel</button>
            <button className="btn-primary disabled:opacity-50" disabled={creating} type="submit">
              {creating ? 'Creating...' : 'Create Project'}
            </button>
          </div>
        </form>
      </div>
    </PageShell>
  );
}

export default CreateProject;
