import { useState, useEffect, useContext } from 'react';
import { Shield, Crown, UserCheck, Eye, Sparkles, Check, AlertCircle } from 'lucide-react';
import Modal from '../common/Modal';
import { UserContext } from '../../context/UserContext';
import api from '../../utils/axios';
import { apiPaths } from '../../utils/apiPaths';
import { ROLE_PERMISSIONS, type Permission } from '../../constants/permissions';

export interface CustomRoleOption {
  _id: string;
  name: string;
  description?: string;
  permissions: string[];
}

export interface MemberForRoleChange {
  _id: string;
  membershipId?: string;
  name: string;
  email: string;
  profileImageUrl?: string;
  role: string;
  customRoleId?: string;
}

interface ChangeRoleModalProps {
  isOpen: boolean;
  onClose: () => void;
  member: MemberForRoleChange | null;
  customRoles: CustomRoleOption[];
  onSuccess: () => void;
}

const SYSTEM_ROLE_OPTIONS = [
  {
    role: 'OrgAdmin',
    label: 'Owner / Admin',
    badgeBg: 'bg-purple-500/10 text-purple-600 border-purple-500/30',
    icon: Crown,
    description: 'Full administrative access to manage organization settings, members, and all resources.',
  },
  {
    role: 'Manager',
    label: 'Manager',
    badgeBg: 'bg-indigo-500/10 text-indigo-600 border-indigo-500/30',
    icon: Shield,
    description: 'Can manage projects, tasks, goals, teams, and invite members.',
  },
  {
    role: 'OrgMember',
    label: 'Member',
    badgeBg: 'bg-sky-500/10 text-sky-600 border-sky-500/30',
    icon: UserCheck,
    description: 'Standard member role. Can create and update assigned tasks and projects.',
  },
  {
    role: 'Viewer',
    label: 'Viewer',
    badgeBg: 'bg-slate-500/10 text-slate-600 border-slate-500/30',
    icon: Eye,
    description: 'Read-only access to view tasks, projects, goals, and reports.',
  },
];

export default function ChangeRoleModal({
  isOpen,
  onClose,
  member,
  customRoles,
  onSuccess,
}: ChangeRoleModalProps) {
  const { user } = useContext(UserContext);
  const [selectedRoleType, setSelectedRoleType] = useState<string>('OrgMember');
  const [selectedCustomRoleId, setSelectedCustomRoleId] = useState<string>('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (member) {
      if (member.role === 'Custom' && member.customRoleId) {
        setSelectedRoleType('Custom');
        setSelectedCustomRoleId(member.customRoleId);
      } else {
        const normRole = member.role === 'Owner' ? 'OrgAdmin' : member.role;
        setSelectedRoleType(normRole || 'OrgMember');
        setSelectedCustomRoleId('');
      }
      setError('');
    }
  }, [member, isOpen]);

  if (!isOpen || !member) return null;

  const handleSave = async () => {
    if (!user?.activeOrgId) {
      setError('Organization context is missing.');
      return;
    }
    setSaving(true);
    setError('');

    try {
      const memberId = member.membershipId || member._id;
      const endpoint = apiPaths.ORG_MEMBERSHIP.UPDATE_ROLE
        .replace(':orgId', user.activeOrgId)
        .replace(':memberId', memberId);

      const payload =
        selectedRoleType === 'Custom'
          ? { role: 'Custom', customRoleId: selectedCustomRoleId }
          : { role: selectedRoleType };

      await api.put(endpoint, payload);
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update member role');
    } finally {
      setSaving(false);
    }
  };

  const getSelectedPermissions = (): string[] => {
    if (selectedRoleType === 'Custom') {
      const found = customRoles.find((c) => c._id === selectedCustomRoleId);
      return found?.permissions || [];
    }
    const sysKey = selectedRoleType as keyof typeof ROLE_PERMISSIONS;
    return ROLE_PERMISSIONS[sysKey] || ROLE_PERMISSIONS.OrgMember;
  };

  const selectedPermissions = getSelectedPermissions();

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Change Member Role"
      subtitle={`Assign a new role and permissions to ${member.name}`}
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-semibold text-slate-600 hover:text-slate-800 rounded-lg hover:bg-slate-100 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || (selectedRoleType === 'Custom' && !selectedCustomRoleId)}
            className="px-5 py-2 text-sm font-semibold text-white bg-primary hover:bg-primary-hover rounded-lg shadow-sm disabled:opacity-50 transition-all"
          >
            {saving ? 'Saving Changes...' : 'Save Role Assignment'}
          </button>
        </>
      }
    >
      <div className="space-y-5">
        {/* Target Member Header Card */}
        <div className="flex items-center gap-3.5 p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
          {member.profileImageUrl ? (
            <img
              className="h-11 w-11 rounded-xl object-cover ring-2 ring-white shadow-sm"
              src={member.profileImageUrl}
              alt={member.name}
            />
          ) : (
            <div className="h-11 w-11 rounded-xl bg-primary/10 text-primary font-bold flex items-center justify-center text-base shadow-sm ring-2 ring-white">
              {member.name?.charAt(0)?.toUpperCase() || '?'}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <div className="text-sm font-bold text-slate-800 truncate">{member.name}</div>
            <div className="text-xs text-slate-500 truncate">{member.email}</div>
          </div>
          <div className="text-right">
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-0.5">
              Current Role
            </span>
            <span className="inline-flex px-2.5 py-0.5 text-xs font-bold rounded-full bg-slate-200 text-slate-700">
              {member.role === 'OrgAdmin' || member.role === 'Owner'
                ? 'Owner'
                : member.role === 'OrgMember'
                ? 'Member'
                : member.role}
            </span>
          </div>
        </div>

        {error && (
          <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-xs font-semibold text-rose-500 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* System Roles Grid */}
        <div>
          <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2.5">
            Select System Role
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {SYSTEM_ROLE_OPTIONS.map((opt) => {
              const Icon = opt.icon;
              const isSelected = selectedRoleType === opt.role;
              return (
                <button
                  type="button"
                  key={opt.role}
                  onClick={() => {
                    setSelectedRoleType(opt.role);
                    setSelectedCustomRoleId('');
                  }}
                  className={`text-left p-3.5 rounded-xl border transition-all relative ${
                    isSelected
                      ? 'bg-primary/5 border-primary shadow-sm ring-1 ring-primary'
                      : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/50'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <div className="flex items-center gap-2">
                      <Icon className={`w-4 h-4 ${isSelected ? 'text-primary' : 'text-slate-400'}`} />
                      <span className="text-xs font-bold text-slate-800">{opt.label}</span>
                    </div>
                    {isSelected && (
                      <div className="w-4 h-4 rounded-full bg-primary text-white flex items-center justify-center">
                        <Check className="w-3 h-3 stroke-[3]" />
                      </div>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500 leading-relaxed mt-1">
                    {opt.description}
                  </p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Custom Roles Option (if available) */}
        {customRoles.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-2.5">
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span>Or Select Custom Role</span>
              </label>
              <span className="text-[11px] text-slate-400 font-medium">
                {customRoles.length} custom role{customRoles.length > 1 ? 's' : ''} available
              </span>
            </div>
            <div className="space-y-2">
              {customRoles.map((c) => {
                const isSelected = selectedRoleType === 'Custom' && selectedCustomRoleId === c._id;
                return (
                  <button
                    type="button"
                    key={c._id}
                    onClick={() => {
                      setSelectedRoleType('Custom');
                      setSelectedCustomRoleId(c._id);
                    }}
                    className={`w-full text-left p-3 rounded-xl border transition-all flex items-center justify-between gap-3 ${
                      isSelected
                        ? 'bg-amber-500/10 border-amber-500 shadow-sm ring-1 ring-amber-500'
                        : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/50'
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-800">{c.name}</span>
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
                          Custom
                        </span>
                      </div>
                      {c.description && (
                        <p className="text-[11px] text-slate-500 mt-0.5">{c.description}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-2 py-1 rounded-md">
                        {c.permissions.length} perms
                      </span>
                      {isSelected && (
                        <div className="w-4 h-4 rounded-full bg-amber-500 text-white flex items-center justify-center">
                          <Check className="w-3 h-3 stroke-[3]" />
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Granted Permissions Preview Box */}
        <div className="p-3.5 rounded-xl bg-slate-100/80 border border-slate-200/80">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Granted Permissions ({selectedPermissions.length})
            </span>
          </div>
          <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto pr-1">
            {selectedPermissions.map((p) => (
              <span
                key={p}
                className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-white text-slate-700 border border-slate-200/80 shadow-2xs"
              >
                {p}
              </span>
            ))}
            {selectedPermissions.length === 0 && (
              <span className="text-xs text-slate-400 italic">No permissions assigned.</span>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
}
