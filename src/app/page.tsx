"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Search,
  PlusCircle,
  MapPin,
  CheckCircle2,
  Clock,
  Archive,
  ArrowRight,
  Shield,
  Layers,
} from "lucide-react";
import { DynamicCivicMap } from "@/components/map/DynamicCivicMap";
import type { MapReportItem, PublicAnalyticsSummary, IssueCategory } from "@/lib/domain/types";

export default function LandingPage() {
  const router = useRouter();
  const [refSearch, setRefSearch] = useState("");
  const [analytics, setAnalytics] = useState<PublicAnalyticsSummary | null>(null);
  const [categories, setCategories] = useState<IssueCategory[]>([]);
  const [previewReports, setPreviewReports] = useState<MapReportItem[]>([]);

  useEffect(() => {
    fetch("/api/analytics")
      .then((r) => r.json())
      .then(setAnalytics)
      .catch(() => null);

    fetch("/api/categories")
      .then((r) => r.json())
      .then((d) => setCategories(d.categories || []))
      .catch(() => null);

    fetch("/api/reports?limit=15")
      .then((r) => r.json())
      .then((d) => setPreviewReports(d.reports || []))
      .catch(() => null);
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!refSearch.trim()) return;
    router.push(`/track?code=${encodeURIComponent(refSearch.trim())}`);
  };

  return (
    <div className="flex flex-col gap-12 pb-16">
      {/* Hero Section */}
      <section className="bg-gradient-to-b from-blue-900 via-[#174EA6] to-[#1E3A8A] text-white py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto text-center space-y-6">
          <div className="inline-flex items-center gap-2 bg-blue-800/80 border border-blue-400/30 px-3.5 py-1.5 rounded-full text-xs font-medium text-blue-100 shadow-sm">
            <Shield className="w-3.5 h-3.5 text-teal-300" />
            Independent Public Civic Infrastructure Registry
          </div>

          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight leading-tight">
            Make Local Infrastructure Issues <br className="hidden sm:inline" />
            <span className="text-teal-300">Visible, Structured & Auditable.</span>
          </h1>

          <p className="max-w-2xl mx-auto text-base sm:text-lg text-blue-100 leading-relaxed">
            Report potholes, broken streetlights, water leakage, and neighborhood hazards. Track lifecycle status from submission through resolution with complete public accountability.
          </p>

          {/* Quick Tracking Search Bar */}
          <form onSubmit={handleSearch} className="max-w-xl mx-auto pt-4 flex gap-2">
            <div className="relative flex-1">
              <Search className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Lookup Complaint Reference (e.g. CF-2026-A10001)..."
                value={refSearch}
                onChange={(e) => setRefSearch(e.target.value)}
                className="w-full pl-11 pr-4 py-3 rounded-xl bg-white text-slate-900 placeholder:text-slate-400 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-teal-400 shadow-lg"
              />
            </div>
            <button
              type="submit"
              className="bg-teal-600 hover:bg-teal-500 text-white px-5 py-3 rounded-xl text-sm font-semibold shadow-lg transition"
            >
              Track
            </button>
          </form>

          {/* Action CTAs */}
          <div className="pt-2 flex flex-wrap justify-center gap-4">
            <Link
              href="/reports/new"
              className="bg-white text-[#174EA6] hover:bg-blue-50 font-bold px-6 py-3 rounded-xl text-sm flex items-center gap-2 shadow-md transition"
            >
              <PlusCircle className="w-4 h-4" /> Report an Issue
            </Link>
            <Link
              href="/map"
              className="bg-blue-800/80 hover:bg-blue-700/80 border border-blue-400/40 text-white font-semibold px-6 py-3 rounded-xl text-sm flex items-center gap-2 transition"
            >
              <MapPin className="w-4 h-4" /> Explore Live Map
            </Link>
          </div>
        </div>
      </section>

      {/* Real-time KPI Counters */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-8 w-full">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-teal-50 flex items-center justify-center text-teal-600">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Pending Active
              </p>
              <p className="text-2xl font-extrabold text-slate-900">
                {analytics?.summary.pending_active_count ?? "—"}
              </p>
              <p className="text-[11px] text-slate-400">Open citizen submissions</p>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-green-50 flex items-center justify-center text-green-600">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Verified Resolved
              </p>
              <p className="text-2xl font-extrabold text-slate-900">
                {analytics?.summary.resolved_count ?? "—"}
              </p>
              <p className="text-[11px] text-slate-400">Completed physical repairs</p>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600">
              <Archive className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Closed / Out-of-Scope
              </p>
              <p className="text-2xl font-extrabold text-slate-900">
                {analytics?.summary.closed_rejected_count ?? "—"}
              </p>
              <p className="text-[11px] text-slate-400">Duplicates or non-actionable</p>
            </div>
          </div>
        </div>
      </section>

      {/* Geospatial Map Preview */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-2">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Geospatial Issue Discovery</h2>
            <p className="text-sm text-slate-500">
              Live reports mapped across municipal zones using WGS 84 spherical coordinates.
            </p>
          </div>
          <Link
            href="/map"
            className="text-sm font-semibold text-[#174EA6] hover:underline flex items-center gap-1"
          >
            Open Interactive Map <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="h-[420px] w-full rounded-2xl overflow-hidden shadow-sm border border-slate-200">
          <DynamicCivicMap reports={previewReports} zoom={12} />
        </div>
      </section>

      {/* Supported Civic Defect Categories */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Supported Infrastructure Categories</h2>
          <p className="text-sm text-slate-500">
            Categorized issue taxonomy with deterministic duplicate proximity buffers.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          {categories.map((cat) => (
            <Link
              key={cat.id}
              href={`/map?category=${cat.slug}`}
              className="bg-white p-5 rounded-xl border border-slate-200 hover:border-[#174EA6] shadow-sm hover:shadow transition group flex flex-col justify-between"
            >
              <div>
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold mb-3 shadow-xs"
                  style={{ backgroundColor: cat.color_hex }}
                >
                  <Layers className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-slate-900 group-hover:text-[#174EA6] transition text-base">
                  {cat.name}
                </h3>
                <p className="text-xs text-slate-500 mt-1.5 leading-relaxed line-clamp-2">
                  {cat.description}
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-100 flex justify-between items-center text-[11px] text-slate-400">
                <span>Radius: {cat.duplicate_radius_meters}m</span>
                <span className="font-semibold text-teal-600">View &rarr;</span>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
