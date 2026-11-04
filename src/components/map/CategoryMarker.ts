import type { ReportStatus } from "@/lib/domain/types";

export const STATUS_BADGE_COLORS: Record<ReportStatus, string> = {
  Submitted: "#575B5F",
  "Under review": "#FA903E",
  Accepted: "#1A73E8",
  Assigned: "#4285F4",
  "In progress": "#12B5CB",
  Resolved: "#16A34A",
  Rejected: "#D93025",
  Reopened: "#F538A0",
};

export function generateMarkerSvgHtml(categoryColor: string, status: ReportStatus): string {
  const ringColor = STATUS_BADGE_COLORS[status] ?? "#174EA6";
  return `
    <div style="
      width: 28px;
      height: 28px;
      border-radius: 50% 50% 50% 0;
      background: ${categoryColor};
      border: 3px solid ${ringColor};
      transform: rotate(-45deg);
      box-shadow: 0 2px 6px rgba(17,17,17,0.35);
      display: flex;
      align-items: center;
      justify-content: center;
    ">
      <div style="
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background: #FFFFFF;
      "></div>
    </div>
  `;
}
