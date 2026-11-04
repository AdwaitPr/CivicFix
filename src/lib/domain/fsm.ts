import { REPORT_STATUS_VALUES, ReportStatus } from "./types";

export const VALID_STATE_TRANSITIONS: Record<ReportStatus, readonly ReportStatus[]> = {
  Submitted: ["Under review", "Rejected"],
  "Under review": ["Accepted", "Rejected"],
  Accepted: ["Assigned", "In progress", "Rejected"],
  Assigned: ["In progress", "Accepted", "Rejected"],
  "In progress": ["Resolved", "Assigned", "Accepted"],
  Resolved: ["Reopened"],
  Rejected: ["Reopened", "Under review"],
  Reopened: ["Under review", "Accepted", "Assigned", "In progress", "Rejected"],
};

export function isValidStatusTransition(
  currentStatus: ReportStatus,
  targetStatus: ReportStatus
): boolean {
  const allowed = VALID_STATE_TRANSITIONS[currentStatus];
  if (!allowed) return false;
  return allowed.includes(targetStatus);
}

export function getNextAllowedStates(currentStatus: ReportStatus): readonly ReportStatus[] {
  return VALID_STATE_TRANSITIONS[currentStatus] ?? [];
}
