import React, { useState, useEffect, useContext } from 'react';
import { UserContext } from '../../context/UserContext';
import api from '../../utils/axios';
import { apiPaths } from '../../utils/apiPaths';
import PageShell from '../../components/common/PageShell';
import StatCard, { StatIcons } from '../../components/common/StatCard';
import FilterToolbar from '../../components/common/FilterToolbar';

function ManageUsers() {
    const { user } = useContext(UserContext);
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        try {
            setLoading(true);
            const response = await api.get(apiPaths.USERS.GET_ALL_USERS);
            setUsers(response.data);
        } catch (error) {
            console.error('Error fetching users:', error);
            setError('Failed to load users');
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteUser = async (userId) => {
        if (!window.confirm('Are you sure you want to delete this user? This action cannot be undone.')) return;

        try {
            await api.delete(apiPaths.USERS.DELETE_USER.replace(':id', userId));
            fetchUsers(); // Refresh the list
        } catch (error) {
            console.error('Error deleting user:', error);
            setError('Failed to delete user');
        }
    };

    const filteredUsers = users.filter(user => {
        const matchesSearch = user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            user.email.toLowerCase().includes(searchTerm.toLowerCase());
        return matchesSearch;
    });

    const getTotalTasks = (user) => {
        return (user.pendingTasks || 0) + (user.inProgressTasks || 0) + (user.completedTasks || 0);
    };

    if (!user || user.role !== 'Admin') {
        return (
            <PageShell title="Access Denied" subtitle="You don't have permission to access this page." />
        );
    }

    return (
        <PageShell
            title="Manage Users"
            subtitle="View and manage all users in the system"
        >

                {error && (
                    <div className="alert-error">{error}</div>
                )}

                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                    <StatCard label="Total Users" value={users.length} icon={StatIcons.users} accentColor="text-indigo-400" />
                    <StatCard label="Admins" value={users.filter(u => u.role === 'Admin').length} icon={StatIcons.admin} accentColor="text-violet-400" />
                    <StatCard label="Members" value={users.filter(u => u.role === 'Member').length} icon={StatIcons.members} accentColor="text-emerald-400" />
                    <StatCard label="Pending Tasks" value={users.reduce((total, u) => total + (u.pendingTasks || 0), 0)} icon={StatIcons.pending} accentColor="text-amber-400" />
                </div>

                <FilterToolbar
                    searchValue={searchTerm}
                    onSearchChange={setSearchTerm}
                    searchPlaceholder="Search by name or email..."
                />

                {/* Users List */}
                <div className="card !p-0 overflow-hidden">
                    {loading ? (
                        <div className="p-8 text-center">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
                            <p className="mt-4 text-slate-400">Loading users...</p>
                        </div>
                    ) : filteredUsers.length === 0 ? (
                        <div className="p-8 text-center">
                            <p className="text-slate-400">No users found.</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto responsive-table">
                            <table className="min-w-full divide-y divide-slate-700">
                                <thead className="bg-slate-900">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                                            User
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                                            Role
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                                            Task Statistics
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                                            Joined
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                                            Actions
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="bg-slate-800 divide-y divide-slate-700">
                                    {filteredUsers.map((userItem) => (
                                        <tr key={userItem._id} className="hover:bg-slate-700/50">
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center">
                                                    {userItem.profileImageUrl && (
                                                        <img
                                                            className="h-10 w-10 rounded-full mr-4"
                                                            src={userItem.profileImageUrl}
                                                            alt={userItem.name}
                                                        />
                                                    )}
                                                    <div>
                                                        <div className="text-sm font-medium text-slate-200">
                                                            {userItem.name}
                                                        </div>
                                                        <div className="text-sm text-slate-400">
                                                            {userItem.email}
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                                    userItem.role === 'Admin' 
                                                        ? 'bg-purple-100 text-purple-800' 
                                                        : 'bg-blue-100 text-blue-800'
                                                }`}>
                                                    {userItem.role}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="grid grid-cols-3 gap-2 text-xs">
                                                    <div className="text-center">
                                                        <div className="font-semibold text-yellow-600">
                                                            {userItem.pendingTasks || 0}
                                                        </div>
                                                        <div className="text-slate-400">Pending</div>
                                                    </div>
                                                    <div className="text-center">
                                                        <div className="font-semibold text-primary">
                                                            {userItem.inProgressTasks || 0}
                                                        </div>
                                                        <div className="text-slate-400">In Progress</div>
                                                    </div>
                                                    <div className="text-center">
                                                        <div className="font-semibold text-green-600">
                                                            {userItem.completedTasks || 0}
                                                        </div>
                                                        <div className="text-slate-400">Completed</div>
                                                    </div>
                                                </div>
                                                <div className="mt-1 text-xs text-slate-400">
                                                    Total: {getTotalTasks(userItem)} tasks
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-200">
                                                {new Date(userItem.createdAt).toLocaleDateString('en-US', {
                                                    year: 'numeric',
                                                    month: 'short',
                                                    day: 'numeric'
                                                })}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                                <button
                                                    onClick={() => handleDeleteUser(userItem._id)}
                                                    className="text-red-400 hover:text-red-300 disabled:text-slate-500"
                                                    disabled={userItem.role === 'Admin'}
                                                >
                                                    {userItem.role === 'Admin' ? 'Protected' : 'Delete'}
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
        </PageShell>
    );
}

export default ManageUsers;