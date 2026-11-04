# Low-Level Design (LLD) — CivicFix

## 1. Domain Interfaces and Entities

### 1.1 Core Entities
- **Profile (`profiles`)**: `id` (UUID), `display_name`, `role` (`user_role`), `organization_name`, `jurisdiction_code`, `is_verified_authority`, `is_banned`, `created_at`, `updated_at`.
- **IssueCategory (`issue_categories`)**: `id`, `slug`, `name`, `description`, `icon_name`, `color_hex`, `duplicate_radius_meters`, `duplicate_window_hours`, `is_sensitive_location`, `is_active`, `display_order`.
- **Report (`reports`)**: `id`, `reference_code` (`CF-YYYY-XXXXXX`), `reporter_id`, `category_id`, `title`, `description`, `search_text`, `status` (`report_status`), `location` (WGS 84 geography/point), `public_latitude`, `public_longitude`, `is_location_fuzzed`, `approximate_address`, `canonical_report_id`, `duplicate_auto_flagged`, `max_duplicate_score`, `upvotes_count`, `reopen_count`, `is_hidden`, `authority_acknowledged`, `resolved_at`, `closed_at`, `created_at`, `updated_at`.
- **ReportMedia (`report_media`)**: `id`, `report_id`, `uploaded_by`, `storage_path`, `public_url`, `mime_type`, `file_size_bytes`, `sha256_checksum`, `exif_stripped`, `is_flagged_graphic`.
- **ReportStatusHistory (`report_status_history`)**: `id`, `report_id`, `previous_status`, `new_status`, `changed_by`, `public_rationale`, `created_at`.
- **ReportUpdate (`report_updates`)**: `id`, `report_id`, `author_id`, `author_role`, `body`, `is_public`, `is_official_response`, `created_at`.
- **ReportFlag (`report_flags`)**: `id`, `report_id`, `matched_report_id`, `flagged_by`, `reason`, `status`, `similarity_score`, `distance_meters`, `details`, `reviewed_by`, `reviewed_at`.
- **AdminAssignment (`admin_assignments`)**: `id`, `report_id`, `assigned_to`, `assigned_by`, `department_name`, `external_ticket_ref`, `priority_level`, `due_at`, `completed_at`.
- **ModerationEvent (`moderation_events`)**: `id`, `report_id`, `flag_id`, `moderator_id`, `action_type`, `action_notes`, `created_at`.

### 1.2 Repository Interface (`ICivicFixRepository`)
```typescript
export interface ICivicFixRepository {
  // Categories
  getCategories(): Promise<IssueCategory[]>;
  getCategoryBySlug(slug: string): Promise<IssueCategory | null>;

  // Reports
  createReport(params: CreateReportInput, reporterId?: string, clientIp?: string): Promise<Report>;
  getReportById(id: string): Promise<Report | null>;
  getReportByReference(referenceCode: string): Promise<ReportDetail | null>;
  searchReportsInBBox(params: BoundingBoxQueryParams): Promise<MapReportItem[]>;
  getUserReports(reporterId: string): Promise<Report[]>;
  deleteSubmittedReport(reportId: string, actorId: string, isAdmin: boolean): Promise<boolean>;

  // Duplicates
  previewDuplicates(params: DuplicatePreviewParams): Promise<DuplicateCandidate[]>;

  // Status & Lifecycle
  transitionReportStatus(params: StatusTransitionParams): Promise<Report>;
  getStatusHistory(reportId: string): Promise<ReportStatusHistory[]>;

  // Updates & Notes
  addReportUpdate(params: CreateUpdateParams): Promise<ReportUpdate>;
  getReportUpdates(reportId: string, includePrivate: boolean): Promise<ReportUpdate[]>;

  // Flags & Moderation
  createFlag(params: CreateFlagParams): Promise<ReportFlag>;
  getPendingFlags(): Promise<ReportFlag[]>;
  recordModerationEvent(params: ModerationEventParams): Promise<void>;

  // Analytics
  getPublicAnalytics(): Promise<PublicAnalyticsSummary>;
}
```

## 2. Duplicate Detection Algorithm Formulation
Given a new report $R_{\text{new}}$ with category $c$, location $p_{\text{new}}$, text $T_{\text{new}}$, and timestamp $t_{\text{new}}$:
- $S_{\text{geo}} = \max\left(0, 1 - \frac{\text{Distance}(p_{\text{new}}, p_i)}{D_c}\right)$
- $S_{\text{text}} = \text{similarity}(T_{\text{new}}, T_i)$ with fallback substring match if string length $< 12$.
- $S_{\text{time}} = \max\left(0, 1 - \frac{|t_{\text{new}} - t_i|}{W_c}\right)$
- $S_{\text{dup}} = 0.45 \cdot S_{\text{geo}} + 0.40 \cdot S_{\text{text}} + 0.15 \cdot S_{\text{time}}$

Trigger threshold: $S_{\text{dup}} \ge 0.450$ OR $(\text{Distance} \le 15\text{m} \land \text{Age} \le 24\text{h})$.
