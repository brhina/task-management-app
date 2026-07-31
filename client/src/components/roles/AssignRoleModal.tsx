import Modal from '../common/Modal';
import type { OrgMemberData } from './types';
import api from '../../utils/axios';
import { apiPaths } from '../../utils/apiPaths';

interface AssignRoleTarget {
  role: string;
  customRoleId?: string;
  roleName: string;
}

interface AssignRoleModalProps {
  target: AssignRoleTarget | null;
  members: OrgMemberData[];
  activeOrgId?: string;
  onClose: () => void;
  onRefresh: () => Promise<void>;
}

export default function AssignRoleModal({
  target,
  members,
  activeOrgId,
  onClose,
  onRefresh,
}: AssignRoleModalProps) {
  if (!target) return null;

  return (
    <Modal
      isOpen={Boolean(target)}
      onClose={onClose}
      title={`Assign Role: ${target.roleName}`}
      subtitle="Select members to assign this role to."
      footer={
        <button
          onClick={onClose}
          className="px-4 py-2 text-sm font-semibold text-slate-600 hover:text-slate-800 rounded-lg hover:bg-slate-100"
        >
          Done
        </button>
      }
    >
      <div className="space-y-3 max-h-80 overflow-y-auto">
        {members.map((m) => {
          const u = typeof m.userId === 'object' ? m.userId : {};
          const isAssigned =
            target.role === 'Custom'
              ? m.role === 'Custom' &&
                (typeof m.customRoleId === 'object' ? m.customRoleId?._id : m.customRoleId) ===
                  target.customRoleId
              : m.role === target.role || (target.role === 'OrgAdmin' && m.role === 'Owner');

          return (
            <div
              key={m._id}
              className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200/80"
            >
              <div className="flex items-center gap-3">
                {u.profileImageUrl ? (
                  <img className="h-8 w-8 rounded-full object-cover" src={u.profileImageUrl} alt="" />
                ) : (
                  <div className="h-8 w-8 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center text-xs">
                    {u.name?.charAt(0)?.toUpperCase() || '?'}
                  </div>
                )}
                <div>
                  <div className="text-xs font-bold text-slate-800">{u.name}</div>
                  <div className="text-[11px] text-slate-400">{u.email}</div>
                </div>
              </div>

              <button
                type="button"
                onClick={async () => {
                  try {
                    const payload =
                      target.role === 'Custom'
                        ? { role: 'Custom', customRoleId: target.customRoleId }
                        : { role: target.role };

                    await api.put(
                      apiPaths.ORG_MEMBERSHIP.UPDATE_ROLE
                        .replace(':orgId', activeOrgId || '')
                        .replace(':memberId', m._id),
                      payload
                    );
                    await onRefresh();
                  } catch (err: any) {
                    alert(err.response?.data?.message || 'Failed to assign role');
                  }
                }}
                disabled={isAssigned}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                  isAssigned
                    ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/30'
                    : 'bg-primary text-white hover:bg-primary-hover shadow-2xs'
                }`}
              >
                {isAssigned ? 'Assigned' : 'Assign Role'}
              </button>
            </div>
          );
        })}
      </div>
    </Modal>
  );
}
