# CivicFix Native Android Studio Implementation Plan

> **For AI Agents in Android Studio:** This is a turnkey, step-by-step implementation plan designed to be executed inside Android Studio on a cloned copy of the CivicFix repository. Every file path, Gradle configuration, Kotlin model, Room entity, Retrofit service, and Compose screen is fully specified with complete code templates. Follow each task in order, verify with tests, and check off items as they are completed.

**Goal:** Convert the complete CivicFix web platform into a production-grade native Android application located inside the `android/` directory of the cloned repository, connected directly to the same backend server (Vercel / Supabase), database, and REST APIs, featuring offline-first Room drafting, CameraX photo capture with EXIF sanitization, interactive geospatial mapping, and automated emulator verification.

**Architecture:** Clean Architecture + MVVM (Model-View-ViewModel) with Jetpack Compose UI. The app connects to the web app's Next.js REST API routes (`/api/categories`, `/api/reports`, `/api/reports/duplicate-check`, `/api/analytics`) via Retrofit 2 + OkHttp. An offline-first Room database caches categories and stages draft reports, while Android `WorkManager` handles resilient background syncing.

**Tech Stack:**
- **Language & Runtime:** Kotlin 2.0+, JDK 17, Android SDK 34 (Min SDK 26)
- **UI Framework:** Jetpack Compose (BOM 2024.09.00+), Material 3
- **Networking:** Retrofit 2.11.0, OkHttp 4.12.0, Moshi 1.15.1
- **Local Persistence & Sync:** Room 2.6.1, WorkManager 2.9.1
- **Hardware & Media:** CameraX 1.3.4, ExifInterface, Coil Compose 2.7.0
- **Geospatial Mapping:** OsmDroid 6.1.18 (Pure OpenStreetMap raster tiles matching web) / MapLibre Native SDK
- **Testing:** JUnit 4, MockWebServer 4.12.0, AndroidX Test Runner, Espresso

**Spec References:**
- [docs/ANDROID_READINESS.md](file:///Users/adwaitpratapsingh/.gemini/antigravity/scratch/civicfix/docs/ANDROID_READINESS.md)
- [docs/SRS.md](file:///Users/adwaitpratapsingh/.gemini/antigravity/scratch/civicfix/docs/SRS.md)
- [docs/HLD.md](file:///Users/adwaitpratapsingh/.gemini/antigravity/scratch/civicfix/docs/HLD.md)
- [docs/STATE_MACHINE.md](file:///Users/adwaitpratapsingh/.gemini/antigravity/scratch/civicfix/docs/STATE_MACHINE.md)
- [docs/DATABASE.md](file:///Users/adwaitpratapsingh/.gemini/antigravity/scratch/civicfix/docs/DATABASE.md)

---

## Global Constraints

1. **Working Directory Location:** All Android Studio code, build scripts, assets, and Gradle wrappers must reside in `android/` at the root of the cloned repository.
2. **Backend Server Parity:** The app must connect to the same server and database. Base URLs must be switchable between:
   - **Production (Vercel Live):** `https://<your-deployed-civicfix>.vercel.app/`
   - **Emulator Local Dev (Next.js local server):** `http://10.0.2.2:3000/` (Android Emulator's loopback alias to the host machine's `localhost:3000`)
3. **Zero Credential Leakage:** `SUPABASE_SERVICE_ROLE_KEY` must NEVER be embedded or stored in Android code or resources. All administrative operations must flow through server-side authenticated route handlers.
4. **Independent Public Registry Trust Disclosure:** The app must prominently display the persistent disclosure banner that CivicFix is an independent public observation registry, not a municipal ERP dispatch.
5. **Non-Affiliation Agreement:** The report submission screen must enforce the mandatory `acceptedNonAffiliationDisclaimer: true` checkbox before allowing submission.
6. **EXIF Privacy Hardening:** Before uploading photos, camera EXIF metadata (GPS coordinates, device serial numbers, timestamps) must be completely stripped, and images compressed to WebP $\le 5\text{MB}$.

---

## Review Focus (Edge Cases & Failure Modes)

1. **Field Connectivity Loss:** If user submits a report in a tunnel, dead zone, or basement with no signal, the app must not throw a network exception; it must save to Room with status `PENDING_SYNC` and notify user: *"Offline Draft Saved — Will upload automatically when connected"*.
2. **Real-time Duplicate Candidate Detection:** While user types report title and description, the app must debounce-call `POST /api/reports/duplicate-check`. If $S_{\text{dup}} \ge 0.45$, surface a non-blocking amber warning with existing candidate details and an "Upvote Existing Instead" button.
3. **Permission Denial Graceful Fallback:** If user denies `ACCESS_FINE_LOCATION` or `CAMERA`, the app must not crash. It must allow manual map pin selection and gallery image picking.
4. **Cleartext Traffic for Emulator:** Android 9+ blocks HTTP by default. `network_security_config.xml` must whitelist `10.0.2.2` for seamless local emulator testing.
5. **8-State FSM Guard:** The app must strictly mirror the 8-state lifecycle (`Submitted`, `Under review`, `Accepted`, `Assigned`, `In progress`, `Resolved`, `Rejected`, `Reopened`) and require public rationale on state changes.

---

## Project Structure in Cloned Repo

```
<repo-root>/
├── android/                         <-- Target Android Studio Root
│   ├── app/
│   │   ├── build.gradle.kts
│   │   └── src/
│   │       ├── main/
│   │       │   ├── AndroidManifest.xml
│   │       │   ├── res/
│   │       │   └── java/org/civicfix/app/
│   │       │       ├── CivicFixApplication.kt
│   │       │       ├── data/
│   │       │       │   ├── api/ (Retrofit services & models)
│   │       │       │   ├── local/ (Room DB, DAOs, Entities)
│   │       │       │   └── repository/ (CivicFixRepositoryImpl)
│   │       │       ├── domain/
│   │       │       │   └── model/ (Domain models & FSM)
│   │       │       ├── worker/ (WorkManager SyncReportWorker)
│   │       │       └── ui/
│   │       │           ├── theme/ (Color, Type, Theme)
│   │       │           ├── navigation/ (NavHost & Destinations)
│   │       │           ├── components/ (Banners, Markers, TopBars)
│   │       │           └── screens/
│   │       │               ├── home/ (Landing & KPIs)
│   │       │               ├── map/ (Geospatial Explorer)
│   │       │               ├── report/ (New Report & Duplicate Check)
│   │       │               ├── detail/ (Report Detail & Timeline)
│   │       │               ├── tracking/ (Reference Tracker)
│   │       │               ├── myreports/ (Citizen History)
│   │       │               ├── analytics/ (Public Metrics)
│   │       │               ├── admin/ (Triage & Status Transitions)
│   │       │               └── settings/ (Role Switching & Config)
│   │       └── test/ (Unit & MockWebServer tests)
│   ├── build.gradle.kts
│   ├── settings.gradle.kts
│   └── gradle.properties
├── src/ (Existing Next.js web application)
├── docs/ (Architecture & Runbooks)
└── README.md
```

---

## Detailed Task Breakdown for Android Studio Agent

### Task 1: Android Studio Project Scaffolding & Dependencies

- [ ] **Step 1.1: Create Android Gradle Root Configuration**
  Create `android/settings.gradle.kts` and `android/build.gradle.kts`:
  ```kotlin
  // android/settings.gradle.kts
  pluginManagement {
      repositories {
          google()
          mavenCentral()
          gradlePluginPortal()
      }
  }
  dependencyResolutionManagement {
      repositoriesMode.set(RepositoriesMode.FAIL_ON_PROJECT_REPOS)
      repositories {
          google()
          mavenCentral()
          maven { url = java.net.URI("https://jitpack.io") }
      }
  }
  rootProject.name = "CivicFix"
  include(":app")
  ```

  ```kotlin
  // android/build.gradle.kts
  plugins {
      alias(libs.plugins.android.application) apply false
      alias(libs.plugins.kotlin.android) apply false
      alias(libs.plugins.kotlin.compose) apply false
      alias(libs.plugins.ksp) apply false
  }
  ```

- [ ] **Step 1.2: Configure `android/app/build.gradle.kts`**
  Set `compileSdk = 34`, `minSdk = 26`, `targetSdk = 34`. Add dependencies:
  - Jetpack Compose BOM (`androidx.compose:compose-bom:2024.09.00`)
  - Material 3 (`androidx.compose.material3:material3`)
  - Navigation Compose (`androidx.navigation:navigation-compose:2.8.0`)
  - Retrofit (`com.squareup.retrofit2:retrofit:2.11.0`, `converter-moshi:2.11.0`)
  - OkHttp Logging Interceptor (`com.squareup.okhttp3:logging-interceptor:4.12.0`)
  - Room (`androidx.room:room-runtime:2.6.1`, `androidx.room:room-ktx:2.6.1`, KSP compiler)
  - WorkManager (`androidx.work:work-runtime-ktx:2.9.1`)
  - CameraX (`androidx.camera:camera-camera2:1.3.4`, `camera-lifecycle:1.3.4`, `camera-view:1.3.4`)
  - Coil Compose (`io.coil-kt:coil-compose:2.7.0`)
  - OsmDroid (`org.osmdroid:osmdroid-android:6.1.18`)
  - Play Services Location (`com.google.android.gms:play-services-location:21.3.0`)

- [ ] **Step 1.3: Configure `AndroidManifest.xml` & Network Security**
  Create `android/app/src/main/res/xml/network_security_config.xml`:
  ```xml
  <?xml version="1.0" encoding="utf-8"?>
  <network-security-config>
      <base-config cleartextTrafficPermitted="false" />
      <domain-config cleartextTrafficPermitted="true">
          <!-- Allow HTTP for Android Emulator local development -->
          <domain includeSubdomains="true">10.0.2.2</domain>
          <domain includeSubdomains="true">localhost</domain>
      </domain-config>
  </network-security-config>
  ```
  In `android/app/src/main/AndroidManifest.xml`, declare permissions:
  ```xml
  <uses-permission android:name="android.permission.INTERNET" />
  <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
  <uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
  <uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
  <uses-permission android:name="android.permission.CAMERA" />
  ```
  Set `android:networkSecurityConfig="@xml/network_security_config"` and `android:name=".CivicFixApplication"`.

- [ ] **Step 1.4: Verification**
  Run `./gradlew assembleDebug` in `android/` directory and verify build succeeds.

---

### Task 2: Data Models & Retrofit API Service Layer

- [ ] **Step 2.1: Kotlin Data Classes for API Contracts**
  Create `android/app/src/main/java/org/civicfix/app/data/api/models/`:
  - `CategoryDto.kt`: `id`, `slug`, `name`, `description`, `icon_name`, `color_hex`, `duplicate_radius_meters`, `duplicate_window_hours`, `is_sensitive_location`.
  - `ReportDto.kt`: `id`, `reference_code`, `title`, `description`, `category_id`, `category_name`, `category_color`, `status`, `latitude`, `longitude`, `approximate_address`, `is_location_fuzzed`, `upvote_count`, `created_at`.
  - `ReportDetailDto.kt`: Full report fields plus `status_history: List<StatusHistoryDto>`, `flags: List<ReportFlagDto>`.
  - `CreateReportRequest.kt`:
    ```kotlin
    data class CreateReportRequest(
        val title: String,
        val description: String,
        val categoryId: String,
        val latitude: Double,
        val longitude: Double,
        val approximateAddress: String? = null,
        val isLocationFuzzed: Boolean = false,
        val acceptedNonAffiliationDisclaimer: Boolean = true,
        val photoBase64: String? = null
    )
    ```
  - `DuplicateCheckRequest.kt` & `DuplicateCheckResponse.kt`:
    ```kotlin
    data class DuplicateCheckRequest(
        val categoryId: String,
        val latitude: Double,
        val longitude: Double,
        val title: String,
        val description: String
    )
    data class DuplicateCandidate(
        val id: String,
        val reference_code: String,
        val title: String,
        val status: String,
        val distance_meters: Double,
        val duplicate_score: Double
    )
    data class DuplicateCheckResponse(
        val has_likely_duplicate: Boolean,
        val candidate_count: Int,
        val top_candidate: DuplicateCandidate?
    )
    ```
  - `AnalyticsDto.kt`: Mirrors `PublicAnalyticsSummary` (`total_reports`, `resolved_count`, `pending_active_count`, `closed_rejected_count`, `by_category`, `by_status`).

- [ ] **Step 2.2: Retrofit API Interface**
  Create `android/app/src/main/java/org/civicfix/app/data/api/CivicFixApiService.kt`:
  ```kotlin
  interface CivicFixApiService {
      @GET("api/categories")
      async fun getCategories(): Response<CategoriesResponse>

      @GET("api/reports")
      suspend fun getReports(
          @Query("west") west: Double? = null,
          @Query("south") south: Double? = null,
          @Query("east") east: Double? = null,
          @Query("north") north: Double? = null,
          @Query("category") category: String? = null,
          @Query("status") status: String? = null,
          @Query("limit") limit: Int = 100
      ): Response<ReportsListResponse>

      @POST("api/reports")
      suspend fun createReport(@Body request: CreateReportRequest): Response<CreateReportResponse>

      @POST("api/reports/duplicate-check")
      suspend fun checkDuplicates(@Body request: DuplicateCheckRequest): Response<DuplicateCheckResponse>

      @GET("api/reports/{ref}")
      suspend fun getReportByRef(@Path("ref") ref: String): Response<ReportDetailResponse>

      @PATCH("api/admin/reports/{id}/status")
      suspend fun updateReportStatus(
          @Path("id") id: String,
          @Body request: UpdateStatusRequest
      ): Response<UpdateStatusResponse>

      @POST("api/moderation/flags")
      suspend fun flagReport(@Body request: FlagReportRequest): Response<FlagReportResponse>

      @GET("api/analytics")
      suspend fun getAnalytics(): Response<AnalyticsResponse>
  }
  ```

- [ ] **Step 2.3: Network Client Factory & Environment Configuration**
  Create `android/app/src/main/java/org/civicfix/app/data/api/NetworkClient.kt`:
  - OkHttp Client with 30s timeouts, logging interceptor, and custom header `X-CivicFix-Client: android-native`.
  - Configurable Base URL provider reading from `BuildConfig.API_BASE_URL` or `SharedPreferences` (defaults to `http://10.0.2.2:3000/` for debug builds and production URL for release builds).

- [ ] **Step 2.4: Verification**
  Write MockWebServer tests in `android/app/src/test/java/org/civicfix/app/data/api/CivicFixApiServiceTest.kt` verifying successful serialization/deserialization of categories, reports, duplicate check, and analytics.

---

### Task 3: Room Database & Offline-First Sync Engine

- [ ] **Step 3.1: Room Database Schema & Entities**
  Create `android/app/src/main/java/org/civicfix/app/data/local/`:
  - `CategoryEntity.kt`: Caches categories locally for instant offline dropdowns.
  - `DraftReportEntity.kt`:
    ```kotlin
    @Entity(tableName = "draft_reports")
    data class DraftReportEntity(
        @PrimaryKey(autoGenerate = true) val localId: Long = 0,
        val title: String,
        val description: String,
        val categoryId: String,
        val latitude: Double,
        val longitude: Double,
        val approximateAddress: String?,
        val isLocationFuzzed: Boolean,
        val photoFilePath: String?,
        val syncStatus: String = "PENDING_SYNC", // PENDING_SYNC, SYNCING, SYNCED, FAILED
        val remoteReferenceCode: String? = null,
        val createdAt: Long = System.currentTimeMillis()
    )
    ```

- [ ] **Step 3.2: DAOs & AppDatabase**
  Create `DraftReportDao.kt`, `CategoryDao.kt`, and `CivicFixDatabase.kt` with Room `exportSchema = false`.

- [ ] **Step 3.3: Background WorkManager `SyncReportWorker`**
  Create `android/app/src/main/java/org/civicfix/app/worker/SyncReportWorker.kt`:
  - Extends `CoroutineWorker(context, params)`.
  - Fetches all drafts where `syncStatus == "PENDING_SYNC"`.
  - Reads photo file from disk, base64 encodes it, and posts to `apiService.createReport()`.
  - Updates draft to `SYNCED` and writes assigned `remoteReferenceCode`.
  - Configures `Constraints.Builder().setRequiredNetworkType(NetworkType.CONNECTED).build()`.

- [ ] **Step 3.4: Repository Implementation**
  Create `CivicFixRepository.kt` combining Room local cache and Retrofit remote sync.

- [ ] **Step 3.5: Verification**
  Run Room DAO tests using in-memory database in `android/app/src/test/java/org/civicfix/app/data/local/DraftReportDaoTest.kt`.

---

### Task 4: CameraX Image Capture & EXIF Privacy Stripper

- [ ] **Step 4.1: CameraX Photo Capture Manager**
  Create `android/app/src/main/java/org/civicfix/app/media/CameraCaptureManager.kt`:
  - Implements CameraX `ImageCapture` use case with `ImageCapture.CAPTURE_MODE_MINIMIZE_LATENCY`.
  - Saves temporary RAW image to cache directory.

- [ ] **Step 4.2: EXIF Sanitizer & WebP Compressor**
  Create `android/app/src/main/java/org/civicfix/app/media/ImageSanitizer.kt`:
  ```kotlin
  object ImageSanitizer {
      fun sanitizeAndCompress(context: Context, uri: Uri): File {
          // 1. Decode bitmap with downsampling (max dimension 1920px)
          // 2. Strip all EXIF tags (GPS, camera serial number, model) using ExifInterface
          // 3. Compress to WebP Lossy at 85% quality
          // 4. Validate output size <= 5MB
      }
  }
  ```

- [ ] **Step 4.3: Verification**
  Write unit test verifying that GPS metadata is removed and compressed output does not exceed 5MB.

---

### Task 5: Geospatial Map Component (OpenStreetMap / MapLibre)

- [ ] **Step 5.1: OsmDroid MapView Compose Wrapper**
  Create `android/app/src/main/java/org/civicfix/app/ui/components/CivicMapView.kt`:
  - Wraps Android `MapView` in `AndroidView`.
  - Configures OpenStreetMap tile source matching the web app.
  - Sets user agent to `CivicFix-Android/1.0`.
  - Listens to viewport bounds changes (`moveend` / map pan) and queries `viewModel.loadReportsInBounds(west, south, east, north)`.

- [ ] **Step 5.2: Dynamic Category Color Marker Overlay**
  - Renders custom map pins matching the web category colors (`#174EA6` for Potholes, `#12B5CB` for Water Leakage, `#D93025` for Garbage, etc.).
  - Clicking a marker opens a bottom sheet or tooltip with reference code, title, and "View Details" button.

- [ ] **Step 5.3: Interactive Pin Selector Mode**
  - When in report creation mode, tapping anywhere on the map drops an amber selector pin and returns latitude/longitude coordinates to the caller.

---

### Task 6: Citizen Issue Reporting Wizard with Real-Time Duplicate Alert

- [ ] **Step 6.1: Report Submission ViewModel**
  Create `android/app/src/main/java/org/civicfix/app/ui/screens/report/NewReportViewModel.kt`:
  - State holds: `title`, `description`, `selectedCategoryId`, `lat`, `lng`, `photoUri`, `disclaimerAccepted`, `duplicateCandidate`, `isSubmitting`.
  - Debounced (400ms) duplicate check trigger:
    ```kotlin
    fun onDescriptionOrTitleChanged() {
        if (title.length > 5 && description.length > 10 && selectedCategoryId != null) {
            viewModelScope.launch {
                val res = repository.checkDuplicates(selectedCategoryId!!, lat, lng, title, description)
                duplicateCandidate = res.top_candidate
            }
        }
    }
    ```

- [ ] **Step 6.2: Compose Screen (`NewReportScreen.kt`)**
  - **Category Selector Grid:** Icons and category titles.
  - **Title & Description TextFields:** Form validation (Title 5-100 chars, Description 10-1000 chars).
  - **Location Bar:** Shows coordinates with "Detect GPS" button and "Pick on Map" button.
  - **Photo Capture Section:** "Take Photo" (CameraX) and "Select from Gallery" buttons with preview thumbnail.
  - **Duplicate Alert Banner:** If `duplicateCandidate` detected, displays amber alert with similarity score and "Upvote This Issue Instead" action button.
  - **Non-Affiliation Disclaimer Box:** Checkbox: *"I understand CivicFix is an independent public tracking registry and does not guarantee municipal work orders."* (Submit disabled until checked).

- [ ] **Step 6.3: Offline Fallback Flow**
  - If network call fails or device is offline, saves to Room `DraftReportEntity`, enqueues `SyncReportWorker`, and navigates to confirmation screen with offline notice.

---

### Task 7: Landing Dashboard & Transparency Portal Screen (`HomeScreen`)

- [ ] **Step 7.1: `HomeScreen.kt` UI**
  - **Header:** CivicFix logo, independent civic registry badge.
  - **KPI Cards:**
    - Pending Active (`analytics.summary.pending_active_count`)
    - Verified Resolved (`analytics.summary.resolved_count`)
    - Closed / Out-of-Scope (`analytics.summary.closed_rejected_count`)
  - **Quick Action Bar:** "Report an Issue" (large primary button) and "Explore Live Map" (secondary button).
  - **Reference Code Search Box:** Text field with search button navigating to `/track/{code}`.
  - **Recent Civic Issues List:** Recycler/LazyColumn showing the latest 10 public reports with status pills.

---

### Task 8: Issue Detail, Public Tracking & Personal Reports Screens

- [ ] **Step 8.1: `ReportDetailScreen.kt`**
  - Displays issue reference code, category badge, and status badge with exact color coding.
  - High-resolution photo evidence view.
  - **Official Remediation Transparency Notice:** Explicitly indicates whether the jurisdiction has an onboarded municipal authority or is community-monitored.
  - **Chronological Audit Trail Timeline:** Renders each status change with actor role, timestamp, and public rationale.
  - Upvote button with live counter.

- [ ] **Step 8.2: `TrackScreen.kt`**
  - Instant reference code lookup field (e.g. `CVX-2026-0001`).
  - Directly pulls and renders the issue detail and status history.

- [ ] **Step 8.3: `MyReportsScreen.kt`**
  - Tab 1: **Submitted Reports** (queried from backend or saved device ID).
  - Tab 2: **Offline Drafts** (queried from Room `draft_reports` with sync indicator: *Pending*, *Syncing*, or *Retry*).

---

### Task 9: Administrative Triage Desk & Moderation Screens

- [ ] **Step 9.1: `AdminTriageScreen.kt`**
  - Filter reports by status (`Submitted`, `Under review`, `Accepted`, `Assigned`, `In progress`, `Resolved`, `Rejected`, `Reopened`).
  - Action button: **"Update Status"** opening an FSM modal.
  - **FSM Guard Validation:** Only displays valid next transitions based on current state (per `docs/STATE_MACHINE.md`).
  - **Mandatory Rationale Prompt:** Enforces text input for transitions requiring justification (e.g., Reject, Resolve, Reopen).

- [ ] **Step 9.2: `ModerationScreen.kt`**
  - Queue of reports flagged with reasons (`duplicate_candidate`, `spam`, `abusive`, `pii_violation`).
  - Actions: "Dismiss Flag" or "Hide from Public Map".

- [ ] **Step 9.3: `SettingsScreen.kt`**
  - **Server URL Configuration:** Allows developer/user to toggle between Local Emulator (`http://10.0.2.2:3000`) and Live Vercel Production (`https://...`).
  - **Simulated Role Switcher:** Allows toggling between `citizen`, `community_org`, `moderator`, and `authority` for local testing.

---

### Task 10: Unit & Integration Testing Suite

- [ ] **Step 10.1: FSM State Machine Tests**
  Create `android/app/src/test/java/org/civicfix/app/domain/FsmTransitionTest.kt`:
  - Tests valid transitions (`Submitted` $\to$ `Under review`, `In progress` $\to$ `Resolved`).
  - Tests that illegal transitions (e.g., `Submitted` $\to$ `Resolved`) are rejected.
  - Tests that mandatory rationale rules are strictly enforced.

- [ ] **Step 10.2: Retrofit & MockWebServer Integration Tests**
  Create `android/app/src/test/java/org/civicfix/app/data/api/MockServerApiTest.kt`:
  - Simulates 200 responses for categories, reports, duplicate check, and analytics.
  - Simulates network dropouts and verifies graceful error recovery.

---

### Task 11: Android Studio Emulator Runbook & End-to-End Verification

- [ ] **Step 11.1: Android Studio Setup Instructions**
  1. Open Android Studio.
  2. Select **Open** and choose the `android/` folder inside the cloned CivicFix repository.
  3. Wait for Gradle Sync to complete.
  4. In `app/build.gradle.kts` (or `SettingsScreen`), verify `API_BASE_URL` points to `http://10.0.2.2:3000/` (if running Next.js locally) or `https://<your-vercel-app>.vercel.app/`.

- [ ] **Step 11.2: Launch on Pixel 8 Emulator (API 34)**
  1. Open Device Manager in Android Studio, create/start a **Pixel 8 (API 34 with Google Play Services)** emulator.
  2. Click **Run 'app'** (`Shift + F10`).
  3. Verify the app launches with the **CivicFix Landing Dashboard** displaying live KPI counts and the Independent Civic Notice Banner.

- [ ] **Step 11.3: End-to-End Verification Scenario**
  1. **Map Exploration:** Open Map tab, verify OpenStreetMap tiles load, zoom and pan, verify markers load for current bounding box.
  2. **Duplicate Check Testing:** Tap "Report an Issue", select "Potholes", type *"Huge pothole on road"*, verify amber duplicate warning appears if a similar report exists.
  3. **Photo Capture:** Tap Camera, take photo in emulator, verify thumbnail renders and EXIF data is sanitized.
  4. **Submission:** Accept disclaimer, submit report, verify server assigns reference code (e.g. `CVX-2026-XXXX`).
  5. **Offline Queue Test:** Turn on Airplane Mode in emulator settings, submit another report, verify *"Offline Draft Saved"* snackbar, turn Airplane Mode off, verify WorkManager automatically drains queue and posts report to server.
  6. **Tracker Verification:** Open Track tab, paste assigned reference code, verify full audit trail renders.
