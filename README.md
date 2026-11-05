# CivicFix — Citizen-Powered Civic Infrastructure Tracking Platform

CivicFix is an independent, citizen-powered civic infrastructure reporting, geospatial discovery, and lifecycle tracking platform engineered to make everyday urban defects—potholes, water leaks, broken streetlights, garbage accumulation, and drainage failures—visible, structured, and publicly auditable.

---

## Key Highlights

- **Explicit Public Trust Boundary**: Clear user interface and API disclosures establishing that CivicFix is an independent civic registry and does not automatically dispatch municipal work orders unless a verified authority is onboarded.
- **8-State Deterministic Lifecycle FSM**: Enforces strict transitions (`Submitted` $\to$ `Under review` $\to$ `Accepted` $\to$ `Assigned` $\to$ `In progress` $\to$ `Resolved` / `Rejected`, and `Reopened`) with mandatory public rationale logging.
- **Deterministic Duplicate Detection**: Evaluates spatial distance decay ($S_{\text{geo}}$), text trigram similarity ($S_{\text{text}}$), and temporal decay ($S_{\text{time}}$) to flag candidate duplicates for human moderation.
- **Dual-Mode Persistence Architecture**:
  - `local`: Embedded SQLite database for zero-dependency development and testing.
  - `supabase`: PostgreSQL 15+ with PostGIS, pg_trgm, pgcrypto, and Row-Level Security (RLS).
- **SSR-Safe Leaflet Geospatial Engine**: Client-isolated Leaflet 1.9.4 integration with custom SVG markers, marker clustering, and opt-in geolocation.
- **10 Functional UI Views**: Complete desktop-and-mobile-optimized workflow covering public discovery, tracking, submission, administration, moderation, and analytics.

---

## Getting Started

### 1. Prerequisites
- Node.js 18+ (tested on Node 20 and 26)
- npm 9+

### 2. Installation
```bash
git clone <repo-url> civicfix
cd civicfix
cp .env.example .env.local
npm install
```

### 3. Run Locally (Zero Setup)
```bash
# Start Next.js development server
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) to view the platform.

### 4. Running the Automated Test Suite
```bash
npm test
```

---

## Architectural Documentation
- [Software Requirements Specification (SRS)](docs/SRS.md)
- [High-Level Design (HLD)](docs/HLD.md)
- [Low-Level Design (LLD)](docs/LLD.md)
- [Finite State Machine Specification](docs/STATE_MACHINE.md)
- [Threat Model & Security Matrix](docs/THREAT_MODEL.md)
- [Database Architecture & Dual-Mode Specs](docs/DATABASE.md)
- [Local Development Runbook](docs/LOCAL_DEVELOPMENT.md)
- [Supabase Setup Guide](docs/SUPABASE_SETUP.md)
- [Testing Runbook](docs/TESTING.md)
- [Production Deployment Runbook](docs/DEPLOYMENT.md)
- [Architecture Decision Records (ADRs)](docs/ADR/)
- [Android Studio Agent Execution Plan](ANDROID_STUDIO_AGENT_PLAN.md)
- [Android Mobile Conversion Readiness Report](docs/ANDROID_READINESS.md)
