import { useContext, useState, useEffect, type FormEvent } from 'react';
import { UserContext } from '../../context/UserContext';
import api from '../../utils/axios';
import { apiPaths } from '../../utils/apiPaths';
import Modal from '../../components/common/Modal';
import type { ProjectStatus } from '../../types';

const STATUS_OPTIONS: ProjectStatus[] = ['Planned', 'Active', 'Paused', 'Completed', 'Archived'];

interface CreateProjectProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated?: () => void;
}

function CreateProject({ isOpen, onClose, onCreated }: CreateProjectProps) {
  const { hasPermission } = useContext(UserContext);
  const [error, setError] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<ProjectStatus>('Active');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setName('');
      setDescription('');
      setStatus('Active');
      setError('');
    }
  }, [isOpen]);

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Project name is required');
      return;
    }
    try {
      setCreating(true);
      setError('');
      await api.post(apiPaths.PROJECTS.CREATE, {
        name: name.trim(),
        description: description.trim(),
        status,
      });
      onCreated?.();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create project');
    } finally {
      setCreating(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Create Project"
      subtitle="Set up a new project to organize work"
      footer={
        <>
          <button onClick={onClose} className="btn-secondary">
            Cancel
          </button>
          <button
            type="submit"
            form="create-project-form"
            className="btn-primary disabled:opacity-50"
            disabled={creating || !hasPermission('project:create')}
          >
            {creating ? 'Creating...' : 'Create Project'}
          </button>
        </>
      }
    >
      <form id="create-project-form" onSubmit={handleCreate} className="space-y-4">
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
      </form>
    </Modal>
  );
}

export default CreateProject;
