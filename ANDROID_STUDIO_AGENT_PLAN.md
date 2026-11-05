# CivicFix — Android Studio Agent Execution Plan & Master Runbook

> **Note for Developers & AI Agents in Android Studio:** This is the complete, self-contained implementation plan to convert the CivicFix web platform into a native Android application located inside the `android/` directory, verify it on an Android Emulator, and commit/push all updates back to `https://github.com/AdwaitPr/CivicFix.git`.

---

## 1. Quick Start in Android Studio

1. **Clone the repository:**
   ```bash
   git clone https://github.com/AdwaitPr/CivicFix.git
   cd CivicFix
   ```
2. **Open in Android Studio:**
   - Launch **Android Studio**.
   - Click **Open** (or `File -> Open`) and select the cloned `CivicFix` directory (or the `android/` directory).
   - If opening the repository root, Android Studio will detect the `android/` folder as the Android module.
3. **Backend Target Options:**
   - **Local Development via Emulator:** `http://10.0.2.2:3000/` (while running `npm run dev` on the host machine).
   - **Production Deployed Web App:** `https://<your-vercel-app>.vercel.app/`.

---

## 2. Mandatory Backend & Android 14 Contract Enforcements

The Android app communicates directly with the live Next.js / Supabase backend. The agent **MUST** follow these 5 exact contracts:

1. **8-State FSM Status Names (Case-Sensitive Strings):**
   ```kotlin
   "Submitted", "Under review", "Accepted", "Assigned", "In progress", "Resolved", "Rejected", "Reopened"
   ```
   *(Never use uppercase DRAFT, VERIFIED, or CLOSED — the PostgreSQL DB check constraint will reject them).*

2. **Status Transition Endpoint:**
   - **Method & Path:** `PATCH /api/admin/reports/{id}/status`
   - **Header:** `x-user-role: admin`
   - **Body:** `{ "targetStatus": String, "publicRationale": String (min 5 chars), "internalAdminNote": String? }`

3. **Report Lookup & Public Tracker:**
   - **Method & Path:** `GET /api/reports/{ref}` (where `{ref}` is either a UUID or a reference code like `CVX-2026-0001`).

4. **Duplicate Check Payload & Response:**
   - **Method & Path:** `POST /api/reports/duplicate-check`
   - **Body:** `{ "categoryId": UUID, "latitude": Double, "longitude": Double, "title": String, "description": String }`
   - **Response Envelope:** `{ "candidates": List<DuplicateCandidateDto> }` where each candidate has:
     `candidate_id`, `reference_code`, `title`, `status`, `distance_meters`, `text_similarity`, `composite_score`, `created_at`.

5. **Report Creation Payload & Mandatory Disclaimer:**
   - **Method & Path:** `POST /api/reports`
   - **Body:**
     ```json
     {
       "title": "Issue title (5-140 chars)",
       "description": "Detailed description (15-4000 chars)",
       "categoryId": "UUID",
       "latitude": 26.4499,
       "longitude": 80.3319,
       "approximateAddress": "Optional street address",
       "isLocationFuzzed": false,
       "acceptedNonAffiliationDisclaimer": true
     }
     ```
     *(If `acceptedNonAffiliationDisclaimer` is missing or false, the backend rejects with HTTP 422).*

6. **Android 14 (API 34) Permissions:**
   - Use `android.permission.READ_MEDIA_IMAGES` instead of deprecated `READ_EXTERNAL_STORAGE`.
   - CameraX captures saved to app-specific external cache require zero runtime storage permissions.

7. **OsmDroid OpenStreetMap User-Agent Hook:**
   - In `CivicFixApplication.onCreate()`:
     ```kotlin
     Configuration.getInstance().load(this, PreferenceManager.getDefaultSharedPreferences(this))
     Configuration.getInstance().userAgentValue = "CivicFix-Android/1.0"
     ```

---

## 3. Architecture & File Structure

All Android code lives in the `android/` directory:

```
android/
├── app/
│   ├── build.gradle.kts
│   └── src/
│       ├── main/
│       │   ├── AndroidManifest.xml
│       │   ├── res/
│       │   │   └── xml/network_security_config.xml
│       │   └── java/org/civicfix/app/
│       │       ├── CivicFixApplication.kt
│       │       ├── data/
│       │       │   ├── api/
│       │       │   │   ├── CivicFixApiService.kt
│       │       │   │   ├── ApiClient.kt
│       │       │   │   └── models/
│       │       │   ├── local/
│       │       │   │   ├── CivicFixDatabase.kt
│       │       │   │   ├── DraftReportDao.kt
│       │       │   │   └── DraftReportEntity.kt
│       │       │   └── repository/
│       │       │       └── CivicFixRepository.kt
│       │       ├── domain/
│       │       │   └── ReportStatusFsm.kt
│       │       ├── worker/
│       │       │   └── SyncReportWorker.kt
│       │       ├── media/
│       │       │   ├── CameraXHandler.kt
│       │       │   └── ExifStripper.kt
│       │       └── ui/
│       │           ├── theme/
│       │           ├── navigation/
│       │           │   └── AppNavHost.kt
│       │           ├── components/
│       │           │   ├── CivicMapView.kt
│       │           │   └── NoticeBanner.kt
│       │           └── screens/
│       │               ├── home/HomeScreen.kt
│       │               ├── map/MapScreen.kt
│       │               ├── report/ReportWizardScreen.kt
│       │               ├── detail/DetailScreen.kt
│       │               ├── tracking/TrackingScreen.kt
│       │               ├── myreports/MyReportsScreen.kt
│       │               ├── analytics/AnalyticsScreen.kt
│       │               ├── admin/AdminScreen.kt
│       │               ├── moderation/ModerationScreen.kt
│       │               └── settings/SettingsScreen.kt
│       └── test/
│           ├── ReportStatusFsmTest.kt
│           ├── CivicFixApiServiceTest.kt
│           └── DraftReportDaoTest.kt
├── build.gradle.kts
├── settings.gradle.kts
└── gradle.properties
```

---

## 4. Tasks for the Android Studio Agent

### Task 1: Scaffolding & Gradle Setup
- Create `settings.gradle.kts`, `build.gradle.kts`, `app/build.gradle.kts`.
- Configure Compose BOM, Material3, Retrofit 2 + Gson/Moshi, Room 2.6+, WorkManager, CameraX, and OsmDroid.
- Add `network_security_config.xml` permitting cleartext for `10.0.2.2`.

### Task 2: Data Layer (Retrofit + DTOs)
- Implement `CivicFixApiService.kt`:
  - `GET api/categories`
  - `GET api/reports` (with bounding box `west`, `south`, `east`, `north`)
  - `POST api/reports` (enforcing `acceptedNonAffiliationDisclaimer: true`)
  - `GET api/reports/{ref}`
  - `POST api/reports/duplicate-check` (returns `{ candidates: [...] }`)
  - `PATCH api/admin/reports/{id}/status` (with `x-user-role: admin`)
  - `GET api/moderation/flags` & `POST api/moderation/events`
  - `GET api/analytics`
- Implement `ApiClient.kt` with dynamic Base URL switcher (default `http://10.0.2.2:3000/`).

### Task 3: Offline Sync Engine (Room + WorkManager)
- `DraftReportEntity`: id, title, description, categoryId, latitude, longitude, photoFilePath, syncStatus (`PENDING_SYNC`, `SYNCING`, `SYNCED`).
- `SyncReportWorker`: CoroutineWorker triggered on `NetworkType.CONNECTED` constraint to auto-upload queued drafts.
- `CivicFixRepository`: Unifies Room offline cache and Retrofit remote API.

### Task 4: Media Capture & EXIF Stripper
- `CameraXHandler`: PreviewView + ImageCapture callback.
- `ExifStripper`: Strips GPS and device tags via ExifInterface, compresses to WebP $\le 5\text{MB}$.

### Task 5: Geospatial Map Component
- `CivicMapView`: Compose AndroidView wrapping OsmDroid `MapView`.
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

---

## 5. Master Prompt to Copy-Paste into Android Studio

```text
Please read ANDROID_STUDIO_AGENT_PLAN.md in the root directory.
Implement the complete native Android application inside the `android/` directory according to Tasks 1 through 10:

1. Scaffold the Gradle project (Compose BOM, Material3, Retrofit2, Room, WorkManager, CameraX, OsmDroid).
2. Implement Retrofit API client with dynamic Base URL (defaulting to http://10.0.2.2:3000/ for emulator), adhering to the 5 backend contracts:
   - FSM States: "Submitted", "Under review", "Accepted", "Assigned", "In progress", "Resolved", "Rejected", "Reopened"
   - Status updates: PATCH /api/admin/reports/{id}/status with x-user-role: admin
   - Reference tracker: GET /api/reports/{ref}
   - Duplicate check: POST /api/reports/duplicate-check returning { "candidates": List<DuplicateCandidate> }
   - Report creation: POST /api/reports with "acceptedNonAffiliationDisclaimer": true
3. Implement Room DB and WorkManager for offline report drafting.
4. Implement CameraX capture with EXIF metadata stripping.
5. Implement OsmDroid OpenStreetMap Compose view with User-Agent "CivicFix-Android/1.0".
6. Implement all 10 Jetpack Compose screens matching the web app.
7. Run tests via ./gradlew test and ensure ./gradlew assembleDebug succeeds.
8. Stage, commit, and push the newly created `android/` files to the repository on branch `main`:
   git add android/ && git commit -m "feat(android): implement native Jetpack Compose application" && git push origin main
```
