import { createClient, SupabaseClient } from "@supabase/supabase-js";
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
} from "../domain/types";
import type {
  CreateReportInput,
  BoundingBoxQueryParams,
} from "../validation/civicfix-schemas";

export class SupabaseCivicFixRepository implements ICivicFixRepository {
  private client: SupabaseClient;

  constructor(supabaseUrl?: string, supabaseKey?: string) {
    const url = supabaseUrl || process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = supabaseKey || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!url || !key) {
      throw new Error(
        "FATAL CONFIGURATION ERROR: Supabase mode is selected (CIVICFIX_DATA_MODE=supabase), but NEXT_PUBLIC_SUPABASE_URL or API keys are missing. Configure valid Supabase credentials or set CIVICFIX_DATA_MODE=local."
      );
    }

    this.client = createClient(url, key);
  }

  async getCategories(): Promise<IssueCategory[]> {
    const { data, error } = await this.client
      .from("issue_categories")
      .select("*")
      .eq("is_active", true)
      .order("display_order", { ascending: true });

    if (error) throw new Error(`Supabase error fetching categories: ${error.message}`);
    return data || [];
  }

  async getCategoryBySlug(slug: string): Promise<IssueCategory | null> {
    const { data, error } = await this.client
      .from("issue_categories")
      .select("*")
      .eq("slug", slug)
      .single();

    if (error && error.code !== "PGRST116") {
      throw new Error(`Supabase error fetching category by slug: ${error.message}`);
    }
    return data || null;
  }

  async getCategoryById(id: string): Promise<IssueCategory | null> {
    const { data, error } = await this.client
      .from("issue_categories")
      .select("*")
      .eq("id", id)
      .single();

    if (error && error.code !== "PGRST116") {
      throw new Error(`Supabase error fetching category by ID: ${error.message}`);
    }
    return data || null;
  }

  async createReport(
    params: CreateReportInput,
    reporterId?: string,
    clientIpHash?: string
  ): Promise<Report> {
    const ewkt = `SRID=4326;POINT(${params.longitude} ${params.latitude})`;

    const { data, error } = await this.client
      .from("reports")
      .insert({
        reporter_id: reporterId ?? null,
        category_id: params.categoryId,
        title: params.title,
        description: params.description,
        location: ewkt,
        approximate_address: params.approximateAddress ?? null,
        is_location_fuzzed: params.isLocationFuzzed,
        submitter_ip_hash: clientIpHash ?? null,
      })
      .select("*")
      .single();

    if (error) throw new Error(`Supabase error inserting report: ${error.message}`);
    return data;
  }

  async getReportById(id: string): Promise<Report | null> {
    const { data, error } = await this.client
      .from("reports")
      .select("*")
      .eq("id", id)
      .single();

    if (error && error.code !== "PGRST116") {
      throw new Error(`Supabase error fetching report by ID: ${error.message}`);
    }
    return data || null;
  }

  async getReportByReference(referenceCode: string): Promise<ReportDetail | null> {
    const { data: report, error } = await this.client
      .from("reports")
      .select("*, category:issue_categories(*)")
      .eq("reference_code", referenceCode)
      .single();

    if (error && error.code !== "PGRST116") {
      throw new Error(`Supabase error fetching report by reference: ${error.message}`);
    }
    if (!report) return null;

    const { data: media } = await this.client
      .from("report_media")
      .select("*")
      .eq("report_id", report.id)
      .order("created_at", { ascending: true });

    const { data: status_history } = await this.client
      .from("report_status_history")
      .select("*")
      .eq("report_id", report.id)
      .order("created_at", { ascending: true });

    const { data: updates } = await this.client
      .from("report_updates")
      .select("*")
      .eq("report_id", report.id)
      .eq("is_public", true)
      .order("created_at", { ascending: true });

    return {
      ...report,
      media: media || [],
      status_history: status_history || [],
      updates: updates || [],
    };
  }

  async searchReportsInBBox(params: BoundingBoxQueryParams): Promise<MapReportItem[]> {
    const { data, error } = await this.client.rpc("search_reports_in_bbox", {
      p_west: params.west,
      p_south: params.south,
      p_east: params.east,
      p_north: params.north,
      p_category_slug: params.categorySlug ?? null,
      p_status: params.status ?? null,
      p_limit: params.limit ?? 250,
    });

    if (error) throw new Error(`Supabase RPC search_reports_in_bbox error: ${error.message}`);
    return data || [];
  }

  async getUserReports(reporterId: string): Promise<Report[]> {
    const { data, error } = await this.client
      .from("reports")
      .select("*")
      .eq("reporter_id", reporterId)
      .order("created_at", { ascending: false });

    if (error) throw new Error(`Supabase error fetching user reports: ${error.message}`);
    return data || [];
  }

  async deleteSubmittedReport(
    reportId: string,
    actorId: string,
    isAdmin: boolean
  ): Promise<boolean> {
    let query = this.client.from("reports").delete().eq("id", reportId);
    if (!isAdmin) {
      query = query.eq("reporter_id", actorId).eq("status", "Submitted");
    }
    const { error } = await query;
    if (error) throw new Error(`Supabase error deleting report: ${error.message}`);
    return true;
  }

  async previewDuplicates(params: DuplicatePreviewParams): Promise<DuplicateCandidate[]> {
    const { data, error } = await this.client.rpc("preview_duplicate_candidates", {
      p_category_id: params.categoryId,
      p_lat: params.latitude,
      p_lng: params.longitude,
      p_title: params.title,
      p_description: params.description,
    });

    if (error) throw new Error(`Supabase RPC preview_duplicate_candidates error: ${error.message}`);
    return data || [];
  }

  async transitionReportStatus(params: StatusTransitionParams): Promise<Report> {
    const { data, error } = await this.client
      .from("reports")
      .update({
        status: params.newStatus,
        canonical_report_id: params.canonicalReportId ?? null,
      })
      .eq("id", params.reportId)
      .select("*")
      .single();

    if (error) throw new Error(`Supabase error transitioning report: ${error.message}`);

    // Insert history
    await this.client.from("report_status_history").insert({
      report_id: params.reportId,
      new_status: params.newStatus,
      changed_by: params.actorId,
      public_rationale: params.publicRationale,
    });

    // Insert public update
    await this.client.from("report_updates").insert({
      report_id: params.reportId,
      author_id: params.actorId,
      author_role: "admin",
      body: `Status updated to ${params.newStatus}: ${params.publicRationale}`,
      is_public: true,
      is_official_response: true,
    });

    if (params.internalAdminNote) {
      await this.client.from("report_updates").insert({
        report_id: params.reportId,
        author_id: params.actorId,
        author_role: "admin",
        body: params.internalAdminNote,
        is_public: false,
        is_official_response: false,
      });
    }

    return data;
  }

  async getStatusHistory(reportId: string): Promise<ReportStatusHistory[]> {
    const { data, error } = await this.client
      .from("report_status_history")
      .select("*")
      .eq("report_id", reportId)
      .order("created_at", { ascending: true });

    if (error) throw new Error(`Supabase error fetching status history: ${error.message}`);
    return data || [];
  }

  async addReportUpdate(params: CreateUpdateParams): Promise<ReportUpdate> {
    const { data, error } = await this.client
      .from("report_updates")
      .insert({
        report_id: params.reportId,
        author_id: params.authorId ?? null,
        author_role: params.authorRole,
        body: params.body,
        is_public: params.isPublic,
        is_official_response: params.isOfficialResponse,
      })
      .select("*")
      .single();

    if (error) throw new Error(`Supabase error inserting report update: ${error.message}`);
    return data;
  }

  async getReportUpdates(reportId: string, includePrivate: boolean): Promise<ReportUpdate[]> {
    let query = this.client
      .from("report_updates")
      .select("*")
      .eq("report_id", reportId)
      .order("created_at", { ascending: true });

    if (!includePrivate) {
      query = query.eq("is_public", true);
    }

    const { data, error } = await query;
    if (error) throw new Error(`Supabase error fetching updates: ${error.message}`);
    return data || [];
  }

  async createFlag(params: CreateFlagParams): Promise<ReportFlag> {
    const { data, error } = await this.client
      .from("report_flags")
      .insert({
        report_id: params.reportId,
        matched_report_id: params.matchedReportId ?? null,
        flagged_by: params.flaggedBy ?? null,
        reason: params.reason,
        details: params.details ?? null,
      })
      .select("*")
      .single();

    if (error) throw new Error(`Supabase error creating flag: ${error.message}`);
    return data;
  }

  async getPendingFlags(): Promise<ReportFlag[]> {
    const { data, error } = await this.client
      .from("report_flags")
      .select("*")
      .eq("status", "pending")
      .order("created_at", { ascending: false });

    if (error) throw new Error(`Supabase error fetching flags: ${error.message}`);
    return data || [];
  }

  async recordModerationEvent(params: ModerationEventParams): Promise<void> {
    const { error } = await this.client.from("moderation_events").insert({
      report_id: params.reportId,
      flag_id: params.flagId ?? null,
      moderator_id: params.moderatorId,
      action_type: params.actionType,
      action_notes: params.actionNotes,
    });

    if (error) throw new Error(`Supabase error inserting moderation event: ${error.message}`);

    if (params.flagId) {
      const flagStatus = params.actionType === "flag_dismissed" ? "dismissed" : "confirmed";
      await this.client
        .from("report_flags")
        .update({
          status: flagStatus,
          reviewed_by: params.moderatorId,
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", params.flagId);
    }

    if (params.actionType === "report_hidden") {
      await this.client
        .from("reports")
        .update({ is_hidden: true, hidden_reason: params.actionNotes })
        .eq("id", params.reportId);
    } else if (params.actionType === "report_restored") {
      await this.client
        .from("reports")
        .update({ is_hidden: false, hidden_reason: null })
        .eq("id", params.reportId);
    }
  }

  async getPublicAnalytics(): Promise<PublicAnalyticsSummary> {
    const { data, error } = await this.client.rpc("get_public_analytics");
    if (error) throw new Error(`Supabase RPC get_public_analytics error: ${error.message}`);
    return data;
  }
}
