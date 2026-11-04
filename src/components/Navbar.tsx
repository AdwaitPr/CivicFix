"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  MapPin,
  PlusCircle,
  Search,
  BarChart3,
  Shield,
  Settings,
  Menu,
  X,
  FileText,
} from "lucide-react";

export function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <nav className="bg-white border-b border-slate-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link href="/" className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-lg bg-[#174EA6] flex items-center justify-center text-white shadow-sm font-bold text-lg">
                CF
              </div>
              <div className="flex flex-col">
                <span className="font-extrabold text-slate-900 text-lg leading-tight tracking-tight">
                  CivicFix
                </span>
                <span className="text-[10px] text-teal-700 font-semibold tracking-wider uppercase">
                  Citizen Registry
                </span>
              </div>
            </Link>

            <div className="hidden md:ml-8 md:flex md:space-x-4">
              <Link
                href="/map"
                className="text-slate-600 hover:text-[#174EA6] px-3 py-2 text-sm font-medium flex items-center gap-1.5 transition"
              >
                <MapPin className="w-4 h-4" /> Issue Map
              </Link>
              <Link
                href="/track"
                className="text-slate-600 hover:text-[#174EA6] px-3 py-2 text-sm font-medium flex items-center gap-1.5 transition"
              >
                <Search className="w-4 h-4" /> Track Status
              </Link>
              <Link
                href="/analytics"
                className="text-slate-600 hover:text-[#174EA6] px-3 py-2 text-sm font-medium flex items-center gap-1.5 transition"
              >
                <BarChart3 className="w-4 h-4" /> Analytics
              </Link>
              <Link
                href="/my-reports"
                className="text-slate-600 hover:text-[#174EA6] px-3 py-2 text-sm font-medium flex items-center gap-1.5 transition"
              >
                <FileText className="w-4 h-4" /> My Reports
              </Link>
              <Link
                href="/admin"
                className="text-slate-600 hover:text-[#174EA6] px-3 py-2 text-sm font-medium flex items-center gap-1.5 transition"
              >
                <Shield className="w-4 h-4" /> Admin
              </Link>
              <Link
                href="/moderation"
                className="text-slate-600 hover:text-[#174EA6] px-3 py-2 text-sm font-medium flex items-center gap-1.5 transition"
              >
                Moderation
              </Link>
            </div>
          </div>

          <div className="hidden md:flex md:items-center md:space-x-3">
            <Link
              href="/reports/new"
              className="bg-[#174EA6] hover:bg-blue-800 text-white text-sm font-medium px-4 py-2 rounded-lg flex items-center gap-2 shadow-sm transition"
            >
              <PlusCircle className="w-4 h-4" /> Report Issue
            </Link>
            <Link
              href="/settings"
              className="p-2 text-slate-500 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition"
              aria-label="Settings"
            >
              <Settings className="w-5 h-5" />
            </Link>
          </div>

          <div className="flex items-center md:hidden">
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="p-2 text-slate-600 hover:text-slate-900 rounded-lg"
              aria-label="Toggle Menu"
            >
              {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {mobileOpen && (
        <div className="md:hidden border-t border-slate-200 px-4 pt-2 pb-4 space-y-1 bg-white">
          <Link
            href="/map"
            onClick={() => setMobileOpen(false)}
            className="block px-3 py-2 text-base font-medium text-slate-700 hover:bg-slate-100 rounded-lg"
          >
            Issue Map
          </Link>
          <Link
            href="/reports/new"
            onClick={() => setMobileOpen(false)}
            className="block px-3 py-2 text-base font-medium text-blue-700 hover:bg-blue-50 rounded-lg font-semibold"
          >
            + Report Issue
          </Link>
          <Link
            href="/track"
            onClick={() => setMobileOpen(false)}
            className="block px-3 py-2 text-base font-medium text-slate-700 hover:bg-slate-100 rounded-lg"
          >
            Track Status
          </Link>
          <Link
            href="/analytics"
            onClick={() => setMobileOpen(false)}
            className="block px-3 py-2 text-base font-medium text-slate-700 hover:bg-slate-100 rounded-lg"
          >
            Public Analytics
          </Link>
          <Link
            href="/my-reports"
            onClick={() => setMobileOpen(false)}
            className="block px-3 py-2 text-base font-medium text-slate-700 hover:bg-slate-100 rounded-lg"
          >
            My Reports
          </Link>
          <Link
            href="/admin"
            onClick={() => setMobileOpen(false)}
            className="block px-3 py-2 text-base font-medium text-slate-700 hover:bg-slate-100 rounded-lg"
          >
            Admin Triage
          </Link>
          <Link
            href="/moderation"
            onClick={() => setMobileOpen(false)}
            className="block px-3 py-2 text-base font-medium text-slate-700 hover:bg-slate-100 rounded-lg"
          >
            Moderation Queue
          </Link>
          <Link
            href="/settings"
            onClick={() => setMobileOpen(false)}
            className="block px-3 py-2 text-base font-medium text-slate-700 hover:bg-slate-100 rounded-lg"
          >
            Settings
          </Link>
        </div>
      )}
    </nav>
  );
}
