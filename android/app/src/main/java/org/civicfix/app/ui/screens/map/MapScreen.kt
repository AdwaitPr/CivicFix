package org.civicfix.app.ui.screens.map

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import org.civicfix.app.data.api.models.ReportDto
import org.civicfix.app.domain.ReportStatusFsm
import org.civicfix.app.ui.components.CivicMapView
import org.civicfix.app.ui.screens.home.parseColor

@Composable
fun MapScreen(
    reports: List<ReportDto>,
    onBoundsChanged: (Double, Double, Double, Double) -> Unit,
    onNavigateToDetail: (String) -> Unit
) {
    var selectedReport by remember { mutableStateOf<ReportDto?>(null) }
    var selectedStatusFilter by remember { mutableStateOf<String?>(null) }

    val filteredReports = remember(reports, selectedStatusFilter) {
        if (selectedStatusFilter == null) reports
        else reports.filter { it.status.equals(selectedStatusFilter, ignoreCase = true) }
    }

    Box(modifier = Modifier.fillMaxSize()) {
        CivicMapView(
            modifier = Modifier.fillMaxSize(),
            reports = filteredReports,
            selectedReport = selectedReport,
            onBoundsChanged = onBoundsChanged,
            onReportSelected = { selectedReport = it }
        )

        // Top Filter Chips
        LazyRow(
            modifier = Modifier
                .align(Alignment.TopStart)
                .fillMaxWidth()
                .padding(12.dp),
            horizontalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            item {
                FilterChip(
                    selected = selectedStatusFilter == null,
                    onClick = { selectedStatusFilter = null },
                    label = { Text("All Statuses") }
                )
            }
            items(ReportStatusFsm.ALL_STATES) { status ->
                FilterChip(
                    selected = selectedStatusFilter == status,
                    onClick = { selectedStatusFilter = if (selectedStatusFilter == status) null else status },
                    label = { Text(status) }
                )
            }
        }

        // Selected Report Details Card at Bottom
        selectedReport?.let { report ->
            Card(
                modifier = Modifier
                    .align(Alignment.BottomCenter)
                    .fillMaxWidth()
                    .padding(16.dp),
                elevation = CardDefaults.cardElevation(defaultElevation = 8.dp)
            ) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(
                            text = report.reference_code,
                            fontWeight = FontWeight.Bold,
                            color = MaterialTheme.colorScheme.primary
                        )
                        Surface(
                            color = parseColor(ReportStatusFsm.getStatusColorHex(report.status)),
                            shape = MaterialTheme.shapes.small
                        ) {
                            Text(
                                text = report.status,
                                color = Color.White,
                                fontSize = 11.sp,
                                fontWeight = FontWeight.Bold,
                                modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)
                            )
                        }
                    }
                    Spacer(modifier = Modifier.height(4.dp))
                    Text(text = report.title, fontWeight = FontWeight.SemiBold, fontSize = 16.sp)
                    Text(text = report.description, fontSize = 13.sp, maxLines = 2, color = Color.Gray)
                    Spacer(modifier = Modifier.height(8.dp))
                    Button(
                        onClick = { onNavigateToDetail(report.reference_code) },
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Text("View Full Details & Audit Trail")
                    }
                }
            }
        }
    }
}
