# CivicFix — Android Studio Agent Execution Plan

> **Note for Developers & AI Agents:** The full implementation plan is located at [`docs/superpowers/plans/2026-11-05-android-studio-agent-plan.md`](docs/superpowers/plans/2026-11-05-android-studio-agent-plan.md). Below is the executive roadmap and instructions for cloning and executing this plan inside Android Studio.

---

## 1. Quick Start in Android Studio

1. **Clone this repository:**
   ```bash
   git clone https://github.com/AdwaitPr/CivicFix.git
   cd CivicFix
   ```
2. **Open the `android/` directory in Android Studio:**
   - Launch **Android Studio**.
   - Click **Open** (or File $\to$ Open) and select the `android/` directory inside this repository.
   - Android Studio will recognize the Gradle project and initialize Gradle Sync.

3. **Backend Connectivity:**
   - **Local Development via Emulator:** Point the Android app to `http://10.0.2.2:3000/` while running `npm run dev` in the root repository. `10.0.2.2` is the special Android Emulator IP mapping to the host machine's `localhost`.
   - **Production Deployed Web App:** Point the Android app to your live Vercel URL (e.g. `https://<your-project>.vercel.app/`).

---

## 2. Architecture & Modules

The Android application converts the 10 functional views of CivicFix into modern Jetpack Compose screens, backed by Clean Architecture:

```
android/app/src/main/java/org/civicfix/app/
├── CivicFixApplication.kt       # Application class & dependency initialization
├── data/
│   ├── api/                     # Retrofit 2 REST client & JSON DTOs
│   │   ├── CivicFixApiService.kt
│   │   └── models/
│   ├── local/                   # Room SQLite database for offline report drafts
│   │   ├── CivicFixDatabase.kt
│   │   ├── DraftReportDao.kt
│   │   └── DraftReportEntity.kt
│   └── repository/              # CivicFixRepository (combines Room & Retrofit)
├── domain/                      # 8-state FSM validation & domain models
├── worker/                      # WorkManager SyncReportWorker (auto-syncs offline drafts)
├── media/                       # CameraX photo capture & EXIF privacy stripper
└── ui/                          # Jetpack Compose UI (Material 3)
    ├── navigation/              # AppNavHost (Home, Map, Report, Track, Admin, Analytics)
    ├── components/              # NoticeBanner, CivicMapView, MarkerPins
    └── screens/
        ├── home/                # Landing dashboard & KPI cards
        ├── map/                 # Interactive OpenStreetMap / MapLibre explorer
        ├── report/              # Issue reporting wizard with live duplicate check
        ├── detail/              # Report detail & immutable audit trail timeline
        ├── tracking/            # Public reference code tracker
        ├── myreports/           # User reports & offline draft queue
        ├── analytics/           # Accountability analytics & category breakdown
        ├── admin/               # Administrative triage & 8-state status updates
        └── settings/            # Server URL config & role simulation
```

---

## 3. Step-by-Step Execution Guide for Agents

Open [`docs/superpowers/plans/2026-11-05-android-studio-agent-plan.md`](docs/superpowers/plans/2026-11-05-android-studio-agent-plan.md) and execute Tasks 1 through 11 in order:

- **Task 1:** Scaffolding & Gradle dependencies (`settings.gradle.kts`, `build.gradle.kts`, permissions, network security config).
- **Task 2:** Retrofit API interface & JSON models for `/api/categories`, `/api/reports`, `/api/reports/duplicate-check`, `/api/analytics`.
- **Task 3:** Room database & `SyncReportWorker` for field offline report staging.
- **Task 4:** CameraX & WebP EXIF metadata stripper.
- **Task 5:** Geospatial OsmDroid / MapLibre map component with bounding-box sync.
- **Task 6:** Issue reporting wizard with real-time duplicate check alert.
- **Task 7:** Home dashboard with KPI summary cards.
- **Task 8:** Detail, Tracking, and My Reports screens.
- **Task 9:** Admin triage & Moderation screens.
- **Task 10:** Unit & MockWebServer test suite.
- **Task 11:** Launch and verify on Pixel 8 (API 34) Emulator.
