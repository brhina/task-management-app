import React, { useState, useEffect, useContext, useCallback } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { UserContext } from '../../context/UserContext';
import api from '../../utils/axios';
import { apiPaths } from '../../utils/apiPaths';
import { getStatusColor, getPriorityColor, TASK_STATUS } from '../../constants/taskStatus';
import LoadingSpinner from '../../components/common/LoadingSpinner';

function MyTasks() {
    const { user } = useContext(UserContext);
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || '');
    const [searchTerm, setSearchTerm] = useState('');
    const [statusSummary, setStatusSummary] = useState({});

    const fetchTasks = useCallback(async () => {
        try {
            setLoading(true);
            setError('');
            const params = statusFilter ? { status: statusFilter } : {};
            const response = await api.get(apiPaths.TASKS.GET_ALL_TASKS, { params });
            setTasks(response.data.data.tasks);
            setStatusSummary(response.data.data.statusSummary);
        } catch (error) {
            console.error('Error fetching tasks:', error);
            setError(error.response?.data?.message || 'Failed to load tasks');
        } finally {
            setLoading(false);
        }
    }, [statusFilter]);

    useEffect(() => {
        fetchTasks();
    }, [fetchTasks]);

    const handleStatusUpdate = async (taskId, newStatus) => {
        try {
            await api.put(apiPaths.TASKS.UPDATE_TASK_STATUS.replace(':id', taskId), {
                status: newStatus
            });
            fetchTasks();
        } catch (error) {
            console.error('Error updating task status:', error);
            setError('Failed to update task status');
        }
    };

    const filteredTasks = tasks.filter(task => {
        const matchesSearch = task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            task.description.toLowerCase().includes(searchTerm.toLowerCase());
        return matchesSearch;
    });


    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    };

    if (!user) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <h2 className="text-2xl font-bold text-gray-900 mb-4">Please Log In</h2>
                    <p className="text-gray-600">You need to be logged in to view your tasks.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="py-8">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-white mb-2">My Tasks</h1>
                    <p className="text-white">Manage and track your assigned tasks</p>
                </div>

                {error && (
                    <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
                        {error}
                    </div>
                )}

                {/* Status Summary */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                    <div className="bg-blue-200 rounded-lg shadow p-6">
                        <div className="flex items-center">
                            <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                                <span className="text-white font-bold">{statusSummary.all || 0}</span>
                            </div>
                            <div className="ml-4">
                                <p className="text-sm font-medium text-gray-500">Total Tasks</p>
                                <p className="text-2xl font-semibold text-gray-900">{statusSummary.all || 0}</p>
                            </div>
                        </div>
                    </div>
                    <div className="bg-pink-200 rounded-lg shadow p-6">
                        <div className="flex items-center">
                            <div className="w-8 h-8 bg-yellow-500 rounded-full flex items-center justify-center">
                                <span className="text-white font-bold">{statusSummary.pending || 0}</span>
                            </div>
                            <div className="ml-4">
                                <p className="text-sm font-medium text-gray-500">Pending</p>
                                <p className="text-2xl font-semibold text-gray-900">{statusSummary.pending || 0}</p>
                            </div>
                        </div>
                    </div>
                    <div className="bg-gray-200 rounded-lg shadow p-6">
                        <div className="flex items-center">
                            <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                                <span className="text-white font-bold">{statusSummary.inProgress || 0}</span>
                            </div>
                            <div className="ml-4">
                                <p className="text-sm font-medium text-gray-500">In Progress</p>
                                <p className="text-2xl font-semibold text-gray-900">{statusSummary.inProgress || 0}</p>
                            </div>
                        </div>
                    </div>
                    <div className="bg-green-200 rounded-lg shadow p-6">
                        <div className="flex items-center">
                            <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                                <span className="text-white font-bold">{statusSummary.completed || 0}</span>
                            </div>
                            <div className="ml-4">
                                <p className="text-sm font-medium text-gray-500">Completed</p>
                                <p className="text-2xl font-semibold text-gray-900">{statusSummary.completed || 0}</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Filters */}
                <div className="bg-blue-200 rounded-lg shadow mb-6 p-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-2">
                                Search Tasks
                            </label>
                            <input
                                type="text"
                                id="search"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                placeholder="Search by title or description..."
                            />
                        </div>
                        <div>
                            <label htmlFor="statusFilter" className="block text-sm font-medium text-gray-700 mb-2">
                                Filter by Status
                            </label>
                            <select
                                id="statusFilter"
                                value={statusFilter}
                                onChange={(e) => {
                                    setStatusFilter(e.target.value);
                                    setSearchParams(e.target.value ? { status: e.target.value } : {});
                                }}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                            >
                                <option value="">All Statuses</option>
                                <option value={TASK_STATUS.PENDING}>{TASK_STATUS.PENDING}</option>
                                <option value={TASK_STATUS.IN_PROGRESS}>{TASK_STATUS.IN_PROGRESS}</option>
                                <option value={TASK_STATUS.COMPLETED}>{TASK_STATUS.COMPLETED}</option>
                            </select>
                        </div>
                        <div className="flex items-end">
                            <button
                                onClick={fetchTasks}
                                className="w-full px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500"
                            >
                                Refresh
                            </button>
                        </div>
                    </div>
                </div>

                {/* Tasks List */}
                <div className="bg-gray-200 rounded-lg shadow border-b-2 border-blue-600">
                    {loading ? (
                        <div className="p-8 text-center">
                            <LoadingSpinner size="md" text="Loading tasks..." />
                        </div>
                    ) : filteredTasks.length === 0 ? (
                        <div className="p-8 text-center">
                            <p className="text-gray-600">No tasks found.</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-gray-200">
                            {filteredTasks.map((task) => (
                                <div key={task._id} className="p-6 hover:bg-gray-100 shadow-md">
                                    <div className="flex items-start justify-between">
                                        <div className="flex-1">
                                            <div className="flex items-center space-x-3 mb-2">
                                                <h3 className="text-lg font-medium text-gray-900">{task.title}</h3>
                                                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getPriorityColor(task.priority)}`}>
                                                    {task.priority}
                                                </span>
                                                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(task.status)}`}>
                                                    {task.status}
                                                </span>
                                            </div>
                                            
                                            <p className="text-gray-600 mb-4">{task.description}</p>
                                            
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                                <div>
                                                    <p className="text-sm text-gray-500">Due Date</p>
                                                    <p className="text-sm font-medium text-gray-900">
                                                        {formatDate(task.dueDate)}
                                                    </p>
                                                </div>
                                                <div>
                                                    <p className="text-sm text-gray-500">Progress</p>
                                                    <div className="flex items-center">
                                                        <div className="w-24 bg-gray-200 rounded-full h-2 mr-2">
                                                            <div
                                                                className="bg-blue-600 h-2 rounded-full"
                                                                style={{ width: `${task.progress || 0}%` }}
                                                            ></div>
                                                        </div>
                                                        <span className="text-sm text-gray-500">{task.progress || 0}%</span>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex items-center space-x-4">
                                                <div>
                                                    <label htmlFor={`status-${task._id}`} className="block text-sm font-medium text-gray-700 mb-1">
                                                        Update Status
                                                    </label>
                                                    <select
                                                        id={`status-${task._id}`}
                                                        value={task.status}
                                                        onChange={(e) => handleStatusUpdate(task._id, e.target.value)}
                                                        className="px-3 py-1 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm"
                                                    >
                                                        <option value={TASK_STATUS.PENDING}>{TASK_STATUS.PENDING}</option>
                                                        <option value={TASK_STATUS.IN_PROGRESS}>{TASK_STATUS.IN_PROGRESS}</option>
                                                        <option value={TASK_STATUS.COMPLETED}>{TASK_STATUS.COMPLETED}</option>
                                                    </select>
                                                </div>
                                                <Link
                                                    to={`/user/task/${task._id}`}
                                                    className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                                                >
                                                    View Details →
                                                </Link>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default MyTasks;