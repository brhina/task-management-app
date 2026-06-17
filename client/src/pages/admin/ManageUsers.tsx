import { useState, useEffect, useContext, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { UserContext } from '../../context/UserContext';
import api from '../../utils/axios';
import { apiPaths } from '../../utils/apiPaths';
import PageShell from '../../components/common/PageShell';
import FilterToolbar from '../../components/common/FilterToolbar';
import type { User, Task, Project } from '../../types';

interface UserWithTaskCounts extends User {
    pendingTasks: number;
    inProgressTasks: number;
    completedTasks: number;
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
    const { user } = useContext(UserContext);
    const [users, setUsers] = useState<UserWithTaskCounts[]>([]);
    const [tasks, setTasks] = useState<Task[]>([]);
    const [projects, setProjects] = useState<Project[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [roleFilter, setRoleFilter] = useState('');
    const [workloadFilter, setWorkloadFilter] = useState('');
    const [projectFilter, setProjectFilter] = useState('');
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
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

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [usersRes, tasksRes, projectsRes] = await Promise.all([
                api.get(apiPaths.USERS.GET_ALL_USERS),
                api.get(apiPaths.TASKS.GET_ALL_TASKS),
                api.get(apiPaths.PROJECTS.LIST),
            ]);
            setUsers(usersRes.data);
            setTasks(tasksRes.data?.data?.tasks || []);
            setProjects(projectsRes.data?.data || []);
        } catch (err) {
            setError('Failed to load data');
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteUser = async (userId: string) => {
        if (!window.confirm('Are you sure you want to delete this user? This action cannot be undone.')) return;
        try {
            await api.delete(apiPaths.USERS.DELETE_USER.replace(':id', userId));
            fetchData();
        } catch (err) {
            setError('Failed to delete user');
        }
    };

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
        setInviteModal(prev => ({ ...prev, isOpen: false }));
    };

    const handleInviteMember = async () => {
        if (!user?.activeOrgId) {
            setInviteModal(prev => ({ ...prev, error: 'No organization selected' }));
            return;
        }

        setInviteModal(prev => ({ ...prev, loading: true, error: '' }));

        try {
            const response = await api.post(
                apiPaths.ORG_MEMBERSHIP.INVITE.replace(':orgId', user.activeOrgId),
                { email: inviteModal.email, role: inviteModal.role }
            );
            const { inviteToken } = response.data;
            setInviteModal(prev => ({ ...prev, loading: false, inviteToken }));
        } catch (err: any) {
            const errorMessage = err.response?.data?.message || 'Failed to generate invite token';
            setInviteModal(prev => ({ ...prev, loading: false, error: errorMessage }));
        }
    };

    const lookupUser = async (email: string) => {
        if (!email || !email.includes('@')) {
            setInviteModal(prev => ({ 
                ...prev, 
                userLookup: { loading: false, found: null, user: null } 
            }));
            return;
        }

        setInviteModal(prev => ({ 
            ...prev, 
            userLookup: { ...prev.userLookup, loading: true } 
        }));

        try {
            const response = await api.get(apiPaths.ORGS.CHECK_USER.replace(':email', encodeURIComponent(email)));
            const { exists, user: foundUser } = response.data;
            setInviteModal(prev => ({ 
                ...prev, 
                userLookup: { loading: false, found: exists, user: foundUser },
                mode: exists ? 'add' : 'invite',
            }));
        } catch (err) {
            setInviteModal(prev => ({ 
                ...prev, 
                userLookup: { loading: false, found: null, user: null },
                mode: 'invite',
            }));
        }
    };

    const handleAddMember = async () => {
        if (!user?.activeOrgId || !inviteModal.userLookup.user) {
            setInviteModal(prev => ({ ...prev, error: 'No organization or user selected' }));
            return;
        }

        setInviteModal(prev => ({ ...prev, loading: true, error: '' }));

        try {
            await api.post(
                apiPaths.ORGS.ADD_MEMBER.replace(':orgId', user.activeOrgId),
                { email: inviteModal.email, role: inviteModal.role }
            );
            setInviteModal(prev => ({ ...prev, loading: false }));
            handleCloseInviteModal();
            fetchData();
        } catch (err: any) {
            const errorMessage = err.response?.data?.message || 'Failed to add member';
            setInviteModal(prev => ({ ...prev, loading: false, error: errorMessage }));
        }
    };

    const copyInviteLink = async () => {
        if (inviteModal.inviteToken) {
            const inviteLink = `${window.location.origin}/signup?invite=${inviteModal.inviteToken}`;
            try {
                await navigator.clipboard.writeText(inviteLink);
                setInviteModal(prev => ({ ...prev, copied: true }));
                setTimeout(() => {
                    setInviteModal(prev => ({ ...prev, copied: false }));
                }, 2000);
            } catch (err) {
                console.error('Failed to copy:', err);
            }
        }
    };

    const getTotalTasks = (u: UserWithTaskCounts) => (u.pendingTasks || 0) + (u.inProgressTasks || 0) + (u.completedTasks || 0);

    const getWorkloadStatus = (u: UserWithTaskCounts) => {
        const active = (u.pendingTasks || 0) + (u.inProgressTasks || 0);
        if (active === 0) return { label: 'Idle', color: 'text-slate-400', bg: 'bg-slate-500/15', bar: 'bg-slate-500' };
        if (active <= 3) return { label: 'Light', color: 'text-emerald-400', bg: 'bg-emerald-500/15', bar: 'bg-emerald-500' };
        if (active <= 7) return { label: 'Moderate', color: 'text-blue-400', bg: 'bg-blue-500/15', bar: 'bg-blue-500' };
        if (active <= 12) return { label: 'Heavy', color: 'text-amber-400', bg: 'bg-amber-500/15', bar: 'bg-amber-500' };
        return { label: 'Overloaded', color: 'text-rose-400', bg: 'bg-rose-500/15', bar: 'bg-rose-500' };
    };

    const getCompletionRate = (u: UserWithTaskCounts) => {
        const total = getTotalTasks(u);
        if (total === 0) return 0;
        return Math.round(((u.completedTasks || 0) / total) * 100);
    };

    const getUserProjects = (userId: string) => {
        const projectIds = new Set<string>();
        tasks.forEach(t => {
            const assigneeId = typeof t.assignedTo === 'string' ? t.assignedTo : t.assignedTo?._id;
            if (assigneeId === userId && t.projectId) {
                const pid = typeof t.projectId === 'string' ? t.projectId : t.projectId?._id;
                if (pid) projectIds.add(pid);
            }
        });
        return projects.filter(p => projectIds.has(p._id));
    };

    const getUserProjectTasks = (userId: string, projectId: string) => {
        return tasks.filter(t => {
            const assigneeId = typeof t.assignedTo === 'string' ? t.assignedTo : t.assignedTo?._id;
            const pid = typeof t.projectId === 'string' ? t.projectId : t.projectId?._id;
            return assigneeId === userId && pid === projectId;
        });
    };

    const filteredUsers = useMemo(() => {
        return users.filter(u => {
            const matchesSearch = !searchTerm ||
                u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                u.email.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesRole = !roleFilter || u.role === roleFilter;
            const wl = getWorkloadStatus(u);
            const matchesWorkload = !workloadFilter || wl.label.toLowerCase() === workloadFilter.toLowerCase();

            let matchesProject = true;
            if (projectFilter) {
                const userProjects = getUserProjects(u._id);
                matchesProject = userProjects.some(p => p._id === projectFilter);
            }

            return matchesSearch && matchesRole && matchesWorkload && matchesProject;
        });
    }, [users, searchTerm, roleFilter, workloadFilter, projectFilter, tasks, projects]);

    const projectsWithMembers = useMemo(() => {
        const map: Record<string, Set<string>> = {};
        tasks.forEach(t => {
            const assigneeId = typeof t.assignedTo === 'string' ? t.assignedTo : t.assignedTo?._id;
            const pid = typeof t.projectId === 'string' ? t.projectId : t.projectId?._id;
            if (assigneeId && pid) {
                if (!map[pid]) map[pid] = new Set();
                map[pid].add(assigneeId);
            }
        });
        return map;
    }, [tasks]);

    const teamStats = useMemo(() => {
        const total = filteredUsers.length;
        const admins = filteredUsers.filter(u => u.role === 'Admin').length;
        const members = filteredUsers.filter(u => u.role === 'Member').length;
        const totalTasks = filteredUsers.reduce((sum, u) => sum + getTotalTasks(u), 0);
        const totalCompleted = filteredUsers.reduce((sum, u) => sum + (u.completedTasks || 0), 0);
        const totalActive = filteredUsers.reduce((sum, u) => sum + (u.pendingTasks || 0) + (u.inProgressTasks || 0), 0);
        const avgCompletion = total > 0 ? Math.round(filteredUsers.reduce((sum, u) => sum + getCompletionRate(u), 0) / total) : 0;
        const overloaded = filteredUsers.filter(u => getTotalTasks(u) > 12).length;
        return { total, admins, members, totalTasks, totalCompleted, totalActive, avgCompletion, overloaded };
    }, [filteredUsers]);

    if (!user || user.role !== 'Admin') {
        return <PageShell title="Access Denied" subtitle="You don't have permission to access this page." />;
    }

    return (
        <PageShell
            title="Team Members"
            subtitle="Workload intelligence and member performance"
            actions={
                <div className="flex gap-2">
                    <button type="button" className="btn-secondary" onClick={fetchData}>Refresh</button>
                    <button type="button" className="btn-primary" onClick={handleOpenInviteModal}>
                        <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                        </svg>
                        Invite Member
                    </button>
                </div>
            }
        >
            <div className="space-y-4">
                {error && <div className="alert-error">{error}</div>}

                {/* Team KPIs */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="card text-center">
                        <div className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">Team Size</div>
                        <div className="mt-1 text-2xl font-bold text-slate-100 tabular-nums">{teamStats.total}</div>
                        <div className="text-[10px] text-slate-500 mt-0.5">{teamStats.admins} admins, {teamStats.members} members</div>
                    </div>
                    <div className="card text-center">
                        <div className="text-[10px] uppercase tracking-wider text-blue-400 font-semibold">Active Tasks</div>
                        <div className="mt-1 text-2xl font-bold text-slate-100 tabular-nums">{teamStats.totalActive}</div>
                        <div className="text-[10px] text-slate-500 mt-0.5">across all members</div>
                    </div>
                    <div className="card text-center">
                        <div className="text-[10px] uppercase tracking-wider text-emerald-400 font-semibold">Completed</div>
                        <div className="mt-1 text-2xl font-bold text-slate-100 tabular-nums">{teamStats.totalCompleted}</div>
                        <div className="text-[10px] text-slate-500 mt-0.5">{teamStats.avgCompletion}% avg rate</div>
                    </div>
                    <div className="card text-center">
                        <div className="text-[10px] uppercase tracking-wider text-rose-400 font-semibold">Overloaded</div>
                        <div className="mt-1 text-2xl font-bold text-slate-100 tabular-nums">{teamStats.overloaded}</div>
                        <div className="text-[10px] text-slate-500 mt-0.5">13+ tasks each</div>
                    </div>
                </div>

                {/* Filters */}
                <FilterToolbar
                    searchValue={searchTerm}
                    onSearchChange={setSearchTerm}
                    searchPlaceholder="Search by name or email..."
                    filters={[
                        {
                            id: 'roleFilter',
                            label: 'Role',
                            value: roleFilter,
                            onChange: setRoleFilter,
                            options: [
                                { value: '', label: 'All Roles' },
                                { value: 'Admin', label: 'Admin' },
                                { value: 'Member', label: 'Member' },
                            ],
                        },
                        {
                            id: 'projectFilter',
                            label: 'Project',
                            value: projectFilter,
                            onChange: setProjectFilter,
                            options: [
                                { value: '', label: 'All Projects' },
                                ...projects.filter(p => projectsWithMembers[p._id]?.size > 0).map(p => ({
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
                        <div className="flex items-center bg-slate-800 border border-slate-700 rounded-lg p-1">
                            <button
                                type="button"
                                onClick={() => setViewMode('grid')}
                                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${viewMode === 'grid' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-slate-200'}`}
                            >
                                Grid
                            </button>
                            <button
                                type="button"
                                onClick={() => setViewMode('list')}
                                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${viewMode === 'list' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-slate-200'}`}
                            >
                                List
                            </button>
                        </div>
                    }
                />

                {/* Users */}
                {loading ? (
                    <div className="flex justify-center py-16">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                    </div>
                ) : filteredUsers.length === 0 ? (
                    <div className="card text-center py-12">
                        <svg className="w-12 h-12 text-slate-600 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        <div className="text-slate-400 text-sm">
                            {users.length === 0 ? 'No team members yet.' : 'No members match your filters.'}
                        </div>
                    </div>
                ) : viewMode === 'grid' ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                        {filteredUsers.map(u => {
                            const total = getTotalTasks(u);
                            const wl = getWorkloadStatus(u);
                            const completion = getCompletionRate(u);
                            const active = (u.pendingTasks || 0) + (u.inProgressTasks || 0);
                            const userProjects = getUserProjects(u._id);

                            return (
                                <div key={u._id} className="card group hover:border-primary/40 transition-all">
                                    {/* Header */}
                                    <div className="flex items-start gap-3 mb-3">
                                        {u.profileImageUrl ? (
                                            <img className="h-12 w-12 rounded-full ring-2 ring-slate-700" src={u.profileImageUrl} alt={u.name} />
                                        ) : (
                                            <div className="h-12 w-12 rounded-full bg-slate-700 flex items-center justify-center ring-2 ring-slate-700">
                                                <span className="text-lg font-bold text-slate-400">{u.name?.charAt(0).toUpperCase() || '?'}</span>
                                            </div>
                                        )}
                                        <div className="flex-1 min-w-0">
                                            <div className="text-sm font-semibold text-slate-200 truncate">{u.name}</div>
                                            <div className="text-xs text-slate-500 truncate">{u.email}</div>
                                            <div className="flex items-center gap-2 mt-1">
                                                <span className={`inline-flex px-1.5 py-0.5 text-[10px] font-semibold rounded-full border ${
                                                    u.role === 'Admin'
                                                        ? 'bg-violet-500/15 text-violet-400 border-violet-500/30'
                                                        : 'bg-sky-500/15 text-sky-400 border-sky-500/30'
                                                }`}>
                                                    {u.role}
                                                </span>
                                                <span className={`inline-flex px-1.5 py-0.5 text-[10px] font-semibold rounded-full ${wl.bg} ${wl.color}`}>
                                                    {wl.label}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Projects */}
                                    {userProjects.length > 0 && (
                                        <div className="mb-3">
                                            <div className="text-[10px] uppercase tracking-wider text-slate-500 mb-1.5">Projects</div>
                                            <div className="flex flex-wrap gap-1.5">
                                                {userProjects.slice(0, 3).map(p => (
                                                    <Link
                                                        key={p._id}
                                                        to={`/admin/manage-tasks?projectId=${p._id}`}
                                                        className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium rounded bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 transition-colors"
                                                    >
                                                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7h6l2 2h10a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" />
                                                        </svg>
                                                        {p.name}
                                                    </Link>
                                                ))}
                                                {userProjects.length > 3 && (
                                                    <span className="text-[10px] text-slate-500">+{userProjects.length - 3} more</span>
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
                                        <div className="h-1.5 rounded-full bg-slate-700 overflow-hidden">
                                            <div className={`h-full rounded-full ${wl.bar} transition-all`} style={{ width: `${Math.min(100, (active / 15) * 100)}%` }} />
                                        </div>
                                    </div>

                                    {/* Task Stats */}
                                    <div className="grid grid-cols-3 gap-2 mb-3">
                                        <div className="text-center p-2 rounded-lg bg-slate-800/50">
                                            <div className="text-sm font-bold text-yellow-400 tabular-nums">{u.pendingTasks || 0}</div>
                                            <div className="text-[10px] text-slate-500">Pending</div>
                                        </div>
                                        <div className="text-center p-2 rounded-lg bg-slate-800/50">
                                            <div className="text-sm font-bold text-blue-400 tabular-nums">{u.inProgressTasks || 0}</div>
                                            <div className="text-[10px] text-slate-500">Active</div>
                                        </div>
                                        <div className="text-center p-2 rounded-lg bg-slate-800/50">
                                            <div className="text-sm font-bold text-emerald-400 tabular-nums">{u.completedTasks || 0}</div>
                                            <div className="text-[10px] text-slate-500">Done</div>
                                        </div>
                                    </div>

                                    {/* Completion Rate */}
                                    <div className="flex items-center justify-between text-[10px] mb-1">
                                        <span className="text-slate-500">Completion rate</span>
                                        <span className="font-bold text-slate-300 tabular-nums">{completion}%</span>
                                    </div>
                                    <div className="h-1 rounded-full bg-slate-700 overflow-hidden mb-3">
                                        <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${completion}%` }} />
                                    </div>

                                    {/* Footer */}
                                    <div className="flex items-center justify-between pt-3 border-t border-slate-700/50">
                                        <span className="text-[10px] text-slate-500">
                                            Joined {new Date(u.createdAt || '').toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                                        </span>
                                        {u.role !== 'Admin' && (
                                            <button
                                                onClick={() => handleDeleteUser(u._id)}
                                                className="text-[10px] text-rose-400 hover:text-rose-300 font-medium opacity-0 group-hover:opacity-100 transition-opacity"
                                            >
                                                Remove
                                            </button>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div className="card !p-0 overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-slate-700">
                                <thead className="bg-slate-900">
                                    <tr>
                                        <th className="px-4 py-3 text-left text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Member</th>
                                        <th className="px-4 py-3 text-left text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Projects</th>
                                        <th className="px-4 py-3 text-left text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Workload</th>
                                        <th className="px-4 py-3 text-left text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Tasks</th>
                                        <th className="px-4 py-3 text-left text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Completion</th>
                                        <th className="px-4 py-3 text-left text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-slate-800 divide-y divide-slate-700">
                                    {filteredUsers.map(u => {
                                        const total = getTotalTasks(u);
                                        const wl = getWorkloadStatus(u);
                                        const completion = getCompletionRate(u);
                                        const active = (u.pendingTasks || 0) + (u.inProgressTasks || 0);
                                        const userProjects = getUserProjects(u._id);

                                        return (
                                            <tr key={u._id} className="hover:bg-slate-700/30 transition-colors">
                                                <td className="px-4 py-3">
                                                    <div className="flex items-center gap-3">
                                                        {u.profileImageUrl ? (
                                                            <img className="h-8 w-8 rounded-full ring-2 ring-slate-700" src={u.profileImageUrl} alt={u.name} />
                                                        ) : (
                                                            <div className="h-8 w-8 rounded-full bg-slate-700 flex items-center justify-center ring-2 ring-slate-700">
                                                                <span className="text-xs font-bold text-slate-400">{u.name?.charAt(0).toUpperCase() || '?'}</span>
                                                            </div>
                                                        )}
                                                        <div>
                                                            <div className="text-sm font-medium text-slate-200">{u.name}</div>
                                                            <div className="text-xs text-slate-500">{u.email}</div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div className="flex flex-wrap gap-1">
                                                        {userProjects.slice(0, 2).map(p => (
                                                            <Link
                                                                key={p._id}
                                                                to={`/admin/manage-tasks?projectId=${p._id}`}
                                                                className="inline-flex px-1.5 py-0.5 text-[10px] font-medium rounded bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 transition-colors"
                                                            >
                                                                {p.name}
                                                            </Link>
                                                        ))}
                                                        {userProjects.length > 2 && (
                                                            <span className="text-[10px] text-slate-500">+{userProjects.length - 2}</span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-16 h-1.5 rounded-full bg-slate-700 overflow-hidden">
                                                            <div className={`h-full rounded-full ${wl.bar}`} style={{ width: `${Math.min(100, (active / 15) * 100)}%` }} />
                                                        </div>
                                                        <span className={`text-[10px] font-semibold ${wl.color}`}>{wl.label}</span>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div className="flex items-center gap-3 text-xs">
                                                        <span className="text-yellow-400">{u.pendingTasks || 0}</span>
                                                        <span className="text-blue-400">{u.inProgressTasks || 0}</span>
                                                        <span className="text-emerald-400">{u.completedTasks || 0}</span>
                                                        <span className="text-slate-500">/ {total}</span>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-12 h-1.5 rounded-full bg-slate-700 overflow-hidden">
                                                            <div className="h-full rounded-full bg-emerald-500" style={{ width: `${completion}%` }} />
                                                        </div>
                                                        <span className="text-xs font-bold text-slate-300 tabular-nums">{completion}%</span>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3">
                                                    {u.role !== 'Admin' && (
                                                        <button
                                                            onClick={() => handleDeleteUser(u._id)}
                                                            className="text-xs text-rose-400 hover:text-rose-300 font-medium"
                                                        >
                                                            Remove
                                                        </button>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>

            {/* Invite Member Modal */}
            {inviteModal.isOpen && (
                <div className="fixed inset-0 z-50 overflow-y-auto">
                    <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
                        <div className="fixed inset-0 bg-slate-900/80 transition-opacity" onClick={handleCloseInviteModal} />
                        <div className="relative transform overflow-hidden rounded-xl bg-slate-800 border border-slate-700 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg">
                            <div className="px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                                <div className="sm:flex sm:items-start">
                                    <div className="mx-auto flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 sm:mx-0 sm:h-10 sm:w-10">
                                        <svg className="h-6 w-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                                        </svg>
                                    </div>
                                    <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                                        <h3 className="text-lg font-semibold leading-6 text-white">Invite Team Member</h3>
                                        <div className="mt-2">
                                            <p className="text-sm text-slate-400">
                                                Generate an invite link to add a new member to your organization.
                                            </p>
                                        </div>

                                        {inviteModal.inviteToken ? (
                                            <div className="mt-4 p-4 bg-slate-900 rounded-lg border border-slate-700">
                                                <div className="text-sm font-medium text-slate-300 mb-2">Invite Link Generated!</div>
                                                <div className="flex items-center gap-2">
                                                    <input
                                                        type="text"
                                                        readOnly
                                                        value={`${window.location.origin}/signup?invite=${inviteModal.inviteToken}`}
                                                        className="input-dark flex-1 text-xs"
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={copyInviteLink}
                                                        className={`px-3 py-2 transition-colors ${inviteModal.copied ? 'bg-emerald-500 text-white' : 'btn-primary'}`}
                                                    >
                                                        {inviteModal.copied ? (
                                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                            </svg>
                                                        ) : (
                                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                                                            </svg>
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
                                                    <label htmlFor="inviteEmail" className="block text-xs font-medium text-slate-400 uppercase tracking-wide mb-1">
                                                        Email Address
                                                    </label>
                                                    <div className="relative">
                                                        <input
                                                            type="email"
                                                            id="inviteEmail"
                                                            value={inviteModal.email}
                                                            onChange={(e) => {
                                                                const email = e.target.value;
                                                                setInviteModal(prev => ({ ...prev, email }));
                                                                if (email.includes('@')) {
                                                                    lookupUser(email);
                                                                }
                                                            }}
                                                            className="input-dark block w-full px-3 py-2 text-sm"
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
                                                                <img className="h-8 w-8 rounded-full" src={inviteModal.userLookup.user.profileImageUrl} alt="" />
                                                            ) : (
                                                                <div className="h-8 w-8 rounded-full bg-slate-700 flex items-center justify-center">
                                                                    <span className="text-xs font-bold text-slate-400">
                                                                        {inviteModal.userLookup.user.name?.charAt(0)?.toUpperCase() || '?'}
                                                                    </span>
                                                                </div>
                                                            )}
                                                            <div className="flex-1 min-w-0">
                                                                <div className="text-sm font-medium text-emerald-400">{inviteModal.userLookup.user.name}</div>
                                                                <div className="text-xs text-slate-400">User found - can be added directly</div>
                                                            </div>
                                                            <svg className="w-5 h-5 text-emerald-400 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                                            </svg>
                                                        </div>
                                                    )}
                                                    {inviteModal.userLookup.found === false && (
                                                        <div className="mt-2 p-2 bg-yellow-500/10 border border-yellow-500/30 rounded-lg flex items-center gap-2">
                                                            <svg className="w-4 h-4 text-yellow-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                            </svg>
                                                            <span className="text-xs text-yellow-400">User not found - invite link will be generated</span>
                                                        </div>
                                                    )}
                                                </div>
                                                <div>
                                                    <label htmlFor="inviteRole" className="block text-xs font-medium text-slate-400 uppercase tracking-wide mb-1">
                                                        Role
                                                    </label>
                                                    <select
                                                        id="inviteRole"
                                                        value={inviteModal.role}
                                                        onChange={(e) => setInviteModal(prev => ({ ...prev, role: e.target.value as 'OrgMember' | 'OrgAdmin' }))}
                                                        className="input-dark block w-full px-3 py-2 text-sm"
                                                    >
                                                        <option value="OrgMember">Member</option>
                                                        <option value="OrgAdmin">Admin</option>
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
                            <div className="bg-slate-800/50 px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6 gap-2">
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
                                                disabled={inviteModal.loading}
                                                className="btn-primary w-full sm:w-auto disabled:opacity-50"
                                            >
                                                {inviteModal.loading ? 'Adding...' : `Add ${inviteModal.userLookup.user.name}`}
                                            </button>
                                        ) : (
                                            <button
                                                type="button"
                                                onClick={handleInviteMember}
                                                disabled={inviteModal.loading || !inviteModal.email}
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
