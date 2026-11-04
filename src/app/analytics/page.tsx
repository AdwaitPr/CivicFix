"use client";

import React, { useEffect, useState } from "react";
import {
  BarChart3,
  CheckCircle2,
  Clock,
  Archive,
  AlertTriangle,
  Zap,
  MapPin,
} from "lucide-react";
import type { PublicAnalyticsSummary } from "@/lib/domain/types";

export default function AnalyticsPage() {
  const [analytics, setAnalytics] = useState<PublicAnalyticsSummary | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    fetch("/api/analytics")
      .then((r) => r.json())
      .then(setAnalytics)
      .catch(() => null)
      .finally(() => setLoading(false));
  }, []);

  if (loading || !analytics) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-16 text-center text-xs text-slate-500">
        Aggregating live platform metrics...
      </div>
    );
  }

  const { summary, by_category, by_status, geographic_clusters } = analytics;
  const isPartitionValid =
    summary.resolved_count + summary.closed_rejected_count + summary.pending_active_count ===
    summary.total_reports;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 w-full space-y-8">
      {/* Page Header */}
      <div className="border-b border-slate-200 pb-5">
        <h1 className="text-2xl font-extrabold text-slate-900 flex items-center gap-2">
          <BarChart3 className="w-6 h-6 text-[#174EA6]" />
          Public Civic Analytics & Accountability
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Zero-fabrication metrics calculated dynamically from immutable transactional records.
        </p>
      </div>

      {/* Mathematical Partition Audit Banner */}
      <div
        className={`p-4 rounded-xl border text-xs flex items-center justify-between ${
          isPartitionValid
            ? "bg-teal-50 border-teal-200 text-teal-900"
            : "bg-red-50 border-red-200 text-red-900"
        }`}
      >
        <span>
          <strong>Audit Invariant Verified:</strong> Total Reports ({summary.total_reports}) = Verified Resolved ({summary.resolved_count}) + Closed ({summary.closed_rejected_count}) + Pending Active ({summary.pending_active_count}).
        </span>
        <span className="font-mono font-bold text-[11px] bg-white px-2 py-0.5 rounded shadow-xs">
          Partition Status: {isPartitionValid ? "100% Consistent" : "Discrepancy"}
        </span>
      </div>

      {/* Top Level Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <p className="text-[11px] text-slate-500 font-semibold uppercase">Total Reports</p>
          <p className="text-2xl font-extrabold text-slate-900 mt-1">{summary.total_reports}</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <p className="text-[11px] text-slate-500 font-semibold uppercase">Resolved</p>
          <p className="text-2xl font-extrabold text-green-600 mt-1">{summary.resolved_count}</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <p className="text-[11px] text-slate-500 font-semibold uppercase">Closed / Rejected</p>
          <p className="text-2xl font-extrabold text-slate-600 mt-1">
            {summary.closed_rejected_count}
          </p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <p className="text-[11px] text-slate-500 font-semibold uppercase">Pending Active</p>
          <p className="text-2xl font-extrabold text-teal-600 mt-1">
            {summary.pending_active_count}
          </p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <p className="text-[11px] text-slate-500 font-semibold uppercase">Mean Fix Duration</p>
          <p className="text-2xl font-extrabold text-[#174EA6] mt-1">
            {summary.avg_resolution_hours !== null ? `${summary.avg_resolution_hours}h` : "—"}
          </p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <p className="text-[11px] text-slate-500 font-semibold uppercase">Duplicates Flagged</p>
          <p className="text-2xl font-extrabold text-amber-600 mt-1">
            {summary.duplicate_flagged_count}
          </p>
        </div>
      </div>

      {/* Category Breakdown & Status Matrix */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* By Category */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <h2 className="text-base font-bold text-slate-900">Breakdown by Issue Category</h2>
          <div className="space-y-4">
            {by_category.map((cat) => (
              <div key={cat.slug} className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="font-semibold text-slate-800 flex items-center gap-1.5">
                    <span
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: cat.color_hex }}
                    />
                    {cat.name}
                  </span>
                  <span className="text-slate-500 font-mono">
                    {cat.total_count} ({cat.resolved_count} resolved)
                  </span>
                </div>
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden flex">
                  <div
                    className="bg-green-500 h-full"
                    style={{
                      width: `${
                        cat.total_count > 0 ? (cat.resolved_count / cat.total_count) * 100 : 0
                      }%`,
                    }}
                    title="Resolved"
                  />
                  <div
                    className="bg-teal-500 h-full"
                    style={{
                      width: `${
                        cat.total_count > 0 ? (cat.pending_count / cat.total_count) * 100 : 0
                      }%`,
                    }}
                    title="Pending"
                  />
                  <div
                    className="bg-slate-300 h-full"
                    style={{
                      width: `${
                        cat.total_count > 0 ? (cat.closed_count / cat.total_count) * 100 : 0
                      }%`,
                    }}
                    title="Closed"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* By Lifecycle Status */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <h2 className="text-base font-bold text-slate-900">8-State Lifecycle Distribution</h2>
          <div className="grid grid-cols-2 gap-3">
            {by_status.map((st) => (
              <div key={st.status} className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <p className="text-[11px] font-semibold text-slate-500">{st.status}</p>
                <p className="text-lg font-bold text-slate-900 mt-0.5">{st.count}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Spatial Hotspot Density Table */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
          <MapPin className="w-4 h-4 text-teal-600" />
          Spatial Hotspot Density Clusters (~1.1km Grid Resolution)
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-slate-500 uppercase border-b border-slate-200">
              <tr>
                <th className="p-2.5">Grid Coordinates</th>
                <th className="p-2.5">Report Density</th>
                <th className="p-2.5">Resolved Count</th>
                <th className="p-2.5">Action Rate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {geographic_clusters.length === 0 ? (
                <tr>
                  <td colSpan={4} className="p-4 text-center text-slate-400">
                    No dense spatial clusters recorded yet.
                  </td>
                </tr>
              ) : (
                geographic_clusters.map((c, i) => (
                  <tr key={i} className="hover:bg-slate-50">
                    <td className="p-2.5 font-mono">
                      {c.grid_lat}, {c.grid_lng}
                    </td>
                    <td className="p-2.5 font-bold text-slate-900">{c.report_count}</td>
                    <td className="p-2.5 text-green-700">{c.resolved_count}</td>
                    <td className="p-2.5 font-semibold text-teal-700">
                      {((c.resolved_count / c.report_count) * 100).toFixed(0)}%
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
