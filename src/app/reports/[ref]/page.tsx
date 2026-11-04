"use client";

import React, { useEffect, useState, use } from "react";
import Link from "next/link";
import {
  Clock,
  MapPin,
  ArrowLeft,
  ThumbsUp,
  Flag,
  Share2,
  CheckCircle2,
  Shield,
  Layers,
} from "lucide-react";
import { DynamicCivicMap } from "@/components/map/DynamicCivicMap";
import { STATUS_BADGE_COLORS } from "@/components/map/CategoryMarker";
import type { ReportDetail } from "@/lib/domain/types";

export default function ReportDetailPage({
  params,
}: {
  params: Promise<{ ref: string }>;
}) {
  const { ref } = use(params);

  const [report, setReport] = useState<ReportDetail | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [upvotes, setUpvotes] = useState<number>(0);
  const [hasUpvoted, setHasUpvoted] = useState<boolean>(false);

  // Flag Modal State
  const [flagModalOpen, setFlagModalOpen] = useState<boolean>(false);
  const [flagReason, setFlagReason] = useState<string>("potential_duplicate");
  const [flagDetails, setFlagDetails] = useState<string>("");
  const [flagSuccess, setFlagSuccess] = useState<boolean>(false);

  useEffect(() => {
    fetch(`/api/reports/${ref}`)
      .then((res) => {
        if (!res.ok) throw new Error("Report not found.");
        return res.json();
      })
      .then((data) => {
        setReport(data.report);
        setUpvotes(data.report.upvotes_count || 0);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [ref]);

  const handleUpvote = () => {
    if (hasUpvoted) return;
    setUpvotes((prev) => prev + 1);
    setHasUpvoted(true);
  };

  const handleFlagSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!report) return;

    try {
      const res = await fetch("/api/moderation/flags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reportId: report.id,
          reason: flagReason,
          details: flagDetails,
        }),
      });

      if (res.ok) {
        setFlagSuccess(true);
        setTimeout(() => {
          setFlagModalOpen(false);
          setFlagSuccess(false);
          setFlagDetails("");
        }, 1500);
      }
    } catch {
      alert("Failed to submit flag.");
    }
  };

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-16 text-center text-slate-500 text-sm">
        Loading civic report audit details...
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center space-y-4">
        <div className="p-4 bg-red-50 text-red-700 text-sm rounded-xl font-medium">
          {error || "Report not found."}
        </div>
        <Link href="/map" className="text-sm font-semibold text-[#174EA6] hover:underline">
          &larr; Return to Issue Map
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full space-y-8">
      {/* Back Navigation */}
      <div>
        <Link
          href="/map"
          className="text-xs font-semibold text-slate-500 hover:text-slate-800 flex items-center gap-1.5 transition"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Map Discovery
        </Link>
      </div>

      {/* Header Banner */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="font-mono text-sm font-extrabold text-[#174EA6] bg-blue-50 px-3 py-1 rounded-lg border border-blue-200">
              {report.reference_code}
            </span>
            <span
              className="text-xs font-bold px-3 py-1 rounded-full text-white shadow-xs"
              style={{ backgroundColor: STATUS_BADGE_COLORS[report.status] }}
            >
              {report.status}
            </span>
            {report.duplicate_auto_flagged && (
              <span className="text-[10px] bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded-full">
                Candidate Duplicate Flagged
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleUpvote}
              className={`text-xs font-semibold px-3 py-1.5 rounded-lg border flex items-center gap-1.5 transition ${
                hasUpvoted
                  ? "bg-teal-50 border-teal-300 text-teal-800"
                  : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
              }`}
            >
              <ThumbsUp className="w-3.5 h-3.5" />
              Upvote ({upvotes})
            </button>
            <button
              onClick={() => setFlagModalOpen(true)}
              className="text-xs font-medium px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 flex items-center gap-1.5"
            >
              <Flag className="w-3.5 h-3.5 text-slate-400" />
              Flag
            </button>
          </div>
        </div>

        <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 leading-snug">
          {report.title}
        </h1>

        <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 pt-1">
          <span className="flex items-center gap-1.5 font-medium text-teal-700">
            <Layers className="w-3.5 h-3.5" />
            {report.category?.name || "Civic Defect"}
          </span>
          <span className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            Submitted {new Date(report.created_at).toLocaleString()}
          </span>
          {report.is_location_fuzzed && (
            <span className="text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md font-medium">
              Coordinates Fuzzed (~110m privacy buffer)
            </span>
          )}
        </div>
      </div>

      {/* Main Grid: Details & Map (Left), Timeline (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Description, Media & Map */}
        <div className="lg:col-span-2 space-y-6">
          {/* Description */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-3">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
              Issue Description
            </h3>
            <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">
              {report.description}
            </p>
            {report.approximate_address && (
              <div className="pt-2 text-xs text-slate-500 flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-slate-400" />
                <span>Landmark: {report.approximate_address}</span>
              </div>
            )}
          </div>

          {/* Location Map */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-3">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
              Geographic Location
            </h3>
            <div className="h-[320px] rounded-xl overflow-hidden border border-slate-200">
              <DynamicCivicMap
                reports={[
                  {
                    id: report.id,
                    reference_code: report.reference_code,
                    title: report.title,
                    description_excerpt: report.description.slice(0, 100),
                    status: report.status,
                    category_slug: report.category?.slug || "civic-issue",
                    category_name: report.category?.name || "General",
                    category_color: report.category?.color_hex || "#174EA6",
                    latitude: report.public_latitude,
                    longitude: report.public_longitude,
                    is_location_fuzzed: report.is_location_fuzzed,
                    upvotes_count: report.upvotes_count,
                    duplicate_auto_flagged: report.duplicate_auto_flagged,
                    created_at: report.created_at,
                  },
                ]}
                center={[report.public_latitude, report.public_longitude]}
                zoom={14}
              />
            </div>
            <div className="flex justify-between items-center text-xs text-slate-500 pt-1">
              <span>WGS 84 Coordinates: {report.public_latitude}, {report.public_longitude}</span>
              <span className="text-[11px] text-teal-700 font-semibold">Spherical Great-Circle</span>
            </div>
          </div>
        </div>

        {/* Right Column: Immutable Audit History & Official Updates */}
        <div className="space-y-6">
          {/* Status Progression Timeline */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <Shield className="w-4 h-4 text-[#174EA6]" />
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                Auditable Status History
              </h3>
            </div>

            <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
              {report.status_history.map((hist, idx) => (
                <div key={hist.id} className="relative">
                  <div className="absolute -left-[19px] top-1 w-3.5 h-3.5 rounded-full bg-[#174EA6] border-2 border-white ring-2 ring-blue-100" />
                  <div>
                    <span
                      className="text-[10px] font-bold px-2 py-0.5 rounded-full text-white inline-block"
                      style={{ backgroundColor: STATUS_BADGE_COLORS[hist.new_status] }}
                    >
                      {hist.new_status}
                    </span>
                    <p className="text-xs text-slate-700 font-medium mt-1 leading-relaxed">
                      {hist.public_rationale}
                    </p>
                    <span className="text-[10px] text-slate-400 mt-0.5 block">
                      {new Date(hist.created_at).toLocaleString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Official Operational Updates */}
          {report.updates && report.updates.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                <CheckCircle2 className="w-4 h-4 text-green-600" />
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                  Official Responses
                </h3>
              </div>

              <div className="space-y-3">
                {report.updates.map((update) => (
                  <div key={update.id} className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1">
                    <div className="flex justify-between items-center text-[10px] text-slate-400 font-semibold">
                      <span className="text-blue-800 uppercase">Administrator Notice</span>
                      <span>{new Date(update.created_at).toLocaleDateString()}</span>
                    </div>
                    <p className="text-slate-800 leading-relaxed font-medium">{update.body}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Flag / Moderation Modal */}
      {flagModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-slate-900">Flag Report for Moderation</h3>
            <p className="text-xs text-slate-500">
              Help maintain community safety and data hygiene. Flag spam, inaccurate locations, PII leaks, or candidate duplicates.
            </p>

            {flagSuccess ? (
              <div className="p-4 bg-green-50 text-green-800 rounded-xl text-xs font-semibold text-center">
                Report flagged for moderator review. Thank you!
              </div>
            ) : (
              <form onSubmit={handleFlagSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Reason</label>
                  <select
                    value={flagReason}
                    onChange={(e) => setFlagReason(e.target.value)}
                    className="w-full text-xs p-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-[#174EA6]"
                  >
                    <option value="potential_duplicate">Potential Duplicate</option>
                    <option value="spam">Spam / Bot Submission</option>
                    <option value="abusive_or_harassment">Abusive or Defamatory</option>
                    <option value="privacy_or_pii">Contains PII / Privacy Violation</option>
                    <option value="inaccurate_location">Inaccurate GPS Location</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Additional Details (Optional)
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Provide specific notes or link to canonical reference code..."
                    value={flagDetails}
                    onChange={(e) => setFlagDetails(e.target.value)}
                    className="w-full text-xs p-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-[#174EA6]"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setFlagModalOpen(false)}
                    className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 text-xs font-bold bg-[#174EA6] hover:bg-blue-800 text-white rounded-lg shadow"
                  >
                    Submit Flag
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
