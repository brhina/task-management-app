import React from "react";
import { Palette, ChevronRight } from "lucide-react";

interface BrandingSettingsTabProps {
  branding: any;
  setBranding: (branding: any) => void;
  onSaveBranding: (e: React.FormEvent) => void;
  onResetBranding: () => void;
}

export default function BrandingSettingsTab({
  branding,
  setBranding,
  onSaveBranding,
  onResetBranding,
}: BrandingSettingsTabProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <form onSubmit={onSaveBranding} className="card p-6 space-y-5 lg:col-span-2">
        <div className="flex items-center space-x-2.5 border-b border-slate-200/80 pb-4">
          <div className="p-2 rounded-xl bg-primary/10 text-primary shrink-0">
            <Palette className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-800">Organization Custom Branding</h3>
            <p className="text-slate-500 text-xs">Customize workspace logo, colors, and headers across the entire platform.</p>
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
            <div className="flex items-center space-x-2">
              <input
                type="color"
                value={branding.primaryColor}
                onChange={(e) => setBranding({ ...branding, primaryColor: e.target.value })}
                className="w-10 h-10 border border-slate-200 rounded-xl p-1 cursor-pointer"
              />
              <input
                type="text"
                value={branding.primaryColor}
                onChange={(e) => setBranding({ ...branding, primaryColor: e.target.value })}
                className="input-field text-xs flex-1 font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-700 font-semibold mb-1">Accent Theme Color</label>
            <div className="flex items-center space-x-2">
              <input
                type="color"
                value={branding.accentColor}
                onChange={(e) => setBranding({ ...branding, accentColor: e.target.value })}
                className="w-10 h-10 border border-slate-200 rounded-xl p-1 cursor-pointer"
              />
              <input
                type="text"
                value={branding.accentColor}
                onChange={(e) => setBranding({ ...branding, accentColor: e.target.value })}
                className="input-field text-xs flex-1 font-mono"
              />
            </div>
          </div>

          <div className="md:col-span-2 bg-slate-50 border border-slate-200 p-4 rounded-xl flex items-center justify-between">
            <div>
              <div className="font-bold text-slate-800">White-Label Mode</div>
              <div className="text-slate-500 text-[11px] mt-0.5">Remove 'Powered by Cadence' branding marks across navigation footers and login screens.</div>
            </div>
            <input
              type="checkbox"
              checked={branding.whiteLabelEnabled}
              onChange={(e) => setBranding({ ...branding, whiteLabelEnabled: e.target.checked })}
              className="w-4 h-4 accent-primary rounded cursor-pointer"
            />
          </div>
        </div>

        <div className="flex items-center space-x-3 pt-3 border-t border-slate-200/80">
          <button type="submit" className="btn-primary text-xs py-2 px-5">
            Save Branding Changes
          </button>
          <button type="button" onClick={onResetBranding} className="btn-secondary text-xs py-2 px-4">
            Reset to Defaults
          </button>
        </div>
      </form>

      {/* Live Interactive Preview */}
      <div className="card p-5 space-y-4 lg:col-span-1 border-2 border-slate-200 bg-slate-50/50">
        <div className="text-xs font-bold text-slate-700 uppercase tracking-wider">Live Navigation Preview</div>

        <div className="bg-slate-900 text-white rounded-2xl p-4 shadow-xl space-y-4 text-xs">
          {/* Mock Header */}
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center space-x-2">
              {branding.logoUrl ? (
                <img src={branding.logoUrl} alt="Logo" className="w-6 h-6 object-contain" />
              ) : (
                <div
                  className="w-6 h-6 rounded-lg flex items-center justify-center font-bold text-xs"
                  style={{ backgroundColor: branding.primaryColor || "#6366F1" }}
                >
                  {branding.customTitle ? branding.customTitle[0] : "C"}
                </div>
              )}
              <span className="font-bold">{branding.customTitle || "Cadence Task App"}</span>
            </div>
            <div
              className="w-2.5 h-2.5 rounded-full"
              style={{ backgroundColor: branding.accentColor || "#8B5CF6" }}
            />
          </div>

          {/* Mock Nav Item */}
          <div className="space-y-2">
            <div
              className="p-2.5 rounded-xl font-semibold text-xs flex items-center justify-between"
              style={{ backgroundColor: branding.primaryColor || "#6366F1" }}
            >
              <span>Dashboard View</span>
              <ChevronRight className="w-3.5 h-3.5 opacity-80" />
            </div>
            <div className="p-2.5 rounded-xl bg-slate-800 text-slate-400 text-xs">Projects & Tasks</div>
          </div>

          {/* Footer Brand Mark */}
          {!branding.whiteLabelEnabled && (
            <div className="text-[10px] text-slate-500 text-center border-t border-slate-800 pt-2 font-mono">
              Powered by Cadence
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
