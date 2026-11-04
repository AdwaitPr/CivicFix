import React from "react";
import { ShieldAlert } from "lucide-react";

export function IndependentNoticeBanner() {
  return (
    <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 text-xs text-amber-900 flex items-center justify-center gap-2">
      <ShieldAlert className="w-4 h-4 text-amber-700 shrink-0" />
      <span>
        <strong>Independent Public Registry:</strong> CivicFix is a citizen-powered tracking platform. Reports remain independent public records and are not automatically transmitted to municipal work-order systems unless explicitly verified.
      </span>
    </div>
  );
}
