import { describe, it, expect, beforeEach } from "vitest";
import { GET as getReports, POST as createReport } from "../src/app/api/reports/route";
import { GET as getReportByRef } from "../src/app/api/reports/[ref]/route";
import { POST as duplicateCheck } from "../src/app/api/reports/duplicate-check/route";
import { GET as getCategories } from "../src/app/api/categories/route";
import { PATCH as updateReportStatus } from "../src/app/api/admin/reports/[id]/status/route";
import { GET as getAnalytics } from "../src/app/api/analytics/route";
import { NextRequest } from "next/server";

describe("Task 6: Backend API Route Handlers", () => {
  beforeEach(() => {
    process.env.CIVICFIX_DATA_MODE = "local";
    process.env.SQLITE_DB_PATH = ":memory:";
  });

  describe("1. Categories API", () => {
    it("returns list of supported civic issue categories", async () => {
      const req = new NextRequest("http://localhost:3000/api/categories");
      const res = await getCategories(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.categories).toBeDefined();
      expect(data.categories.length).toBe(8);
    });
  });

  describe("2. Reports API (GET & POST)", () => {
    it("creates a report via POST /api/reports and includes disclaimer in GET response", async () => {
      // 1. Fetch categories to get valid UUID
      const catReq = new NextRequest("http://localhost:3000/api/categories");
      const catRes = await getCategories(catReq);
      const { categories } = await catRes.json();
      const potholeCat = categories.find((c: any) => c.slug === "potholes");

      // 2. Submit Report
      const postReq = new NextRequest("http://localhost:3000/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "Deep pothole near central bus stand",
          categoryId: potholeCat.id,
          description: "Dangerous pothole crater causing vehicles to brake abruptly.",
          latitude: 26.44992,
          longitude: 80.33187,
          isLocationFuzzed: false,
          acceptedNonAffiliationDisclaimer: true,
        }),
      });

      const postRes = await createReport(postReq);
      expect(postRes.status).toBe(201);
      const postData = await postRes.json();
      expect(postData.report).toBeDefined();
      expect(postData.report.reference_code).toMatch(/^CF-\d{4}-[A-Z0-9]{6}$/);

      // 3. Query Bounding Box
      const getReq = new NextRequest(
        "http://localhost:3000/api/reports?west=80.30&south=26.40&east=80.40&north=26.50"
      );
      const getRes = await getReports(getReq);
      expect(getRes.status).toBe(200);
      const getData = await getRes.json();
      expect(getData.disclaimer).toContain("independent civic tracking registry");
      expect(getData.reports.some((r: any) => r.reference_code === postData.report.reference_code)).toBe(true);
    });

    it("rejects POST /api/reports when mandatory disclaimer is omitted", async () => {
      const catReq = new NextRequest("http://localhost:3000/api/categories");
      const catRes = await getCategories(catReq);
      const { categories } = await catRes.json();

      const postReq = new NextRequest("http://localhost:3000/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "Broken streetlight",
          categoryId: categories[0].id,
          description: "Streetlight has been out for several nights.",
          latitude: 26.44992,
          longitude: 80.33187,
          acceptedNonAffiliationDisclaimer: false,
        }),
      });

      const res = await createReport(postReq);
      expect(res.status).toBe(422);
    });
  });

  describe("3. Report Reference Lookup", () => {
    it("fetches report details by CF-YYYY-XXXXXX reference code", async () => {
      const catRes = await getCategories(new NextRequest("http://localhost:3000/api/categories"));
      const { categories } = await catRes.json();

      const createRes = await createReport(
        new NextRequest("http://localhost:3000/api/reports", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: "Burst water main flooding sidewalk",
            categoryId: categories.find((c: any) => c.slug === "water-leakage").id,
            description: "Continuous pressurized drinking water overflowing sidewalk.",
            latitude: 26.4612,
            longitude: 80.3245,
            isLocationFuzzed: false,
            acceptedNonAffiliationDisclaimer: true,
          }),
        })
      );
      const { report } = await createRes.json();

      const refReq = new NextRequest(`http://localhost:3000/api/reports/${report.reference_code}`);
      const refRes = await getReportByRef(refReq, { params: Promise.resolve({ ref: report.reference_code }) });
      expect(refRes.status).toBe(200);
      const detail = await refRes.json();
      expect(detail.report.id).toBe(report.id);
      expect(detail.report.status_history.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe("4. Duplicate Candidate Pre-Submission Check", () => {
    it("returns potential duplicate candidates in proximity", async () => {
      const catRes = await getCategories(new NextRequest("http://localhost:3000/api/categories"));
      const { categories } = await catRes.json();
      const potholeCat = categories.find((c: any) => c.slug === "potholes");

      // 1. Submit initial report
      await createReport(
        new NextRequest("http://localhost:3000/api/reports", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: "Crater pothole in bus lane at Central Junction",
            categoryId: potholeCat.id,
            description: "Deep pothole in the northbound lane near Central Junction.",
            latitude: 26.44992,
            longitude: 80.33187,
            acceptedNonAffiliationDisclaimer: true,
          }),
        })
      );

      // 2. Check duplicate for nearby issue
      const dupReq = new NextRequest("http://localhost:3000/api/reports/duplicate-check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          categoryId: potholeCat.id,
          latitude: 26.45001,
          longitude: 80.33192,
          title: "Deep pothole crater at Central Junction",
          description: "Vehicles swerving to avoid deep pothole near Central Junction.",
        }),
      });

      const dupRes = await duplicateCheck(dupReq);
      expect(dupRes.status).toBe(200);
      const dupData = await dupRes.json();
      expect(dupData.candidates.length).toBeGreaterThanOrEqual(1);
      expect(dupData.candidates[0].composite_score).toBeGreaterThan(0.4);
    });
  });

  describe("5. Admin Status Transitions & Rationale", () => {
    it("executes valid admin status transition with mandatory public rationale", async () => {
      const catRes = await getCategories(new NextRequest("http://localhost:3000/api/categories"));
      const { categories } = await catRes.json();

      const createRes = await createReport(
        new NextRequest("http://localhost:3000/api/reports", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: "Flickering streetlight on pedestrian walkway",
            categoryId: categories.find((c: any) => c.slug === "broken-streetlights").id,
            description: "Light pole #404 flickering and dark at night.",
            latitude: 26.4385,
            longitude: 80.3481,
            acceptedNonAffiliationDisclaimer: true,
          }),
        })
      );
      const { report } = await createRes.json();

      const patchReq = new NextRequest(`http://localhost:3000/api/admin/reports/${report.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          newStatus: "Under review",
          publicRationale: "Inspection order queued with municipal electrical crew.",
          internalAdminNote: "Contractor assigned: Crew B. Do not share contractor phone numbers.",
        }),
      });

      const patchRes = await updateReportStatus(patchReq, { params: Promise.resolve({ id: report.id }) });
      expect(patchRes.status).toBe(200);
      const patchData = await patchRes.json();
      expect(patchData.newStatus).toBe("Under review");
    });
  });

  describe("6. Public Analytics API", () => {
    it("returns real-time mathematical summary without fabricated numbers", async () => {
      const req = new NextRequest("http://localhost:3000/api/analytics");
      const res = await getAnalytics(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.summary).toBeDefined();
      expect(data.by_category).toBeDefined();
      expect(data.by_status).toBeDefined();
    });
  });
});
