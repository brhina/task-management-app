import { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Brain,
  Calendar,
  CheckCircle2,
  Layers,
  Play,
  RefreshCw,
  Send,
  Target,
  XCircle,
  Zap,
} from 'lucide-react';
import PageShell from '../../components/common/PageShell';
import InsightsPanel from '../../components/insights/InsightsPanel';
import JsonBlock from '../../components/intelligence/JsonBlock';
import PlanPreview from '../../components/intelligence/PlanPreview';
import RecommendationDrawer from '../../components/intelligence/RecommendationDrawer';
import api, { INTELLIGENCE_TIMEOUT_MS } from '../../utils/axios';
import { apiPaths } from '../../utils/apiPaths';
import { UserContext } from '../../context/UserContext';
import type {
  ExecutiveIntelligence,
  IntelligenceTab,
  ProjectPlan,
  Recommendation,
  RiskAnalysis,
  SprintPlan,
  StatusReport,
  StoredWorkflowRunRef,
  TaskBreakdown,
} from '../../types/intelligence';
import {
  formatAgentLabel,
  getRecommendationSummary,
  getRiskLevelColor,
  getStatusBadgeColor,
  loadStoredWorkflowRuns,
  normalizeExecutive,
  normalizeProjectPlan,
  normalizeRiskAnalysis,
  normalizeSprintPlan,
  normalizeStatusReport,
  normalizeTaskBreakdown,
  saveJobEnqueueRef,
  saveWorkflowRunRef,
} from '../../utils/intelligence';

const TABS: { id: IntelligenceTab; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'planner', label: 'Planner' },
  { id: 'breakdown', label: 'Breakdown' },
  { id: 'risks', label: 'Risks' },
  { id: 'sprint', label: 'Sprint' },
  { id: 'reports', label: 'Reports' },
  { id: 'recommendations', label: 'Recommendations' },
  { id: 'jobs', label: 'Jobs' },
];

interface IntelligencePageProps {
  readOnly?: boolean;
}

function IntelligencePage({ readOnly = false }: IntelligencePageProps) {
  const { user, getEffectiveRole } = useContext(UserContext);
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

  const [portfolio, setPortfolio] = useState<ExecutiveIntelligence | null>(null);
  const [orchestratorMessage, setOrchestratorMessage] = useState('');
  const [orchestratorResult, setOrchestratorResult] = useState<unknown>(null);

  const [projectForm, setProjectForm] = useState({
    name: '',
    description: '',
    deadline: '',
    teamSize: 5,
    objectives: '',
  });
  const [planResult, setPlanResult] = useState<ProjectPlan | null>(null);

  const [breakdownForm, setBreakdownForm] = useState({
    taskTitle: '',
    taskDescription: '',
    taskId: '',
  });
  const [breakdownResult, setBreakdownResult] = useState<TaskBreakdown | null>(null);

  const [riskForm, setRiskForm] = useState({ projectId: '', scope: 'org' as 'org' | 'project' });
  const [riskResult, setRiskResult] = useState<RiskAnalysis | null>(null);

  const [sprintForm, setSprintForm] = useState({
    projectId: '',
    sprintName: '',
    startDate: '',
    endDate: '',
    publish: false,
  });
  const [sprintResult, setSprintResult] = useState<SprintPlan | null>(null);

  const [reportType, setReportType] = useState<'daily' | 'weekly' | 'executive' | 'health'>(
    'weekly'
  );
  const [reportResult, setReportResult] = useState<StatusReport | null>(null);

  const fetchRecommendations = useCallback(async () => {
    try {
      const params = recFilter !== 'all' ? { status: recFilter } : {};
      const res = await api.get(apiPaths.INTELLIGENCE.RECOMMENDATIONS, { params });
      setRecommendations(res.data?.data || []);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      setError(e.response?.data?.message || 'Failed to load recommendations');
    }
  }, [recFilter]);

  const fetchPortfolio = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const res = await api.get(apiPaths.INTELLIGENCE.PORTFOLIO, {
        timeout: INTELLIGENCE_TIMEOUT_MS,
      });
      setPortfolio(normalizeExecutive(res.data?.data));
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      const message = e.response?.data?.message || '';
      if (message.includes('openrouter') || message.includes('Authentication')) {
        setError(
          'Portfolio intelligence could not reach OpenRouter. Check OPENAI_API_KEY (OpenRouter key) in server/.env.'
        );
      } else if (message.includes('quota') || message.includes('rate-limit') || message.includes('429')) {
        setError(
          'OpenRouter rate limit reached. Wait a moment and retry, or switch OPENROUTER_MODEL in server/.env.'
        );
      } else {
        setError(message || 'Failed to load portfolio intelligence');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const init = async () => {
      setPageLoading(true);
      await fetchRecommendations();
      setWorkflowRuns(loadStoredWorkflowRuns(orgId));
      setPageLoading(false);
    };
    init();
  }, [orgId, fetchRecommendations]);

  useEffect(() => {
    if (activeTab === 'recommendations') fetchRecommendations();
  }, [activeTab, recFilter, fetchRecommendations]);

  const pendingRecs = useMemo(
    () => recommendations.filter((r) => r.status === 'pending'),
    [recommendations]
  );

  const filteredRecs = useMemo(() => {
    if (recFilter === 'all') return recommendations;
    return recommendations.filter((r) => r.status === recFilter);
  }, [recommendations, recFilter]);

  const runAction = async (fn: () => Promise<void>) => {
    try {
      setLoading(true);
      setError('');
      setSuccess('');
      await fn();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      setError(e.response?.data?.message || 'Action failed');
    } finally {
      setLoading(false);
    }
  };

  const handleOrchestrate = () =>
    runAction(async () => {
      if (!orchestratorMessage.trim()) return;
      const res = await api.post(
        apiPaths.INTELLIGENCE.ORCHESTRATE,
        { message: orchestratorMessage },
        { timeout: INTELLIGENCE_TIMEOUT_MS }
      );
      setOrchestratorResult(res.data?.data);
      await fetchRecommendations();
    });

  const handlePlanProject = () =>
    runAction(async () => {
      const res = await api.post(
        apiPaths.INTELLIGENCE.PLAN_PROJECT,
        {
          ...projectForm,
          teamSize: Number(projectForm.teamSize),
          objectives: projectForm.objectives
            .split('\n')
            .map((o) => o.trim())
            .filter(Boolean),
          dryRun: true,
        },
        { timeout: INTELLIGENCE_TIMEOUT_MS }
      );
      const plan =
        normalizeProjectPlan(res.data?.data?.result) ||
        normalizeProjectPlan(res.data?.data);
      setPlanResult(plan);
      if (res.data?.data?.workflowRunId) {
        saveWorkflowRunRef(orgId, {
          id: String(res.data.data.workflowRunId),
          workflowId: 'project-creation',
          label: 'Project plan',
          status: 'completed',
          createdAt: new Date().toISOString(),
        });
        setWorkflowRuns(loadStoredWorkflowRuns(orgId));
      }
      await fetchRecommendations();
      setSuccess('Project plan generated');
    });

  const handleBreakdown = () =>
    runAction(async () => {
      const res = await api.post(apiPaths.INTELLIGENCE.BREAKDOWN_TASK, breakdownForm, {
        timeout: INTELLIGENCE_TIMEOUT_MS,
      });
      setBreakdownResult(normalizeTaskBreakdown(res.data?.data?.result ?? res.data?.data));
      await fetchRecommendations();
    });

  const handleAnalyzeRisks = () =>
    runAction(async () => {
      const res = await api.post(apiPaths.INTELLIGENCE.ANALYZE_RISKS, riskForm, {
        timeout: INTELLIGENCE_TIMEOUT_MS,
      });
      setRiskResult(normalizeRiskAnalysis(res.data?.data?.result || res.data?.data));
      await fetchRecommendations();
    });

  const handlePlanSprint = () =>
    runAction(async () => {
      const res = await api.post(
        apiPaths.INTELLIGENCE.PLAN_SPRINT,
        {
          ...sprintForm,
          publish: readOnly ? false : sprintForm.publish,
        },
        { timeout: INTELLIGENCE_TIMEOUT_MS }
      );
      setSprintResult(normalizeSprintPlan(res.data?.data?.result || res.data?.data));
      if (res.data?.data?.workflowRunId) {
        saveWorkflowRunRef(orgId, {
          id: String(res.data.data.workflowRunId),
          workflowId: 'sprint-planning',
          label: sprintForm.sprintName || 'Sprint plan',
          status: 'completed',
          createdAt: new Date().toISOString(),
        });
        setWorkflowRuns(loadStoredWorkflowRuns(orgId));
      }
      await fetchRecommendations();
    });

  const handleGenerateReport = () =>
    runAction(async () => {
      const path = apiPaths.INTELLIGENCE.GENERATE_REPORT.replace(':type', reportType);
      const res = await api.post(path, { reportType }, { timeout: INTELLIGENCE_TIMEOUT_MS });
      setReportResult(normalizeStatusReport(res.data?.data));
    });

  const handleRecommendation = async (id: string, status: 'accepted' | 'rejected') => {
    const prev = [...recommendations];
    setRecommendations((recs) =>
      recs.map((r) => (r._id === id ? { ...r, status } : r))
    );
    setSelectedRec(null);
    try {
      setLoading(true);
      await api.patch(apiPaths.INTELLIGENCE.PATCH_RECOMMENDATION.replace(':id', id), {
        status,
      });
      setSuccess(`Recommendation ${status}`);
      await fetchRecommendations();
    } catch (err: unknown) {
      setRecommendations(prev);
      const e = err as { response?: { data?: { message?: string } } };
      setError(e.response?.data?.message || 'Failed to update recommendation');
    } finally {
      setLoading(false);
    }
  };

  const handleRiskMonitoringJob = () =>
    runAction(async () => {
      const res = await api.post(apiPaths.INTELLIGENCE.JOB_RISK_MONITORING);
      const jobId = res.data?.data?.jobId;
      if (jobId) {
        saveJobEnqueueRef(orgId, String(jobId), 'risk-monitoring', 'Risk monitoring');
        setWorkflowRuns(loadStoredWorkflowRuns(orgId));
      }
      setSuccess('Risk monitoring job enqueued');
    });

  const handleExecutiveReportingJob = () =>
    runAction(async () => {
      const res = await api.post(apiPaths.INTELLIGENCE.JOB_EXECUTIVE_REPORTING);
      const jobId = res.data?.data?.jobId;
      if (jobId) {
        saveJobEnqueueRef(orgId, String(jobId), 'executive-reporting', 'Executive reporting');
        setWorkflowRuns(loadStoredWorkflowRuns(orgId));
      }
      setSuccess('Executive reporting job enqueued');
    });

  if (pageLoading) {
    return (
      <PageShell title="Execution Intelligence" subtitle="Loading intelligence workspace...">
        <div className="flex justify-center py-16">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell
      title="Execution Intelligence"
      subtitle={
        readOnly
          ? 'AI insights for your work — planning assistance and risk visibility'
          : 'AI-powered planning, risk analysis, and portfolio execution intelligence'
      }
      actions={
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="btn-secondary disabled:opacity-50"
            onClick={() => {
              fetchRecommendations();
              fetchPortfolio();
            }}
            disabled={loading}
          >
            <RefreshCw className={`w-4 h-4 inline mr-1 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      }
    >
      <div className="space-y-4">
        {error && <div className="alert-error">{error}</div>}
        {success && <div className="alert-success">{success}</div>}

        {/* Banner */}
        <div className="card bg-gradient-to-r from-primary/10 to-transparent border-primary/20">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="flex items-center gap-3 flex-1">
              <div className="p-2 rounded-xl bg-primary/20">
                <Brain className="w-5 h-5 text-primary" />
              </div>
              <div>
                <div className="text-sm font-medium text-slate-200">
                  {portfolio?.summary ||
                    'Ask questions, generate plans, and review AI recommendations.'}
                </div>
                <div className="text-xs text-slate-400 mt-0.5">
                  {pendingRecs.length} pending recommendation
                  {pendingRecs.length !== 1 ? 's' : ''}
                  {portfolio ? ` · Portfolio: ${portfolio.portfolioHealth}` : ''}
                </div>
              </div>
            </div>
            {portfolio && (
              <div className="flex items-center gap-4 text-xs">
                <span
                  className={`rounded-full border px-2.5 py-1 font-semibold ${getRiskLevelColor(portfolio.portfolioHealth === 'Healthy' ? 'Low' : portfolio.portfolioHealth === 'At Risk' ? 'Medium' : 'High')}`}
                >
                  {portfolio.healthScore}% health
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Tabs */}
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

        {/* Overview */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <InsightsPanel
              title="Natural Language Query"
              subtitle="Route to the right intelligence agent automatically"
            >
              <textarea
                className="input-dark w-full"
                rows={3}
                placeholder="Which projects are at risk this week?"
                value={orchestratorMessage}
                onChange={(e) => setOrchestratorMessage(e.target.value)}
              />
              <button
                type="button"
                className="btn-primary mt-3 disabled:opacity-50"
                disabled={loading || !orchestratorMessage.trim()}
                onClick={handleOrchestrate}
              >
                <Send className="w-4 h-4 inline mr-1" />
                Run Intelligence
              </button>
              {orchestratorResult != null && (
                <div className="mt-4">
                  <JsonBlock data={orchestratorResult} maxHeight="max-h-64" />
                </div>
              )}
            </InsightsPanel>

            <InsightsPanel
              title="Portfolio Health"
              subtitle="Executive-level delivery intelligence"
            >
              {portfolio ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <span
                      className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${getRiskLevelColor(portfolio.portfolioHealth === 'Healthy' ? 'Low' : 'High')}`}
                    >
                      {portfolio.portfolioHealth}
                    </span>
                    <span className="text-sm text-slate-300">{portfolio.healthScore}% score</span>
                  </div>
                  <p className="text-sm text-slate-400">{portfolio.summary}</p>
                  {portfolio.strategicRisks.slice(0, 3).map((r, i) => (
                    <div key={i} className="text-sm border-l-2 border-rose-500/40 pl-3">
                      <span className="text-slate-200">{r.title}</span>
                      <p className="text-xs text-slate-500">{r.description}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <button type="button" className="btn-secondary" onClick={fetchPortfolio}>
                  Load portfolio
                </button>
              )}
            </InsightsPanel>

            <div className="lg:col-span-2">
              <InsightsPanel title="Pending Recommendations" subtitle="Review and approve AI outputs">
                {pendingRecs.length === 0 ? (
                  <p className="text-sm text-slate-500 py-4 text-center">No pending items.</p>
                ) : (
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
                        {!readOnly && isAdmin && (
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
                )}
              </InsightsPanel>
            </div>
          </div>
        )}

        {/* Planner */}
        {activeTab === 'planner' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <InsightsPanel title="Project Planner" subtitle="Generate a full WBS from natural language">
              <div className="space-y-3">
                <input
                  className="input-dark w-full"
                  placeholder="Project name"
                  value={projectForm.name}
                  onChange={(e) => setProjectForm({ ...projectForm, name: e.target.value })}
                />
                <textarea
                  className="input-dark w-full"
                  rows={2}
                  placeholder="Description"
                  value={projectForm.description}
                  onChange={(e) =>
                    setProjectForm({ ...projectForm, description: e.target.value })
                  }
                />
                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="date"
                    className="input-dark w-full"
                    value={projectForm.deadline}
                    onChange={(e) =>
                      setProjectForm({ ...projectForm, deadline: e.target.value })
                    }
                  />
                  <input
                    type="number"
                    min={1}
                    className="input-dark w-full"
                    placeholder="Team size"
                    value={projectForm.teamSize}
                    onChange={(e) =>
                      setProjectForm({ ...projectForm, teamSize: Number(e.target.value) })
                    }
                  />
                </div>
                <textarea
                  className="input-dark w-full"
                  rows={3}
                  placeholder="Objectives (one per line)"
                  value={projectForm.objectives}
                  onChange={(e) =>
                    setProjectForm({ ...projectForm, objectives: e.target.value })
                  }
                />
                <button
                  type="button"
                  className="btn-primary disabled:opacity-50"
                  disabled={loading || !projectForm.name}
                  onClick={handlePlanProject}
                >
                  <Target className="w-4 h-4 inline mr-1" />
                  Generate Plan (Preview)
                </button>
              </div>
            </InsightsPanel>
            <div>
              {planResult ? (
                <PlanPreview plan={planResult} />
              ) : (
                <div className="card text-center py-12 text-slate-500 text-sm">
                  Plan preview will appear here
                </div>
              )}
            </div>
          </div>
        )}

        {/* Breakdown */}
        {activeTab === 'breakdown' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <InsightsPanel title="Task Breakdown" subtitle="Split large tasks into actionable subtasks">
              <div className="space-y-3">
                <input
                  className="input-dark w-full"
                  placeholder="Task title"
                  value={breakdownForm.taskTitle}
                  onChange={(e) =>
                    setBreakdownForm({ ...breakdownForm, taskTitle: e.target.value })
                  }
                />
                <textarea
                  className="input-dark w-full"
                  rows={3}
                  placeholder="Task description (optional)"
                  value={breakdownForm.taskDescription}
                  onChange={(e) =>
                    setBreakdownForm({ ...breakdownForm, taskDescription: e.target.value })
                  }
                />
                <button
                  type="button"
                  className="btn-primary disabled:opacity-50"
                  disabled={loading || !breakdownForm.taskTitle}
                  onClick={handleBreakdown}
                >
                  <Layers className="w-4 h-4 inline mr-1" />
                  Break Down Task
                </button>
              </div>
            </InsightsPanel>
            <div>
              {breakdownResult ? (
                <div className="space-y-4">
                  <p className="text-sm text-slate-300">{breakdownResult.summary}</p>
                  <div className="card">
                    <div className="text-xs text-slate-400 mb-3">
                      {breakdownResult.subtasks.length} subtasks ·{' '}
                      {breakdownResult.totalEstimatedHours}h total
                    </div>
                    <ul className="space-y-3">
                      {breakdownResult.subtasks.map((st, i) => (
                        <li key={i} className="border-l-2 border-primary/40 pl-3">
                          <div className="text-sm font-medium text-slate-200">{st.title}</div>
                          <div className="text-xs text-slate-500 mt-0.5">
                            {st.estimatedHours}h · complexity {st.complexityScore}/10
                          </div>
                          {st.acceptanceCriteria.length > 0 && (
                            <ul className="mt-1 text-xs text-slate-400 list-disc pl-4">
                              {st.acceptanceCriteria.map((c, j) => (
                                <li key={j}>{c}</li>
                              ))}
                            </ul>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              ) : (
                <div className="card text-center py-12 text-slate-500 text-sm">
                  Breakdown results will appear here
                </div>
              )}
            </div>
          </div>
        )}

        {/* Risks */}
        {activeTab === 'risks' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <InsightsPanel title="Risk Analysis" subtitle="Live project health and risk assessment">
              <div className="space-y-3">
                <select
                  className="input-dark w-full"
                  value={riskForm.scope}
                  onChange={(e) =>
                    setRiskForm({
                      ...riskForm,
                      scope: e.target.value as 'org' | 'project',
                    })
                  }
                >
                  <option value="org">Organization-wide</option>
                  <option value="project">Single project</option>
                </select>
                {riskForm.scope === 'project' && (
                  <input
                    className="input-dark w-full"
                    placeholder="Project ID"
                    value={riskForm.projectId}
                    onChange={(e) =>
                      setRiskForm({ ...riskForm, projectId: e.target.value })
                    }
                  />
                )}
                <button
                  type="button"
                  className="btn-primary disabled:opacity-50"
                  disabled={loading}
                  onClick={handleAnalyzeRisks}
                >
                  <AlertTriangle className="w-4 h-4 inline mr-1" />
                  Analyze Risks
                </button>
              </div>
            </InsightsPanel>
            <div>
              {riskResult ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <span
                      className={`rounded-full border px-3 py-1 text-sm font-semibold ${getRiskLevelColor(riskResult.riskLevel)}`}
                    >
                      {riskResult.riskLevel}
                    </span>
                    {riskResult.healthScore != null && (
                      <span className="text-sm text-slate-400">
                        Health: {riskResult.healthScore}%
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-slate-300">{riskResult.summary}</p>
                  <div className="card">
                    <h4 className="text-sm font-semibold text-slate-200 mb-2">Root Causes</h4>
                    <ul className="space-y-1 text-sm text-slate-400">
                      {riskResult.rootCauses.map((c, i) => (
                        <li key={i}>• {c}</li>
                      ))}
                    </ul>
                  </div>
                  <div className="card">
                    <h4 className="text-sm font-semibold text-slate-200 mb-2">Recommendations</h4>
                    <ul className="space-y-1 text-sm text-slate-400">
                      {riskResult.recommendations.map((r, i) => (
                        <li key={i}>• {r}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              ) : (
                <div className="card text-center py-12 text-slate-500 text-sm">
                  Risk analysis will appear here
                </div>
              )}
            </div>
          </div>
        )}

        {/* Sprint */}
        {activeTab === 'sprint' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <InsightsPanel title="Sprint Planning" subtitle="Capacity-aware sprint generation">
              <div className="space-y-3">
                <input
                  className="input-dark w-full"
                  placeholder="Project ID"
                  value={sprintForm.projectId}
                  onChange={(e) =>
                    setSprintForm({ ...sprintForm, projectId: e.target.value })
                  }
                />
                <input
                  className="input-dark w-full"
                  placeholder="Sprint name"
                  value={sprintForm.sprintName}
                  onChange={(e) =>
                    setSprintForm({ ...sprintForm, sprintName: e.target.value })
                  }
                />
                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="date"
                    className="input-dark w-full"
                    value={sprintForm.startDate}
                    onChange={(e) =>
                      setSprintForm({ ...sprintForm, startDate: e.target.value })
                    }
                  />
                  <input
                    type="date"
                    className="input-dark w-full"
                    value={sprintForm.endDate}
                    onChange={(e) =>
                      setSprintForm({ ...sprintForm, endDate: e.target.value })
                    }
                  />
                </div>
                {!readOnly && isAdmin && (
                  <label className="flex items-center gap-2 text-sm text-slate-300">
                    <input
                      type="checkbox"
                      checked={sprintForm.publish}
                      onChange={(e) =>
                        setSprintForm({ ...sprintForm, publish: e.target.checked })
                      }
                      className="rounded border-app-border"
                    />
                    Publish sprint (creates sprint record)
                  </label>
                )}
                <button
                  type="button"
                  className="btn-primary disabled:opacity-50"
                  disabled={
                    loading ||
                    !sprintForm.projectId ||
                    !sprintForm.sprintName ||
                    !sprintForm.startDate ||
                    !sprintForm.endDate
                  }
                  onClick={handlePlanSprint}
                >
                  <Calendar className="w-4 h-4 inline mr-1" />
                  Generate Sprint Plan
                </button>
              </div>
            </InsightsPanel>
            <div>
              {sprintResult ? (
                <div className="space-y-4">
                  <p className="text-sm text-slate-300">{sprintResult.summary}</p>
                  <div className="card">
                    <h4 className="text-sm font-semibold text-slate-200 mb-2">Assignments</h4>
                    <ul className="space-y-1 text-sm text-slate-400">
                      {sprintResult.assignments.map((a, i) => (
                        <li key={i}>
                          {a.taskTitle} — {a.assigneeName || 'Unassigned'} ({a.effortHours}h)
                        </li>
                      ))}
                    </ul>
                  </div>
                  {sprintResult.warnings && sprintResult.warnings.length > 0 && (
                    <div className="card border-amber-500/30">
                      <h4 className="text-sm font-semibold text-amber-400 mb-2">Warnings</h4>
                      <ul className="text-sm text-slate-400 space-y-1">
                        {sprintResult.warnings.map((w, i) => (
                          <li key={i}>• {w}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ) : (
                <div className="card text-center py-12 text-slate-500 text-sm">
                  Sprint plan will appear here
                </div>
              )}
            </div>
          </div>
        )}

        {/* Reports */}
        {activeTab === 'reports' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <InsightsPanel title="Status Reports" subtitle="Generate executive and team reports">
              <div className="space-y-3">
                <select
                  className="input-dark w-full"
                  value={reportType}
                  onChange={(e) =>
                    setReportType(e.target.value as typeof reportType)
                  }
                >
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="executive">Executive</option>
                  <option value="health">Health</option>
                </select>
                <button
                  type="button"
                  className="btn-primary disabled:opacity-50"
                  disabled={loading}
                  onClick={handleGenerateReport}
                >
                  <Zap className="w-4 h-4 inline mr-1" />
                  Generate Report
                </button>
              </div>
            </InsightsPanel>
            <div>
              {reportResult ? (
                <div className="space-y-4">
                  <div>
                    <h3 className="text-lg font-semibold text-white">{reportResult.title}</h3>
                    <p className="text-sm text-slate-400 mt-1">{reportResult.summary}</p>
                  </div>
                  {reportResult.highlights.length > 0 && (
                    <div className="card">
                      <h4 className="text-sm font-semibold text-slate-200 mb-2">Highlights</h4>
                      <ul className="text-sm text-slate-400 space-y-1">
                        {reportResult.highlights.map((h, i) => (
                          <li key={i}>• {h}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {reportResult.blockers.length > 0 && (
                    <div className="card border-rose-500/20">
                      <h4 className="text-sm font-semibold text-rose-400 mb-2">Blockers</h4>
                      <ul className="text-sm text-slate-400 space-y-1">
                        {reportResult.blockers.map((b, i) => (
                          <li key={i}>• {b}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ) : (
                <div className="card text-center py-12 text-slate-500 text-sm">
                  Report will appear here
                </div>
              )}
            </div>
          </div>
        )}

        {/* Recommendations */}
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
                      <p className="text-[10px] text-slate-600 mt-0.5">
                        {new Date(rec.createdAt).toLocaleString()}
                      </p>
                    </div>
                    {rec.status === 'pending' && !readOnly && isAdmin && (
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

        {/* Jobs */}
        {activeTab === 'jobs' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <InsightsPanel
              title="Background Jobs"
              subtitle={readOnly ? 'View scheduled intelligence jobs' : 'Trigger scheduled intelligence workflows'}
            >
              {!readOnly && isAdmin ? (
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
                <p className="text-sm text-slate-500">
                  Job triggers are available to organization admins.
                </p>
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
        readOnly={readOnly || !isAdmin}
        loading={loading}
      />
    </PageShell>
  );
}

export default IntelligencePage;
