import { useContext, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Folder, ChevronRight, Pencil, GanttChart, Timer, Target, Clock, CheckCircle2,
  AlertTriangle, Plus, RefreshCw, LayoutGrid, List, Layers, Calendar, ArrowRight, User
} from 'lucide-react';
import PageShell from '../../components/common/PageShell';
import FilterToolbar from '../../components/common/FilterToolbar';
import AdvancedTable, { RowActions, type Column } from '../../components/common/AdvancedTable';
import api from '../../utils/axios';
import { apiPaths } from '../../utils/apiPaths';
import { UserContext } from '../../context/UserContext';
import CreateProject from './CreateProject';
import type { Project, ProjectStatus } from '../../types';

const STATUS_OPTIONS: ProjectStatus[] = ['Planned', 'Active', 'Paused', 'Completed', 'Archived'];

const STATUS_COLORS: Record<string, string> = {
  Planned: 'bg-slate-100 text-slate-700 border-slate-200',
  Active: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  Paused: 'bg-amber-50 text-amber-700 border-amber-200',
  Completed: 'bg-blue-50 text-blue-700 border-blue-200',
  Archived: 'bg-slate-100 text-slate-500 border-slate-200',
};

function Projects() {
  const { user, canAccessAdminSuite } = useContext(UserContext);
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateProject, setShowCreateProject] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

  const fetchProjects = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await api.get(apiPaths.PROJECTS.LIST);
      setProjects(res.data?.data?.projects || []);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load projects');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

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

  // Overall Portfolio Outcome Highlights
  const portfolioStats = useMemo(() => {
    const total = projects.length;
    const active = projects.filter((p) => p.status === 'Active').length;
    const completed = projects.filter((p) => p.status === 'Completed').length;
    
    let totalTasks = 0;
    let completedTasks = 0;
    let overdueTasks = 0;
    
    projects.forEach((p) => {
      if (p.metrics) {
        totalTasks += p.metrics.totalTasks || 0;
        completedTasks += p.metrics.completedTasks || 0;
        overdueTasks += p.metrics.overdueTasks || 0;
      }
    });

    const overallProgress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    return { total, active, completed, totalTasks, completedTasks, overdueTasks, overallProgress };
  }, [projects]);

  if (!user || !canAccessAdminSuite()) {
    return (
      <PageShell title="Access Denied" subtitle="You don't have permission to access this page." />
    );
  }

  return (
    <PageShell
      title="Projects & Outcomes"
      subtitle="Organize work into clear strategic outcomes, milestones, and timeline deliverables"
      actions={
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={fetchProjects}
            className="p-2 text-slate-600 hover:text-slate-800 bg-white border border-slate-200 rounded-xl shadow-sm hover:bg-slate-50 transition-colors"
            title="Refresh Projects"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            type="button"
            onClick={() => setShowCreateProject(true)}
            className="btn btn-primary text-xs px-3.5 py-2 font-bold flex items-center gap-1.5 shadow-sm"
          >
            <Plus className="w-4 h-4" />
            New Project
          </button>
        </div>
      }
    >
      <div className="space-y-5">
        {error && <div className="alert-error">{error}</div>}

        {/* Portfolio KPI Outcomes Summary */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="card bg-white border border-gray-200 p-4">
            <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
              <span>Active Projects</span>
              <Folder className="w-4 h-4 text-primary" />
            </div>
            <div className="text-2xl font-black text-slate-800 mt-2">
              {portfolioStats.active} <span className="text-xs font-semibold text-slate-400">/ {portfolioStats.total}</span>
            </div>
            <div className="text-[10px] text-slate-400 mt-1">
              {portfolioStats.completed} projects completed
            </div>
          </div>

          <div className="card bg-white border border-gray-200 p-4">
            <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
              <span>Portfolio Progress</span>
              <Target className="w-4 h-4 text-emerald-500" />
            </div>
            <div className="text-2xl font-black text-emerald-600 mt-2">
              {portfolioStats.overallProgress}%
            </div>
            <div className="h-1.5 rounded-full bg-slate-100 mt-1.5 overflow-hidden">
              <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${portfolioStats.overallProgress}%` }} />
            </div>
          </div>

          <div className="card bg-white border border-gray-200 p-4">
            <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
              <span>Total Work Outcomes</span>
              <Layers className="w-4 h-4 text-blue-500" />
            </div>
            <div className="text-2xl font-black text-slate-800 mt-2">
              {portfolioStats.completedTasks} <span className="text-xs font-semibold text-slate-400">/ {portfolioStats.totalTasks}</span>
            </div>
            <div className="text-[10px] text-slate-400 mt-1">
              Tasks executed across projects
            </div>
          </div>

          <div className="card bg-white border border-gray-200 p-4">
            <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
              <span>Timeline Risks</span>
              <AlertTriangle className="w-4 h-4 text-amber-500" />
            </div>
            <div className="text-2xl font-black text-amber-600 mt-2">
              {portfolioStats.overdueTasks}
            </div>
            <div className="text-[10px] text-slate-400 mt-1">
              Overdue tasks requiring attention
            </div>
          </div>
        </div>

        {/* Toolbar & View Mode Switcher */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-2 rounded-xl border border-gray-200">
          <div className="flex-1">
            <FilterToolbar
              searchValue={searchTerm}
              onSearchChange={setSearchTerm}
              searchPlaceholder="Search projects by name or outcome description..."
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
          </div>

          <div className="flex items-center justify-end gap-1 bg-slate-100 p-1 rounded-lg shrink-0">
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-1 ${
                viewMode === 'grid' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-800'
              }`}
              title="Grid View"
            >
              <LayoutGrid className="w-4 h-4" />
              <span className="hidden sm:inline">Cards</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-1 ${
                viewMode === 'table' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-800'
              }`}
              title="Table View"
            >
              <List className="w-4 h-4" />
              <span className="hidden sm:inline">Table</span>
            </button>
          </div>
        </div>

        {/* Projects Content Section */}
        {loading ? (
          <div className="card p-16 flex justify-center">
            <div className="animate-spin rounded-full h-10 w-10 border-4 border-slate-200 border-t-primary" />
          </div>
        ) : filteredProjects.length === 0 ? (
          <div className="card p-12 text-center text-slate-500">
            <Folder className="w-12 h-12 text-slate-400 mx-auto mb-3" />
            <h4 className="text-base font-bold text-slate-700">No Projects Found</h4>
            <p className="text-xs text-slate-500 mt-1">
              {projects.length === 0 ? 'Create your first project to organize outcomes and timelines.' : 'No projects match your filters.'}
            </p>
          </div>
        ) : viewMode === 'grid' ? (
          /* Grid Outcome Cards */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredProjects.map((p) => {
              const daysLeft = p.targetDate
                ? Math.ceil((new Date(p.targetDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
                : null;
              const isOverdue = daysLeft !== null && daysLeft < 0 && p.status !== 'Completed' && p.status !== 'Archived';
              const progress = p.metrics?.progressPercent ?? 0;
              const ownerName = typeof p.ownerId === 'object' ? p.ownerId?.name : 'Project Lead';

              return (
                <div key={p._id} className="card bg-white border border-gray-200 p-5 hover:border-primary/40 hover:shadow-cardHover transition-all flex flex-col justify-between group">
                  <div className="space-y-3">
                    {/* Header */}
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className={`inline-flex px-2 py-0.5 text-[10px] font-extrabold rounded-full border ${STATUS_COLORS[p.status] || ''}`}>
                          {p.status}
                        </span>
                        <h3
                          onClick={() => navigate(`/tasks?projectId=${p._id}`)}
                          className="text-base font-bold text-slate-800 hover:text-primary transition-colors cursor-pointer mt-1.5 line-clamp-1"
                        >
                          {p.name}
                        </h3>
                      </div>

                      <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                        <button
                          type="button"
                          onClick={() => navigate(`/projects/${p._id}/gantt`)}
                          className="p-1.5 text-slate-400 hover:text-primary hover:bg-slate-50 rounded-lg transition-colors"
                          title="Gantt Timeline"
                        >
                          <GanttChart className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => navigate(`/projects/${p._id}/sprints`)}
                          className="p-1.5 text-slate-400 hover:text-primary hover:bg-slate-50 rounded-lg transition-colors"
                          title="Agile Sprints"
                        >
                          <Timer className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => navigate(`/projects/${p._id}/edit`)}
                          className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-50 rounded-lg transition-colors"
                          title="Edit Project"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <p className="text-xs text-slate-600 line-clamp-2 min-h-[32px] leading-relaxed">
                      {p.description || 'No specific objective description provided.'}
                    </p>

                    {/* Progress Bar */}
                    <div className="space-y-1 pt-1">
                      <div className="flex items-center justify-between text-[10px] font-bold text-slate-500">
                        <span>Outcome Completion</span>
                        <span className="text-slate-800">{progress}%</span>
                      </div>
                      <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                        <div
                          className="h-full bg-primary rounded-full transition-all duration-300"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>

                    {/* Timeline & Metrics Row */}
                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 text-xs">
                      <div>
                        <span className="text-[10px] font-semibold text-slate-400 uppercase block">Tasks Progress</span>
                        <span className="font-bold text-slate-700">
                          {p.metrics?.completedTasks ?? 0} / {p.metrics?.totalTasks ?? 0} Done
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] font-semibold text-slate-400 uppercase block">Timeline target</span>
                        <span className={`font-bold ${isOverdue ? 'text-rose-600' : 'text-slate-700'}`}>
                          {p.targetDate ? new Date(p.targetDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'Flexible'}
                          {isOverdue && ' (Overdue)'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Footer Card Navigation */}
                  <div className="pt-4 mt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5 text-slate-500 font-medium">
                      <User className="w-3.5 h-3.5" />
                      <span className="truncate max-w-[110px]">{ownerName}</span>
                    </div>

                    <button
                      type="button"
                      onClick={() => navigate(`/tasks?projectId=${p._id}`)}
                      className="text-xs font-bold text-primary hover:text-primary-hover flex items-center gap-1 transition-colors"
                    >
                      View Outcomes
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* Table View */
          (() => {
            const projectColumns: Column<Project>[] = [
              {
                key: 'name',
                header: 'Project & Outcome',
                sortable: true,
                render: (p) => (
                  <div>
                    <span
                      className="text-sm font-bold text-slate-800 hover:text-primary cursor-pointer transition-colors block"
                      onClick={() => navigate(`/tasks?projectId=${p._id}`)}
                    >
                      {p.name}
                    </span>
                    <span className="text-xs text-slate-500 line-clamp-1">
                      {p.description || 'No description'}
                    </span>
                  </div>
                ),
              },
              {
                key: 'status',
                header: 'Status',
                sortable: true,
                render: (p) => (
                  <span className={`inline-flex px-2 py-0.5 text-[10px] font-bold rounded-full border ${STATUS_COLORS[p.status] || ''}`}>
                    {p.status}
                  </span>
                ),
              },
              {
                key: 'progress',
                header: 'Outcome Progress',
                render: (p) => {
                  const progress = p.metrics?.progressPercent ?? 0;
                  return (
                    <div className="w-32">
                      <div className="flex items-center justify-between text-[10px] font-semibold text-slate-500 mb-0.5">
                        <span>{progress}%</span>
                        <span>{p.metrics?.completedTasks ?? 0}/{p.metrics?.totalTasks ?? 0}</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
                        <div className="h-full bg-primary rounded-full" style={{ width: `${progress}%` }} />
                      </div>
                    </div>
                  );
                },
              },
              {
                key: 'timeline',
                header: 'Timeline & Target',
                render: (p) => {
                  const daysLeft = p.targetDate
                    ? Math.ceil((new Date(p.targetDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
                    : null;
                  const isOverdue = daysLeft !== null && daysLeft < 0 && p.status !== 'Completed' && p.status !== 'Archived';
                  return (
                    <div className="text-xs text-slate-600">
                      {p.startDate && (
                        <span>{new Date(p.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} → </span>
                      )}
                      {p.targetDate ? (
                        <span className={isOverdue ? 'text-rose-600 font-bold' : 'font-medium'}>
                          {new Date(p.targetDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          {isOverdue && ` (${Math.abs(daysLeft!)}d overdue)`}
                        </span>
                      ) : (
                        <span className="text-slate-400 italic">No target date</span>
                      )}
                    </div>
                  );
                },
              },
              {
                key: 'actions',
                header: 'Actions',
                className: 'w-[50px]',
                render: (p) => (
                  <RowActions items={[
                    { label: 'Gantt Chart', onClick: () => navigate(`/projects/${p._id}/gantt`) },
                    { label: 'Sprints & Milestones', onClick: () => navigate(`/projects/${p._id}/sprints`) },
                    { label: 'Edit Project', onClick: () => navigate(`/projects/${p._id}/edit`) },
                  ]} />
                ),
              },
            ];
            return (
              <AdvancedTable
                data={filteredProjects}
                columns={projectColumns}
                onRowClick={(p) => navigate(`/tasks?projectId=${p._id}`)}
                emptyMessage="No projects match your filters."
                emptyIcon={<Folder className="w-12 h-12 text-slate-400 mx-auto mb-3" />}
              />
            );
          })()
        )}
      </div>

      <CreateProject
        isOpen={showCreateProject}
        onClose={() => setShowCreateProject(false)}
        onCreated={fetchProjects}
      />
    </PageShell>
  );
}

export default Projects;

