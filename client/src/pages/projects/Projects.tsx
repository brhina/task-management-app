import { useContext, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Folder, ChevronRight, Pencil, GanttChart, Timer } from 'lucide-react';
import PageShell from '../../components/common/PageShell';
import FilterToolbar from '../../components/common/FilterToolbar';
import AdvancedTable, { RowActions, type Column, type ActionItem } from '../../components/common/AdvancedTable';
import api from '../../utils/axios';
import { apiPaths } from '../../utils/apiPaths';
import { UserContext } from '../../context/UserContext';
import CreateProject from './CreateProject';
import { getStatusColor } from '../../constants/taskStatus';
import type { Project, ProjectStatus } from '../../types';

const STATUS_OPTIONS: ProjectStatus[] = ['Planned', 'Active', 'Paused', 'Completed', 'Archived'];

const STATUS_COLORS: Record<string, string> = {
  Planned: 'bg-slate-500/15 text-slate-500 border-slate-500/30',
  Active: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  Paused: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  Completed: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
  Archived: 'bg-slate-500/10 text-slate-500 border-slate-500/20',
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
  if (!user || !canAccessAdminSuite()) {
    return (
      <PageShell title="Access Denied" subtitle="You don't have permission to access this page." />
    );
  }

  return (
    <PageShell
      title="Projects"
      subtitle="Organize work into outcomes and timelines"
      actions={
        <>
          <button
            type="button"
            onClick={() => setShowCreateProject(true)}
            className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-gray-100 transition-colors"
          >
            Create Project
          </button>
          <button
            type="button"
            onClick={fetchProjects}
            className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-gray-100 transition-colors"
          >
            Refresh
          </button>
        </>
      }
    >
      <div className="space-y-4">
        {error && <div className="alert-error">{error}</div>}

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

        {/* Project Table */}
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        ) : (
          (() => {
            const projectColumns: Column<Project>[] = [
              {
                key: 'name',
                header: 'Name',
                sortable: true,
                render: (p) => (
                  <span className="text-sm font-semibold text-slate-700 hover:text-primary cursor-pointer transition-colors" onClick={() => navigate(`/tasks?projectId=${p._id}`)}>
                    {p.name}
                  </span>
                ),
              },
              {
                key: 'status',
                header: 'Status',
                sortable: true,
                render: (p) => (
                  <span className={`inline-flex px-2 py-0.5 text-[10px] font-semibold rounded-full border ${STATUS_COLORS[p.status] || ''}`}>
                    {p.status}
                  </span>
                ),
              },
              {
                key: 'description',
                header: 'Description',
                render: (p) => (
                  <span className="text-sm text-slate-700 line-clamp-1 max-w-xs block">
                    {p.description || '—'}
                  </span>
                ),
              },
              {
                key: 'timeline',
                header: 'Timeline',
                render: (p) => {
                  const daysLeft = p.targetDate
                    ? Math.ceil((new Date(p.targetDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
                    : null;
                  const isOverdue = daysLeft !== null && daysLeft < 0 && p.status !== 'Completed' && p.status !== 'Archived';
                  return (
                    <div className="flex items-center gap-3 text-[10px] text-slate-500">
                      {p.startDate && (
                        <span>{new Date(p.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                      )}
                      {p.targetDate && (
                        <span className={isOverdue ? 'text-rose-400 font-medium' : ''}>
                          → {new Date(p.targetDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          {isOverdue && ` (${Math.abs(daysLeft!)}d overdue)`}
                          {!isOverdue && daysLeft !== null && daysLeft >= 0 && ` (${daysLeft}d left)`}
                        </span>
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
                    { label: 'Gantt', onClick: () => navigate(`/projects/${p._id}/gantt`) },
                    { label: 'Sprints', onClick: () => navigate(`/projects/${p._id}/sprints`) },
                    { label: 'Edit', onClick: () => navigate(`/projects/${p._id}/edit`) },
                  ]} />
                ),
              },
            ];
            return (
              <AdvancedTable
                data={filteredProjects}
                columns={projectColumns}
                onRowClick={(p) => navigate(`/tasks?projectId=${p._id}`)}
                emptyMessage={projects.length === 0 ? 'No projects yet. Create your first project to get started.' : 'No projects match your filters.'}
                emptyIcon={<Folder className="w-12 h-12 text-slate-600 mx-auto mb-3" />}
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
