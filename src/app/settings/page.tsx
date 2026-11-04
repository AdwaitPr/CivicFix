"use client";

import React, { useState } from "react";
import { Settings, Shield, User, Lock, CheckCircle2 } from "lucide-react";

export default function SettingsPage() {
  const [displayName, setDisplayName] = useState<string>("Citizen Contributor");
  const [organization, setOrganization] = useState<string>("Central Neighborhood Association");
  const [defaultFuzzing, setDefaultFuzzing] = useState<boolean>(false);
  const [saved, setSaved] = useState<boolean>(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10 w-full space-y-8">
      {/* Header */}
      <div className="border-b border-slate-200 pb-5">
        <h1 className="text-2xl font-extrabold text-slate-900 flex items-center gap-2">
          <Settings className="w-6 h-6 text-[#174EA6]" />
          Platform Settings & Privacy Controls
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Manage your public profile attributes, coordinate privacy preferences, and role credentials.
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* User Identity Section */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <User className="w-4 h-4 text-teal-600" />
            Citizen Identity
          </h2>

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Display Name (Publicly visible on community notes)
              </label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full text-xs p-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-[#174EA6]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Community / Neighborhood Organization (Optional)
              </label>
              <input
                type="text"
                value={organization}
                onChange={(e) => setOrganization(e.target.value)}
                className="w-full text-xs p-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-[#174EA6]"
              />
            </div>
          </div>
        </div>

        {/* Security & Role Badging */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Shield className="w-4 h-4 text-[#174EA6]" />
            Role-Based Access Control (RBAC) Status
          </h2>

          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-slate-800 block">Current Account Role</span>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Column-level database triggers prohibit client-side role mutations (GHSA-grvh-hg5h-jg65).
              </p>
            </div>
            <span className="text-xs font-extrabold uppercase bg-[#174EA6] text-white px-3 py-1 rounded-full shadow-xs">
              citizen
            </span>
          </div>

          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between text-xs">
            <div>
              <span className="font-bold text-slate-800 block">Active Data Persistence Provider</span>
              <span className="text-slate-500 text-[11px]">Configured via CIVICFIX_DATA_MODE</span>
            </div>
            <span className="font-mono text-teal-800 font-bold bg-teal-100 px-2.5 py-1 rounded-md">
              local (WebAssembly SQLite)
            </span>
          </div>
        </div>

        {/* Privacy Preferences */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Lock className="w-4 h-4 text-amber-600" />
            Location Privacy
          </h2>

          <div className="flex items-start gap-3">
            <input
              type="checkbox"
              id="defaultFuzzing"
              checked={defaultFuzzing}
              onChange={(e) => setDefaultFuzzing(e.target.checked)}
              className="mt-1 rounded text-[#174EA6] focus:ring-[#174EA6]"
            />
            <label htmlFor="defaultFuzzing" className="text-xs text-slate-700 leading-relaxed">
              <strong>Always Enable Public Coordinate Fuzzing by Default</strong>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Automatically rounds all public coordinates to 3 decimal places (~110 meters) when submitting reports from this device.
              </p>
            </label>
          </div>
        </div>

        {saved && (
          <div className="p-3 bg-green-50 border border-green-200 text-green-800 rounded-xl text-xs font-semibold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" /> Preferences saved successfully.
          </div>
        )}

        <div className="flex justify-end">
          <button
            type="submit"
            className="bg-[#174EA6] hover:bg-blue-800 text-white font-bold text-xs px-6 py-2.5 rounded-xl transition shadow"
          >
            Save Preferences
          </button>
        </div>
      </form>
    </div>
  );
}
