import type { Metadata } from "next";
import "./globals.css";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { IndependentNoticeBanner } from "@/components/IndependentNoticeBanner";

export const metadata: Metadata = {
  title: "CivicFix — Citizen-Powered Civic Infrastructure Tracking",
  description:
    "An independent, public civic infrastructure reporting, geospatial discovery, and lifecycle tracking platform.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen flex flex-col bg-slate-50 text-slate-900 antialiased font-sans">
        <IndependentNoticeBanner />
        <Navbar />
        <main className="flex-1 flex flex-col">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
