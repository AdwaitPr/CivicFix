# Database Architecture & Dual-Mode Provider Specification — CivicFix

## 1. Architectural Strategy
To satisfy zero-dependency local development while supporting high-throughput spatial discovery in production, CivicFix implements a dual-mode persistence architecture:

- **Mode 1 (`CIVICFIX_DATA_MODE=local`)**: SQLite local embedded database.
- **Mode 2 (`CIVICFIX_DATA_MODE=supabase`)**: Supabase PostgreSQL 15+ with PostGIS, pg_trgm, pgcrypto, and Row-Level Security.

The active mode is selected explicitly via `CIVICFIX_DATA_MODE`. The application will NEVER silently fallback from Supabase to SQLite upon connection failure; any missing or invalid credentials in `supabase` mode will raise a clear fatal configuration error.

---

## 2. Technical Comparison Matrix

| Feature / Capability | Supabase PostgreSQL Mode | SQLite Local Provider Mode | Documentation of Limitation |
| :--- | :--- | :--- | :--- |
| **Spatial Coordinates** | Native `geography(Point, 4326)` on WGS 84 ellipsoid. | Stored as separate `latitude` and `longitude` `REAL` columns. | SQLite lacks native spherical geography types; uses Cartesian approximations for bounding-box and Haversine for radius. |
| **Spatial Radius** | Native `ST_DWithin` and `ST_Distance` in meters using spherical geodesics. | Great-Circle Haversine formula implemented in TypeScript/SQL helper: $d = 2r \arcsin(\sqrt{\dots})$. | Haversine assumes a spherical earth ($R = 6,371\text{ km}$); accurate to within 0.5% of WGS 84 ellipsoid, which is sufficient for local development. |
| **Spatial Indexing** | PostGIS GiST index on `location` and partial GiST on geometry. | Standard composite B-tree index on `(latitude, longitude)`. | SQLite cannot perform GiST R-tree indexing without external extensions (`mod_spatialite`), which are omitted to preserve zero-dependency setup. |
| **Text Similarity** | `pg_trgm` extension with GIN trigram index (`gin_trgm_ops`). | In-memory character trigram decomposition and Jaccard overlap calculation in TypeScript repository. | SQLite lacks native GIN trigram indexes; text similarity is evaluated over candidate spatial matches. |
| **Row-Level Security (RLS)** | Kernel-level PostgreSQL RLS policies + `BEFORE UPDATE` trigger guards. | Application-layer security checks in Route Handlers and Repository layer. | SQLite lacks database-level multi-user RLS; security is maintained at the service/repository boundary. |
| **Reference Generation** | `pgcrypto` cryptographic random byte generator in database trigger. | Node.js `crypto.randomBytes(4)` in TypeScript entity layer. | Equivalent cryptographic entropy ($2^{32}$ combinations per year). |

---

## 3. SQLite Local Schema Definitions

```sql
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
```
