import { describe, it, expect } from "vitest";
import {
  CreateReportSchema,
  BoundingBoxQuerySchema,
  AdminStatusTransitionSchema,
} from "../src/lib/validation/civicfix-schemas";
import {
  VALID_STATE_TRANSITIONS,
  isValidStatusTransition,
  getNextAllowedStates,
} from "../src/lib/domain/fsm";
import {
  computeCompositeDuplicateScore,
  isDuplicateCandidate,
} from "../src/lib/domain/duplicate";
import { sanitizePlainText } from "../src/lib/security/sanitization";
import { validateImageMagicBytes } from "../src/lib/security/magic-bytes";
import type { ReportStatus } from "../src/lib/domain/types";

describe("Task 3: Domain Core, Validation, Security & FSM Engine", () => {
  // 1. Zod Validation & XSS Sanitization
  describe("1. Validation Schemas & Sanitization", () => {
    it("strips malicious HTML and JavaScript event handlers from plain text", () => {
      const input = `<script>alert('pwned')</script>Broken Streetlight <img src=x onerror=alert(1)>`;
      const cleaned = sanitizePlainText(input);
      expect(cleaned).not.toContain("<script>");
      expect(cleaned).not.toContain("onerror=");
      expect(cleaned).toBe("Broken Streetlight");
    });

    it("validates a compliant citizen report creation payload", () => {
      const valid = {
        title: "Large crater pothole on Main Avenue",
        categoryId: "11111111-1111-4111-8111-111111111101",
        description: "A hazardous pothole approximately 60cm wide is causing vehicles to swerve.",
        latitude: 26.44992,
        longitude: 80.33187,
        approximateAddress: "Main Ave & 4th Street",
        isLocationFuzzed: false,
        acceptedNonAffiliationDisclaimer: true,
      };
      const result = CreateReportSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it("rejects Null Island coordinates (0, 0) within 0.0001 degrees", () => {
      const nullIsland = {
        title: "Test Report at Null Island",
        categoryId: "11111111-1111-4111-8111-111111111101",
        description: "This should fail because lat/lng are 0,0.",
        latitude: 0.0,
        longitude: 0.0,
        acceptedNonAffiliationDisclaimer: true,
      };
      const result = CreateReportSchema.safeParse(nullIsland);
      expect(result.success).toBe(false);
    });

    it("rejects submissions without explicit non-affiliation disclaimer acceptance", () => {
      const missingDisclaimer = {
        title: "Test Report without disclaimer",
        categoryId: "11111111-1111-4111-8111-111111111101",
        description: "Valid description of infrastructure failure.",
        latitude: 26.44992,
        longitude: 80.33187,
        acceptedNonAffiliationDisclaimer: false,
      };
      const result = CreateReportSchema.safeParse(missingDisclaimer);
      expect(result.success).toBe(false);
    });

    it("validates bounding box query parameters", () => {
      const bbox = {
        west: 80.3,
        south: 26.4,
        east: 80.4,
        north: 26.5,
        limit: 100,
      };
      const result = BoundingBoxQuerySchema.safeParse(bbox);
      expect(result.success).toBe(true);
    });
  });

  // 2. Binary Image Magic-Byte Verification
  describe("2. Image Magic-Byte Verification", () => {
    it("accepts valid JPEG buffer starting with FF D8 FF", () => {
      const buffer = new Uint8Array(100);
      buffer[0] = 0xff;
      buffer[1] = 0xd8;
      buffer[2] = 0xff;
      const res = validateImageMagicBytes(buffer, "image/jpeg");
      expect(res.valid).toBe(true);
      expect(res.detectedMime).toBe("image/jpeg");
    });

    it("accepts valid PNG buffer starting with 89 50 4E 47 0D 0A 1A 0A", () => {
      const buffer = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x00]);
      const res = validateImageMagicBytes(buffer, "image/png");
      expect(res.valid).toBe(true);
      expect(res.detectedMime).toBe("image/png");
    });

    it("accepts valid WebP buffer starting with RIFF....WEBP", () => {
      const buffer = new Uint8Array(14);
      buffer[0] = 0x52; // R
      buffer[1] = 0x49; // I
      buffer[2] = 0x46; // F
      buffer[3] = 0x46; // F
      buffer[8] = 0x57; // W
      buffer[9] = 0x45; // E
      buffer[10] = 0x42; // B
      buffer[11] = 0x50; // P
      const res = validateImageMagicBytes(buffer, "image/webp");
      expect(res.valid).toBe(true);
      expect(res.detectedMime).toBe("image/webp");
    });

    it("rejects malicious HTML/SVG file disguised as JPEG", () => {
      const fake = new TextEncoder().encode("<svg onload=alert(1)>");
      const res = validateImageMagicBytes(fake, "image/jpeg");
      expect(res.valid).toBe(false);
    });

    it("rejects files exceeding 5MB limit", () => {
      const oversized = new Uint8Array(5 * 1024 * 1024 + 1);
      oversized[0] = 0xff;
      oversized[1] = 0xd8;
      oversized[2] = 0xff;
      const res = validateImageMagicBytes(oversized, "image/jpeg");
      expect(res.valid).toBe(false);
      expect(res.error).toContain("5 MB");
    });
  });

  // 3. FSM Lifecycle State Transitions
  describe("3. Finite State Machine Transitions", () => {
    it("allows standard lifecycle progression from Submitted to Resolved", () => {
      const validChain: ReportStatus[] = [
        "Submitted",
        "Under review",
        "Accepted",
        "Assigned",
        "In progress",
        "Resolved",
        "Reopened",
      ];
      for (let i = 0; i < validChain.length - 1; i++) {
        expect(isValidStatusTransition(validChain[i], validChain[i + 1])).toBe(true);
      }
    });

    it("rejects illegal jump directly from Submitted to Resolved", () => {
      expect(isValidStatusTransition("Submitted", "Resolved")).toBe(false);
    });

    it("returns correct next allowed states for Accepted", () => {
      const allowed = getNextAllowedStates("Accepted");
      expect(allowed).toEqual(["Assigned", "In progress", "Rejected"]);
    });

    it("validates admin transition schema with mandatory public rationale", () => {
      const validTransition = {
        newStatus: "Under review",
        publicRationale: "Location and photo verified by municipal inspector.",
      };
      expect(AdminStatusTransitionSchema.safeParse(validTransition).success).toBe(true);

      const invalidTransition = {
        newStatus: "Under review",
        publicRationale: "   ", // Blank rationale
      };
      expect(AdminStatusTransitionSchema.safeParse(invalidTransition).success).toBe(false);
    });
  });

  // 4. Deterministic Duplicate Detection Formula
  describe("4. Deterministic Duplicate Formula", () => {
    it("computes composite duplicate score accurately using weighted formula", () => {
      const score = computeCompositeDuplicateScore({
        distanceMeters: 25,
        radiusMeters: 100,
        trigramSimilarity: 0.70,
        ageHours: 24,
        windowHours: 336,
      });
      // S_geo = 1 - 25/100 = 0.75 -> 0.45 * 0.75 = 0.3375
      // S_text = 0.70 -> 0.40 * 0.70 = 0.2800
      // S_time = 1 - 24/336 = 0.92857 -> 0.15 * 0.92857 = 0.13928
      // Sum = 0.3375 + 0.2800 + 0.13928 = 0.75678 -> 0.757
      expect(score).toBeCloseTo(0.757, 2);
    });

    it("identifies candidate duplicate when composite score >= 0.450", () => {
      const candidate = isDuplicateCandidate({
        distanceMeters: 20,
        radiusMeters: 75,
        trigramSimilarity: 0.65,
        ageHours: 12,
        windowHours: 336,
      });
      expect(candidate).toBe(true);
    });

    it("identifies candidate duplicate in extreme spatial-temporal proximity even with low text score", () => {
      const candidate = isDuplicateCandidate({
        distanceMeters: 10, // <= 15m
        radiusMeters: 100,
        trigramSimilarity: 0.10, // low text overlap
        ageHours: 8, // <= 24h
        windowHours: 336,
      });
      expect(candidate).toBe(true);
    });

    it("does not flag distant reports with low text similarity", () => {
      const candidate = isDuplicateCandidate({
        distanceMeters: 90,
        radiusMeters: 100,
        trigramSimilarity: 0.05,
        ageHours: 300,
        windowHours: 336,
      });
      expect(candidate).toBe(false);
    });
  });
});
