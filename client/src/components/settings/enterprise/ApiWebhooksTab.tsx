import React from "react";
import {
  Key,
  Plus,
  CheckCircle2,
  Copy,
  Check,
  Trash2,
  Zap,
  Calendar,
} from "lucide-react";

interface ApiWebhooksTabProps {
  apiKeys: any[];
  keyName: string;
  setKeyName: (val: string) => void;
  keyScopes: string[];
  setKeyScopes: (val: string[]) => void;
  keyExpiration: string;
  setKeyExpiration: (val: string) => void;
  newSecretKey: string;
  webhooks: any[];
  webhookName: string;
  setWebhookName: (val: string) => void;
  webhookUrl: string;
  setWebhookUrl: (val: string) => void;
  webhookEvents: string[];
  setWebhookEvents: (val: string[]) => void;
  onCreateApiKey: (e: React.FormEvent) => void;
  onRevokeApiKey: (id: string) => void;
  onCreateWebhook: (e: React.FormEvent) => void;
  onDeleteWebhook: (id: string) => void;
  onCopy: (text: string, fieldId: string) => void;
  copiedField: string | null;
  calendarFeedUrl: string;
}

export default function ApiWebhooksTab({
  apiKeys,
  keyName,
  setKeyName,
  keyScopes,
  setKeyScopes,
  keyExpiration,
  setKeyExpiration,
  newSecretKey,
  webhooks,
  webhookName,
  setWebhookName,
  webhookUrl,
  setWebhookUrl,
  webhookEvents,
  setWebhookEvents,
  onCreateApiKey,
  onRevokeApiKey,
  onCreateWebhook,
  onDeleteWebhook,
  onCopy,
  copiedField,
  calendarFeedUrl,
}: ApiWebhooksTabProps) {
  return (
    <div className="space-y-6">
      {/* Generate API Key Card */}
      <div className="card p-5 space-y-4">
        <div className="flex items-center space-x-2.5">
          <div className="p-2 rounded-xl bg-primary/10 text-primary shrink-0">
            <Key className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-800">Generate Organization API Key</h3>
            <p className="text-slate-500 text-xs">Issue API access keys for automated CI/CD scripts and server integrations.</p>
          </div>
        </div>

        <form onSubmit={onCreateApiKey} className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
            <div className="md:col-span-1">
              <label className="block text-slate-700 font-semibold mb-1">Key Description Name</label>
              <input
                type="text"
                placeholder="e.g. Production CI/CD Pipeline"
                value={keyName}
                onChange={(e) => setKeyName(e.target.value)}
                className="input-field text-xs"
                required
              />
            </div>

            <div>
              <label className="block text-slate-700 font-semibold mb-1">Expiration Policy</label>
              <select
                value={keyExpiration}
                onChange={(e) => setKeyExpiration(e.target.value)}
                className="input-field text-xs"
              >
                <option value="30">30 Days</option>
                <option value="90">90 Days</option>
                <option value="365">1 Year</option>
                <option value="never">Never (No Expiration)</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-700 font-semibold mb-1">Permission Scopes</label>
              <div className="flex gap-2 pt-1">
                {["read", "write", "admin"].map((sc) => (
                  <label key={sc} className="flex items-center space-x-1 cursor-pointer bg-slate-50 border border-slate-200 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold text-slate-700">
                    <input
                      type="checkbox"
                      checked={keyScopes.includes(sc)}
                      onChange={(e) => {
                        if (e.target.checked) setKeyScopes([...keyScopes, sc]);
                        else setKeyScopes(keyScopes.filter((s) => s !== sc));
                      }}
                      className="w-3.5 h-3.5 accent-primary rounded"
                    />
                    <span className="capitalize">{sc}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          <button type="submit" className="btn-primary text-xs flex items-center space-x-1 py-2 px-4">
            <Plus className="w-4 h-4" />
            <span>Generate New API Key</span>
          </button>
        </form>

        {/* Secret Key Display Once */}
        {newSecretKey && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-900 p-4 rounded-xl text-xs space-y-2 animate-fade-in">
            <div className="font-bold flex items-center space-x-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>API Key Generated! Store this secret key securely now (it will not be shown again):</span>
            </div>
            <div className="flex gap-2 items-center">
              <div className="font-mono text-sm bg-white p-2.5 rounded-lg border border-emerald-300 text-emerald-950 flex-1 break-all">
                {newSecretKey}
              </div>
              <button
                onClick={() => onCopy(newSecretKey, "new_secret_key")}
                className="btn-primary text-xs py-2.5 px-3 flex items-center space-x-1 shrink-0"
              >
                {copiedField === "new_secret_key" ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                <span>{copiedField === "new_secret_key" ? "Copied!" : "Copy Secret"}</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Active API Keys List */}
      <div className="card p-5 space-y-3">
        <h3 className="text-base font-bold text-slate-800">Active API Keys</h3>
        <div className="space-y-2">
          {apiKeys.length === 0 ? (
            <p className="text-slate-400 text-xs italic">No API keys issued yet.</p>
          ) : (
            apiKeys.map((k) => (
              <div key={k._id} className="bg-slate-50 border border-slate-200/80 p-3.5 rounded-xl flex justify-between items-center text-xs text-slate-700">
                <div className="space-y-1">
                  <div className="font-bold text-slate-800 flex items-center space-x-2">
                    <span>{k.name}</span>
                    <span className="font-mono text-[10px] text-slate-400 bg-white px-2 py-0.5 rounded border border-slate-200">
                      {k.keyPrefix}...
                    </span>
                  </div>
                  <div className="flex items-center space-x-2 text-[11px] text-slate-500">
                    <span>Scopes: {k.scopes?.join(", ") || "read"}</span>
                    <span>•</span>
                    <span>Issued: {new Date(k.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
                <button
                  onClick={() => onRevokeApiKey(k._id)}
                  className="text-rose-600 hover:text-rose-800 text-xs font-semibold flex items-center space-x-1 transition-colors bg-white border border-rose-200 hover:border-rose-300 px-3 py-1.5 rounded-lg"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Revoke</span>
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Webhook Endpoints Management */}
      <div className="card p-5 space-y-4">
        <div className="flex items-center space-x-2.5">
          <div className="p-2 rounded-xl bg-primary/10 text-primary shrink-0">
            <Zap className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-800">Enterprise Webhook Endpoints</h3>
            <p className="text-slate-500 text-xs">Receive real-time HTTP POST notifications when organization events occur.</p>
          </div>
        </div>

        <form onSubmit={onCreateWebhook} className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            <div>
              <label className="block text-slate-700 font-semibold mb-1">Webhook Name</label>
              <input
                type="text"
                placeholder="e.g. Slack Incident Bot"
                value={webhookName}
                onChange={(e) => setWebhookName(e.target.value)}
                className="input-field text-xs"
                required
              />
            </div>
            <div>
              <label className="block text-slate-700 font-semibold mb-1">Target Endpoint URL</label>
              <input
                type="url"
                placeholder="https://api.acme.com/webhooks/cadence"
                value={webhookUrl}
                onChange={(e) => setWebhookUrl(e.target.value)}
                className="input-field text-xs"
                required
              />
            </div>
          </div>

          <button type="submit" className="btn-primary text-xs flex items-center space-x-1 py-2 px-4">
            <Plus className="w-4 h-4" />
            <span>Register Webhook</span>
          </button>
        </form>

        <div className="space-y-2 pt-2 border-t border-slate-100">
          {webhooks.length === 0 ? (
            <p className="text-slate-400 text-xs italic">No webhooks registered.</p>
          ) : (
            webhooks.map((wh) => (
              <div key={wh._id} className="bg-slate-50 border border-slate-200/80 p-3.5 rounded-xl flex justify-between items-center text-xs">
                <div>
                  <div className="font-bold text-slate-800">{wh.name}</div>
                  <div className="font-mono text-slate-500 text-[11px] truncate max-w-md">{wh.url}</div>
                </div>
                <button
                  onClick={() => onDeleteWebhook(wh._id)}
                  className="text-rose-600 hover:text-rose-800 text-xs font-semibold flex items-center space-x-1"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete</span>
                </button>
              </div>
            ))
          )}
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
            <p className="text-slate-500 text-xs">Sync task due dates directly into Google Calendar, Outlook, or Apple Calendar.</p>
          </div>
        </div>

        <div className="flex gap-2 text-xs">
          <input
            type="text"
            readOnly
            value={calendarFeedUrl}
            className="input-field flex-1 font-mono text-slate-600 text-xs"
          />
          <button
            onClick={() => onCopy(calendarFeedUrl, "ical_feed")}
            className="btn-secondary text-xs flex items-center space-x-1.5 py-2 px-3 shrink-0"
          >
            {copiedField === "ical_feed" ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedField === "ical_feed" ? "Copied!" : "Copy Link"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
