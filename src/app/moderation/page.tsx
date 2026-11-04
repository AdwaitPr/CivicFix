"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  ShieldAlert,
  CheckCircle,
  XCircle,
  ExternalLink,
  Layers,
  AlertTriangle,
} from "lucide-react";
import type { ReportFlag } from "@/lib/domain/types";

export default function ModerationPage() {
  const [flags, setFlags] = useState<ReportFlag[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedFlag, setSelectedFlag] = useState<ReportFlag | null>(null);
  const [actionNotes, setActionNotes] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const fetchFlags = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/moderation/flags", {
        headers: { "x-user-role": "moderator" },
      });
      const data = await res.json();
      setFlags(data.flags || []);
    } catch {
      setFlags([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFlags();
  }, []);

  const handleExecuteAction = async (actionType: string) => {
    if (!selectedFlag) return;
    setIsSubmitting(true);

    try {
      const res = await fetch("/api/moderation/events", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-role": "moderator",
        },
        body: JSON.stringify({
          reportId: selectedFlag.report_id,
          flagId: selectedFlag.id,
          actionType,
          actionNotes: actionNotes || `Moderator performed ${actionType}`,
          canonicalReportId:
            actionType === "marked_duplicate" ? selectedFlag.matched_report_id : undefined,
        }),
      });

      if (res.ok) {
        setSelectedFlag(null);
        setActionNotes("");
        fetchFlags();
      } else {
        const d = await res.json();
        alert(d.error || "Action failed.");
      }
    } catch {
      alert("Error executing moderation event.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 w-full space-y-6">
      {/* Header */}
      <div className="border-b border-slate-200 pb-5">
        <h1 className="text-2xl font-extrabold text-slate-900 flex items-center gap-2">
          <ShieldAlert className="w-6 h-6 text-amber-600" />
          Content Moderation & Deduplication Queue
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Review candidate duplicates, abuse flags, and PII redactions before linking or taking action.
        </p>
      </div>

      {loading ? (
        <div className="text-center py-12 text-xs text-slate-500">Loading pending flags...</div>
      ) : flags.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-3 shadow-xs">
          <CheckCircle className="w-8 h-8 text-green-500 mx-auto" />
          <h3 className="text-base font-bold text-slate-800">Moderation Queue Clear</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Zero pending duplicate candidate flags or abuse reports requiring staff attention.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Flag List */}
          <div className="lg:col-span-1 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden divide-y divide-slate-100 max-h-[600px] overflow-y-auto">
            {flags.map((flag) => (
              <div
                key={flag.id}
                onClick={() => setSelectedFlag(flag)}
                className={`p-4 cursor-pointer hover:bg-slate-50 transition ${
                  selectedFlag?.id === flag.id ? "bg-amber-50/60 border-l-4 border-amber-500" : ""
                }`}
              >
                <div className="flex justify-between items-center text-[10px] font-bold">
                  <span className="uppercase text-amber-800 bg-amber-100 px-2 py-0.5 rounded">
                    {flag.reason.replace("_", " ")}
                  </span>
                  {flag.similarity_score && (
                    <span className="text-teal-700 font-mono">
                      Score: {(Number(flag.similarity_score) * 100).toFixed(0)}%
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-700 font-semibold mt-2 line-clamp-2">
                  {flag.details || "No additional report notes provided."}
                </p>
                <div className="mt-2 text-[10px] text-slate-400">
                  Flagged {new Date(flag.created_at).toLocaleDateString()}
                </div>
              </div>
            ))}
          </div>

          {/* Action Pane */}
          <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-5">
            {selectedFlag ? (
              <div className="space-y-5">
                <div className="border-b border-slate-100 pb-3">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">
                    Active Flag Detail
                  </span>
                  <h3 className="text-lg font-bold text-slate-900 mt-1">
                    Reason: {selectedFlag.reason.replace("_", " ")}
                  </h3>
                  <p className="text-xs text-slate-600 mt-1">{selectedFlag.details}</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                    <span className="font-bold text-slate-700 block">Report ID:</span>
                    <span className="font-mono text-slate-600 text-[11px]">
                      {selectedFlag.report_id}
                    </span>
                    <Link
                      href={`/reports/${selectedFlag.report_id}`}
                      target="_blank"
                      className="text-[#174EA6] hover:underline font-semibold block pt-1"
                    >
                      Inspect Report &rarr;
                    </Link>
                  </div>

                  {selectedFlag.matched_report_id && (
                    <div className="p-3 bg-amber-50/50 rounded-xl border border-amber-200 space-y-1">
                      <span className="font-bold text-amber-900 block">
                        Matched Canonical Candidate:
                      </span>
                      <span className="font-mono text-amber-800 text-[11px]">
                        {selectedFlag.matched_report_id}
                      </span>
                      <Link
                        href={`/reports/${selectedFlag.matched_report_id}`}
                        target="_blank"
                        className="text-amber-900 hover:underline font-semibold block pt-1"
                      >
                        Inspect Canonical &rarr;
                      </Link>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Moderator Action Notes
                  </label>
                  <input
                    type="text"
                    placeholder="Rationale for dismissal, duplicate confirmation, or redaction..."
                    value={actionNotes}
                    onChange={(e) => setActionNotes(e.target.value)}
                    className="w-full text-xs p-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-[#174EA6]"
                  />
                </div>

                <div className="flex flex-wrap gap-3 pt-3 border-t border-slate-100">
                  <button
                    onClick={() => handleExecuteAction("flag_dismissed")}
                    disabled={isSubmitting}
                    className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold px-4 py-2 rounded-xl transition"
                  >
                    Dismiss Flag
                  </button>

                  {selectedFlag.matched_report_id && (
                    <button
                      onClick={() => handleExecuteAction("marked_duplicate")}
                      disabled={isSubmitting}
                      className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold px-4 py-2 rounded-xl transition"
                    >
                      Confirm Duplicate & Link Canonical
                    </button>
                  )}

                  <button
                    onClick={() => handleExecuteAction("report_hidden")}
                    disabled={isSubmitting}
                    className="bg-red-600 hover:bg-red-700 text-white text-xs font-bold px-4 py-2 rounded-xl transition"
                  >
                    Hide Report (Abuse / PII)
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center py-16 text-xs text-slate-400">
                Select a flag from the queue to review details and take moderation action.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
