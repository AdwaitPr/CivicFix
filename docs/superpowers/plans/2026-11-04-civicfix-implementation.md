# CivicFix Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a production-grade, citizen-powered civic issue reporting and geospatial discovery platform (CivicFix) featuring an 8-state finite state machine, deterministic duplicate detection, dual-mode persistence (SQLite local / Supabase PostGIS live), and Leaflet mapping across 10 functional views.

**Architecture:** Dual-mode repository pattern abstracting data access between a self-contained local SQLite provider and live Supabase PostgreSQL (PostGIS + pg_trgm + RLS). Next.js App Router hybrid architecture with server-side validation and SSR-isolated client-side Leaflet mapping.

**Tech Stack:** Next.js, TypeScript, Tailwind CSS, Lucide React, Leaflet 1.9.4, react-leaflet, SQLite (better-sqlite3 / sqlite3), Supabase Client, Zod, Vitest.

**Spec:** CivicFix Architectural Blueprint, Geospatial Engine, and Full-Stack Implementation Directive.

## Global Constraints
- Primary root directory: `/Users/adwaitpratapsingh/.gemini/antigravity/scratch/civicfix`.
- Provider selection via explicit configuration: `CIVICFIX_DATA_MODE=local|supabase`. Never silently fallback.
- Coordinate storage: WGS 84 (`geography(Point, 4326)` in PostgreSQL; `latitude`/`longitude` floats in SQLite).
- Strict non-government affiliation disclaimer required on all submissions.
- 8 FSM lifecycle states: `Submitted`, `Under review`, `Accepted`, `Assigned`, `In progress`, `Resolved`, `Rejected`, `Reopened`.
- Image uploads: JPEG, PNG, WebP only; verified via magic bytes; max 5MB; EXIF stripped.
- SSR safety: Leaflet components must be isolated via `next/dynamic` with `{ ssr: false }`.

## Review Focus
- Null Island rejection: Coordinates `(0,0)` within 0.0001 must be strictly blocked on input.
- Privilege escalation guard: Modifying `role`, `is_banned`, or `is_verified_authority` on user profiles must fail unless invoked by `service_role`.
- Duplicate candidate isolation: Potential duplicates must NEVER automatically merge or delete reports; they must trigger human review flags.
- Public analytics integrity: Mathematical partition between Resolved, Closed (Rejected), and Pending must be mutually exclusive.
- Privacy-aware map projections: Reporter PII (email, user ID) must never be returned in public bounding-box or tracking queries; sensitive categories must fuzz coordinates to ~110m.

---

### Task 1: Environment & Project Scaffolding

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `next.config.mjs`
- Create: `tailwind.config.ts`
- Create: `postcss.config.mjs`
- Create: `.env.example`
- Create: `.gitignore`
- Create: `vitest.config.ts`

**Interfaces:**
- Consumes: Node.js runtime environment.
- Produces: Runnable Next.js TypeScript environment with Vitest testing setup.

- [ ] **Step 1: Write `package.json` with Next.js, React, Tailwind, Lucide, Leaflet, better-sqlite3 / sqlite3, Zod, and Vitest.**
- [ ] **Step 2: Run `npm install` and verify successful dependency installation.**
- [ ] **Step 3: Create `tsconfig.json`, `next.config.mjs`, `tailwind.config.ts`, `postcss.config.mjs`, and `.env.example`.**
- [ ] **Step 4: Configure `vitest.config.ts` and test with a smoke test.**
- [ ] **Step 5: Git commit initial project configuration.**

---

### Task 2: Architecture & Specification Documentation

**Files:**
- Create: `README.md`
- Create: `docs/SRS.md`
- Create: `docs/HLD.md`
- Create: `docs/LLD.md`
- Create: `docs/ADR/ADR-001-dual-mode-architecture.md`
- Create: `docs/ADR/ADR-002-leaflet-ssr-isolation.md`
- Create: `docs/ADR/ADR-003-deterministic-duplicate-detection.md`
- Create: `docs/THREAT_MODEL.md`
- Create: `docs/STATE_MACHINE.md`
- Create: `docs/DATABASE.md`
- Create: `docs/LOCAL_DEVELOPMENT.md`
- Create: `docs/SUPABASE_SETUP.md`
- Create: `docs/TESTING.md`
- Create: `docs/DEPLOYMENT.md`

**Interfaces:**
- Consumes: Architectural Blueprint and User Directives.
- Produces: Complete architectural and operational documentation repository.

- [ ] **Step 1: Author `docs/SRS.md`, `docs/HLD.md`, and `docs/LLD.md`.**
- [ ] **Step 2: Author `docs/STATE_MACHINE.md` documenting all 8 states, valid transitions, and role permissions.**
- [ ] **Step 3: Author `docs/THREAT_MODEL.md` (STRIDE, OWASP Top 10, Zero-Trust controls).**
- [ ] **Step 4: Author `docs/DATABASE.md`, `docs/ADR/`, and operational runbooks (`LOCAL_DEVELOPMENT.md`, `SUPABASE_SETUP.md`, `TESTING.md`, `DEPLOYMENT.md`, `README.md`).**
- [ ] **Step 5: Git commit complete documentation.**

---

### Task 3: Domain Core, Validation, Security & FSM Engine

**Files:**
- Create: `src/lib/domain/types.ts`
- Create: `src/lib/validation/civicfix-schemas.ts`
- Create: `src/lib/domain/fsm.ts`
- Create: `src/lib/domain/duplicate.ts`
- Create: `src/lib/security/sanitization.ts`
- Create: `src/lib/security/magic-bytes.ts`
- Test: `tests/domain-and-security.test.ts`

**Interfaces:**
- Consumes: None (Domain Core).
- Produces: Type definitions, Zod validation schemas, FSM state validator, duplicate calculation logic, binary magic-byte verifier.

- [ ] **Step 1: Write failing tests in `tests/domain-and-security.test.ts` for schema validation, XSS sanitization, magic-byte inspection, FSM state transitions, and duplicate scoring.**
- [ ] **Step 2: Run test to verify failure (`npx vitest run tests/domain-and-security.test.ts`).**
- [ ] **Step 3: Implement `types.ts`, `civicfix-schemas.ts`, `fsm.ts`, `duplicate.ts`, `sanitization.ts`, and `magic-bytes.ts`.**
- [ ] **Step 4: Run test to verify all tests pass.**
- [ ] **Step 5: Git commit domain and security implementation.**

---

### Task 4: Dual-Mode Repository & Data Access Layer

**Files:**
- Create: `src/lib/repository/civicfix-repository.interface.ts`
- Create: `src/lib/repository/sqlite-repository.ts`
- Create: `src/lib/repository/memory-repository.ts`
- Create: `src/lib/repository/supabase-repository.ts`
- Create: `src/lib/repository/index.ts`
- Create: `src/lib/db/sqlite-init.ts`
- Create: `src/lib/db/seed-data.ts`
- Test: `tests/repository.test.ts`

**Interfaces:**
- Consumes: `src/lib/domain/types.ts`.
- Produces: `ICivicFixRepository` interface and concrete implementations (`SqliteCivicFixRepository`, `MemoryCivicFixRepository`, `SupabaseCivicFixRepository`).

- [ ] **Step 1: Define `ICivicFixRepository` interface covering report creation, bbox search, duplicate checking, status transition, audit logging, flags, and analytics.**
- [ ] **Step 2: Write failing tests in `tests/repository.test.ts` exercising the repository interface on SQLite and in-memory.**
- [ ] **Step 3: Implement `sqlite-init.ts` and `SqliteCivicFixRepository` with seed data, haversine spatial approximation, and trigram/ngram text matching.**
- [ ] **Step 4: Implement `MemoryCivicFixRepository` and `SupabaseCivicFixRepository` with explicit environment selection in `src/lib/repository/index.ts`.**
- [ ] **Step 5: Run tests to verify repository functionality.**
- [ ] **Step 6: Git commit repository layer.**

---

### Task 5: Supabase Production Migrations & PostGIS Core Schema

**Files:**
- Create: `supabase/migrations/0001_civicfix_core_schema.sql`
- Create: `supabase/seed/0002_seed_data.sql`
- Test: `tests/sql-schema.test.ts`

**Interfaces:**
- Consumes: PostgreSQL 15+, PostGIS, pg_trgm, pgcrypto, pg_stat_statements.
- Produces: Production SQL migration scripts, triggers, RLS policies, and RPC definitions.

- [ ] **Step 1: Write idempotent `0001_civicfix_core_schema.sql` containing schemas, enums, tables, spatial GiST indexes, trigram GIN indexes, FSM triggers, RLS policies, and RPCs.**
- [ ] **Step 2: Write `0002_seed_data.sql` with the 8 categories, synthetic reports, status history, and duplicate pair.**
- [ ] **Step 3: Write SQL structure validation test in `tests/sql-schema.test.ts` verifying SQL syntax and required policy definitions.**
- [ ] **Step 4: Run test to verify SQL validation passes.**
- [ ] **Step 5: Git commit Supabase migrations.**

---

### Task 6: Backend API Route Handlers

**Files:**
- Create: `src/app/api/reports/route.ts`
- Create: `src/app/api/reports/[ref]/route.ts`
- Create: `src/app/api/reports/duplicate-check/route.ts`
- Create: `src/app/api/reports/[ref]/media/route.ts`
- Create: `src/app/api/admin/reports/[id]/status/route.ts`
- Create: `src/app/api/admin/assignments/route.ts`
- Create: `src/app/api/moderation/flags/route.ts`
- Create: `src/app/api/moderation/events/route.ts`
- Create: `src/app/api/analytics/route.ts`
- Test: `tests/api-routes.test.ts`

**Interfaces:**
- Consumes: `src/lib/repository/index.ts` and `src/lib/validation/civicfix-schemas.ts`.
- Produces: Standardized REST API endpoints for all platform capabilities.

- [ ] **Step 1: Write tests in `tests/api-routes.test.ts` for GET/POST `/api/reports`, duplicate check, admin status transitions, and analytics.**
- [ ] **Step 2: Implement all Next.js Route Handlers utilizing the repository layer and validation schemas.**
- [ ] **Step 3: Run tests to verify all API routes respond with correct status codes and payloads.**
- [ ] **Step 4: Git commit API routes.**

---

### Task 7: Leaflet Geospatial Map Components

**Files:**
- Create: `src/components/map/CivicMapCanvas.tsx`
- Create: `src/components/map/DynamicCivicMap.tsx`
- Create: `src/components/map/CategoryMarker.ts`
- Test: `tests/map-component.test.ts`

**Interfaces:**
- Consumes: Leaflet 1.9.4, react-leaflet, react-leaflet-cluster.
- Produces: SSR-safe dynamic map component with custom SVG divIcon markers, opt-in geolocation, bounding box listeners, and report clustering.

- [ ] **Step 1: Implement `CivicMapCanvas.tsx` with dynamic tile layer, SVG divIcon markers, popup previews, and opt-in location button.**
- [ ] **Step 2: Implement `DynamicCivicMap.tsx` wrapping the canvas with `next/dynamic` and `ssr: false`.**
- [ ] **Step 3: Write test verifying SSR isolation and marker SVG construction.**
- [ ] **Step 4: Git commit map components.**

---

### Task 8: User Interface Views (10 Functional Views)

**Files:**
- Create: `src/app/layout.tsx`
- Create: `src/app/page.tsx` (1. Landing Page)
- Create: `src/app/map/page.tsx` (2. Public Issue Map)
- Create: `src/app/reports/new/page.tsx` (3. Report Submission Wizard)
- Create: `src/app/reports/[ref]/page.tsx` (4. Issue Details Permalink)
- Create: `src/app/my-reports/page.tsx` (5. My Reports Citizen Dashboard)
- Create: `src/app/track/page.tsx` (6. Report Tracking Zero-Login Portal)
- Create: `src/app/analytics/page.tsx` (7. Public Analytics Dashboard)
- Create: `src/app/admin/page.tsx` (8. Admin Municipal Command Center)
- Create: `src/app/moderation/page.tsx` (9. Moderation Safety & Duplicate Queue)
- Create: `src/app/settings/page.tsx` (10. Settings & Privacy Controls)
- Create: `src/components/Navbar.tsx`
- Create: `src/components/Footer.tsx`
- Create: `src/components/IndependentNoticeBanner.tsx`

**Interfaces:**
- Consumes: Backend API routes and DynamicCivicMap.
- Produces: 10 responsive, high-contrast, accessible UI pages.

- [ ] **Step 1: Implement shared navigation, footer, and persistent Independent Platform Disclosure Banner.**
- [ ] **Step 2: Implement Landing Page (`/`), Public Map (`/map`), and Report Submission (`/reports/new`).**
- [ ] **Step 3: Implement Issue Details (`/reports/[ref]`), Report Tracking (`/track`), and My Reports (`/my-reports`).**
- [ ] **Step 4: Implement Public Analytics (`/analytics`), Admin Dashboard (`/admin`), Moderation Dashboard (`/moderation`), and Settings (`/settings`).**
- [ ] **Step 5: Git commit UI implementation.**

---

### Task 9: Comprehensive Automated Test Suite & Security Verification

**Files:**
- Create: `tests/civicfix.suite.test.ts`
- Create: `tests/e2e-user-journey.test.ts`

**Interfaces:**
- Consumes: Complete CivicFix system.
- Produces: 100% passing QA and security assertions.

- [ ] **Step 1: Implement `tests/civicfix.suite.test.ts` covering validation, XSS, magic bytes, FSM transitions, duplicate detection formula, and analytics integrity.**
- [ ] **Step 2: Implement `tests/e2e-user-journey.test.ts` simulating citizen report creation, duplicate detection flagging, admin review, and resolution.**
- [ ] **Step 3: Run full test suite with coverage (`npx vitest run`).**
- [ ] **Step 4: Git commit automated test suite.**

---

### Task 10: Production Readiness, Audits & Final Reports

**Files:**
- Create: `docs/AUDIT_REPORT.md`
- Create: `docs/ANDROID_READINESS.md`

**Interfaces:**
- Consumes: Full project build, lint checks, tests, and framework directives.
- Produces: Comprehensive audit report, Android readiness report, and final project deliverables.

- [ ] **Step 1: Run production build (`npm run build`) and fix any type or lint errors.**
- [ ] **Step 2: Generate `docs/AUDIT_REPORT.md` covering all frameworks (SRS, HLD, LLD, ADR, DDD, FSM, STRIDE, OWASP, TDD, CI-CD, SRE).**
- [ ] **Step 3: Generate `docs/ANDROID_READINESS.md` detailing API endpoints, offline sync considerations, and mobile architecture.**
- [ ] **Step 4: Git commit production build and final documentation.**
