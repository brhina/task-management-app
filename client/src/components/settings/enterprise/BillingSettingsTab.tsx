import React from "react";
import { CheckCircle2, Download } from "lucide-react";

interface BillingSettingsTabProps {
  billingData: any;
  onUpgradePlan: (plan: string) => void;
  onShowToast: (msg: string, type: "info" | "success" | "error") => void;
}

export default function BillingSettingsTab({
  billingData,
  onUpgradePlan,
  onShowToast,
}: BillingSettingsTabProps) {
  if (!billingData) return null;

  return (
    <div className="space-y-6">
      {/* Subscription Plans */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { name: "Free", price: "$0/mo", features: ["5 Team Members", "3 Active Projects", "50 AI Ops/mo", "Basic Task Board"] },
          { name: "Pro", price: "$49/mo", features: ["25 Team Members", "20 Active Projects", "1,000 AI Ops/mo", "Gantt Charts & API Keys"] },
          { name: "Enterprise", price: "$299/mo", features: ["Unlimited Members & Projects", "50,000 AI Ops/mo", "SSO/SAML 2.0 & Custom Branding", "GDPR Export & IP Allowlisting"] },
        ].map((tier) => (
          <div
            key={tier.name}
            className={`card p-5 flex flex-col justify-between border-2 transition-all ${
              billingData.plan === tier.name
                ? "border-primary ring-2 ring-primary/20 shadow-md"
                : "border-slate-200 hover:border-slate-300"
            }`}
          >
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-base font-bold text-slate-800">{tier.name} Plan</span>
                {billingData.plan === tier.name && (
                  <span className="bg-primary/10 text-primary border border-primary/20 text-[10px] font-bold px-2 py-0.5 rounded-full">
                    Active Plan
                  </span>
                )}
              </div>
              <div className="text-2xl font-black text-slate-900 mb-3">{tier.price}</div>

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
              onClick={() => onUpgradePlan(tier.name)}
              disabled={billingData.plan === tier.name}
              className={`w-full py-2 rounded-xl text-xs font-semibold transition-colors mt-2 ${
                billingData.plan === tier.name
                  ? "bg-slate-100 text-slate-400 cursor-default"
                  : "btn-primary"
              }`}
            >
              {billingData.plan === tier.name ? "Current Active Plan" : `Switch to ${tier.name}`}
            </button>
          </div>
        ))}
      </div>

      {/* Metered Usage Progress Dashboard */}
      <div className="card p-5 space-y-4">
        <h3 className="text-base font-bold text-slate-800">Organization Quota & Metered Usage</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
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
                  <span className="text-slate-600 font-semibold">AI Ops Monthly Quota</span>
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
        </div>
      </div>

      {/* Invoices Table */}
      <div className="card p-5 space-y-3">
        <h3 className="text-base font-bold text-slate-800">Billing & Invoice History</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500 font-semibold">
                <th className="pb-2">Invoice ID</th>
                <th className="pb-2">Billing Date</th>
                <th className="pb-2">Amount</th>
                <th className="pb-2">Status</th>
                <th className="pb-2 text-right">Receipt</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {billingData.invoices?.map((inv: any) => (
                <tr key={inv.id}>
                  <td className="py-3 font-mono font-bold text-slate-800">{inv.id}</td>
                  <td className="py-3">{inv.date}</td>
                  <td className="py-3 font-bold">{inv.amount}</td>
                  <td className="py-3">
                    <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold px-2 py-0.5 rounded-full">
                      {inv.status}
                    </span>
                  </td>
                  <td className="py-3 text-right">
                    <button
                      onClick={() => onShowToast(`Receipt ${inv.id} downloaded`, "info")}
                      className="text-primary hover:text-primary-dark font-semibold text-xs inline-flex items-center space-x-1"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Download PDF</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
