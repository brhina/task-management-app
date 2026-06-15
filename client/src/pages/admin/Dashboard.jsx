import React, { useState, useEffect, useContext } from 'react';
import { Link } from 'react-router-dom';
import { UserContext } from '../../context/UserContext';
import api from '../../utils/axios';
import { apiPaths } from '../../utils/apiPaths';
import PageShell from '../../components/common/PageShell';
import StatCard, { StatIcons } from '../../components/common/StatCard';

function Dashboard() {
    const { user } = useContext(UserContext);
    const [dashboardData, setDashboardData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        fetchDashboardData();
    }, []);

    const fetchDashboardData = async () => {
        try {
            setLoading(true);
            const response = await api.get(apiPaths.TASKS.GET_DASHBOARD_TASKS);
            setDashboardData(response.data);
        } catch (error) {
            console.error('Error fetching dashboard data:', error);
            setError('Failed to load dashboard data');
        } finally {
            setLoading(false);
        }
    };

    const getPriorityColor = (priority) => {
        switch (priority) {
            case 'High': return 'bg-red-100 text-red-800';
            case 'Medium': return 'bg-yellow-100 text-yellow-800';
            case 'Low': return 'bg-green-100 text-green-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'Pending': return 'bg-yellow-100 text-yellow-800';
            case 'In Progress': return 'bg-blue-100 text-blue-800';
            case 'Completed': return 'bg-green-100 text-green-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    };

    if (!user || user.role !== 'Admin') {
        return (
            <PageShell title="Access Denied" subtitle="You don't have permission to access this page." />
        );
    }

    if (loading) {
        return (
            <PageShell title="Admin Dashboard" subtitle="Loading dashboard...">
                <div className="flex justify-center py-16">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                </div>
            </PageShell>
        );
    }

    if (error) {
        return (
            <PageShell title="Error" subtitle={error} />
        );
    }

    return (
        <PageShell
            title="Admin Dashboard"
            subtitle={`Welcome back, ${user.name}! Here's an overview of your task management system.`}
        >
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                    <StatCard label="Total Tasks" value={dashboardData?.statistics?.allTasks || 0} icon={StatIcons.tasks} accentColor="text-indigo-400" />
                    <StatCard label="Pending" value={dashboardData?.statistics?.pendingTasks || 0} icon={StatIcons.pending} accentColor="text-amber-400" />
                    <StatCard label="Completed" value={dashboardData?.statistics?.completedTasks || 0} icon={StatIcons.completed} accentColor="text-emerald-400" />
                    <StatCard label="Overdue" value={dashboardData?.statistics?.overdueTasks || 0} icon={StatIcons.overdue} accentColor="text-rose-400" />
                </div>

                {/* Charts Section */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="card">
                        <h3 className="text-lg font-semibold text-white mb-4">Task Distribution</h3>
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <span className="text-sm font-medium text-amber-400">Pending</span>
                                <div className="flex items-center">
                                    <div className="w-32 bg-red-200 rounded-full h-2 mr-3">
                                        <div
                                            className="bg-yellow-500 h-2 rounded-full"
                                            style={{ 
                                                width: `${dashboardData?.charts?.taskDistribution?.pending || 0}%` 
                                            }}
                                        ></div>
                                    </div>
                                    <span className="text-sm text-slate-400">
                                        {dashboardData?.charts?.taskDistribution?.pending || 0}
                                    </span>
                                </div>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-sm font-medium text-sky-400">In Progress</span>
                                <div className="flex items-center">
                                    <div className="w-32 bg-slate-700 rounded-full h-2 mr-3">
                                        <div
                                            className="bg-blue-500 h-2 rounded-full"
                                            style={{ 
                                                width: `${dashboardData?.charts?.taskDistribution?.in_progress || 0}%` 
                                            }}
                                        ></div>
                                    </div>
                                    <span className="text-sm text-slate-400">
                                        {dashboardData?.charts?.taskDistribution?.in_progress || 0}
                                    </span>
                                </div>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-sm font-medium text-emerald-400">Completed</span>
                                <div className="flex items-center">
                                    <div className="w-32 bg-slate-700 rounded-full h-2 mr-3">
                                        <div
                                            className="bg-green-500 h-2 rounded-full"
                                            style={{ 
                                                width: `${dashboardData?.charts?.taskDistribution?.completed || 0}%` 
                                            }}
                                        ></div>
                                    </div>
                                    <span className="text-sm text-slate-400">
                                        {dashboardData?.charts?.taskDistribution?.completed || 0}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Priority Distribution Chart */}
                    <div className="card">
                        <h3 className="text-lg font-semibold text-white mb-4">Priority Distribution</h3>
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <span className="text-sm font-medium text-rose-400">High Priority</span>
                                <div className="flex items-center">
                                    <div className="w-32 bg-red-200 rounded-full h-2 mr-3">
                                        <div
                                            className="bg-red-500 h-2 rounded-full"
                                            style={{ 
                                                width: `${dashboardData?.charts?.taskPriorityLevels?.high || 0}%` 
                                            }}
                                        ></div>
                                    </div>
                                    <span className="text-sm text-slate-400">
                                        {dashboardData?.charts?.taskPriorityLevels?.high || 0}
                                    </span>
                                </div>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-sm font-medium text-amber-400">Medium Priority</span>
                                <div className="flex items-center">
                                    <div className="w-32 bg-slate-700 rounded-full h-2 mr-3">
                                        <div
                                            className="bg-yellow-500 h-2 rounded-full"
                                            style={{ 
                                                width: `${dashboardData?.charts?.taskPriorityLevels?.medium || 0}%` 
                                            }}
                                        ></div>
                                    </div>
                                    <span className="text-sm text-slate-400">
                                        {dashboardData?.charts?.taskPriorityLevels?.medium || 0}
                                    </span>
                                </div>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-sm font-medium text-emerald-400">Low Priority</span>
                                <div className="flex items-center">
                                    <div className="w-32 bg-slate-700 rounded-full h-2 mr-3">
                                        <div
                                            className="bg-green-500 h-2 rounded-full"
                                            style={{ 
                                                width: `${dashboardData?.charts?.taskPriorityLevels?.low || 0}%` 
                                            }}
                                        ></div>
                                    </div>
                                    <span className="text-sm text-slate-400">
                                        {dashboardData?.charts?.taskPriorityLevels?.low || 0}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Recent Tasks */}
                <div className="card !p-0 overflow-hidden">
                    <div className="px-6 py-4 border-b border-slate-200">
                        <div className="flex justify-between items-center">
                            <h3 className="text-lg font-semibold text-white">Recent Tasks</h3>
                            <Link
                                to="/admin/manage-tasks"
                                className="text-primary hover:text-primary-hover text-sm font-medium"
                            >
                                View All Tasks →
                            </Link>
                        </div>
                    </div>
                    <div className="divide-y divide-slate-700">
                        {dashboardData?.recentTasks?.length === 0 ? (
                            <div className="px-6 py-8 text-center">
                                <p className="text-slate-400">No recent tasks found.</p>
                            </div>
                        ) : (
                            dashboardData?.recentTasks?.map((task) => (
                                <div key={task._id} className="px-6 py-4 hover:bg-slate-700/50">
                                    <div className="flex items-center justify-between">
                                        <div className="flex-1">
                                            <div className="flex items-center space-x-3">
                                                <h4 className="text-sm font-medium text-slate-200">
                                                    {task.title}
                                                </h4>
                                                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getPriorityColor(task.priority)}`}>
                                                    {task.priority}
                                                </span>
                                                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(task.status)}`}>
                                                    {task.status}
                                                </span>
                                            </div>
                                            <p className="text-sm text-slate-400 mt-1">
                                                Due: {formatDate(task.dueDate)}
                                            </p>
                                        </div>
                                        <Link
                                            to={`/admin/task/${task._id}`}
                                            className="text-primary hover:text-primary-hover text-sm font-medium"
                                        >
                                            View Details
                                        </Link>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Quick Actions */}
                <div className="card">
                    <h3 className="text-lg font-semibold text-white mb-4">Quick Actions</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <Link
                            to="/admin/create-task"
                            className="flex items-center p-4 border border-slate-600 rounded-lg hover:bg-slate-700/50 transition-colors"
                        >
                            <div className="flex-shrink-0">
                                <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                                    <span className="text-white font-bold">+</span>
                                </div>
                            </div>
                            <div className="ml-4">
                                <h4 className="text-sm font-medium text-slate-200">Create New Task</h4>
                                <p className="text-sm text-slate-400">Assign tasks to team members</p>
                            </div>
                        </Link>
                        <Link
                            to="/admin/manage-tasks"
                            className="flex items-center p-4 border border-slate-600 rounded-lg hover:bg-slate-700/50 transition-colors"
                        >
                            <div className="flex-shrink-0">
                                <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                                    <span className="text-white font-bold">📋</span>
                                </div>
                            </div>
                            <div className="ml-4">
                                <h4 className="text-sm font-medium text-slate-200">Manage Tasks</h4>
                                <p className="text-sm text-slate-400">View and manage all tasks</p>
                            </div>
                        </Link>
                        <Link
                            to="/admin/manage-users"
                            className="flex items-center p-4 border border-slate-600 rounded-lg hover:bg-slate-700/50 transition-colors"
                        >
                            <div className="flex-shrink-0">
                                <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center">
                                    <span className="text-white font-bold">👥</span>
                                </div>
                            </div>
                            <div className="ml-4">
                                <h4 className="text-sm font-medium text-slate-200">Manage Users</h4>
                                <p className="text-sm text-slate-400">View team members</p>
                            </div>
                        </Link>
                        <Link
                            to="/admin/reports"
                            className="flex items-center p-4 border border-slate-600 rounded-lg hover:bg-slate-700/50 transition-colors"
                        >
                            <div className="flex-shrink-0">
                                <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center">
                                    <span className="text-white font-bold">📊</span>
                                </div>
                            </div>
                            <div className="ml-4">
                                <h4 className="text-sm font-medium text-slate-200">Generate Reports</h4>
                                <p className="text-sm text-slate-400">Export task and user data</p>
                            </div>
                        </Link>
                    </div>
                </div>
        </PageShell>
    );
}

export default Dashboard; 