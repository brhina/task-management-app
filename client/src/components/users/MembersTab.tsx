import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Users, UsersRound, Crown, Folder, CheckCircle2, Shield, MoreVertical, LayoutGrid, List } from 'lucide-react';
import FilterToolbar from '../common/FilterToolbar';
import NavTabs from '../common/NavTabs';
import AdvancedTable, { RowActions, type Column, type ActionItem } from '../common/AdvancedTable';
import type { UserWithTaskCounts, Team } from './UserTeamsModal';
import type { Task, Project } from '../../types';

import type { CustomRoleOption } from './ChangeRoleModal';

interface MembersTabProps {
  users: UserWithTaskCounts[];
  teams: Team[];
  tasks: Task[];
  projects: Project[];
  loading: boolean;
  hasPermission: (perm: string) => boolean;
  customRoles?: CustomRoleOption[];
  onOpenUserTeamsModal: (user: UserWithTaskCounts) => void;
  onOpenChangeRoleModal?: (user: UserWithTaskCounts) => void;
  onDeleteUser: (userId: string) => void;
}

export default function MembersTab({
  users,
  teams,
  tasks,
  projects,
  loading,
  hasPermission,
  customRoles = [],
  onOpenUserTeamsModal,
  onOpenChangeRoleModal,
  onDeleteUser,
}: MembersTabProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [teamFilter, setTeamFilter] = useState('');
  const [workloadFilter, setWorkloadFilter] = useState('');
  const [projectFilter, setProjectFilter] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const getTotalTasks = (u: UserWithTaskCounts) =>
    (u.pendingTasks || 0) + (u.inProgressTasks || 0) + (u.completedTasks || 0);

  const getWorkloadStatus = (u: UserWithTaskCounts) => {
    const active = (u.pendingTasks || 0) + (u.inProgressTasks || 0);
    if (active === 0)
      return {
        label: 'Idle',
        color: 'text-slate-500',
        bg: 'bg-slate-100 border-slate-200',
        bar: 'bg-slate-300',
      };
    if (active <= 3)
      return {
        label: 'Light',
        color: 'text-emerald-600',
        bg: 'bg-emerald-50 border-emerald-200/80',
        bar: 'bg-gradient-to-r from-emerald-400 to-emerald-500',
      };
    if (active <= 7)
      return {
        label: 'Moderate',
        color: 'text-sky-600',
        bg: 'bg-sky-50 border-sky-200/80',
        bar: 'bg-gradient-to-r from-sky-400 to-sky-500',
      };
    if (active <= 12)
      return {
        label: 'Heavy',
        color: 'text-amber-600',
        bg: 'bg-amber-50 border-amber-200/80',
        bar: 'bg-gradient-to-r from-amber-400 to-amber-500',
      };
    return {
      label: 'Overloaded',
      color: 'text-rose-600',
      bg: 'bg-rose-50 border-rose-200/80',
      bar: 'bg-gradient-to-r from-rose-500 to-red-600',
    };
  };

  const getCompletionRate = (u: UserWithTaskCounts) => {
    const total = getTotalTasks(u);
    if (total === 0) return 0;
    return Math.round(((u.completedTasks || 0) / total) * 100);
  };

  const getUserTeams = (userId: string) => {
    return teams.filter((t) =>
      (t.memberIds || []).some((m) => (typeof m === 'string' ? m === userId : m._id === userId))
    );
  };

  const getUserLeadTeams = (userId: string) => {
    return teams.filter((t) => {
      const leadId = typeof t.leadId === 'string' ? t.leadId : t.leadId?._id;
      return leadId === userId;
    });
  };

  const getUserProjects = (userId: string) => {
    const projectIds = new Set<string>();
    tasks.forEach((t) => {
      const assigneeId = typeof t.assignedTo === 'string' ? t.assignedTo : t.assignedTo?._id;
      if (assigneeId === userId && t.projectId) {
        const pid = typeof t.projectId === 'string' ? t.projectId : t.projectId?._id;
        if (pid) projectIds.add(pid);
      }
    });
    return projects.filter((p) => projectIds.has(p._id));
  };

  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const matchesSearch =
        !searchTerm ||
        u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.email.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesRole = !roleFilter || u.role === roleFilter;

      let matchesTeam = true;
      if (teamFilter) {
        const uTeams = getUserTeams(u._id);
        matchesTeam = uTeams.some((t) => t._id === teamFilter);
      }

      const wl = getWorkloadStatus(u);
      const matchesWorkload =
        !workloadFilter || wl.label.toLowerCase() === workloadFilter.toLowerCase();

      let matchesProject = true;
      if (projectFilter) {
        const userProjects = getUserProjects(u._id);
        matchesProject = userProjects.some((p) => p._id === projectFilter);
      }

      return matchesSearch && matchesRole && matchesTeam && matchesWorkload && matchesProject;
    });
  }, [users, searchTerm, roleFilter, teamFilter, workloadFilter, projectFilter, tasks, projects, teams]);

  const projectsWithMembers = useMemo(() => {
    const map: Record<string, Set<string>> = {};
    tasks.forEach((t) => {
      const assigneeId = typeof t.assignedTo === 'string' ? t.assignedTo : t.assignedTo?._id;
      const pid = typeof t.projectId === 'string' ? t.projectId : t.projectId?._id;
      if (assigneeId && pid) {
        if (!map[pid]) map[pid] = new Set();
        map[pid].add(assigneeId);
      }
    });
    return map;
  }, [tasks]);

  return (
    <div className="space-y-4">
      {/* Modern Filter Toolbar */}
      <FilterToolbar
        searchValue={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="Search by member name, email, or role..."
        filters={[
          {
            id: 'roleFilter',
            label: 'Role',
            value: roleFilter,
            onChange: setRoleFilter,
            options: [
              { value: '', label: 'All Roles' },
              { value: 'OrgAdmin', label: 'Owner' },
              { value: 'OrgMember', label: 'Member' },
            ],
          },
          {
            id: 'teamFilter',
            label: 'Team',
            value: teamFilter,
            onChange: setTeamFilter,
            options: [
              { value: '', label: 'All Teams' },
              ...teams.map((t) => ({
                value: t._id,
                label: `${t.name} (${t.memberIds?.length || 0})`,
              })),
            ],
          },
          {
            id: 'projectFilter',
            label: 'Project',
            value: projectFilter,
            onChange: setProjectFilter,
            options: [
              { value: '', label: 'All Projects' },
              ...projects
                .filter((p) => projectsWithMembers[p._id]?.size > 0)
                .map((p) => ({
                  value: p._id,
                  label: `${p.name} (${projectsWithMembers[p._id]?.size || 0})`,
                })),
            ],
          },
          {
            id: 'workloadFilter',
            label: 'Workload',
            value: workloadFilter,
            onChange: setWorkloadFilter,
            options: [
              { value: '', label: 'All Workloads' },
              { value: 'idle', label: 'Idle' },
              { value: 'light', label: 'Light' },
              { value: 'moderate', label: 'Moderate' },
              { value: 'heavy', label: 'Heavy' },
              { value: 'overloaded', label: 'Overloaded' },
            ],
          },
        ]}
        actions={
          <NavTabs<'grid' | 'list'>
            size="sm"
            tabs={[
              { id: 'grid', label: 'Grid', icon: LayoutGrid },
              { id: 'list', label: 'List', icon: List },
            ]}
            activeTab={viewMode}
            onChange={setViewMode}
          />
        }
      />

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
        </div>
      ) : filteredUsers.length === 0 ? (
        <div className="bg-white/80 rounded-2xl border border-slate-200/80 text-center py-16 px-4 shadow-sm">
          <Users className="w-14 h-14 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-700">No members found</h3>
          <p className="text-slate-400 text-xs mt-1">
            {users.length === 0 ? 'Your organization has no members yet.' : 'Try adjusting your search or filters.'}
          </p>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {filteredUsers.map((u) => {
            const wl = getWorkloadStatus(u);
            const completion = getCompletionRate(u);
            const active = (u.pendingTasks || 0) + (u.inProgressTasks || 0);
            const userProjects = getUserProjects(u._id);
            const uTeams = getUserTeams(u._id);
            const uLeadTeams = getUserLeadTeams(u._id);

            return (
              <div
                key={u._id}
                className="card group relative hover:shadow-md hover:border-primary/40 transition-all p-5 flex flex-col justify-between"
              >
                <div>
                  {/* Top Member Header */}
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <div className="flex items-center gap-3.5">
                      <div className="relative">
                        {u.profileImageUrl ? (
                          <img
                            className="h-12 w-12 rounded-2xl ring-2 ring-slate-100 object-cover shadow-sm"
                            src={u.profileImageUrl}
                            alt={u.name}
                          />
                        ) : (
                          <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-primary/10 to-indigo-500/20 text-primary font-extrabold text-base flex items-center justify-center ring-2 ring-primary/10 shadow-sm">
                            {u.name?.charAt(0).toUpperCase() || '?'}
                          </div>
                        )}
                        <span className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full bg-emerald-500 ring-2 ring-white" />
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-sm font-bold text-slate-800 truncate group-hover:text-primary transition-colors">
                          {u.name}
                        </h4>
                        <p className="text-xs text-slate-400 truncate mt-0.5">{u.email}</p>
                        <div className="flex items-center gap-1.5 mt-1.5">
                          <span
                            className={`inline-flex px-2 py-0.5 text-[10px] font-bold rounded-full border ${
                              u.role === 'OrgAdmin' || u.role === 'Owner'
                                ? 'bg-purple-500/10 text-purple-600 border-purple-500/30'
                                : u.role === 'Manager'
                                ? 'bg-indigo-500/10 text-indigo-600 border-indigo-500/30'
                                : u.role === 'Viewer'
                                ? 'bg-slate-500/10 text-slate-600 border-slate-500/30'
                                : u.role === 'Custom'
                                ? 'bg-amber-500/10 text-amber-600 border-amber-500/30'
                                : 'bg-sky-500/10 text-sky-600 border-sky-500/30'
                            }`}
                          >
                            {u.role === 'OrgAdmin' || u.role === 'Owner'
                              ? 'Owner'
                              : u.role === 'OrgMember'
                              ? 'Member'
                              : u.role === 'Custom'
                              ? customRoles.find((c) => c._id === u.customRoleId)?.name || u.customRoleName || 'Custom'
                              : u.role}
                          </span>
                          <span
                            className={`inline-flex px-2 py-0.5 text-[10px] font-bold rounded-full border ${wl.bg} ${wl.color}`}
                          >
                            {wl.label} Workload
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Teams Badges */}
                  <div className="mb-3.5 p-3 rounded-xl bg-slate-50/70 border border-slate-100">
                    <div className="text-[10px] uppercase font-bold tracking-wider text-slate-400 mb-1.5 flex items-center justify-between">
                      <span>Teams & Departments</span>
                      {hasPermission('team:manage') && (
                        <button
                          onClick={() => onOpenUserTeamsModal(u)}
                          className="text-primary hover:underline text-[10px] lowercase font-semibold"
                        >
                          edit
                        </button>
                      )}
                    </div>
                    {uTeams.length === 0 && uLeadTeams.length === 0 ? (
                      <div className="text-[11px] text-slate-400 italic">No assigned teams</div>
                    ) : (
                      <div className="flex flex-wrap gap-1.5">
                        {uLeadTeams.map((t) => (
                          <span
                            key={`lead-${t._id}`}
                            className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold rounded-lg bg-amber-500/10 text-amber-600 border border-amber-500/30 shadow-2xs"
                            title={`Team Lead of ${t.name}`}
                          >
                            <Crown className="w-3 h-3 text-amber-500" />
                            {t.name} (Lead)
                          </span>
                        ))}
                        {uTeams
                          .filter((t) => !uLeadTeams.some((lt) => lt._id === t._id))
                          .map((t) => (
                            <span
                              key={t._id}
                              className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium rounded-lg bg-white text-slate-700 border border-slate-200/80 shadow-2xs"
                            >
                              <UsersRound className="w-3 h-3 text-slate-400" />
                              {t.name}
                            </span>
                          ))}
                      </div>
                    )}
                  </div>

                  {/* Projects */}
                  {userProjects.length > 0 && (
                    <div className="mb-3.5">
                      <div className="text-[10px] uppercase font-bold tracking-wider text-slate-400 mb-1.5">
                        Assigned Projects
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {userProjects.slice(0, 3).map((p) => (
                          <Link
                            key={p._id}
                            to={`/tasks?projectId=${p._id}`}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-[10px] font-semibold rounded-lg bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 transition-colors"
                          >
                            <Folder className="w-3 h-3" />
                            {p.name}
                          </Link>
                        ))}
                        {userProjects.length > 3 && (
                          <span className="text-[10px] font-medium text-slate-400 self-center">
                            +{userProjects.length - 3} more
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Workload Gradient Bar */}
                  <div className="mb-3">
                    <div className="flex items-center justify-between text-[10px] font-semibold mb-1">
                      <span className="text-slate-400 uppercase tracking-wide">Active Workload</span>
                      <span className={`tabular-nums ${wl.color}`}>{active} active tasks</span>
                    </div>
                    <div className="h-2 rounded-full bg-slate-100 overflow-hidden p-0.5 border border-slate-200/50">
                      <div
                        className={`h-full rounded-full ${wl.bar} transition-all duration-500`}
                        style={{ width: `${Math.min(100, Math.max(8, (active / 15) * 100))}%` }}
                      />
                    </div>
                  </div>

                  {/* Completion Rate */}
                  <div className="mb-2">
                    <div className="flex items-center justify-between text-[10px] font-semibold mb-1">
                      <span className="text-slate-400 uppercase tracking-wide">Task Completion</span>
                      <span className="text-slate-700 font-bold tabular-nums">{completion}%</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-teal-500 transition-all duration-500"
                        style={{ width: `${completion}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Card Footer Actions */}
                <div className="flex items-center justify-between pt-3.5 mt-3 border-t border-slate-100">
                  <span className="text-[10px] text-slate-400 font-medium">
                    Joined{' '}
                    {new Date(u.createdAt || '').toLocaleDateString('en-US', {
                      month: 'short',
                      year: 'numeric',
                    })}
                  </span>
                  <div className="flex items-center gap-2">
                    {hasPermission('member:manage') && (
                      <button
                        onClick={() => onOpenChangeRoleModal?.(u)}
                        className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 hover:underline transition-colors flex items-center gap-1"
                      >
                        <Shield className="w-3 h-3" />
                        Role
                      </button>
                    )}
                    {hasPermission('team:manage') && (
                      <button
                        onClick={() => onOpenUserTeamsModal(u)}
                        className="text-xs font-semibold text-primary hover:text-primary-hover hover:underline transition-colors"
                      >
                        Teams
                      </button>
                    )}
                    {hasPermission('member:manage') &&
                      (u.role as string) !== 'OrgAdmin' &&
                      (u.role as string) !== 'Owner' && (
                        <button
                          onClick={() => onDeleteUser(u._id)}
                          className="text-xs font-semibold text-rose-500 hover:text-rose-600 hover:underline transition-colors"
                        >
                          Remove
                        </button>
                      )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        (() => {
          const userColumns: Column<UserWithTaskCounts>[] = [
            {
              key: 'name',
              header: 'Member',
              sortable: true,
              render: (u) => (
                <div className="flex items-center gap-3">
                  {u.profileImageUrl ? (
                    <img
                      className="h-9 w-9 rounded-xl ring-2 ring-slate-100 object-cover"
                      src={u.profileImageUrl}
                      alt={u.name}
                    />
                  ) : (
                    <div className="h-9 w-9 rounded-xl bg-primary/10 text-primary font-bold flex items-center justify-center ring-2 ring-primary/10 text-xs">
                      {u.name?.charAt(0).toUpperCase() || '?'}
                    </div>
                  )}
                  <div>
                    <div className="text-sm font-semibold text-slate-800 flex items-center gap-1.5">
                      <span>{u.name}</span>
                      <span
                        className={`inline-flex px-1.5 py-0.2 text-[9px] font-bold rounded-full border ${
                          u.role === 'OrgAdmin' || u.role === 'Owner'
                            ? 'bg-purple-500/10 text-purple-600 border-purple-500/30'
                            : u.role === 'Manager'
                            ? 'bg-indigo-500/10 text-indigo-600 border-indigo-500/30'
                            : u.role === 'Viewer'
                            ? 'bg-slate-500/10 text-slate-600 border-slate-500/30'
                            : u.role === 'Custom'
                            ? 'bg-amber-500/10 text-amber-600 border-amber-500/30'
                            : 'bg-sky-500/10 text-sky-600 border-sky-500/30'
                        }`}
                      >
                        {u.role === 'OrgAdmin' || u.role === 'Owner'
                          ? 'Owner'
                          : u.role === 'OrgMember'
                          ? 'Member'
                          : u.role === 'Custom'
                          ? customRoles.find((c) => c._id === u.customRoleId)?.name || u.customRoleName || 'Custom'
                          : u.role}
                      </span>
                    </div>
                    <div className="text-xs text-slate-400">{u.email}</div>
                  </div>
                </div>
              ),
            },
            {
              key: 'teams',
              header: 'Teams',
              render: (u) => {
                const uTeams = getUserTeams(u._id);
                if (uTeams.length === 0)
                  return <span className="text-xs text-slate-400 italic">—</span>;
                return (
                  <div className="flex flex-wrap gap-1">
                    {uTeams.slice(0, 2).map((t) => (
                      <span
                        key={t._id}
                        className="inline-flex px-2 py-0.5 text-[10px] font-semibold rounded-md bg-slate-100 text-slate-700 border border-slate-200/80"
                      >
                        {t.name}
                      </span>
                    ))}
                    {uTeams.length > 2 && (
                      <span className="text-[10px] text-slate-500 font-medium">+{uTeams.length - 2}</span>
                    )}
                  </div>
                );
              },
            },
            {
              key: 'projects',
              header: 'Projects',
              render: (u) => {
                const userProjects = getUserProjects(u._id);
                return (
                  <div className="flex flex-wrap gap-1">
                    {userProjects.slice(0, 2).map((p) => (
                      <Link
                        key={p._id}
                        to={`/tasks?projectId=${p._id}`}
                        className="inline-flex px-2 py-0.5 text-[10px] font-semibold rounded-md bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 transition-colors"
                      >
                        {p.name}
                      </Link>
                    ))}
                    {userProjects.length > 2 && (
                      <span className="text-[10px] text-slate-500 font-medium">+{userProjects.length - 2}</span>
                    )}
                  </div>
                );
              },
            },
            {
              key: 'workload',
              header: 'Workload',
              sortable: true,
              render: (u) => {
                const wl = getWorkloadStatus(u);
                const active = (u.pendingTasks || 0) + (u.inProgressTasks || 0);
                return (
                  <div className="flex items-center gap-2">
                    <div className="w-16 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                      <div
                        className={`h-full rounded-full ${wl.bar}`}
                        style={{ width: `${Math.min(100, Math.max(8, (active / 15) * 100))}%` }}
                      />
                    </div>
                    <span className={`text-[10px] font-bold ${wl.color}`}>{wl.label}</span>
                  </div>
                );
              },
            },
            {
              key: 'tasks',
              header: 'Tasks',
              render: (u) => {
                const total = getTotalTasks(u);
                return (
                  <div className="flex items-center gap-2.5 text-xs font-semibold tabular-nums">
                    <span className="text-amber-500">{u.pendingTasks || 0}</span>
                    <span className="text-sky-500">{u.inProgressTasks || 0}</span>
                    <span className="text-emerald-500">{u.completedTasks || 0}</span>
                    <span className="text-slate-400 font-normal">/ {total}</span>
                  </div>
                );
              },
            },
            {
              key: 'actions',
              header: 'Actions',
              className: 'w-[50px]',
              render: (u) => {
                const items: ActionItem[] = [];
                if (hasPermission('member:manage')) {
                  items.push({
                    label: 'Change Role',
                    onClick: () => onOpenChangeRoleModal?.(u),
                  });
                }
                if (hasPermission('team:manage')) {
                  items.push({
                    label: 'Manage Teams',
                    onClick: () => onOpenUserTeamsModal(u),
                  });
                }
                if (
                  hasPermission('member:manage') &&
                  (u.role as string) !== 'OrgAdmin' &&
                  (u.role as string) !== 'Owner'
                ) {
                  items.push({
                    label: 'Remove Member',
                    onClick: () => onDeleteUser(u._id),
                    className: 'text-rose-500',
                  });
                }
                if (items.length === 0) return null;
                return <RowActions items={items} />;
              },
            },
          ];
          return (
            <AdvancedTable
              data={filteredUsers}
              columns={userColumns}
              emptyMessage={
                users.length === 0 ? 'No team members yet.' : 'No members match your filters.'
              }
              emptyIcon={<Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />}
            />
          );
        })()
      )}
    </div>
  );
}
