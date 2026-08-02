import React from "react";
import { FileText, RefreshCw, Download, Search } from "lucide-react";
import axiosInstance from "../../../utils/axios";

interface AuditLogsTabProps {
  auditLogs: any[];
  auditTotal: number;
  auditPage: number;
  auditSearch: string;
  setAuditSearch: (val: string) => void;
  auditActionFilter: string;
  setAuditActionFilter: (val: string) => void;
  auditTargetFilter: string;
  setAuditTargetFilter: (val: string) => void;
  auditActionsList: string[];
  onFetchAuditLogs: (page: number) => void;
}

export default function AuditLogsTab({
  auditLogs,
  auditTotal,
  auditPage,
  auditSearch,
  setAuditSearch,
  auditActionFilter,
  setAuditActionFilter,
  auditTargetFilter,
  setAuditTargetFilter,
  auditActionsList,
  onFetchAuditLogs,
}: AuditLogsTabProps) {
  // Local filter
  const filteredLogs = auditLogs.filter((log) => {
    if (!auditSearch) return true;
    const term = auditSearch.toLowerCase();
    const actorName = log.actorId?.name || "System";
    const actionStr = log.action || "";
    const targetTypeStr = log.targetType || "";
    return (
      actorName.toLowerCase().includes(term) ||
      actionStr.toLowerCase().includes(term) ||
      targetTypeStr.toLowerCase().includes(term)
    );
  });

  return (
    <div className="space-y-4">
      <div className="card p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-4">
          <div className="flex items-center space-x-2">
            <FileText className="w-5 h-5 text-primary" />
            <h3 className="text-base font-bold text-slate-800">Enterprise Security Audit Logs</h3>
          </div>

          <div className="flex items-center space-x-2 text-xs">
            <button
              onClick={() => onFetchAuditLogs(1)}
              className="btn-secondary py-1.5 px-3 flex items-center space-x-1"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Refresh</span>
            </button>

            <button
              onClick={() => window.open(`${axiosInstance.defaults.baseURL}/api/audit-logs/export?format=csv`, "_blank")}
              className="btn-primary py-1.5 px-3 flex items-center space-x-1"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search logs by actor or action..."
              value={auditSearch}
              onChange={(e) => setAuditSearch(e.target.value)}
              className="input-field pl-9 text-xs"
            />
          </div>

          <select
            value={auditActionFilter}
            onChange={(e) => {
              setAuditActionFilter(e.target.value);
              onFetchAuditLogs(1);
            }}
            className="input-field text-xs"
          >
            <option value="">All Security Actions</option>
            {auditActionsList.map((act) => (
              <option key={act} value={act}>{act}</option>
            ))}
          </select>

          <select
            value={auditTargetFilter}
            onChange={(e) => {
              setAuditTargetFilter(e.target.value);
              onFetchAuditLogs(1);
            }}
            className="input-field text-xs"
          >
            <option value="">All Target Objects</option>
            <option value="Task">Tasks</option>
            <option value="Project">Projects</option>
            <option value="User">Users</option>
            <option value="Organization">Organization</option>
          </select>
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4">Actor</th>
                <th className="py-3 px-4">Action</th>
                <th className="py-3 px-4">Target</th>
                <th className="py-3 px-4 text-right">IP Address</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-400 italic">
                    No audit log records found.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr key={log._id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-800">
                      {log.actorId?.name || "System"}
                      <span className="block text-[10px] font-normal text-slate-400">{log.actorId?.email || ""}</span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="bg-primary/10 text-primary border border-primary/20 text-[10px] font-bold px-2 py-0.5 rounded-md">
                        {log.action}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-600 font-mono text-[11px]">
                      {log.targetType} {log.targetId ? `#${String(log.targetId).slice(-6)}` : ""}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-slate-500">
                      {log.ip || "127.0.0.1"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="bg-slate-50 border-t border-slate-200 px-4 py-3 flex items-center justify-between text-xs text-slate-600">
          <div>
            Showing <span className="font-bold text-slate-800">{filteredLogs.length}</span> of{" "}
            <span className="font-bold text-slate-800">{auditTotal}</span> events
          </div>
          <div className="flex space-x-2">
            <button
              onClick={() => onFetchAuditLogs(Math.max(1, auditPage - 1))}
              disabled={auditPage <= 1}
              className="btn-secondary py-1 px-3 text-xs disabled:opacity-50"
            >
              Previous
            </button>
            <button
              onClick={() => onFetchAuditLogs(auditPage + 1)}
              disabled={filteredLogs.length < 15}
              className="btn-secondary py-1 px-3 text-xs disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
