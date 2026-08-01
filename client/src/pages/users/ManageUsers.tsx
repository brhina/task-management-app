import { useState, useEffect, useContext, useMemo } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  UserPlus,
  Users,
  UsersRound,
  Folder,
  Check,
  ClipboardCopy,
  CheckCircle2,
  AlertTriangle,
  Plus,
  Pencil,
  Trash2,
  BarChart2,
  Crown,
  Search,
  Shield,
  UserCheck,
} from 'lucide-react';
import { UserContext } from '../../context/UserContext';
import api from '../../utils/axios';
import { apiPaths } from '../../utils/apiPaths';
import PageShell from '../../components/common/PageShell';
import NavTabs from '../../components/common/NavTabs';
import FilterToolbar from '../../components/common/FilterToolbar';
import AdvancedTable, { RowActions, type Column, type ActionItem } from '../../components/common/AdvancedTable';
import Modal from '../../components/common/Modal';
import type { User, Task, Project } from '../../types';

import ChangeRoleModal, { type CustomRoleOption } from '../../components/users/ChangeRoleModal';
import MembersTab from '../../components/users/MembersTab';
import TeamsTab from '../../components/users/TeamsTab';
import UserTeamsModal from '../../components/users/UserTeamsModal';
import TeamFormModal from '../../components/users/TeamFormModal';
import InviteMemberModal from '../../components/users/InviteMemberModal';

interface UserWithTaskCounts extends User {
  pendingTasks?: number;
  inProgressTasks?: number;
  completedTasks?: number;
  customRoleId?: string;
  membershipId?: string;
}

interface TeamMember {
  _id: string;
  name: string;
  email: string;
  profileImageUrl?: string;
}

interface Team {
  _id: string;
  name: string;
  description?: string;
  leadId?: TeamMember;
  memberIds: TeamMember[];
  parentTeamId?: { _id: string; name: string };
}

interface InviteModalState {
  isOpen: boolean;
  email: string;
  role: string;
  customRoleId?: string;
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

function ManageUsers() {
  const { user, canAccessAdminSuite, hasPermission } = useContext(UserContext);
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') === 'teams' ? 'teams' : 'members';

  const [users, setUsers] = useState<UserWithTaskCounts[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [customRoles, setCustomRoles] = useState<CustomRoleOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Filters for Members Tab
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [teamFilter, setTeamFilter] = useState('');
  const [workloadFilter, setWorkloadFilter] = useState('');
  const [projectFilter, setProjectFilter] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Filters for Teams Tab
  const [teamSearchTerm, setTeamSearchTerm] = useState('');
  const [teamViewMode, setTeamViewMode] = useState<'grid' | 'list'>('grid');

  // Modals state
  const [inviteModal, setInviteModal] = useState<InviteModalState>({
    isOpen: false,
    email: '',
    role: 'OrgMember',
    loading: false,
    error: '',
    inviteToken: null,
    copied: false,
    userLookup: {
      loading: false,
      found: null,
      user: null,
    },
    mode: 'invite',
  });

  const [changeRoleModal, setChangeRoleModal] = useState<{
    isOpen: boolean;
    member: UserWithTaskCounts | null;
  }>({
    isOpen: false,
    member: null,
  });

  const [userTeamsModal, setUserTeamsModal] = useState<{
    isOpen: boolean;
    targetUser: UserWithTaskCounts | null;
    selectedTeamIds: string[];
    saving: boolean;
    error: string;
  }>({
    isOpen: false,
    targetUser: null,
    selectedTeamIds: [],
    saving: false,
    error: '',
  });

  const [teamFormModal, setTeamFormModal] = useState<{
    isOpen: boolean;
    mode: 'create' | 'edit';
    teamId?: string;
    name: string;
    description: string;
    leadId: string;
    memberIds: string[];
    parentTeamId: string;
    saving: boolean;
    error: string;
  }>({
    isOpen: false,
    mode: 'create',
    name: '',
    description: '',
    leadId: '',
    memberIds: [],
    parentTeamId: '',
    saving: false,
    error: '',
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError('');
      const [usersRes, tasksRes, projectsRes, teamsRes, rolesRes] = await Promise.all([
        api.get(apiPaths.USERS.GET_ALL_USERS),
        api.get(apiPaths.TASKS.GET_ALL_TASKS, { params: { topLevel: 'true' } }),
        api.get(apiPaths.PROJECTS.LIST),
        api.get(apiPaths.TEAMS.LIST).catch(() => ({ data: { data: [] } })),
        api.get(apiPaths.ROLES.LIST).catch(() => ({ data: { data: { customRoles: [] } } })),
      ]);

      const userList = Array.isArray(usersRes.data)
        ? usersRes.data
        : usersRes.data?.users || usersRes.data?.data || [];
      setUsers(userList);
      setTasks(tasksRes.data?.data?.tasks || []);
      setProjects(projectsRes.data?.data?.projects || []);
      setTeams(teamsRes.data?.data || []);
      setCustomRoles(rolesRes.data?.data?.customRoles || []);
    } catch (err: any) {
      setError('Failed to load data. Please refresh.');
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (tab: 'members' | 'teams') => {
    setSearchParams({ tab });
  };

  const workloadStats = useMemo(() => {
    let heavy = 0;
    let moderate = 0;
    let light = 0;
    let idle = 0;

    users.forEach((u) => {
      const active = (u.pendingTasks || 0) + (u.inProgressTasks || 0);
      if (active === 0) idle++;
      else if (active <= 3) light++;
      else if (active <= 7) moderate++;
      else heavy++;
    });

    return { heavy, moderate, light, idle };
  }, [users]);

  // ----------------------------------------------------
  // Member Helpers & Handlers
  // ----------------------------------------------------
  const handleDeleteUser = async (userId: string) => {
    if (!window.confirm('Are you sure you want to delete this user? This action cannot be undone.'))
      return;
    try {
      await api.delete(apiPaths.USERS.DELETE_USER.replace(':id', userId));
      setSuccessMsg('Member removed successfully');
      setTimeout(() => setSuccessMsg(''), 3000);
      fetchData();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to delete user');
    }
  };

  const getUserTeams = (userId: string) => {
    return teams.filter((t) =>
      (t.memberIds || []).some((m) => (typeof m === 'string' ? m === userId : m._id === userId))
    );
  };

  const getUserLeadTeams = (userId: string) => {
    return teams.filter((t) => {
      const leadId = typeof t.leadId === 'string' ? t.leadId : t.leadId?._id;
      return leadId === userId;
    });
  };

  const handleOpenUserTeamsModal = (u: UserWithTaskCounts) => {
    const userTeams = getUserTeams(u._id);
    setUserTeamsModal({
      isOpen: true,
      targetUser: u,
      selectedTeamIds: userTeams.map((t) => t._id),
      saving: false,
      error: '',
    });
  };

  const handleSaveUserTeams = async () => {
    const targetUser = userTeamsModal.targetUser;
    if (!targetUser) return;

    setUserTeamsModal((prev) => ({ ...prev, saving: true, error: '' }));
    try {
      const targetId = targetUser._id;
      const initialTeamIds = getUserTeams(targetId).map((t) => t._id);
      const selected = userTeamsModal.selectedTeamIds;

      const teamsToJoin = selected.filter((id) => !initialTeamIds.includes(id));
      const teamsToLeave = initialTeamIds.filter((id) => !selected.includes(id));

      const updatePromises = [];

      for (const tId of teamsToJoin) {
        const teamObj = teams.find((t) => t._id === tId);
        if (teamObj) {
          const currentMemberIds = (teamObj.memberIds || []).map((m) =>
            typeof m === 'string' ? m : m._id
          );
          if (!currentMemberIds.includes(targetId)) {
            updatePromises.push(
              api.put(apiPaths.TEAMS.UPDATE.replace(':id', tId), {
                memberIds: [...currentMemberIds, targetId],
              })
            );
          }
        }
      }

      for (const tId of teamsToLeave) {
        const teamObj = teams.find((t) => t._id === tId);
        if (teamObj) {
          const currentMemberIds = (teamObj.memberIds || []).map((m) =>
            typeof m === 'string' ? m : m._id
          );
          updatePromises.push(
            api.put(apiPaths.TEAMS.UPDATE.replace(':id', tId), {
              memberIds: currentMemberIds.filter((id) => id !== targetId),
            })
          );
        }
      }

      await Promise.all(updatePromises);
      setUserTeamsModal((prev) => ({ ...prev, isOpen: false, saving: false }));
      setSuccessMsg(`Updated teams for ${targetUser.name}`);
      setTimeout(() => setSuccessMsg(''), 3000);
      fetchData();
    } catch (err: any) {
      setUserTeamsModal((prev) => ({
        ...prev,
        saving: false,
        error: err.response?.data?.message || 'Failed to update team assignments',
      }));
    }
  };

  // ----------------------------------------------------
  // Invite Modal Handlers
  // ----------------------------------------------------
  const handleOpenInviteModal = () => {
    setInviteModal({
      isOpen: true,
      email: '',
      role: 'OrgMember',
      loading: false,
      error: '',
      inviteToken: null,
      copied: false,
      userLookup: {
        loading: false,
        found: null,
        user: null,
      },
      mode: 'invite',
    });
  };

  const handleCloseInviteModal = () => {
    setInviteModal((prev) => ({ ...prev, isOpen: false }));
  };

  const handleInviteMember = async () => {
    if (!user?.activeOrgId) {
      setInviteModal((prev) => ({ ...prev, error: 'No organization selected' }));
      return;
    }
    setInviteModal((prev) => ({ ...prev, loading: true, error: '' }));
    try {
      const payload: any = { email: inviteModal.email, role: inviteModal.role };
      if (inviteModal.role === 'Custom' && inviteModal.customRoleId) {
        payload.customRoleId = inviteModal.customRoleId;
      }
      const response = await api.post(
        apiPaths.ORG_MEMBERSHIP.INVITE.replace(':orgId', user.activeOrgId),
        payload
      );
      const { inviteToken } = response.data;
      setInviteModal((prev) => ({ ...prev, loading: false, inviteToken }));
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'Failed to generate invite token';
      setInviteModal((prev) => ({ ...prev, loading: false, error: errorMessage }));
    }
  };

  const lookupUser = async (email: string) => {
    if (!email || !email.includes('@')) {
      setInviteModal((prev) => ({
        ...prev,
        userLookup: { loading: false, found: null, user: null },
      }));
      return;
    }
    setInviteModal((prev) => ({
      ...prev,
      userLookup: { ...prev.userLookup, loading: true },
    }));

    try {
      const response = await api.get(
        apiPaths.ORGS.CHECK_USER.replace(':email', encodeURIComponent(email))
      );
      const { exists, user: foundUser } = response.data;
      setInviteModal((prev) => ({
        ...prev,
        userLookup: { loading: false, found: exists, user: foundUser },
        mode: exists ? 'add' : 'invite',
      }));
    } catch (err) {
      setInviteModal((prev) => ({
        ...prev,
        userLookup: { loading: false, found: null, user: null },
        mode: 'invite',
      }));
    }
  };

  const handleAddMember = async () => {
    if (!user?.activeOrgId || !inviteModal.userLookup.user) {
      setInviteModal((prev) => ({ ...prev, error: 'No organization or user selected' }));
      return;
    }
    setInviteModal((prev) => ({ ...prev, loading: true, error: '' }));
    try {
      const payload: any = { email: inviteModal.email, role: inviteModal.role };
      if (inviteModal.role === 'Custom' && inviteModal.customRoleId) {
        payload.customRoleId = inviteModal.customRoleId;
      }
      await api.post(apiPaths.ORGS.ADD_MEMBER.replace(':orgId', user.activeOrgId), payload);
      setInviteModal((prev) => ({ ...prev, loading: false }));
      handleCloseInviteModal();
      setSuccessMsg('Member added successfully');
      setTimeout(() => setSuccessMsg(''), 3000);
      fetchData();
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'Failed to add member';
      setInviteModal((prev) => ({ ...prev, loading: false, error: errorMessage }));
    }
  };

  const copyInviteLink = async () => {
    if (inviteModal.inviteToken) {
      const inviteLink = `${window.location.origin}/signup?invite=${inviteModal.inviteToken}`;
      try {
        await navigator.clipboard.writeText(inviteLink);
        setInviteModal((prev) => ({ ...prev, copied: true }));
        setTimeout(() => {
          setInviteModal((prev) => ({ ...prev, copied: false }));
        }, 2000);
      } catch (err) {
        console.error('Failed to copy:', err);
      }
    }
  };

  // ----------------------------------------------------
  // Teams Tab Handlers (Create, Edit, Delete, Dashboard)
  // ----------------------------------------------------
  const handleOpenCreateTeam = () => {
    setTeamFormModal({
      isOpen: true,
      mode: 'create',
      name: '',
      description: '',
      leadId: '',
      memberIds: [],
      parentTeamId: '',
      saving: false,
      error: '',
    });
  };

  const handleOpenEditTeam = (team: Team) => {
    const leadId = typeof team.leadId === 'string' ? team.leadId : team.leadId?._id || '';
    const parentId = typeof team.parentTeamId === 'string' ? team.parentTeamId : team.parentTeamId?._id || '';
    const memberIds = (team.memberIds || []).map((m) => (typeof m === 'string' ? m : m._id));

    setTeamFormModal({
      isOpen: true,
      mode: 'edit',
      teamId: team._id,
      name: team.name,
      description: team.description || '',
      leadId,
      memberIds,
      parentTeamId: parentId,
      saving: false,
      error: '',
    });
  };

  const handleSaveTeam = async () => {
    if (!teamFormModal.name.trim()) {
      setTeamFormModal((prev) => ({ ...prev, error: 'Team name is required' }));
      return;
    }

    setTeamFormModal((prev) => ({ ...prev, saving: true, error: '' }));
    try {
      const payload = {
        name: teamFormModal.name.trim(),
        description: teamFormModal.description.trim(),
        leadId: teamFormModal.leadId || undefined,
        memberIds: teamFormModal.memberIds,
        parentTeamId: teamFormModal.parentTeamId || undefined,
      };

      if (teamFormModal.mode === 'create') {
        await api.post(apiPaths.TEAMS.CREATE, payload);
        setSuccessMsg('Team created successfully');
      } else if (teamFormModal.teamId) {
        await api.put(apiPaths.TEAMS.UPDATE.replace(':id', teamFormModal.teamId), payload);
        setSuccessMsg('Team updated successfully');
      }

      setTeamFormModal((prev) => ({ ...prev, isOpen: false, saving: false }));
      setTimeout(() => setSuccessMsg(''), 3000);
      fetchData();
    } catch (err: any) {
      setTeamFormModal((prev) => ({
        ...prev,
        saving: false,
        error: err.response?.data?.message || 'Failed to save team',
      }));
    }
  };

  const handleDeleteTeam = async (teamId: string, teamName: string) => {
    if (!window.confirm(`Are you sure you want to delete "${teamName}"?`)) return;
    try {
      await api.delete(apiPaths.TEAMS.DELETE.replace(':id', teamId));
      setSuccessMsg('Team deleted successfully');
      setTimeout(() => setSuccessMsg(''), 3000);
      fetchData();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to delete team');
    }
  };

  const handleOpenTeamDashboard = (team: Team) => {
    navigate(`/teams/${team._id}/performance`);
  };

  // ----------------------------------------------------
  // Computations
  // ----------------------------------------------------
  const getTotalTasks = (u: UserWithTaskCounts) =>
    (u.pendingTasks || 0) + (u.inProgressTasks || 0) + (u.completedTasks || 0);

  const getWorkloadStatus = (u: UserWithTaskCounts) => {
    const active = (u.pendingTasks || 0) + (u.inProgressTasks || 0);
    if (active === 0)
      return { label: 'Idle', color: 'text-slate-500', bg: 'bg-slate-500/15', bar: 'bg-slate-500' };
    if (active <= 3)
      return {
        label: 'Light',
        color: 'text-emerald-400',
        bg: 'bg-emerald-500/15',
        bar: 'bg-emerald-500',
      };
    if (active <= 7)
      return {
        label: 'Moderate',
        color: 'text-blue-400',
        bg: 'bg-blue-500/15',
        bar: 'bg-blue-500',
      };
    if (active <= 12)
      return {
        label: 'Heavy',
        color: 'text-amber-400',
        bg: 'bg-amber-500/15',
        bar: 'bg-amber-500',
      };
    return {
      label: 'Overloaded',
      color: 'text-rose-400',
      bg: 'bg-rose-500/15',
      bar: 'bg-rose-500',
    };
  };

  const getCompletionRate = (u: UserWithTaskCounts) => {
    const total = getTotalTasks(u);
    if (total === 0) return 0;
    return Math.round(((u.completedTasks || 0) / total) * 100);
  };

  const getUserProjects = (userId: string) => {
    const projectIds = new Set<string>();
    tasks.forEach((t) => {
      const assigneeId = typeof t.assignedTo === 'string' ? t.assignedTo : t.assignedTo?._id;
      if (assigneeId === userId && t.projectId) {
        const pid = typeof t.projectId === 'string' ? t.projectId : t.projectId?._id;
        if (pid) projectIds.add(pid);
      }
    });
    return projects.filter((p) => projectIds.has(p._id));
  };

  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const matchesSearch =
        !searchTerm ||
        u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.email.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesRole = !roleFilter || u.role === roleFilter;

      let matchesTeam = true;
      if (teamFilter) {
        const uTeams = getUserTeams(u._id);
        matchesTeam = uTeams.some((t) => t._id === teamFilter);
      }

      const wl = getWorkloadStatus(u);
      const matchesWorkload =
        !workloadFilter || wl.label.toLowerCase() === workloadFilter.toLowerCase();

      let matchesProject = true;
      if (projectFilter) {
        const userProjects = getUserProjects(u._id);
        matchesProject = userProjects.some((p) => p._id === projectFilter);
      }

      return matchesSearch && matchesRole && matchesTeam && matchesWorkload && matchesProject;
    });
  }, [users, searchTerm, roleFilter, teamFilter, workloadFilter, projectFilter, tasks, projects, teams]);

  const filteredTeams = useMemo(() => {
    return teams.filter((t) => {
      if (!teamSearchTerm) return true;
      const term = teamSearchTerm.toLowerCase();
      const leadName = typeof t.leadId === 'object' ? t.leadId?.name || '' : '';
      return (
        t.name.toLowerCase().includes(term) ||
        (t.description && t.description.toLowerCase().includes(term)) ||
        leadName.toLowerCase().includes(term)
      );
    });
  }, [teams, teamSearchTerm]);

  const projectsWithMembers = useMemo(() => {
    const map: Record<string, Set<string>> = {};
    tasks.forEach((t) => {
      const assigneeId = typeof t.assignedTo === 'string' ? t.assignedTo : t.assignedTo?._id;
      const pid = typeof t.projectId === 'string' ? t.projectId : t.projectId?._id;
      if (assigneeId && pid) {
        if (!map[pid]) map[pid] = new Set();
        map[pid].add(assigneeId);
      }
    });
    return map;
  }, [tasks]);

  if (!user || !canAccessAdminSuite()) {
    return (
      <PageShell title="Access Denied" subtitle="You don't have permission to access this page." />
    );
  }

  return (
    <PageShell
      title="Users & Teams"
      subtitle="Manage organization members, team structures, workloads, and department reporting"
      actions={
        <>
          <button
            type="button"
            onClick={fetchData}
            className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-gray-100 transition-colors"
          >
            Refresh Data
          </button>
          {activeTab === 'members' && hasPermission('member:invite') && (
            <button
              type="button"
              onClick={handleOpenInviteModal}
              className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-gray-100 transition-colors"
            >
              Invite Member
            </button>
          )}
          {activeTab === 'teams' && hasPermission('team:manage') && (
            <button
              type="button"
              onClick={handleOpenCreateTeam}
              className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-gray-100 transition-colors"
            >
              Create Team
            </button>
          )}
        </>
      }
    >
      <div className="space-y-5">
        {error && <div className="alert-error mb-2">{error}</div>}
        {successMsg && (
          <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg px-4 py-2.5 text-sm text-emerald-400 font-medium">
            {successMsg}
          </div>
        )}

        {/* Unified Tab Navigation & Action Toolbar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-1">
          <NavTabs<'members' | 'teams'>
            tabs={[
              { id: 'members', label: 'Members', icon: Users, badge: users.length },
              ...(hasPermission('team:view')
                ? [{ id: 'teams' as const, label: 'Teams', icon: UsersRound, badge: teams.length }]
                : []),
            ]}
            activeTab={activeTab}
            onChange={handleTabChange}
          />

          <div className="flex items-center gap-2 shrink-0">
            {activeTab === 'members' && hasPermission('member:invite') && (
              <button
                type="button"
                onClick={handleOpenInviteModal}
                className="btn-primary text-xs font-bold flex items-center gap-1.5 px-4 py-2 rounded-xl shadow-xs"
              >
                <UserPlus className="w-4 h-4" />
                <span>Invite Member</span>
              </button>
            )}
            {activeTab === 'teams' && hasPermission('team:manage') && (
              <button
                type="button"
                onClick={handleOpenCreateTeam}
                className="btn-primary text-xs font-bold flex items-center gap-1.5 px-4 py-2 rounded-xl shadow-xs"
              >
                <Plus className="w-4 h-4" />
                <span>Create Team</span>
              </button>
            )}
          </div>
        </div>

        {/* TAB 1: MEMBERS */}
        {activeTab === 'members' && (
          <MembersTab
            users={users as any}
            teams={teams}
            tasks={tasks}
            projects={projects}
            loading={loading}
            hasPermission={hasPermission}
            customRoles={customRoles}
            onOpenUserTeamsModal={(u) => handleOpenUserTeamsModal(u as any)}
            onOpenChangeRoleModal={(member) => setChangeRoleModal({ isOpen: true, member: member as any })}
            onDeleteUser={handleDeleteUser}
          />
        )}

        {/* TAB 2: TEAMS */}
        {activeTab === 'teams' && (
          <TeamsTab
            teams={teams}
            loading={loading}
            hasPermission={hasPermission}
            onOpenCreateTeam={handleOpenCreateTeam}
            onOpenEditTeam={handleOpenEditTeam}
            onDeleteTeam={handleDeleteTeam}
            onOpenTeamDashboard={handleOpenTeamDashboard}
          />
        )}
      </div>

      {/* User Teams Modal */}
      <UserTeamsModal
        isOpen={userTeamsModal.isOpen}
        onClose={() =>
          setUserTeamsModal({
            isOpen: false,
            targetUser: null,
            selectedTeamIds: [],
            saving: false,
            error: '',
          })
        }
        targetUser={userTeamsModal.targetUser}
        selectedTeamIds={userTeamsModal.selectedTeamIds}
        onToggleTeam={(teamId, checked) =>
          setUserTeamsModal((prev) => ({
            ...prev,
            selectedTeamIds: checked
              ? [...prev.selectedTeamIds, teamId]
              : prev.selectedTeamIds.filter((id) => id !== teamId),
          }))
        }
        onSave={handleSaveUserTeams}
        saving={userTeamsModal.saving}
        error={userTeamsModal.error}
        teams={teams}
      />

      {/* Team Form Modal */}
      <TeamFormModal
        isOpen={teamFormModal.isOpen}
        onClose={() => setTeamFormModal((prev) => ({ ...prev, isOpen: false }))}
        mode={teamFormModal.mode}
        name={teamFormModal.name}
        description={teamFormModal.description}
        leadId={teamFormModal.leadId}
        memberIds={teamFormModal.memberIds}
        parentTeamId={teamFormModal.parentTeamId}
        onChangeField={(field: string, value: any) => setTeamFormModal((prev) => ({ ...prev, [field]: value }))}
        onSave={handleSaveTeam}
        saving={teamFormModal.saving}
        error={teamFormModal.error}
        users={users as any}
        teams={teams}
        editingTeamId={teamFormModal.teamId}
      />



      {/* Invite Member Modal */}
      <InviteMemberModal
        state={inviteModal}
        customRoles={customRoles}
        onClose={handleCloseInviteModal}
        onChangeEmail={(email) => {
          setInviteModal((prev) => ({ ...prev, email }));
          if (email.includes('@')) {
            lookupUser(email);
          }
        }}
        onChangeRole={(role, customRoleId) =>
          setInviteModal((prev) => ({ ...prev, role, customRoleId }))
        }
        onInvite={handleInviteMember}
        onAdd={handleAddMember}
        onCopyLink={copyInviteLink}
        hasInvitePermission={hasPermission('member:invite')}
      />

      <ChangeRoleModal
        isOpen={changeRoleModal.isOpen}
        member={changeRoleModal.member}
        customRoles={customRoles}
        onClose={() => setChangeRoleModal({ isOpen: false, member: null })}
        onSuccess={() => {
          setSuccessMsg('Member role updated successfully');
          setTimeout(() => setSuccessMsg(''), 3000);
          fetchData();
        }}
      />
    </PageShell>
  );
}

export default ManageUsers;
