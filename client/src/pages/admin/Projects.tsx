import { useContext, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import PageShell from '../../components/common/PageShell';
import FilterToolbar from '../../components/common/FilterToolbar';
import api from '../../utils/axios';
import { apiPaths } from '../../utils/apiPaths';
import { UserContext } from '../../context/UserContext';
import { getStatusColor } from '../../constants/taskStatus';
import type { Project, ProjectStatus } from '../../types';

const STATUS_OPTIONS: ProjectStatus[] = ['Planned', 'Active', 'Paused', 'Completed', 'Archived'];

const STATUS_COLORS: Record<string, string> = {
  Planned: 'bg-slate-500/15 text-slate-400 border-slate-500/30',
  Active: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  Paused: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  Completed: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
  Archived: 'bg-slate-500/10 text-slate-500 border-slate-500/20',
};

function Projects() {
  const { user, getEffectiveRole } = useContext(UserContext);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const fetchProjects = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await api.get(apiPaths.PROJECTS.LIST);
      setProjects(res.data?.data || []);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load projects');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const p of projects) counts[p.status] = (counts[p.status] || 0) + 1;
    return counts;
  }, [projects]);

  const filteredProjects = useMemo(() => {
    return projects.filter((p) => {
      const matchesStatus = !statusFilter || p.status === statusFilter;
      const matchesSearch =
        !searchTerm ||
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.description?.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesStatus && matchesSearch;
    });
  }, [projects, statusFilter, searchTerm]);

  const effectiveRole = getEffectiveRole();
  if (!user || effectiveRole !== 'OrgAdmin') {
    return (
      <PageShell title="Access Denied" subtitle="You don't have permission to access this page." />
    );
  }

  return (
    <PageShell
      title="Projects"
      subtitle="Organize work into outcomes and timelines"
      actions={
        <div className="flex gap-2">
          <Link to="/admin/projects/create" className="btn-primary">
            Create Project
          </Link>
          <button type="button" className="btn-secondary" onClick={fetchProjects}>
            Refresh
          </button>
        </div>
      }
    >
      <div className="space-y-4">
        {error && <div className="alert-error">{error}</div>}

        {/* Status Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {STATUS_OPTIONS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setStatusFilter(statusFilter === s ? '' : s)}
              className={`card text-left transition-all ${
                statusFilter === s
                  ? 'ring-2 ring-primary/50 border-primary/40'
                  : 'hover:border-slate-600'
              }`}
            >
              <div className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">
                {s}
              </div>
              <div className="mt-1.5 text-2xl font-bold text-slate-100 tabular-nums">
                {statusCounts[s] || 0}
              </div>
              <div className="mt-2 h-1 rounded-full bg-slate-700 overflow-hidden">
                <div
                  className="h-full rounded-full bg-primary transition-all"
                  style={{
                    width: `${projects.length ? ((statusCounts[s] || 0) / projects.length) * 100 : 0}%`,
                  }}
                />
              </div>
            </button>
          ))}
        </div>

        {/* Search */}
        <FilterToolbar
          searchValue={searchTerm}
          onSearchChange={setSearchTerm}
          searchPlaceholder="Search projects by name or description..."
          filters={[
            {
              id: 'statusFilter',
              label: 'Status',
              value: statusFilter,
              onChange: setStatusFilter,
              options: [
                { value: '', label: 'All Statuses' },
                ...STATUS_OPTIONS.map((s) => ({ value: s, label: s })),
              ],
            },
          ]}
        />

        {/* Project Grid */}
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        ) : filteredProjects.length === 0 ? (
          <div className="card text-center py-12">
            <svg
              className="w-12 h-12 text-slate-600 mx-auto mb-3"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
              />
            </svg>
            <div className="text-slate-400 text-sm">
              {projects.length === 0
                ? 'No projects yet. Create your first project to get started.'
                : 'No projects match your filters.'}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredProjects.map((p) => {
              const daysLeft = p.targetDate
                ? Math.ceil((new Date(p.targetDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
                : null;
              const isOverdue =
                daysLeft !== null &&
                daysLeft < 0 &&
                p.status !== 'Completed' &&
                p.status !== 'Archived';

              return (
                <Link
                  key={p._id}
                  to={`/admin/manage-tasks?projectId=${p._id}`}
                  className="card group hover:border-primary/40 transition-all"
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h3 className="text-sm font-semibold text-slate-200 group-hover:text-primary truncate transition-colors">
                      {p.name}
                    </h3>
                    <span
                      className={`shrink-0 inline-flex px-2 py-0.5 text-[10px] font-semibold rounded-full border ${STATUS_COLORS[p.status] || ''}`}
                    >
                      {p.status}
                    </span>
                  </div>

                  {p.description && (
                    <p className="text-xs text-slate-400 line-clamp-2 mb-3">{p.description}</p>
                  )}

                  <div className="flex items-center justify-between text-[10px] text-slate-500 mt-auto pt-2 border-t border-slate-700/50">
                    <div className="flex items-center gap-3">
                      {p.startDate && (
                        <span>
                          {new Date(p.startDate).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                          })}
                        </span>
                      )}
                      {p.targetDate && (
                        <span className={isOverdue ? 'text-rose-400 font-medium' : ''}>
                          →{' '}
                          {new Date(p.targetDate).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                          })}
                          {isOverdue && ` (${Math.abs(daysLeft!)}d overdue)`}
                          {!isOverdue &&
                            daysLeft !== null &&
                            daysLeft >= 0 &&
                            ` (${daysLeft}d left)`}
                        </span>
                      )}
                    </div>
                    <svg
                      className="w-4 h-4 text-slate-600 group-hover:text-primary transition-colors"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </PageShell>
  );
}

export default Projects;
