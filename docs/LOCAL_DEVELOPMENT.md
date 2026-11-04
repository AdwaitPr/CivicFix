# Local Development Runbook — CivicFix

## 1. Quickstart (Zero External Dependencies)
CivicFix is designed to run locally using the embedded SQLite provider without requiring external Docker, Supabase, or PostgreSQL installations.

### Prerequisites
- Node.js 18+ (tested on Node 20 and Node 26)
- npm 9+

### Setup Steps
```bash
# 1. Clone or navigate to the repository
cd /Users/adwaitpratapsingh/.gemini/antigravity/scratch/civicfix

# 2. Copy the local environment configuration
cp .env.example .env.local

# 3. Verify settings in .env.local
# CIVICFIX_DATA_MODE=local
# SQLITE_DB_PATH=./data/civicfix.sqlite

# 4. Install dependencies (if not already installed)
npm install

# 5. Run automated test suite
npm test

# 6. Start the local Next.js development server
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000) in your browser.

## 2. Seed Data
On first boot in `local` mode, CivicFix automatically provisions `./data/civicfix.sqlite` and loads:
- All 8 official civic defect categories (Potholes, Damaged Roads, Garbage Accumulation, Water Leakage, Drainage Problems, Broken Streetlights, Damaged Public Infrastructure, Other).
- 5 synthetic reports illustrating active lifecycle states (`In progress`, `Resolved`, `Under review`, coordinate-fuzzed sensitive waste).
- A spatial-textual near-duplicate pair triggering the deterministic duplicate candidate flagger.
