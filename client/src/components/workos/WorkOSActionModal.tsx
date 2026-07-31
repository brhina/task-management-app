import { useState } from 'react';
import { Zap, AlertTriangle, CheckCircle2, X, RefreshCw } from 'lucide-react';
import api from '../../utils/axios';
import { apiPaths } from '../../utils/apiPaths';

interface ActionItem {
  id: string;
  type: string;
  title: string;
  description: string;
  targetCount?: number;
  impactScore?: string;
}

interface WorkOSActionModalProps {
  action: ActionItem | null;
  onClose: () => void;
  onSuccess: (message: string) => void;
}

export default function WorkOSActionModal({
  action,
  onClose,
  onSuccess,
}: WorkOSActionModalProps) {
  const [executing, setExecuting] = useState(false);
  const [error, setError] = useState('');

  if (!action) return null;

  const handleExecute = async () => {
    try {
      setExecuting(true);
      setError('');
      const res = await api.post(apiPaths.WORKOS.EXECUTE_ACTION, {
        actionType: action.type,
      });
      onSuccess(res.data?.message || `Action executed successfully.`);
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to execute WorkOS action');
    } finally {
      setExecuting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-gray-100 overflow-hidden transform transition-all">
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-primary to-primary-hover text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-amber-300" />
            <h3 className="text-base font-bold">Execute Automated Action</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-white/80 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          {error && <div className="alert-error text-xs">{error}</div>}

          <div>
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-primary px-2 py-0.5 bg-primary/10 rounded">
              {action.impactScore || 'WorkOS Action'}
            </span>
            <h4 className="text-lg font-bold text-slate-800 mt-2">{action.title}</h4>
            <p className="text-xs text-slate-600 mt-1 leading-relaxed">
              {action.description}
            </p>
          </div>

          <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3.5 flex items-start gap-3 text-xs text-slate-700">
            <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold block text-slate-800">Impact Assessment</span>
              This action will directly update relevant task records in the background and re-compute your WorkOS Insights.
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={executing}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleExecute}
            disabled={executing}
            className="btn btn-primary text-xs px-4 py-2 font-bold flex items-center gap-2 shadow-md"
          >
            {executing ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                Executing…
              </>
            ) : (
              <>
                <CheckCircle2 className="w-3.5 h-3.5" />
                Confirm & Execute
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
