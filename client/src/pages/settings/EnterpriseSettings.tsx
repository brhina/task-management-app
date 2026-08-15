import React, { useState, useEffect, useContext, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import PageShell from "../../components/common/PageShell";
import StatCard from "../../components/common/StatCard";
import NavTabs from "../../components/common/NavTabs";
import axiosInstance from "../../utils/axios";
import { UserContext } from "../../context/UserContext";
import {
  ShieldCheck,
  CreditCard,
  Key,
  Palette,
  Lock,
  FileText,
  Users,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";

import SsoSettingsTab from "../../components/settings/enterprise/SsoSettingsTab";
import BillingSettingsTab from "../../components/settings/enterprise/BillingSettingsTab";
import TelebirrPaymentModal from "../../components/settings/enterprise/TelebirrPaymentModal";
import ApiWebhooksTab from "../../components/settings/enterprise/ApiWebhooksTab";
import BrandingSettingsTab from "../../components/settings/enterprise/BrandingSettingsTab";
import ComplianceSecurityTab from "../../components/settings/enterprise/ComplianceSecurityTab";
import AuditLogsTab from "../../components/settings/enterprise/AuditLogsTab";

const PLAN_PRICES: Record<string, { monthly: number; yearly: number }> = {
  Pro: { monthly: 2500, yearly: 24000 },
  Enterprise: { monthly: 15000, yearly: 144000 },
};

export default function EnterpriseSettings() {
  const { refreshOrgDetails } = useContext(UserContext);
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState<"sso" | "billing" | "apikeys" | "branding" | "security" | "audit">("sso");

  // Notification Toast State
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" | "info" } | null>(null);

  const showToast = (message: string, type: "success" | "error" | "info" = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Copy Feedback State
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const copyToClipboard = (text: string, fieldId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldId);
    setTimeout(() => setCopiedField(null), 2000);
  };

  // --- TAB 1: SSO State ---
  const [ssoConfig, setSsoConfig] = useState<any>({
    enabled: false,
    provider: "saml",
    issuerUrl: "",
    entryPoint: "",
    certificate: "",
    domainWhitelist: [],
    jitProvisioning: true,
    defaultRole: "OrgMember",
  });
  const [spMetadata, setSpMetadata] = useState<any>(null);
  const [ssoTestResult, setSsoTestResult] = useState<any>(null);
  const [isTestingSso, setIsTestingSso] = useState(false);

  // --- TAB 2: Billing State ---
  const [billingData, setBillingData] = useState<any>(null);
  const [isTelebirrModalOpen, setIsTelebirrModalOpen] = useState<boolean>(false);
  const [selectedPlanForTelebirr, setSelectedPlanForTelebirr] = useState<"Pro" | "Enterprise">("Pro");
  const [selectedCycleForTelebirr, setSelectedCycleForTelebirr] = useState<"monthly" | "yearly">("monthly");
  const [selectedPriceForTelebirr, setSelectedPriceForTelebirr] = useState<number>(2500);
  const [telebirrInitialPhone, setTelebirrInitialPhone] = useState<string>("");

  // --- TAB 3: API Keys & Webhooks State ---
  const [apiKeys, setApiKeys] = useState<any[]>([]);
  const [keyName, setKeyName] = useState("");
  const [keyScopes, setKeyScopes] = useState<string[]>(["read"]);
  const [keyExpiration, setKeyExpiration] = useState("30");
  const [newSecretKey, setNewSecretKey] = useState("");

  const [webhooks, setWebhooks] = useState<any[]>([]);
  const [webhookName, setWebhookName] = useState("");
  const [webhookUrl, setWebhookUrl] = useState("");
  const [webhookEvents, setWebhookEvents] = useState<string[]>(["task.created", "project.updated"]);

  // --- TAB 4: Branding State ---
  const [branding, setBranding] = useState<any>({
    logoUrl: "",
    customFavicon: "",
    primaryColor: "#6366F1",
    accentColor: "#8B5CF6",
    customTitle: "",
    whiteLabelEnabled: false,
  });

  // --- TAB 5: Compliance & Security State ---
  const [sessions, setSessions] = useState<any[]>([]);
  const [totpData, setTotpData] = useState<any>(null);
  const [totpCode, setTotpCode] = useState("");
  const [ipAllowlist, setIpAllowlist] = useState<string[]>([]);
  const [ipAllowlistEnabled, setIpAllowlistEnabled] = useState(false);
  const [newIpInput, setNewIpInput] = useState("");

  // --- TAB 6: Audit Logs State ---
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [auditTotal, setAuditTotal] = useState(0);
  const [auditPage, setAuditPage] = useState(1);
  const [auditSearch, setAuditSearch] = useState("");
  const [auditActionFilter, setAuditActionFilter] = useState("");
  const [auditTargetFilter, setAuditTargetFilter] = useState("");
  const [auditActionsList, setAuditActionsList] = useState<string[]>([]);

  // Enterprise Center disabled — all server routes are commented out on the server.
  // useEffect(() => {
  //   fetchSSOConfig();
  //   fetchSPMetadata();
  //   fetchBilling();
  //   fetchApiKeys();
  //   fetchWebhooks();
  //   fetchBranding();
  //   fetchSessions();
  //   fetchIPAllowlist();
  //   fetchAuditLogs();
  // }, []);

  // Deep-link from workspace create: ?tab=billing&upgrade=Pro&cycle=monthly&phone=
  // Run once per upgrade query — do not re-fire when billingData object identity changes.
  const handledUpgradeRef = useRef<string | null>(null);
  useEffect(() => {
    const tab = searchParams.get("tab");
    const upgrade = searchParams.get("upgrade");
    const cycle = searchParams.get("cycle");
    const phone = searchParams.get("phone");

    if (tab === "billing") {
      setActiveTab("billing");
    }

    if (upgrade !== "Pro" && upgrade !== "Enterprise") {
      return;
    }

    // Wait until metrics loaded so we know if Telebirr is configured
    if (!billingData) return;

    const key = `${upgrade}:${cycle || "monthly"}:${phone || ""}`;
    if (handledUpgradeRef.current === key) return;
    handledUpgradeRef.current = key;

    if (billingData.telebirrConfigured !== true) {
      setActiveTab("billing");
      setSearchParams({}, { replace: true });
      return;
    }

    const billingCycle = cycle === "yearly" ? "yearly" : "monthly";
    const price =
      PLAN_PRICES[upgrade][billingCycle === "yearly" ? "yearly" : "monthly"];
    setActiveTab("billing");
    setSelectedPlanForTelebirr(upgrade);
    setSelectedCycleForTelebirr(billingCycle);
    setSelectedPriceForTelebirr(price);
    if (phone) setTelebirrInitialPhone(phone);
    setIsTelebirrModalOpen(true);
    setSearchParams({}, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, billingData?.telebirrConfigured]);

  // --- FETCHERS — Enterprise Center disabled (server routes commented out) ---
  // const fetchSSOConfig = async () => {
  //   try {
  //     const res = await axiosInstance.get("/api/sso/config");
  //     setSsoConfig(res.data);
  //   } catch (err) {
  //     console.error(err);
  //   }
  // };

  // const fetchSPMetadata = async () => {
  //   try {
  //     const res = await axiosInstance.get("/api/sso/sp-metadata");
  //     setSpMetadata(res.data);
  //   } catch (err) {
  //     console.error(err);
  //   }
  // };

  // const fetchBilling = async () => {
  //   try {
  //     const res = await axiosInstance.get("/api/billing/metrics");
  //     setBillingData(res.data);
  //   } catch (err) {
  //     console.error(err);
  //   }
  // };

  // const fetchApiKeys = async () => {
  //   try {
  //     const res = await axiosInstance.get("/api/api-keys");
  //     setApiKeys(res.data);
  //   } catch (err) {
  //     console.error(err);
  //   }
  // };

  // const fetchWebhooks = async () => {
  //   try {
  //     const res = await axiosInstance.get("/api/webhooks");
  //     setWebhooks(res.data);
  //   } catch (err) {
  //     console.error(err);
  //   }
  // };

  // const fetchBranding = async () => {
  //   try {
  //     const res = await axiosInstance.get("/api/branding");
  //     setBranding(res.data);
  //   } catch (err) {
  //     console.error(err);
  //   }
  // };

  // const fetchSessions = async () => {
  //   try {
  //     const res = await axiosInstance.get("/api/compliance/sessions");
  //     setSessions(res.data);
  //   } catch (err) {
  //     console.error(err);
  //   }
  // };

  // const fetchIPAllowlist = async () => {
  //   try {
  //     const res = await axiosInstance.get("/api/compliance/ip-allowlist");
  //     setIpAllowlist(res.data.ipAllowlist || []);
  //     setIpAllowlistEnabled(res.data.ipAllowlistEnabled || false);
  //   } catch (err) {
  //     console.error(err);
  //   }
  // };

  // const fetchAuditLogs = async (page = 1) => {
  //   try {
  //     const params: any = { page, limit: 15 };
  //     if (auditActionFilter) params.action = auditActionFilter;
  //     if (auditTargetFilter) params.targetType = auditTargetFilter;
  //     const res = await axiosInstance.get("/api/audit-logs", { params });
  //     setAuditLogs(res.data.data || []);
  //     setAuditTotal(res.data.pagination?.total || 0);
  //     setAuditPage(page);
  //     if (res.data.filters?.actions) {
  //       setAuditActionsList(res.data.filters.actions);
  //     }
  //   } catch (err) {
  //     console.error(err);
  //   }
  // };

  // --- TAB HANDLERS — Enterprise Center disabled (server routes commented out) ---
  // const handleSaveSSO = async (e: React.FormEvent) => {
  //   e.preventDefault();
  //   try {
  //     const domains = typeof ssoConfig.domainWhitelist === "string"
  //       ? ssoConfig.domainWhitelist.split(",").map((d: string) => d.trim()).filter(Boolean)
  //       : ssoConfig.domainWhitelist;
  //     await axiosInstance.put("/api/sso/config", { ...ssoConfig, domainWhitelist: domains });
  //     showToast("SSO configuration saved successfully.", "success");
  //     fetchSSOConfig();
  //   } catch (err: any) {
  //     showToast(err.response?.data?.message || "Failed to save SSO config", "error");
  //   }
  // };

  // const handleTestSSO = async () => {
  //   setIsTestingSso(true);
  //   setSsoTestResult(null);
  //   try {
  //     const res = await axiosInstance.post("/api/sso/test-connection");
  //     setSsoTestResult(res.data);
  //     showToast(res.data.message, "success");
  //   } catch (err: any) {
  //     setSsoTestResult({
  //       success: false,
  //       message: err.response?.data?.message || "SSO Connection Test Failed",
  //     });
  //     showToast("SSO Connection Test Failed", "error");
  //   } finally {
  //     setIsTestingSso(false);
  //   }
  // };

  // const handleOpenTelebirrModal = (plan: "Pro" | "Enterprise", cycle: "monthly" | "yearly", priceETB: number) => {
  //   if (billingData && billingData.telebirrConfigured !== true) {
  //     return;
  //   }
  //   setSelectedPlanForTelebirr(plan);
  //   setSelectedCycleForTelebirr(cycle);
  //   setSelectedPriceForTelebirr(priceETB);
  //   setIsTelebirrModalOpen(true);
  // };

  // const handleTelebirrSuccess = async (_updatedPlan: string) => {
  //   await fetchBilling();
  //   await refreshOrgDetails();
  // };

  // const handleCreateApiKey = async (e: React.FormEvent) => {
  //   e.preventDefault();
  //   if (!keyName) return;
  //   try {
  //     const res = await axiosInstance.post("/api/api-keys", {
  //       name: keyName,
  //       scopes: keyScopes,
  //       expirationDays: keyExpiration === "never" ? 0 : Number(keyExpiration),
  //     });
  //     setNewSecretKey(res.data.secretKey);
  //     setKeyName("");
  //     showToast("New API Key created successfully!", "success");
  //     fetchApiKeys();
  //   } catch (err: any) {
  //     showToast(err.response?.data?.message || "Failed to create API key", "error");
  //   }
  // };

  // const handleRevokeApiKey = async (id: string) => {
  //   if (!confirm("Are you sure you want to revoke this API Key? Any application using it will lose access immediately.")) return;
  //   try {
  //     await axiosInstance.delete(`/api/api-keys/${id}`);
  //     showToast("API key revoked successfully.", "info");
  //     fetchApiKeys();
  //   } catch (err: any) {
  //     showToast(err.response?.data?.message || "Failed to revoke API key", "error");
  //   }
  // };

  // const handleCreateWebhook = async (e: React.FormEvent) => {
  //   e.preventDefault();
  //   if (!webhookName || !webhookUrl) return;
  //   try {
  //     await axiosInstance.post("/api/webhooks", {
  //       name: webhookName,
  //       url: webhookUrl,
  //       events: webhookEvents,
  //     });
  //     setWebhookName("");
  //     setWebhookUrl("");
  //     showToast("Webhook endpoint registered successfully!", "success");
  //     fetchWebhooks();
  //   } catch (err: any) {
  //     showToast(err.response?.data?.message || "Failed to create webhook", "error");
  //   }
  // };

  // const handleDeleteWebhook = async (id: string) => {
  //   if (!confirm("Are you sure you want to delete this webhook endpoint?")) return;
  //   try {
  //     await axiosInstance.delete(`/api/webhooks/${id}`);
  //     showToast("Webhook endpoint deleted.", "info");
  //     fetchWebhooks();
  //   } catch (err: any) {
  //     showToast(err.response?.data?.message || "Failed to delete webhook", "error");
  //   }
  // };

  // const handleSaveBranding = async (e: React.FormEvent) => {
  //   e.preventDefault();
  //   try {
  //     await axiosInstance.put("/api/branding", branding);
  //     showToast("Organization branding updated.", "success");
  //   } catch (err: any) {
  //     showToast(err.response?.data?.message || "Failed to save branding", "error");
  //   }
  // };

  // const handleResetBranding = () => {
  //   setBranding({
  //     logoUrl: "",
  //     customFavicon: "",
  //     primaryColor: "#6366F1",
  //     accentColor: "#8B5CF6",
  //     customTitle: "",
  //     whiteLabelEnabled: false,
  //   });
  // };

  // const handleGDPRDownload = () => {
  //   window.open(`${axiosInstance.defaults.baseURL}/api/compliance/export`, "_blank");
  //   showToast("GDPR Data Export initiated", "info");
  // };

  // const handleSetup2FA = async () => {
  //   try {
  //     const res = await axiosInstance.post("/api/compliance/2fa/setup");
  //     setTotpData(res.data);
  //   } catch (err: any) {
  //     showToast(err.response?.data?.message || "Failed to setup 2FA", "error");
  //   }
  // };

  // const handleVerify2FA = async (e: React.FormEvent) => {
  //   e.preventDefault();
  //   try {
  //     await axiosInstance.post("/api/compliance/2fa/verify", { code: totpCode });
  //     showToast("Two-Factor Authentication successfully enabled!", "success");
  //     setTotpData(null);
  //     setTotpCode("");
  //   } catch (err: any) {
  //     showToast(err.response?.data?.message || "Invalid 2FA code", "error");
  //   }
  // };

  // const handleRevokeSession = async (id: string) => {
  //   try {
  //     await axiosInstance.delete(`/api/compliance/sessions/${id}`);
  //     showToast("Session revoked.", "info");
  //     fetchSessions();
  //   } catch (err: any) {
  //     showToast(err.response?.data?.message || "Failed to revoke session", "error");
  //   }
  // };

  // const handleAddIPRange = async (e: React.FormEvent) => {
  //   e.preventDefault();
  //   if (!newIpInput) return;
  //   const updated = [...ipAllowlist, newIpInput.trim()];
  //   try {
  //     await axiosInstance.put("/api/compliance/ip-allowlist", {
  //       ipAllowlist: updated,
  //       ipAllowlistEnabled,
  //     });
  //     setIpAllowlist(updated);
  //     setNewIpInput("");
  //     showToast("IP range added to allowlist.", "success");
  //   } catch (err: any) {
  //     showToast(err.response?.data?.message || "Failed to add IP range", "error");
  //   }
  // };

  // const handleRemoveIPRange = async (ipToRemove: string) => {
  //   const updated = ipAllowlist.filter((ip) => ip !== ipToRemove);
  //   try {
  //     await axiosInstance.put("/api/compliance/ip-allowlist", {
  //       ipAllowlist: updated,
  //       ipAllowlistEnabled,
  //     });
  //     setIpAllowlist(updated);
  //     showToast("IP range removed.", "info");
  //   } catch (err: any) {
  //     showToast(err.response?.data?.message || "Failed to update IP allowlist", "error");
  //   }
  // };

  // const handleToggleIPEnforcement = async (enabled: boolean) => {
  //   try {
  //     await axiosInstance.put("/api/compliance/ip-allowlist", {
  //       ipAllowlist,
  //       ipAllowlistEnabled: enabled,
  //     });
  //     setIpAllowlistEnabled(enabled);
  //     showToast(`IP Allowlist enforcement ${enabled ? "enabled" : "disabled"}.`, "info");
  //   } catch (err: any) {
  //     showToast(err.response?.data?.message || "Failed to update IP enforcement", "error");
  //   }
  // };

  // const getCalendarFeedUrl = () => {
  //   const token = localStorage.getItem("token") || "";
  //   return `${axiosInstance.defaults.baseURL}/api/integrations/calendar/ics?token=${token}`;
  // };

  return (
    <PageShell
      title={
        <span className="flex items-center space-x-2.5">
          <ShieldCheck className="w-6 h-6 text-primary" />
          <span>Enterprise Center</span>
        </span>
      }
      subtitle="SSO/SAML, Subscription Billing, API Keys & Webhooks, Custom Branding, Security & Audit Logs"
    >
      <div className="space-y-6 relative">
        {/* Toast Alert Banner */}
        {toast && (
          <div
            className={`fixed top-5 right-5 z-50 px-4 py-3 rounded-xl shadow-lg border flex items-center space-x-3 text-xs font-semibold animate-fade-in ${
              toast.type === "success"
                ? "bg-emerald-50 border-emerald-300 text-emerald-900"
                : toast.type === "error"
                ? "bg-rose-50 border-rose-300 text-rose-900"
                : "bg-blue-50 border-blue-300 text-blue-900"
            }`}
          >
            {toast.type === "success" && <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />}
            {toast.type === "error" && <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />}
            {toast.type === "info" && <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0" />}
            <span>{toast.message}</span>
          </div>
        )}

        {/* KPI Overview Summary Header */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard
            title="Subscription Plan"
            value={billingData?.plan || "Free"}
            icon={CreditCard}
            colorTheme="slate"
            subtext="Active organization tier"
            badge={
              <span className="bg-primary/10 text-primary border border-primary/20 text-[10px] font-bold px-2 py-0.5 rounded-full">
                {billingData?.plan || "Free"}
              </span>
            }
          />

          <StatCard
            title="SSO Status"
            value={ssoConfig.enabled ? "Active" : "Disabled"}
            icon={ShieldCheck}
            colorTheme={ssoConfig.enabled ? "emerald" : "slate"}
            badge={
              <span
                className={`w-2.5 h-2.5 rounded-full ${
                  ssoConfig.enabled ? "bg-emerald-500 animate-pulse" : "bg-slate-300"
                }`}
              />
            }
            subtext="SAML 2.0 / OIDC provider"
          />

          <StatCard
            title="Active Keys & Webhooks"
            value={`${apiKeys.length} Keys / ${webhooks.length} Hooks`}
            icon={Key}
            colorTheme="amber"
            subtext="Integrations & automated scripts"
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
        <NavTabs<'sso' | 'billing' | 'apikeys' | 'branding' | 'security' | 'audit'>
          tabs={[
            { id: "sso", label: "SSO / SAML", icon: ShieldCheck },
            { id: "billing", label: "Billing & Usage", icon: CreditCard },
            { id: "apikeys", label: "API & Webhooks", icon: Key, badge: apiKeys.length + webhooks.length },
            { id: "branding", label: "Branding", icon: Palette },
            { id: "security", label: "Compliance & IP Security", icon: Lock },
            { id: "audit", label: "Audit Logs", icon: FileText, badge: auditTotal },
          ]}
          activeTab={activeTab}
          onChange={setActiveTab}
        />

        {/* TAB 1: SSO / SAML */}
        {activeTab === "sso" && (
          <SsoSettingsTab
            ssoConfig={ssoConfig}
            setSsoConfig={setSsoConfig}
            spMetadata={spMetadata}
            ssoTestResult={ssoTestResult}
            isTestingSso={isTestingSso}
            onSaveSSO={handleSaveSSO}
            onTestSSO={handleTestSSO}
            onCopy={copyToClipboard}
            copiedField={copiedField}
          />
        )}

        {/* TAB 2: Billing & Usage */}
        {activeTab === "billing" && (
          <BillingSettingsTab
            billingData={billingData}
            onUpgradePlan={handleOpenTelebirrModal}
            onShowToast={showToast}
            onRefreshBilling={fetchBilling}
          />
        )}

        {/* TAB 3: API Keys & Webhooks */}
        {activeTab === "apikeys" && (
          <ApiWebhooksTab
            apiKeys={apiKeys}
            keyName={keyName}
            setKeyName={setKeyName}
            keyScopes={keyScopes}
            setKeyScopes={setKeyScopes}
            keyExpiration={keyExpiration}
            setKeyExpiration={setKeyExpiration}
            newSecretKey={newSecretKey}
            webhooks={webhooks}
            webhookName={webhookName}
            setWebhookName={setWebhookName}
            webhookUrl={webhookUrl}
            setWebhookUrl={setWebhookUrl}
            webhookEvents={webhookEvents}
            setWebhookEvents={setWebhookEvents}
            onCreateApiKey={handleCreateApiKey}
            onRevokeApiKey={handleRevokeApiKey}
            onCreateWebhook={handleCreateWebhook}
            onDeleteWebhook={handleDeleteWebhook}
            onCopy={copyToClipboard}
            copiedField={copiedField}
            calendarFeedUrl={getCalendarFeedUrl()}
          />
        )}

        {/* TAB 4: Custom Branding */}
        {activeTab === "branding" && (
          <BrandingSettingsTab
            branding={branding}
            setBranding={setBranding}
            onSaveBranding={handleSaveBranding}
            onResetBranding={handleResetBranding}
          />
        )}

        {/* TAB 5: Compliance & Security */}
        {activeTab === "security" && (
          <ComplianceSecurityTab
            ipAllowlist={ipAllowlist}
            ipAllowlistEnabled={ipAllowlistEnabled}
            newIpInput={newIpInput}
            setNewIpInput={setNewIpInput}
            onAddIPRange={handleAddIPRange}
            onRemoveIPRange={handleRemoveIPRange}
            onToggleIPEnforcement={handleToggleIPEnforcement}
            onGDPRDownload={handleGDPRDownload}
            totpData={totpData}
            totpCode={totpCode}
            setTotpCode={setTotpCode}
            onSetup2FA={handleSetup2FA}
            onVerify2FA={handleVerify2FA}
            sessions={sessions}
            onRevokeSession={handleRevokeSession}
          />
        )}

        {/* TAB 6: Audit Logs */}
        {activeTab === "audit" && (
          <AuditLogsTab
            auditLogs={auditLogs}
            auditTotal={auditTotal}
            auditPage={auditPage}
            auditSearch={auditSearch}
            setAuditSearch={setAuditSearch}
            auditActionFilter={auditActionFilter}
            setAuditActionFilter={setAuditActionFilter}
            auditTargetFilter={auditTargetFilter}
            setAuditTargetFilter={setAuditTargetFilter}
            auditActionsList={auditActionsList}
            onFetchAuditLogs={fetchAuditLogs}
          />
        )}
      </div>

      <TelebirrPaymentModal
        isOpen={isTelebirrModalOpen}
        onClose={() => setIsTelebirrModalOpen(false)}
        targetPlan={selectedPlanForTelebirr}
        billingCycle={selectedCycleForTelebirr}
        priceETB={selectedPriceForTelebirr}
        initialPhone={telebirrInitialPhone || billingData?.telebirrPaymentMethod?.phone}
        onSuccess={handleTelebirrSuccess}
        onShowToast={showToast}
      />
    </PageShell>
  );
}
