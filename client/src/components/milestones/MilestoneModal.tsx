import React, { useState, useEffect, type FormEvent } from 'react';
import { Calendar, Target, AlertCircle, Trash2, CheckCircle2, CheckSquare } from 'lucide-react';
import Modal from '../common/Modal';
import api from '../../utils/axios';
import { apiPaths } from '../../utils/apiPaths';
import type { Milestone, Task } from '../../types';

interface MilestoneModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  projectId: string;
  milestone?: Milestone | null;
  availableTasks?: Task[];
}

export const MilestoneModal: React.FC<MilestoneModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  projectId,
  milestone,
  availableTasks = [],
}) => {
  const isEditing = Boolean(milestone);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [targetDate, setTargetDate] = useState('');
  const [status, setStatus] = useState<'Planned' | 'In Progress' | 'Completed' | 'At Risk'>('Planned');
  const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (milestone) {
      setTitle(milestone.title || '');
      setDescription(milestone.description || '');
      setTargetDate(milestone.targetDate ? milestone.targetDate.slice(0, 10) : '');
      setStatus(milestone.status || 'Planned');
      setSelectedTaskIds(milestone.taskIds || []);
    } else {
      const defaultDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      setTitle('');
      setDescription('');
      setTargetDate(defaultDate.toISOString().slice(0, 10));
      setStatus('Planned');
      setSelectedTaskIds([]);
    }
    setError(null);
  }, [milestone, isOpen]);

  const toggleTaskSelection = (taskId: string) => {
    setSelectedTaskIds((prev) =>
      prev.includes(taskId) ? prev.filter((id) => id !== taskId) : [...prev, taskId]
    );
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (isEditing && milestone) {
        await api.put(apiPaths.MILESTONES.UPDATE.replace(':id', milestone._id), {
          title,
          description,
          targetDate,
          status,
          taskIds: selectedTaskIds,
        });
      } else {
        await api.post(apiPaths.MILESTONES.CREATE, {
          projectId,
          title,
          description,
          targetDate,
          status,
          taskIds: selectedTaskIds,
        });
      }
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to save milestone.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!milestone || !window.confirm(`Are you sure you want to delete milestone "${milestone.title}"?`)) {
      return;
    }
    setLoading(true);
    try {
      await api.delete(apiPaths.MILESTONES.DELETE.replace(':id', milestone._id));
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to delete milestone.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? `Edit Milestone: ${milestone?.title}` : 'Create New Milestone'}
      subtitle={isEditing ? 'Update deliverable target date and linked tasks' : 'Establish key project deliverable, deadline, and associate tasks'}
      footer={
        <div className="flex items-center justify-between w-full">
          <div>
            {isEditing && (
              <button
                type="button"
                onClick={handleDelete}
                disabled={loading}
                className="px-3 py-1.5 text-xs font-medium text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Delete Milestone
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="btn-secondary text-xs"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              form="milestone-modal-form"
              className="btn-primary text-xs flex items-center gap-1.5"
              disabled={loading}
            >
              {loading ? (
                'Saving...'
              ) : (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  {isEditing ? 'Save Changes' : 'Create Milestone'}
                </>
              )}
            </button>
          </div>
        </div>
      }
    >
      <form id="milestone-modal-form" onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div>
          <label htmlFor="milestone-title" className="block text-xs font-medium text-slate-700 mb-1">
            Milestone Title <span className="text-rose-500">*</span>
          </label>
          <input
            id="milestone-title"
            type="text"
            className="input-field w-full text-sm"
            placeholder="e.g. Beta V1 Release / MVP Demo Ready"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
        </div>

        <div>
          <label htmlFor="milestone-description" className="block text-xs font-medium text-slate-700 mb-1">
            Description / Deliverable Goal
          </label>
          <textarea
            id="milestone-description"
            className="input-field w-full text-sm"
            rows={2}
            placeholder="Key outcomes, dependencies, or sign-off criteria..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="milestone-target-date" className="block text-xs font-medium text-slate-700 mb-1 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-slate-400" /> Target Date <span className="text-rose-500">*</span>
            </label>
            <input
              id="milestone-target-date"
              type="date"
              className="input-field w-full text-sm"
              value={targetDate}
              onChange={(e) => setTargetDate(e.target.value)}
              required
            />
          </div>

          <div>
            <label htmlFor="milestone-status" className="block text-xs font-medium text-slate-700 mb-1 flex items-center gap-1">
              <Target className="w-3.5 h-3.5 text-slate-400" /> Milestone Status
            </label>
            <select
              id="milestone-status"
              className="input-field w-full text-sm"
              value={status}
              onChange={(e) => setStatus(e.target.value as any)}
            >
              <option value="Planned">Planned</option>
              <option value="In Progress">In Progress</option>
              <option value="Completed">Completed</option>
              <option value="At Risk">At Risk</option>
            </select>
          </div>
        </div>

        {/* Link Tasks Selector */}
        {availableTasks.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-medium text-slate-700 flex items-center gap-1">
                <CheckSquare className="w-3.5 h-3.5 text-slate-400" /> Link Deliverable Tasks
              </label>
              <span className="text-[11px] text-slate-400">
                {selectedTaskIds.length} selected
              </span>
            </div>
            <div className="max-h-36 overflow-y-auto border border-slate-200 rounded-lg p-2 space-y-1 bg-slate-50/50">
              {availableTasks.map((t) => {
                const isSelected = selectedTaskIds.includes(t._id);
                return (
                  <label
                    key={t._id}
                    className={`flex items-center justify-between p-1.5 rounded text-xs cursor-pointer transition-colors ${
                      isSelected ? 'bg-cyan-50 border border-cyan-200 text-cyan-900 font-medium' : 'hover:bg-slate-100 text-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleTaskSelection(t._id)}
                        className="rounded border-slate-300 text-cyan-600 focus:ring-cyan-500 h-3.5 w-3.5"
                      />
                      <span className="truncate">{t.title}</span>
                    </div>
                    <span className="text-[10px] text-slate-400 shrink-0 ml-2">
                      {t.status}
                    </span>
                  </label>
                );
              })}
            </div>
          </div>
        )}
      </form>
    </Modal>
  );
};

export default MilestoneModal;
