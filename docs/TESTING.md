# Testing & Verification Strategy — CivicFix

## 1. Testing Framework & Philosophy
CivicFix enforces strict Test-Driven Development (TDD) across all architectural layers. Testing is executed via Vitest with isolated in-memory and SQLite test runners, paired with schema and SQL integrity assertions.

## 2. Test Execution Commands
```bash
# Run all unit, integration, and security test suites
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with test coverage reporting
npx vitest run --coverage
```

## 3. Test Coverage Matrix
1. **Validation & Security (`tests/domain-and-security.test.ts`)**:
   - Title and description bounds (5-140 chars, 15-4000 chars).
   - Coordinate boundary constraints and Null Island `(0, 0)` rejection.
   - HTML/script tag stripping and XSS vector sanitization.
   - Binary magic-byte image verification (JPEG, PNG, WebP) and SVG/HTML rejection.
2. **Lifecycle Finite State Machine (`tests/domain-and-security.test.ts`)**:
   - Legal transition pathways: `Submitted` $\to$ `Under review` $\to$ `Accepted` $\to$ `Assigned` $\to$ `In progress` $\to$ `Resolved` $\to$ `Reopened`.
   - Illegal state jump rejections (`Submitted` $\to$ `Resolved`).
   - Non-empty public rationale enforcement.
3. **Deterministic Duplicate Scoring (`tests/domain-and-security.test.ts`)**:
   - Linear spatial distance decay calculation.
   - Trigram textual overlap calculation with short-string fallback.
   - Temporal decay window calculation.
   - Composite threshold score verification ($S_{\text{dup}} \ge 0.450$).
4. **Repository Data Layer (`tests/repository.test.ts`)**:
   - Dual-mode provider contract validation.
   - Great-circle Haversine distance bounding-box search.
   - Pre-submission duplicate candidate preview.
   - Status transition and audit history append.
   - Public vs private note visibility isolation.
5. **Public Analytics Partitioning (`tests/civicfix.suite.test.ts`)**:
   - Mutually exclusive partitioning: Total = Resolved + Closed (Rejected) + Pending.
   - Resolution duration calculation from real timestamps.
6. **SQL Schema & RLS Integrity (`tests/sql-schema.test.ts`)**:
   - Verification of SQL statements in `0001_civicfix_core_schema.sql`.
   - Column-level privilege guard verification for `profiles.role`.
   - RLS enable statements on all core tables.
