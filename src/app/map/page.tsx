"use client";

import React, { useEffect, useState, useCallback, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  Filter,
  List,
  Map as MapIcon,
  ChevronRight,
  Clock,
  ExternalLink,
} from "lucide-react";
import { DynamicCivicMap } from "@/components/map/DynamicCivicMap";
import { STATUS_BADGE_COLORS } from "@/components/map/CategoryMarker";
import type { MapReportItem, IssueCategory } from "@/lib/domain/types";
import type { BoundingBoxCoords } from "@/components/map/CivicMapCanvas";

function MapExplorerContent() {
  const searchParams = useSearchParams();
  const initialCat = searchParams.get("category") || "";

  const [categories, setCategories] = useState<IssueCategory[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>(initialCat);
  const [selectedStatus, setSelectedStatus] = useState<string>("");
  const [reports, setReports] = useState<MapReportItem[]>([]);
  const [activeReport, setActiveReport] = useState<MapReportItem | null>(null);
  const [mobileTab, setMobileTab] = useState<"map" | "list">("map");
  const [loading, setLoading] = useState<boolean>(true);

  const [bbox, setBbox] = useState<BoundingBoxCoords>({
    west: 80.25,
    south: 26.38,
    east: 80.42,
    north: 26.52,
  });

  useEffect(() => {
    fetch("/api/categories")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setCategories(d?.categories || []))
      .catch(() => null);
  }, []);

  const fetchReports = useCallback(async () => {
    setLoading(true);
    let url = `/api/reports?west=${bbox.west}&south=${bbox.south}&east=${bbox.east}&north=${bbox.north}&limit=300`;
    if (selectedCategory) url += `&category=${encodeURIComponent(selectedCategory)}`;
    if (selectedStatus) url += `&status=${encodeURIComponent(selectedStatus)}`;

    try {
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setReports(data.reports || []);
      } else {
        setReports([]);
      }
    } catch {
      setReports([]);
    } finally {
      setLoading(false);
    }
  }, [bbox, selectedCategory, selectedStatus]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  return (
    <div className="flex-1 flex flex-col h-[calc(100vh-64px)] overflow-hidden">
      {/* Top Filter Bar */}
      <div className="bg-white border-b border-slate-200 px-4 py-3 flex flex-wrap items-center justify-between gap-3 shrink-0 z-20">
        <div className="flex items-center gap-2 overflow-x-auto max-w-full pb-1 sm:pb-0 scrollbar-none">
          <button
            onClick={() => setSelectedCategory("")}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition ${
              selectedCategory === ""
                ? "bg-[#174EA6] text-white shadow-xs"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            }`}
          >
            All Categories
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.slug)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition flex items-center gap-1.5 ${
                selectedCategory === cat.slug
                  ? "bg-[#174EA6] text-white shadow-xs"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              <span
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: cat.color_hex }}
              />
              {cat.name}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs text-slate-600 font-medium">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="bg-slate-100 border-none text-xs rounded-lg px-2.5 py-1.5 text-slate-800 font-medium focus:ring-2 focus:ring-[#174EA6]"
            >
              <option value="">All Statuses</option>
              <option value="Submitted">Submitted</option>
              <option value="Under review">Under review</option>
              <option value="Accepted">Accepted</option>
              <option value="Assigned">Assigned</option>
              <option value="In progress">In progress</option>
              <option value="Resolved">Resolved</option>
              <option value="Rejected">Rejected</option>
              <option value="Reopened">Reopened</option>
            </select>
          </div>

          <div className="flex sm:hidden border border-slate-200 rounded-lg overflow-hidden">
            <button
              onClick={() => setMobileTab("map")}
              className={`p-1.5 ${
                mobileTab === "map" ? "bg-slate-200 text-slate-900" : "bg-white text-slate-500"
              }`}
            >
              <MapIcon className="w-4 h-4" />
            </button>
            <button
              onClick={() => setMobileTab("list")}
              className={`p-1.5 ${
                mobileTab === "list" ? "bg-slate-200 text-slate-900" : "bg-white text-slate-500"
              }`}
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Pane */}
      <div className="flex-1 flex overflow-hidden relative">
        <div
          className={`flex-1 h-full relative ${
            mobileTab === "map" ? "block" : "hidden sm:block"
          }`}
        >
          <DynamicCivicMap
            reports={reports}
            onBoundsChange={(newBbox) => setBbox(newBbox)}
            onSelectReport={(report) => setActiveReport(report)}
          />
        </div>

        <div
          className={`w-full sm:w-96 bg-white border-l border-slate-200 flex flex-col h-full overflow-hidden ${
            mobileTab === "list" ? "block" : "hidden sm:flex"
          }`}
        >
          <div className="p-3.5 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              {loading ? "Searching..." : `${reports.length} Reports in Viewport`}
            </span>
            <Link
              href="/reports/new"
              className="text-xs text-[#174EA6] hover:underline font-semibold"
            >
              + New Report
            </Link>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
            {reports.length === 0 && !loading && (
              <div className="p-8 text-center text-slate-400 text-xs">
                No issues found within this viewport. Pan or zoom the map to discover other reports.
              </div>
            )}

            {reports.map((report) => (
              <div
                key={report.id}
                onClick={() => setActiveReport(report)}
                className={`p-4 hover:bg-slate-50 cursor-pointer transition ${
                  activeReport?.id === report.id ? "bg-blue-50/60 border-l-4 border-[#174EA6]" : ""
                }`}
              >
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <span className="text-[11px] font-mono font-bold text-slate-500">
                    {report.reference_code}
                  </span>
                  <span
                    className="text-[10px] font-semibold px-2 py-0.5 rounded-full text-white"
                    style={{ backgroundColor: STATUS_BADGE_COLORS[report.status] }}
                  >
                    {report.status}
                  </span>
                </div>

                <h4 className="text-sm font-bold text-slate-900 leading-snug line-clamp-1">
                  {report.title}
                </h4>

                <p className="text-xs text-slate-500 line-clamp-2 mt-1">
                  {report.description_excerpt}
                </p>

                <div className="mt-2 flex items-center justify-between text-[11px] text-slate-400">
                  <span className="font-medium text-teal-700">{report.category_name}</span>
                  <Link
                    href={`/reports/${report.reference_code}`}
                    className="text-[#174EA6] hover:underline font-semibold flex items-center gap-0.5"
                    onClick={(e) => e.stopPropagation()}
                  >
                    Details <ChevronRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            ))}
          </div>

          {activeReport && (
            <div className="border-t border-slate-200 p-4 bg-white shadow-lg space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold text-slate-500">
                  {activeReport.reference_code}
                </span>
                <span
                  className="text-[10px] font-bold px-2 py-0.5 rounded-full text-white"
                  style={{ backgroundColor: STATUS_BADGE_COLORS[activeReport.status] }}
                >
                  {activeReport.status}
                </span>
              </div>
              <h3 className="text-sm font-bold text-slate-900">{activeReport.title}</h3>
              <p className="text-xs text-slate-600 line-clamp-2">
                {activeReport.description_excerpt}
              </p>
              <div className="pt-2 flex justify-between items-center">
                <span className="text-[11px] text-slate-400 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {new Date(activeReport.created_at).toLocaleDateString()}
                </span>
                <Link
                  href={`/reports/${activeReport.reference_code}`}
                  className="bg-[#174EA6] text-white text-xs font-semibold px-3 py-1.5 rounded-lg hover:bg-blue-800 transition flex items-center gap-1"
                >
                  View Full Audit <ExternalLink className="w-3 h-3" />
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function PublicMapPage() {
  return (
    <Suspense
      fallback={
        <div className="flex-1 flex items-center justify-center text-xs text-slate-400">
          Loading issue map...
        </div>
      }
    >
      <MapExplorerContent />
    </Suspense>
  );
}
