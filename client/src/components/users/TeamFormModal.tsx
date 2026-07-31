import { useState, useMemo } from 'react';
import { Search, Crown, Check } from 'lucide-react';
import Modal from '../common/Modal';
import type { UserWithTaskCounts, Team } from './UserTeamsModal';

interface TeamFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: 'create' | 'edit';
  name: string;
  description: string;
  leadId: string;
  memberIds: string[];
  parentTeamId: string;
  onChangeField: (field: string, value: any) => void;
  onSave: () => void;
  saving: boolean;
  error: string;
  users: UserWithTaskCounts[];
  teams: Team[];
  editingTeamId?: string;
}

export default function TeamFormModal({
  isOpen,
  onClose,
  mode,
  name,
  description,
  leadId,
  memberIds,
  parentTeamId,
  onChangeField,
  onSave,
  saving,
  error,
  users,
  teams,
  editingTeamId,
}: TeamFormModalProps) {
  const [memberSearchQuery, setMemberSearchQuery] = useState('');

  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      if (!memberSearchQuery) return true;
      const q = memberSearchQuery.toLowerCase();
      return u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
    });
  }, [users, memberSearchQuery]);

  const handleToggleMember = (uId: string, checked: boolean) => {
    const next = checked ? [...memberIds, uId] : memberIds.filter((id) => id !== uId);
    onChangeField('memberIds', next);
  };

  const handleSelectAllToggle = () => {
    const isAllSelected = memberIds.length === users.length;
    onChangeField('memberIds', isAllSelected ? [] : users.map((u) => u._id));
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={mode === 'create' ? 'Create New Team' : 'Edit Team Details'}
      subtitle={
        mode === 'create'
          ? 'Configure department structure, assigned lead, and team members'
          : 'Update team name, parent relationship, lead, and team members'
      }
      maxWidth="sm:max-w-xl"
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
            {saving ? 'Saving...' : mode === 'create' ? 'Create Team' : 'Update Team'}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        {error && <div className="alert-error text-xs">{error}</div>}

        <div className="grid md:grid-cols-2 gap-3.5">
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1">
              Team Name *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => onChangeField('name', e.target.value)}
              placeholder="e.g. Frontend Engineering"
              className="input-field w-full text-xs"
            />
          </div>
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1">
              Parent Team (Optional)
            </label>
            <select
              value={parentTeamId}
              onChange={(e) => onChangeField('parentTeamId', e.target.value)}
              className="input-field w-full text-xs"
            >
              <option value="">No Parent Team</option>
              {teams
                .filter((t) => t._id !== editingTeamId)
                .map((t) => (
                  <option key={t._id} value={t._id}>
                    {t.name}
                  </option>
                ))}
            </select>
          </div>

          <div className="md:col-span-2">
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1">
              Description
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => onChangeField('description', e.target.value)}
              placeholder="Summary of team goals and responsibilities"
              className="input-field w-full text-xs"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1">
              Team Lead
            </label>
            <select
              value={leadId}
              onChange={(e) => onChangeField('leadId', e.target.value)}
              className="input-field w-full text-xs"
            >
              <option value="">Select Team Lead (Optional)</option>
              {users.map((u) => (
                <option key={u._id} value={u._id}>
                  👑 {u.name} ({u.email})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Member Selection Section */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">
              Select Team Members ({memberIds.length} / {users.length})
            </label>
            <button
              type="button"
              onClick={handleSelectAllToggle}
              className="text-primary hover:underline text-[10px] font-semibold lowercase"
            >
              {memberIds.length === users.length ? 'deselect all' : 'select all'}
            </button>
          </div>

          {users.length > 5 && (
            <div className="relative mb-2">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                value={memberSearchQuery}
                onChange={(e) => setMemberSearchQuery(e.target.value)}
                placeholder="Filter members..."
                className="input-field w-full pl-8 py-1.5 text-xs"
              />
            </div>
          )}

          <div className="border border-slate-200/80 rounded-xl p-2 max-h-52 overflow-y-auto space-y-1.5 bg-slate-50/50">
            {filteredUsers.map((u) => {
              const isSelected = memberIds.includes(u._id);
              return (
                <label
                  key={u._id}
                  className={`flex items-center justify-between p-2 rounded-lg transition-colors cursor-pointer ${
                    isSelected ? 'bg-white shadow-2xs border border-slate-200/80' : 'hover:bg-white'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={(e) => handleToggleMember(u._id, e.target.checked)}
                      className="rounded border-slate-300 text-primary focus:ring-primary h-4 w-4"
                    />
                    {u.profileImageUrl ? (
                      <img className="h-6 w-6 rounded-full object-cover" src={u.profileImageUrl} alt="" />
                    ) : (
                      <div className="h-6 w-6 rounded-full bg-slate-200 text-slate-600 font-bold flex items-center justify-center text-[10px]">
                        {u.name.charAt(0)}
                      </div>
                    )}
                    <div className="text-xs font-semibold text-slate-800">{u.name}</div>
                  </div>
                  <span className="text-[10px] text-slate-400 font-medium">{u.email}</span>
                </label>
              );
            })}
          </div>
        </div>
      </div>
    </Modal>
  );
}
