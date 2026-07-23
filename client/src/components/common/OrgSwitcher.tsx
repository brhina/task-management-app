import { useState, useContext, useEffect, useCallback } from 'react';
import { UserContext } from '../../context/UserContext';
import api from '../../utils/axios';
import { apiPaths } from '../../utils/apiPaths';
import type { OrgMembership } from '../../types';
import { ChevronDown, Plus, CheckCircle, LogOut, AlertTriangle, Building2 } from 'lucide-react';
import { ROLE_LABELS, isSystemRole } from '../../constants/permissions';

interface CreateOrgModalState {
  isOpen: boolean;
  name: string;
  templateId: string;
  loading: boolean;
  error: string;
}

interface WorkspaceTemplate {
  id: string;
  name: string;
  description: string;
}

function OrgSwitcher() {
  const { user, updateUser, hasPermission } = useContext(UserContext);
  const [isOpen, setIsOpen] = useState(false);
  const [orgs, setOrgs] = useState<OrgMembership[]>([]);
  const [loading, setLoading] = useState(false);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState<string | null>(null);
  const [createModal, setCreateModal] = useState<CreateOrgModalState>({
    isOpen: false,
    name: '',
    templateId: 'blank',
    loading: false,
    error: '',
  });
  const [templates, setTemplates] = useState<WorkspaceTemplate[]>([]);

  const roleLabel = (role?: string) => {
    if (!role) return 'Member';
    if (role === 'Custom') return 'Custom';
    if (isSystemRole(role)) return ROLE_LABELS[role];
    return role;
  };

  const fetchOrgs = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const response = await api.get(apiPaths.ORG_MEMBERSHIP.MY_ORGS);
      setOrgs(response.data);
      if (response.data.length > 0 && !user.activeOrgId) {
        const firstOrg = response.data[0];
        updateUser({ ...user, activeOrgId: firstOrg._id });
      }
    } catch (error) {
      console.error('Failed to fetch organizations:', error);
    } finally {
      setLoading(false);
    }
  }, [user, updateUser]);

  useEffect(() => {
    if (user?.orgs && user.orgs.length > 0) {
      setOrgs(user.orgs);
    } else {
      fetchOrgs();
    }
  }, [user, fetchOrgs]);

  const handleSwitchOrg = (orgId: string) => {
    if (user) {
      updateUser({ ...user, activeOrgId: orgId });
    }
    setIsOpen(false);
    window.location.reload();
  };

  const handleLeaveOrg = async (orgId: string) => {
    try {
      await api.post(apiPaths.ORG_MEMBERSHIP.LEAVE_ORG.replace(':orgId', orgId));
      const updatedOrgs = orgs.filter((o) => o._id !== orgId);
      setOrgs(updatedOrgs);

      if (user) {
        if (user.activeOrgId === orgId) {
          const newActiveOrgId = updatedOrgs.length > 0 ? updatedOrgs[0]._id : undefined;
          updateUser({
            _id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            activeOrgId: newActiveOrgId,
            orgs: updatedOrgs,
          });
        } else {
          updateUser({
            _id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            orgs: updatedOrgs,
          });
        }
      }

      setShowLeaveConfirm(null);
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to leave organization');
    }
  };

  const handleCreateOrg = async () => {
    if (!createModal.name.trim()) {
      setCreateModal((prev) => ({ ...prev, error: 'Organization name is required' }));
      return;
    }

    setCreateModal((prev) => ({ ...prev, loading: true, error: '' }));

    try {
      const response = await api.post(apiPaths.ORGS.CREATE, {
        name: createModal.name.trim(),
        templateId: createModal.templateId || 'blank',
      });
      const newOrg = response.data;

      const updatedOrgs = [
        ...orgs,
        {
          ...newOrg,
          membershipId: newOrg._id,
          role: newOrg.role || 'Owner',
        },
      ];
      setOrgs(updatedOrgs);

      if (user) {
        updateUser({
          _id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          activeOrgId: newOrg._id,
          orgs: updatedOrgs,
        });
      }

      setCreateModal({
        isOpen: false,
        name: '',
        templateId: 'blank',
        loading: false,
        error: '',
      });
      setIsOpen(false);
      window.location.reload();
    } catch (error: any) {
      setCreateModal((prev) => ({
        ...prev,
        loading: false,
        error: error.response?.data?.message || 'Failed to create organization',
      }));
    }
  };

  const currentOrg = orgs.find((o) => o._id === user?.activeOrgId);

  if (!user) return null;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center gap-3 px-2 py-2 rounded-xl hover:bg-white/5 transition-colors text-left"
      >
        <div className="h-8 w-8 rounded-lg bg-primary/20 border border-primary/30 flex items-center justify-center shrink-0">
          <span className="text-sm font-bold text-primary">
            {currentOrg?.name?.charAt(0)?.toUpperCase() || 'O'}
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-white truncate">
            {currentOrg?.name || 'Select Organization'}
          </div>
          <div className="text-[10px] text-slate-400 truncate">
            {currentOrg?.role ? roleLabel(currentOrg.role) : 'Member'} • {orgs.length} org
            {orgs.length !== 1 ? 's' : ''}
          </div>
        </div>
        <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute bottom-full left-0 right-0 mb-2 rounded-xl bg-slate-900 border border-white/10 shadow-lg z-50 overflow-hidden">
            <div className="px-3 py-2 border-b border-slate-700 flex items-center justify-between">
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Organizations
              </div>
              {hasPermission('org:manage') && (
                <button
                  type="button"
                  onClick={async () => {
                    setCreateModal({
                      isOpen: true,
                      name: '',
                      templateId: 'blank',
                      loading: false,
                      error: '',
                    });
                    try {
                      const res = await api.get(apiPaths.ORGS.TEMPLATES);
                      setTemplates(res.data.data || []);
                    } catch {
                      setTemplates([]);
                    }
                  }}
                  className="text-xs text-primary hover:text-primary-hover font-medium flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" />
                  New
                </button>
              )}
            </div>
            <div className="max-h-64 overflow-y-auto">
              {loading ? (
                <div className="px-3 py-4 text-center text-sm text-slate-400">Loading...</div>
              ) : orgs.length === 0 ? (
                <div className="px-3 py-4 text-center text-sm text-slate-400">
                  No organizations yet
                </div>
              ) : (
                orgs.map((org) => (
                  <div key={org._id} className="relative">
                    <div
                      className={`flex items-center gap-3 px-3 py-2.5 hover:bg-white/5 cursor-pointer transition-colors ${
                        org._id === user?.activeOrgId ? 'bg-primary/10' : ''
                      }`}
                      onClick={() => handleSwitchOrg(org._id)}
                    >
                      <div className="h-8 w-8 rounded-lg bg-slate-700 border border-slate-600 flex items-center justify-center shrink-0">
                        <span className="text-sm font-bold text-slate-300">
                          {org.name?.charAt(0)?.toUpperCase() || 'O'}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-white truncate">{org.name}</div>
                        <div className="text-[10px] text-slate-400">
                          {roleLabel(org.role)}
                          {org.plan && ` • ${org.plan}`}
                        </div>
                      </div>
                      {org._id === user?.activeOrgId && (
                        <CheckCircle className="w-4 h-4 text-primary shrink-0" />
                      )}
                    </div>
                    {org._id === user?.activeOrgId && orgs.length > 1 && (
                      <div className="absolute right-2 top-1/2 -translate-y-1/2">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowLeaveConfirm(org._id);
                          }}
                          className="p-1 text-slate-500 hover:text-rose-400 rounded transition-colors"
                          title="Leave organization"
                        >
                          <LogOut className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}

      {showLeaveConfirm && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
            <div
              className="fixed inset-0 bg-slate-900/80 transition-opacity"
              onClick={() => setShowLeaveConfirm(null)}
            />
            <div className="relative transform overflow-hidden rounded-xl bg-slate-800 border border-slate-700 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg">
              <div className="px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="sm:flex sm:items-start">
                  <div className="mx-auto flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-rose-500/10 sm:mx-0 sm:h-10 sm:w-10">
                    <AlertTriangle className="h-6 w-6 text-rose-400" />
                  </div>
                  <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                    <h3 className="text-lg font-semibold leading-6 text-white">
                      Leave Organization
                    </h3>
                    <div className="mt-2">
                      <p className="text-sm text-slate-400">
                        Are you sure you want to leave this organization? You will lose access to
                        all its projects and tasks.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-slate-800/50 px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6 gap-2">
                <button
                  type="button"
                  onClick={() => handleLeaveOrg(showLeaveConfirm)}
                  className="btn-danger w-full sm:w-auto"
                >
                  Leave Organization
                </button>
                <button
                  type="button"
                  onClick={() => setShowLeaveConfirm(null)}
                  className="btn-ghost w-full sm:w-auto mt-3 sm:mt-0"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {createModal.isOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
            <div
              className="fixed inset-0 bg-slate-900/80 transition-opacity"
              onClick={() => setCreateModal((prev) => ({ ...prev, isOpen: false }))}
            />
            <div className="relative transform overflow-hidden rounded-xl bg-slate-800 border border-slate-700 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg">
              <div className="px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="sm:flex sm:items-start">
                  <div className="mx-auto flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 sm:mx-0 sm:h-10 sm:w-10">
                    <Building2 className="h-6 w-6 text-primary" />
                  </div>
                  <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                    <h3 className="text-lg font-semibold leading-6 text-white">
                      Create Organization
                    </h3>
                    <div className="mt-4">
                      <label
                        htmlFor="orgName"
                        className="block text-xs font-medium text-slate-400 uppercase tracking-wide mb-1"
                      >
                        Organization Name
                      </label>
                      <input
                        type="text"
                        id="orgName"
                        value={createModal.name}
                        onChange={(e) =>
                          setCreateModal((prev) => ({ ...prev, name: e.target.value, error: '' }))
                        }
                        className="input-dark block w-full px-3 py-2 text-sm"
                        placeholder="My Team Workspace"
                        autoFocus
                      />
                      <label className="block text-xs font-medium text-slate-400 uppercase tracking-wide mb-1 mt-3">
                        Workspace Template
                      </label>
                      <select
                        value={createModal.templateId}
                        onChange={(e) =>
                          setCreateModal((prev) => ({ ...prev, templateId: e.target.value }))
                        }
                        className="input-dark block w-full px-3 py-2 text-sm"
                      >
                        {(templates.length
                          ? templates
                          : [
                              {
                                id: 'blank',
                                name: 'Blank Workspace',
                                description: 'Start empty',
                              },
                            ]
                        ).map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.name}
                          </option>
                        ))}
                      </select>
                      {templates.find((t) => t.id === createModal.templateId)?.description && (
                        <p className="mt-1 text-xs text-slate-500">
                          {templates.find((t) => t.id === createModal.templateId)?.description}
                        </p>
                      )}
                      {createModal.error && (
                        <p className="mt-1 text-sm text-rose-400">{createModal.error}</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-slate-800/50 px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6 gap-2">
                <button
                  type="button"
                  onClick={handleCreateOrg}
                  disabled={createModal.loading || !createModal.name.trim()}
                  className="btn-primary w-full sm:w-auto disabled:opacity-50"
                >
                  {createModal.loading ? 'Creating...' : 'Create Organization'}
                </button>
                <button
                  type="button"
                  onClick={() => setCreateModal((prev) => ({ ...prev, isOpen: false }))}
                  className="btn-ghost w-full sm:w-auto mt-3 sm:mt-0"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default OrgSwitcher;
