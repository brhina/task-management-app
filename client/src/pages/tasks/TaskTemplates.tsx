import { useEffect, useState, useContext, useCallback, type FormEvent, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import PageShell from '../../components/common/PageShell';
import AdvancedTable, { RowActions, type Column } from '../../components/common/AdvancedTable';
import Modal from '../../components/common/Modal';
import api from '../../utils/axios';
import { apiPaths } from '../../utils/apiPaths';
import { UserContext } from '../../context/UserContext';
import { getPriorityColor } from '../../constants/taskStatus';
import type { TaskTemplate, TaskPriority, TodoItem } from '../../types';
import {
  FileText,
  Plus,
  Trash2,
  ListChecks,
  Play,
  Layers,
  LayoutGrid,
  List,
  Sparkles,
  Edit2,
  CheckSquare,
  X,
} from 'lucide-react';

export default function TaskTemplates() {
  const { hasPermission } = useContext(UserContext);
  const navigate = useNavigate();
  const [templates, setTemplates] = useState<TaskTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // View Mode: 'grid' | 'table'
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<TaskTemplate | null>(null);

  // Form Fields
  const [name, setName] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<TaskPriority>('Medium');
  const [category, setCategory] = useState('');
  const [checklistItems, setChecklistItems] = useState<string[]>([]);
  const [newChecklistItem, setNewChecklistItem] = useState('');
  const [saving, setSaving] = useState(false);

  const loadTemplates = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await api.get(apiPaths.TASK_TEMPLATES.LIST);
      setTemplates(res.data.data || []);
    } catch (e: any) {
      setError(e.response?.data?.message || 'Failed to load task templates');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTemplates();
  }, []);

  const openCreateModal = () => {
    setEditingTemplate(null);
    setName('');
    setTitle('');
    setDescription('');
    setPriority('Medium');
    setCategory('');
    setChecklistItems([]);
    setShowModal(true);
  };

  const openEditModal = (t: TaskTemplate) => {
    setEditingTemplate(t);
    setName(t.name);
    setTitle(t.title);
    setDescription(t.description);
    setPriority(t.priority || 'Medium');
    setCategory(t.category || '');
    setChecklistItems((t.checklist || []).map((item) => item.text));
    setShowModal(true);
  };

  const closeModal = useCallback(() => {
    setShowModal(false);
    setEditingTemplate(null);
    setName('');
    setTitle('');
    setDescription('');
    setChecklistItems([]);
  }, []);

  const addChecklistItem = () => {
    if (!newChecklistItem.trim()) return;
    setChecklistItems((prev) => [...prev, newChecklistItem.trim()]);
    setNewChecklistItem('');
  };

  const removeChecklistItem = (index: number) => {
    setChecklistItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !title.trim()) return setError('Name and Title are required');

    try {
      setSaving(true);
      setError('');
      const checklistPayload: TodoItem[] = checklistItems.map((text) => ({ text, isCompleted: false }));

      if (editingTemplate) {
        await api.put(apiPaths.TASK_TEMPLATES.UPDATE.replace(':id', editingTemplate._id), {
          name: name.trim(),
          title: title.trim(),
          description: description.trim(),
          priority,
          category: category.trim() || undefined,
          checklist: checklistPayload,
        });
      } else {
        await api.post(apiPaths.TASK_TEMPLATES.CREATE, {
          name: name.trim(),
          title: title.trim(),
          description: description.trim(),
          priority,
          category: category.trim() || undefined,
          checklist: checklistPayload,
        });
      }
      closeModal();
      await loadTemplates();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to save template');
    } finally {
      setSaving(false);
    }
  };

  const removeTemplate = async (id: string) => {
    try {
      await api.delete(apiPaths.TASK_TEMPLATES.DELETE.replace(':id', id));
      await loadTemplates();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to delete template');
    }
  };

  const useTemplate = (t: TaskTemplate) => {
    // Navigate to tasks with prefilled state or query parameter
    navigate('/tasks', { state: { prefillTemplate: t } });
  };

  const stats = useMemo(() => {
    const total = templates.length;
    const highPriority = templates.filter((t) => t.priority === 'High' || t.priority === 'Critical').length;
    const totalSubtasks = templates.reduce((sum, t) => sum + (t.checklist?.length || 0), 0);
    return { total, highPriority, totalSubtasks };
  }, [templates]);

  return (
    <PageShell
      title="Task Templates"
      subtitle="Standardized blueprints to accelerate workflow execution"
      actions={
        <div className="flex items-center gap-2">
          {hasPermission('template:manage') && (
            <button
              type="button"
              onClick={openCreateModal}
              className="btn-primary text-sm flex items-center gap-1.5 px-3 py-1.5"
            >
              <Plus className="w-4 h-4" />
              Create Template
            </button>
          )}
        </div>
      }
    >
      <div className="space-y-5">
        {error && <div className="alert-error mb-4">{error}</div>}

        {/* Top Overview KPI Banner */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="card p-4">
            <div className="flex justify-between items-center text-slate-500 text-xs font-semibold mb-1">
              <span>Total Blueprints</span>
              <FileText className="w-4 h-4 text-primary" />
            </div>
            <div className="text-2xl font-black text-slate-800">{stats.total}</div>
            <div className="text-[11px] text-slate-500 mt-1">Ready for deployment</div>
          </div>

          <div className="card p-4">
            <div className="flex justify-between items-center text-slate-500 text-xs font-semibold mb-1">
              <span>High Priority Blueprints</span>
              <Sparkles className="w-4 h-4 text-amber-500" />
            </div>
            <div className="text-2xl font-black text-slate-800">{stats.highPriority}</div>
            <div className="text-[11px] text-amber-600 font-medium mt-1">Critical workflows</div>
          </div>

          <div className="card p-4">
            <div className="flex justify-between items-center text-slate-500 text-xs font-semibold mb-1">
              <span>Preset Subtasks</span>
              <ListChecks className="w-4 h-4 text-emerald-500" />
            </div>
            <div className="text-2xl font-black text-slate-800">{stats.totalSubtasks}</div>
            <div className="text-[11px] text-emerald-600 font-medium mt-1">Pre-configured checklist items</div>
          </div>
        </div>

        {/* View Switcher Header */}
        <div className="flex items-center justify-between bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
          <div className="text-xs font-bold text-slate-700 uppercase tracking-wide">
            Template Library ({templates.length})
          </div>
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200">
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-md text-xs font-semibold flex items-center gap-1 transition-all ${
                viewMode === 'grid'
                  ? 'bg-white text-primary shadow-sm'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <LayoutGrid className="w-4 h-4" />
              <span>Grid</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-md text-xs font-semibold flex items-center gap-1 transition-all ${
                viewMode === 'table'
                  ? 'bg-white text-primary shadow-sm'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <List className="w-4 h-4" />
              <span>Table</span>
            </button>
          </div>
        </div>

        {/* Content View */}
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        ) : templates.length === 0 ? (
          <div className="card text-center py-16">
            <FileText className="w-12 h-12 text-slate-400 mx-auto mb-3" />
            <h3 className="text-base font-bold text-slate-700">No task templates yet</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              Create reusable task templates to standardize onboarding, code reviews, feature sprints, or recurring ops.
            </p>
            {hasPermission('template:manage') && (
              <button
                type="button"
                onClick={openCreateModal}
                className="btn-primary text-sm mt-4 inline-flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                Create Template
              </button>
            )}
          </div>
        ) : viewMode === 'grid' ? (
          /* Grid View Cards */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {templates.map((t) => (
              <div
                key={t._id}
                className="card hover:shadow-md hover:border-slate-300 transition-all flex flex-col justify-between p-4 group"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                      {t.name}
                    </span>
                    <span className={`inline-flex px-2 py-0.5 text-[10px] font-bold rounded ${getPriorityColor(t.priority)}`}>
                      {t.priority}
                    </span>
                  </div>

                  <div>
                    <h3 className="text-sm font-bold text-slate-800 group-hover:text-primary transition-colors">
                      {t.title}
                    </h3>
                    <p className="text-xs text-slate-500 mt-1 line-clamp-3">{t.description}</p>
                  </div>
                </div>

                <div className="space-y-3 pt-4 border-t border-slate-100 mt-4">
                  {/* Checklist Subtasks Count */}
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span className="flex items-center gap-1 font-medium">
                      <ListChecks className="w-3.5 h-3.5 text-slate-400" />
                      {t.checklist?.length || 0} Subtasks included
                    </span>
                    {t.category && (
                      <span className="text-[10px] bg-slate-100 px-2 py-0.5 rounded text-slate-600 font-semibold">
                        {t.category}
                      </span>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => useTemplate(t)}
                      className="flex-1 btn-primary text-xs flex items-center justify-center gap-1 py-1.5"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      Use Blueprint
                    </button>
                    {hasPermission('template:manage') && (
                      <>
                        <button
                          type="button"
                          onClick={() => openEditModal(t)}
                          className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
                          title="Edit Template"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => removeTemplate(t._id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-slate-100 transition-colors"
                          title="Delete Template"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* Table View */
          <AdvancedTable
            data={templates}
            columns={[
              {
                key: 'name',
                header: 'Template Name',
                sortable: true,
                render: (t) => (
                  <div>
                    <span className="text-sm font-bold text-slate-800 block">{t.name}</span>
                    {t.category && <span className="text-[10px] text-slate-500 font-medium">{t.category}</span>}
                  </div>
                ),
              },
              {
                key: 'title',
                header: 'Task Title Blueprint',
                render: (t) => <span className="text-xs text-slate-700 font-medium">{t.title}</span>,
              },
              {
                key: 'priority',
                header: 'Priority',
                sortable: true,
                render: (t) => (
                  <span className={`inline-flex px-2 py-0.5 text-[10px] font-bold rounded ${getPriorityColor(t.priority)}`}>
                    {t.priority}
                  </span>
                ),
              },
              {
                key: 'checklist',
                header: 'Subtasks',
                render: (t) => (
                  <span className="text-xs text-slate-600 font-medium">
                    {t.checklist?.length || 0} items
                  </span>
                ),
              },
              {
                key: 'actions',
                header: 'Actions',
                className: 'w-[140px]',
                render: (t) => (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => useTemplate(t)}
                      className="px-2 py-1 bg-primary text-white text-xs font-semibold rounded hover:bg-primary-hover transition-colors"
                    >
                      Use
                    </button>
                    {hasPermission('template:manage') && (
                      <RowActions
                        items={[
                          { label: 'Edit', onClick: () => openEditModal(t) },
                          { label: 'Delete', onClick: () => removeTemplate(t._id), className: 'text-rose-600' },
                        ]}
                      />
                    )}
                  </div>
                ),
              },
            ] satisfies Column<TaskTemplate>[]}
            emptyMessage="No templates found."
          />
        )}
      </div>

      {/* Create / Edit Template Modal */}
      <Modal
        isOpen={showModal}
        onClose={closeModal}
        title={editingTemplate ? 'Edit Task Blueprint' : 'Create Task Blueprint'}
        subtitle="Define a reusable task template with pre-set priority and checklist subtasks"
        maxWidth="max-w-xl"
        footer={
          <>
            <button type="button" onClick={closeModal} className="btn-secondary">
              Cancel
            </button>
            <button
              type="submit"
              form="template-form"
              className="btn-primary min-w-[130px]"
              disabled={saving || !hasPermission('template:manage')}
            >
              {saving ? 'Saving...' : editingTemplate ? 'Update Blueprint' : 'Create Blueprint'}
            </button>
          </>
        }
      >
        <form id="template-form" onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1">Blueprint Name *</label>
              <input
                className="input-field w-full text-sm font-semibold"
                placeholder="e.g. Weekly Bug Scrub, PR Review"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1">Default Priority</label>
              <select
                className="input-field w-full text-sm"
                value={priority}
                onChange={(e) => setPriority(e.target.value as TaskPriority)}
              >
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
                <option value="Critical">Critical</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-600 block mb-1">Default Task Title *</label>
            <input
              className="input-field w-full text-sm"
              placeholder="e.g. Audit security logs for [Sprint]"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-600 block mb-1">Default Description</label>
            <textarea
              className="input-field w-full text-sm resize-none"
              placeholder="Provide context and execution guidelines..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              required
            />
          </div>

          {/* Preset Subtasks Builder */}
          <div className="card space-y-3 bg-slate-50 border border-slate-200">
            <div className="flex items-center justify-between text-xs font-bold text-slate-700">
              <span className="flex items-center gap-1.5">
                <CheckSquare className="w-4 h-4 text-violet-600" />
                Preset Checklist Subtasks ({checklistItems.length})
              </span>
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                className="input-field flex-1 text-xs"
                placeholder="Add subtask step (e.g. Verify unit test coverage)"
                value={newChecklistItem}
                onChange={(e) => setNewChecklistItem(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addChecklistItem();
                  }
                }}
              />
              <button
                type="button"
                onClick={addChecklistItem}
                className="btn-secondary text-xs px-3 py-1.5"
              >
                Add Step
              </button>
            </div>

            {checklistItems.length > 0 && (
              <div className="space-y-1.5 pt-1">
                {checklistItems.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-2 bg-white border border-slate-200 rounded-lg text-xs"
                  >
                    <span className="font-medium text-slate-700">{item}</span>
                    <button
                      type="button"
                      onClick={() => removeChecklistItem(idx)}
                      className="text-slate-400 hover:text-rose-500 p-0.5"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </form>
      </Modal>
    </PageShell>
  );
}
