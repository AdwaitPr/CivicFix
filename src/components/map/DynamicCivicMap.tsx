"use client";

import dynamic from "next/dynamic";
import React from "react";
import type { CivicMapCanvasProps } from "./CivicMapCanvas";

/**
 * Wraps the Leaflet canvas with ssr: false to guarantee window-dependent
 * Leaflet code never executes during Next.js App Router server rendering.
 */
export const DynamicCivicMap = dynamic<CivicMapCanvasProps>(
  () => import("./CivicMapCanvas"),
  {
    ssr: false,
    loading: () => (
      <div className="h-full w-full min-h-[480px] rounded-xl bg-slate-100 animate-pulse flex flex-col items-center justify-center border border-slate-200 text-slate-500 text-sm">
        <span>Initializing CivicFix Geospatial Engine...</span>
      </div>
    ),
  }
);
