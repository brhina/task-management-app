import { useState } from 'react';
import { Link } from 'react-router-dom';
import { GitCommit, ShieldAlert, ArrowRight, Plus, Trash2 } from 'lucide-react';
import api from '../../utils/axios';
import { apiPaths } from '../../utils/apiPaths';
import type { Task } from '../../types';
import { getStatusColor } from '../../constants/taskStatus';

interface Props {
  taskId: string;
  dependencies: any[];
  tasksForDeps: Task[];
  canEdit: boolean;
  onUpdated: () => void;
}

export default function TaskDependencies({
  taskId,
  dependencies,
  tasksForDeps,
  canEdit,
  onUpdated,
}: Props) {
  const [prereqToAdd, setPrereqToAdd] = useState('');
  const [addingDep, setAddingDep] = useState(false);
  const [error, setError] = useState('');

  const blockedBy = dependencies.filter(
    (d) => String((d.toTaskId as any)?._id || d.toTaskId) === taskId
  );
  const blocking = dependencies.filter(
    (d) => String((d.fromTaskId as any)?._id || d.fromTaskId) === taskId
  );

  const handleAddPrereq = async () => {
    if (!taskId || !prereqToAdd) return;
    try {
      setAddingDep(true);
      setError('');
      await api.post(apiPaths.DEPENDENCIES.CREATE, {
        fromTaskId: prereqToAdd,
        toTaskId: taskId,
        type: 'FS',
      });
      setPrereqToAdd('');
      onUpdated();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to add dependency');
    } finally {
      setAddingDep(false);
    }
  };

  const handleRemoveDependency = async (depId: string) => {
    try {
      setError('');
      await api.delete(apiPaths.DEPENDENCIES.DELETE.replace(':id', depId));
      onUpdated();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to remove dependency');
    }
  };

  return (
    <div className="card space-y-4">
      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-amber-50 text-amber-600">
            <GitCommit className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
              Dependencies
            </h3>
            <p className="text-xs text-slate-500">Track task prerequisites and downstream blockers</p>
          </div>
        </div>
        {(blockedBy.length > 0 || blocking.length > 0) && (
          <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-slate-100 text-slate-600">
            {blockedBy.length} Prerequisites • {blocking.length} Blocking
          </span>
        )}
      </div>

      {error && (
        <div className="p-3 text-xs text-rose-600 bg-rose-50 border border-rose-200 rounded-xl">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Blocked By */}
        <div className="space-y-2">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide flex items-center gap-1.5">
            <ShieldAlert className="w-3.5 h-3.5 text-amber-500" />
            Blocked By (Prerequisites)
          </div>
          {blockedBy.length === 0 ? (
            <div className="p-4 text-center text-xs text-slate-400 italic bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
              No prerequisite tasks
            </div>
          ) : (
            <div className="space-y-2">
              {blockedBy.map((d: any) => {
                const targetTask = d.fromTaskId;
                return (
                  <div
                    key={d._id}
                    className="flex items-center justify-between gap-2 p-3 rounded-xl border border-slate-200 bg-white hover:border-amber-300 transition-colors"
                  >
                    <div className="min-w-0 flex-1">
                      <Link
                        to={`/tasks/${targetTask?._id || targetTask}`}
                        className="text-xs font-semibold text-slate-800 hover:text-indigo-600 truncate block"
                      >
                        {targetTask?.title || 'Unknown Task'}
                      </Link>
                      <div className="flex items-center gap-2 mt-1">
                        <span
                          className={`px-1.5 py-0.5 text-[10px] font-semibold rounded-md ${getStatusColor(
                            targetTask?.status
                          )}`}
                        >
                          {targetTask?.status || 'Unknown'}
                        </span>
                        <span className="text-[10px] text-slate-400">Finish-to-Start</span>
                      </div>
                    </div>
                    {canEdit && (
                      <button
                        onClick={() => handleRemoveDependency(d._id)}
                        className="p-1 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors"
                        title="Remove Dependency"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Blocking */}
        <div className="space-y-2">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide flex items-center gap-1.5">
            <ArrowRight className="w-3.5 h-3.5 text-indigo-500" />
            Blocking (Downstream Tasks)
          </div>
          {blocking.length === 0 ? (
            <div className="p-4 text-center text-xs text-slate-400 italic bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
              This task isn't blocking any other task
            </div>
          ) : (
            <div className="space-y-2">
              {blocking.map((d: any) => {
                const targetTask = d.toTaskId;
                return (
                  <div
                    key={d._id}
                    className="flex items-center justify-between gap-2 p-3 rounded-xl border border-slate-200 bg-white hover:border-indigo-300 transition-colors"
                  >
                    <div className="min-w-0 flex-1">
                      <Link
                        to={`/tasks/${targetTask?._id || targetTask}`}
                        className="text-xs font-semibold text-slate-800 hover:text-indigo-600 truncate block"
                      >
                        {targetTask?.title || 'Unknown Task'}
                      </Link>
                      <div className="flex items-center gap-2 mt-1">
                        <span
                          className={`px-1.5 py-0.5 text-[10px] font-semibold rounded-md ${getStatusColor(
                            targetTask?.status
                          )}`}
                        >
                          {targetTask?.status || 'Unknown'}
                        </span>
                      </div>
                    </div>
                    {canEdit && (
                      <button
                        onClick={() => handleRemoveDependency(d._id)}
                        className="p-1 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors"
                        title="Remove Dependency"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Add Prerequisite Form */}
      {canEdit && (
        <div className="pt-3 border-t border-slate-100">
          <label className="block text-xs font-semibold text-slate-600 mb-1.5">
            Add Prerequisite Task
          </label>
          <div className="flex gap-2">
            <select
              className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              value={prereqToAdd}
              onChange={(e) => setPrereqToAdd(e.target.value)}
            >
              <option value="">Select task that must be completed first...</option>
              {tasksForDeps
                .filter((t) => t._id !== taskId)
                .slice(0, 200)
                .map((t) => (
                  <option key={t._id} value={t._id}>
                    {t.title} ({t.status})
                  </option>
                ))}
            </select>
            <button
              className="btn-primary px-4 py-2 text-xs font-semibold inline-flex items-center gap-1.5 disabled:opacity-50"
              disabled={!prereqToAdd || addingDep}
              onClick={handleAddPrereq}
            >
              <Plus className="w-4 h-4" />
              {addingDep ? 'Adding...' : 'Link Prerequisite'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
