# Supabase Setup & Production Database Runbook — CivicFix

## 1. Overview
When transitioning from local development to production or staging, CivicFix connects directly to Supabase PostgreSQL 15+ with native PostGIS and pg_trgm support.

## 2. Configuration
In your production environment or `.env.local`:
```bash
CIVICFIX_DATA_MODE=supabase
NEXT_PUBLIC_SUPABASE_URL=https://<your-project-id>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOi...
```

If `CIVICFIX_DATA_MODE=supabase` is configured and either URL or keys are missing, CivicFix will throw an explicit configuration error at startup. It will NEVER silently downgrade to SQLite.

## 3. Database Migration Deployment
Apply the migration scripts using the Supabase CLI or SQL Editor:

```bash
# 1. Apply core schema migration
supabase db push
# OR apply directly via Supabase SQL Editor:
# supabase/migrations/0001_civicfix_core_schema.sql

# 2. Seed default categories and synthetic validation reports
# supabase/seed/0002_seed_data.sql
```

## 4. Supabase Storage Provisioning
1. Create a public storage bucket named `civicfix-media`.
2. Configure File Size Limit: `5242880` bytes (5 MB).
3. Restrict Allowed MIME Types:
   - `image/jpeg`
   - `image/png`
   - `image/webp`
4. Apply storage RLS policy:
   - SELECT: `bucket_id = 'civicfix-media'`
   - INSERT: `auth.uid() = owner`
