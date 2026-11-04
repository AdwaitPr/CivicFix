import React from "react";
import Link from "next/link";

export function Footer() {
  return (
    <footer className="bg-white border-t border-slate-200 mt-auto py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex flex-col items-center md:items-start">
          <p className="text-sm font-bold text-slate-800">
            CivicFix — Independent Civic Infrastructure Registry
          </p>
          <p className="text-xs text-slate-500 mt-0.5">
            Empowering citizens and communities with open, auditable public infrastructure tracking.
          </p>
        </div>

        <div className="flex items-center space-x-6 text-xs text-slate-500">
          <Link href="/map" className="hover:text-slate-800 transition">
            Map Explorer
          </Link>
          <Link href="/track" className="hover:text-slate-800 transition">
            Track Code
          </Link>
          <Link href="/analytics" className="hover:text-slate-800 transition">
            Public Data
          </Link>
          <span>&copy; {new Date().getFullYear()} CivicFix Platform</span>
        </div>
      </div>
    </footer>
  );
}
