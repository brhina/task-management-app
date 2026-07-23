import { useEffect, useState, useContext, useCallback, type FormEvent } from 'react';
import PageShell from '../../components/common/PageShell';
import Modal from '../../components/common/Modal';
import api from '../../utils/axios';
import { apiPaths } from '../../utils/apiPaths';
import { UserContext } from '../../context/UserContext';
import type { TaskTemplate } from '../../types';
import { Trash2, Plus } from 'lucide-react';

export default function TaskTemplates() {
  const { hasPermission } = useContext(UserContext);
  const [templates, setTemplates] = useState<TaskTemplate[]>([]);
  const [name, setName] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');
  const [showCreate, setShowCreate] = useState(false);

  const load = async () => {
    const res = await api.get(apiPaths.TASK_TEMPLATES.LIST);
    setTemplates(res.data.data || []);
  };

  useEffect(() => {
    load().catch((e) => setError(e.message));
  }, []);

  const create = async (e: FormEvent) => {
    e.preventDefault();
    await api.post(apiPaths.TASK_TEMPLATES.CREATE, {
      name,
      title,
      description,
      checklist: [],
    });
    setName('');
    setTitle('');
    setDescription('');
    setShowCreate(false);
    await load();
  };

  const closeCreateModal = useCallback(() => {
    setShowCreate(false);
    setName('');
    setTitle('');
    setDescription('');
  }, []);

  const remove = async (id: string) => {
    await api.delete(apiPaths.TASK_TEMPLATES.DELETE.replace(':id', id));
    await load();
  };

  return (
    <PageShell
      title="Task Templates"
      subtitle="Reusable task blueprints"
      actions={
        <button
          type="button"
          onClick={() => setShowCreate(true)}
          className="btn-primary"
          disabled={!hasPermission('template:manage')}
        >
          <Plus className="w-4 h-4 mr-1" />
          Create Template
        </button>
      }
    >
      {error && <div className="alert-error mb-4">{error}</div>}
      <ul className="space-y-2">
        {templates.map((t) => (
          <li
            key={t._id}
            className="card flex items-center justify-between gap-3"
          >
            <div>
              <div className="text-sm font-medium text-slate-200">{t.name}</div>
              <div className="text-xs text-slate-500">{t.title}</div>
            </div>
            <button
              type="button"
              onClick={() => remove(t._id)}
              className="text-slate-500 hover:text-red-400 disabled:opacity-50"
              disabled={!hasPermission('template:manage')}
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </li>
        ))}
      </ul>

      <Modal
        isOpen={showCreate}
        onClose={closeCreateModal}
        title="Create Template"
        subtitle="Add a new reusable task template"
        footer={
          <>
            <button type="button" onClick={closeCreateModal} className="btn-secondary">
              Cancel
            </button>
            <button
              type="submit"
              form="create-template-form"
              className="btn-primary"
              disabled={!hasPermission('template:manage')}
            >
              Create template
            </button>
          </>
        }
      >
        <form id="create-template-form" onSubmit={create} className="space-y-3">
          <input
            className="input-dark w-full text-sm"
            placeholder="Template name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
          <input
            className="input-dark w-full text-sm"
            placeholder="Task title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
          <textarea
            className="input-dark w-full text-sm"
            placeholder="Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
            rows={3}
          />
        </form>
      </Modal>
    </PageShell>
  );
}
