import { describe, it, expect, beforeEach } from "vitest";
import { MemoryCivicFixRepository } from "../src/lib/repository/memory-repository";
import type { ICivicFixRepository } from "../src/lib/repository/civicfix-repository.interface";

describe("Task 9: End-to-End User Journey & Lifecycle Governance", () => {
  let repo: ICivicFixRepository;

  beforeEach(async () => {
    repo = await MemoryCivicFixRepository.create();
  });

  it("executes the complete end-to-end civic defect lifecycle with auditability and security", async () => {
    // 1. Citizen discovers categories
    const categories = await repo.getCategories();
    const potholeCategory = categories.find((c) => c.slug === "potholes")!;
    expect(potholeCategory).toBeDefined();

    // 2. Citizen 1 submits a report for a deep pothole
    const citizenReport1 = await repo.createReport({
      title: "Hazardous crater pothole on North Ring Road",
      categoryId: potholeCategory.id,
      description: "A 50cm deep crater in the road right before the bypass junction.",
      latitude: 26.44992,
      longitude: 80.33187,
      approximateAddress: "North Ring Road Bypass Junction",
      isLocationFuzzed: false,
      acceptedNonAffiliationDisclaimer: true,
    }, "citizen-user-1");

    expect(citizenReport1.id).toBeDefined();
    expect(citizenReport1.reference_code).toMatch(/^CF-\d{4}-[A-Z0-9]{6}$/);
    expect(citizenReport1.status).toBe("Submitted");
    expect(citizenReport1.duplicate_auto_flagged).toBe(false);

    // 3. Verify public lookup by reference code
    const lookup1 = await repo.getReportByReference(citizenReport1.reference_code);
    expect(lookup1).not.toBeNull();
    expect(lookup1?.status_history.length).toBe(1);
    expect(lookup1?.status_history[0].new_status).toBe("Submitted");

    // 4. Citizen 2 submits near-duplicate 18 meters away with high text overlap
    const citizenReport2 = await repo.createReport({
      title: "Deep crater pothole on North Ring Road bypass",
      categoryId: potholeCategory.id,
      description: "A 50cm deep crater in the asphalt before the bypass junction.",
      latitude: 26.44995,
      longitude: 80.33202,
      isLocationFuzzed: false,
      acceptedNonAffiliationDisclaimer: true,
    }, "citizen-user-2");

    expect(citizenReport2.duplicate_auto_flagged).toBe(true);
    expect(citizenReport2.max_duplicate_score).toBeGreaterThanOrEqual(0.45);

    // 5. Moderator inspects pending flags queue
    const pendingFlags = await repo.getPendingFlags();
    const duplicateFlag = pendingFlags.find(
      (f) => f.report_id === citizenReport2.id && f.matched_report_id === citizenReport1.id
    );
    expect(duplicateFlag).toBeDefined();

    // 6. Municipal Administrator advances Report 1 through the 8-state FSM:
    // Submitted -> Under review
    const underReview = await repo.transitionReportStatus({
      reportId: citizenReport1.id,
      newStatus: "Under review",
      actorId: "admin-staff-1",
      actorRole: "admin",
      publicRationale: "Photographic evidence and coordinates verified by Zone 2 Triage.",
    });
    expect(underReview.status).toBe("Under review");

    // Under review -> Accepted
    const accepted = await repo.transitionReportStatus({
      reportId: citizenReport1.id,
      newStatus: "Accepted",
      actorId: "admin-staff-1",
      actorRole: "admin",
      publicRationale: "Confirmed arterial road hazard. Work order scheduled.",
    });
    expect(accepted.status).toBe("Accepted");

    // Accepted -> Assigned
    const assigned = await repo.transitionReportStatus({
      reportId: citizenReport1.id,
      newStatus: "Assigned",
      actorId: "admin-staff-1",
      actorRole: "admin",
      publicRationale: "Assigned to Pavement Maintenance Division Crew B.",
      internalAdminNote: "Subcontractor batch #AC-992 assigned.",
    });
    expect(assigned.status).toBe("Assigned");

    // Assigned -> In progress
    const inProgress = await repo.transitionReportStatus({
      reportId: citizenReport1.id,
      newStatus: "In progress",
      actorId: "admin-staff-1",
      actorRole: "admin",
      publicRationale: "Barricades placed. Cold-milling and asphalt patching actively underway.",
    });
    expect(inProgress.status).toBe("In progress");

    // In progress -> Resolved
    const resolved = await repo.transitionReportStatus({
      reportId: citizenReport1.id,
      newStatus: "Resolved",
      actorId: "admin-staff-1",
      actorRole: "admin",
      publicRationale: "Asphalt patch compacted, steamrolled, and reopened to bus traffic.",
    });
    expect(resolved.status).toBe("Resolved");
    expect(resolved.resolved_at).not.toBeNull();

    // 7. Verify full immutable audit history on Report 1
    const finalHistory = await repo.getStatusHistory(citizenReport1.id);
    expect(finalHistory.length).toBe(6); // Genesis + 5 transitions
    const finalStatuses = finalHistory.map((h) => h.new_status);
    expect(finalStatuses).toEqual([
      "Submitted",
      "Under review",
      "Accepted",
      "Assigned",
      "In progress",
      "Resolved",
    ]);

    // 8. Verify public vs private notes isolation
    const publicUpdates = await repo.getReportUpdates(citizenReport1.id, false);
    expect(publicUpdates.every((u) => u.is_public)).toBe(true);
    expect(publicUpdates.some((u) => u.body.includes("Subcontractor batch #AC-992"))).toBe(false);

    const allUpdates = await repo.getReportUpdates(citizenReport1.id, true);
    expect(allUpdates.some((u) => u.body.includes("Subcontractor batch #AC-992"))).toBe(true);

    // 9. Moderator marks candidate Report 2 as duplicate linked to Report 1
    await repo.recordModerationEvent({
      reportId: citizenReport2.id,
      flagId: duplicateFlag?.id,
      moderatorId: "mod-user-1",
      actionType: "marked_duplicate",
      actionNotes: "Confirmed duplicate of canonical report " + citizenReport1.reference_code,
      canonicalReportId: citizenReport1.id,
    });

    const report2Updated = await repo.getReportById(citizenReport2.id);
    expect(report2Updated?.status).toBe("Rejected");
    expect(report2Updated?.canonical_report_id).toBe(citizenReport1.id);

    // 10. Verify Public Analytics Partitioning
    const analytics = await repo.getPublicAnalytics();
    const { summary } = analytics;
    expect(summary.resolved_count).toBeGreaterThanOrEqual(1);
    expect(summary.closed_rejected_count).toBeGreaterThanOrEqual(1);
    expect(
      summary.resolved_count + summary.closed_rejected_count + summary.pending_active_count
    ).toBe(summary.total_reports);
    expect(summary.avg_resolution_hours).toBeDefined();
  });
});
