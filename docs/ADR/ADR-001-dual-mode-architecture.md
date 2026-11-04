# ADR-001: Dual-Mode Persistence Architecture

## Status
Accepted

## Context
CivicFix requires high-performance spatial discovery (PostGIS `geography(Point, 4326)` GiST indexes) and fuzzy text similarity (`pg_trgm` GIN indexes) for production, but also requires immediate, zero-friction developer onboarding and testing without hard dependencies on external live Supabase credentials or Docker containers.

## Decision
We implement a repository provider abstraction (`ICivicFixRepository`) supporting:
1. `local` mode: Embedded SQLite database with Haversine great-circle distance approximation and in-memory character n-gram text overlap.
2. `supabase` mode: Supabase PostgreSQL 15+ with PostGIS, pg_trgm, pgcrypto, and Row-Level Security.

Selection is strictly explicit via `CIVICFIX_DATA_MODE=local|supabase`. The application will NEVER silently downgrade from Supabase to SQLite.

## Consequences
- **Positive**: Zero-setup local development and rapid CI unit testing. High production scalability and defense-in-depth security in Supabase mode.
- **Negative**: SQLite requires manual algorithmic approximations for spatial distances and trigram similarity, which are clearly documented in `docs/DATABASE.md`.
