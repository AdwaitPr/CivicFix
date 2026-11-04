import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

describe("Task 5: Supabase Production Migrations & PostGIS Core Schema", () => {
  const migrationPath = path.resolve(
    __dirname,
    "../supabase/migrations/0001_civicfix_core_schema.sql"
  );
  const seedPath = path.resolve(__dirname, "../supabase/seed/0002_seed_data.sql");

  it("verifies the existence of 0001_civicfix_core_schema.sql", () => {
    expect(fs.existsSync(migrationPath)).toBe(true);
  });

  it("verifies the existence of 0002_seed_data.sql", () => {
    expect(fs.existsSync(seedPath)).toBe(true);
  });

  it("ensures all required PostgreSQL extensions are installed into 'extensions' schema", () => {
    const sql = fs.readFileSync(migrationPath, "utf-8");
    expect(sql).toContain("CREATE EXTENSION IF NOT EXISTS postgis SCHEMA extensions;");
    expect(sql).toContain("CREATE EXTENSION IF NOT EXISTS pg_trgm SCHEMA extensions;");
    expect(sql).toContain("CREATE EXTENSION IF NOT EXISTS pgcrypto SCHEMA extensions;");
    expect(sql).toContain("CREATE EXTENSION IF NOT EXISTS pg_stat_statements SCHEMA extensions;");
  });

  it("ensures all 9 core tables exist with proper constraints", () => {
    const sql = fs.readFileSync(migrationPath, "utf-8");
    const requiredTables = [
      "public.profiles",
      "public.issue_categories",
      "public.reports",
      "public.report_media",
      "public.report_status_history",
      "public.report_updates",
      "public.report_flags",
      "public.admin_assignments",
      "public.moderation_events",
    ];

    for (const table of requiredTables) {
      expect(sql).toContain(`CREATE TABLE IF NOT EXISTS ${table}`);
    }
  });

  it("ensures Row-Level Security (RLS) is explicitly enabled on all core tables", () => {
    const sql = fs.readFileSync(migrationPath, "utf-8");
    const rlsTables = [
      "public.profiles",
      "public.issue_categories",
      "public.reports",
      "public.report_media",
      "public.report_status_history",
      "public.report_updates",
      "public.report_flags",
      "public.admin_assignments",
      "public.moderation_events",
    ];

    for (const table of rlsTables) {
      expect(sql).toContain(`ALTER TABLE ${table} ENABLE ROW LEVEL SECURITY;`);
    }
  });

  it("ensures column-level privilege escalation protection trigger exists on profiles", () => {
    const sql = fs.readFileSync(migrationPath, "utf-8");
    expect(sql).toContain("FUNCTION public.protect_profile_security_columns()");
    expect(sql).toContain("TRIGGER trg_protect_profile_security");
    expect(sql).toContain("Privilege escalation blocked");
  });

  it("ensures deterministic duplicate detection and FSM triggers exist", () => {
    const sql = fs.readFileSync(migrationPath, "utf-8");
    expect(sql).toContain("FUNCTION public.enforce_report_status_transition()");
    expect(sql).toContain("FUNCTION public.after_insert_report_lifecycle()");
    expect(sql).toContain("potential_duplicate");
  });

  it("ensures all 3 core RPC functions are defined", () => {
    const sql = fs.readFileSync(migrationPath, "utf-8");
    expect(sql).toContain("FUNCTION public.search_reports_in_bbox");
    expect(sql).toContain("FUNCTION public.preview_duplicate_candidates");
    expect(sql).toContain("FUNCTION public.get_public_analytics");
  });
});
