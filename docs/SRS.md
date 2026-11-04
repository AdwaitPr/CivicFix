# Software Requirements Specification (SRS) — CivicFix

## 1. Introduction
### 1.1 Purpose
CivicFix is an independent, citizen-powered civic issue reporting, geospatial discovery, and lifecycle tracking platform engineered to make municipal maintenance problems visible, structured, and publicly auditable.

### 1.2 Scope & Trust Boundary
CivicFix enforces an explicit trust boundary between public citizen observation and municipal remediation:
- The platform operates as an independent public registry and workflow engine.
- Persistent UI disclaimers and API metadata explicitly state that reports are independent records and are NOT automatically dispatched to municipal ERP/work-order systems unless a verified municipal body is formally onboarded.
- Reports remain public advocacy artifacts that community organizations can export, monitor, and audit.

### 1.3 Intended Audience
- Citizens and neighborhood residents documenting local infrastructure defects.
- Community organizations tracking localized clusters and running civic advocacy.
- Authorized platform moderators maintaining data hygiene, privacy, and deduplication.
- Municipal administrators managing official triage, status progression, and engineering updates.

---

## 2. Overall Description
### 2.1 Product Perspective
CivicFix functions as a web-based geospatial application utilizing:
- Next.js App Router for server-centric rendering and API orchestration.
- Dual-mode data persistence: Local SQLite engine for zero-dependency development/testing, and Supabase PostgreSQL with PostGIS & pg_trgm for live production.
- Client-isolated Leaflet 1.9.4 geospatial maps with custom SVG markers and clustering.

### 2.2 User Classes and Roles
1. **Anonymous Visitor (`anon`)**: Browse public map, search by complaint reference code (`CF-YYYY-XXXXXX`), inspect aggregate public analytics.
2. **Registered Citizen (`citizen`)**: Submit infrastructure reports with photos and coordinates, upvote reports, flag duplicates/abuse, track personal submissions.
3. **Community Organization (`community_org`)**: All citizen capabilities plus bounding-box alerts and data exports.
4. **Authorized Moderator (`moderator`)**: Review abuse flags, link/merge duplicate candidates to canonical reports, redact PII or graphic media.
5. **Municipal Administrator (`admin`)**: Execute official 8-state FSM transitions, record public official updates and private internal triage notes, manage departmental assignments.

---

## 3. Specific Functional Requirements
### 3.1 Report Ingestion & Validation (FR-1)
- FR-1.1: System shall accept reports with title (5-140 chars), description (15-4000 chars), category UUID, and WGS 84 coordinates.
- FR-1.2: System shall reject Null Island coordinates `(0, 0)` within 0.0001 degrees.
- FR-1.3: System shall strip HTML, `<script>`, and inline JavaScript handlers from text inputs.
- FR-1.4: System shall require explicit acknowledgment of the Non-Affiliation Disclaimer (`acceptedNonAffiliationDisclaimer: true`).
- FR-1.5: System shall enforce rate limiting (max 5 reports per 15 minutes per user/IP hash).

### 3.2 Media Upload & Verification (FR-2)
- FR-2.1: Allowed MIME types: `image/jpeg`, `image/png`, `image/webp`.
- FR-2.2: Hard file size limit: 5 MB (5,242,880 bytes).
- FR-2.3: Verification of binary magic bytes (`FF D8 FF`, `89 50 4E 47`, `RIFF....WEBP`); SVG/HTML files strictly rejected.
- FR-2.4: Automatic stripping of EXIF GPS and camera serial tags before storage.

### 3.3 Geospatial Search & Privacy (FR-3)
- FR-3.1: Viewport queries using 2D bounding boxes (`west`, `south`, `east`, `north`).
- FR-3.2: Category and status filtering.
- FR-3.3: Automatic coordinate fuzzing (~110m grid, 3 decimal places) for sensitive categories (e.g. garbage accumulation, harassment) or citizen opt-in.
- FR-3.4: Opt-in device geolocation only upon explicit user button click.

### 3.4 Deterministic Duplicate Detection (FR-4)
- FR-4.1: Multi-factor scoring combining spatial proximity ($S_{\text{geo}}$), text trigram similarity ($S_{\text{text}}$), and temporal decay ($S_{\text{time}}$):
  $$S_{\text{dup}} = 0.45 \cdot S_{\text{geo}} + 0.40 \cdot S_{\text{text}} + 0.15 \cdot S_{\text{time}}$$
- FR-4.2: Candidates with $S_{\text{dup}} \ge 0.450$ or (distance $\le 15$m and time $\le 24$h) automatically flagged in `report_flags` without deleting the report.
- FR-4.3: Real-time pre-submission candidate duplicate preview.

### 3.5 Issue Lifecycle Finite State Machine (FR-5)
- FR-5.1: 8 strictly governed states: `Submitted`, `Under review`, `Accepted`, `Assigned`, `In progress`, `Resolved`, `Rejected`, `Reopened`.
- FR-5.2: State transitions enforced server-side and database-level, restricted to authorized administrators.
- FR-5.3: Every transition requires a non-empty public rationale and atomically writes to immutable audit history (`report_status_history`).

### 3.6 Public Analytics (FR-6)
- FR-6.1: Strict mathematical separation: Total = Resolved + Closed (Rejected) + Pending.
- FR-6.2: Real-time calculation of mean resolution hours from actual timestamps (`resolved_at - created_at`).
- FR-6.3: Zero fabricated or estimated metrics.
