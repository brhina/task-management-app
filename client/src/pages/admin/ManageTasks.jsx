import React, { useState, useEffect, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { UserContext } from '../../context/UserContext';
import api from '../../utils/axios';
import { apiPaths } from '../../utils/apiPaths';
import PageShell from '../../components/common/PageShell';
import StatCard, { StatIcons } from '../../components/common/StatCard';
import FilterToolbar from '../../components/common/FilterToolbar';

function ManageTasks() {
    const { user } = useContext(UserContext);
    const navigate = useNavigate();
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [statusSummary, setStatusSummary] = useState({});

    useEffect(() => {
        fetchTasks();
    }, [statusFilter]);

    const fetchTasks = async () => {
        try {
            setLoading(true);
            const params = statusFilter ? { status: statusFilter } : {};
            const response = await api.get(apiPaths.TASKS.GET_ALL_TASKS, { params });
            setTasks(response.data.data.tasks);
            setStatusSummary(response.data.data.statusSummary);
        } catch (error) {
            console.error('Error fetching tasks:', error);
            setError('Failed to load tasks');
        } finally {
            setLoading(false);
        }
    };

    const handleStatusUpdate = async (taskId, newStatus) => {
        try {
            await api.put(apiPaths.TASKS.UPDATE_TASK_STATUS.replace(':id', taskId), {
                status: newStatus
            });
            fetchTasks(); // Refresh the list
        } catch (error) {
            console.error('Error updating task status:', error);
            setError('Failed to update task status');
        }
    };

    const handleDeleteTask = async (taskId) => {
        if (!window.confirm('Are you sure you want to delete this task?')) return;

        try {
            await api.delete(apiPaths.TASKS.DELETE_TASK.replace(':id', taskId));
            fetchTasks(); // Refresh the list
        } catch (error) {
            console.error('Error deleting task:', error);
            setError('Failed to delete task');
        }
    };

    const filteredTasks = tasks.filter(task => {
        const matchesSearch = task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            task.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            task.assignedTo?.name?.toLowerCase().includes(searchTerm.toLowerCase());
        return matchesSearch;
    });

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
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    if (!user || user.role !== 'Admin') {
        return (
            <PageShell title="Access Denied" subtitle="You don't have permission to access this page." />
        );
    }

    return (
        <PageShell
            title="Manage Tasks"
            subtitle="View and manage all tasks in the system"
            actions={
                <Link
                    to="/admin/create-task"
                    className="btn-primary"
                >
                    Create New Task
                </Link>
            }
        >

                {error && (
                    <div className="alert-error">{error}</div>
                )}

                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                    <StatCard label="Total Tasks" value={statusSummary.all || 0} icon={StatIcons.tasks} accentColor="text-indigo-400" />
                    <StatCard label="Pending" value={statusSummary.pending || 0} icon={StatIcons.pending} accentColor="text-amber-400" />
                    <StatCard label="In Progress" value={statusSummary.inProgress || 0} icon={StatIcons.progress} accentColor="text-sky-400" />
                    <StatCard label="Completed" value={statusSummary.completed || 0} icon={StatIcons.completed} accentColor="text-emerald-400" />
                </div>

                <FilterToolbar
                    searchValue={searchTerm}
                    onSearchChange={setSearchTerm}
                    searchPlaceholder="Search by title, description, or assignee..."
                    filters={[{
                        id: 'statusFilter',
                        label: 'Filter by Status',
                        value: statusFilter,
                        onChange: setStatusFilter,
                        options: [
                            { value: '', label: 'All Statuses' },
                            { value: 'Pending', label: 'Pending' },
                            { value: 'In Progress', label: 'In Progress' },
                            { value: 'Completed', label: 'Completed' },
                        ],
                    }]}
                    actions={
                        <button type="button" onClick={fetchTasks} className="btn-secondary w-full md:w-auto text-sm py-2">
                            Refresh
                        </button>
                    }
                />

                {/* Tasks List */}
                <div className="card !p-0 overflow-hidden">
                    {loading ? (
                        <div className="p-8 text-center">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
                            <p className="mt-4 text-slate-400">Loading tasks...</p>
                        </div>
                    ) : filteredTasks.length === 0 ? (
                        <div className="p-8 text-center">
                            <p className="text-slate-400">No tasks found.</p>
                        </div>
                    ) : (
                        <>
                            <div className="hidden md:block overflow-x-auto responsive-table">
                                <table className="min-w-full w-full table-auto divide-y divide-slate-700">
                                    <thead className="bg-slate-900">
                                        <tr>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                                                Task
                                            </th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                                                Assigned To
                                            </th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                                                Priority
                                            </th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                                                Status
                                            </th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                                                Due Date
                                            </th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                                                Progress
                                            </th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                                                Actions
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-slate-800 divide-y divide-slate-700">
                                        {filteredTasks.map((task) => (
                                            <tr key={task._id} className="hover:bg-slate-700/50">
                                                <td className="px-4 py-4 align-top max-w-[16rem] break-words">
                                                    <div>
                                                        <div className="text-sm font-medium text-slate-200">{task.title}</div>
                                                        <div className="text-sm text-slate-400 truncate">
                                                            {task.description}
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-4 align-top max-w-[14rem] break-words">
                                                    <div className="flex items-center gap-3">
                                                        {task.assignedTo?.profileImageUrl && (
                                                            <img
                                                                className="h-8 w-8 rounded-full"
                                                                src={task.assignedTo.profileImageUrl}
                                                                alt={task.assignedTo.name}
                                                            />
                                                        )}
                                                        <div>
                                                            <div className="text-sm font-medium text-slate-200">
                                                                {task.assignedTo?.name || 'Unknown'}
                                                            </div>
                                                            <div className="text-sm text-slate-400 break-words">
                                                                {task.assignedTo?.email}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-4 align-top">
                                                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getPriorityColor(task.priority)}`}>
                                                        {task.priority}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-4 align-top">
                                                    <select
                                                        value={task.status}
                                                        onChange={(e) => handleStatusUpdate(task._id, e.target.value)}
                                                        className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(task.status)} border-0 focus:ring-0`}
                                                    >
                                                        <option value="Pending">Pending</option>
                                                        <option value="In Progress">In Progress</option>
                                                        <option value="Completed">Completed</option>
                                                    </select>
                                                </td>
                                                <td className="px-4 py-4 align-top text-sm text-slate-200">
                                                    {formatDate(task.dueDate)}
                                                </td>
                                                <td className="px-4 py-4 align-top">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-24 bg-slate-700 rounded-full h-2 overflow-hidden">
                                                            <div
                                                                className="bg-primary h-2 rounded-full"
                                                                style={{ width: `${task.progress || 0}%` }}
                                                            ></div>
                                                        </div>
                                                        <span className="text-sm text-slate-400">{task.progress || 0}%</span>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-4 align-top text-sm font-medium">
                                                    <div className="flex flex-wrap gap-3">
                                                        <Link
                                                            to={`/admin/task/${task._id}`}
                                                            className="text-primary hover:text-primary-hover"
                                                        >
                                                            View
                                                        </Link>
                                                        <button
                                                            onClick={() => handleDeleteTask(task._id)}
                                                            className="text-red-400 hover:text-red-300"
                                                        >
                                                            Delete
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            <div className="space-y-4 md:hidden p-4">
                                {filteredTasks.map((task) => (
                                    <div key={task._id} className="bg-slate-900 rounded-2xl border border-slate-700/80 p-4 shadow-sm">
                                        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                                            <div>
                                                <div className="text-base font-semibold text-slate-100">{task.title}</div>
                                                <p className="mt-1 text-sm text-slate-400">{task.description}</p>
                                            </div>
                                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getPriorityColor(task.priority)}`}>
                                                {task.priority}
                                            </span>
                                        </div>
                                        <div className="mt-4 grid gap-3 sm:grid-cols-2">
                                            <div>
                                                <div className="text-xs uppercase tracking-wide text-slate-500">Assigned to</div>
                                                <div className="mt-2 flex items-center gap-3">
                                                    {task.assignedTo?.profileImageUrl && (
                                                        <img
                                                            className="h-8 w-8 rounded-full"
                                                            src={task.assignedTo.profileImageUrl}
                                                            alt={task.assignedTo.name}
                                                        />
                                                    )}
                                                    <div>
                                                        <div className="text-sm font-medium text-slate-100">
                                                            {task.assignedTo?.name || 'Unknown'}
                                                        </div>
                                                        <div className="text-sm text-slate-400 break-words">
                                                            {task.assignedTo?.email}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                            <div>
                                                <div className="text-xs uppercase tracking-wide text-slate-500">Status</div>
                                                <div className="mt-2">
                                                    <select
                                                        value={task.status}
                                                        onChange={(e) => handleStatusUpdate(task._id, e.target.value)}
                                                        className={`w-full inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(task.status)} border-0 focus:ring-0`}
                                                    >
                                                        <option value="Pending">Pending</option>
                                                        <option value="In Progress">In Progress</option>
                                                        <option value="Completed">Completed</option>
                                                    </select>
                                                </div>
                                            </div>
                                            <div>
                                                <div className="text-xs uppercase tracking-wide text-slate-500">Due Date</div>
                                                <div className="mt-2 text-sm text-slate-200">{formatDate(task.dueDate)}</div>
                                            </div>
                                            <div>
                                                <div className="text-xs uppercase tracking-wide text-slate-500">Progress</div>
                                                <div className="mt-2 flex items-center gap-2">
                                                    <div className="flex-1 bg-slate-700 rounded-full h-2 overflow-hidden">
                                                        <div
                                                            className="bg-primary h-2 rounded-full"
                                                            style={{ width: `${task.progress || 0}%` }}
                                                        ></div>
                                                    </div>
                                                    <span className="text-sm text-slate-400">{task.progress || 0}%</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="mt-4 flex flex-wrap items-center gap-4 text-sm font-medium">
                                            <Link
                                                to={`/admin/task/${task._id}`}
                                                className="text-primary hover:text-primary-hover"
                                            >
                                                View
                                            </Link>
                                            <button
                                                onClick={() => handleDeleteTask(task._id)}
                                                className="text-red-400 hover:text-red-300"
                                            >
                                                Delete
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </>
                    )}
                </div>
        </PageShell>
    );
}

export default ManageTasks;