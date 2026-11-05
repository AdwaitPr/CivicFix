package org.civicfix.app.ui.navigation

import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.List
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.navigation.NavGraph.Companion.findStartDestination
import androidx.navigation.compose.*
import org.civicfix.app.data.api.models.AnalyticsResponse
import org.civicfix.app.data.api.models.ReportDetailDto
import org.civicfix.app.data.api.models.ReportDto
import org.civicfix.app.data.repository.CivicFixRepository
import org.civicfix.app.ui.screens.admin.AdminScreen
import org.civicfix.app.ui.screens.analytics.AnalyticsScreen
import org.civicfix.app.ui.screens.detail.DetailScreen
import org.civicfix.app.ui.screens.home.HomeScreen
import org.civicfix.app.ui.screens.map.MapScreen
import org.civicfix.app.ui.screens.moderation.ModerationScreen
import org.civicfix.app.ui.screens.myreports.MyReportsScreen
import org.civicfix.app.ui.screens.report.ReportWizardScreen
import org.civicfix.app.ui.screens.settings.SettingsScreen
import org.civicfix.app.ui.screens.tracking.TrackingScreen
import kotlinx.coroutines.launch

sealed class Screen(val route: String, val title: String) {
    object Home : Screen("home", "Home")
    object Map : Screen("map", "Map")
    object Report : Screen("report", "Report")
    object MyReports : Screen("my_reports", "My Reports")
    object Analytics : Screen("analytics", "Analytics")
    object Admin : Screen("admin", "Admin")
    object Moderation : Screen("moderation", "Moderation")
    object Settings : Screen("settings", "Settings")
    object Track : Screen("track/{ref}", "Track")
    object Detail : Screen("detail/{ref}", "Detail")
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AppNavHost() {
    val navController = rememberNavController()
    val context = LocalContext.current
    val repository = remember { CivicFixRepository(context) }
    val scope = rememberCoroutineScope()

    var reports by remember { mutableStateOf<List<ReportDto>>(emptyList()) }
    var analytics by remember { mutableStateOf<AnalyticsResponse?>(null) }
    var isLoading by remember { mutableStateOf(false) }

    val categories by repository.localCategories.collectAsState(initial = emptyList())
    val drafts by repository.allDrafts.collectAsState(initial = emptyList())

    LaunchedEffect(Unit) {
        scope.launch { repository.refreshCategories() }
        scope.launch {
            isLoading = true
            repository.getReports().onSuccess { reports = it }
            repository.getAnalytics().onSuccess { analytics = it }
            isLoading = false
        }
    }

    Scaffold(
        bottomBar = {
            NavigationBar {
                val navBackStackEntry by navController.currentBackStackEntryAsState()
                val currentRoute = navBackStackEntry?.destination?.route

                val items = listOf(
                    Screen.Home to Icons.Default.Home,
                    Screen.Map to Icons.Default.Map,
                    Screen.Report to Icons.Default.AddCircle,
                    Screen.MyReports to Icons.AutoMirrored.Filled.List,
                    Screen.Admin to Icons.Default.AdminPanelSettings,
                    Screen.Settings to Icons.Default.Settings
                )

                items.forEach { (screen, icon) ->
                    NavigationBarItem(
                        icon = { Icon(icon, contentDescription = screen.title) },
                        label = { Text(screen.title) },
                        selected = currentRoute == screen.route,
                        onClick = {
                            navController.navigate(screen.route) {
                                popUpTo(navController.graph.findStartDestination().id) {
                                    saveState = true
                                }
                                launchSingleTop = true
                                restoreState = true
                            }
                        }
                    )
                }
            }
        }
    ) { innerPadding ->
        NavHost(
            navController = navController,
            startDestination = Screen.Home.route,
            modifier = Modifier.padding(innerPadding)
        ) {
            composable(Screen.Home.route) {
                HomeScreen(
                    analytics = analytics,
                    recentReports = reports,
                    isLoading = isLoading,
                    onNavigateToReport = { navController.navigate(Screen.Report.route) },
                    onNavigateToMap = { navController.navigate(Screen.Map.route) },
                    onNavigateToTrack = { ref -> navController.navigate("track/$ref") },
                    onNavigateToDetail = { ref -> navController.navigate("detail/$ref") }
                )
            }

            composable(Screen.Map.route) {
                MapScreen(
                    reports = reports,
                    onBoundsChanged = { w, s, e, n ->
                        scope.launch {
                            repository.getReports(west = w, south = s, east = e, north = n)
                                .onSuccess { reports = it }
                        }
                    },
                    onNavigateToDetail = { ref -> navController.navigate("detail/$ref") }
                )
            }

            composable(Screen.Report.route) {
                var duplicateCandidate by remember { mutableStateOf<org.civicfix.app.data.api.models.DuplicateCandidate?>(null) }
                var isSubmitting by remember { mutableStateOf(false) }

                ReportWizardScreen(
                    categories = categories.map {
                        org.civicfix.app.data.api.models.CategoryDto(
                            id = it.id, slug = it.slug, name = it.name
                        )
                    },
                    duplicateCandidate = duplicateCandidate,
                    isSubmitting = isSubmitting,
                    onCheckDuplicates = { catId, lat, lng, t, d ->
                        scope.launch {
                            repository.checkDuplicates(catId, lat, lng, t, d)
                                .onSuccess { duplicateCandidate = it.top_candidate }
                        }
                    },
                    onSubmitReport = { t, d, catId, lat, lng, addr, fuzzed, file, base64 ->
                        scope.launch {
                            isSubmitting = true
                            repository.submitReportOrSaveDraft(t, d, catId, lat, lng, addr, fuzzed, file, base64)
                            isSubmitting = false
                            navController.navigate(Screen.MyReports.route)
                        }
                    },
                    onUpvoteCandidate = { ref -> navController.navigate("detail/$ref") }
                )
            }

            composable(Screen.MyReports.route) {
                MyReportsScreen(
                    submittedReports = reports,
                    draftReports = drafts,
                    onManualSync = { repository.triggerSyncWorker() },
                    onNavigateToDetail = { ref -> navController.navigate("detail/$ref") }
                )
            }

            composable(Screen.Analytics.route) {
                AnalyticsScreen(analytics = analytics, isLoading = isLoading)
            }

            composable(Screen.Admin.route) {
                AdminScreen(
                    reports = reports,
                    onUpdateStatus = { id, target, rationale, note ->
                        scope.launch {
                            repository.updateReportStatus(id, target, rationale, note)
                            repository.getReports().onSuccess { reports = it }
                        }
                    }
                )
            }

            composable(Screen.Moderation.route) {
                var flags by remember { mutableStateOf<List<org.civicfix.app.data.api.models.FlagReportDto>>(emptyList()) }
                var modLoading by remember { mutableStateOf(false) }

                LaunchedEffect(Unit) {
                    modLoading = true
                    repository.getModerationFlags().onSuccess { flags = it }
                    modLoading = false
                }

                ModerationScreen(
                    flags = flags,
                    isLoading = modLoading,
                    onModerationAction = { flagId, action ->
                        scope.launch {
                            repository.postModerationEvent(flagId, action, null)
                            repository.getModerationFlags().onSuccess { flags = it }
                        }
                    }
                )
            }

            composable(Screen.Settings.route) {
                SettingsScreen()
            }

            composable("track/{ref}") { backStackEntry ->
                val ref = backStackEntry.arguments?.getString("ref") ?: ""
                var reportDetail by remember { mutableStateOf<ReportDetailDto?>(null) }
                var detailLoading by remember { mutableStateOf(false) }
                var errorMsg by remember { mutableStateOf<String?>(null) }

                LaunchedEffect(ref) {
                    if (ref.isNotBlank()) {
                        detailLoading = true
                        repository.getReportByRef(ref)
                            .onSuccess { reportDetail = it; errorMsg = null }
                            .onFailure { errorMsg = it.message }
                        detailLoading = false
                    }
                }

                TrackingScreen(
                    initialRef = ref,
                    reportDetail = reportDetail,
                    isLoading = detailLoading,
                    errorMessage = errorMsg,
                    onSearchRef = { newRef ->
                        scope.launch {
                            detailLoading = true
                            repository.getReportByRef(newRef)
                                .onSuccess { reportDetail = it; errorMsg = null }
                                .onFailure { errorMsg = it.message }
                            detailLoading = false
                        }
                    }
                )
            }

            composable("detail/{ref}") { backStackEntry ->
                val ref = backStackEntry.arguments?.getString("ref") ?: ""
                var reportDetail by remember { mutableStateOf<ReportDetailDto?>(null) }
                var detailLoading by remember { mutableStateOf(false) }

                LaunchedEffect(ref) {
                    detailLoading = true
                    repository.getReportByRef(ref).onSuccess { reportDetail = it }
                    detailLoading = false
                }

                DetailScreen(
                    report = reportDetail,
                    isLoading = detailLoading,
                    onUpvote = {}
                )
            }
        }
    }
}
