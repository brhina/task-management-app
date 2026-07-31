import { UserPlus, Check, ClipboardCopy, CheckCircle2, AlertTriangle } from 'lucide-react';

export interface InviteModalState {
  isOpen: boolean;
  email: string;
  role: 'OrgMember' | 'OrgAdmin';
  loading: boolean;
  error: string;
  inviteToken: string | null;
  copied: boolean;
  userLookup: {
    loading: boolean;
    found: boolean | null;
    user: { _id: string; name: string; email: string; profileImageUrl?: string } | null;
  };
  mode: 'invite' | 'add';
}

interface InviteMemberModalProps {
  state: InviteModalState;
  onClose: () => void;
  onChangeEmail: (email: string) => void;
  onChangeRole: (role: 'OrgMember' | 'OrgAdmin') => void;
  onInvite: () => void;
  onAdd: () => void;
  onCopyLink: () => void;
  hasInvitePermission: boolean;
}

export default function InviteMemberModal({
  state,
  onClose,
  onChangeEmail,
  onChangeRole,
  onInvite,
  onAdd,
  onCopyLink,
  hasInvitePermission,
}: InviteMemberModalProps) {
  if (!state.isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
        <div className="fixed inset-0 bg-gray-100/80 transition-opacity" onClick={onClose} />
        <div className="relative transform overflow-hidden rounded-xl bg-white border border-gray-200 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg">
          <div className="px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <div className="sm:flex sm:items-start">
              <div className="mx-auto flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 sm:mx-0 sm:h-10 sm:w-10">
                <UserPlus className="h-6 w-6 text-primary" />
              </div>
              <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                <h3 className="text-lg font-semibold leading-6 text-slate-800">
                  Invite Team Member
                </h3>
                <div className="mt-2">
                  <p className="text-sm text-slate-500">
                    Generate an invite link to add a new member to your organization.
                  </p>
                </div>

                {state.inviteToken ? (
                  <div className="mt-4 p-4 bg-gray-100 rounded-lg border border-gray-200">
                    <div className="text-sm font-medium text-slate-600 mb-2">
                      Invite Link Generated!
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        readOnly
                        value={`${window.location.origin}/signup?invite=${state.inviteToken}`}
                        className="input-field flex-1 text-xs"
                      />
                      <button
                        type="button"
                        onClick={onCopyLink}
                        className={`px-3 py-2 transition-colors ${state.copied ? 'bg-emerald-500 text-white' : 'btn-primary'}`}
                      >
                        {state.copied ? (
                          <Check className="w-4 h-4" />
                        ) : (
                          <ClipboardCopy className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                    <div className="mt-3 text-xs text-slate-500">
                      Share this link with the person you want to invite. The link expires in 7 days.
                    </div>
                  </div>
                ) : (
                  <div className="mt-4 space-y-4">
                    <div>
                      <label
                        htmlFor="inviteEmail"
                        className="block text-xs font-medium text-slate-500 uppercase tracking-wide mb-1"
                      >
                        Email Address
                      </label>
                      <div className="relative">
                        <input
                          type="email"
                          id="inviteEmail"
                          value={state.email}
                          onChange={(e) => onChangeEmail(e.target.value)}
                          className="input-field block w-full px-3 py-2 text-sm"
                          placeholder="member@example.com"
                        />
                        {state.userLookup.loading && (
                          <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                            <div className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full"></div>
                          </div>
                        )}
                      </div>
                      {state.userLookup.found === true && state.userLookup.user && (
                        <div className="mt-2 p-2 bg-emerald-500/10 border border-emerald-500/30 rounded-lg flex items-center gap-3">
                          {state.userLookup.user.profileImageUrl ? (
                            <img
                              className="h-8 w-8 rounded-full"
                              src={state.userLookup.user.profileImageUrl}
                              alt=""
                            />
                          ) : (
                            <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center">
                              <span className="text-xs font-bold text-slate-500">
                                {state.userLookup.user.name?.charAt(0)?.toUpperCase() || '?'}
                              </span>
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium text-emerald-400">
                              {state.userLookup.user.name}
                            </div>
                            <div className="text-xs text-slate-500">
                              User found - can be added directly
                            </div>
                          </div>
                          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                        </div>
                      )}
                      {state.userLookup.found === false && (
                        <div className="mt-2 p-2 bg-yellow-500/10 border border-yellow-500/30 rounded-lg flex items-center gap-2">
                          <AlertTriangle className="w-4 h-4 text-yellow-400 shrink-0" />
                          <span className="text-xs text-yellow-400">
                            User not found - invite link will be generated
                          </span>
                        </div>
                      )}
                    </div>
                    <div>
                      <label
                        htmlFor="inviteRole"
                        className="block text-xs font-medium text-slate-500 uppercase tracking-wide mb-1"
                      >
                        Role
                      </label>
                      <select
                        id="inviteRole"
                        value={state.role}
                        onChange={(e) =>
                          onChangeRole(e.target.value as 'OrgMember' | 'OrgAdmin')
                        }
                        className="input-field block w-full px-3 py-2 text-sm"
                      >
                        <option value="OrgMember">Member</option>
                        <option value="OrgAdmin">Owner</option>
                      </select>
                    </div>
                  </div>
                )}

                {state.error && <div className="mt-3 text-sm text-rose-400">{state.error}</div>}
              </div>
            </div>
          </div>
          <div className="bg-white/50 px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6 gap-2">
            {state.inviteToken ? (
              <button
                type="button"
                onClick={onClose}
                className="btn-primary w-full sm:w-auto"
              >
                Done
              </button>
            ) : (
              <>
                {state.mode === 'add' && state.userLookup.user ? (
                  <button
                    type="button"
                    onClick={onAdd}
                    disabled={state.loading || !hasInvitePermission}
                    className="btn-primary w-full sm:w-auto disabled:opacity-50"
                  >
                    {state.loading ? 'Adding...' : `Add ${state.userLookup.user.name}`}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={onInvite}
                    disabled={state.loading || !state.email || !hasInvitePermission}
                    className="btn-primary w-full sm:w-auto disabled:opacity-50"
                  >
                    {state.loading ? 'Generating...' : 'Generate Invite Link'}
                  </button>
                )}
                <button
                  type="button"
                  onClick={onClose}
                  className="btn-ghost w-full sm:w-auto mt-3 sm:mt-0"
                >
                  Cancel
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
