# CivicFix Native Android Studio Implementation Plan

> **For AI Agents in Android Studio:** This is a turnkey, step-by-step implementation plan designed to be executed inside Android Studio on a cloned copy of the CivicFix repository. Every file path, Gradle configuration, Kotlin model, Room entity, Retrofit service, and Compose screen is fully specified with complete code templates. Follow each task in order, verify with tests, and commit/push all updates to the repository.

**Goal:** Convert the complete CivicFix web platform into a production-grade native Android application located inside the `android/` directory of the cloned repository, connected directly to the same backend server (Vercel / Supabase), database, and REST APIs, featuring offline-first Room drafting, CameraX photo capture with EXIF sanitization, interactive geospatial mapping, and automated emulator verification.

**Architecture:** Clean Architecture + MVVM (Model-View-ViewModel) with Jetpack Compose UI. The app connects to the web app's Next.js REST API routes (`/api/categories`, `/api/reports`, `/api/reports/duplicate-check`, `/api/analytics`) via Retrofit 2 + OkHttp. An offline-first Room database caches categories and stages draft reports, while Android `WorkManager` handles resilient background syncing.

**Tech Stack:**
- **Language & Runtime:** Kotlin 2.0+, JDK 17, Android SDK 34 (Min SDK 26)
- **UI Framework:** Jetpack Compose (BOM 2024.09.00+), Material 3
- **Networking:** Retrofit 2.11.0, OkHttp 4.12.0, Moshi/Gson
- **Local Persistence & Sync:** Room 2.6.1, WorkManager 2.9.1
- **Hardware & Media:** CameraX 1.3.4, ExifInterface, Coil Compose 2.7.0
- **Geospatial Mapping:** OsmDroid 6.1.18 (OpenStreetMap raster tiles matching web)
- **Testing:** JUnit 4, MockWebServer 4.12.0, AndroidX Test Runner, Espresso

**Spec References:**
- [docs/ANDROID_READINESS.md](file:///Users/adwaitpratapsingh/.gemini/antigravity/scratch/civicfix/docs/ANDROID_READINESS.md)
- [docs/SRS.md](file:///Users/adwaitpratapsingh/.gemini/antigravity/scratch/civicfix/docs/SRS.md)
- [docs/HLD.md](file:///Users/adwaitpratapsingh/.gemini/antigravity/scratch/civicfix/docs/HLD.md)
- [docs/STATE_MACHINE.md](file:///Users/adwaitpratapsingh/.gemini/antigravity/scratch/civicfix/docs/STATE_MACHINE.md)
- [docs/DATABASE.md](file:///Users/adwaitpratapsingh/.gemini/antigravity/scratch/civicfix/docs/DATABASE.md)

---

## Global Constraints & Backend Enforcements

1. **Working Directory Location:** All Android Studio code, build scripts, assets, and Gradle wrappers must reside in `android/` at the root of the cloned repository.
2. **Backend Server Parity:** The app must connect to the same server and database. Base URLs must be switchable between:
   - **Emulator Local Dev (Next.js local server):** `http://10.0.2.2:3000/` (Android Emulator's loopback alias to the host machine's `localhost:3000`)
   - **Production (Vercel Live):** `https://<your-deployed-civicfix>.vercel.app/`
3. **8-State FSM State Names (Case-Sensitive):**
   ```kotlin
   "Submitted", "Under review", "Accepted", "Assigned", "In progress", "Resolved", "Rejected", "Reopened"
   ```
4. **Status Transition Route:**
   - `PATCH /api/admin/reports/{id}/status` with header `x-user-role: admin` and payload `{ "targetStatus": String, "publicRationale": String (min 5 chars), "internalAdminNote": String? }`.
5. **Reference Tracker:**
   - `GET /api/reports/{ref}` (where `{ref}` is UUID or reference code like `CVX-2026-0001`).
6. **Duplicate Check:**
   - `POST /api/reports/duplicate-check` returning `{ "candidates": List<DuplicateCandidateDto> }`.
7. **Report Creation Payload:**
   - `POST /api/reports` requiring `acceptedNonAffiliationDisclaimer: true`.
8. **Android 14 Permissions & OsmDroid Hook:**
   - Use `android.permission.READ_MEDIA_IMAGES`.
   - Set `Configuration.getInstance().userAgentValue = "CivicFix-Android/1.0"` in `CivicFixApplication.onCreate()`.
9. **Git Push on Completion:**
   - Commit and push all `android/` files back to `main`.

---

## Detailed Task Breakdown

### Task 1: Scaffolding & Dependencies
- Create `android/settings.gradle.kts`, `android/build.gradle.kts`, `android/app/build.gradle.kts`.
- Set `compileSdk = 34`, `targetSdk = 34`, `minSdk = 26`.
- Declare Compose BOM, Material3, Retrofit2, Room, WorkManager, CameraX, and OsmDroid.
- Add `network_security_config.xml` permitting cleartext for `10.0.2.2` and `localhost`.

### Task 2: Data Models & Retrofit API Service Layer
- DTOs in `data/api/models/`: `CategoryDto`, `ReportDto`, `ReportDetailDto`, `CreateReportRequest`, `DuplicateCheckRequest`, `DuplicateCandidateDto`, `AnalyticsDto`.
- Retrofit endpoints:
  - `GET api/categories`
  - `GET api/reports`
  - `POST api/reports`
  - `GET api/reports/{ref}`
  - `POST api/reports/duplicate-check`
  - `PATCH api/admin/reports/{id}/status`
  - `GET api/moderation/flags` & `POST api/moderation/events`
  - `GET api/analytics`
- `ApiClient.kt` with dynamic Base URL switcher.

### Task 3: Room Database & Offline-First Sync Engine
- Entities: `CategoryEntity`, `DraftReportEntity`.
- DAOs: `CategoryDao`, `DraftReportDao`.
- `CivicFixDatabase.kt`.
- `SyncReportWorker.kt`: CoroutineWorker triggered on `NetworkType.CONNECTED` constraint to auto-upload drafts.
- `CivicFixRepository.kt`: Unifies Room offline cache and Retrofit remote API.

### Task 4: Media Capture & EXIF Privacy Stripper
- `CameraXHandler.kt`: PreviewView + ImageCapture callback.
- `ExifStripper.kt`: Strips GPS and device tags via ExifInterface, compresses to WebP $\le 5\text{MB}$.

### Task 5: Geospatial Map Component
- `CivicMapView.kt`: Compose AndroidView wrapping OsmDroid `MapView`.
- Custom category marker pins with web-matched colors (`#174EA6`, `#12B5CB`, `#D93025`, etc.).
- Interactive pin placement selector and viewport bounds synchronization on pan/zoom.

### Task 6: 8-State FSM Domain Validation
- `ReportStatusFsm.kt`: Enforces valid transitions and requires `publicRationale` (min 5 chars).
  ```kotlin
  val VALID_TRANSITIONS = mapOf(
      "Submitted" to listOf("Under review", "Rejected"),
      "Under review" to listOf("Accepted", "Rejected"),
      "Accepted" to listOf("Assigned", "In progress", "Rejected"),
      "Assigned" to listOf("In progress", "Accepted", "Rejected"),
      "In progress" to listOf("Resolved", "Assigned", "Accepted"),
      "Resolved" to listOf("Reopened"),
      "Rejected" to listOf("Reopened", "Under review"),
      "Reopened" to listOf("Under review", "Accepted", "Assigned", "In progress", "Rejected")
  )
  ```

### Task 7: 10 Jetpack Compose Screens
1. `HomeScreen`: KPI cards (`pending_active_count`, `resolved_count`, `closed_rejected_count`), independent disclosure banner, recent reports.
2. `MapScreen`: Interactive OsmDroid map with category filter chips and detail bottom sheet.
3. `ReportWizardScreen`: Step-by-step reporter with live duplicate check alert, GPS detection, photo picker, and mandatory disclaimer checkbox.
4. `DetailScreen`: Reference code, status badge, photo, map, and chronological audit trail.
5. `TrackingScreen`: Reference code lookup querying `GET api/reports/{ref}`.
6. `MyReportsScreen`: Submitted user reports + offline draft queue with manual sync button.
7. `AnalyticsScreen`: Dynamic platform metrics & category distribution charts.
8. `AdminScreen`: Operational triage table & FSM status transitions (`PATCH api/admin/reports/{id}/status`).
9. `ModerationScreen`: Flag review queue (`GET api/moderation/flags`) & moderation actions (`POST api/moderation/events`).
10. `SettingsScreen`: Server URL toggle (`10.0.2.2:3000` vs Vercel URL) and role switcher.

### Task 8: Automated Unit & MockWebServer Tests
- `ReportStatusFsmTest`: Tests valid and invalid transitions.
- `CivicFixApiServiceTest`: MockWebServer verifies parsing of categories, reports, duplicate candidates, and status updates.
- `DraftReportDaoTest`: Room DAO tests verifying offline draft persistence.

### Task 9: Emulator Verification
- Build project: `./gradlew assembleDebug test`.
- Launch on **Pixel 8 Emulator (API 34)**.
- Verify screen navigation, GPS placement, duplicate detection alert, offline airplane mode drafting, and tracker lookup.

### Task 10: Git Commit & Push to Repository
Once the build passes and tests are verified, the agent must commit and push all newly created files:
```bash
git add android/
git commit -m "feat(android): implement native Jetpack Compose application with offline Room sync and OsmDroid map"
git push origin main
```
