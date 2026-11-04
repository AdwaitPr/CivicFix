import type {
  IssueCategory,
  Report,
  ReportDetail,
  MapReportItem,
  ReportStatusHistory,
  ReportUpdate,
  ReportFlag,
  DuplicateCandidate,
  PublicAnalyticsSummary,
  ReportStatus,
  UserRole,
  FlagReason,
  FlagStatus,
} from "../domain/types";
import type {
  CreateReportInput,
  BoundingBoxQueryParams,
} from "../validation/civicfix-schemas";

export interface StatusTransitionParams {
  reportId: string;
  newStatus: ReportStatus;
  actorId: string;
  actorRole: UserRole;
  publicRationale: string;
  internalAdminNote?: string;
  canonicalReportId?: string;
}

export interface DuplicatePreviewParams {
  categoryId: string;
  latitude: number;
  longitude: number;
  title: string;
  description: string;
}

export interface CreateUpdateParams {
  reportId: string;
  authorId?: string;
  authorRole: UserRole;
  body: string;
  isPublic: boolean;
  isOfficialResponse: boolean;
}

export interface CreateFlagParams {
  reportId: string;
  matchedReportId?: string;
  flaggedBy?: string;
  reason: FlagReason;
  details?: string;
}

export interface ModerationEventParams {
  reportId: string;
  flagId?: string;
  moderatorId: string;
  actionType:
    | "flag_dismissed"
    | "marked_duplicate"
    | "report_hidden"
    | "report_restored"
    | "media_redacted"
    | "pii_scrubbed"
    | "user_warned";
  actionNotes: string;
  canonicalReportId?: string;
}

export interface ICivicFixRepository {
  // Categories
  getCategories(): Promise<IssueCategory[]>;
  getCategoryBySlug(slug: string): Promise<IssueCategory | null>;
  getCategoryById(id: string): Promise<IssueCategory | null>;

  // Reports
  createReport(
    params: CreateReportInput,
    reporterId?: string,
    clientIpHash?: string
  ): Promise<Report>;
  getReportById(id: string): Promise<Report | null>;
  getReportByReference(referenceCode: string): Promise<ReportDetail | null>;
  searchReportsInBBox(params: BoundingBoxQueryParams): Promise<MapReportItem[]>;
  getUserReports(reporterId: string): Promise<Report[]>;
  deleteSubmittedReport(
    reportId: string,
    actorId: string,
    isAdmin: boolean
  ): Promise<boolean>;

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
