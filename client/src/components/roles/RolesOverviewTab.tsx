import { Crown, Shield, Sparkles, Plus, Pencil, Trash2, UserPlus } from 'lucide-react';
import type { SystemRoleRow, CustomRole, OrgMemberData } from './types';
import { ROLE_LABELS } from '../../constants/permissions';

interface RolesOverviewTabProps {
  systemRoles: SystemRoleRow[];
  customRoles: CustomRole[];
  membersByRole: Record<string, OrgMemberData[]>;
  onOpenCreateModal: () => void;
  onOpenEditModal: (role: CustomRole) => void;
  onDeleteRole: (role: CustomRole) => void;
  onAssignRoleTarget: (target: { role: string; customRoleId?: string; roleName: string }) => void;
}

export default function RolesOverviewTab({
  systemRoles,
  customRoles,
  membersByRole,
  onOpenCreateModal,
  onOpenEditModal,
  onDeleteRole,
  onAssignRoleTarget,
}: RolesOverviewTabProps) {
  return (
    <div className="space-y-8">
      {/* System Roles Matrix Cards */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
              <Crown className="w-4 h-4 text-purple-600" />
              <span>System Roles</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Built-in default security roles. System role permission sets are standardized.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {systemRoles.map((role) => {
            const normKey = role.role === 'Owner' ? 'OrgAdmin' : role.role;
            const roleMembers = membersByRole[normKey] || [];
            return (
              <div
                key={role.role}
                className="bg-white/90 backdrop-blur-md rounded-2xl border border-slate-200/80 shadow-sm p-5 hover:shadow-md hover:border-purple-500/30 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 rounded-xl bg-purple-500/10 text-purple-600">
                        <Shield className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-slate-800">
                          {ROLE_LABELS[role.role as keyof typeof ROLE_LABELS] || role.label}
                        </h4>
                        <span className="text-[10px] font-semibold text-slate-400">
                          {role.permissions.length} Granted Permissions
                        </span>
                      </div>
                    </div>
                    <span className="inline-flex px-2.5 py-0.5 text-[10px] font-bold rounded-full bg-purple-100 text-purple-700 border border-purple-200">
                      System Role
                    </span>
                  </div>

                  {/* Permission Pills */}
                  <div className="flex flex-wrap gap-1 mb-4">
                    {role.permissions.slice(0, 10).map((p) => (
                      <span
                        key={p}
                        className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 border border-slate-200/60"
                      >
                        {p}
                      </span>
                    ))}
                    {role.permissions.length > 10 && (
                      <span className="text-[10px] font-bold text-slate-400 self-center">
                        +{role.permissions.length - 10} more
                      </span>
                    )}
                  </div>
                </div>

                {/* Member Avatars & Action */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="flex -space-x-2 overflow-hidden">
                      {roleMembers.slice(0, 4).map((m) => {
                        const u = typeof m.userId === 'object' ? m.userId : {};
                        return u.profileImageUrl ? (
                          <img
                            key={m._id}
                            className="inline-block h-6 w-6 rounded-full ring-2 ring-white object-cover"
                            src={u.profileImageUrl}
                            alt={u.name}
                          />
                        ) : (
                          <div
                            key={m._id}
                            className="inline-flex h-6 w-6 rounded-full bg-slate-200 text-slate-700 font-bold text-[10px] items-center justify-center ring-2 ring-white"
                          >
                            {u.name?.charAt(0)?.toUpperCase() || '?'}
                          </div>
                        );
                      })}
                    </div>
                    <span className="text-xs text-slate-500 font-medium">
                      {roleMembers.length} member{roleMembers.length !== 1 ? 's' : ''}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      onAssignRoleTarget({
                        role: normKey,
                        roleName: ROLE_LABELS[role.role as keyof typeof ROLE_LABELS] || role.label,
                      })
                    }
                    className="text-xs font-bold text-primary hover:underline flex items-center gap-1"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    Assign
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Custom Roles Section */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-500" />
              <span>Custom Roles</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Tailored permission bundles for specialized team roles and permissions.
            </p>
          </div>
          <button
            onClick={onOpenCreateModal}
            className="text-xs font-bold text-primary hover:underline flex items-center gap-1"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Custom Role
          </button>
        </div>

        {customRoles.length === 0 ? (
          <div className="bg-slate-50 rounded-2xl border border-dashed border-slate-300 p-8 text-center">
            <Sparkles className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <h4 className="text-sm font-bold text-slate-700">No custom roles created</h4>
            <p className="text-xs text-slate-400 mt-1 mb-4">
              Create custom roles to grant tailored permissions for managers, leads, or contractors.
            </p>
            <button
              onClick={onOpenCreateModal}
              className="btn-primary text-xs font-semibold px-4 py-2 rounded-lg"
            >
              Create Custom Role
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {customRoles.map((role) => {
              const roleMembers = membersByRole[`custom:${role._id}`] || [];
              return (
                <div
                  key={role._id}
                  className="bg-white/90 backdrop-blur-md rounded-2xl border border-slate-200/80 shadow-sm p-5 hover:shadow-md hover:border-amber-500/40 transition-all flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-bold text-slate-800">{role.name}</h4>
                          <span className="inline-flex px-2 py-0.5 text-[10px] font-bold rounded-full bg-amber-100 text-amber-700 border border-amber-200">
                            Custom
                          </span>
                        </div>
                        {role.description && (
                          <p className="text-xs text-slate-500 mt-1">{role.description}</p>
                        )}
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => onOpenEditModal(role)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-primary hover:bg-slate-100 transition-colors"
                          title="Edit Role"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => onDeleteRole(role)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 transition-colors"
                          title="Delete Role"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
                      {role.permissions.length} Granted Permissions
                    </div>

                    {/* Permission Badges */}
                    <div className="flex flex-wrap gap-1 mb-4">
                      {role.permissions.map((p) => (
                        <span
                          key={p}
                          className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-700 border border-amber-500/20"
                        >
                          {p}
                        </span>
                      ))}
                      {role.permissions.length === 0 && (
                        <span className="text-xs text-slate-400 italic">No permissions assigned</span>
                      )}
                    </div>
                  </div>

                  {/* Card Footer */}
                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="flex -space-x-2 overflow-hidden">
                        {roleMembers.slice(0, 4).map((m) => {
                          const u = typeof m.userId === 'object' ? m.userId : {};
                          return u.profileImageUrl ? (
                            <img
                              key={m._id}
                              className="inline-block h-6 w-6 rounded-full ring-2 ring-white object-cover"
                              src={u.profileImageUrl}
                              alt={u.name}
                            />
                          ) : (
                            <div
                              key={m._id}
                              className="inline-flex h-6 w-6 rounded-full bg-amber-100 text-amber-700 font-bold text-[10px] items-center justify-center ring-2 ring-white"
                            >
                              {u.name?.charAt(0)?.toUpperCase() || '?'}
                            </div>
                          );
                        })}
                      </div>
                      <span className="text-xs text-slate-500 font-medium">
                        {roleMembers.length} member{roleMembers.length !== 1 ? 's' : ''}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        onAssignRoleTarget({
                          role: 'Custom',
                          customRoleId: role._id,
                          roleName: role.name,
                        })
                      }
                      className="text-xs font-bold text-amber-600 hover:underline flex items-center gap-1"
                    >
                      <UserPlus className="w-3.5 h-3.5" />
                      Assign
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
