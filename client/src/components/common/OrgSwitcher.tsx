import { useState, useContext, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { UserContext } from '../../context/UserContext';
import api from '../../utils/axios';
import { apiPaths } from '../../utils/apiPaths';
import type { OrgMembership } from '../../types';
import {
  ChevronDown,
  Plus,
  CheckCircle,
  LogOut,
  AlertTriangle,
  Building2,
  Sparkles,
  ShieldCheck,
  Zap,
  Check,
  ChevronRight,
  Phone,
  Trash2,
} from 'lucide-react';
import { ROLE_LABELS, isSystemRole } from '../../constants/permissions';

type PlanTier = 'Free' | 'Pro' | 'Enterprise';
type BillingCycle = 'monthly' | 'yearly';

interface CreateOrgModalState {
  isOpen: boolean;
  step: 'details' | 'plan';
  name: string;
  templateId: string;
  plan: PlanTier;
  billingCycle: BillingCycle;
  telebirrPhone: string;
  loading: boolean;
  error: string;
}

interface WorkspaceTemplate {
  id: string;
  name: string;
  description: string;
  projectCount?: number;
  teamCount?: number;
  recommendedPlan?: PlanTier;
}

const PLAN_CARDS: Array<{
  id: PlanTier;
  name: string;
  badge?: string;
  monthlyPrice: string;
  yearlyPrice: string;
  rawMonthly: number;
  rawYearly: number;
  features: string[];
  icon: typeof Zap;
  color: string;
}> = [
  {
    id: 'Free',
    name: 'Free Starter',
    monthlyPrice: '0 ETB',
    yearlyPrice: '0 ETB',
    rawMonthly: 0,
    rawYearly: 0,
    features: ['5 Team Members', '3 Active Projects', '50 AI Ops/mo', 'Basic Task Board'],
    icon: Zap,
    color: 'border-slate-300 bg-slate-50/50 hover:border-slate-400 text-slate-800',
  },
  {
    id: 'Pro',
    name: 'Pro Team',
    badge: 'Popular',
    monthlyPrice: '2,500 ETB/mo',
    yearlyPrice: '24,000 ETB/yr',
    rawMonthly: 2500,
    rawYearly: 24000,
    features: [
      '25 Team Members',
      '20 Active Projects',
      '1,000 AI Ops/mo',
      'Gantt Charts & API Keys',
      'Telebirr Direct & USSD Pay',
    ],
    icon: Sparkles,
    color: 'border-indigo-400 bg-indigo-50/40 hover:border-indigo-500 text-indigo-900',
  },
  {
    id: 'Enterprise',
    name: 'Enterprise',
    monthlyPrice: '15,000 ETB/mo',
    yearlyPrice: '144,000 ETB/yr',
    rawMonthly: 15000,
    rawYearly: 144000,
    features: [
      'Unlimited Members & Projects',
      '50,000 AI Ops/mo',
      'Custom Branding & SSO',
      'Dedicated Telebirr Account Mgr',
      'Priority SLA Support',
    ],
    icon: ShieldCheck,
    color: 'border-amber-400 bg-amber-50/40 hover:border-amber-500 text-amber-900',
  },
];

function OrgSwitcher() {
  const navigate = useNavigate();
  const { user, updateUser, hasPermission } = useContext(UserContext);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [menuPos, setMenuPos] = useState<{ top: number; left: number; width: number }>({
    top: 0,
    left: 0,
    width: 320,
  });
  const [orgs, setOrgs] = useState<OrgMembership[]>([]);
  const [loading, setLoading] = useState(false);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);

  const handleToggleMenu = () => {
    if (!isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const isMobile = window.innerWidth < 768;
      if (isMobile) {
        setMenuPos({
          top: Math.max(10, rect.top - 280),
          left: Math.max(10, rect.left),
          width: Math.min(340, window.innerWidth - 20),
        });
      } else {
        setMenuPos({
          top: Math.max(20, Math.min(rect.top - 30, window.innerHeight - 340)),
          left: rect.right + 12,
          width: 320,
        });
      }
    }
    setIsOpen(!isOpen);
  };
  const [createModal, setCreateModal] = useState<CreateOrgModalState>({
    isOpen: false,
    step: 'details',
    name: '',
    templateId: 'blank',
    plan: 'Free',
    billingCycle: 'monthly',
    telebirrPhone: '',
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

  const planBadgeStyle = (plan?: string) => {
    switch (plan) {
      case 'Enterprise':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'Pro':
        return 'bg-indigo-100 text-indigo-800 border-indigo-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
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

  const handleDeleteOrg = async (orgId: string) => {
    try {
      await api.delete(apiPaths.ORGS.DELETE.replace(':orgId', orgId));
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

      setShowDeleteConfirm(null);
      window.location.reload();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to delete organization');
    }
  };

  const handleCreateOrg = async () => {
    if (!createModal.name.trim()) {
      setCreateModal((prev) => ({ ...prev, error: 'Organization name is required' }));
      return;
    }

    if (createModal.plan !== 'Free' && createModal.telebirrPhone.trim().length < 9) {
      setCreateModal((prev) => ({
        ...prev,
        error: 'Enter a valid Telebirr mobile number to continue with paid plans.',
      }));
      return;
    }

    setCreateModal((prev) => ({ ...prev, loading: true, error: '' }));

    try {
      const response = await api.post(apiPaths.ORGS.CREATE, {
        name: createModal.name.trim(),
        templateId: createModal.templateId || 'blank',
        plan: createModal.plan,
        billingCycle: createModal.billingCycle,
        telebirrPhone: createModal.telebirrPhone,
      });
      const newOrg = response.data;
      const requiresPayment = newOrg.requiresPayment as
        | { plan: PlanTier; billingCycle: BillingCycle; telebirrPhone?: string }
        | undefined;

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

      const pendingPayment = requiresPayment
        ? {
            plan: requiresPayment.plan,
            cycle: requiresPayment.billingCycle,
            phone: requiresPayment.telebirrPhone || createModal.telebirrPhone,
          }
        : null;

      setCreateModal({
        isOpen: false,
        step: 'details',
        name: '',
        templateId: 'blank',
        plan: 'Free',
        billingCycle: 'monthly',
        telebirrPhone: '',
        loading: false,
        error: '',
      });
      setIsOpen(false);

      if (pendingPayment && (pendingPayment.plan === 'Pro' || pendingPayment.plan === 'Enterprise')) {
        const qs = new URLSearchParams({
          tab: 'billing',
          upgrade: pendingPayment.plan,
          cycle: pendingPayment.cycle,
          ...(pendingPayment.phone ? { phone: pendingPayment.phone } : {}),
        });
        navigate(`/settings/enterprise?${qs.toString()}`);
        return;
      }

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
        ref={buttonRef}
        type="button"
        onClick={handleToggleMenu}
        className="w-full flex items-center gap-3 px-2 py-2 rounded-xl hover:bg-gray-100 transition-colors text-left"
      >
        <div className="h-8 w-8 rounded-lg bg-primary/20 border border-primary/30 flex items-center justify-center shrink-0">
          <span className="text-sm font-bold text-primary">
            {currentOrg?.name?.charAt(0)?.toUpperCase() || 'O'}
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-slate-800 truncate">
            {currentOrg?.name || 'Select Organization'}
          </div>
          <div className="flex items-center gap-1.5 text-[10px] text-slate-500 truncate">
            <span>{currentOrg?.role ? roleLabel(currentOrg.role) : 'Member'}</span>
            <span>•</span>
            <span
              className={`px-1.5 py-0.2 rounded border font-semibold text-[9px] uppercase tracking-wider ${planBadgeStyle(
                currentOrg?.plan
              )}`}
            >
              {currentOrg?.plan || 'Free'}
            </span>
          </div>
        </div>
        <ChevronDown className={`w-4 h-4 text-slate-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen &&
        createPortal(
          <div className="fixed inset-0 z-50">
            <div className="fixed inset-0 bg-slate-900/10 backdrop-blur-3xs" onClick={() => setIsOpen(false)} />
            <div
              style={{
                top: `${menuPos.top}px`,
                left: `${menuPos.left}px`,
                width: `${menuPos.width}px`,
              }}
              className="fixed rounded-2xl bg-white border border-gray-200 shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150"
            >
              <div className="px-3.5 py-2.5 border-b border-gray-200 flex items-center justify-between bg-slate-50">
                <div className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                  Workspaces ({orgs.length})
                </div>
                {hasPermission('org:manage') && (
                  <button
                    type="button"
                    onClick={async () => {
                      const hasExistingFree = orgs.some((o) => (o.plan === 'Free' || !o.plan));
                      setCreateModal({
                        isOpen: true,
                        step: 'details',
                        name: '',
                        templateId: 'blank',
                        plan: hasExistingFree ? 'Pro' : 'Free',
                        billingCycle: 'monthly',
                        telebirrPhone: '',
                        loading: false,
                        error: '',
                      });
                      setIsOpen(false);
                      try {
                        const res = await api.get(apiPaths.ORGS.TEMPLATES);
                        setTemplates(res.data.data || []);
                      } catch {
                        setTemplates([]);
                      }
                    }}
                    className="text-xs text-primary hover:text-primary-hover font-semibold flex items-center gap-1 bg-primary/10 px-2.5 py-1 rounded-lg transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    New Workspace
                  </button>
                )}
              </div>
              <div className="max-h-72 overflow-y-auto divide-y divide-gray-100">
                {loading ? (
                  <div className="px-3 py-4 text-center text-sm text-slate-500">Loading...</div>
                ) : orgs.length === 0 ? (
                  <div className="px-3 py-4 text-center text-sm text-slate-500">
                    No organizations yet
                  </div>
                ) : (
                  orgs.map((org) => {
                    const isOwner = org.role === 'Owner' || org.role === 'OrgAdmin';
                    return (
                      <div key={org._id} className="relative">
                        <div
                          className={`flex items-center gap-3 px-3.5 py-3 hover:bg-slate-50 cursor-pointer transition-colors ${
                            org._id === user?.activeOrgId ? 'bg-primary/5' : ''
                          }`}
                          onClick={() => handleSwitchOrg(org._id)}
                        >
                          <div className="h-9 w-9 rounded-xl bg-slate-100 border border-slate-300 flex items-center justify-center shrink-0 shadow-2xs">
                            <span className="text-sm font-bold text-slate-700">
                              {org.name?.charAt(0)?.toUpperCase() || 'O'}
                            </span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-semibold text-slate-800 truncate">{org.name}</span>
                              <span
                                className={`px-1.5 py-0.2 rounded border font-semibold text-[9px] uppercase tracking-wider shrink-0 ${planBadgeStyle(
                                  org.plan
                                )}`}
                              >
                                {org.plan || 'Free'}
                              </span>
                            </div>
                            <div className="text-[11px] text-slate-500">{roleLabel(org.role)}</div>
                          </div>

                          <div className="flex items-center gap-3 shrink-0">
                            {org._id === user?.activeOrgId && (
                              <CheckCircle className="w-4.5 h-4.5 text-primary shrink-0" />
                            )}
                            {org._id === user?.activeOrgId && (
                              isOwner ? (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setIsOpen(false);
                                    setShowDeleteConfirm(org._id);
                                  }}
                                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                                  title="Delete organization"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              ) : (
                                orgs.length > 1 && (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setIsOpen(false);
                                      setShowLeaveConfirm(org._id);
                                    }}
                                    className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                                    title="Leave organization"
                                  >
                                    <LogOut className="w-4 h-4" />
                                  </button>
                                )
                              )
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>,
          document.body
        )}

      {showDeleteConfirm &&
        createPortal(
          <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
              <div
                className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"
                onClick={() => setShowDeleteConfirm(null)}
              />
              <div className="relative transform overflow-hidden rounded-2xl bg-white text-left shadow-2xl transition-all sm:my-8 sm:w-full sm:max-w-lg border border-gray-200">
                <div className="px-4 pt-5 pb-4 sm:p-6">
                  <div className="sm:flex sm:items-start">
                    <div className="mx-auto flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-rose-100 sm:mx-0 sm:h-10 sm:w-10">
                      <Trash2 className="h-6 w-6 text-rose-600" />
                    </div>
                    <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                      <h3 className="text-lg font-semibold leading-6 text-slate-900">
                        Delete Organization
                      </h3>
                      <div className="mt-2">
                        <p className="text-sm text-slate-500">
                          Are you sure you want to delete this organization? As owner, deleting this organization will permanently remove all associated projects, tasks, teams, and data. This action cannot be undone.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="bg-slate-50 px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6 gap-2">
                  <button
                    type="button"
                    onClick={() => handleDeleteOrg(showDeleteConfirm)}
                    className="btn-danger w-full sm:w-auto"
                  >
                    Delete Organization
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowDeleteConfirm(null)}
                    className="btn-ghost w-full sm:w-auto mt-3 sm:mt-0"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}

      {showLeaveConfirm &&
        createPortal(
          <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
              <div
                className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"
                onClick={() => setShowLeaveConfirm(null)}
              />
              <div className="relative transform overflow-hidden rounded-2xl bg-white text-left shadow-2xl transition-all sm:my-8 sm:w-full sm:max-w-lg border border-gray-200">
                <div className="px-4 pt-5 pb-4 sm:p-6">
                  <div className="sm:flex sm:items-start">
                    <div className="mx-auto flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-rose-100 sm:mx-0 sm:h-10 sm:w-10">
                      <AlertTriangle className="h-6 w-6 text-rose-600" />
                    </div>
                    <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                      <h3 className="text-lg font-semibold leading-6 text-slate-900">
                        Leave Organization
                      </h3>
                      <div className="mt-2">
                        <p className="text-sm text-slate-500">
                          Are you sure you want to leave this organization? You will lose access to
                          all associated projects, tasks, and team resources.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="bg-slate-50 px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6 gap-2">
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
          </div>,
          document.body
        )}

      {createModal.isOpen &&
        createPortal(
          <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4 text-center sm:p-0">
              <div
                className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity"
                onClick={() => setCreateModal((prev) => ({ ...prev, isOpen: false }))}
              />
              <div className="relative transform overflow-hidden rounded-2xl bg-white text-left shadow-2xl transition-all sm:my-8 sm:w-full sm:max-w-2xl border border-gray-200">
                {/* Modal Header */}
                <div className="bg-slate-50 border-b border-gray-200 px-6 py-5 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-primary/10 text-primary border border-primary/20">
                      <Building2 className="h-6 w-6" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-slate-900">Create New Workspace</h3>
                      <p className="text-xs text-slate-500">
                        {createModal.step === 'details'
                          ? 'Step 1 of 2: Organization Name & Template'
                          : 'Step 2 of 2: Subscription Plan & Billing'}
                      </p>
                    </div>
                  </div>

                  {/* Step Indicators */}
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setCreateModal((prev) => ({ ...prev, step: 'details' }))}
                      className={`h-2.5 rounded-full transition-all ${
                        createModal.step === 'details' ? 'w-8 bg-primary' : 'w-2.5 bg-slate-300'
                      }`}
                      title="Step 1: Details"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (createModal.name.trim()) {
                          setCreateModal((prev) => ({ ...prev, step: 'plan' }));
                        }
                      }}
                      className={`h-2.5 rounded-full transition-all ${
                        createModal.step === 'plan' ? 'w-8 bg-primary' : 'w-2.5 bg-slate-300'
                      }`}
                      title="Step 2: Plan"
                    />
                  </div>
                </div>

                <div className="p-6">
                  {createModal.error && (
                    <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 shrink-0" />
                      <span>{createModal.error}</span>
                    </div>
                  )}

                  {createModal.step === 'details' ? (
                    <div className="space-y-5">
                      <div>
                        <label
                          htmlFor="orgName"
                          className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1.5"
                        >
                          Workspace / Organization Name *
                        </label>
                        <input
                          type="text"
                          id="orgName"
                          value={createModal.name}
                          onChange={(e) =>
                            setCreateModal((prev) => ({ ...prev, name: e.target.value, error: '' }))
                          }
                          className="input-field block w-full px-4 py-2.5 text-sm rounded-xl"
                          placeholder="e.g. Acme Corp Engineering"
                          autoFocus
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-2">
                          Select Workspace Template
                        </label>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {(templates.length
                            ? templates
                            : [
                                {
                                  id: 'blank',
                                  name: 'Blank Workspace',
                                  description: 'Start empty and build custom projects.',
                                },
                              ]
                          ).map((t) => {
                            const isSelected = createModal.templateId === t.id;
                            return (
                              <div
                                key={t.id}
                                onClick={() => {
                                  setCreateModal((prev) => ({
                                    ...prev,
                                    templateId: t.id,
                                    plan: (t.projectCount && t.projectCount > 3) ? 'Pro' : prev.plan,
                                  }));
                                }}
                                className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                                  isSelected
                                    ? 'border-primary bg-primary/5 shadow-sm'
                                    : 'border-gray-200 hover:border-slate-300 bg-white'
                                }`}
                              >
                                <div className="flex items-center justify-between mb-1">
                                  <span className="font-bold text-sm text-slate-900">{t.name}</span>
                                  {isSelected && <CheckCircle className="w-4 h-4 text-primary shrink-0" />}
                                </div>
                                <p className="text-xs text-slate-500 line-clamp-2">{t.description}</p>
                                {t.projectCount !== undefined && t.projectCount > 0 && (
                                  <div className="mt-2 text-[10px] text-slate-600 font-medium flex items-center gap-2">
                                    <span className="px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200">
                                      {t.projectCount} Projects
                                    </span>
                                    {t.teamCount !== undefined && (
                                      <span className="px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200">
                                        {t.teamCount} Teams
                                      </span>
                                    )}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-5">
                      {/* Billing Cycle Switch */}
                      <div className="flex items-center justify-between bg-slate-100 p-1.5 rounded-xl border border-slate-200">
                        <span className="text-xs font-medium text-slate-600 px-3">Billing Cycle:</span>
                        <div className="flex items-center gap-1 bg-white p-1 rounded-lg border border-slate-200 shadow-sm">
                          <button
                            type="button"
                            onClick={() => setCreateModal((prev) => ({ ...prev, billingCycle: 'monthly' }))}
                            className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
                              createModal.billingCycle === 'monthly'
                                ? 'bg-primary text-white shadow'
                                : 'text-slate-600 hover:text-slate-900'
                            }`}
                          >
                            Monthly
                          </button>
                          <button
                            type="button"
                            onClick={() => setCreateModal((prev) => ({ ...prev, billingCycle: 'yearly' }))}
                            className={`px-3 py-1 text-xs font-semibold rounded-md transition-all flex items-center gap-1.5 ${
                              createModal.billingCycle === 'yearly'
                                ? 'bg-primary text-white shadow'
                                : 'text-slate-600 hover:text-slate-900'
                            }`}
                          >
                            <span>Annual</span>
                            <span className="px-1 py-0.2 rounded bg-emerald-500 text-white text-[9px]">
                              Save 20%
                            </span>
                          </button>
                        </div>
                      </div>

                      {/* Subscription Tier Cards */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        {PLAN_CARDS.map((card) => {
                          const isSelected = createModal.plan === card.id;
                          const IconComp = card.icon;
                          const price =
                            createModal.billingCycle === 'yearly' ? card.yearlyPrice : card.monthlyPrice;
                          const hasFreeOrgAlready = orgs.some((o) => (o.plan === 'Free' || !o.plan));
                          const isDisabledFree = card.id === 'Free' && hasFreeOrgAlready;

                          return (
                            <div
                              key={card.id}
                              onClick={() => {
                                if (isDisabledFree) {
                                  setCreateModal((prev) => ({
                                    ...prev,
                                    error: 'Accounts are limited to 1 Free organization workspace. Please select a Pro or Enterprise plan.',
                                  }));
                                  return;
                                }
                                setCreateModal((prev) => ({ ...prev, plan: card.id, error: '' }));
                              }}
                              className={`relative p-4 rounded-xl border-2 transition-all flex flex-col justify-between ${
                                isDisabledFree
                                  ? 'opacity-60 cursor-not-allowed border-dashed border-gray-300 bg-slate-100'
                                  : isSelected
                                  ? 'border-primary ring-2 ring-primary/20 shadow-md bg-white cursor-pointer'
                                  : 'border-gray-200 hover:border-gray-300 bg-slate-50/60 cursor-pointer'
                              }`}
                            >
                              {isDisabledFree ? (
                                <span className="absolute -top-2.5 right-3 px-2 py-0.5 rounded-full bg-slate-600 text-white text-[9px] font-bold uppercase tracking-wider shadow">
                                  Limit Reached
                                </span>
                              ) : card.badge ? (
                                <span className="absolute -top-2.5 right-3 px-2 py-0.5 rounded-full bg-primary text-white text-[9px] font-bold uppercase tracking-wider shadow">
                                  {card.badge}
                                </span>
                              ) : null}

                              <div>
                                <div className="flex items-center gap-2 mb-2">
                                  <IconComp className="w-5 h-5 text-primary shrink-0" />
                                  <span className="font-bold text-sm text-slate-900">{card.name}</span>
                                </div>
                                <div className="text-base font-extrabold text-slate-900 mb-3">{price}</div>

                                <ul className="space-y-1.5 text-xs text-slate-600 mb-4">
                                  {card.features.map((feat, idx) => (
                                    <li key={idx} className="flex items-center gap-1.5">
                                      <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                                      <span className="truncate">{feat}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>

                              <div
                                className={`w-full py-1.5 rounded-lg text-xs font-semibold text-center transition-all ${
                                  isSelected
                                    ? 'bg-primary text-white'
                                    : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                                }`}
                              >
                                {isSelected ? 'Selected' : 'Choose Plan'}
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Telebirr Payment details if Pro/Enterprise */}
                      {createModal.plan !== 'Free' && (
                        <div className="p-4 rounded-xl bg-indigo-50/60 border border-indigo-200 space-y-2">
                          <div className="flex items-center gap-2 text-indigo-900 font-semibold text-xs uppercase tracking-wide">
                            <Phone className="w-4 h-4 text-indigo-600" />
                            <span>Telebirr Express Payment Details</span>
                          </div>
                          <p className="text-xs text-slate-600">
                            Workspace starts on Free. After creation you will complete Telebirr
                            payment to activate{" "}
                            <span className="font-semibold text-slate-800">{createModal.plan}</span>.
                          </p>
                          <input
                            type="text"
                            value={createModal.telebirrPhone}
                            onChange={(e) =>
                              setCreateModal((prev) => ({ ...prev, telebirrPhone: e.target.value }))
                            }
                            placeholder="+251 9XX XXX XXX"
                            className="input-field block w-full px-3 py-2 text-xs rounded-lg bg-white"
                          />
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Footer Controls */}
                <div className="bg-slate-50 px-6 py-4 border-t border-gray-200 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => setCreateModal((prev) => ({ ...prev, isOpen: false }))}
                    className="btn-ghost text-xs"
                  >
                    Cancel
                  </button>

                  <div className="flex items-center gap-2">
                    {createModal.step === 'plan' && (
                      <button
                        type="button"
                        onClick={() => setCreateModal((prev) => ({ ...prev, step: 'details' }))}
                        className="btn-ghost text-xs"
                      >
                        Back
                      </button>
                    )}

                    {createModal.step === 'details' ? (
                      <button
                        type="button"
                        onClick={() => {
                          if (!createModal.name.trim()) {
                            setCreateModal((prev) => ({
                              ...prev,
                              error: 'Organization name is required',
                            }));
                            return;
                          }
                          setCreateModal((prev) => ({ ...prev, step: 'plan', error: '' }));
                        }}
                        disabled={!createModal.name.trim()}
                        className="btn-primary text-xs flex items-center gap-1 disabled:opacity-50"
                      >
                        <span>Continue to Subscription</span>
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={handleCreateOrg}
                        disabled={createModal.loading || !createModal.name.trim()}
                        className="btn-primary text-xs flex items-center gap-1 disabled:opacity-50"
                      >
                        {createModal.loading
                          ? 'Creating Workspace...'
                          : `Create ${createModal.plan} Workspace`}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}

export default OrgSwitcher;
