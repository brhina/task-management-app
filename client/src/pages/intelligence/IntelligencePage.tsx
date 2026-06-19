import { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  Brain,
  CheckCircle2,
  Play,
  RefreshCw,
  XCircle,
} from 'lucide-react';
import PageShell from '../../components/common/PageShell';
import InsightsPanel from '../../components/insights/InsightsPanel';
import RecommendationDrawer from '../../components/intelligence/RecommendationDrawer';
import { useAssistant } from '../../context/AssistantContext';
import { useIntelligenceActions } from '../../hooks/useIntelligenceActions';
import api from '../../utils/axios';
import { apiPaths } from '../../utils/apiPaths';
import { UserContext } from '../../context/UserContext';
import type {
  IntelligenceTab,
  Recommendation,
  StoredWorkflowRunRef,
} from '../../types/intelligence';
import {
  formatAgentLabel,
  getRecommendationSummary,
  getStatusBadgeColor,
  loadStoredWorkflowRuns,
  saveJobEnqueueRef,
} from '../../utils/intelligence';

const TABS: { id: IntelligenceTab; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'recommendations', label: 'Recommendations' },
  { id: 'jobs', label: 'Jobs' },
];

function IntelligencePage() {
  const { user, getEffectiveRole } = useContext(UserContext);
  const { setOpen, pendingRecCount } = useAssistant();
  const { fetchRecommendations, patchRecommendation } = useIntelligenceActions();

  const orgId = user?.activeOrgId || localStorage.getItem('activeOrgId') || '';
  const isAdmin = getEffectiveRole() === 'OrgAdmin';

  const [activeTab, setActiveTab] = useState<IntelligenceTab>('overview');
  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [recFilter, setRecFilter] = useState<'all' | 'pending' | 'accepted' | 'rejected'>('all');
  const [selectedRec, setSelectedRec] = useState<Recommendation | null>(null);
  const [workflowRuns, setWorkflowRuns] = useState<StoredWorkflowRunRef[]>([]);

  const loadRecommendations = useCallback(async () => {
    try {
      const params = recFilter !== 'all' ? recFilter : undefined;
      const data = await fetchRecommendations(params);
      setRecommendations(data);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      setError(e.response?.data?.message || 'Failed to load recommendations');
    }
  }, [fetchRecommendations, recFilter]);

  useEffect(() => {
    const init = async () => {
      setPageLoading(true);
      await loadRecommendations();
      setWorkflowRuns(loadStoredWorkflowRuns(orgId));
      setPageLoading(false);
    };
    init();
  }, [orgId, loadRecommendations]);

  useEffect(() => {
    if (activeTab === 'recommendations') loadRecommendations();
  }, [activeTab, recFilter, loadRecommendations]);

  const pendingRecs = useMemo(
    () => recommendations.filter((r) => r.status === 'pending'),
    [recommendations]
  );

  const filteredRecs = useMemo(() => {
    if (recFilter === 'all') return recommendations;
    return recommendations.filter((r) => r.status === recFilter);
  }, [recommendations, recFilter]);

  const handleRecommendation = async (id: string, status: 'accepted' | 'rejected') => {
    const prev = [...recommendations];
    setRecommendations((recs) =>
      recs.map((r) => (r._id === id ? { ...r, status } : r))
    );
    setSelectedRec(null);
    try {
      setLoading(true);
      await patchRecommendation(id, status);
      setSuccess(`Recommendation ${status}`);
      await loadRecommendations();
    } catch (err: unknown) {
      setRecommendations(prev);
      const e = err as { response?: { data?: { message?: string } } };
      setError(e.response?.data?.message || 'Failed to update recommendation');
    } finally {
      setLoading(false);
    }
  };

  const handleRiskMonitoringJob = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await api.post(apiPaths.INTELLIGENCE.JOB_RISK_MONITORING);
      const jobId = res.data?.data?.jobId;
      if (jobId) {
        saveJobEnqueueRef(orgId, String(jobId), 'risk-monitoring', 'Risk monitoring');
        setWorkflowRuns(loadStoredWorkflowRuns(orgId));
      }
      setSuccess('Risk monitoring job enqueued');
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      setError(e.response?.data?.message || 'Failed to enqueue job');
    } finally {
      setLoading(false);
    }
  };

  const handleExecutiveReportingJob = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await api.post(apiPaths.INTELLIGENCE.JOB_EXECUTIVE_REPORTING);
      const jobId = res.data?.data?.jobId;
      if (jobId) {
        saveJobEnqueueRef(orgId, String(jobId), 'executive-reporting', 'Executive reporting');
        setWorkflowRuns(loadStoredWorkflowRuns(orgId));
      }
      setSuccess('Executive reporting job enqueued');
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      setError(e.response?.data?.message || 'Failed to enqueue job');
    } finally {
      setLoading(false);
    }
  };

  if (pageLoading) {
    return (
      <PageShell title="AI Hub" subtitle="Loading admin intelligence workspace...">
        <div className="flex justify-center py-16">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell
      title="AI Hub"
      subtitle="Admin command center for recommendations, background jobs, and workflow history"
      actions={
        <button
          type="button"
          className="btn-secondary disabled:opacity-50"
          onClick={loadRecommendations}
          disabled={loading}
        >
          <RefreshCw className={`w-4 h-4 inline mr-1 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      }
    >
      <div className="space-y-4">
        {error && <div className="alert-error">{error}</div>}
        {success && <div className="alert-success">{success}</div>}

        <div className="card bg-gradient-to-r from-primary/10 to-transparent border-primary/20">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="flex items-center gap-3 flex-1">
              <div className="p-2 rounded-xl bg-primary/20">
                <Brain className="w-5 h-5 text-primary" />
              </div>
              <div>
                <div className="text-sm font-medium text-slate-200">
                  AI is embedded on every page — use the Assistant panel for planning, risks, and reports.
                </div>
                <div className="text-xs text-slate-400 mt-0.5">
                  {pendingRecCount || pendingRecs.length} pending recommendation
                  {(pendingRecCount || pendingRecs.length) !== 1 ? 's' : ''}
                </div>
              </div>
            </div>
            <button type="button" className="btn-primary" onClick={() => setOpen(true)}>
              Open Assistant
            </button>
          </div>
        </div>

        <div className="flex gap-1 bg-slate-800/50 rounded-lg p-1 overflow-x-auto">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`shrink-0 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                activeTab === tab.id
                  ? 'bg-slate-700 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {tab.label}
              {tab.id === 'recommendations' && pendingRecs.length > 0 && (
                <span className="ml-1.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-500/20 text-[10px] text-amber-300 px-1">
                  {pendingRecs.length}
                </span>
              )}
            </button>
          ))}
        </div>

        {activeTab === 'overview' && (
          <InsightsPanel
            title="Embedded AI Assistant"
            subtitle="Day-to-day intelligence lives in the side panel on every page"
          >
            <p className="text-sm text-slate-400 mb-4">
              Use WorkOS, Tasks, Projects, and Goals pages with the Assistant open for context-aware
              quick actions. This hub is for reviewing AI outputs and running scheduled jobs.
            </p>
            {pendingRecs.length > 0 ? (
              <ul className="space-y-2">
                {pendingRecs.slice(0, 5).map((rec) => (
                  <li
                    key={rec._id}
                    className="flex items-center justify-between gap-3 rounded-lg border border-app-border bg-white/5 px-3 py-2 cursor-pointer hover:border-primary/30"
                    onClick={() => setSelectedRec(rec)}
                  >
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-slate-200 truncate">
                        {formatAgentLabel(rec.agentId)}
                      </div>
                      <div className="text-xs text-slate-500 truncate">
                        {getRecommendationSummary(rec)}
                      </div>
                    </div>
                    {isAdmin && (
                      <div className="flex gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          className="p-1.5 rounded-lg text-emerald-400 hover:bg-emerald-500/10"
                          onClick={() => handleRecommendation(rec._id, 'accepted')}
                        >
                          <CheckCircle2 className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          className="p-1.5 rounded-lg text-slate-400 hover:bg-white/5"
                          onClick={() => handleRecommendation(rec._id, 'rejected')}
                        >
                          <XCircle className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-slate-500 py-4 text-center">No pending recommendations.</p>
            )}
          </InsightsPanel>
        )}

        {activeTab === 'recommendations' && (
          <InsightsPanel
            title="AI Recommendations"
            subtitle="Review, accept, or reject AI-generated outputs"
            rightSlot={
              <select
                className="input-dark !py-1 !text-xs"
                value={recFilter}
                onChange={(e) =>
                  setRecFilter(e.target.value as typeof recFilter)
                }
              >
                <option value="all">All</option>
                <option value="pending">Pending</option>
                <option value="accepted">Accepted</option>
                <option value="rejected">Rejected</option>
              </select>
            }
          >
            {filteredRecs.length === 0 ? (
              <p className="text-sm text-slate-500 py-8 text-center">No recommendations found.</p>
            ) : (
              <div className="space-y-2">
                {filteredRecs.map((rec) => (
                  <div
                    key={rec._id}
                    className="flex items-center justify-between gap-3 rounded-lg border border-app-border bg-white/5 px-3 py-3 cursor-pointer hover:border-primary/30 transition-colors"
                    onClick={() => setSelectedRec(rec)}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-slate-200">
                          {formatAgentLabel(rec.agentId)}
                        </span>
                        <span
                          className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase ${getStatusBadgeColor(rec.status)}`}
                        >
                          {rec.status}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5 truncate">
                        {getRecommendationSummary(rec)}
                      </p>
                    </div>
                    {rec.status === 'pending' && isAdmin && (
                      <div className="flex gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          className="btn-primary !py-1 !px-2 !text-xs"
                          disabled={loading}
                          onClick={() => handleRecommendation(rec._id, 'accepted')}
                        >
                          Accept
                        </button>
                        <button
                          type="button"
                          className="btn-secondary !py-1 !px-2 !text-xs"
                          disabled={loading}
                          onClick={() => handleRecommendation(rec._id, 'rejected')}
                        >
                          Reject
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </InsightsPanel>
        )}

        {activeTab === 'jobs' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <InsightsPanel title="Background Jobs" subtitle="Trigger scheduled intelligence workflows">
              {isAdmin ? (
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="btn-primary disabled:opacity-50"
                    disabled={loading}
                    onClick={handleRiskMonitoringJob}
                  >
                    <Play className="w-4 h-4 inline mr-1" />
                    Risk Monitoring
                  </button>
                  <button
                    type="button"
                    className="btn-secondary disabled:opacity-50"
                    disabled={loading}
                    onClick={handleExecutiveReportingJob}
                  >
                    <Play className="w-4 h-4 inline mr-1" />
                    Executive Reporting
                  </button>
                </div>
              ) : (
                <p className="text-sm text-slate-500">Job triggers are available to organization admins.</p>
              )}
            </InsightsPanel>

            <InsightsPanel title="Recent Activity" subtitle="Workflow runs and enqueued jobs">
              {workflowRuns.length === 0 ? (
                <p className="text-sm text-slate-500 py-4 text-center">No recent runs.</p>
              ) : (
                <ul className="space-y-2">
                  {workflowRuns.map((run) => (
                    <li
                      key={run.id}
                      className="flex items-center justify-between gap-2 rounded-lg border border-app-border bg-white/5 px-3 py-2 text-sm"
                    >
                      <div className="min-w-0">
                        <div className="text-slate-200 truncate">{run.label}</div>
                        <div className="text-xs text-slate-500">{run.workflowId}</div>
                      </div>
                      <span
                        className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase ${getStatusBadgeColor(run.status)}`}
                      >
                        {run.status}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </InsightsPanel>
          </div>
        )}
      </div>

      <RecommendationDrawer
        recommendation={selectedRec}
        onClose={() => setSelectedRec(null)}
        onAccept={(id) => handleRecommendation(id, 'accepted')}
        onReject={(id) => handleRecommendation(id, 'rejected')}
        readOnly={!isAdmin}
        loading={loading}
      />
    </PageShell>
  );
}

export default IntelligencePage;
