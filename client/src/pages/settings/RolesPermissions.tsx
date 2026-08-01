import { useContext, useEffect, useState, useMemo } from 'react';
import { Plus, Search, Grid, Layers, Users, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';
import { UserContext } from '../../context/UserContext';
import PageShell from '../../components/common/PageShell';
import NavTabs from '../../components/common/NavTabs';
import ChangeRoleModal from '../../components/users/ChangeRoleModal';
import RolesOverviewTab from '../../components/roles/RolesOverviewTab';
import PermissionMatrixTab from '../../components/roles/PermissionMatrixTab';
import MemberDirectoryTab from '../../components/roles/MemberDirectoryTab';
import CreateEditRoleModal from '../../components/roles/CreateEditRoleModal';
import AssignRoleModal from '../../components/roles/AssignRoleModal';
import type { SystemRoleRow, CustomRole, OrgMemberData } from '../../components/roles/types';
import ConfirmModal from '../../components/common/ConfirmModal';
import api from '../../utils/axios';
import { apiPaths } from '../../utils/apiPaths';

const RolesPermissions = () => {
  const { user, hasPermission } = useContext(UserContext);
  const [systemRoles, setSystemRoles] = useState<SystemRoleRow[]>([]);
  const [customRoles, setCustomRoles] = useState<CustomRole[]>([]);
  const [members, setMembers] = useState<OrgMemberData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Active View Tab & Filters
  const [activeTab, setActiveTab] = useState<'overview' | 'matrix' | 'members'>('overview');
  const [searchTerm, setSearchTerm] = useState('');
  const [permissionCategoryFilter, setPermissionCategoryFilter] = useState('all');

  // Custom Role Modals (Create & Edit)
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingRole, setEditingRole] = useState<CustomRole | null>(null);
  const [roleForm, setRoleForm] = useState({
    name: '',
    description: '',
    permissions: [] as string[],
  });
  const [savingRole, setSavingRole] = useState(false);

  // Assign Role Modal state
  const [assignRoleTarget, setAssignRoleTarget] = useState<{
    role: string;
    customRoleId?: string;
    roleName: string;
  } | null>(null);

  // Single Member Change Role Modal
  const [changeRoleMember, setChangeRoleMember] = useState<{
    _id: string;
    membershipId?: string;
    name: string;
    email: string;
    profileImageUrl?: string;
    role: string;
    customRoleId?: string;
  } | null>(null);

  // Confirm / Alert Modal state
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    variant?: 'danger' | 'warning' | 'info' | 'success';
    type?: 'confirm' | 'alert';
    onConfirm?: () => void | Promise<void>;
    loading?: boolean;
  }>({
    isOpen: false,
    title: '',
    message: '',
    variant: 'danger',
    type: 'confirm',
  });

  const canManage = hasPermission('role:manage');

  const fetchData = async () => {
    try {
      setLoading(true);
      setError('');
      const [rolesRes, membersRes] = await Promise.all([
        api.get(apiPaths.ROLES.LIST),
        user?.activeOrgId
          ? api.get(apiPaths.ORG_MEMBERSHIP.GET_MEMBERS.replace(':orgId', user.activeOrgId))
          : Promise.resolve({ data: [] }),
      ]);

      setSystemRoles(rolesRes.data.data.systemRoles || []);
      setCustomRoles(rolesRes.data.data.customRoles || []);
      setMembers(Array.isArray(membersRes.data) ? membersRes.data : []);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load roles and permissions data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (canManage) {
      fetchData();
    } else {
      setLoading(false);
    }
  }, [canManage, user?.activeOrgId]);

  // Helper mapping members to roles
  const membersByRole = useMemo(() => {
    const map: Record<string, OrgMemberData[]> = {};
    members.forEach((m) => {
      const uObj = typeof m.userId === 'object' ? m.userId : null;
      if (!uObj) return;

      let key = m.role;
      if (m.role === 'Custom') {
        const cId = typeof m.customRoleId === 'object' ? m.customRoleId?._id : m.customRoleId;
        key = `custom:${cId}`;
      } else if (m.role === 'Owner') {
        key = 'OrgAdmin';
      }

      if (!map[key]) map[key] = [];
      map[key].push(m);
    });
    return map;
  }, [members]);

  if (!canManage) {
    return (
      <PageShell title="Access Denied" subtitle="You need role:manage permission to access this page." />
    );
  }

  // Create Custom Role Handler
  const handleCreateRole = async () => {
    if (!roleForm.name.trim()) {
      setError('Role name is required.');
      return;
    }
    setSavingRole(true);
    setError('');
    try {
      await api.post(apiPaths.ROLES.CREATE, roleForm);
      setSuccessMsg(`Created role "${roleForm.name.trim()}"`);
      setShowCreateModal(false);
      setRoleForm({ name: '', description: '', permissions: [] });
      setTimeout(() => setSuccessMsg(''), 3000);
      await fetchData();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create role');
    } finally {
      setSavingRole(false);
    }
  };

  // Edit Custom Role Handler
  const handleOpenEditModal = (role: CustomRole) => {
    setEditingRole(role);
    setRoleForm({
      name: role.name,
      description: role.description || '',
      permissions: [...role.permissions],
    });
  };

  const handleUpdateRole = async () => {
    if (!editingRole) return;
    if (!roleForm.name.trim()) {
      setError('Role name is required.');
      return;
    }
    setSavingRole(true);
    setError('');
    try {
      await api.put(apiPaths.ROLES.UPDATE.replace(':id', editingRole._id), roleForm);
      setSuccessMsg(`Updated role "${roleForm.name.trim()}"`);
      setEditingRole(null);
      setRoleForm({ name: '', description: '', permissions: [] });
      setTimeout(() => setSuccessMsg(''), 3000);
      await fetchData();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update role');
    } finally {
      setSavingRole(false);
    }
  };



  // Delete Custom Role Handler
  const handleDeleteRole = (role: CustomRole) => {
    const assignedCount = membersByRole[`custom:${role._id}`]?.length || 0;
    if (assignedCount > 0) {
      setConfirmModal({
        isOpen: true,
        type: 'alert',
        variant: 'warning',
        title: 'Role Currently Assigned',
        message: `Cannot delete "${role.name}" because it is currently assigned to ${assignedCount} member(s). Please reassign those members first.`,
      });
      return;
    }

    setConfirmModal({
      isOpen: true,
      type: 'confirm',
      variant: 'danger',
      title: 'Delete Custom Role',
      message: `Are you sure you want to delete custom role "${role.name}"? This action cannot be undone.`,
      loading: false,
      onConfirm: async () => {
        setConfirmModal((prev) => ({ ...prev, loading: true }));
        try {
          await api.delete(apiPaths.ROLES.DELETE.replace(':id', role._id));
          setSuccessMsg(`Deleted role "${role.name}"`);
          setTimeout(() => setSuccessMsg(''), 3000);
          await fetchData();
        } catch (err: any) {
          setError(err.response?.data?.message || 'Failed to delete custom role');
        } finally {
          setConfirmModal((prev) => ({ ...prev, isOpen: false, loading: false }));
        }
      },
    });
  };

  return (
    <PageShell
      title="Roles & Permissions Management"
      subtitle="Configure system and custom security roles, assign fine-grained permissions, and manage member authorization"
      actions={
        <div className="flex flex-col gap-1 p-1">
          <button
            type="button"
            onClick={fetchData}
            className="w-full text-left px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-2 rounded-lg transition-colors"
          >
            <RefreshCw className={`w-4 h-4 text-slate-500 ${loading ? 'animate-spin' : ''}`} />
            Refresh Roles
          </button>
          <button
            type="button"
            onClick={() => {
              setRoleForm({ name: '', description: '', permissions: [] });
              setShowCreateModal(true);
            }}
            className="w-full text-left px-3.5 py-2 text-xs font-semibold text-primary hover:bg-primary/10 flex items-center gap-2 rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4 text-primary" />
            Create Custom Role
          </button>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Alerts */}
        {error && (
          <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-sm font-semibold text-rose-500 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <span>{error}</span>
            </div>
            <button onClick={() => setError('')} className="text-xs hover:underline">Dismiss</button>
          </div>
        )}
        {successMsg && (
          <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-sm font-semibold text-emerald-600 flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Controls Toolbar: NavTabs on LEFT, Search Input on RIGHT */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200/80 pb-3">
          <NavTabs<'overview' | 'matrix' | 'members'>
            tabs={[
              { id: 'overview', label: 'Roles Overview', icon: Grid },
              { id: 'matrix', label: 'Permission Matrix', icon: Layers },
              { id: 'members', label: 'Member Directory', icon: Users, badge: members.length },
            ]}
            activeTab={activeTab}
            onChange={setActiveTab}
          />

          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder={
                activeTab === 'members'
                  ? 'Search members...'
                  : activeTab === 'matrix'
                  ? 'Search permissions...'
                  : 'Search roles...'
              }
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-3 py-2 text-xs bg-white border border-slate-200/80 rounded-xl w-full sm:w-64 focus:outline-none focus:ring-2 focus:ring-primary/20 shadow-2xs"
            />
          </div>
        </div>

        {/* Loading Spinner */}
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
          </div>
        ) : (
          <>
            {activeTab === 'overview' && (
              <RolesOverviewTab
                systemRoles={systemRoles}
                customRoles={customRoles}
                membersByRole={membersByRole}
                onOpenCreateModal={() => {
                  setRoleForm({ name: '', description: '', permissions: [] });
                  setShowCreateModal(true);
                }}
                onOpenEditModal={handleOpenEditModal}
                onDeleteRole={handleDeleteRole}
                onAssignRoleTarget={setAssignRoleTarget}
              />
            )}

            {activeTab === 'matrix' && (
              <PermissionMatrixTab
                systemRoles={systemRoles}
                customRoles={customRoles}
                searchTerm={searchTerm}
                permissionCategoryFilter={permissionCategoryFilter}
                onCategoryFilterChange={setPermissionCategoryFilter}
              />
            )}

            {activeTab === 'members' && (
              <MemberDirectoryTab
                members={members}
                systemRoles={systemRoles}
                customRoles={customRoles}
                searchTerm={searchTerm}
                onChangeRoleMember={setChangeRoleMember}
              />
            )}
          </>
        )}
      </div>

      {/* Modals */}
      <CreateEditRoleModal
        isOpen={showCreateModal || editingRole !== null}
        editingRole={editingRole}
        roleForm={roleForm}
        savingRole={savingRole}
        onClose={() => {
          setShowCreateModal(false);
          setEditingRole(null);
          setRoleForm({ name: '', description: '', permissions: [] });
        }}
        onChangeForm={setRoleForm}
        onSubmit={editingRole ? handleUpdateRole : handleCreateRole}
      />

      <AssignRoleModal
        target={assignRoleTarget}
        members={members}
        activeOrgId={user?.activeOrgId}
        onClose={() => setAssignRoleTarget(null)}
        onRefresh={fetchData}
      />

      <ChangeRoleModal
        isOpen={Boolean(changeRoleMember)}
        member={changeRoleMember}
        customRoles={customRoles}
        onClose={() => setChangeRoleMember(null)}
        onSuccess={() => {
          setSuccessMsg('Member role updated');
          setTimeout(() => setSuccessMsg(''), 3000);
          fetchData();
        }}
      />

      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal((prev) => ({ ...prev, isOpen: false }))}
        onConfirm={confirmModal.onConfirm}
        title={confirmModal.title}
        message={confirmModal.message}
        type={confirmModal.type}
        variant={confirmModal.variant}
        loading={confirmModal.loading}
      />
    </PageShell>
  );
};

export default RolesPermissions;
