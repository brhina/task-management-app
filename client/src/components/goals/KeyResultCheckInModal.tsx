import { useState, useEffect, type FormEvent } from 'react';
import Modal from '../common/Modal';
import api from '../../utils/axios';
import { apiPaths } from '../../utils/apiPaths';
import type { KeyResult, KeyResultStatus } from '../../types';

interface KeyResultCheckInModalProps {
  isOpen: boolean;
  onClose: () => void;
  keyResult: KeyResult | null;
  onUpdated: () => void;
}

export default function KeyResultCheckInModal({
  isOpen,
  onClose,
  keyResult,
  onUpdated,
}: KeyResultCheckInModalProps) {
  const [currentValue, setCurrentValue] = useState<number>(0);
  const [status, setStatus] = useState<KeyResultStatus>('In Progress');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (keyResult) {
      setCurrentValue(keyResult.currentValue ?? 0);
      setStatus(keyResult.status || 'In Progress');
      setError('');
    }
  }, [keyResult, isOpen]);

  if (!keyResult) return null;

  const unit = keyResult.unit || 'percentage';
  const start = keyResult.startValue || 0;
  const target = keyResult.targetValue || 100;

  const calculatePct = (val: number) => {
    if (unit === 'boolean') return val >= 1 ? 100 : 0;
    const range = target - start;
    if (range <= 0) return Math.min(100, Math.round((val / target) * 100));
    return Math.min(100, Math.max(0, Math.round(((val - start) / range) * 100)));
  };

  const currentPct = calculatePct(currentValue);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      setError('');
      await api.put(apiPaths.KEY_RESULTS.UPDATE.replace(':id', keyResult._id), {
        currentValue,
        status: currentPct >= 100 ? 'Completed' : status,
      });
      onUpdated();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update Key Result progress');
    } finally {
      setSaving(false);
    }
  };

  const formatUnitValue = (val: number) => {
    if (unit === 'currency') return `$${val.toLocaleString()}`;
    if (unit === 'percentage') return `${val}%`;
    if (unit === 'boolean') return val >= 1 ? 'Yes / Completed' : 'No / Pending';
    return val.toString();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Check-in Key Result"
      subtitle={keyResult.title}
      maxWidth="max-w-lg"
      footer={
        <>
          <button onClick={onClose} className="btn-secondary">
            Cancel
          </button>
          <button
            type="submit"
            form="kr-checkin-form"
            disabled={saving}
            className="btn-primary disabled:opacity-50 min-w-[120px]"
          >
            {saving ? 'Saving...' : 'Save Check-in'}
          </button>
        </>
      }
    >
      <form id="kr-checkin-form" onSubmit={handleSubmit} className="space-y-4">
        {error && <div className="alert-error text-xs">{error}</div>}

        <div className="card bg-slate-50 border border-slate-200">
          <div className="flex justify-between items-center text-xs text-slate-500 mb-2">
            <span>Target: {formatUnitValue(target)}</span>
            <span className="font-bold text-slate-700">{currentPct}% Complete</span>
          </div>
          <div className="h-2 rounded-full bg-gray-200 overflow-hidden mb-2">
            <div
              className="h-full rounded-full bg-gradient-to-r from-violet-500 to-indigo-500 transition-all duration-300"
              style={{ width: `${currentPct}%` }}
            />
          </div>
        </div>

        {unit === 'boolean' ? (
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-600 block">Completion Status</label>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setCurrentValue(1)}
                className={`flex-1 py-2 px-4 rounded-xl border text-sm font-semibold transition-all ${
                  currentValue >= 1
                    ? 'bg-emerald-500/15 border-emerald-500 text-emerald-600'
                    : 'border-gray-200 text-slate-500 hover:border-gray-300'
                }`}
              >
                ✓ Completed
              </button>
              <button
                type="button"
                onClick={() => setCurrentValue(0)}
                className={`flex-1 py-2 px-4 rounded-xl border text-sm font-semibold transition-all ${
                  currentValue < 1
                    ? 'bg-amber-500/15 border-amber-500 text-amber-600'
                    : 'border-gray-200 text-slate-500 hover:border-gray-300'
                }`}
              >
                Incomplete
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-xs font-semibold text-slate-600 block">Current Value</label>
                <span className="text-xs text-slate-500 font-mono">
                  {formatUnitValue(currentValue)}
                </span>
              </div>
              <input
                type="number"
                step={unit === 'currency' ? '0.01' : '1'}
                value={currentValue}
                onChange={(e) => setCurrentValue(Number(e.target.value))}
                className="input-field w-full text-base font-semibold"
                placeholder="Enter current value"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1">Quick Adjustment</label>
              <input
                type="range"
                min={start}
                max={target || 100}
                value={currentValue}
                onChange={(e) => setCurrentValue(Number(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary"
              />
            </div>
          </div>
        )}

        <div>
          <label className="text-xs font-semibold text-slate-600 block mb-1">Key Result Health / Status</label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as KeyResultStatus)}
            className="input-field w-full text-sm"
          >
            <option value="Not Started">Not Started</option>
            <option value="In Progress">In Progress</option>
            <option value="At Risk">At Risk</option>
            <option value="Completed">Completed</option>
          </select>
        </div>
      </form>
    </Modal>
  );
}
