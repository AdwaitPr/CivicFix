import type { SqliteAdapter } from "./sqlite-adapter";
import { DEFAULT_CATEGORIES } from "./seed-data";

export function initSqliteSchema(db: SqliteAdapter, seed: boolean = true) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS profiles (
      id TEXT PRIMARY KEY,
      display_name TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'citizen',
      organization_name TEXT,
      jurisdiction_code TEXT,
      is_verified_authority INTEGER NOT NULL DEFAULT 0,
      is_banned INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS issue_categories (
      id TEXT PRIMARY KEY,
      slug TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL UNIQUE,
      description TEXT NOT NULL,
      icon_name TEXT NOT NULL DEFAULT 'alert-triangle',
      color_hex TEXT NOT NULL DEFAULT '#174EA6',
      duplicate_radius_meters INTEGER NOT NULL DEFAULT 100,
      duplicate_window_hours INTEGER NOT NULL DEFAULT 336,
      is_sensitive_location INTEGER NOT NULL DEFAULT 0,
      is_active INTEGER NOT NULL DEFAULT 1,
      display_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS reports (
      id TEXT PRIMARY KEY,
      reference_code TEXT NOT NULL UNIQUE,
      reporter_id TEXT,
      category_id TEXT NOT NULL REFERENCES issue_categories(id),
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      search_text TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'Submitted',
      latitude REAL NOT NULL,
      longitude REAL NOT NULL,
      public_latitude REAL NOT NULL,
      public_longitude REAL NOT NULL,
      is_location_fuzzed INTEGER NOT NULL DEFAULT 0,
      approximate_address TEXT,
      canonical_report_id TEXT,
      duplicate_auto_flagged INTEGER NOT NULL DEFAULT 0,
      max_duplicate_score REAL NOT NULL DEFAULT 0.0,
      upvotes_count INTEGER NOT NULL DEFAULT 0,
      reopen_count INTEGER NOT NULL DEFAULT 0,
      is_hidden INTEGER NOT NULL DEFAULT 0,
      hidden_reason TEXT,
      authority_acknowledged INTEGER NOT NULL DEFAULT 0,
      submitter_ip_hash TEXT,
      resolved_at TEXT,
      closed_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS report_media (
      id TEXT PRIMARY KEY,
      report_id TEXT NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
      uploaded_by TEXT,
      storage_path TEXT NOT NULL UNIQUE,
      public_url TEXT NOT NULL,
      mime_type TEXT NOT NULL,
      file_size_bytes INTEGER NOT NULL,
      sha256_checksum TEXT NOT NULL,
      exif_stripped INTEGER NOT NULL DEFAULT 1,
      is_flagged_graphic INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS report_status_history (
      id TEXT PRIMARY KEY,
      report_id TEXT NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
      previous_status TEXT,
      new_status TEXT NOT NULL,
      changed_by TEXT,
      public_rationale TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS report_updates (
      id TEXT PRIMARY KEY,
      report_id TEXT NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
      author_id TEXT,
      author_role TEXT NOT NULL,
      body TEXT NOT NULL,
      is_public INTEGER NOT NULL DEFAULT 1,
      is_official_response INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS report_flags (
      id TEXT PRIMARY KEY,
      report_id TEXT NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
      matched_report_id TEXT,
      flagged_by TEXT,
      reason TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      similarity_score REAL,
      distance_meters REAL,
      details TEXT,
      reviewed_by TEXT,
      reviewed_at TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS admin_assignments (
      id TEXT PRIMARY KEY,
      report_id TEXT NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
      assigned_to TEXT,
      assigned_by TEXT NOT NULL,
      department_name TEXT NOT NULL,
      external_ticket_ref TEXT,
      priority_level INTEGER NOT NULL DEFAULT 3,
      due_at TEXT,
      completed_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS moderation_events (
      id TEXT PRIMARY KEY,
      report_id TEXT NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
      flag_id TEXT,
      moderator_id TEXT NOT NULL,
      action_type TEXT NOT NULL,
      action_notes TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_reports_coords ON reports(latitude, longitude);
    CREATE INDEX IF NOT EXISTS idx_reports_ref ON reports(reference_code);
    CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status);
  `);

  if (seed) {
    const existing = db.get<{ count: number }>("SELECT COUNT(*) as count FROM issue_categories");
    if (!existing || existing.count === 0) {
      const now = new Date().toISOString();
      for (const cat of DEFAULT_CATEGORIES) {
        db.run(
          `
          INSERT OR IGNORE INTO issue_categories (
            id, slug, name, description, icon_name, color_hex,
            duplicate_radius_meters, duplicate_window_hours, is_sensitive_location,
            is_active, display_order, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
          [
            cat.id,
            cat.slug,
            cat.name,
            cat.description,
            cat.icon_name,
            cat.color_hex,
            cat.duplicate_radius_meters,
            cat.duplicate_window_hours,
            cat.is_sensitive_location ? 1 : 0,
            cat.is_active ? 1 : 0,
            cat.display_order,
            now,
          ]
        );
      }
    }
  }
}
