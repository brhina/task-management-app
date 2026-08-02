import React, { useState, useEffect } from "react";
import PageShell from "../../components/common/PageShell";
import StatCard from "../../components/common/StatCard";
import NavTabs from "../../components/common/NavTabs";
import axiosInstance from "../../utils/axios";
import {
  ShieldCheck,
  CreditCard,
  Key,
  Palette,
  Lock,
  Download,
  Plus,
  Trash2,
  Calendar,
  ExternalLink,
  Users,
  CheckCircle2,
} from "lucide-react";

export default function EnterpriseSettings() {
  const [activeTab, setActiveTab] = useState<"sso" | "billing" | "apikeys" | "branding" | "security">("sso");

  // SSO state
  const [ssoConfig, setSsoConfig] = useState<any>({
    enabled: false,
    provider: "saml",
    issuerUrl: "",
    entryPoint: "",
    domainWhitelist: [],
    jitProvisioning: true,
  });

  // Billing state
  const [billingData, setBillingData] = useState<any>(null);

  // API Keys state
  const [apiKeys, setApiKeys] = useState<any[]>([]);
  const [keyName, setKeyName] = useState("");
  const [newSecretKey, setNewSecretKey] = useState("");

  // Branding state
  const [branding, setBranding] = useState<any>({
    logoUrl: "",
    primaryColor: "#6366F1",
    accentColor: "#8B5CF6",
    customTitle: "",
    whiteLabelEnabled: false,
  });

  // Security & Compliance state
  const [sessions, setSessions] = useState<any[]>([]);
  const [totpData, setTotpData] = useState<any>(null);

  useEffect(() => {
    fetchSSOConfig();
    fetchBilling();
    fetchApiKeys();
    fetchBranding();
    fetchSessions();
  }, []);

  const fetchSSOConfig = async () => {
    try {
      const res = await axiosInstance.get("/sso/config");
      setSsoConfig(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchBilling = async () => {
    try {
      const res = await axiosInstance.get("/billing/metrics");
      setBillingData(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchApiKeys = async () => {
    try {
      const res = await axiosInstance.get("/api-keys");
      setApiKeys(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchBranding = async () => {
    try {
      const res = await axiosInstance.get("/branding");
      setBranding(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchSessions = async () => {
    try {
      const res = await axiosInstance.get("/compliance/sessions");
      setSessions(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSaveSSO = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const domains = typeof ssoConfig.domainWhitelist === "string"
        ? ssoConfig.domainWhitelist.split(",").map((d: string) => d.trim())
        : ssoConfig.domainWhitelist;
      await axiosInstance.put("/sso/config", { ...ssoConfig, domainWhitelist: domains });
      alert("SSO configuration saved successfully.");
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpgradePlan = async (plan: string) => {
    try {
      await axiosInstance.post("/billing/upgrade", { plan });
      fetchBilling();
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateApiKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!keyName) return;
    try {
      const res = await axiosInstance.post("/api-keys", { name: keyName });
      setNewSecretKey(res.data.secretKey);
      setKeyName("");
      fetchApiKeys();
    } catch (err) {
      console.error(err);
    }
  };

  const handleRevokeApiKey = async (id: string) => {
    try {
      await axiosInstance.delete(`/api-keys/${id}`);
      fetchApiKeys();
    } catch (err) {
      console.error(err);
    }
  };

  const handleSaveBranding = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await axiosInstance.put("/branding", branding);
      alert("Branding settings updated.");
    } catch (err) {
      console.error(err);
    }
  };

  const handleGDPRDownload = () => {
    window.open(`${axiosInstance.defaults.baseURL}/compliance/export`, "_blank");
  };

  const handleSetup2FA = async () => {
    try {
      const res = await axiosInstance.post("/compliance/2fa/setup");
      setTotpData(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const getCalendarFeedUrl = () => {
    const token = localStorage.getItem("token") || "";
    return `${axiosInstance.defaults.baseURL}/integrations/calendar/ics?token=${token}`;
  };

  return (
    <PageShell
      title={
        <span className="flex items-center space-x-2">
          <ShieldCheck className="w-6 h-6 text-primary" />
          <span>Enterprise Center</span>
        </span>
      }
      subtitle="SSO, Subscription Billing, API Keys, Custom Branding, and Security Compliance"
    >
      <div className="space-y-6">
        {/* KPI Overview Summary Header */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard
            title="Subscription Plan"
            value={billingData?.plan || "Free"}
            icon={CreditCard}
            colorTheme="slate"
            subtext="Active organization tier"
          />

          <StatCard
            title="SSO Status"
            value={ssoConfig.enabled ? "Active" : "Disabled"}
            icon={ShieldCheck}
            colorTheme={ssoConfig.enabled ? "emerald" : "slate"}
            badge={
              <span
                className={`w-2 h-2 rounded-full ${
                  ssoConfig.enabled ? "bg-emerald-500 animate-pulse" : "bg-slate-300"
                }`}
              />
            }
            subtext="SAML 2.0 / OIDC provider"
          />

          <StatCard
            title="Active API Keys"
            value={apiKeys.length}
            icon={Key}
            colorTheme="amber"
            subtext="Issued access tokens"
          />

          <StatCard
            title="Active Sessions"
            value={sessions.length}
            icon={Users}
            colorTheme="blue"
            subtext="Logged in devices"
          />
        </div>

        {/* Navigation Tabs */}
        <NavTabs<'sso' | 'billing' | 'apikeys' | 'branding' | 'security'>
          tabs={[
            { id: "sso", label: "SSO / SAML", icon: ShieldCheck },
            { id: "billing", label: "Billing & Usage", icon: CreditCard },
            { id: "apikeys", label: "API Keys & Feeds", icon: Key, badge: apiKeys.length },
            { id: "branding", label: "Custom Branding", icon: Palette },
            { id: "security", label: "Compliance & Security", icon: Lock },
          ]}
          activeTab={activeTab}
          onChange={setActiveTab}
        />

        {/* TAB 1: SSO / SAML */}
        {activeTab === "sso" && (
          <form onSubmit={handleSaveSSO} className="card p-6 space-y-5">
            <div className="flex items-center space-x-2.5 border-b border-slate-200/80 pb-4">
              <div className="p-2 rounded-xl bg-primary/10 text-primary shrink-0">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <h3 className="text-base font-bold text-slate-800">Single Sign-On (SSO / SAML 2.0)</h3>
                <p className="text-slate-500 text-xs">Configure enterprise identity providers (Okta, Azure AD, Google Workspace).</p>
              </div>
              <label className="flex items-center cursor-pointer space-x-2 shrink-0">
                <span className="text-xs font-semibold text-slate-700">Enable SSO</span>
                <input
                  type="checkbox"
                  checked={ssoConfig.enabled}
                  onChange={(e) => setSsoConfig({ ...ssoConfig, enabled: e.target.checked })}
                  className="w-4 h-4 accent-primary rounded"
                />
              </label>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">SSO Provider</label>
                <select
                  value={ssoConfig.provider}
                  onChange={(e) => setSsoConfig({ ...ssoConfig, provider: e.target.value })}
                  className="input-field text-xs"
                >
                  <option value="saml">SAML 2.0</option>
                  <option value="oidc">OIDC (OpenID Connect)</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Whitelisted Domains (comma separated)</label>
                <input
                  type="text"
                  placeholder="acme.com, enterprise.org"
                  value={Array.isArray(ssoConfig.domainWhitelist) ? ssoConfig.domainWhitelist.join(", ") : ssoConfig.domainWhitelist}
                  onChange={(e) => setSsoConfig({ ...ssoConfig, domainWhitelist: e.target.value })}
                  className="input-field text-xs"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-slate-700 font-semibold mb-1">Identity Provider (IdP) Entry Point URL</label>
                <input
                  type="url"
                  placeholder="https://sso.okta.com/app/v1/auth"
                  value={ssoConfig.entryPoint || ""}
                  onChange={(e) => setSsoConfig({ ...ssoConfig, entryPoint: e.target.value })}
                  className="input-field text-xs"
                />
              </div>
            </div>

            <button
              type="submit"
              className="btn-primary text-xs py-2 px-4"
            >
              Save SSO Settings
            </button>
          </form>
        )}

        {/* TAB 2: Billing & Usage */}
        {activeTab === "billing" && billingData && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {["Free", "Pro", "Enterprise"].map((tier) => (
                <div
                  key={tier}
                  className={`card p-5 flex flex-col justify-between ${
                    billingData.plan === tier ? "border-primary ring-2 ring-primary/20" : ""
                  }`}
                >
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-base font-bold text-slate-800">{tier} Plan</span>
                      {billingData.plan === tier && (
                        <span className="bg-primary/10 text-primary border border-primary/20 text-[10px] font-bold px-2 py-0.5 rounded">
                          Current
                        </span>
                      )}
                    </div>
                    <div className="text-2xl font-black text-slate-900 mb-3">
                      {tier === "Enterprise" ? "$299/mo" : tier === "Pro" ? "$49/mo" : "$0/mo"}
                    </div>
                  </div>

                  <button
                    onClick={() => handleUpgradePlan(tier)}
                    disabled={billingData.plan === tier}
                    className={`w-full py-2 rounded-xl text-xs font-semibold transition-colors mt-4 ${
                      billingData.plan === tier
                        ? "bg-slate-100 text-slate-400 cursor-default"
                        : "btn-primary"
                    }`}
                  >
                    {billingData.plan === tier ? "Active Plan" : `Switch to ${tier}`}
                  </button>
                </div>
              ))}
            </div>

            {/* Metered Usage */}
            <div className="card p-5 space-y-4">
              <h3 className="text-base font-bold text-slate-800">Organization Metered Usage</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                <div className="bg-slate-50 border border-slate-200/80 p-4 rounded-xl">
                  <div className="text-slate-500 font-medium">Team Members</div>
                  <div className="text-xl font-bold text-slate-900 mt-1">
                    {billingData.usage?.members} / {billingData.limits?.maxMembers}
                  </div>
                </div>

                <div className="bg-slate-50 border border-slate-200/80 p-4 rounded-xl">
                  <div className="text-slate-500 font-medium">Active Projects</div>
                  <div className="text-xl font-bold text-slate-900 mt-1">
                    {billingData.usage?.projects} / {billingData.limits?.maxProjects}
                  </div>
                </div>

                <div className="bg-slate-50 border border-slate-200/80 p-4 rounded-xl">
                  <div className="text-slate-500 font-medium">AI Ops Quota</div>
                  <div className="text-xl font-bold text-slate-900 mt-1">
                    {billingData.usage?.aiOps} / {billingData.limits?.maxAIOperations}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: API Keys & Integrations */}
        {activeTab === "apikeys" && (
          <div className="space-y-6">
            <div className="card p-5 space-y-4">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 rounded-xl bg-primary/10 text-primary shrink-0">
                  <Key className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-800">Generate API Key</h3>
                  <p className="text-slate-500 text-xs">Issue org API keys for backend integrations and automated scripts.</p>
                </div>
              </div>

              <form onSubmit={handleCreateApiKey} className="flex gap-2">
                <input
                  type="text"
                  placeholder="API Key Name (e.g. Production CI Integration)"
                  value={keyName}
                  onChange={(e) => setKeyName(e.target.value)}
                  className="input-field flex-1 text-xs"
                  required
                />
                <button
                  type="submit"
                  className="btn-primary text-xs flex items-center space-x-1 py-2 px-4 shrink-0"
                >
                  <Plus className="w-4 h-4" />
                  <span>Create Key</span>
                </button>
              </form>

              {newSecretKey && (
                <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-4 rounded-xl text-xs space-y-1">
                  <div className="font-bold">New API Key Created! Copy it now (it won't be shown again):</div>
                  <div className="font-mono text-sm bg-white p-2.5 rounded-lg border border-emerald-300 text-emerald-900">{newSecretKey}</div>
                </div>
              )}
            </div>

            {/* Active API Keys */}
            <div className="card p-5 space-y-3">
              <h3 className="text-base font-bold text-slate-800">Active API Keys</h3>
              <div className="space-y-2">
                {apiKeys.map((k) => (
                  <div key={k._id} className="bg-slate-50 border border-slate-200/80 p-3.5 rounded-xl flex justify-between items-center text-xs text-slate-700 shadow-2xs">
                    <div>
                      <div className="font-bold text-slate-800">{k.name}</div>
                      <div className="font-mono text-slate-500">{k.keyPrefix}...</div>
                    </div>
                    <button
                      onClick={() => handleRevokeApiKey(k._id)}
                      className="text-rose-600 hover:text-rose-800 text-xs font-semibold flex items-center space-x-1 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Revoke</span>
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* iCal Feed */}
            <div className="card p-5 space-y-3">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 rounded-xl bg-primary/10 text-primary shrink-0">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-800">iCal Calendar Subscription Feed</h3>
                  <p className="text-slate-500 text-xs">Subscribe to your task due dates in Google Calendar, Outlook, or Apple Calendar.</p>
                </div>
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  readOnly
                  value={getCalendarFeedUrl()}
                  className="input-field flex-1 text-xs font-mono text-slate-600"
                />
                <button
                  onClick={() => window.open(getCalendarFeedUrl(), "_blank")}
                  className="btn-secondary text-xs flex items-center space-x-1.5 py-2 px-3 shrink-0"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Open Feed</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: Custom Branding */}
        {activeTab === "branding" && (
          <form onSubmit={handleSaveBranding} className="card p-6 space-y-5">
            <div className="flex items-center space-x-2.5 border-b border-slate-200/80 pb-4">
              <div className="p-2 rounded-xl bg-primary/10 text-primary shrink-0">
                <Palette className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-800">Organization Custom Branding</h3>
                <p className="text-slate-500 text-xs">Customize logo, colors, and headers across your workspace.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Logo URL</label>
                <input
                  type="text"
                  value={branding.logoUrl}
                  onChange={(e) => setBranding({ ...branding, logoUrl: e.target.value })}
                  placeholder="https://example.com/logo.png"
                  className="input-field text-xs"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Custom Application Title</label>
                <input
                  type="text"
                  value={branding.customTitle}
                  onChange={(e) => setBranding({ ...branding, customTitle: e.target.value })}
                  placeholder="Acme WorkOS"
                  className="input-field text-xs"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Primary Theme Color</label>
                <input
                  type="color"
                  value={branding.primaryColor}
                  onChange={(e) => setBranding({ ...branding, primaryColor: e.target.value })}
                  className="w-full h-10 bg-white border border-slate-200 rounded-xl p-1 cursor-pointer"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Accent Theme Color</label>
                <input
                  type="color"
                  value={branding.accentColor}
                  onChange={(e) => setBranding({ ...branding, accentColor: e.target.value })}
                  className="w-full h-10 bg-white border border-slate-200 rounded-xl p-1 cursor-pointer"
                />
              </div>
            </div>

            <button
              type="submit"
              className="btn-primary text-xs py-2 px-4"
            >
              Save Branding Changes
            </button>
          </form>
        )}

        {/* TAB 5: Compliance & Security */}
        {activeTab === "security" && (
          <div className="space-y-6">
            <div className="card p-5 flex justify-between items-center">
              <div>
                <h3 className="text-base font-bold text-slate-800">Full GDPR Data Export</h3>
                <p className="text-slate-500 text-xs mt-0.5">Download all organization projects, tasks, members, and audit logs in JSON format.</p>
              </div>
              <button
                onClick={handleGDPRDownload}
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition-colors shadow-xs"
              >
                <Download className="w-4 h-4" />
                <span>Export JSON</span>
              </button>
            </div>

            <div className="card p-5 space-y-3">
              <h3 className="text-base font-bold text-slate-800">Two-Factor Authentication (2FA)</h3>
              <p className="text-slate-500 text-xs">Secure account access with TOTP authenticator apps.</p>
              <button
                onClick={handleSetup2FA}
                className="btn-primary text-xs py-2 px-4"
              >
                Setup 2FA Authenticator
              </button>

              {totpData && (
                <div className="bg-slate-50 border border-slate-200/80 p-4 rounded-xl text-xs space-y-2 mt-3">
                  <div className="text-slate-800 font-semibold">Scan QR code in Authenticator App:</div>
                  <img src={totpData.qrCodeUrl} alt="2FA QR Code" className="w-36 h-36 bg-white border border-slate-200 p-1 rounded-lg" />
                  <div className="font-mono text-slate-600">Secret: {totpData.secret}</div>
                </div>
              )}
            </div>

            <div className="card p-5 space-y-3">
              <h3 className="text-base font-bold text-slate-800">Active User Sessions</h3>
              <div className="space-y-2">
                {sessions.map((s) => (
                  <div key={s._id} className="bg-slate-50 border border-slate-200/80 p-3.5 rounded-xl flex justify-between items-center text-xs text-slate-700 shadow-2xs">
                    <div>
                      <div className="font-bold text-slate-800">{s.userAgent}</div>
                      <div className="text-slate-500 mt-0.5">IP: {s.ipAddress} • Last Active: {new Date(s.lastActive).toLocaleString()}</div>
                    </div>
                    <span className="text-emerald-700 bg-emerald-50 border border-emerald-200 font-bold text-[10px] px-2.5 py-0.5 rounded-md">Active</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </PageShell>
  );
}
