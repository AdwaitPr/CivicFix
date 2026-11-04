# Production Deployment & SRE Runbook — CivicFix

## 1. Hosting Architecture
- **Frontend / Application Edge**: Vercel or containerized Node.js runtime (Next.js Standalone).
- **Database & Auth**: Supabase PostgreSQL 15+ (PostGIS, pg_trgm, pgcrypto).
- **Object Storage**: Supabase Storage (`civicfix-media` bucket).
- **Map Tiles**: OpenStreetMap raster tiles (or commercial OSM partners such as Maptoolkit).

## 2. Environment Variables Checklist
| Variable | Scope | Requirement |
| :--- | :--- | :--- |
| `CIVICFIX_DATA_MODE` | Server | Set to `supabase` in production. |
| `NEXT_PUBLIC_SUPABASE_URL` | Public & Server | Supabase project HTTPS endpoint. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public & Server | Public anon JWT key (enforces RLS). |
| `SUPABASE_SERVICE_ROLE_KEY` | Server Secret | High-privilege key; NEVER expose to client code. |
| `NEXT_PUBLIC_MAP_TILE_URL` | Public & Server | Raster tile endpoint with `{s}`, `{z}`, `{x}`, `{y}` template. |
| `IP_HASH_SALT` | Server Secret | High-entropy cryptographic salt for client IP hashing. |

## 3. Production Build & Verification
```bash
# 1. Type check and build Next.js application
npm run build

# 2. Run automated test suite
npm test

# 3. Start production server
npm run start
```

## 4. Disaster Recovery & Backup Considerations
- **Point-in-Time Recovery (PITR)**: Enable Supabase 7-day or 30-day continuous archiving.
- **Data Export**: Nightly OpenData GeoJSON snapshot dump of public, non-hidden reports.
- **Media Redundancy**: Supabase Storage cross-region replication for uploaded defect evidence.
