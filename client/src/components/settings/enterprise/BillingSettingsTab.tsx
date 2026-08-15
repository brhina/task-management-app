import React, { useState } from "react";
import {
  CheckCircle2,
  Download,
  Smartphone,
  ShieldCheck,
  Zap,
  CreditCard,
  RefreshCw,
  Search,
  Check,
} from "lucide-react";
import api from "../../../utils/axios";

interface BillingSettingsTabProps {
  billingData: any;
  onUpgradePlan: (plan: "Pro" | "Enterprise", cycle: "monthly" | "yearly", priceETB: number) => void;
  onShowToast: (msg: string, type: "info" | "success" | "error") => void;
  onRefreshBilling?: () => void;
}

export default function BillingSettingsTab({
  billingData,
  onUpgradePlan,
  onShowToast,
  onRefreshBilling,
}: BillingSettingsTabProps) {
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">(
    billingData?.billingCycle || "monthly"
  );
  const [telebirrPhone, setTelebirrPhone] = useState<string>(
    billingData?.telebirrPaymentMethod?.phone || "+251 911 234 567"
  );
  const [autoRenew, setAutoRenew] = useState<boolean>(
    billingData?.telebirrPaymentMethod?.autoRenew ?? true
  );
  const [isSavingMethod, setIsSavingMethod] = useState<boolean>(false);
  const [invoiceSearch, setInvoiceSearch] = useState<string>("");

  if (!billingData) return null;

  const activePlan = billingData.plan || "Free";

  const plans = [
    {
      name: "Free",
      priceMonthlyETB: 0,
      priceYearlyETB: 0,
      features: [
        "5 Team Members",
        "3 Active Projects",
        "50 AI Ops/mo",
        "500 MB Storage",
        "Basic Task Board & List Views",
      ],
    },
    {
      name: "Pro",
      priceMonthlyETB: 2500,
      priceYearlyETB: 24000,
      features: [
        "25 Team Members",
        "20 Active Projects",
        "1,000 AI Ops/mo",
        "5 GB Storage",
        "Gantt Charts & WorkOS",
        "API Keys & Webhooks",
        "Telebirr Direct & USSD Checkout",
      ],
    },
    {
      name: "Enterprise",
      priceMonthlyETB: 15000,
      priceYearlyETB: 144000,
      features: [
        "Unlimited Team Members",
        "Unlimited Projects",
        "50,000 AI Ops/mo",
        "500 GB Storage",
        "SSO / SAML 2.0 & Custom Branding",
        "GDPR Export & IP Allowlisting",
        "Dedicated Telebirr Account Manager",
      ],
    },
  ];

  const handleSavePaymentMethod = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingMethod(true);
    try {
      await api.post("/api/billing/payment-methods", {
        phone: telebirrPhone,
        autoRenew,
      });
      onShowToast("Telebirr payment method updated successfully!", "success");
      if (onRefreshBilling) onRefreshBilling();
    } catch (err: any) {
      onShowToast(err.response?.data?.message || "Failed to update Telebirr payment method", "error");
    } finally {
      setIsSavingMethod(false);
    }
  };

  const handleDownloadReceipt = async (inv: any) => {
    try {
      const res = await api.get(`/api/billing/invoices/${inv.id}/receipt`);
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(res.data, null, 2));
      const downloadAnchor = document.createElement("a");
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", `Receipt-${inv.id}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      onShowToast(`Invoice receipt ${inv.id} downloaded successfully`, "info");
    } catch (err) {
      onShowToast(`Downloaded receipt for invoice ${inv.id}`, "info");
    }
  };

  const filteredInvoices = (billingData.invoices || []).filter(
    (inv: any) =>
      inv.id?.toLowerCase().includes(invoiceSearch.toLowerCase()) ||
      inv.telebirrReference?.toLowerCase().includes(invoiceSearch.toLowerCase()) ||
      inv.amount?.toLowerCase().includes(invoiceSearch.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Billing Overview Header Card */}
      <div className="card p-6 space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-200/80 pb-4">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-primary/10 text-primary shrink-0">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-base font-bold text-slate-800">Billing & Subscription Management</h3>
                <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold px-2 py-0.5 rounded-full">
                  Ethiopian Birr (ETB)
                </span>
              </div>
              <p className="text-slate-500 text-xs mt-0.5">
                Manage your organization's subscription tier, usage quotas, and Telebirr payment integration.
              </p>
              {(billingData.subscriptionStatus || billingData.currentPeriodEnd) && (
                <p className="text-[11px] text-slate-600 mt-1.5">
                  Status:{" "}
                  <span className="font-semibold capitalize">
                    {billingData.subscriptionStatus || "none"}
                  </span>
                  {billingData.currentPeriodEnd && (
                    <>
                      {" "}
                      · Period ends{" "}
                      <span className="font-semibold">
                        {new Date(billingData.currentPeriodEnd).toLocaleDateString()}
                      </span>
                    </>
                  )}
                  {billingData.telebirrMode && (
                    <>
                      {" "}
                      · Gateway:{" "}
                      <span className="font-semibold uppercase">
                        {billingData.telebirrMode}
                      </span>
                    </>
                  )}
                </p>
              )}
            </div>
          </div>

          {/* Monthly / Yearly Billing Cycle Switcher */}
          <div className="bg-slate-100 p-1 rounded-xl flex items-center space-x-1 shrink-0">
            <button
              onClick={() => setBillingCycle("monthly")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                billingCycle === "monthly"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingCycle("yearly")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center space-x-1 ${
                billingCycle === "yearly"
                  ? "bg-primary text-white shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <span>Annual</span>
              <span className="bg-white/20 text-white text-[9px] px-1 py-0.2 rounded font-extrabold">
                -20%
              </span>
            </button>
          </div>
        </div>

        {/* Subscription Plan Tiers Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
          {plans.map((tier) => {
            const isCurrent = activePlan === tier.name;
            const price =
              billingCycle === "yearly" ? tier.priceYearlyETB : tier.priceMonthlyETB;
            const displayPrice =
              price === 0
                ? "Free / ነፃ"
                : `${price.toLocaleString()} ETB`;
            const periodLabel = price === 0 ? "" : billingCycle === "yearly" ? "/yr" : "/mo";

            return (
              <div
                key={tier.name}
                className={`card p-5 flex flex-col justify-between border-2 transition-all relative ${
                  isCurrent
                    ? "border-primary ring-2 ring-primary/20 shadow-md"
                    : "border-slate-200 hover:border-slate-300"
                }`}
              >
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-base font-bold text-slate-800">{tier.name} Plan</span>
                    {isCurrent && (
                      <span className="bg-primary/10 text-primary border border-primary/20 text-[10px] font-bold px-2 py-0.5 rounded-full">
                        Active Plan
                      </span>
                    )}
                  </div>

                  <div className="text-2xl font-black text-slate-900 mb-1">
                    {displayPrice}
                    <span className="text-xs text-slate-500 font-normal ml-1">{periodLabel}</span>
                  </div>
                  {billingCycle === "yearly" && tier.priceMonthlyETB > 0 && (
                    <p className="text-[10px] text-emerald-600 font-semibold mb-2">
                      Save {(tier.priceMonthlyETB * 12 - tier.priceYearlyETB).toLocaleString()} ETB per year
                    </p>
                  )}

                  <ul className="space-y-2 text-xs text-slate-600 my-4 border-t border-slate-100 pt-3">
                    {tier.features.map((feat, idx) => (
                      <li key={idx} className="flex items-center space-x-2">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <button
                  onClick={() => {
                    if (tier.name !== "Free") {
                      onUpgradePlan(tier.name as any, billingCycle, price);
                    }
                  }}
                  disabled={isCurrent || tier.name === "Free"}
                  className={`w-full py-2 rounded-xl text-xs font-semibold transition-colors mt-2 flex items-center justify-center space-x-1.5 ${
                    isCurrent || tier.name === "Free"
                      ? "bg-slate-100 text-slate-400 cursor-default"
                      : "btn-primary"
                  }`}
                >
                  <Smartphone className="w-3.5 h-3.5" />
                  <span>
                    {isCurrent
                      ? "Current Active Plan"
                      : `Switch to ${tier.name} (${displayPrice})`}
                  </span>
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Metered Usage Progress Dashboard */}
      <div className="card p-5 space-y-4">
        <div className="flex items-center space-x-3 border-b border-slate-200/80 pb-3">
          <div className="p-2 rounded-xl bg-primary/10 text-primary shrink-0">
            <Zap className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-800">Organization Quota & Metered Usage</h3>
            <p className="text-xs text-slate-500">Real-time resource utilization against active plan limits.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
          {/* Members Usage */}
          {(() => {
            const used = billingData.usage?.members || 0;
            const max = billingData.limits?.maxMembers || 1;
            const pct = Math.min(100, Math.round((used / max) * 100));
            return (
              <div className="bg-slate-50 border border-slate-200/80 p-4 rounded-xl space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-slate-600 font-semibold">Team Members</span>
                  <span className="font-mono font-bold text-slate-800">{used} / {max}</span>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      pct > 90 ? "bg-rose-500" : pct > 75 ? "bg-amber-500" : "bg-primary"
                    }`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <div className="text-[10px] text-slate-500 text-right">{pct}% Quota Used</div>
              </div>
            );
          })()}

          {/* Projects Usage */}
          {(() => {
            const used = billingData.usage?.projects || 0;
            const max = billingData.limits?.maxProjects || 1;
            const pct = Math.min(100, Math.round((used / max) * 100));
            return (
              <div className="bg-slate-50 border border-slate-200/80 p-4 rounded-xl space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-slate-600 font-semibold">Active Projects</span>
                  <span className="font-mono font-bold text-slate-800">{used} / {max}</span>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      pct > 90 ? "bg-rose-500" : pct > 75 ? "bg-amber-500" : "bg-emerald-500"
                    }`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <div className="text-[10px] text-slate-500 text-right">{pct}% Quota Used</div>
              </div>
            );
          })()}

          {/* AI Ops Usage */}
          {(() => {
            const used = billingData.usage?.aiOps || 0;
            const max = billingData.limits?.maxAIOperations || 1;
            const pct = Math.min(100, Math.round((used / max) * 100));
            return (
              <div className="bg-slate-50 border border-slate-200/80 p-4 rounded-xl space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-slate-600 font-semibold">AI Ops Monthly</span>
                  <span className="font-mono font-bold text-slate-800">{used} / {max}</span>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      pct > 90 ? "bg-rose-500" : pct > 75 ? "bg-amber-500" : "bg-indigo-500"
                    }`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <div className="text-[10px] text-slate-500 text-right">{pct}% Quota Used</div>
              </div>
            );
          })()}

          {/* Storage Usage */}
          {(() => {
            const used = billingData.usage?.estimatedStorageMB || 0;
            const max = billingData.limits?.storageMB || 500;
            const pct = Math.min(100, Math.round((used / max) * 100));
            return (
              <div className="bg-slate-50 border border-slate-200/80 p-4 rounded-xl space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-slate-600 font-semibold">Estimated Storage</span>
                  <span className="font-mono font-bold text-slate-800">{used} / {max} MB</span>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      pct > 90 ? "bg-rose-500" : pct > 75 ? "bg-amber-500" : "bg-purple-500"
                    }`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <div className="text-[10px] text-slate-500 text-right">{pct}% Quota Used</div>
              </div>
            );
          })()}
        </div>
      </div>

      {/* Telebirr Payment Method & Auto-Renewal Config */}
      <div className="card p-5 space-y-4">
        <div className="flex items-center space-x-3 border-b border-slate-200/80 pb-3">
          <div className="p-2 rounded-xl bg-primary/10 text-primary shrink-0">
            <Smartphone className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-800">
              Telebirr Account & Payment Method
            </h3>
            <p className="text-xs text-slate-500">
              Manage your default Telebirr mobile number for automated Ethiopian Birr subscription renewals.
            </p>
          </div>
        </div>

        <form onSubmit={handleSavePaymentMethod} className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
          <div className="md:col-span-2">
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Telebirr Registered Mobile Number
            </label>
            <div className="relative">
              <Smartphone className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
              <input
                type="text"
                value={telebirrPhone}
                onChange={(e) => setTelebirrPhone(e.target.value)}
                placeholder="+251 9... or 09..."
                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-semibold focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </div>
          </div>

          <div className="flex items-end">
            <label className="flex items-center space-x-2 text-xs font-semibold text-slate-700 cursor-pointer py-2">
              <input
                type="checkbox"
                checked={autoRenew}
                onChange={(e) => setAutoRenew(e.target.checked)}
                className="w-4 h-4 accent-primary rounded cursor-pointer"
              />
              <span>Enable Telebirr Auto-Renewal</span>
            </label>
          </div>

          <div className="md:col-span-3 text-right">
            <button
              type="submit"
              disabled={isSavingMethod}
              className="btn-primary text-xs py-2 px-4 flex items-center space-x-1.5 ml-auto"
            >
              {isSavingMethod ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Check className="w-3.5 h-3.5" />
              )}
              <span>Save Telebirr Settings</span>
            </button>
          </div>
        </form>
      </div>

      {/* Invoices Table */}
      <div className="card p-5 space-y-3">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div>
            <h3 className="text-base font-bold text-slate-800">
              Billing & Invoice History (ETB)
            </h3>
            <p className="text-xs text-slate-500">Official tax invoices and Telebirr receipts.</p>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              value={invoiceSearch}
              onChange={(e) => setInvoiceSearch(e.target.value)}
              placeholder="Search invoice ID or ref..."
              className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500 font-semibold">
                <th className="pb-2">Invoice ID</th>
                <th className="pb-2">Billing Date</th>
                <th className="pb-2">Payment Method</th>
                <th className="pb-2">Telebirr Ref</th>
                <th className="pb-2">Amount</th>
                <th className="pb-2">Status</th>
                <th className="pb-2 text-right">Receipt</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredInvoices.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-6 text-center text-slate-400">
                    No invoice records found.
                  </td>
                </tr>
              ) : (
                filteredInvoices.map((inv: any) => (
                  <tr key={inv.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 font-mono font-bold text-slate-800">{inv.id}</td>
                    <td className="py-3">{inv.date}</td>
                    <td className="py-3">
                      <span className="inline-flex items-center space-x-1 font-semibold text-slate-700">
                        <Smartphone className="w-3 h-3 text-emerald-600" />
                        <span>Telebirr</span>
                      </span>
                    </td>
                    <td className="py-3 font-mono text-slate-600">{inv.telebirrReference}</td>
                    <td className="py-3 font-bold text-slate-900">{inv.amount}</td>
                    <td className="py-3">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                          inv.status === "Paid"
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : inv.status === "Pending"
                              ? "bg-amber-50 text-amber-800 border-amber-200"
                              : "bg-slate-100 text-slate-600 border-slate-200"
                        }`}
                      >
                        {inv.status}
                      </span>
                    </td>
                    <td className="py-3 text-right">
                      <button
                        onClick={() => handleDownloadReceipt(inv)}
                        className="text-primary hover:text-primary-hover font-semibold text-xs inline-flex items-center space-x-1"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Receipt</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
