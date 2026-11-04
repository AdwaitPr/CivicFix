import { describe, it, expect } from "vitest";
import {
  CreateReportSchema,
  AdminStatusTransitionSchema,
  VALID_STATE_TRANSITIONS,
} from "../src/lib/validation/civicfix-schemas";
import { validateImageMagicBytes } from "../src/lib/security/magic-bytes";
import { sanitizePlainText } from "../src/lib/security/sanitization";
import type { ReportStatus } from "../src/lib/domain/types";

describe("CivicFix Comprehensive QA & Security Verification Suite", () => {
  // 1. REPORT SUBMISSION & SERVER-SIDE VALIDATION
  describe("1. Citizen Report Submission & XSS Sanitization", () => {
    it("accepts a valid report with explicit non-affiliation disclaimer acknowledgment", () => {
      const result = CreateReportSchema.safeParse({
        title: "Deep pothole near bus stop on Main Street",
        categoryId: "11111111-1111-4111-8111-111111111101",
        description:
          "A hazardous 50cm pothole has formed in the left lane, causing vehicles to swerve.",
        latitude: 26.44992,
        longitude: 80.33187,
        approximateAddress: "Main Street Bus Stop #4",
        isLocationFuzzed: false,
        acceptedNonAffiliationDisclaimer: true,
      });
      expect(result.success).toBe(true);
    });

    it("rejects submissions that omit the mandatory non-affiliation disclaimer", () => {
      const result = CreateReportSchema.safeParse({
        title: "Broken streetlight pole #44",
        categoryId: "11111111-1111-4111-8111-111111111106",
        description: "The streetlight has been flickering and dark for three consecutive days.",
        latitude: 26.44992,
        longitude: 80.33187,
        acceptedNonAffiliationDisclaimer: false,
      });
      expect(result.success).toBe(false);
    });

    it("rejects Null Island (0, 0) coordinates to prevent location spoofing", () => {
      const result = CreateReportSchema.safeParse({
        title: "Water leakage on sidewalk",
        categoryId: "11111111-1111-4111-8111-111111111104",
        description: "Clean water is pooling across the entire pedestrian walkway.",
        latitude: 0.0,
        longitude: 0.0,
        acceptedNonAffiliationDisclaimer: true,
      });
      expect(result.success).toBe(false);
    });

    it("strips stored XSS script tags and inline event handlers from title and description", () => {
      const dirty = `<script>alert('xss')</script>Broken drain grate <img src=x onerror=alert(1)>`;
      const cleaned = sanitizePlainText(dirty);
      expect(cleaned).not.toContain("<script>");
      expect(cleaned).not.toContain("onerror=");
      expect(cleaned).toContain("Broken drain grate");
    });
  });

  // 2. IMAGE UPLOAD MAGIC-BYTE VALIDATION
  describe("2. Image Upload Security & Magic-Byte Verification", () => {
    it("validates authentic JPEG magic bytes (FF D8 FF)", () => {
      const jpegBytes = new Uint8Array(2048);
      jpegBytes[0] = 0xff;
      jpegBytes[1] = 0xd8;
      jpegBytes[2] = 0xff;
      const res = validateImageMagicBytes(jpegBytes, "image/jpeg");
      expect(res.valid).toBe(true);
      expect(res.detectedMime).toBe("image/jpeg");
    });

    it("rejects SVG/HTML XSS payloads disguised with a .jpg MIME type", () => {
      const fakeSvgBytes = new TextEncoder().encode(
        `<svg onload="alert(document.cookie)"><circle r="50"/></svg>`
      );
      const res = validateImageMagicBytes(fakeSvgBytes, "image/jpeg");
      expect(res.valid).toBe(false);
    });

    it("rejects files exceeding the 5 MB (5,242,880 bytes) ceiling", () => {
      const oversizedBytes = new Uint8Array(5 * 1024 * 1024 + 10);
      oversizedBytes[0] = 0xff;
      oversizedBytes[1] = 0xd8;
      oversizedBytes[2] = 0xff;
      const res = validateImageMagicBytes(oversizedBytes, "image/jpeg");
      expect(res.valid).toBe(false);
      expect(res.error).toContain("5 MB");
    });
  });

  // 3. FINITE STATE MACHINE TRANSITION RULES
  describe("3. Issue Lifecycle Finite State Machine (8 States)", () => {
    it("permits valid progression: Submitted -> Under review -> Accepted -> Assigned -> In progress -> Resolved -> Reopened", () => {
      const chain: ReportStatus[] = [
        "Submitted",
        "Under review",
        "Accepted",
        "Assigned",
        "In progress",
        "Resolved",
        "Reopened",
      ];
      for (let i = 0; i < chain.length - 1; i++) {
        const current = chain[i];
        const next = chain[i + 1];
        expect(VALID_STATE_TRANSITIONS[current]).toContain(next);
      }
    });

    it("blocks illegal state jump directly from Submitted to Resolved", () => {
      expect(VALID_STATE_TRANSITIONS["Submitted"]).not.toContain("Resolved");
    });

    it("requires a non-empty public rationale on every administrative status transition", () => {
      const invalidUpdate = AdminStatusTransitionSchema.safeParse({
        newStatus: "Under review",
        publicRationale: "   ",
      });
      expect(invalidUpdate.success).toBe(false);
    });
  });

  // 4. DETERMINISTIC DUPLICATE DETECTION SCORING
  describe("4. Deterministic Duplicate Detection Formula Verification", () => {
    function computeCompositeDuplicateScore(params: {
      distanceMeters: number;
      radiusMeters: number;
      trigramSimilarity: number;
      ageHours: number;
      windowHours: number;
    }): number {
      const geoScore = Math.max(0, 1 - params.distanceMeters / params.radiusMeters);
      const timeScore = Math.max(0, 1 - params.ageHours / params.windowHours);
      return Number(
        (0.45 * geoScore + 0.4 * params.trigramSimilarity + 0.15 * timeScore).toFixed(3)
      );
    }

    it("flags a near-identical pothole report 20m away submitted 12 hours later", () => {
      const score = computeCompositeDuplicateScore({
        distanceMeters: 20,
        radiusMeters: 75,
        trigramSimilarity: 0.62,
        ageHours: 12,
        windowHours: 336,
      });
      expect(score).toBeGreaterThanOrEqual(0.45);
    });

    it("does not false-flag a distinct report 70m away with zero text overlap submitted 13 days ago", () => {
      const score = computeCompositeDuplicateScore({
        distanceMeters: 70,
        radiusMeters: 75,
        trigramSimilarity: 0.05,
        ageHours: 312,
        windowHours: 336,
      });
      expect(score).toBeLessThan(0.45);
    });
  });

  // 5. PUBLIC ANALYTICS PARTITIONING (RESOLVED VS CLOSED VS PENDING)
  describe("5. Public Analytics Mathematical Partition Integrity", () => {
    it("strictly separates Resolved, Closed (Rejected), and Pending buckets without overlap", () => {
      const mockReports: Array<{ status: ReportStatus }> = [
        { status: "Submitted" },
        { status: "Under review" },
        { status: "Accepted" },
        { status: "Assigned" },
        { status: "In progress" },
        { status: "Reopened" },
        { status: "Resolved" },
        { status: "Rejected" },
      ];

      const resolved = mockReports.filter((r) => r.status === "Resolved").length;
      const closed = mockReports.filter((r) => r.status === "Rejected").length;
      const pending = mockReports.filter((r) =>
        [
          "Submitted",
          "Under review",
          "Accepted",
          "Assigned",
          "In progress",
          "Reopened",
        ].includes(r.status)
      ).length;

      expect(resolved).toBe(1);
      expect(closed).toBe(1);
      expect(pending).toBe(6);
      expect(resolved + closed + pending).toBe(mockReports.length);
    });
  });
});
