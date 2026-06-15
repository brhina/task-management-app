import React, { useState, useEffect, useContext, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { UserContext } from '../../context/UserContext';
import api from '../../utils/axios';
import { apiPaths } from '../../utils/apiPaths';
import { getStatusColor, getPriorityColor, TASK_STATUS } from '../../constants/taskStatus';
import { formatDate, getRelativeTime, isOverdue, getDaysUntilDue } from '../../utils/dateUtils';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import PageShell from '../../components/common/PageShell';

function ViewTaskDetails() {
    const { user } = useContext(UserContext);
    const { id } = useParams();
    const navigate = useNavigate();
    const [task, setTask] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [updating, setUpdating] = useState(false);
    const [newChecklistItem, setNewChecklistItem] = useState('');
    const [showAddChecklist, setShowAddChecklist] = useState(false);

    const fetchTaskDetails = useCallback(async () => {
        try {
            setLoading(true);
            setError('');
            const response = await api.get(apiPaths.TASKS.GET_TASK_BY_ID.replace(':id', id));
            setTask(response.data.data);
        } catch (error) {
            console.error('Error fetching task details:', error);
            setError(error.response?.data?.message || 'Failed to load task details');
        } finally {
            setLoading(false);
        }
    }, [id]);

    useEffect(() => {
        fetchTaskDetails();
    }, [fetchTaskDetails]);

    const handleStatusUpdate = async (newStatus) => {
        try {
            setUpdating(true);
            setError('');
            await api.put(apiPaths.TASKS.UPDATE_TASK_STATUS.replace(':id', id), {
                status: newStatus
            });
            await fetchTaskDetails(); // Refresh the task data
        } catch (error) {
            console.error('Error updating task status:', error);
            setError(error.response?.data?.message || 'Failed to update task status');
        } finally {
            setUpdating(false);
        }
    };

    const handleChecklistUpdate = async (todoCheckList) => {
        try {
            setUpdating(true);
            setError('');
            await api.put(apiPaths.TASKS.UPDATE_TASK_CHECKLIST.replace(':id', id), {
                todoCheckList
            });
            await fetchTaskDetails(); // Refresh the task data
        } catch (error) {
            console.error('Error updating checklist:', error);
            setError(error.response?.data?.message || 'Failed to update checklist');
        } finally {
            setUpdating(false);
        }
    };

    const handleTodoToggle = async (todoIndex, isCompleted) => {
        if (!task || !task.todoCheckList) return;

        const updatedTodoCheckList = [...task.todoCheckList];
        updatedTodoCheckList[todoIndex] = {
            ...updatedTodoCheckList[todoIndex],
            isCompleted
        };

        await handleChecklistUpdate(updatedTodoCheckList);
    };

    const handleAddChecklistItem = async (e) => {
        e.preventDefault();
        if (!newChecklistItem.trim() || !task) return;

        const newItem = {
            text: newChecklistItem.trim(),
            isCompleted: false
        };

        const updatedTodoCheckList = [...(task.todoCheckList || []), newItem];
        setNewChecklistItem('');
        setShowAddChecklist(false);
        await handleChecklistUpdate(updatedTodoCheckList);
    };

    const handleDeleteChecklistItem = async (index) => {
        if (!task || !task.todoCheckList) return;
        
        const updatedTodoCheckList = task.todoCheckList.filter((_, i) => i !== index);
        await handleChecklistUpdate(updatedTodoCheckList);
    };

    const completedChecklistCount = task?.todoCheckList?.filter(todo => todo.isCompleted).length || 0;
    const totalChecklistCount = task?.todoCheckList?.length || 0;
    const checklistProgress = totalChecklistCount > 0 ? Math.round((completedChecklistCount / totalChecklistCount) * 100) : 0;
    const daysUntilDue = task ? getDaysUntilDue(task.dueDate) : null;

    if (!user) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <h2 className="text-2xl font-bold text-slate-200 mb-4">Please Log In</h2>
                    <p className="text-slate-400">You need to be logged in to view task details.</p>
                </div>
            </div>
        );
    }

    if (loading) {
        return (
            <PageShell title="Task Details" subtitle="Loading task details...">
                <div className="flex justify-center py-16">
                    <LoadingSpinner size="lg" text="Loading task details..." />
                </div>
            </PageShell>
        );
    }

    if (!task) {
        return (
            <PageShell title="Task Not Found" subtitle={error || 'The task you are looking for does not exist or has been deleted.'}>
                <Link
                    to="/user/my-tasks"
                    className="inline-flex items-center btn-primary"
                >
                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                        </svg>
                        Back to My Tasks
                    </Link>
            </PageShell>
        );
    }

    return (
        <PageShell title={task.title} subtitle="Task details and progress">
                <div className="mb-6">
                    <Link
                        to="/user/my-tasks"
                        className="inline-flex items-center text-primary hover:text-primary-hover mb-4 transition-colors"
                    >
                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                        </svg>
                        Back to My Tasks
                    </Link>
                    
                    <div className="card mb-6">
                        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                            <div className="flex-1">
                                <div className="flex flex-wrap items-center gap-2 mb-4">
                                    <span className={`inline-flex items-center px-3 py-1 text-sm font-semibold rounded-full ${getPriorityColor(task.priority)}`}>
                                        <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                        </svg>
                                        {task.priority} Priority
                                    </span>
                                    <span className={`inline-flex items-center px-3 py-1 text-sm font-semibold rounded-full ${getStatusColor(task.status)}`}>
                                        {task.status}
                                    </span>
                                    {isOverdue(task.dueDate) && task.status !== TASK_STATUS.COMPLETED && (
                                        <span className="inline-flex items-center px-3 py-1 text-sm font-semibold rounded-full bg-red-100 text-red-800">
                                            <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                            </svg>
                                            Overdue
                                        </span>
                                    )}
                                    {daysUntilDue !== null && daysUntilDue > 0 && daysUntilDue <= 3 && task.status !== TASK_STATUS.COMPLETED && (
                                        <span className="inline-flex items-center px-3 py-1 text-sm font-semibold rounded-full bg-orange-100 text-orange-800">
                                            <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                                            </svg>
                                            Due {daysUntilDue === 1 ? 'tomorrow' : `in ${daysUntilDue} days`}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {error && (
                        <div className="alert-error">
                            <div className="flex">
                                <div className="flex-shrink-0">
                                    <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                    </svg>
                                </div>
                                <div className="ml-3">
                                    <p className="text-sm text-red-700">{error}</p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Main Content */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Description */}
                        <div className="card">
                            <div className="flex items-center mb-4">
                                <svg className="w-6 h-6 text-slate-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                                <h2 className="text-xl font-semibold text-slate-200">Description</h2>
                            </div>
                            <p className="text-slate-300 leading-relaxed whitespace-pre-wrap">{task.description || 'No description provided.'}</p>
                        </div>

                        {/* Checklist */}
                        <div className="card">
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center">
                                    <svg className="w-6 h-6 text-slate-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                                    </svg>
                                    <h2 className="text-xl font-semibold text-slate-200">Checklist</h2>
                                </div>
                                {totalChecklistCount > 0 && (
                                    <div className="text-sm text-slate-400">
                                        {completedChecklistCount} of {totalChecklistCount} completed
                                    </div>
                                )}
                            </div>
                            
                            {totalChecklistCount > 0 && (
                                <div className="mb-4">
                                    <div className="flex justify-between text-xs text-slate-400 mb-1">
                                        <span>Progress</span>
                                        <span>{checklistProgress}%</span>
                                    </div>
                                    <div className="w-full bg-slate-700 rounded-full h-2">
                                        <div
                                            className="bg-green-500 h-2 rounded-full transition-all duration-300"
                                            style={{ width: `${checklistProgress}%` }}
                                        ></div>
                                    </div>
                                </div>
                            )}

                            <div className="space-y-2 mb-4">
                                {task.todoCheckList && task.todoCheckList.length > 0 ? (
                                    task.todoCheckList.map((todo, index) => (
                                        <div 
                                            key={index} 
                                            className="flex items-center group p-3 border border-slate-600 rounded-lg hover:bg-slate-700/50 hover:border-slate-600 transition-all"
                                        >
                                            <input
                                                type="checkbox"
                                                checked={todo.isCompleted}
                                                onChange={(e) => handleTodoToggle(index, e.target.checked)}
                                                disabled={updating}
                                                className="h-5 w-5 text-primary focus:ring-primary border-slate-600 rounded cursor-pointer disabled:opacity-50"
                                                aria-label={`Mark "${todo.text}" as ${todo.isCompleted ? 'incomplete' : 'complete'}`}
                                            />
                                            <span className={`ml-3 flex-1 ${todo.isCompleted ? 'line-through text-slate-400' : 'text-slate-300'}`}>
                                                {todo.text}
                                            </span>
                                            <button
                                                onClick={() => handleDeleteChecklistItem(index)}
                                                disabled={updating}
                                                className="ml-2 opacity-0 group-hover:opacity-100 p-1 text-red-600 hover:text-red-800 transition-opacity disabled:opacity-50"
                                                aria-label={`Delete "${todo.text}"`}
                                            >
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                </svg>
                                            </button>
                                        </div>
                                    ))
                                ) : (
                                    <p className="text-slate-400 text-sm italic">No checklist items yet. Add one below!</p>
                                )}
                            </div>

                            {showAddChecklist ? (
                                <form onSubmit={handleAddChecklistItem} className="mt-4">
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            value={newChecklistItem}
                                            onChange={(e) => setNewChecklistItem(e.target.value)}
                                            placeholder="Enter checklist item..."
                                            className="flex-1 px-3 py-2 border border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                            autoFocus
                                        />
                                        <button
                                            type="submit"
                                            disabled={!newChecklistItem.trim() || updating}
                                            className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                        >
                                            Add
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setShowAddChecklist(false);
                                                setNewChecklistItem('');
                                            }}
                                            className="px-4 py-2 border border-slate-600 rounded-md hover:bg-slate-700/50 transition-colors"
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                </form>
                            ) : (
                                <button
                                    onClick={() => setShowAddChecklist(true)}
                                    className="w-full mt-2 px-4 py-2 border-2 border-dashed border-slate-300 rounded-lg text-slate-600 hover:border-primary hover:text-primary transition-colors"
                                >
                                    <svg className="w-5 h-5 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                    </svg>
                                    Add Checklist Item
                                </button>
                            )}
                        </div>

                        {/* Progress */}
                        <div className="card">
                            <div className="flex items-center mb-4">
                                <svg className="w-6 h-6 text-slate-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                </svg>
                                <h2 className="text-xl font-semibold text-slate-200">Overall Progress</h2>
                            </div>
                            <div className="space-y-4">
                                <div>
                                    <div className="flex justify-between text-sm text-slate-400 mb-2">
                                        <span className="font-medium">Task Completion</span>
                                        <span className="font-semibold">{task.progress || 0}%</span>
                                    </div>
                                    <div className="w-full bg-slate-700 rounded-full h-4 overflow-hidden">
                                        <div
                                            className="bg-gradient-to-r from-blue-500 to-blue-600 h-4 rounded-full transition-all duration-500 ease-out flex items-center justify-end pr-2"
                                            style={{ width: `${task.progress || 0}%` }}
                                        >
                                            {task.progress > 10 && (
                                                <span className="text-xs text-white font-medium">{task.progress}%</span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Sidebar */}
                    <div className="space-y-6">
                        {/* Status Update */}
                        <div className="card">
                            <h3 className="text-lg font-semibold text-slate-200 mb-4 flex items-center">
                                <svg className="w-5 h-5 text-slate-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                </svg>
                                Update Status
                            </h3>
                            <div className="space-y-3">
                                <select
                                    value={task.status}
                                    onChange={(e) => handleStatusUpdate(e.target.value)}
                                    disabled={updating}
                                    className="w-full px-3 py-2 border border-slate-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <option value={TASK_STATUS.PENDING}>{TASK_STATUS.PENDING}</option>
                                    <option value={TASK_STATUS.IN_PROGRESS}>{TASK_STATUS.IN_PROGRESS}</option>
                                    <option value={TASK_STATUS.COMPLETED}>{TASK_STATUS.COMPLETED}</option>
                                </select>
                                {updating && (
                                    <div className="flex items-center text-sm text-slate-400">
                                        <LoadingSpinner size="sm" text="" className="mr-2" />
                                        Updating...
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Task Info */}
                        <div className="card">
                            <h3 className="text-lg font-semibold text-slate-200 mb-4 flex items-center">
                                <svg className="w-5 h-5 text-slate-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                Task Information
                            </h3>
                            <div className="space-y-4">
                                <div>
                                    <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-1">Due Date</p>
                                    <p className={`text-sm font-medium ${isOverdue(task.dueDate) && task.status !== TASK_STATUS.COMPLETED ? 'text-red-600' : 'text-slate-200'}`}>
                                        {formatDate(task.dueDate)}
                                    </p>
                                    {daysUntilDue !== null && (
                                        <p className="text-xs text-slate-400 mt-1">
                                            {isOverdue(task.dueDate) 
                                                ? `Overdue by ${Math.abs(daysUntilDue)} day${Math.abs(daysUntilDue) !== 1 ? 's' : ''}`
                                                : daysUntilDue === 0 
                                                    ? 'Due today'
                                                    : daysUntilDue > 0
                                                        ? getRelativeTime(task.dueDate)
                                                        : getRelativeTime(task.dueDate)
                                            }
                                        </p>
                                    )}
                                </div>
                                <div className="border-t border-slate-600 pt-4">
                                    <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-1">Created</p>
                                    <p className="text-sm text-slate-200">{formatDate(task.createdAt)}</p>
                                    <p className="text-xs text-slate-400 mt-1">{getRelativeTime(task.createdAt)}</p>
                                </div>
                                <div className="border-t border-slate-600 pt-4">
                                    <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-1">Last Updated</p>
                                    <p className="text-sm text-slate-200">{formatDate(task.updatedAt)}</p>
                                    <p className="text-xs text-slate-400 mt-1">{getRelativeTime(task.updatedAt)}</p>
                                </div>
                            </div>
                        </div>

                        {/* Assigned To */}
                        {task.assignedTo && (
                            <div className="card">
                                <h3 className="text-lg font-semibold text-slate-200 mb-4 flex items-center">
                                    <svg className="w-5 h-5 text-slate-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                    </svg>
                                    Assigned To
                                </h3>
                                <div className="flex items-center">
                                    {task.assignedTo.profileImageUrl ? (
                                        <img
                                            className="h-12 w-12 rounded-full mr-4 ring-2 ring-slate-600"
                                            src={task.assignedTo.profileImageUrl}
                                            alt={`${task.assignedTo.name}'s profile`}
                                        />
                                    ) : (
                                        <div className="h-12 w-12 rounded-full mr-4 bg-slate-700 flex items-center justify-center ring-2 ring-slate-600">
                                            <span className="text-slate-400 font-semibold text-lg">
                                                {task.assignedTo.name?.charAt(0).toUpperCase() || '?'}
                                            </span>
                                        </div>
                                    )}
                                    <div>
                                        <p className="font-medium text-slate-200">{task.assignedTo.name || 'Unknown'}</p>
                                        <p className="text-sm text-slate-400">{task.assignedTo.email}</p>
                                        {task.assignedTo.role && (
                                            <span className={`inline-block mt-1 px-2 py-0.5 text-xs font-semibold rounded ${task.assignedTo.role === 'Admin' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'}`}>
                                                {task.assignedTo.role}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
        </PageShell>
    );
}

export default ViewTaskDetails;