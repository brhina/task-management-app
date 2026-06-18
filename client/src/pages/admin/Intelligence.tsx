import { useContext, useEffect, useState } from 'react';
import {
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Send,
} from 'lucide-react';
import PageShell from '../../components/common/PageShell';
import api from '../../utils/axios';
import { apiPaths } from '../../utils/apiPaths';
import { UserContext } from '../../context/UserContext';

interface Recommendation {
  _id: string;
  agentId: string;
  status: 'pending' | 'accepted' | 'rejected';
  output: Record<string, unknown>;
  createdAt: string;
}

function Intelligence() {
  const { user } = useContext(UserContext);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [result, setResult] = useState<Record<string, unknown> | null>(null);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [projectForm, setProjectForm] = useState({
    name: '',
    description: '',
    deadline: '',
    teamSize: 5,
    objectives: '',
  });

  const fetchRecommendations = async () => {
    try {
      const res = await api.get(apiPaths.INTELLIGENCE.RECOMMENDATIONS);
      setRecommendations(res.data?.data || []);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load recommendations');
    }
  };

  useEffect(() => {
    fetchRecommendations();
  }, [user?.activeOrgId]);

  const handleOrchestrate = async () => {
    if (!message.trim()) return;
    try {
      setLoading(true);
      setError('');
      const res = await api.post(apiPaths.INTELLIGENCE.ORCHESTRATE, { message });
      setResult(res.data?.data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Orchestration failed');
    } finally {
      setLoading(false);
    }
  };

  const handlePlanProject = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await api.post(apiPaths.INTELLIGENCE.PLAN_PROJECT, {
        ...projectForm,
        teamSize: Number(projectForm.teamSize),
        objectives: projectForm.objectives
          .split('\n')
          .map((o) => o.trim())
          .filter(Boolean),
        dryRun: true,
      });
      setResult(res.data?.data);
      await fetchRecommendations();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Project planning failed');
    } finally {
      setLoading(false);
    }
  };

  const handlePortfolio = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await api.get(apiPaths.INTELLIGENCE.PORTFOLIO);
      setResult(res.data?.data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Portfolio analysis failed');
    } finally {
      setLoading(false);
    }
  };

  const handleRecommendation = async (id: string, status: 'accepted' | 'rejected') => {
    try {
      setLoading(true);
      await api.patch(
        apiPaths.INTELLIGENCE.PATCH_RECOMMENDATION.replace(':id', id),
        { status }
      );
      await fetchRecommendations();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update recommendation');
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageShell
      title="Execution Intelligence"
      subtitle="AI-powered planning, risk analysis, and portfolio insights"
    >
      {error && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold text-slate-900">
            <Sparkles className="h-5 w-5 text-primary" />
            Natural Language Orchestrator
          </h2>
          <textarea
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
            rows={4}
            placeholder="e.g. Which projects are at risk this week?"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />
          <button
            type="button"
            onClick={handleOrchestrate}
            disabled={loading}
            className="mt-3 inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
          >
            <Send className="h-4 w-4" />
            Run Intelligence
          </button>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-3 text-lg font-semibold text-slate-900">Quick Project Plan</h2>
          <div className="space-y-3">
            <input
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              placeholder="Project name"
              value={projectForm.name}
              onChange={(e) => setProjectForm({ ...projectForm, name: e.target.value })}
            />
            <textarea
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              rows={2}
              placeholder="Description"
              value={projectForm.description}
              onChange={(e) =>
                setProjectForm({ ...projectForm, description: e.target.value })
              }
            />
            <input
              type="date"
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              value={projectForm.deadline}
              onChange={(e) => setProjectForm({ ...projectForm, deadline: e.target.value })}
            />
            <textarea
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              rows={2}
              placeholder="Objectives (one per line)"
              value={projectForm.objectives}
              onChange={(e) => setProjectForm({ ...projectForm, objectives: e.target.value })}
            />
          </div>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={handlePlanProject}
              disabled={loading}
              className="rounded-xl bg-primary px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
            >
              Generate Plan
            </button>
            <button
              type="button"
              onClick={handlePortfolio}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700"
            >
              <RefreshCw className="h-4 w-4" />
              Portfolio Health
            </button>
          </div>
        </section>
      </div>

      <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold text-slate-900">
          <AlertTriangle className="h-5 w-5 text-amber-500" />
          AI Recommendations
        </h2>
        {recommendations.length === 0 ? (
          <p className="text-sm text-slate-500">No recommendations yet.</p>
        ) : (
          <div className="space-y-3">
            {recommendations.map((rec) => (
              <div
                key={rec._id}
                className="rounded-xl border border-slate-200 p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium text-slate-900">{rec.agentId}</p>
                    <p className="text-xs text-slate-500">
                      {new Date(rec.createdAt).toLocaleString()} · {rec.status}
                    </p>
                  </div>
                  {rec.status === 'pending' && (
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => handleRecommendation(rec._id, 'accepted')}
                        className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Accept
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRecommendation(rec._id, 'rejected')}
                        className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700"
                      >
                        <XCircle className="h-3.5 w-3.5" />
                        Reject
                      </button>
                    </div>
                  )}
                </div>
                <pre className="mt-3 max-h-40 overflow-auto rounded-lg bg-slate-50 p-3 text-xs text-slate-700">
                  {JSON.stringify(rec.output, null, 2)}
                </pre>
              </div>
            ))}
          </div>
        )}
      </section>

      {result && (
        <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-3 text-lg font-semibold text-slate-900">Latest Result</h2>
          <pre className="max-h-96 overflow-auto rounded-xl bg-slate-50 p-4 text-xs text-slate-700">
            {JSON.stringify(result, null, 2)}
          </pre>
        </section>
      )}
    </PageShell>
  );
}

export default Intelligence;
