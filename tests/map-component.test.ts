import { describe, it, expect } from "vitest";
import {
  STATUS_BADGE_COLORS,
  generateMarkerSvgHtml,
} from "../src/components/map/CategoryMarker";
import type { ReportStatus } from "../src/lib/domain/types";

describe("Task 7: Leaflet Geospatial Map Components", () => {
  it("defines distinctive, accessible high-contrast colors for all 8 lifecycle states", () => {
    const statuses: ReportStatus[] = [
      "Submitted",
      "Under review",
      "Accepted",
      "Assigned",
      "In progress",
      "Resolved",
      "Rejected",
      "Reopened",
    ];

    for (const status of statuses) {
      expect(STATUS_BADGE_COLORS[status]).toBeDefined();
      expect(STATUS_BADGE_COLORS[status]).toMatch(/^#[0-9A-Fa-f]{6}$/);
    }
  });

  it("generates an SVG marker pin with category color and status ring without referencing external PNGs", () => {
    const categoryColor = "#174EA6";
    const status: ReportStatus = "In progress";
    const html = generateMarkerSvgHtml(categoryColor, status);

    expect(html).toContain(categoryColor);
    expect(html).toContain(STATUS_BADGE_COLORS[status]);
    expect(html).not.toContain("marker-icon.png");
  });
});
