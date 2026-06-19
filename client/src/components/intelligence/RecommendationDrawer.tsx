import { X } from 'lucide-react';
import type { Recommendation } from '../../types/intelligence';
import {
  formatAgentLabel,
  getRecommendationSummary,
  getStatusBadgeColor,
} from '../../utils/intelligence';

interface RecommendationDrawerProps {
  recommendation: Recommendation | null;
  onClose: () => void;
  onAccept?: (id: string) => void;
  onReject?: (id: string) => void;
  readOnly?: boolean;
  loading?: boolean;
}

export default function RecommendationDrawer({
  recommendation,
  onClose,
  onAccept,
  onReject,
  readOnly = false,
  loading = false,
}: RecommendationDrawerProps) {
  if (!recommendation) return null;

  return (
    <>
      <button
        type="button"
        className="fixed inset-0 z-40 bg-slate-950/60 backdrop-blur-sm"
        onClick={onClose}
        aria-label="Close drawer"
      />
      <aside className="fixed inset-y-0 right-0 z-50 w-full max-w-lg bg-app-panel border-l border-app-border shadow-2xl flex flex-col">
        <div className="flex items-start justify-between gap-3 border-b border-app-border px-4 py-4">
          <div className="min-w-0">
            <h3 className="text-base font-semibold text-white truncate">
              {formatAgentLabel(recommendation.agentId)}
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              {new Date(recommendation.createdAt).toLocaleString()}
            </p>
            <span
              className={`inline-flex mt-2 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${getStatusBadgeColor(recommendation.status)}`}
            >
              {recommendation.status}
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 hover:bg-white/5 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
          <div>
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">
              Summary
            </div>
            <p className="text-sm text-slate-200">{getRecommendationSummary(recommendation)}</p>
          </div>

          <div>
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">
              Output
            </div>
            <pre className="max-h-80 overflow-auto rounded-lg bg-slate-950/50 border border-app-border p-3 text-xs text-slate-300">
              {JSON.stringify(recommendation.output, null, 2)}
            </pre>
          </div>

          {Object.keys(recommendation.input || {}).length > 0 && (
            <div>
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">
                Input
              </div>
              <pre className="max-h-40 overflow-auto rounded-lg bg-slate-950/50 border border-app-border p-3 text-xs text-slate-400">
                {JSON.stringify(recommendation.input, null, 2)}
              </pre>
            </div>
          )}
        </div>

        {recommendation.status === 'pending' && !readOnly && (
          <div className="border-t border-app-border px-4 py-4 flex gap-2">
            <button
              type="button"
              disabled={loading}
              onClick={() => onAccept?.(recommendation._id)}
              className="btn-primary flex-1 disabled:opacity-50"
            >
              Accept
            </button>
            <button
              type="button"
              disabled={loading}
              onClick={() => onReject?.(recommendation._id)}
              className="btn-secondary flex-1 disabled:opacity-50"
            >
              Reject
            </button>
          </div>
        )}
      </aside>
    </>
  );
}
