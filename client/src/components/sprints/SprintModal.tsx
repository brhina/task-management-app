import React, { useState, useEffect, type FormEvent } from 'react';
import { Calendar, Clock, AlertCircle, Trash2, CheckCircle2, Sparkles } from 'lucide-react';
import Modal from '../common/Modal';
import api from '../../utils/axios';
import { apiPaths } from '../../utils/apiPaths';
import type { Sprint } from '../../types';

interface SprintModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  projectId: string;
  sprint?: Sprint | null;
  existingSprintsCount?: number;
}

export const SprintModal: React.FC<SprintModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  projectId,
  sprint,
  existingSprintsCount = 0,
}) => {
  const isEditing = Boolean(sprint);
  const [name, setName] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [capacityHours, setCapacityHours] = useState(80);
  const [status, setStatus] = useState<'Planned' | 'Active' | 'Completed' | 'Cancelled'>('Planned');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (sprint) {
      setName(sprint.name || '');
      setStartDate(sprint.startDate ? sprint.startDate.slice(0, 10) : '');
      setEndDate(sprint.endDate ? sprint.endDate.slice(0, 10) : '');
      setCapacityHours(sprint.capacityHours ?? 80);
      setStatus(sprint.status || 'Planned');
    } else {
      const today = new Date();
      const twoWeeksLater = new Date(today.getTime() + 14 * 24 * 60 * 60 * 1000);
      setName(`Sprint ${existingSprintsCount + 1}`);
      setStartDate(today.toISOString().slice(0, 10));
      setEndDate(twoWeeksLater.toISOString().slice(0, 10));
      setCapacityHours(80);
      setStatus('Planned');
    }
    setError(null);
  }, [sprint, isOpen, existingSprintsCount]);

  const applyPresetWeeks = (weeks: number) => {
    const start = startDate ? new Date(startDate) : new Date();
    const end = new Date(start.getTime() + weeks * 7 * 24 * 60 * 60 * 1000);
    setStartDate(start.toISOString().slice(0, 10));
    setEndDate(end.toISOString().slice(0, 10));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (isEditing && sprint) {
        await api.put(apiPaths.SPRINTS.UPDATE.replace(':id', sprint._id), {
          name,
          startDate,
          endDate,
          capacityHours: Number(capacityHours),
          status,
        });
      } else {
        await api.post(apiPaths.SPRINTS.CREATE, {
          projectId,
          name,
          startDate,
          endDate,
          capacityHours: Number(capacityHours),
          status,
        });
      }
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to save sprint.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!sprint || !window.confirm(`Are you sure you want to delete "${sprint.name}"? Tasks assigned to this sprint will become unassigned.`)) {
      return;
    }
    setLoading(true);
    try {
      await api.delete(apiPaths.SPRINTS.DELETE.replace(':id', sprint._id));
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to delete sprint.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? `Edit Sprint: ${sprint?.name}` : 'Create New Sprint'}
      subtitle={isEditing ? 'Update iteration timeline and capacity settings' : 'Define iteration parameters, duration, and team capacity'}
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
                Delete Sprint
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
              form="sprint-modal-form"
              className="btn-primary text-xs flex items-center gap-1.5"
              disabled={loading}
            >
              {loading ? (
                'Saving...'
              ) : (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  {isEditing ? 'Save Changes' : 'Create Sprint'}
                </>
              )}
            </button>
          </div>
        </div>
      }
    >
      <form id="sprint-modal-form" onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div>
          <label htmlFor="sprint-name" className="block text-xs font-medium text-slate-700 mb-1">
            Sprint Name <span className="text-rose-500">*</span>
          </label>
          <input
            id="sprint-name"
            type="text"
            className="input-field w-full text-sm"
            placeholder="e.g. Sprint 1 - Foundation & Auth"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>

        {/* Duration Presets */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="block text-xs font-medium text-slate-700">
              Quick Duration Presets
            </label>
            <span className="text-[11px] text-slate-400 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-cyan-500" /> Auto-calculate end date
            </span>
          </div>
          <div className="grid grid-cols-4 gap-2">
            {[
              { label: '1 Week', weeks: 1 },
              { label: '2 Weeks', weeks: 2 },
              { label: '3 Weeks', weeks: 3 },
              { label: '4 Weeks', weeks: 4 },
            ].map((p) => (
              <button
                key={p.weeks}
                type="button"
                onClick={() => applyPresetWeeks(p.weeks)}
                className="px-2 py-1.5 text-xs font-medium border border-slate-200 rounded-lg hover:border-cyan-500 hover:text-cyan-600 hover:bg-cyan-50/50 transition-colors text-slate-600 bg-white"
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Date Controls */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="sprint-start-date" className="block text-xs font-medium text-slate-700 mb-1 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-slate-400" /> Start Date
            </label>
            <input
              id="sprint-start-date"
              type="date"
              className="input-field w-full text-sm"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              required
            />
          </div>
          <div>
            <label htmlFor="sprint-end-date" className="block text-xs font-medium text-slate-700 mb-1 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-slate-400" /> End Date
            </label>
            <input
              id="sprint-end-date"
              type="date"
              className="input-field w-full text-sm"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              required
            />
          </div>
        </div>

        {/* Capacity & Status */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="sprint-capacity" className="block text-xs font-medium text-slate-700 mb-1 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-slate-400" /> Capacity (Hours)
            </label>
            <input
              id="sprint-capacity"
              type="number"
              min={0}
              step={4}
              className="input-field w-full text-sm"
              value={capacityHours}
              onChange={(e) => setCapacityHours(Number(e.target.value))}
              placeholder="e.g. 80"
            />
            <span className="text-[10px] text-slate-400 mt-0.5 block">
              Estimated total available hours for team
            </span>
          </div>

          <div>
            <label htmlFor="sprint-status" className="block text-xs font-medium text-slate-700 mb-1">
              Sprint Status
            </label>
            <select
              id="sprint-status"
              className="input-field w-full text-sm"
              value={status}
              onChange={(e) => setStatus(e.target.value as any)}
            >
              <option value="Planned">Planned</option>
              <option value="Active">Active</option>
              <option value="Completed">Completed</option>
              <option value="Cancelled">Cancelled</option>
            </select>
          </div>
        </div>
      </form>
    </Modal>
  );
};

export default SprintModal;
