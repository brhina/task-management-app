import React from "react";
import {
  ShieldCheck,
  Globe,
  CheckCircle2,
  AlertTriangle,
  Copy,
  Check,
  RefreshCw,
} from "lucide-react";

interface SsoSettingsTabProps {
  ssoConfig: any;
  setSsoConfig: (config: any) => void;
  spMetadata: any;
  ssoTestResult: any;
  isTestingSso: boolean;
  onSaveSSO: (e: React.FormEvent) => void;
  onTestSSO: () => void;
  onCopy: (text: string, fieldId: string) => void;
  copiedField: string | null;
}

export default function SsoSettingsTab({
  ssoConfig,
  setSsoConfig,
  spMetadata,
  ssoTestResult,
  isTestingSso,
  onSaveSSO,
  onTestSSO,
  onCopy,
  copiedField,
}: SsoSettingsTabProps) {
  return (
    <div className="space-y-6">
      <form onSubmit={onSaveSSO} className="card p-6 space-y-5">
        <div className="flex items-center justify-between border-b border-slate-200/80 pb-4">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-primary/10 text-primary shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800">Single Sign-On (SSO / SAML 2.0)</h3>
              <p className="text-slate-500 text-xs">Configure enterprise identity providers (Okta, Azure AD, Google Workspace).</p>
            </div>
          </div>

          <label className="flex items-center cursor-pointer space-x-2.5 bg-slate-50 border border-slate-200 px-3.5 py-1.5 rounded-xl">
            <span className="text-xs font-semibold text-slate-700">Enable SSO</span>
            <input
              type="checkbox"
              checked={ssoConfig.enabled}
              onChange={(e) => setSsoConfig({ ...ssoConfig, enabled: e.target.checked })}
              className="w-4 h-4 accent-primary rounded cursor-pointer"
            />
          </label>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div>
            <label className="block text-slate-700 font-semibold mb-1">SSO Protocol</label>
            <select
              value={ssoConfig.provider}
              onChange={(e) => setSsoConfig({ ...ssoConfig, provider: e.target.value })}
              className="input-field text-xs"
            >
              <option value="saml">SAML 2.0 (Okta, Azure AD, Ping)</option>
              <option value="oidc">OIDC (Google Workspace, Auth0)</option>
            </select>
          </div>

          <div>
            <label className="block text-slate-700 font-semibold mb-1">Whitelisted Email Domains (comma separated)</label>
            <input
              type="text"
              placeholder="acme.com, enterprise.org"
              value={Array.isArray(ssoConfig.domainWhitelist) ? ssoConfig.domainWhitelist.join(", ") : ssoConfig.domainWhitelist}
              onChange={(e) => setSsoConfig({ ...ssoConfig, domainWhitelist: e.target.value })}
              className="input-field text-xs"
            />
          </div>

          <div>
            <label className="block text-slate-700 font-semibold mb-1">Identity Provider (IdP) Entry Point URL</label>
            <input
              type="url"
              placeholder="https://sso.okta.com/app/v1/auth"
              value={ssoConfig.entryPoint || ""}
              onChange={(e) => setSsoConfig({ ...ssoConfig, entryPoint: e.target.value })}
              className="input-field text-xs"
            />
          </div>

          <div>
            <label className="block text-slate-700 font-semibold mb-1">IdP Issuer URL / Entity ID</label>
            <input
              type="text"
              placeholder="http://www.okta.com/exk12345"
              value={ssoConfig.issuerUrl || ""}
              onChange={(e) => setSsoConfig({ ...ssoConfig, issuerUrl: e.target.value })}
              className="input-field text-xs"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-slate-700 font-semibold mb-1">X.509 Public Signing Certificate (PEM)</label>
            <textarea
              rows={4}
              placeholder="-----BEGIN CERTIFICATE-----&#10;MIIDdTCCAl2gAwIBAgILBAAAAAABFUAC...&#10;-----END CERTIFICATE-----"
              value={ssoConfig.certificate || ""}
              onChange={(e) => setSsoConfig({ ...ssoConfig, certificate: e.target.value })}
              className="input-field text-xs font-mono text-slate-700"
            />
          </div>

          <div className="md:col-span-2 bg-slate-50 border border-slate-200/80 p-4 rounded-xl flex items-center justify-between">
            <div>
              <div className="font-bold text-slate-800">Just-In-Time (JIT) User Provisioning</div>
              <div className="text-slate-500 text-[11px] mt-0.5">Automatically create user accounts upon first successful IdP sign-in.</div>
            </div>
            <div className="flex items-center space-x-3">
              <select
                value={ssoConfig.defaultRole || "OrgMember"}
                onChange={(e) => setSsoConfig({ ...ssoConfig, defaultRole: e.target.value })}
                className="input-field text-xs py-1"
              >
                <option value="OrgMember">Default Role: Member</option>
                <option value="OrgAdmin">Default Role: Admin</option>
              </select>

              <input
                type="checkbox"
                checked={ssoConfig.jitProvisioning}
                onChange={(e) => setSsoConfig({ ...ssoConfig, jitProvisioning: e.target.checked })}
                className="w-4 h-4 accent-primary rounded cursor-pointer"
              />
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between pt-3 border-t border-slate-200/80">
          <button type="submit" className="btn-primary text-xs py-2 px-5">
            Save SSO Settings
          </button>

          <button
            type="button"
            onClick={onTestSSO}
            disabled={isTestingSso}
            className="btn-secondary text-xs py-2 px-4 flex items-center space-x-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isTestingSso ? "animate-spin" : ""}`} />
            <span>{isTestingSso ? "Testing..." : "Test SSO Connection"}</span>
          </button>
        </div>
      </form>

      {/* Test Connection Output */}
      {ssoTestResult && (
        <div
          className={`card p-4 border ${
            ssoTestResult.success ? "bg-emerald-50/50 border-emerald-200" : "bg-rose-50/50 border-rose-200"
          } space-y-2 text-xs`}
        >
          <div className="flex items-center space-x-2 font-bold">
            {ssoTestResult.success ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span className={ssoTestResult.success ? "text-emerald-900" : "text-rose-900"}>
              {ssoTestResult.message}
            </span>
          </div>
          {ssoTestResult.details && (
            <div className="bg-white/80 p-3 rounded-lg border border-slate-200 text-slate-700 font-mono text-[11px] space-y-1">
              <div>Provider: {ssoTestResult.details.provider}</div>
              <div>Entry Point: {ssoTestResult.details.entryPoint}</div>
              <div>Whitelisted Domains: {ssoTestResult.details.domains?.join(", ")}</div>
            </div>
          )}
        </div>
      )}

      {/* Service Provider (SP) Metadata Box */}
      {spMetadata && (
        <div className="card p-5 space-y-3">
          <div className="flex items-center space-x-2">
            <Globe className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-bold text-slate-800">Cadence Service Provider (SP) Metadata</h3>
          </div>
          <p className="text-slate-500 text-xs">Provide these details into your Okta or Azure AD configuration.</p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl">
              <div className="text-slate-500 text-[11px] font-medium">SP Entity ID / Audience URI</div>
              <div className="font-mono text-slate-800 text-[11px] truncate mt-1">{spMetadata.entityId}</div>
              <button
                onClick={() => onCopy(spMetadata.entityId, "sp_entity")}
                className="mt-2 text-primary hover:text-primary-dark font-semibold text-[11px] flex items-center space-x-1"
              >
                {copiedField === "sp_entity" ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                <span>{copiedField === "sp_entity" ? "Copied Entity ID!" : "Copy Entity ID"}</span>
              </button>
            </div>

            <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl">
              <div className="text-slate-500 text-[11px] font-medium">SP Assertion Consumer Service (ACS) URL</div>
              <div className="font-mono text-slate-800 text-[11px] truncate mt-1">{spMetadata.acsUrl}</div>
              <button
                onClick={() => onCopy(spMetadata.acsUrl, "sp_acs")}
                className="mt-2 text-primary hover:text-primary-dark font-semibold text-[11px] flex items-center space-x-1"
              >
                {copiedField === "sp_acs" ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                <span>{copiedField === "sp_acs" ? "Copied ACS URL!" : "Copy ACS URL"}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
