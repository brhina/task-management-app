import React from "react";
import { Plus, Trash2, Download } from "lucide-react";

interface ComplianceSecurityTabProps {
  ipAllowlist: string[];
  ipAllowlistEnabled: boolean;
  newIpInput: string;
  setNewIpInput: (val: string) => void;
  onAddIPRange: (e: React.FormEvent) => void;
  onRemoveIPRange: (ip: string) => void;
  onToggleIPEnforcement: (enabled: boolean) => void;
  onGDPRDownload: () => void;
  totpData: any;
  totpCode: string;
  setTotpCode: (val: string) => void;
  onSetup2FA: () => void;
  onVerify2FA: (e: React.FormEvent) => void;
  sessions: any[];
  onRevokeSession: (id: string) => void;
}

export default function ComplianceSecurityTab({
  ipAllowlist,
  ipAllowlistEnabled,
  newIpInput,
  setNewIpInput,
  onAddIPRange,
  onRemoveIPRange,
  onToggleIPEnforcement,
  onGDPRDownload,
  totpData,
  totpCode,
  setTotpCode,
  onSetup2FA,
  onVerify2FA,
  sessions,
  onRevokeSession,
}: ComplianceSecurityTabProps) {
  return (
    <div className="space-y-6">
      {/* IP Allowlist CIDR Manager */}
      <div className="card p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-200 pb-3">
          <div>
            <h3 className="text-base font-bold text-slate-800">IP Address Allowlisting</h3>
            <p className="text-slate-500 text-xs mt-0.5">Restrict API & application access to specific corporate IP addresses or CIDR ranges.</p>
          </div>
          <label className="flex items-center cursor-pointer space-x-2">
            <span className="text-xs font-semibold text-slate-700">Enforce IP Allowlist</span>
            <input
              type="checkbox"
              checked={ipAllowlistEnabled}
              onChange={(e) => onToggleIPEnforcement(e.target.checked)}
              className="w-4 h-4 accent-primary rounded cursor-pointer"
            />
          </label>
        </div>

        <form onSubmit={onAddIPRange} className="flex gap-2 text-xs">
          <input
            type="text"
            placeholder="Enter IP or CIDR (e.g. 192.168.1.1 or 10.0.0.0/24)"
            value={newIpInput}
            onChange={(e) => setNewIpInput(e.target.value)}
            className="input-field flex-1 text-xs"
          />
          <button type="submit" className="btn-primary text-xs px-4 py-2 flex items-center space-x-1 shrink-0">
            <Plus className="w-4 h-4" />
            <span>Add IP Range</span>
          </button>
        </form>

        <div className="flex flex-wrap gap-2 pt-1">
          {ipAllowlist.length === 0 ? (
            <p className="text-slate-400 text-xs italic">No IP ranges whitelisted. All IPs permitted.</p>
          ) : (
            ipAllowlist.map((ip) => (
              <span key={ip} className="bg-slate-100 border border-slate-300 text-slate-800 text-xs px-3 py-1 rounded-xl flex items-center space-x-2 font-mono">
                <span>{ip}</span>
                <button
                  onClick={() => onRemoveIPRange(ip)}
                  className="text-slate-400 hover:text-rose-600 transition-colors"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </span>
            ))
          )}
        </div>
      </div>

      {/* GDPR & 2FA Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="card p-5 space-y-3">
          <h3 className="text-base font-bold text-slate-800">GDPR Compliance Data Export</h3>
          <p className="text-slate-500 text-xs">Export all organization data, tasks, projects, members, and audit logs into JSON format.</p>
          <button
            onClick={onGDPRDownload}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition-colors shadow-xs"
          >
            <Download className="w-4 h-4" />
            <span>Export Complete JSON Dataset</span>
          </button>
        </div>

        <div className="card p-5 space-y-3">
          <h3 className="text-base font-bold text-slate-800">Two-Factor Authentication (2FA)</h3>
          <p className="text-slate-500 text-xs">Secure account access using TOTP Authenticator apps (Google Authenticator, 1Password).</p>
          <button onClick={onSetup2FA} className="btn-primary text-xs py-2 px-4">
            Setup TOTP Authenticator
          </button>
        </div>
      </div>

      {/* 2FA QR Code Setup Modal Box */}
      {totpData && (
        <form onSubmit={onVerify2FA} className="card p-5 border-2 border-primary bg-primary/5 space-y-3 text-xs animate-fade-in">
          <div className="font-bold text-slate-800 text-sm">Scan QR Code in Authenticator App:</div>
          <div className="flex items-center space-x-4">
            <img src={totpData.qrCodeUrl} alt="2FA QR" className="w-32 h-32 bg-white border border-slate-200 p-1 rounded-xl" />
            <div className="space-y-2">
              <div className="font-mono text-slate-600 text-[11px]">Secret: {totpData.secret}</div>
              <input
                type="text"
                placeholder="Enter 6-digit verification code"
                value={totpCode}
                onChange={(e) => setTotpCode(e.target.value)}
                className="input-field text-xs font-mono"
                required
              />
              <button type="submit" className="btn-primary text-xs py-1.5 px-4">
                Verify & Activate 2FA
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Active User Sessions Table */}
      <div className="card p-5 space-y-3">
        <h3 className="text-base font-bold text-slate-800">Active Organization Sessions</h3>
        <div className="space-y-2">
          {sessions.map((s) => (
            <div key={s._id} className="bg-slate-50 border border-slate-200/80 p-3.5 rounded-xl flex justify-between items-center text-xs text-slate-700">
              <div>
                <div className="font-bold text-slate-800">{s.userAgent}</div>
                <div className="text-slate-500 text-[11px] mt-0.5">
                  IP: {s.ipAddress} • Last Active: {new Date(s.lastActive).toLocaleString()}
                </div>
              </div>
              <button
                onClick={() => onRevokeSession(s._id)}
                className="text-rose-600 hover:text-rose-800 font-semibold text-xs border border-rose-200 hover:border-rose-300 px-3 py-1 rounded-lg bg-white"
              >
                Revoke Session
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
