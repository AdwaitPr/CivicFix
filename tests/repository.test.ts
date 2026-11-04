import { describe, it, expect, beforeEach } from "vitest";
import { MemoryCivicFixRepository } from "../src/lib/repository/memory-repository";
import { SqliteCivicFixRepository } from "../src/lib/repository/sqlite-repository";
import { SqliteAdapter } from "../src/lib/db/sqlite-adapter";
import { initSqliteSchema } from "../src/lib/db/sqlite-init";
import type { ICivicFixRepository } from "../src/lib/repository/civicfix-repository.interface";

describe("Task 4: Dual-Mode Repository & Data Access Layer", () => {
  let memoryRepo: ICivicFixRepository;
  let sqliteRepo: ICivicFixRepository;

  beforeEach(async () => {
    // 1. Initialize In-Memory Repository
    memoryRepo = await MemoryCivicFixRepository.create();

    // 2. Initialize In-Memory SQLite Adapter
    const adapter = await SqliteAdapter.create();
    initSqliteSchema(adapter, true); // true = seed default data
    sqliteRepo = new SqliteCivicFixRepository(adapter);
  });

  describe("1. Category Management", () => {
    it("retrieves the 8 default seeded categories in SQLite repo", async () => {
      const categories = await sqliteRepo.getCategories();
      expect(categories.length).toBe(8);
      expect(categories.some((c) => c.slug === "potholes")).toBe(true);
      expect(categories.some((c) => c.slug === "water-leakage")).toBe(true);
    });

    it("retrieves seeded categories in In-Memory repo", async () => {
      const categories = await memoryRepo.getCategories();
      expect(categories.length).toBe(8);
    });
  });

  describe("2. Report Creation & Cryptographic Reference", () => {
    it("creates a report with CF-YYYY-XXXXXX reference in SQLite repo", async () => {
      const categories = await sqliteRepo.getCategories();
      const potholeCat = categories.find((c) => c.slug === "potholes")!;

      const report = await sqliteRepo.createReport({
        title: "Dangerous pothole on South Bridge",
        categoryId: potholeCat.id,
        description: "Deep cavity in the roadway right after the bridge ramp.",
        latitude: 26.44992,
        longitude: 80.33187,
        isLocationFuzzed: false,
        acceptedNonAffiliationDisclaimer: true,
      });

      expect(report.id).toBeDefined();
      expect(report.reference_code).toMatch(/^CF-\d{4}-[A-Z0-9]{6}$/);
      expect(report.status).toBe("Submitted");

      // Verify immutable genesis history
      const history = await sqliteRepo.getStatusHistory(report.id);
      expect(history.length).toBe(1);
      expect(history[0].new_status).toBe("Submitted");
    });
  });

  describe("3. Bounding-Box Geospatial Search", () => {
    it("finds reports inside bounding box and filters out reports outside", async () => {
      const categories = await sqliteRepo.getCategories();
      const cat = categories[0];

      // Insert Report Inside: lat 26.45, lng 80.33
      await sqliteRepo.createReport({
        title: "Inside BBox Report",
        categoryId: cat.id,
        description: "This issue is located inside Kanpur bounding box.",
        latitude: 26.45,
        longitude: 80.33,
        isLocationFuzzed: false,
        acceptedNonAffiliationDisclaimer: true,
      });

      // Insert Report Outside: lat 28.61, lng 77.20 (Delhi)
      await sqliteRepo.createReport({
        title: "Outside BBox Report",
        categoryId: cat.id,
        description: "This issue is located far outside in Delhi.",
        latitude: 28.61,
        longitude: 77.20,
        isLocationFuzzed: false,
        acceptedNonAffiliationDisclaimer: true,
      });

      const results = await sqliteRepo.searchReportsInBBox({
        west: 80.30,
        south: 26.40,
        east: 80.40,
        north: 26.50,
      });

      expect(results.some((r) => r.title === "Inside BBox Report")).toBe(true);
      expect(results.some((r) => r.title === "Outside BBox Report")).toBe(false);
    });
  });

  describe("4. Deterministic Duplicate Candidate Flagging", () => {
    it("flags duplicate candidate and writes to report_flags without auto-merging", async () => {
      const categories = await sqliteRepo.getCategories();
      const potholeCat = categories.find((c) => c.slug === "potholes")!;

      // 1. Initial Report
      const first = await sqliteRepo.createReport({
        title: "Severe crater pothole at central market lane",
        categoryId: potholeCat.id,
        description: "Deep cavity in the center of the road causing two-wheelers to fall.",
        latitude: 26.44992,
        longitude: 80.33187,
        isLocationFuzzed: false,
        acceptedNonAffiliationDisclaimer: true,
      });

      // 2. Near-duplicate Report 15 meters away with high text overlap
      const second = await sqliteRepo.createReport({
        title: "Severe crater pothole at central market road",
        categoryId: potholeCat.id,
        description: "Deep cavity in the road near the central market where vehicles swerve.",
        latitude: 26.44998,
        longitude: 80.33195,
        isLocationFuzzed: false,
        acceptedNonAffiliationDisclaimer: true,
      });

      expect(second.duplicate_auto_flagged).toBe(true);
      expect(second.max_duplicate_score).toBeGreaterThanOrEqual(0.45);

      const flags = await sqliteRepo.getPendingFlags();
      expect(flags.some((f) => f.report_id === second.id && f.matched_report_id === first.id)).toBe(true);
    });
  });

  describe("5. Status Transition & Audit Trail", () => {
    it("transitions report status and writes immutable history", async () => {
      const categories = await sqliteRepo.getCategories();
      const report = await sqliteRepo.createReport({
        title: "Broken streetlight pole on Ring Road",
        categoryId: categories.find((c) => c.slug === "broken-streetlights")!.id,
        description: "Pole #12 is flickering and dark all night.",
        latitude: 26.44,
        longitude: 80.33,
        isLocationFuzzed: false,
        acceptedNonAffiliationDisclaimer: true,
      });

      // Move Submitted -> Under review
      const updated = await sqliteRepo.transitionReportStatus({
        reportId: report.id,
        newStatus: "Under review",
        actorId: "admin-uuid-1",
        actorRole: "admin",
        publicRationale: "Verified by road safety inspector.",
      });

      expect(updated.status).toBe("Under review");

      const history = await sqliteRepo.getStatusHistory(report.id);
      expect(history.length).toBe(2);
      expect(history[1].previous_status).toBe("Submitted");
      expect(history[1].new_status).toBe("Under review");
      expect(history[1].public_rationale).toBe("Verified by road safety inspector.");
    });

    it("rejects invalid status transitions with clear error", async () => {
      const categories = await sqliteRepo.getCategories();
      const report = await sqliteRepo.createReport({
        title: "Broken drain",
        categoryId: categories[0].id,
        description: "Drain cover broken causing hazard.",
        latitude: 26.44,
        longitude: 80.33,
        isLocationFuzzed: false,
        acceptedNonAffiliationDisclaimer: true,
      });

      // Illegal transition Submitted -> Resolved
      await expect(
        sqliteRepo.transitionReportStatus({
          reportId: report.id,
          newStatus: "Resolved",
          actorId: "admin-uuid-1",
          actorRole: "admin",
          publicRationale: "Cannot jump directly to resolved.",
        })
      ).rejects.toThrow(/Invalid lifecycle state transition/);
    });
  });

  describe("6. Public Analytics Partitioning", () => {
    it("calculates analytics partitioned into Resolved, Closed, and Pending", async () => {
      const analytics = await sqliteRepo.getPublicAnalytics();
      expect(analytics.summary).toBeDefined();
      const { resolved_count, closed_rejected_count, pending_active_count, total_reports } = analytics.summary;
      expect(resolved_count + closed_rejected_count + pending_active_count).toBe(total_reports);
    });
  });
});
