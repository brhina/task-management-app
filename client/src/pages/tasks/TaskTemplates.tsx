import { useEffect, useState, useContext, useCallback, type FormEvent } from 'react';
import PageShell from '../../components/common/PageShell';
import AdvancedTable, { RowActions, type Column, type ActionItem } from '../../components/common/AdvancedTable';
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
          className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-gray-100 transition-colors"
          disabled={!hasPermission('template:manage')}
        >
          Create Template
        </button>
      }
    >
      {error && <div className="alert-error mb-4">{error}</div>}
      <AdvancedTable
        data={templates}
        columns={[
          {
            key: 'name',
            header: 'Name',
            render: (t) => <span className="text-sm font-medium text-slate-700">{t.name}</span>,
          },
          {
            key: 'title',
            header: 'Title',
            render: (t) => <span className="text-xs text-slate-500">{t.title}</span>,
          },
          {
            key: 'actions',
            header: 'Actions',
            className: 'w-[50px]',
            render: (t) => (
              <RowActions items={[
                { label: 'Delete', onClick: () => remove(t._id), className: 'text-rose-500', disabled: !hasPermission('template:manage') },
              ]} />
            ),
          },
        ] satisfies Column<TaskTemplate>[]}
        emptyMessage="No templates yet."
      />

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
            className="input-field w-full text-sm"
            placeholder="Template name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
          <input
            className="input-field w-full text-sm"
            placeholder="Task title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
          <textarea
            className="input-field w-full text-sm"
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
