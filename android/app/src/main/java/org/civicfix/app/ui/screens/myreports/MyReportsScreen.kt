package org.civicfix.app.ui.screens.myreports

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import org.civicfix.app.data.api.models.ReportDto
import org.civicfix.app.data.local.DraftReportEntity
import org.civicfix.app.ui.screens.home.ReportListItem

@Composable
fun MyReportsScreen(
    submittedReports: List<ReportDto>,
    draftReports: List<DraftReportEntity>,
    onManualSync: () -> Unit,
    onNavigateToDetail: (String) -> Unit
) {
    var selectedTab by remember { mutableIntStateOf(0) }

    Column(modifier = Modifier.fillMaxSize()) {
        TabRow(selectedTabIndex = selectedTab) {
            Tab(
                selected = selectedTab == 0,
                onClick = { selectedTab = 0 },
                text = { Text("Submitted (${submittedReports.size})") }
            )
            Tab(
                selected = selectedTab == 1,
                onClick = { selectedTab = 1 },
                text = { Text("Offline Drafts (${draftReports.size})") }
            )
        }

        if (selectedTab == 0) {
            LazyColumn(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(16.dp),
                verticalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                if (submittedReports.isEmpty()) {
                    item {
                        Text("No submitted reports found.", color = Color.Gray)
                    }
                } else {
                    items(submittedReports) { report ->
                        ReportListItem(
                            report = report,
                            onClick = { onNavigateToDetail(report.reference_code) }
                        )
                    }
                }
            }
        } else {
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(16.dp)
            ) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = "Offline Draft Queue",
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold
                    )
                    Button(onClick = onManualSync) {
                        Icon(Icons.Default.Refresh, contentDescription = null)
                        Spacer(Modifier.width(4.dp))
                        Text("Sync Now")
                    }
                }

                Spacer(Modifier.height(16.dp))

                LazyColumn(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    if (draftReports.isEmpty()) {
                        item {
                            Text("No offline drafts pending.", color = Color.Gray)
                        }
                    } else {
                        items(draftReports) { draft ->
                            Card(
                                modifier = Modifier.fillMaxWidth(),
                                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant)
                            ) {
                                Row(
                                    modifier = Modifier
                                        .padding(12.dp)
                                        .fillMaxWidth(),
                                    horizontalArrangement = Arrangement.SpaceBetween,
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Column(modifier = Modifier.weight(1f)) {
                                        Text(text = draft.title, fontWeight = FontWeight.Bold)
                                        Text(text = draft.description, fontSize = 12.sp, color = Color.Gray, maxLines = 1)
                                    }
                                    Surface(
                                        color = when (draft.syncStatus) {
                                            "SYNCED" -> Color(0xFF2E7D32)
                                            "SYNCING" -> Color(0xFFF57F17)
                                            "FAILED" -> Color(0xFFC62828)
                                            else -> Color.Gray
                                        },
                                        shape = MaterialTheme.shapes.small
                                    ) {
                                        Text(
                                            text = draft.syncStatus,
                                            color = Color.White,
                                            fontSize = 11.sp,
                                            modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                                        )
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}
