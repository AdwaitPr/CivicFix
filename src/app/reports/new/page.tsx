"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  Upload,
  CheckCircle,
  ShieldAlert,
  ArrowRight,
  ArrowLeft,
  MapPin,
} from "lucide-react";
import { DynamicCivicMap } from "@/components/map/DynamicCivicMap";
import { validateImageMagicBytes } from "@/lib/security/magic-bytes";
import type { IssueCategory, DuplicateCandidate } from "@/lib/domain/types";

export default function NewReportPage() {
  const router = useRouter();

  const [step, setStep] = useState<number>(1);
  const [categories, setCategories] = useState<IssueCategory[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("");

  // Coordinates
  const [selectedCoords, setSelectedCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [isLocationFuzzed, setIsLocationFuzzed] = useState<boolean>(false);
  const [approximateAddress, setApproximateAddress] = useState<string>("");

  // Details
  const [title, setTitle] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);
  const [duplicateCandidates, setDuplicateCandidates] = useState<DuplicateCandidate[]>([]);
  const [isCheckingDuplicates, setIsCheckingDuplicates] = useState<boolean>(false);

  // Consent & Submitting
  const [disclaimerAccepted, setDisclaimerAccepted] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  useEffect(() => {
    fetch("/api/categories")
      .then((r) => r.json())
      .then((d) => {
        setCategories(d.categories || []);
        if (d.categories && d.categories.length > 0) {
          setSelectedCategoryId(d.categories[0].id);
        }
      })
      .catch(() => null);
  }, []);

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setImageError(null);
    const file = e.target.files?.[0];
    if (!file) {
      setImageFile(null);
      return;
    }

    try {
      const buffer = new Uint8Array(await file.arrayBuffer());
      const validation = validateImageMagicBytes(buffer, file.type);
      if (!validation.valid) {
        setImageError(validation.error || "Invalid image file format.");
        setImageFile(null);
        return;
      }
      setImageFile(file);
    } catch {
      setImageError("Failed to read image file.");
      setImageFile(null);
    }
  };

  const handleCheckDuplicates = async () => {
    if (!selectedCategoryId || !selectedCoords || !title || !description) return;
    setIsCheckingDuplicates(true);
    try {
      const res = await fetch("/api/reports/duplicate-check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          categoryId: selectedCategoryId,
          latitude: selectedCoords.lat,
          longitude: selectedCoords.lng,
          title,
          description,
        }),
      });
      const data = await res.json();
      setDuplicateCandidates(data.candidates || []);
    } catch {
      setDuplicateCandidates([]);
    } finally {
      setIsCheckingDuplicates(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!disclaimerAccepted) {
      setErrorMsg("You must accept the independent platform disclosure to submit.");
      return;
    }
    if (!selectedCoords) {
      setErrorMsg("Please drop a pin on the map to set coordinates.");
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const res = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description,
          categoryId: selectedCategoryId,
          latitude: selectedCoords.lat,
          longitude: selectedCoords.lng,
          approximateAddress: approximateAddress || undefined,
          isLocationFuzzed,
          acceptedNonAffiliationDisclaimer: true,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to submit report.");
      }

      router.push(`/reports/${data.report.reference_code}`);
    } catch (err: any) {
      setErrorMsg(err.message || "An error occurred during submission.");
      setIsSubmitting(false);
    }
  };

  const currentCategory = categories.find((c) => c.id === selectedCategoryId);

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 w-full">
      {/* Wizard Step Indicator */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          {["1. Category", "2. Location", "3. Defect Details", "4. Review & Consent"].map(
            (label, idx) => (
              <div
                key={label}
                className={`flex items-center gap-1.5 text-xs font-bold ${
                  step === idx + 1
                    ? "text-[#174EA6]"
                    : step > idx + 1
                    ? "text-teal-700"
                    : "text-slate-400"
                }`}
              >
                <span
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${
                    step === idx + 1
                      ? "bg-[#174EA6] text-white"
                      : step > idx + 1
                      ? "bg-teal-100 text-teal-800"
                      : "bg-slate-200 text-slate-600"
                  }`}
                >
                  {idx + 1}
                </span>
                <span className="hidden sm:inline">{label}</span>
              </div>
            )
          )}
        </div>
        <div className="w-full bg-slate-200 h-1.5 rounded-full mt-3 overflow-hidden">
          <div
            className="bg-[#174EA6] h-full transition-all duration-300"
            style={{ width: `${(step / 4) * 100}%` }}
          />
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8">
        {/* Step 1: Category Selection */}
        {step === 1 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold text-slate-900">Step 1: Select Issue Category</h2>
              <p className="text-xs text-slate-500 mt-1">
                Choose the infrastructure category that best describes the municipal defect.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {categories.map((cat) => (
                <div
                  key={cat.id}
                  onClick={() => setSelectedCategoryId(cat.id)}
                  className={`p-4 rounded-xl border cursor-pointer transition flex items-start gap-3 ${
                    selectedCategoryId === cat.id
                      ? "border-[#174EA6] bg-blue-50/50 ring-2 ring-[#174EA6]/20"
                      : "border-slate-200 hover:border-slate-300 bg-white"
                  }`}
                >
                  <div
                    className="w-4 h-4 rounded-full mt-1 shrink-0"
                    style={{ backgroundColor: cat.color_hex }}
                  />
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">{cat.name}</h4>
                    <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{cat.description}</p>
                    <span className="text-[10px] text-slate-400 mt-2 block">
                      Duplicate Radius: {cat.duplicate_radius_meters}m
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-4 flex justify-end">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="bg-[#174EA6] hover:bg-blue-800 text-white font-semibold text-sm px-6 py-2.5 rounded-xl transition flex items-center gap-2"
              >
                Continue to Location <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Location Map Pin */}
        {step === 2 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold text-slate-900">Step 2: Pinpoint Defect Location</h2>
              <p className="text-xs text-slate-500 mt-1">
                Click directly on the map to place an issue marker or use your device location (opt-in).
              </p>
            </div>

            <div className="h-[380px] w-full rounded-xl overflow-hidden border border-slate-200">
              <DynamicCivicMap
                reports={[]}
                interactivePinMode={true}
                selectedPin={selectedCoords}
                onSelectPin={(c) => setSelectedCoords(c)}
              />
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Approximate Street Address / Landmark (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Near Mall Road signal, opposite metro pillar 14"
                  value={approximateAddress}
                  onChange={(e) => setApproximateAddress(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-[#174EA6]"
                />
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-start gap-3">
                <input
                  type="checkbox"
                  id="fuzzToggle"
                  checked={isLocationFuzzed || Boolean(currentCategory?.is_sensitive_location)}
                  disabled={Boolean(currentCategory?.is_sensitive_location)}
                  onChange={(e) => setIsLocationFuzzed(e.target.checked)}
                  className="mt-0.5 rounded text-[#174EA6] focus:ring-[#174EA6]"
                />
                <label htmlFor="fuzzToggle" className="text-xs text-slate-700">
                  <strong>Privacy Safeguard: Coordinate Fuzzing (~110m grid)</strong>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    {currentCategory?.is_sensitive_location
                      ? "Automatically enforced for sensitive categories to protect household privacy."
                      : "Obfuscates public coordinates to ~110m grid while preserving exact coordinates for internal deduplication."}
                  </p>
                </label>
              </div>
            </div>

            <div className="pt-4 flex justify-between">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="text-slate-600 hover:text-slate-900 text-sm font-semibold flex items-center gap-1.5"
              >
                <ArrowLeft className="w-4 h-4" /> Back
              </button>
              <button
                type="button"
                disabled={!selectedCoords}
                onClick={() => {
                  setStep(3);
                  handleCheckDuplicates();
                }}
                className="bg-[#174EA6] hover:bg-blue-800 disabled:opacity-50 text-white font-semibold text-sm px-6 py-2.5 rounded-xl transition flex items-center gap-2"
              >
                Continue to Details <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Issue Details & Duplicate Warning */}
        {step === 3 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold text-slate-900">Step 3: Defect Details & Evidence</h2>
              <p className="text-xs text-slate-500 mt-1">
                Provide clear, factual descriptions and optional photographic proof.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Issue Title (5 - 140 chars) *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Hazardous 50cm deep crater pothole in southbound lane"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  onBlur={handleCheckDuplicates}
                  className="w-full text-xs p-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-[#174EA6]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Detailed Description (15 - 4,000 chars) *
                </label>
                <textarea
                  rows={4}
                  placeholder="Describe the defect severity, dimensions, hazards to motorists/pedestrians, and exact surrounding cues..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  onBlur={handleCheckDuplicates}
                  className="w-full text-xs p-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-[#174EA6]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Photographic Evidence (JPEG, PNG, WebP $\le$ 5MB)
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handleImageChange}
                    className="text-xs file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-[#174EA6] hover:file:bg-blue-100"
                  />
                </div>
                {imageError && (
                  <p className="text-xs text-red-600 font-semibold mt-1">{imageError}</p>
                )}
                {imageFile && (
                  <p className="text-xs text-green-700 font-medium mt-1 flex items-center gap-1">
                    <CheckCircle className="w-3.5 h-3.5" /> Valid image signature verified ({imageFile.name})
                  </p>
                )}
              </div>
            </div>

            {/* Real-time Duplicate Detection Notice */}
            {duplicateCandidates.length > 0 && (
              <div className="p-4 bg-amber-50 rounded-xl border border-amber-300 space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-amber-900">
                  <AlertTriangle className="w-4 h-4 text-amber-700" />
                  <span>Potential Duplicate Notice ({duplicateCandidates.length} Nearby Reports Found)</span>
                </div>
                <p className="text-[11px] text-amber-800 leading-relaxed">
                  Citizens have recently reported similar infrastructure defects within this immediate vicinity. Please review existing submissions to avoid duplicate reports:
                </p>
                <div className="divide-y divide-amber-200 pt-1">
                  {duplicateCandidates.map((c) => (
                    <div key={c.candidate_id} className="py-2 flex justify-between items-center text-xs">
                      <div>
                        <span className="font-mono font-bold text-amber-900">{c.reference_code}</span>
                        <p className="text-slate-700 font-medium">{c.title}</p>
                        <span className="text-[10px] text-slate-500">
                          {c.distance_meters}m away &bull; Match confidence: {(c.composite_score * 100).toFixed(0)}%
                        </span>
                      </div>
                      <a
                        href={`/reports/${c.reference_code}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs font-semibold text-[#174EA6] hover:underline"
                      >
                        View &rarr;
                      </a>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="pt-4 flex justify-between">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="text-slate-600 hover:text-slate-900 text-sm font-semibold flex items-center gap-1.5"
              >
                <ArrowLeft className="w-4 h-4" /> Back
              </button>
              <button
                type="button"
                disabled={title.length < 5 || description.length < 15}
                onClick={() => setStep(4)}
                className="bg-[#174EA6] hover:bg-blue-800 disabled:opacity-50 text-white font-semibold text-sm px-6 py-2.5 rounded-xl transition flex items-center gap-2"
              >
                Review & Confirm <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Step 4: Review & Legal Disclaimer Consent */}
        {step === 4 && (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <h2 className="text-xl font-bold text-slate-900">Step 4: Review & Final Consent</h2>
              <p className="text-xs text-slate-500 mt-1">
                Verify your submission summary and accept the independent platform disclosure.
              </p>
            </div>

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Category:</span>
                <span className="font-bold text-slate-900">{currentCategory?.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Coordinates:</span>
                <span className="font-mono text-slate-800">
                  {selectedCoords?.lat.toFixed(5)}, {selectedCoords?.lng.toFixed(5)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Title:</span>
                <span className="font-semibold text-slate-900">{title}</span>
              </div>
              {approximateAddress && (
                <div className="flex justify-between">
                  <span className="text-slate-500">Landmark:</span>
                  <span className="text-slate-800">{approximateAddress}</span>
                </div>
              )}
            </div>

            {/* Non-Affiliation Disclaimer Agreement */}
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl space-y-3">
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  id="disclaimerConsent"
                  checked={disclaimerAccepted}
                  onChange={(e) => setDisclaimerAccepted(e.target.checked)}
                  className="mt-1 rounded text-[#174EA6] focus:ring-[#174EA6]"
                  required
                />
                <label htmlFor="disclaimerConsent" className="text-xs text-slate-800 leading-relaxed">
                  <strong>Mandatory Platform Acknowledgment:</strong> I acknowledge and agree that CivicFix is an independent public tracking registry. Submitting this report documents the defect publicly for community advocacy and auditability, but does not constitute an emergency dispatch or automated municipal work order.
                </label>
              </div>
            </div>

            {errorMsg && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl font-medium">
                {errorMsg}
              </div>
            )}

            <div className="pt-4 flex justify-between">
              <button
                type="button"
                onClick={() => setStep(3)}
                className="text-slate-600 hover:text-slate-900 text-sm font-semibold flex items-center gap-1.5"
              >
                <ArrowLeft className="w-4 h-4" /> Back
              </button>
              <button
                type="submit"
                disabled={!disclaimerAccepted || isSubmitting}
                className="bg-[#174EA6] hover:bg-blue-800 disabled:opacity-50 text-white font-bold text-sm px-8 py-3 rounded-xl transition shadow-md"
              >
                {isSubmitting ? "Recording Report..." : "Submit Civic Report"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
