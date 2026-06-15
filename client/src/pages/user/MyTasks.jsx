import React, { useState, useEffect, useContext, useCallback } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { UserContext } from '../../context/UserContext';
import api from '../../utils/axios';
import { apiPaths } from '../../utils/apiPaths';
import { getStatusColor, getPriorityColor, TASK_STATUS } from '../../constants/taskStatus';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import PageShell from '../../components/common/PageShell';
import StatCard, { StatIcons } from '../../components/common/StatCard';
import FilterToolbar from '../../components/common/FilterToolbar';

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
            <PageShell title="Please Log In" subtitle="You need to be logged in to view your tasks." />
        );
    }

    return (
        <PageShell
            title="My Tasks"
            subtitle="Manage and track your assigned tasks"
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
                    searchPlaceholder="Search by title or description..."
                    filters={[{
                        id: 'statusFilter',
                        label: 'Filter by Status',
                        value: statusFilter,
                        onChange: (value) => {
                            setStatusFilter(value);
                            setSearchParams(value ? { status: value } : {});
                        },
                        options: [
                            { value: '', label: 'All Statuses' },
                            { value: TASK_STATUS.PENDING, label: TASK_STATUS.PENDING },
                            { value: TASK_STATUS.IN_PROGRESS, label: TASK_STATUS.IN_PROGRESS },
                            { value: TASK_STATUS.COMPLETED, label: TASK_STATUS.COMPLETED },
                        ],
                    }]}
                    actions={
                        <button type="button" onClick={fetchTasks} className="btn-secondary w-full md:w-auto text-sm py-2">
                            Refresh
                        </button>
                    }
                />

                <div className="card !p-0 overflow-hidden">
                    {loading ? (
                        <div className="p-8 text-center">
                            <LoadingSpinner size="md" text="Loading tasks..." />
                        </div>
                    ) : filteredTasks.length === 0 ? (
                        <div className="p-8 text-center">
                            <p className="text-slate-400">No tasks found.</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-slate-700">
                            {filteredTasks.map((task) => (
                                <div key={task._id} className="p-6 hover:bg-slate-700/50">
                                    <div className="flex items-start justify-between">
                                        <div className="flex-1">
                                            <div className="flex items-center space-x-3 mb-2">
                                                <h3 className="text-lg font-medium text-slate-200">{task.title}</h3>
                                                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getPriorityColor(task.priority)}`}>
                                                    {task.priority}
                                                </span>
                                                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(task.status)}`}>
                                                    {task.status}
                                                </span>
                                            </div>
                                            
                                            <p className="text-slate-400 mb-4">{task.description}</p>
                                            
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                                <div>
                                                    <p className="text-sm text-slate-400">Due Date</p>
                                                    <p className="text-sm font-medium text-slate-200">
                                                        {formatDate(task.dueDate)}
                                                    </p>
                                                </div>
                                                <div>
                                                    <p className="text-sm text-slate-400">Progress</p>
                                                    <div className="flex items-center">
                                                        <div className="w-24 bg-slate-700 rounded-full h-2 mr-2">
                                                            <div
                                                                className="bg-primary h-2 rounded-full"
                                                                style={{ width: `${task.progress || 0}%` }}
                                                            ></div>
                                                        </div>
                                                        <span className="text-sm text-slate-400">{task.progress || 0}%</span>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex items-center space-x-4">
                                                <div>
                                                    <label htmlFor={`status-${task._id}`} className="block text-sm font-medium text-slate-300 mb-1">
                                                        Update Status
                                                    </label>
                                                    <select
                                                        id={`status-${task._id}`}
                                                        value={task.status}
                                                        onChange={(e) => handleStatusUpdate(task._id, e.target.value)}
                                                        className="input-dark px-3 py-1 text-sm"
                                                    >
                                                        <option value={TASK_STATUS.PENDING}>{TASK_STATUS.PENDING}</option>
                                                        <option value={TASK_STATUS.IN_PROGRESS}>{TASK_STATUS.IN_PROGRESS}</option>
                                                        <option value={TASK_STATUS.COMPLETED}>{TASK_STATUS.COMPLETED}</option>
                                                    </select>
                                                </div>
                                                <Link
                                                    to={`/user/task/${task._id}`}
                                                    className="text-primary hover:text-primary-hover text-sm font-medium"
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
        </PageShell>
    );
}

export default MyTasks;