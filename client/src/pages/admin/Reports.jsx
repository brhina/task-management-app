import React, { useState, useContext } from 'react';
import { UserContext } from '../../context/UserContext';
import { apiPaths } from '../../utils/apiPaths';
import axios from '../../utils/axios';
import PageShell from '../../components/common/PageShell';

const Reports = () => {
    const { user } = useContext(UserContext);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');

    // Check if user is admin
    if (!user || user.role !== 'Admin') {
        return (
            <PageShell title="Access Denied" subtitle="You don't have permission to access this page." />
        );
    }

    const downloadReport = async (reportType) => {
        setLoading(true);
        setMessage('');
        setError('');

        try {
            let url;
            let filename;

            if (reportType === 'tasks') {
                url = `${apiPaths.REPORTS.Export_TASKS_REPORT}`;
                filename = 'tasks_report.xlsx';
            } else if (reportType === 'users') {
                url = `${apiPaths.REPORTS.Export_USERS_REPORT}`;
                filename = 'user_task_report.xlsx';
            }

            const response = await axios.get(url, {
                responseType: 'blob',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            // Create a blob URL and trigger download
            const blob = new Blob([response.data], {
                type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            });
            const url_blob = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url_blob;
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url_blob);

            setMessage(`${reportType === 'tasks' ? 'Tasks' : 'Users'} report downloaded successfully!`);
        } catch (error) {
            console.error('Error downloading report:', error);
            setError(error.response?.data?.message || 'Failed to download report. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const reportTypes = [
        {
            id: 'tasks',
            title: 'Tasks Report',
            description: 'Export all tasks with detailed information including status, priority, assignments, and dates.',
            icon: (
                <svg className="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                </svg>
            ),
            features: [
                'Task ID and Title',
                'Description and Status',
                'Priority and Due Date',
                'Assigned User Information',
                'Creation and Update Dates'
            ]
        },
        {
            id: 'users',
            title: 'Users Report',
            description: 'Export user statistics with task counts, status breakdown, and performance metrics.',
            icon: (
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                </svg>
            ),
            features: [
                'User Name and Email',
                'Total Assigned Tasks',
                'Pending Tasks Count',
                'In Progress Tasks Count',
                'Completed Tasks Count',
                'Overdue Tasks Count'
            ]
        }
    ];

    return (
        <PageShell
            title="Reports"
            subtitle="Generate and download comprehensive reports for tasks and users."
        >

                {/* Messages */}
                {message && (
                    <div className="alert-success">
                        <span className="block sm:inline">{message}</span>
                    </div>
                )}

                {error && (
                    <div className="alert-error">
                        <span className="block sm:inline">{error}</span>
                    </div>
                )}

                {/* Report Types Grid */}
                <div className="grid md:grid-cols-2 gap-6">
                    {reportTypes.map((report) => (
                        <div key={report.id} className="card">
                            <div className="flex items-center mb-4">
                                {report.icon}
                                <div className="ml-3">
                                    <h3 className="text-xl font-semibold text-white">{report.title}</h3>
                                </div>
                            </div>
                            
                            <p className="text-slate-400 mb-4">{report.description}</p>
                            
                            <div className="mb-6">
                                <h4 className="text-sm font-medium text-slate-300 mb-2">Report includes:</h4>
                                <ul className="text-sm text-slate-400 space-y-1">
                                    {report.features.map((feature, index) => (
                                        <li key={index} className="flex items-center">
                                            <svg className="w-4 h-4 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                            </svg>
                                            {feature}
                                        </li>
                                    ))}
                                </ul>
                            </div>

                            <button
                                onClick={() => downloadReport(report.id)}
                                disabled={loading}
                                className={`w-full flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${
                                    loading
                                        ? 'bg-gray-400 cursor-not-allowed'
                                        : 'bg-primary hover:bg-primary-hover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary'
                                }`}
                            >
                                {loading ? (
                                    <>
                                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        Generating Report...
                                    </>
                                ) : (
                                    <>
                                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                        </svg>
                                        Download {report.title}
                                    </>
                                )}
                            </button>
                        </div>
                    ))}
                </div>

                {/* Additional Information */}
                <div className="card bg-primary-light border-primary/20">
                    <h3 className="text-lg font-medium text-white mb-2">About Reports</h3>
                    <div className="text-sm text-slate-300 space-y-2">
                        <p>• Reports are generated in Excel format (.xlsx) for easy analysis and sharing</p>
                        <p>• Task reports include comprehensive information about all tasks in the system</p>
                        <p>• User reports provide detailed statistics about task assignments and completion rates</p>
                        <p>• Reports are generated in real-time with the latest data from the database</p>
                    </div>
                </div>
        </PageShell>
    );
};

export default Reports; 