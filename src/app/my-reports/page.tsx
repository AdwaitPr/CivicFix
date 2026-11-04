"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { PlusCircle, Trash2, ExternalLink, Clock, FileText } from "lucide-react";
import { STATUS_BADGE_COLORS } from "@/components/map/CategoryMarker";
import type { Report } from "@/lib/domain/types";

export default function MyReportsPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchMyReports = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/reports?limit=100");
      const data = await res.json();
      setReports(data.reports || []);
    } catch {
      setReports([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMyReports();
  }, []);

  const handleDeleteDraft = async (id: string, refCode: string) => {
    if (!confirm(`Are you sure you want to delete submitted draft report ${refCode}?`)) {
      return;
    }

    try {
      const res = await fetch(`/api/reports/${id}`, {
        method: "DELETE",
        headers: { "x-user-role": "citizen" },
      });
      if (res.ok) {
        setReports((prev) => prev.filter((r) => r.id !== id));
      } else {
        const d = await res.json();
        alert(d.error || "Cannot delete report.");
      }
    } catch {
      alert("Failed to delete draft.");
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 w-full space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 flex items-center gap-2">
            <FileText className="w-6 h-6 text-[#174EA6]" />
            My Civic Submissions
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Personal tracking dashboard of issues you have documented on the platform.
          </p>
        </div>

        <Link
          href="/reports/new"
          className="bg-[#174EA6] hover:bg-blue-800 text-white text-xs font-bold px-4 py-2.5 rounded-xl flex items-center gap-2 transition shadow-sm"
        >
          <PlusCircle className="w-4 h-4" /> Report New Issue
        </Link>
      </div>

      {loading ? (
        <div className="text-center py-12 text-xs text-slate-500">Loading submissions...</div>
      ) : reports.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-3">
          <p className="text-sm font-semibold text-slate-700">No reports recorded yet.</p>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Notice a pothole, broken streetlight, or garbage accumulation in your neighborhood? Create your first public report.
          </p>
          <Link
            href="/reports/new"
            className="inline-block bg-[#174EA6] text-white text-xs font-semibold px-4 py-2 rounded-lg"
          >
            Create Report
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden divide-y divide-slate-100">
          {reports.map((report) => (
            <div key={report.id} className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50 transition">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-[#174EA6]">
                    {report.reference_code}
                  </span>
                  <span
                    className="text-[10px] font-bold px-2 py-0.5 rounded-full text-white"
                    style={{ backgroundColor: STATUS_BADGE_COLORS[report.status] }}
                  >
                    {report.status}
                  </span>
                </div>
                <h3 className="text-sm font-bold text-slate-900">{report.title}</h3>
                <div className="flex items-center gap-3 text-[11px] text-slate-400">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {new Date(report.created_at).toLocaleDateString()}
                  </span>
                  {report.approximate_address && (
                    <span>&bull; {report.approximate_address}</span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {report.status === "Submitted" && (
                  <button
                    onClick={() => handleDeleteDraft(report.id, report.reference_code)}
                    className="text-xs text-red-600 hover:text-red-800 p-2 rounded-lg hover:bg-red-50 transition flex items-center gap-1 font-medium"
                    title="Delete Draft"
                  >
                    <Trash2 className="w-4 h-4" /> Delete Draft
                  </button>
                )}

                <Link
                  href={`/reports/${report.reference_code}`}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold px-3 py-2 rounded-lg transition flex items-center gap-1"
                >
                  View Details <ExternalLink className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
