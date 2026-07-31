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
import FilterToolbar from '../../components/common/FilterToolbar';
import AdvancedTable, { RowActions, type Column, type ActionItem } from '../../components/common/AdvancedTable';
import Modal from '../../components/common/Modal';
import type { User, Task, Project } from '../../types';

interface UserWithTaskCounts extends User {
  pendingTasks?: number;
  inProgressTasks?: number;
  completedTasks?: number;
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

function ManageUsers() {
  const { user, canAccessAdminSuite, hasPermission } = useContext(UserContext);
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') === 'teams' ? 'teams' : 'members';

  const [users, setUsers] = useState<UserWithTaskCounts[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
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
      const [usersRes, tasksRes, projectsRes, teamsRes] = await Promise.all([
        api.get(apiPaths.USERS.GET_ALL_USERS),
        api.get(apiPaths.TASKS.GET_ALL_TASKS, { params: { topLevel: 'true' } }),
        api.get(apiPaths.PROJECTS.LIST),
        api.get(apiPaths.TEAMS.LIST).catch(() => ({ data: { data: [] } })),
      ]);

      const userList = Array.isArray(usersRes.data)
        ? usersRes.data
        : usersRes.data?.users || usersRes.data?.data || [];
      setUsers(userList);
      setTasks(tasksRes.data?.data?.tasks || []);
      setProjects(projectsRes.data?.data?.projects || []);
      setTeams(teamsRes.data?.data || []);
    } catch (err: any) {
      setError('Failed to load data. Please refresh.');
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (tab: 'members' | 'teams') => {
    setSearchParams({ tab });
  };

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
      const response = await api.post(
        apiPaths.ORG_MEMBERSHIP.INVITE.replace(':orgId', user.activeOrgId),
        { email: inviteModal.email, role: inviteModal.role }
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
      await api.post(apiPaths.ORGS.ADD_MEMBER.replace(':orgId', user.activeOrgId), {
        email: inviteModal.email,
        role: inviteModal.role,
      });
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

        {/* Tab Navigation */}
        <div className="flex items-center justify-between border-b border-gray-200 pb-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleTabChange('members')}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg transition-all ${
                activeTab === 'members'
                  ? 'bg-primary text-white shadow-sm'
                  : 'bg-gray-100 text-slate-600 hover:bg-gray-200'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>Members</span>
              <span
                className={`ml-1 px-1.5 py-0.5 text-xs rounded-full font-bold ${
                  activeTab === 'members'
                    ? 'bg-white/20 text-white'
                    : 'bg-gray-200 text-slate-700'
                }`}
              >
                {users.length}
              </span>
            </button>

            {hasPermission('team:view') && (
              <button
                type="button"
                onClick={() => handleTabChange('teams')}
                className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg transition-all ${
                  activeTab === 'teams'
                    ? 'bg-primary text-white shadow-sm'
                    : 'bg-gray-100 text-slate-600 hover:bg-gray-200'
                }`}
              >
                <UsersRound className="w-4 h-4" />
                <span>Teams</span>
                <span
                  className={`ml-1 px-1.5 py-0.5 text-xs rounded-full font-bold ${
                    activeTab === 'teams'
                      ? 'bg-white/20 text-white'
                      : 'bg-gray-200 text-slate-700'
                  }`}
                >
                  {teams.length}
                </span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {activeTab === 'members' && hasPermission('member:invite') && (
              <button
                onClick={handleOpenInviteModal}
                className="btn-primary text-xs flex items-center gap-1.5 px-3 py-1.5"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>Invite Member</span>
              </button>
            )}
            {activeTab === 'teams' && hasPermission('team:manage') && (
              <button
                onClick={handleOpenCreateTeam}
                className="btn-primary text-xs flex items-center gap-1.5 px-3 py-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Create Team</span>
              </button>
            )}
          </div>
        </div>

        {/* TAB 1: MEMBERS */}
        {activeTab === 'members' && (
          <div className="space-y-4">
            <FilterToolbar
              searchValue={searchTerm}
              onSearchChange={setSearchTerm}
              searchPlaceholder="Search by member name or email..."
              filters={[
                {
                  id: 'roleFilter',
                  label: 'Role',
                  value: roleFilter,
                  onChange: setRoleFilter,
                  options: [
                    { value: '', label: 'All Roles' },
                    { value: 'OrgAdmin', label: 'Owner' },
                    { value: 'OrgMember', label: 'Member' },
                  ],
                },
                {
                  id: 'teamFilter',
                  label: 'Team',
                  value: teamFilter,
                  onChange: setTeamFilter,
                  options: [
                    { value: '', label: 'All Teams' },
                    ...teams.map((t) => ({
                      value: t._id,
                      label: `${t.name} (${t.memberIds?.length || 0})`,
                    })),
                  ],
                },
                {
                  id: 'projectFilter',
                  label: 'Project',
                  value: projectFilter,
                  onChange: setProjectFilter,
                  options: [
                    { value: '', label: 'All Projects' },
                    ...projects
                      .filter((p) => projectsWithMembers[p._id]?.size > 0)
                      .map((p) => ({
                        value: p._id,
                        label: `${p.name} (${projectsWithMembers[p._id]?.size || 0})`,
                      })),
                  ],
                },
                {
                  id: 'workloadFilter',
                  label: 'Workload',
                  value: workloadFilter,
                  onChange: setWorkloadFilter,
                  options: [
                    { value: '', label: 'All Workloads' },
                    { value: 'idle', label: 'Idle' },
                    { value: 'light', label: 'Light' },
                    { value: 'moderate', label: 'Moderate' },
                    { value: 'heavy', label: 'Heavy' },
                    { value: 'overloaded', label: 'Overloaded' },
                  ],
                },
              ]}
              actions={
                <div className="flex items-center bg-white border border-gray-200 rounded-lg p-1">
                  <button
                    type="button"
                    onClick={() => setViewMode('grid')}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${viewMode === 'grid' ? 'bg-gray-200 text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}
                  >
                    Grid
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode('list')}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${viewMode === 'list' ? 'bg-gray-200 text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}
                  >
                    List
                  </button>
                </div>
              }
            />

            {loading ? (
              <div className="flex justify-center py-16">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="card text-center py-12">
                <Users className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                <div className="text-slate-500 text-sm">
                  {users.length === 0 ? 'No team members yet.' : 'No members match your filters.'}
                </div>
              </div>
            ) : viewMode === 'grid' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {filteredUsers.map((u) => {
                  const wl = getWorkloadStatus(u);
                  const completion = getCompletionRate(u);
                  const active = (u.pendingTasks || 0) + (u.inProgressTasks || 0);
                  const userProjects = getUserProjects(u._id);
                  const uTeams = getUserTeams(u._id);
                  const uLeadTeams = getUserLeadTeams(u._id);

                  return (
                    <div key={u._id} className="card group hover:border-primary/40 transition-all flex flex-col justify-between">
                      <div>
                        {/* Header */}
                        <div className="flex items-start gap-3 mb-3">
                          {u.profileImageUrl ? (
                            <img
                              className="h-12 w-12 rounded-full ring-2 ring-gray-200 object-cover"
                              src={u.profileImageUrl}
                              alt={u.name}
                            />
                          ) : (
                            <div className="h-12 w-12 rounded-full bg-gray-200 flex items-center justify-center ring-2 ring-gray-200">
                              <span className="text-lg font-bold text-slate-500">
                                {u.name?.charAt(0).toUpperCase() || '?'}
                              </span>
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-semibold text-slate-700 truncate">{u.name}</div>
                            <div className="text-xs text-slate-500 truncate">{u.email}</div>
                            <div className="flex flex-wrap items-center gap-1.5 mt-1">
                              <span
                                className={`inline-flex px-1.5 py-0.5 text-[10px] font-semibold rounded-full border ${
                                  (u.role as string) === 'OrgAdmin' || (u.role as string) === 'Owner'
                                    ? 'bg-violet-500/15 text-violet-400 border-violet-500/30'
                                    : 'bg-sky-500/15 text-sky-400 border-sky-500/30'
                                }`}
                              >
                                {(u.role as string) === 'OrgAdmin' || (u.role as string) === 'Owner'
                                  ? 'Owner'
                                  : (u.role as string) === 'OrgMember'
                                    ? 'Member'
                                    : u.role}
                              </span>
                              <span
                                className={`inline-flex px-1.5 py-0.5 text-[10px] font-semibold rounded-full ${wl.bg} ${wl.color}`}
                              >
                                {wl.label}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Teams Badges */}
                        <div className="mb-3">
                          <div className="text-[10px] uppercase tracking-wider text-slate-500 mb-1 font-semibold flex items-center justify-between">
                            <span>Teams</span>
                            {hasPermission('team:manage') && (
                              <button
                                onClick={() => handleOpenUserTeamsModal(u)}
                                className="text-primary hover:underline text-[10px] lowercase font-normal"
                              >
                                edit
                              </button>
                            )}
                          </div>
                          {uTeams.length === 0 && uLeadTeams.length === 0 ? (
                            <div className="text-[11px] text-slate-400 italic">No assigned teams</div>
                          ) : (
                            <div className="flex flex-wrap gap-1.5">
                              {uLeadTeams.map((t) => (
                                <span
                                  key={`lead-${t._id}`}
                                  className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium rounded bg-amber-500/10 text-amber-500 border border-amber-500/30"
                                  title={`Team Lead of ${t.name}`}
                                >
                                  <Crown className="w-3 h-3 text-amber-500" />
                                  {t.name} (Lead)
                                </span>
                              ))}
                              {uTeams
                                .filter((t) => !uLeadTeams.some((lt) => lt._id === t._id))
                                .map((t) => (
                                  <span
                                    key={t._id}
                                    className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium rounded bg-slate-100 text-slate-700 border border-slate-200"
                                  >
                                    <UsersRound className="w-3 h-3 text-slate-500" />
                                    {t.name}
                                  </span>
                                ))}
                            </div>
                          )}
                        </div>

                        {/* Projects */}
                        {userProjects.length > 0 && (
                          <div className="mb-3">
                            <div className="text-[10px] uppercase tracking-wider text-slate-500 mb-1 font-semibold">
                              Projects
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                              {userProjects.slice(0, 3).map((p) => (
                                <Link
                                  key={p._id}
                                  to={`/tasks?projectId=${p._id}`}
                                  className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium rounded bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 transition-colors"
                                >
                                  <Folder className="w-3 h-3" />
                                  {p.name}
                                </Link>
                              ))}
                              {userProjects.length > 3 && (
                                <span className="text-[10px] text-slate-500">
                                  +{userProjects.length - 3} more
                                </span>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Workload Bar */}
                        <div className="mb-3">
                          <div className="flex items-center justify-between text-[10px] mb-1">
                            <span className="text-slate-500">Workload</span>
                            <span className={`font-bold tabular-nums ${wl.color}`}>{active} active</span>
                          </div>
                          <div className="h-1.5 rounded-full bg-gray-200 overflow-hidden">
                            <div
                              className={`h-full rounded-full ${wl.bar} transition-all`}
                              style={{ width: `${Math.min(100, (active / 15) * 100)}%` }}
                            />
                          </div>
                        </div>

                        {/* Completion Rate */}
                        <div className="flex items-center justify-between text-[10px] mb-1">
                          <span className="text-slate-500">Completion rate</span>
                          <span className="font-bold text-slate-600 tabular-nums">{completion}%</span>
                        </div>
                        <div className="h-1 rounded-full bg-gray-200 overflow-hidden mb-3">
                          <div
                            className="h-full rounded-full bg-emerald-500 transition-all"
                            style={{ width: `${completion}%` }}
                          />
                        </div>
                      </div>

                      {/* Footer */}
                      <div className="flex items-center justify-between pt-3 border-t border-gray-200/50">
                        <span className="text-[10px] text-slate-500">
                          Joined{' '}
                          {new Date(u.createdAt || '').toLocaleDateString('en-US', {
                            month: 'short',
                            year: 'numeric',
                          })}
                        </span>
                        <div className="flex items-center gap-2">
                          {hasPermission('team:manage') && (
                            <button
                              onClick={() => handleOpenUserTeamsModal(u)}
                              className="text-[11px] text-primary hover:underline font-medium"
                            >
                              Manage Teams
                            </button>
                          )}
                          {hasPermission('member:manage') &&
                            (u.role as string) !== 'OrgAdmin' &&
                            (u.role as string) !== 'Owner' && (
                              <button
                                onClick={() => handleDeleteUser(u._id)}
                                className="text-[11px] text-rose-500 hover:text-rose-600 font-medium"
                              >
                                Remove
                              </button>
                            )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              (() => {
                const userColumns: Column<UserWithTaskCounts>[] = [
                  {
                    key: 'name',
                    header: 'Member',
                    sortable: true,
                    render: (u) => (
                      <div className="flex items-center gap-3">
                        {u.profileImageUrl ? (
                          <img
                            className="h-8 w-8 rounded-full ring-2 ring-gray-200 object-cover"
                            src={u.profileImageUrl}
                            alt={u.name}
                          />
                        ) : (
                          <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center ring-2 ring-gray-200">
                            <span className="text-xs font-bold text-slate-500">
                              {u.name?.charAt(0).toUpperCase() || '?'}
                            </span>
                          </div>
                        )}
                        <div>
                          <div className="text-sm font-medium text-slate-700">{u.name}</div>
                          <div className="text-xs text-slate-500">{u.email}</div>
                        </div>
                      </div>
                    ),
                  },
                  {
                    key: 'teams',
                    header: 'Teams',
                    render: (u) => {
                      const uTeams = getUserTeams(u._id);
                      if (uTeams.length === 0)
                        return <span className="text-xs text-slate-400 italic">—</span>;
                      return (
                        <div className="flex flex-wrap gap-1">
                          {uTeams.slice(0, 2).map((t) => (
                            <span
                              key={t._id}
                              className="inline-flex px-1.5 py-0.5 text-[10px] font-medium rounded bg-slate-100 text-slate-700 border border-slate-200"
                            >
                              {t.name}
                            </span>
                          ))}
                          {uTeams.length > 2 && (
                            <span className="text-[10px] text-slate-500">
                              +{uTeams.length - 2}
                            </span>
                          )}
                        </div>
                      );
                    },
                  },
                  {
                    key: 'projects',
                    header: 'Projects',
                    render: (u) => {
                      const userProjects = getUserProjects(u._id);
                      return (
                        <div className="flex flex-wrap gap-1">
                          {userProjects.slice(0, 2).map((p) => (
                            <Link
                              key={p._id}
                              to={`/tasks?projectId=${p._id}`}
                              className="inline-flex px-1.5 py-0.5 text-[10px] font-medium rounded bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 transition-colors"
                            >
                              {p.name}
                            </Link>
                          ))}
                          {userProjects.length > 2 && (
                            <span className="text-[10px] text-slate-500">
                              +{userProjects.length - 2}
                            </span>
                          )}
                        </div>
                      );
                    },
                  },
                  {
                    key: 'workload',
                    header: 'Workload',
                    sortable: true,
                    render: (u) => {
                      const wl = getWorkloadStatus(u);
                      const active = (u.pendingTasks || 0) + (u.inProgressTasks || 0);
                      return (
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-1.5 rounded-full bg-gray-200 overflow-hidden">
                            <div
                              className={`h-full rounded-full ${wl.bar}`}
                              style={{ width: `${Math.min(100, (active / 15) * 100)}%` }}
                            />
                          </div>
                          <span className={`text-[10px] font-semibold ${wl.color}`}>
                            {wl.label}
                          </span>
                        </div>
                      );
                    },
                  },
                  {
                    key: 'tasks',
                    header: 'Tasks',
                    render: (u) => {
                      const total = getTotalTasks(u);
                      return (
                        <div className="flex items-center gap-3 text-xs">
                          <span className="text-yellow-400">{u.pendingTasks || 0}</span>
                          <span className="text-blue-400">{u.inProgressTasks || 0}</span>
                          <span className="text-emerald-400">{u.completedTasks || 0}</span>
                          <span className="text-slate-500">/ {total}</span>
                        </div>
                      );
                    },
                  },
                  {
                    key: 'actions',
                    header: 'Actions',
                    className: 'w-[50px]',
                    render: (u) => {
                      const items: ActionItem[] = [];
                      if (hasPermission('team:manage')) {
                        items.push({
                          label: 'Manage Teams',
                          onClick: () => handleOpenUserTeamsModal(u),
                        });
                      }
                      if (
                        hasPermission('member:manage') &&
                        (u.role as string) !== 'OrgAdmin' &&
                        (u.role as string) !== 'Owner'
                      ) {
                        items.push({
                          label: 'Remove',
                          onClick: () => handleDeleteUser(u._id),
                          className: 'text-rose-500',
                        });
                      }
                      if (items.length === 0) return null;
                      return <RowActions items={items} />;
                    },
                  },
                ];
                return (
                  <AdvancedTable
                    data={filteredUsers}
                    columns={userColumns}
                    emptyMessage={
                      users.length === 0
                        ? 'No team members yet.'
                        : 'No members match your filters.'
                    }
                    emptyIcon={<Users className="w-12 h-12 text-slate-600 mx-auto mb-3" />}
                  />
                );
              })()
            )}
          </div>
        )}

        {/* TAB 2: TEAMS */}
        {activeTab === 'teams' && (
          <div className="space-y-4">
            <FilterToolbar
              searchValue={teamSearchTerm}
              onSearchChange={setTeamSearchTerm}
              searchPlaceholder="Search teams by name, description, or lead..."
              filters={[]}
              actions={
                <div className="flex items-center bg-white border border-gray-200 rounded-lg p-1">
                  <button
                    type="button"
                    onClick={() => setTeamViewMode('grid')}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${teamViewMode === 'grid' ? 'bg-gray-200 text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}
                  >
                    Grid
                  </button>
                  <button
                    type="button"
                    onClick={() => setTeamViewMode('list')}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${teamViewMode === 'list' ? 'bg-gray-200 text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}
                  >
                    List
                  </button>
                </div>
              }
            />

            {loading ? (
              <div className="flex justify-center py-16">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
              </div>
            ) : filteredTeams.length === 0 ? (
              <div className="card text-center py-12">
                <UsersRound className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                <div className="text-slate-500 text-sm">
                  {teams.length === 0 ? 'No teams created yet.' : 'No teams match your search.'}
                </div>
                {hasPermission('team:manage') && teams.length === 0 && (
                  <button
                    onClick={handleOpenCreateTeam}
                    className="btn-primary text-xs mt-4 inline-flex items-center gap-1.5"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Create First Team</span>
                  </button>
                )}
              </div>
            ) : teamViewMode === 'grid' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {filteredTeams.map((t) => {
                  const leadName = typeof t.leadId === 'object' ? t.leadId?.name : 'Unassigned';
                  const leadAvatar = typeof t.leadId === 'object' ? t.leadId?.profileImageUrl : undefined;
                  const parentName = typeof t.parentTeamId === 'object' ? t.parentTeamId?.name : undefined;
                  const memberCount = t.memberIds?.length || 0;

                  return (
                    <div
                      key={t._id}
                      className="card group hover:border-primary/40 transition-all flex flex-col justify-between"
                    >
                      <div>
                        {/* Title & Parent Badge */}
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="flex items-center gap-2">
                            <div className="p-2 rounded-lg bg-primary/10 text-primary">
                              <UsersRound className="w-5 h-5" />
                            </div>
                            <div>
                              <h3 className="font-semibold text-slate-800 text-base">{t.name}</h3>
                              {parentName && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                                  Parent: {parentName}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Description */}
                        {t.description ? (
                          <p className="text-xs text-slate-500 mb-4 line-clamp-2">{t.description}</p>
                        ) : (
                          <p className="text-xs text-slate-400 italic mb-4">No description provided</p>
                        )}

                        {/* Lead Info */}
                        <div className="mb-3 p-2.5 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-between">
                          <div className="text-[11px] text-slate-500 font-medium flex items-center gap-1">
                            <Crown className="w-3.5 h-3.5 text-amber-500" />
                            <span>Team Lead:</span>
                          </div>
                          <div className="flex items-center gap-2">
                            {leadAvatar ? (
                              <img className="w-5 h-5 rounded-full object-cover" src={leadAvatar} alt="" />
                            ) : (
                              <div className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-600 flex items-center justify-center font-bold text-[10px]">
                                {leadName?.charAt(0) || '?'}
                              </div>
                            )}
                            <span className="text-xs font-semibold text-slate-700">{leadName}</span>
                          </div>
                        </div>

                        {/* Members Stack */}
                        <div className="mb-4">
                          <div className="text-[10px] uppercase text-slate-500 font-semibold mb-1.5 flex items-center justify-between">
                            <span>Members</span>
                            <span className="text-xs font-bold text-slate-700">{memberCount}</span>
                          </div>
                          <div className="flex items-center -space-x-1.5 overflow-hidden py-1">
                            {(t.memberIds || []).slice(0, 5).map((m, idx) => {
                              const mName = typeof m === 'object' ? m.name : 'Member';
                              const mAvatar = typeof m === 'object' ? m.profileImageUrl : undefined;
                              return mAvatar ? (
                                <img
                                  key={idx}
                                  className="inline-block h-7 w-7 rounded-full ring-2 ring-white object-cover"
                                  src={mAvatar}
                                  title={mName}
                                  alt={mName}
                                />
                              ) : (
                                <div
                                  key={idx}
                                  className="inline-block h-7 w-7 rounded-full bg-slate-200 ring-2 ring-white flex items-center justify-center text-[10px] font-bold text-slate-600"
                                  title={mName}
                                >
                                  {mName.charAt(0)}
                                </div>
                              );
                            })}
                            {memberCount > 5 && (
                              <div className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-gray-100 ring-2 ring-white text-[10px] font-bold text-slate-500">
                                +{memberCount - 5}
                              </div>
                            )}
                            {memberCount === 0 && (
                              <span className="text-xs text-slate-400 italic">No members assigned</span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Card Footer Actions */}
                      <div className="pt-3 border-t border-gray-200/60 flex items-center justify-between">
                        <button
                          onClick={() => handleOpenTeamDashboard(t)}
                          className="btn-ghost text-xs py-1 px-2 flex items-center gap-1.5 text-primary hover:bg-primary/10"
                        >
                          <BarChart2 className="w-3.5 h-3.5" />
                          <span>Dashboard</span>
                        </button>
                        <div className="flex items-center gap-1">
                          {hasPermission('team:manage') && (
                            <>
                              <button
                                onClick={() => handleOpenEditTeam(t)}
                                className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-gray-100 rounded-md transition-colors"
                                title="Edit Team"
                              >
                                <Pencil className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteTeam(t._id, t.name)}
                                className="p-1.5 text-rose-500 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors"
                                title="Delete Team"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              (() => {
                const teamColumns: Column<Team>[] = [
                  {
                    key: 'name',
                    header: 'Team Name',
                    sortable: true,
                    render: (t) => (
                      <div>
                        <div className="flex items-center gap-2 text-slate-800 font-semibold">
                          <UsersRound className="w-4 h-4 text-primary" />
                          {t.name}
                        </div>
                        {t.description && (
                          <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">{t.description}</p>
                        )}
                      </div>
                    ),
                  },
                  {
                    key: 'parent',
                    header: 'Parent Team',
                    render: (t) => {
                      const pName = typeof t.parentTeamId === 'object' ? t.parentTeamId?.name : null;
                      return pName ? (
                        <span className="text-xs font-medium text-slate-600">{pName}</span>
                      ) : (
                        <span className="text-xs text-slate-400 italic">—</span>
                      );
                    },
                  },
                  {
                    key: 'lead',
                    header: 'Team Lead',
                    render: (t) => {
                      const lName = typeof t.leadId === 'object' ? t.leadId?.name : null;
                      return lName ? (
                        <span className="text-xs font-medium text-slate-700 flex items-center gap-1">
                          <Crown className="w-3 h-3 text-amber-500" />
                          {lName}
                        </span>
                      ) : (
                        <span className="text-xs text-slate-400 italic">Unassigned</span>
                      );
                    },
                  },
                  {
                    key: 'members',
                    header: 'Members',
                    render: (t) => (
                      <span className="text-sm font-semibold text-slate-700">
                        {t.memberIds?.length || 0}
                      </span>
                    ),
                  },
                  {
                    key: 'actions',
                    header: 'Actions',
                    className: 'w-[80px]',
                    render: (t) => {
                      const items: ActionItem[] = [
                        { label: 'Dashboard', onClick: () => handleOpenTeamDashboard(t) },
                      ];
                      if (hasPermission('team:manage')) {
                        items.push({ label: 'Edit Team', onClick: () => handleOpenEditTeam(t) });
                        items.push({
                          label: 'Delete Team',
                          onClick: () => handleDeleteTeam(t._id, t.name),
                          className: 'text-rose-500',
                        });
                      }
                      return <RowActions items={items} />;
                    },
                  },
                ];
                return (
                  <AdvancedTable
                    data={filteredTeams}
                    columns={teamColumns}
                    emptyMessage="No teams match your search."
                    emptyIcon={<UsersRound className="w-12 h-12 text-slate-600 mx-auto mb-3" />}
                  />
                );
              })()
            )}
          </div>
        )}
      </div>

      {/* ---------------------------------------------------- */}
      {/* MODAL 1: Manage User Teams Modal                      */}
      {/* ---------------------------------------------------- */}
      <Modal
        isOpen={userTeamsModal.isOpen}
        onClose={() => setUserTeamsModal((prev) => ({ ...prev, isOpen: false }))}
        title={`Manage Teams for ${userTeamsModal.targetUser?.name || 'Member'}`}
        subtitle="Assign or remove this member from organization teams"
        maxWidth="sm:max-w-md"
        footer={
          <>
            <button
              onClick={() => setUserTeamsModal((prev) => ({ ...prev, isOpen: false }))}
              className="btn-secondary text-xs"
            >
              Cancel
            </button>
            <button
              onClick={handleSaveUserTeams}
              disabled={userTeamsModal.saving}
              className="btn-primary text-xs disabled:opacity-50"
            >
              {userTeamsModal.saving ? 'Saving...' : 'Save Teams'}
            </button>
          </>
        }
      >
        <div className="space-y-3">
          {userTeamsModal.error && (
            <div className="alert-error text-xs">{userTeamsModal.error}</div>
          )}
          <p className="text-xs text-slate-500">
            Select the teams this member should belong to:
          </p>
          {teams.length === 0 ? (
            <div className="p-4 text-center text-xs text-slate-500 italic bg-gray-50 rounded-lg">
              No teams created yet. Create a team first under the Teams tab.
            </div>
          ) : (
            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {teams.map((t) => {
                const isSelected = userTeamsModal.selectedTeamIds.includes(t._id);
                const isLead =
                  (typeof t.leadId === 'object' ? t.leadId?._id : t.leadId) ===
                  userTeamsModal.targetUser?._id;

                return (
                  <label
                    key={t._id}
                    className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors ${
                      isSelected
                        ? 'border-primary/40 bg-primary/5'
                        : 'border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={(e) => {
                          const checked = e.target.checked;
                          setUserTeamsModal((prev) => ({
                            ...prev,
                            selectedTeamIds: checked
                              ? [...prev.selectedTeamIds, t._id]
                              : prev.selectedTeamIds.filter((id) => id !== t._id),
                          }));
                        }}
                        className="rounded border-gray-300 text-primary focus:ring-primary h-4 w-4"
                      />
                      <div>
                        <div className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                          {t.name}
                          {isLead && (
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-600 font-bold border border-amber-500/20">
                              Lead
                            </span>
                          )}
                        </div>
                        {t.description && (
                          <div className="text-[10px] text-slate-500 line-clamp-1">
                            {t.description}
                          </div>
                        )}
                      </div>
                    </div>
                    <span className="text-[10px] text-slate-400">
                      {t.memberIds?.length || 0} members
                    </span>
                  </label>
                );
              })}
            </div>
          )}
        </div>
      </Modal>

      {/* ---------------------------------------------------- */}
      {/* MODAL 2: Create / Edit Team Modal                    */}
      {/* ---------------------------------------------------- */}
      <Modal
        isOpen={teamFormModal.isOpen}
        onClose={() => setTeamFormModal((prev) => ({ ...prev, isOpen: false }))}
        title={teamFormModal.mode === 'create' ? 'Create Team' : 'Edit Team'}
        subtitle={
          teamFormModal.mode === 'create'
            ? 'Set up a new team with members, lead, and parent structure'
            : 'Update team details, lead, and member assignments'
        }
        footer={
          <>
            <button
              onClick={() => setTeamFormModal((prev) => ({ ...prev, isOpen: false }))}
              className="btn-secondary text-xs"
            >
              Cancel
            </button>
            <button
              onClick={handleSaveTeam}
              disabled={teamFormModal.saving}
              className="btn-primary text-xs disabled:opacity-50"
            >
              {teamFormModal.saving
                ? 'Saving...'
                : teamFormModal.mode === 'create'
                  ? 'Create Team'
                  : 'Update Team'}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          {teamFormModal.error && (
            <div className="alert-error text-xs">{teamFormModal.error}</div>
          )}
          <div className="grid md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">
                Team Name *
              </label>
              <input
                type="text"
                value={teamFormModal.name}
                onChange={(e) =>
                  setTeamFormModal((prev) => ({ ...prev, name: e.target.value }))
                }
                placeholder="e.g. Frontend Engineering"
                className="input-field w-full text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">
                Parent Team (Optional)
              </label>
              <select
                value={teamFormModal.parentTeamId}
                onChange={(e) =>
                  setTeamFormModal((prev) => ({ ...prev, parentTeamId: e.target.value }))
                }
                className="input-field w-full text-xs"
              >
                <option value="">No Parent Team</option>
                {teams
                  .filter((t) => t._id !== teamFormModal.teamId)
                  .map((t) => (
                    <option key={t._id} value={t._id}>
                      {t.name}
                    </option>
                  ))}
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">
                Description
              </label>
              <input
                type="text"
                value={teamFormModal.description}
                onChange={(e) =>
                  setTeamFormModal((prev) => ({ ...prev, description: e.target.value }))
                }
                placeholder="Brief summary of team responsibility"
                className="input-field w-full text-xs"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">
                Team Lead
              </label>
              <select
                value={teamFormModal.leadId}
                onChange={(e) =>
                  setTeamFormModal((prev) => ({ ...prev, leadId: e.target.value }))
                }
                className="input-field w-full text-xs"
              >
                <option value="">Select Team Lead (Optional)</option>
                {users.map((u) => (
                  <option key={u._id} value={u._id}>
                    {u.name} ({u.email})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase mb-1.5 flex items-center justify-between">
              <span>Select Team Members ({teamFormModal.memberIds.length} selected)</span>
              <button
                type="button"
                onClick={() => {
                  const allIds = users.map((u) => u._id);
                  const isAllSelected = teamFormModal.memberIds.length === users.length;
                  setTeamFormModal((prev) => ({
                    ...prev,
                    memberIds: isAllSelected ? [] : allIds,
                  }));
                }}
                className="text-primary hover:underline text-[10px] font-normal lowercase"
              >
                {teamFormModal.memberIds.length === users.length
                  ? 'deselect all'
                  : 'select all'}
              </button>
            </label>
            <div className="border border-gray-200 rounded-lg p-2 max-h-48 overflow-y-auto space-y-1 bg-gray-50/50">
              {users.map((u) => {
                const isSelected = teamFormModal.memberIds.includes(u._id);
                return (
                  <label
                    key={u._id}
                    className="flex items-center justify-between p-2 rounded hover:bg-white transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={(e) => {
                          const checked = e.target.checked;
                          setTeamFormModal((prev) => ({
                            ...prev,
                            memberIds: checked
                              ? [...prev.memberIds, u._id]
                              : prev.memberIds.filter((id) => id !== u._id),
                          }));
                        }}
                        className="rounded border-gray-300 text-primary focus:ring-primary h-4 w-4"
                      />
                      <div className="text-xs font-medium text-slate-700">{u.name}</div>
                    </div>
                    <span className="text-[10px] text-slate-400">{u.email}</span>
                  </label>
                );
              })}
            </div>
          </div>
        </div>
      </Modal>



      {/* Invite Member Modal */}
      {inviteModal.isOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
            <div
              className="fixed inset-0 bg-gray-100/80 transition-opacity"
              onClick={handleCloseInviteModal}
            />
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

                    {inviteModal.inviteToken ? (
                      <div className="mt-4 p-4 bg-gray-100 rounded-lg border border-gray-200">
                        <div className="text-sm font-medium text-slate-600 mb-2">
                          Invite Link Generated!
                        </div>
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            readOnly
                            value={`${window.location.origin}/signup?invite=${inviteModal.inviteToken}`}
                            className="input-field flex-1 text-xs"
                          />
                          <button
                            type="button"
                            onClick={copyInviteLink}
                            className={`px-3 py-2 transition-colors ${inviteModal.copied ? 'bg-emerald-500 text-white' : 'btn-primary'}`}
                          >
                            {inviteModal.copied ? (
                              <Check className="w-4 h-4" />
                            ) : (
                              <ClipboardCopy className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                        <div className="mt-3 text-xs text-slate-500">
                          Share this link with the person you want to invite. The link expires in 7
                          days.
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
                              value={inviteModal.email}
                              onChange={(e) => {
                                const email = e.target.value;
                                setInviteModal((prev) => ({ ...prev, email }));
                                if (email.includes('@')) {
                                  lookupUser(email);
                                }
                              }}
                              className="input-field block w-full px-3 py-2 text-sm"
                              placeholder="member@example.com"
                            />
                            {inviteModal.userLookup.loading && (
                              <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                                <div className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full"></div>
                              </div>
                            )}
                          </div>
                          {inviteModal.userLookup.found === true && inviteModal.userLookup.user && (
                            <div className="mt-2 p-2 bg-emerald-500/10 border border-emerald-500/30 rounded-lg flex items-center gap-3">
                              {inviteModal.userLookup.user.profileImageUrl ? (
                                <img
                                  className="h-8 w-8 rounded-full"
                                  src={inviteModal.userLookup.user.profileImageUrl}
                                  alt=""
                                />
                              ) : (
                                <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center">
                                  <span className="text-xs font-bold text-slate-500">
                                    {inviteModal.userLookup.user.name?.charAt(0)?.toUpperCase() ||
                                      '?'}
                                  </span>
                                </div>
                              )}
                              <div className="flex-1 min-w-0">
                                <div className="text-sm font-medium text-emerald-400">
                                  {inviteModal.userLookup.user.name}
                                </div>
                                <div className="text-xs text-slate-500">
                                  User found - can be added directly
                                </div>
                              </div>
                              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                            </div>
                          )}
                          {inviteModal.userLookup.found === false && (
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
                            value={inviteModal.role}
                            onChange={(e) =>
                              setInviteModal((prev) => ({
                                ...prev,
                                role: e.target.value as 'OrgMember' | 'OrgAdmin',
                              }))
                            }
                            className="input-field block w-full px-3 py-2 text-sm"
                          >
                            <option value="OrgMember">Member</option>
                            <option value="OrgAdmin">Owner</option>
                          </select>
                        </div>
                      </div>
                    )}

                    {inviteModal.error && (
                      <div className="mt-3 text-sm text-rose-400">{inviteModal.error}</div>
                    )}
                  </div>
                </div>
              </div>
              <div className="bg-white/50 px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6 gap-2">
                {inviteModal.inviteToken ? (
                  <button
                    type="button"
                    onClick={handleCloseInviteModal}
                    className="btn-primary w-full sm:w-auto"
                  >
                    Done
                  </button>
                ) : (
                  <>
                    {inviteModal.mode === 'add' && inviteModal.userLookup.user ? (
                      <button
                        type="button"
                        onClick={handleAddMember}
                        disabled={inviteModal.loading || !hasPermission('member:invite')}
                        className="btn-primary w-full sm:w-auto disabled:opacity-50"
                      >
                        {inviteModal.loading
                          ? 'Adding...'
                          : `Add ${inviteModal.userLookup.user.name}`}
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={handleInviteMember}
                        disabled={
                          inviteModal.loading || !inviteModal.email || !hasPermission('member:invite')
                        }
                        className="btn-primary w-full sm:w-auto disabled:opacity-50"
                      >
                        {inviteModal.loading ? 'Generating...' : 'Generate Invite Link'}
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={handleCloseInviteModal}
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
      )}
    </PageShell>
  );
}

export default ManageUsers;
