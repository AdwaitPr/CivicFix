import crypto from "crypto";
import type { SqliteAdapter } from "../db/sqlite-adapter";
import type {
  ICivicFixRepository,
  StatusTransitionParams,
  DuplicatePreviewParams,
  CreateUpdateParams,
  CreateFlagParams,
  ModerationEventParams,
} from "./civicfix-repository.interface";
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
} from "../domain/types";
import type {
  CreateReportInput,
  BoundingBoxQueryParams,
} from "../validation/civicfix-schemas";
import { isValidStatusTransition } from "../domain/fsm";
import {
  calculateTrigramSimilarity,
  computeCompositeDuplicateScore,
  isDuplicateCandidate,
} from "../domain/duplicate";

/**
 * Calculates great-circle distance in meters between two lat/lng coordinates (Haversine formula).
 */
export function calculateHaversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000; // Earth radius in meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 100) / 100;
}

export class SqliteCivicFixRepository implements ICivicFixRepository {
  constructor(protected db: SqliteAdapter) {}

  async getCategories(): Promise<IssueCategory[]> {
    const rows = this.db.all<any>(
      `SELECT * FROM issue_categories WHERE is_active = 1 ORDER BY display_order ASC`
    );

    return rows.map((r) => ({
      ...r,
      is_sensitive_location: Boolean(r.is_sensitive_location),
      is_active: Boolean(r.is_active),
    }));
  }

  async getCategoryBySlug(slug: string): Promise<IssueCategory | null> {
    const row = this.db.get<any>(`SELECT * FROM issue_categories WHERE slug = ?`, [slug]);
    if (!row) return null;
    return {
      ...row,
      is_sensitive_location: Boolean(row.is_sensitive_location),
      is_active: Boolean(row.is_active),
    };
  }

  async getCategoryById(id: string): Promise<IssueCategory | null> {
    const row = this.db.get<any>(`SELECT * FROM issue_categories WHERE id = ?`, [id]);
    if (!row) return null;
    return {
      ...row,
      is_sensitive_location: Boolean(row.is_sensitive_location),
      is_active: Boolean(row.is_active),
    };
  }

  async createReport(
    params: CreateReportInput,
    reporterId?: string,
    clientIpHash?: string
  ): Promise<Report> {
    const category = await this.getCategoryById(params.categoryId);
    if (!category) {
      throw new Error(`Category not found: ${params.categoryId}`);
    }

    const reportId = crypto.randomUUID();
    const year = new Date().getFullYear();
    const randomHex = crypto.randomBytes(3).toString("hex").toUpperCase();
    const referenceCode = `CF-${year}-${randomHex}`;
    const now = new Date().toISOString();

    const isSensitive = category.is_sensitive_location || params.isLocationFuzzed;
    const publicLat = isSensitive
      ? Number(params.latitude.toFixed(3))
      : Number(params.latitude.toFixed(5));
    const publicLng = isSensitive
      ? Number(params.longitude.toFixed(3))
      : Number(params.longitude.toFixed(5));
    const searchText = `${params.title.toLowerCase()} ${params.description.toLowerCase()}`;

    // 1. Insert Report
    this.db.run(
      `
        INSERT INTO reports (
          id, reference_code, reporter_id, category_id, title, description,
          search_text, status, latitude, longitude, public_latitude, public_longitude,
          is_location_fuzzed, approximate_address, submitter_ip_hash, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, 'Submitted', ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        reportId,
        referenceCode,
        reporterId ?? null,
        params.categoryId,
        params.title,
        params.description,
        searchText,
        params.latitude,
        params.longitude,
        publicLat,
        publicLng,
        isSensitive ? 1 : 0,
        params.approximateAddress ?? null,
        clientIpHash ?? null,
        now,
        now,
      ]
    );

    // 2. Genesis Status History Record
    this.db.run(
      `
        INSERT INTO report_status_history (
          id, report_id, previous_status, new_status, changed_by, public_rationale, created_at
        ) VALUES (?, ?, NULL, 'Submitted', ?, ?, ?)
      `,
      [
        crypto.randomUUID(),
        reportId,
        reporterId ?? null,
        `Initial citizen report submitted and assigned reference ${referenceCode}`,
        now,
      ]
    );

    // 3. Deterministic Duplicate Detection
    const windowHours = category.duplicate_window_hours;
    const radiusMeters = category.duplicate_radius_meters;
    const windowCutoff = new Date(Date.now() - windowHours * 3600 * 1000).toISOString();

    const existingReports = this.db.all<any>(
      `
        SELECT id, title, description, search_text, latitude, longitude, created_at
        FROM reports
        WHERE id != ? AND category_id = ? AND is_hidden = 0 AND status != 'Rejected' AND created_at >= ?
      `,
      [reportId, params.categoryId, windowCutoff]
    );

    let maxDuplicateScore = 0.0;
    let autoFlagged = false;

    for (const cand of existingReports) {
      const dist = calculateHaversineDistance(
        params.latitude,
        params.longitude,
        cand.latitude,
        cand.longitude
      );

      if (dist <= radiusMeters) {
        const candCreated = new Date(cand.created_at).getTime();
        const ageHours = Math.max(0, (Date.now() - candCreated) / (3600 * 1000));
        const trgmSim = calculateTrigramSimilarity(searchText, cand.search_text);

        const isCandidate = isDuplicateCandidate({
          distanceMeters: dist,
          radiusMeters,
          trigramSimilarity: trgmSim,
          ageHours,
          windowHours,
        });

        if (isCandidate) {
          const compScore = computeCompositeDuplicateScore({
            distanceMeters: dist,
            radiusMeters,
            trigramSimilarity: trgmSim,
            ageHours,
            windowHours,
          });

          autoFlagged = true;
          if (compScore > maxDuplicateScore) {
            maxDuplicateScore = compScore;
          }

          this.db.run(
            `
              INSERT INTO report_flags (
                id, report_id, matched_report_id, reason, status, similarity_score,
                distance_meters, details, created_at
              ) VALUES (?, ?, ?, 'potential_duplicate', 'pending', ?, ?, ?, ?)
            `,
            [
              crypto.randomUUID(),
              reportId,
              cand.id,
              compScore,
              dist,
              `Automated flag: Composite=${compScore} (TextSim=${trgmSim}, Dist=${dist}m, AgeHours=${ageHours.toFixed(1)})`,
              now,
            ]
          );
        }
      }
    }

    if (autoFlagged) {
      this.db.run(
        `
          UPDATE reports
          SET duplicate_auto_flagged = 1, max_duplicate_score = ?
          WHERE id = ?
        `,
        [maxDuplicateScore, reportId]
      );
    }

    return (await this.getReportById(reportId))!;
  }

  async getReportById(id: string): Promise<Report | null> {
    const row = this.db.get<any>(`SELECT * FROM reports WHERE id = ?`, [id]);
    if (!row) return null;
    return this.mapReportRow(row);
  }

  async getReportByReference(referenceCode: string): Promise<ReportDetail | null> {
    const row = this.db.get<any>(`SELECT * FROM reports WHERE reference_code = ?`, [referenceCode]);
    if (!row) return null;

    const report = this.mapReportRow(row);
    const category = await this.getCategoryById(report.category_id);
    const media = this.db
      .all<any>(`SELECT * FROM report_media WHERE report_id = ? ORDER BY created_at ASC`, [report.id])
      .map((m) => ({
        ...m,
        exif_stripped: Boolean(m.exif_stripped),
        is_flagged_graphic: Boolean(m.is_flagged_graphic),
      }));

    const status_history = this.db.all<any>(
      `SELECT * FROM report_status_history WHERE report_id = ? ORDER BY created_at ASC`,
      [report.id]
    );

    const updates = this.db
      .all<any>(
        `SELECT * FROM report_updates WHERE report_id = ? AND is_public = 1 ORDER BY created_at ASC`,
        [report.id]
      )
      .map((u) => ({
        ...u,
        is_public: Boolean(u.is_public),
        is_official_response: Boolean(u.is_official_response),
      }));

    return {
      ...report,
      category: category ?? undefined,
      media,
      status_history,
      updates,
    };
  }

  async searchReportsInBBox(params: BoundingBoxQueryParams): Promise<MapReportItem[]> {
    let sql = `
      SELECT r.id, r.reference_code, r.title, SUBSTR(r.description, 1, 180) as description_excerpt,
             r.status, c.slug as category_slug, c.name as category_name, c.color_hex as category_color,
             r.public_latitude as latitude, r.public_longitude as longitude,
             r.is_location_fuzzed, r.approximate_address, r.upvotes_count, r.duplicate_auto_flagged,
             r.created_at,
             (SELECT public_url FROM report_media WHERE report_id = r.id AND is_flagged_graphic = 0 ORDER BY created_at ASC LIMIT 1) as primary_photo_url
      FROM reports r
      JOIN issue_categories c ON c.id = r.category_id
      WHERE r.is_hidden = 0
        AND r.public_longitude >= ? AND r.public_longitude <= ?
        AND r.public_latitude >= ? AND r.public_latitude <= ?
    `;

    const args: any[] = [params.west, params.east, params.south, params.north];

    if (params.categorySlug) {
      sql += ` AND c.slug = ?`;
      args.push(params.categorySlug);
    }
    if (params.status) {
      sql += ` AND r.status = ?`;
      args.push(params.status);
    }

    sql += ` ORDER BY r.created_at DESC LIMIT ?`;
    args.push(params.limit ?? 250);

    const rows = this.db.all<any>(sql, args);
    return rows.map((r) => ({
      ...r,
      is_location_fuzzed: Boolean(r.is_location_fuzzed),
      duplicate_auto_flagged: Boolean(r.duplicate_auto_flagged),
    }));
  }

  async getUserReports(reporterId: string): Promise<Report[]> {
    const rows = this.db.all<any>(
      `SELECT * FROM reports WHERE reporter_id = ? ORDER BY created_at DESC`,
      [reporterId]
    );
    return rows.map((r) => this.mapReportRow(r));
  }

  async deleteSubmittedReport(
    reportId: string,
    actorId: string,
    isAdmin: boolean
  ): Promise<boolean> {
    const report = await this.getReportById(reportId);
    if (!report) return false;

    if (!isAdmin) {
      if (report.reporter_id !== actorId || report.status !== "Submitted") {
        throw new Error("Unauthorized: Citizens can only delete their own reports while in 'Submitted' status.");
      }
    }

    this.db.run(`DELETE FROM reports WHERE id = ?`, [reportId]);
    return true;
  }

  async previewDuplicates(params: DuplicatePreviewParams): Promise<DuplicateCandidate[]> {
    const category = await this.getCategoryById(params.categoryId);
    if (!category) return [];

    const radius = category.duplicate_radius_meters;
    const windowHours = category.duplicate_window_hours;
    const windowCutoff = new Date(Date.now() - windowHours * 3600 * 1000).toISOString();

    const existing = this.db.all<any>(
      `
        SELECT id, reference_code, title, search_text, status, latitude, longitude, created_at
        FROM reports
        WHERE category_id = ? AND is_hidden = 0 AND status != 'Rejected' AND created_at >= ?
      `,
      [params.categoryId, windowCutoff]
    );

    const queryText = `${params.title.toLowerCase()} ${params.description.toLowerCase()}`;
    const candidates: DuplicateCandidate[] = [];

    for (const r of existing) {
      const dist = calculateHaversineDistance(params.latitude, params.longitude, r.latitude, r.longitude);
      if (dist <= radius) {
        const ageHours = Math.max(0, (Date.now() - new Date(r.created_at).getTime()) / (3600 * 1000));
        const trgmSim = calculateTrigramSimilarity(queryText, r.search_text);
        const comp = computeCompositeDuplicateScore({
          distanceMeters: dist,
          radiusMeters: radius,
          trigramSimilarity: trgmSim,
          ageHours,
          windowHours,
        });

        candidates.push({
          candidate_id: r.id,
          reference_code: r.reference_code,
          title: r.title,
          status: r.status,
          distance_meters: dist,
          text_similarity: trgmSim,
          composite_score: comp,
          created_at: r.created_at,
        });
      }
    }

    return candidates.sort((a, b) => b.composite_score - a.composite_score).slice(0, 5);
  }

  async transitionReportStatus(params: StatusTransitionParams): Promise<Report> {
    if (params.actorRole !== "admin") {
      throw new Error("Unauthorized: Only authorized administrators can transition report statuses.");
    }

    const current = await this.getReportById(params.reportId);
    if (!current) throw new Error("Report not found.");

    if (!isValidStatusTransition(current.status, params.newStatus)) {
      throw new Error(
        `Invalid lifecycle state transition from '${current.status}' to '${params.newStatus}'.`
      );
    }

    const now = new Date().toISOString();
    let resolvedAt = current.resolved_at;
    let closedAt = current.closed_at;
    let reopenCount = current.reopen_count;

    if (params.newStatus === "Resolved") {
      resolvedAt = now;
      closedAt = null;
    } else if (params.newStatus === "Rejected") {
      closedAt = now;
    } else if (params.newStatus === "Reopened") {
      resolvedAt = null;
      closedAt = null;
      reopenCount += 1;
    }

    this.db.run(
      `
        UPDATE reports
        SET status = ?, resolved_at = ?, closed_at = ?, reopen_count = ?, canonical_report_id = ?, updated_at = ?
        WHERE id = ?
      `,
      [
        params.newStatus,
        resolvedAt,
        closedAt,
        reopenCount,
        params.canonicalReportId ?? current.canonical_report_id ?? null,
        now,
        params.reportId,
      ]
    );

    // Record Status History
    this.db.run(
      `
        INSERT INTO report_status_history (
          id, report_id, previous_status, new_status, changed_by, public_rationale, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `,
      [
        crypto.randomUUID(),
        params.reportId,
        current.status,
        params.newStatus,
        params.actorId,
        params.publicRationale,
        now,
      ]
    );

    // Record Public Update
    this.db.run(
      `
        INSERT INTO report_updates (
          id, report_id, author_id, author_role, body, is_public, is_official_response, created_at
        ) VALUES (?, ?, ?, 'admin', ?, 1, 1, ?)
      `,
      [
        crypto.randomUUID(),
        params.reportId,
        params.actorId,
        `Status updated to ${params.newStatus}: ${params.publicRationale}`,
        now,
      ]
    );

    // Optional Internal Admin Note
    if (params.internalAdminNote) {
      this.db.run(
        `
          INSERT INTO report_updates (
            id, report_id, author_id, author_role, body, is_public, is_official_response, created_at
          ) VALUES (?, ?, ?, 'admin', ?, 0, 0, ?)
        `,
        [crypto.randomUUID(), params.reportId, params.actorId, params.internalAdminNote, now]
      );
    }

    return (await this.getReportById(params.reportId))!;
  }

  async getStatusHistory(reportId: string): Promise<ReportStatusHistory[]> {
    return this.db.all<any>(
      `SELECT * FROM report_status_history WHERE report_id = ? ORDER BY created_at ASC`,
      [reportId]
    );
  }

  async addReportUpdate(params: CreateUpdateParams): Promise<ReportUpdate> {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    this.db.run(
      `
        INSERT INTO report_updates (
          id, report_id, author_id, author_role, body, is_public, is_official_response, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        id,
        params.reportId,
        params.authorId ?? null,
        params.authorRole,
        params.body,
        params.isPublic ? 1 : 0,
        params.isOfficialResponse ? 1 : 0,
        now,
      ]
    );

    const row = this.db.get<any>(`SELECT * FROM report_updates WHERE id = ?`, [id]);
    return {
      ...row,
      is_public: Boolean(row.is_public),
      is_official_response: Boolean(row.is_official_response),
    };
  }

  async getReportUpdates(reportId: string, includePrivate: boolean): Promise<ReportUpdate[]> {
    let sql = `SELECT * FROM report_updates WHERE report_id = ?`;
    if (!includePrivate) {
      sql += ` AND is_public = 1`;
    }
    sql += ` ORDER BY created_at ASC`;
    const rows = this.db.all<any>(sql, [reportId]);
    return rows.map((r) => ({
      ...r,
      is_public: Boolean(r.is_public),
      is_official_response: Boolean(r.is_official_response),
    }));
  }

  async createFlag(params: CreateFlagParams): Promise<ReportFlag> {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    this.db.run(
      `
        INSERT INTO report_flags (
          id, report_id, matched_report_id, flagged_by, reason, status, details, created_at
        ) VALUES (?, ?, ?, ?, ?, 'pending', ?, ?)
      `,
      [
        id,
        params.reportId,
        params.matchedReportId ?? null,
        params.flaggedBy ?? null,
        params.reason,
        params.details ?? null,
        now,
      ]
    );
    return this.db.get<any>(`SELECT * FROM report_flags WHERE id = ?`, [id])!;
  }

  async getPendingFlags(): Promise<ReportFlag[]> {
    return this.db.all<any>(
      `SELECT * FROM report_flags WHERE status = 'pending' ORDER BY created_at DESC`
    );
  }

  async recordModerationEvent(params: ModerationEventParams): Promise<void> {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    this.db.run(
      `
        INSERT INTO moderation_events (
          id, report_id, flag_id, moderator_id, action_type, action_notes, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `,
      [
        id,
        params.reportId,
        params.flagId ?? null,
        params.moderatorId,
        params.actionType,
        params.actionNotes,
        now,
      ]
    );

    if (params.flagId) {
      const flagStatus = params.actionType === "flag_dismissed" ? "dismissed" : "confirmed";
      this.db.run(
        `
          UPDATE report_flags
          SET status = ?, reviewed_by = ?, reviewed_at = ?
          WHERE id = ?
        `,
        [flagStatus, params.moderatorId, now, params.flagId]
      );
    }

    if (params.actionType === "report_hidden") {
      this.db.run(`UPDATE reports SET is_hidden = 1, hidden_reason = ? WHERE id = ?`, [
        params.actionNotes,
        params.reportId,
      ]);
    } else if (params.actionType === "report_restored") {
      this.db.run(`UPDATE reports SET is_hidden = 0, hidden_reason = NULL WHERE id = ?`, [
        params.reportId,
      ]);
    } else if (params.actionType === "marked_duplicate" && params.canonicalReportId) {
      this.db.run(
        `
          UPDATE reports
          SET status = 'Rejected', canonical_report_id = ?, closed_at = ?
          WHERE id = ?
        `,
        [params.canonicalReportId, now, params.reportId]
      );
    }
  }

  async getPublicAnalytics(): Promise<PublicAnalyticsSummary> {
    const totalReports =
      this.db.get<{ count: number }>(`SELECT COUNT(*) as count FROM reports WHERE is_hidden = 0`)
        ?.count ?? 0;

    const resolvedCount =
      this.db.get<{ count: number }>(
        `SELECT COUNT(*) as count FROM reports WHERE is_hidden = 0 AND status = 'Resolved'`
      )?.count ?? 0;

    const closedCount =
      this.db.get<{ count: number }>(
        `SELECT COUNT(*) as count FROM reports WHERE is_hidden = 0 AND status = 'Rejected'`
      )?.count ?? 0;

    const pendingCount =
      this.db.get<{ count: number }>(`
        SELECT COUNT(*) as count FROM reports
        WHERE is_hidden = 0 AND status IN ('Submitted', 'Under review', 'Accepted', 'Assigned', 'In progress', 'Reopened')
      `)?.count ?? 0;

    const duplicateFlaggedCount =
      this.db.get<{ count: number }>(
        `SELECT COUNT(*) as count FROM reports WHERE is_hidden = 0 AND duplicate_auto_flagged = 1`
      )?.count ?? 0;

    const resolvedRows = this.db.all<{ created_at: string; resolved_at: string }>(`
      SELECT created_at, resolved_at FROM reports
      WHERE is_hidden = 0 AND status = 'Resolved' AND resolved_at IS NOT NULL
    `);

    let avgResolutionHours: number | null = null;
    if (resolvedRows.length > 0) {
      const totalHours = resolvedRows.reduce((acc, row) => {
        const start = new Date(row.created_at).getTime();
        const end = new Date(row.resolved_at).getTime();
        return acc + Math.max(0, (end - start) / (3600 * 1000));
      }, 0);
      avgResolutionHours = Number((totalHours / resolvedRows.length).toFixed(2));
    }

    const categories = await this.getCategories();
    const by_category = categories.map((cat) => {
      const catTotal =
        this.db.get<{ count: number }>(
          `SELECT COUNT(*) as count FROM reports WHERE category_id = ? AND is_hidden = 0`,
          [cat.id]
        )?.count ?? 0;

      const catResolved =
        this.db.get<{ count: number }>(
          `SELECT COUNT(*) as count FROM reports WHERE category_id = ? AND is_hidden = 0 AND status = 'Resolved'`,
          [cat.id]
        )?.count ?? 0;

      const catClosed =
        this.db.get<{ count: number }>(
          `SELECT COUNT(*) as count FROM reports WHERE category_id = ? AND is_hidden = 0 AND status = 'Rejected'`,
          [cat.id]
        )?.count ?? 0;

      const catPending = catTotal - catResolved - catClosed;

      return {
        slug: cat.slug,
        name: cat.name,
        color_hex: cat.color_hex,
        total_count: catTotal,
        resolved_count: catResolved,
        closed_count: catClosed,
        pending_count: catPending,
      };
    });

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
    const by_status = statuses.map((st) => {
      const count =
        this.db.get<{ count: number }>(
          `SELECT COUNT(*) as count FROM reports WHERE status = ? AND is_hidden = 0`,
          [st]
        )?.count ?? 0;
      return { status: st, count };
    });

    const clusterRows = this.db.all<any>(`
      SELECT ROUND(public_latitude, 2) as grid_lat,
             ROUND(public_longitude, 2) as grid_lng,
             COUNT(*) as report_count,
             SUM(CASE WHEN status = 'Resolved' THEN 1 ELSE 0 END) as resolved_count
      FROM reports
      WHERE is_hidden = 0
      GROUP BY ROUND(public_latitude, 2), ROUND(public_longitude, 2)
      ORDER BY report_count DESC
      LIMIT 50
    `);

    return {
      generated_at: new Date().toISOString(),
      summary: {
        total_reports: totalReports,
        resolved_count: resolvedCount,
        closed_rejected_count: closedCount,
        pending_active_count: pendingCount,
        avg_resolution_hours: avgResolutionHours,
        duplicate_flagged_count: duplicateFlaggedCount,
      },
      by_category,
      by_status,
      geographic_clusters: clusterRows.map((c) => ({
        grid_lat: Number(c.grid_lat),
        grid_lng: Number(c.grid_lng),
        report_count: Number(c.report_count),
        resolved_count: Number(c.resolved_count || 0),
      })),
    };
  }

  private mapReportRow(r: any): Report {
    return {
      ...r,
      is_location_fuzzed: Boolean(r.is_location_fuzzed),
      duplicate_auto_flagged: Boolean(r.duplicate_auto_flagged),
      is_hidden: Boolean(r.is_hidden),
      authority_acknowledged: Boolean(r.authority_acknowledged),
    };
  }
}
