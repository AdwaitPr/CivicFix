"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  Shield,
  Filter,
  CheckCircle,
  AlertCircle,
  ExternalLink,
  Edit3,
  Lock,
} from "lucide-react";
import { STATUS_BADGE_COLORS } from "@/components/map/CategoryMarker";
import { VALID_STATE_TRANSITIONS } from "@/lib/domain/fsm";
import type { Report, ReportStatus } from "@/lib/domain/types";

export default function AdminPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedStatus, setSelectedStatus] = useState<string>("");

  // Transition Modal State
  const [transitioningReport, setTransitioningReport] = useState<Report | null>(null);
  const [targetStatus, setTargetStatus] = useState<ReportStatus>("Under review");
  const [publicRationale, setPublicRationale] = useState<string>("");
  const [internalAdminNote, setInternalAdminNote] = useState<string>("");
  const [actionError, setActionError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const fetchTriageReports = async () => {
    setLoading(true);
    let url = "/api/reports?limit=150";
    if (selectedStatus) url += `&status=${encodeURIComponent(selectedStatus)}`;

    try {
      const res = await fetch(url);
      const data = await res.json();
      setReports(data.reports || []);
    } catch {
      setReports([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTriageReports();
  }, [selectedStatus]);

  const openTransitionModal = (report: Report) => {
    setTransitioningReport(report);
    const allowed = VALID_STATE_TRANSITIONS[report.status] || [];
    setTargetStatus(allowed[0] || "Under review");
    setPublicRationale("");
    setInternalAdminNote("");
    setActionError(null);
  };

  const handleExecuteTransition = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!transitioningReport) return;
    if (publicRationale.trim().length < 5) {
      setActionError("Public rationale must provide at least 5 characters explaining the decision.");
      return;
    }

    setIsSubmitting(true);
    setActionError(null);

    try {
      const res = await fetch(`/api/admin/reports/${transitioningReport.id}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "x-user-role": "admin",
        },
        body: JSON.stringify({
          newStatus: targetStatus,
          publicRationale,
          internalAdminNote: internalAdminNote || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to update report status.");
      }

      setTransitioningReport(null);
      fetchTriageReports();
    } catch (err: any) {
      setActionError(err.message || "Transition execution error.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 w-full space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 flex items-center gap-2">
            <Shield className="w-6 h-6 text-[#174EA6]" />
            Municipal Administrative Command Center
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Deterministic triage queues, RBAC-guarded FSM transitions, and auditable departmental notes.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400" />
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="bg-white border border-slate-300 text-xs rounded-xl px-3 py-2 text-slate-800 font-medium focus:ring-2 focus:ring-[#174EA6]"
          >
            <option value="">All Triage States</option>
            <option value="Submitted">Submitted (Needs Triage)</option>
            <option value="Under review">Under review</option>
            <option value="Accepted">Accepted</option>
            <option value="Assigned">Assigned</option>
            <option value="In progress">In progress</option>
            <option value="Resolved">Resolved</option>
            <option value="Rejected">Rejected</option>
          </select>
        </div>
      </div>

      {/* Triage Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-slate-500 uppercase border-b border-slate-200">
              <tr>
                <th className="p-3.5">Reference</th>
                <th className="p-3.5">Status</th>
                <th className="p-3.5">Title & Defect Summary</th>
                <th className="p-3.5">Coordinates / Landmark</th>
                <th className="p-3.5">Submitted</th>
                <th className="p-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {loading ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-400">
                    Loading triage queues...
                  </td>
                </tr>
              ) : reports.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-400">
                    No reports match the selected triage state filter.
                  </td>
                </tr>
              ) : (
                reports.map((report) => (
                  <tr key={report.id} className="hover:bg-slate-50 transition">
                    <td className="p-3.5 font-mono font-bold text-[#174EA6]">
                      {report.reference_code}
                    </td>
                    <td className="p-3.5">
                      <span
                        className="text-[10px] font-bold px-2 py-0.5 rounded-full text-white inline-block shadow-xs"
                        style={{ backgroundColor: STATUS_BADGE_COLORS[report.status] }}
                      >
                        {report.status}
                      </span>
                    </td>
                    <td className="p-3.5 max-w-xs">
                      <p className="font-bold text-slate-900 line-clamp-1">{report.title}</p>
                      <p className="text-[11px] text-slate-500 line-clamp-1">{report.description}</p>
                    </td>
                    <td className="p-3.5 font-mono text-[11px] text-slate-600">
                      {report.public_latitude.toFixed(3)}, {report.public_longitude.toFixed(3)}
                    </td>
                    <td className="p-3.5 text-slate-400 text-[11px]">
                      {new Date(report.created_at).toLocaleDateString()}
                    </td>
                    <td className="p-3.5 text-right space-x-2">
                      <button
                        onClick={() => openTransitionModal(report)}
                        className="bg-[#174EA6] hover:bg-blue-800 text-white text-[11px] font-semibold px-2.5 py-1.5 rounded-lg transition"
                      >
                        Advance Status
                      </button>
                      <Link
                        href={`/reports/${report.reference_code}`}
                        target="_blank"
                        className="inline-block bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-semibold px-2.5 py-1.5 rounded-lg transition"
                      >
                        Audit
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* FSM Status Transition Modal */}
      {transitioningReport && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 sm:p-8 shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div>
                <span className="font-mono text-xs font-bold text-[#174EA6]">
                  {transitioningReport.reference_code}
                </span>
                <h3 className="text-base font-bold text-slate-900">
                  Execute Lifecycle Transition
                </h3>
              </div>
              <span
                className="text-[10px] font-bold px-2 py-0.5 rounded-full text-white"
                style={{ backgroundColor: STATUS_BADGE_COLORS[transitioningReport.status] }}
              >
                Current: {transitioningReport.status}
              </span>
            </div>

            <form onSubmit={handleExecuteTransition} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Permitted Target Status (Strict FSM Enforced)
                </label>
                <select
                  value={targetStatus}
                  onChange={(e) => setTargetStatus(e.target.value as ReportStatus)}
                  className="w-full text-xs p-2.5 rounded-lg border border-slate-300 font-bold focus:ring-2 focus:ring-[#174EA6]"
                >
                  {(VALID_STATE_TRANSITIONS[transitioningReport.status] || []).map((st) => (
                    <option key={st} value={st}>
                      {st}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Mandatory Public Rationale Note (Min 5 chars) *
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="Explain why this issue is being advanced (e.g. Work crew dispatched with hot-mix asphalt)..."
                  value={publicRationale}
                  onChange={(e) => setPublicRationale(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-[#174EA6]"
                />
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                <label className="block text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-slate-500" />
                  Internal Private Admin Note (Optional &bull; Hidden from public)
                </label>
                <input
                  type="text"
                  placeholder="Contractor ticket reference, crew leader cell, internal dispatch notes..."
                  value={internalAdminNote}
                  onChange={(e) => setInternalAdminNote(e.target.value)}
                  className="w-full text-xs p-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-[#174EA6]"
                />
              </div>

              {actionError && (
                <div className="p-3 bg-red-50 text-red-700 text-xs rounded-lg font-medium">
                  {actionError}
                </div>
              )}

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setTransitioningReport(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 text-xs font-bold bg-[#174EA6] hover:bg-blue-800 disabled:opacity-50 text-white rounded-lg shadow"
                >
                  {isSubmitting ? "Committing..." : "Commit Transition"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
