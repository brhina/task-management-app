import { useMemo, useState } from 'react';
import { UsersRound, Plus, Crown, BarChart2, Pencil, Trash2, LayoutGrid, List, ChevronRight } from 'lucide-react';
import FilterToolbar from '../common/FilterToolbar';
import NavTabs from '../common/NavTabs';
import AdvancedTable, { RowActions, type Column, type ActionItem } from '../common/AdvancedTable';
import type { Team } from './UserTeamsModal';

interface TeamsTabProps {
  teams: Team[];
  loading: boolean;
  hasPermission: (perm: string) => boolean;
  onOpenCreateTeam: () => void;
  onOpenEditTeam: (team: Team) => void;
  onDeleteTeam: (teamId: string, teamName: string) => void;
  onOpenTeamDashboard: (team: Team) => void;
}

export default function TeamsTab({
  teams,
  loading,
  hasPermission,
  onOpenCreateTeam,
  onOpenEditTeam,
  onDeleteTeam,
  onOpenTeamDashboard,
}: TeamsTabProps) {
  const [teamSearchTerm, setTeamSearchTerm] = useState('');
  const [teamViewMode, setTeamViewMode] = useState<'grid' | 'list'>('grid');

  const filteredTeams = useMemo(() => {
    return teams.filter((t) => {
      if (!teamSearchTerm) return true;
      const term = teamSearchTerm.toLowerCase();
      const leadName = typeof t.leadId === 'object' ? t.leadId?.name || '' : '';
      return (
        t.name.toLowerCase().includes(term) ||
        (t.description && t.description.toLowerCase().includes(term)) ||
        leadName.toLowerCase().includes(term)
      );
    });
  }, [teams, teamSearchTerm]);

  return (
    <div className="space-y-4">
      {/* Search Toolbar */}
      <FilterToolbar
        searchValue={teamSearchTerm}
        onSearchChange={setTeamSearchTerm}
        searchPlaceholder="Search teams by department name, description, or lead..."
        filters={[]}
        actions={
          <NavTabs<'grid' | 'list'>
            size="sm"
            tabs={[
              { id: 'grid', label: 'Grid', icon: LayoutGrid },
              { id: 'list', label: 'List', icon: List },
            ]}
            activeTab={teamViewMode}
            onChange={setTeamViewMode}
          />
        }
      />

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
        </div>
      ) : filteredTeams.length === 0 ? (
        <div className="bg-white/80 rounded-2xl border border-slate-200/80 text-center py-16 px-4 shadow-sm">
          <UsersRound className="w-14 h-14 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-700">
            {teams.length === 0 ? 'No teams created yet' : 'No matching teams'}
          </h3>
          <p className="text-slate-400 text-xs mt-1">
            {teams.length === 0
              ? 'Organize members into structured teams and department units.'
              : 'Try searching for a different team name or lead.'}
          </p>
        </div>
      ) : teamViewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {filteredTeams.map((t) => {
            const leadName = typeof t.leadId === 'object' ? t.leadId?.name : 'Unassigned';
            const leadAvatar = typeof t.leadId === 'object' ? t.leadId?.profileImageUrl : undefined;
            const parentName = typeof t.parentTeamId === 'object' ? t.parentTeamId?.name : undefined;
            const memberCount = t.memberIds?.length || 0;

            return (
              <div
                key={t._id}
                className="card group relative hover:shadow-md hover:border-primary/40 transition-all flex flex-col justify-between overflow-hidden"
              >
                {/* Top Gradient Banner Accent */}
                <div className="h-1.5 w-full bg-gradient-to-r from-primary via-indigo-500 to-violet-500" />

                <div className="p-5">
                  {/* Title & Parent Badge */}
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 rounded-2xl bg-primary/10 text-primary border border-primary/20 shadow-2xs">
                        <UsersRound className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="font-extrabold text-slate-800 text-base group-hover:text-primary transition-colors">
                          {t.name}
                        </h3>
                        {parentName && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 border border-slate-200 mt-0.5">
                            Parent: {parentName}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Description */}
                  {t.description ? (
                    <p className="text-xs text-slate-500 mb-4 line-clamp-2 leading-relaxed">
                      {t.description}
                    </p>
                  ) : (
                    <p className="text-xs text-slate-400 italic mb-4">No description provided</p>
                  )}

                  {/* Team Lead Spotlight Box */}
                  <div className="mb-4 p-3 rounded-xl bg-gradient-to-r from-amber-500/5 to-amber-500/10 border border-amber-500/20 flex items-center justify-between shadow-2xs">
                    <div className="text-[11px] font-bold text-amber-700 flex items-center gap-1.5">
                      <Crown className="w-4 h-4 text-amber-500" />
                      <span>Team Lead</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {leadAvatar ? (
                        <img
                          className="w-6 h-6 rounded-full object-cover ring-2 ring-white shadow-2xs"
                          src={leadAvatar}
                          alt=""
                        />
                      ) : (
                        <div className="w-6 h-6 rounded-full bg-amber-500/20 text-amber-600 flex items-center justify-center font-extrabold text-[10px] ring-2 ring-white">
                          {leadName?.charAt(0) || '?'}
                        </div>
                      )}
                      <span className="text-xs font-bold text-slate-800">{leadName}</span>
                    </div>
                  </div>

                  {/* Members Stack */}
                  <div className="mb-2">
                    <div className="text-[10px] uppercase font-bold tracking-wider text-slate-400 mb-2 flex items-center justify-between">
                      <span>Assigned Members</span>
                      <span className="text-xs font-extrabold text-slate-700 tabular-nums">
                        {memberCount}
                      </span>
                    </div>
                    <div className="flex items-center -space-x-2 overflow-hidden py-1">
                      {(t.memberIds || []).slice(0, 5).map((m, idx) => {
                        const mName = typeof m === 'object' ? m.name : 'Member';
                        const mAvatar = typeof m === 'object' ? m.profileImageUrl : undefined;
                        return mAvatar ? (
                          <img
                            key={idx}
                            className="inline-block h-8 w-8 rounded-full ring-2 ring-white object-cover shadow-2xs"
                            src={mAvatar}
                            title={mName}
                            alt={mName}
                          />
                        ) : (
                          <div
                            key={idx}
                            className="inline-block h-8 w-8 rounded-full bg-slate-200 ring-2 ring-white flex items-center justify-center text-[10px] font-extrabold text-slate-600 shadow-2xs"
                            title={mName}
                          >
                            {mName.charAt(0)}
                          </div>
                        );
                      })}
                      {memberCount > 5 && (
                        <div className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 ring-2 ring-white text-[10px] font-bold text-slate-600 shadow-2xs">
                          +{memberCount - 5}
                        </div>
                      )}
                      {memberCount === 0 && (
                        <span className="text-xs text-slate-400 italic">No members assigned</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Card Footer Actions */}
                <div className="px-5 py-3.5 bg-slate-50/70 border-t border-slate-100 flex items-center justify-between">
                  <button
                    onClick={() => onOpenTeamDashboard(t)}
                    className="btn-ghost text-xs font-semibold py-1.5 px-3 flex items-center gap-1.5 text-primary hover:bg-primary/10 rounded-xl transition-all"
                  >
                    <BarChart2 className="w-4 h-4" />
                    <span>Dashboard</span>
                  </button>
                  <div className="flex items-center gap-1">
                    {hasPermission('team:manage') && (
                      <>
                        <button
                          onClick={() => onOpenEditTeam(t)}
                          className="p-2 text-slate-400 hover:text-slate-800 hover:bg-white rounded-xl transition-colors shadow-2xs border border-transparent hover:border-slate-200/60"
                          title="Edit Team"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => onDeleteTeam(t._id, t.name)}
                          className="p-2 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors border border-transparent hover:border-rose-200/60"
                          title="Delete Team"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        (() => {
          const teamColumns: Column<Team>[] = [
            {
              key: 'name',
              header: 'Team Name',
              sortable: true,
              render: (t) => (
                <div>
                  <div className="flex items-center gap-2 text-slate-800 font-bold text-sm">
                    <UsersRound className="w-4 h-4 text-primary" />
                    {t.name}
                  </div>
                  {t.description && (
                    <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">{t.description}</p>
                  )}
                </div>
              ),
            },
            {
              key: 'parent',
              header: 'Parent Team',
              render: (t) => {
                const pName = typeof t.parentTeamId === 'object' ? t.parentTeamId?.name : null;
                return pName ? (
                  <span className="text-xs font-medium text-slate-600">{pName}</span>
                ) : (
                  <span className="text-xs text-slate-400 italic">—</span>
                );
              },
            },
            {
              key: 'lead',
              header: 'Team Lead',
              render: (t) => {
                const lName = typeof t.leadId === 'object' ? t.leadId?.name : null;
                return lName ? (
                  <span className="text-xs font-semibold text-slate-700 flex items-center gap-1">
                    <Crown className="w-3.5 h-3.5 text-amber-500" />
                    {lName}
                  </span>
                ) : (
                  <span className="text-xs text-slate-400 italic">Unassigned</span>
                );
              },
            },
            {
              key: 'members',
              header: 'Members',
              render: (t) => (
                <span className="text-sm font-bold text-slate-800 tabular-nums">
                  {t.memberIds?.length || 0}
                </span>
              ),
            },
            {
              key: 'actions',
              header: 'Actions',
              className: 'w-[80px]',
              render: (t) => {
                const items: ActionItem[] = [
                  { label: 'Dashboard', onClick: () => onOpenTeamDashboard(t) },
                ];
                if (hasPermission('team:manage')) {
                  items.push({ label: 'Edit Team', onClick: () => onOpenEditTeam(t) });
                  items.push({
                    label: 'Delete Team',
                    onClick: () => onDeleteTeam(t._id, t.name),
                    className: 'text-rose-500',
                  });
                }
                return <RowActions items={items} />;
              },
            },
          ];
          return (
            <AdvancedTable
              data={filteredTeams}
              columns={teamColumns}
              emptyMessage="No teams match your search."
              emptyIcon={<UsersRound className="w-12 h-12 text-slate-300 mx-auto mb-3" />}
            />
          );
        })()
      )}
    </div>
  );
}
