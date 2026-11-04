export const USER_ROLES = [
  "citizen",
  "community_org",
  "moderator",
  "admin",
] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const REPORT_STATUS_VALUES = [
  "Submitted",
  "Under review",
  "Accepted",
  "Assigned",
  "In progress",
  "Resolved",
  "Rejected",
  "Reopened",
] as const;
export type ReportStatus = (typeof REPORT_STATUS_VALUES)[number];

export const FLAG_REASONS = [
  "potential_duplicate",
  "spam",
  "abusive_or_harassment",
  "privacy_or_pii",
  "false_allegation",
  "inaccurate_location",
  "malicious_media",
] as const;
export type FlagReason = (typeof FLAG_REASONS)[number];

export const FLAG_STATUSES = ["pending", "confirmed", "dismissed"] as const;
export type FlagStatus = (typeof FLAG_STATUSES)[number];

export interface Profile {
  id: string;
  display_name: string;
  role: UserRole;
  organization_name?: string | null;
  jurisdiction_code?: string | null;
  is_verified_authority: boolean;
  is_banned: boolean;
  created_at: string;
  updated_at: string;
}

export interface IssueCategory {
  id: string;
  slug: string;
  name: string;
  description: string;
  icon_name: string;
  color_hex: string;
  duplicate_radius_meters: number;
  duplicate_window_hours: number;
  is_sensitive_location: boolean;
  is_active: boolean;
  display_order: number;
  created_at?: string;
}

export interface Report {
  id: string;
  reference_code: string;
  reporter_id?: string | null;
  category_id: string;
  title: string;
  description: string;
  search_text?: string;
  status: ReportStatus;
  latitude: number;
  longitude: number;
  public_latitude: number;
  public_longitude: number;
  is_location_fuzzed: boolean;
  approximate_address?: string | null;
  canonical_report_id?: string | null;
  duplicate_auto_flagged: boolean;
  max_duplicate_score: number;
  upvotes_count: number;
  reopen_count: number;
  is_hidden: boolean;
  hidden_reason?: string | null;
  authority_acknowledged: boolean;
  submitter_ip_hash?: string | null;
  resolved_at?: string | null;
  closed_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface ReportMedia {
  id: string;
  report_id: string;
  uploaded_by?: string | null;
  storage_path: string;
  public_url: string;
  mime_type: "image/jpeg" | "image/png" | "image/webp";
  file_size_bytes: number;
  sha256_checksum: string;
  exif_stripped: boolean;
  is_flagged_graphic: boolean;
  created_at: string;
}

export interface ReportStatusHistory {
  id: string;
  report_id: string;
  previous_status?: ReportStatus | null;
  new_status: ReportStatus;
  changed_by?: string | null;
  public_rationale: string;
  created_at: string;
}

export interface ReportUpdate {
  id: string;
  report_id: string;
  author_id?: string | null;
  author_role: UserRole;
  body: string;
  is_public: boolean;
  is_official_response: boolean;
  created_at: string;
}

export interface ReportFlag {
  id: string;
  report_id: string;
  matched_report_id?: string | null;
  flagged_by?: string | null;
  reason: FlagReason;
  status: FlagStatus;
  similarity_score?: number | null;
  distance_meters?: number | null;
  details?: string | null;
  reviewed_by?: string | null;
  reviewed_at?: string | null;
  created_at: string;
}

export interface AdminAssignment {
  id: string;
  report_id: string;
  assigned_to?: string | null;
  assigned_by: string;
  department_name: string;
  external_ticket_ref?: string | null;
  priority_level: number;
  due_at?: string | null;
  completed_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface ModerationEvent {
  id: string;
  report_id: string;
  flag_id?: string | null;
  moderator_id: string;
  action_type:
    | "flag_dismissed"
    | "marked_duplicate"
    | "report_hidden"
    | "report_restored"
    | "media_redacted"
    | "pii_scrubbed"
    | "user_warned";
  action_notes: string;
  created_at: string;
}

export interface MapReportItem {
  id: string;
  reference_code: string;
  title: string;
  description_excerpt: string;
  status: ReportStatus;
  category_slug: string;
  category_name: string;
  category_color: string;
  latitude: number;
  longitude: number;
  is_location_fuzzed: boolean;
  approximate_address?: string | null;
  upvotes_count: number;
  duplicate_auto_flagged: boolean;
  primary_photo_url?: string | null;
  created_at: string;
}

export interface ReportDetail extends Report {
  category?: IssueCategory;
  media: ReportMedia[];
  status_history: ReportStatusHistory[];
  updates: ReportUpdate[];
}

export interface DuplicateCandidate {
  candidate_id: string;
  reference_code: string;
  title: string;
  status: ReportStatus;
  distance_meters: number;
  text_similarity: number;
  composite_score: number;
  created_at: string;
}

export interface PublicAnalyticsSummary {
  generated_at: string;
  summary: {
    total_reports: number;
    resolved_count: number;
    closed_rejected_count: number;
    pending_active_count: number;
    avg_resolution_hours: number | null;
    duplicate_flagged_count: number;
  };
  by_category: Array<{
    slug: string;
    name: string;
    color_hex: string;
    total_count: number;
    resolved_count: number;
    closed_count: number;
    pending_count: number;
  }>;
  by_status: Array<{
    status: ReportStatus;
    count: number;
  }>;
  geographic_clusters: Array<{
    grid_lat: number;
    grid_lng: number;
    report_count: number;
    resolved_count: number;
  }>;
}
