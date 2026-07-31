import type { SystemRoleRow, CustomRole, OrgMemberData } from './types';
import { PERMISSIONS } from '../../constants/permissions';

interface MemberDirectoryTabProps {
  members: OrgMemberData[];
  systemRoles: SystemRoleRow[];
  customRoles: CustomRole[];
  searchTerm: string;
  onChangeRoleMember: (member: {
    _id: string;
    membershipId?: string;
    name: string;
    email: string;
    profileImageUrl?: string;
    role: string;
    customRoleId?: string;
  }) => void;
}

export default function MemberDirectoryTab({
  members,
  systemRoles,
  customRoles,
  searchTerm,
  onChangeRoleMember,
}: MemberDirectoryTabProps) {
  const filteredMembers = members.filter((m) => {
    const uObj = typeof m.userId === 'object' ? m.userId : null;
    if (!uObj) return false;
    const term = searchTerm.toLowerCase();
    return (
      !term ||
      uObj.name?.toLowerCase().includes(term) ||
      uObj.email?.toLowerCase().includes(term) ||
      m.role?.toLowerCase().includes(term)
    );
  });

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              <th className="py-3.5 px-5">Member</th>
              <th className="py-3.5 px-4">Assigned Role</th>
              <th className="py-3.5 px-4 text-center">Permissions Count</th>
              <th className="py-3.5 px-5 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-xs">
            {filteredMembers.map((m) => {
              const u = typeof m.userId === 'object' ? m.userId : {};
              const cRole =
                typeof m.customRoleId === 'object'
                  ? m.customRoleId
                  : customRoles.find((c) => c._id === m.customRoleId);

              let roleLabel =
                m.role === 'Owner' || m.role === 'OrgAdmin'
                  ? 'Owner'
                  : m.role === 'OrgMember'
                  ? 'Member'
                  : m.role;
              if (m.role === 'Custom') {
                roleLabel = cRole?.name || 'Custom Role';
              }

              const permCount =
                m.role === 'Custom'
                  ? cRole?.permissions?.length || 0
                  : m.role === 'Owner' || m.role === 'OrgAdmin'
                  ? PERMISSIONS.length
                  : systemRoles.find((s) => s.role === (m.role === 'Owner' ? 'OrgAdmin' : m.role))
                      ?.permissions.length || 0;

              return (
                <tr key={m._id} className="hover:bg-slate-50/60 transition-colors">
                  <td className="py-3.5 px-5">
                    <div className="flex items-center gap-3">
                      {u.profileImageUrl ? (
                        <img
                          className="h-9 w-9 rounded-xl object-cover ring-2 ring-slate-100"
                          src={u.profileImageUrl}
                          alt=""
                        />
                      ) : (
                        <div className="h-9 w-9 rounded-xl bg-primary/10 text-primary font-bold flex items-center justify-center text-xs ring-2 ring-primary/10">
                          {u.name?.charAt(0)?.toUpperCase() || '?'}
                        </div>
                      )}
                      <div>
                        <div className="font-bold text-slate-800 text-sm">{u.name}</div>
                        <div className="text-xs text-slate-400">{u.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="py-3.5 px-4">
                    <span
                      className={`inline-flex px-2.5 py-0.5 text-xs font-bold rounded-full border ${
                        m.role === 'OrgAdmin' || m.role === 'Owner'
                          ? 'bg-purple-500/10 text-purple-600 border-purple-500/30'
                          : m.role === 'Manager'
                          ? 'bg-indigo-500/10 text-indigo-600 border-indigo-500/30'
                          : m.role === 'Viewer'
                          ? 'bg-slate-500/10 text-slate-600 border-slate-500/30'
                          : m.role === 'Custom'
                          ? 'bg-amber-500/10 text-amber-600 border-amber-500/30'
                          : 'bg-sky-500/10 text-sky-600 border-sky-500/30'
                      }`}
                    >
                      {roleLabel}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-center font-semibold text-slate-600 tabular-nums">
                    {permCount} permissions
                  </td>
                  <td className="py-3.5 px-5 text-right">
                    <button
                      type="button"
                      onClick={() =>
                        onChangeRoleMember({
                          _id: u._id,
                          membershipId: m._id,
                          name: u.name,
                          email: u.email,
                          profileImageUrl: u.profileImageUrl,
                          role: m.role,
                          customRoleId:
                            typeof m.customRoleId === 'object'
                              ? m.customRoleId?._id
                              : m.customRoleId,
                        })
                      }
                      className="text-xs font-bold text-primary hover:underline px-3 py-1 rounded-lg hover:bg-primary/5 transition-colors"
                    >
                      Change Role
                    </button>
                  </td>
                </tr>
              );
            })}
            {filteredMembers.length === 0 && (
              <tr>
                <td colSpan={4} className="py-10 text-center text-slate-400 italic">
                  No members found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
