"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Search, Shield, ArrowRight } from "lucide-react";
import { STATUS_BADGE_COLORS } from "@/components/map/CategoryMarker";
import type { ReportDetail } from "@/lib/domain/types";

function TrackReportContent() {
  const searchParams = useSearchParams();
  const initialCode = searchParams.get("code") || "";

  const [inputCode, setInputCode] = useState<string>(initialCode);
  const [report, setReport] = useState<ReportDetail | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchByCode = async (code: string) => {
    if (!code.trim()) return;
    setLoading(true);
    setError(null);
    setReport(null);

    try {
      const res = await fetch(`/api/reports/${encodeURIComponent(code.trim())}`);
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Report not found.");
      }
      setReport(data.report);
    } catch (err: any) {
      setError(err.message || "Failed to find report reference.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (initialCode) {
      fetchByCode(initialCode);
    }
  }, [initialCode]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchByCode(inputCode);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 w-full space-y-8">
      <div className="text-center space-y-3">
        <h1 className="text-3xl font-extrabold text-slate-900">
          Track Civic Complaint Progress
        </h1>
        <p className="text-sm text-slate-500 max-w-lg mx-auto">
          Zero-login reference tracking. Enter your unique complaint code to inspect real-time lifecycle progression and verified departmental notes.
        </p>

        {/* Search Bar */}
        <form onSubmit={handleSubmit} className="max-w-md mx-auto pt-4 flex gap-2">
          <div className="relative flex-1">
            <Search className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="e.g. CF-2026-A10001"
              value={inputCode}
              onChange={(e) => setInputCode(e.target.value)}
              className="w-full pl-11 pr-4 py-3 rounded-xl border border-slate-300 text-slate-900 text-sm font-mono font-bold focus:ring-2 focus:ring-[#174EA6]"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="bg-[#174EA6] hover:bg-blue-800 disabled:opacity-50 text-white font-bold px-6 py-3 rounded-xl text-sm transition shadow-sm"
          >
            {loading ? "Searching..." : "Track"}
          </button>
        </form>
      </div>

      {error && (
        <div className="max-w-md mx-auto p-4 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl text-center font-medium">
          {error}
        </div>
      )}

      {report && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <span className="font-mono text-xs font-bold text-slate-500 block mb-1">
                Reference Code
              </span>
              <span className="font-mono text-lg font-extrabold text-[#174EA6]">
                {report.reference_code}
              </span>
            </div>
            <div className="text-right">
              <span className="text-xs text-slate-400 block mb-1">Current Lifecycle Status</span>
              <span
                className="text-xs font-bold px-3 py-1 rounded-full text-white"
                style={{ backgroundColor: STATUS_BADGE_COLORS[report.status] }}
              >
                {report.status}
              </span>
            </div>
          </div>

          <div>
            <h2 className="text-lg font-bold text-slate-900">{report.title}</h2>
            <p className="text-xs text-slate-600 mt-2 leading-relaxed">{report.description}</p>
          </div>

          {/* Chronological Audit Timeline */}
          <div className="space-y-3 pt-2">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-[#174EA6]" />
              Immutable Status History
            </h3>
            <div className="relative pl-6 space-y-4 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
              {report.status_history.map((h) => (
                <div key={h.id} className="relative">
                  <div className="absolute -left-[21px] top-1 w-3 h-3 rounded-full bg-[#174EA6] border-2 border-white" />
                  <div className="text-xs">
                    <span className="font-semibold text-slate-800">{h.new_status}</span>
                    <p className="text-slate-600 mt-0.5">{h.public_rationale}</p>
                    <span className="text-[10px] text-slate-400 mt-0.5 block">
                      {new Date(h.created_at).toLocaleString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex justify-end">
            <Link
              href={`/reports/${report.reference_code}`}
              className="text-xs font-bold text-[#174EA6] hover:underline flex items-center gap-1"
            >
              View Full Public Permalink & Map <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

export default function TrackPage() {
  return (
    <Suspense
      fallback={
        <div className="max-w-4xl mx-auto px-4 py-16 text-center text-xs text-slate-400">
          Loading tracker...
        </div>
      }
    >
      <TrackReportContent />
    </Suspense>
  );
}
