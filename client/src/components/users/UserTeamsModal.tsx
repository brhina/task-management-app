import { useState, useMemo } from 'react';
import { Search, Crown, UsersRound, CheckCircle2 } from 'lucide-react';
import Modal from '../common/Modal';

export interface UserWithTaskCounts {
  _id: string;
  name: string;
  email: string;
  role: string;
  customRoleId?: string;
  customRoleName?: string;
  membershipId?: string;
  profileImageUrl?: string;
  createdAt?: string;
  pendingTasks?: number;
  inProgressTasks?: number;
  completedTasks?: number;
}

export interface TeamMember {
  _id: string;
  name: string;
  email: string;
  profileImageUrl?: string;
}

export interface Team {
  _id: string;
  name: string;
  description?: string;
  leadId?: TeamMember;
  memberIds: TeamMember[];
  parentTeamId?: { _id: string; name: string };
}

interface UserTeamsModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetUser: UserWithTaskCounts | null;
  selectedTeamIds: string[];
  onToggleTeam: (teamId: string, checked: boolean) => void;
  onSave: () => void;
  saving: boolean;
  error: string;
  teams: Team[];
}

export default function UserTeamsModal({
  isOpen,
  onClose,
  targetUser,
  selectedTeamIds,
  onToggleTeam,
  onSave,
  saving,
  error,
  teams,
}: UserTeamsModalProps) {
  const [filterQuery, setFilterQuery] = useState('');

  const filteredTeams = useMemo(() => {
    return teams.filter((t) => {
      if (!filterQuery) return true;
      const q = filterQuery.toLowerCase();
      return (
        t.name.toLowerCase().includes(q) ||
        (t.description && t.description.toLowerCase().includes(q))
      );
    });
  }, [teams, filterQuery]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Manage Teams for ${targetUser?.name || 'Member'}`}
      subtitle="Assign or remove team memberships for this member"
      maxWidth="sm:max-w-md"
      footer={
        <>
          <button onClick={onClose} className="btn-secondary text-xs">
            Cancel
          </button>
          <button
            onClick={onSave}
            disabled={saving}
            className="btn-primary text-xs disabled:opacity-50 flex items-center gap-1.5"
          >
            {saving ? 'Saving...' : 'Save Assignments'}
          </button>
        </>
      }
    >
      <div className="space-y-3.5">
        {error && <div className="alert-error text-xs">{error}</div>}

        {/* Member Preview Header */}
        {targetUser && (
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-center gap-3">
            {targetUser.profileImageUrl ? (
              <img
                className="h-9 w-9 rounded-xl object-cover ring-2 ring-white"
                src={targetUser.profileImageUrl}
                alt=""
              />
            ) : (
              <div className="h-9 w-9 rounded-xl bg-primary/10 text-primary font-extrabold flex items-center justify-center text-xs">
                {targetUser.name?.charAt(0).toUpperCase() || '?'}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="text-xs font-bold text-slate-800">{targetUser.name}</div>
              <div className="text-[11px] text-slate-400 truncate">{targetUser.email}</div>
            </div>
            <span className="text-[11px] font-bold text-slate-500 bg-white px-2.5 py-1 rounded-lg border border-slate-200/80 shadow-2xs">
              {selectedTeamIds.length} Teams
            </span>
          </div>
        )}

        {/* Search input */}
        {teams.length > 3 && (
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={filterQuery}
              onChange={(e) => setFilterQuery(e.target.value)}
              placeholder="Search teams..."
              className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200/80 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500/40 transition-all shadow-2xs"
            />
          </div>
        )}

        {/* Teams Checkbox List */}
        {teams.length === 0 ? (
          <div className="p-6 text-center text-xs text-slate-400 italic bg-slate-50 rounded-xl border border-slate-100">
            No teams created in this organization yet.
          </div>
        ) : (
          <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
            {filteredTeams.map((t) => {
              const isSelected = selectedTeamIds.includes(t._id);
              const isLead =
                (typeof t.leadId === 'object' ? t.leadId?._id : t.leadId) === targetUser?._id;

              return (
                <label
                  key={t._id}
                  className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${
                    isSelected
                      ? 'border-primary/40 bg-primary/5 shadow-2xs'
                      : 'border-slate-200/80 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={(e) => onToggleTeam(t._id, e.target.checked)}
                      className="rounded-md border-slate-300 text-primary focus:ring-primary h-4 w-4"
                    />
                    <div>
                      <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                        <UsersRound className="w-3.5 h-3.5 text-slate-400" />
                        <span>{t.name}</span>
                        {isLead && (
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-600 font-bold border border-amber-500/20 flex items-center gap-0.5">
                            <Crown className="w-3 h-3 text-amber-500" /> Lead
                          </span>
                        )}
                      </div>
                      {t.description && (
                        <div className="text-[10px] text-slate-400 line-clamp-1 mt-0.5">
                          {t.description}
                        </div>
                      )}
                    </div>
                  </div>
                  <span className="text-[10px] font-medium text-slate-400">
                    {t.memberIds?.length || 0} members
                  </span>
                </label>
              );
            })}
          </div>
        )}
      </div>
    </Modal>
  );
}
