package org.civicfix.app.ui.screens.detail

import androidx.compose.foundation.Image
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ThumbUp
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil.compose.rememberAsyncImagePainter
import org.civicfix.app.data.api.models.ReportDetailDto
import org.civicfix.app.domain.ReportStatusFsm
import org.civicfix.app.ui.components.CivicMapView
import org.civicfix.app.ui.components.NoticeBanner
import org.civicfix.app.ui.screens.home.parseColor
import org.osmdroid.util.GeoPoint

@Composable
fun DetailScreen(
    report: ReportDetailDto?,
    isLoading: Boolean,
    onUpvote: () -> Unit
) {
    if (isLoading) {
        Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
            CircularProgressIndicator()
        }
        return
    }

    if (report == null) {
        Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
            Text("Report not found.")
        }
        return
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        NoticeBanner()

        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Column {
                Text(
                    text = report.reference_code,
                    style = MaterialTheme.typography.titleLarge,
                    fontWeight = FontWeight.Bold,
                    color = MaterialTheme.colorScheme.primary
                )
                Text(text = "Submitted: ${report.created_at}", fontSize = 12.sp, color = Color.Gray)
            }
            Surface(
                color = parseColor(ReportStatusFsm.getStatusColorHex(report.status)),
                shape = MaterialTheme.shapes.small
            ) {
                Text(
                    text = report.status,
                    color = Color.White,
                    fontSize = 13.sp,
                    fontWeight = FontWeight.Bold,
                    modifier = Modifier.padding(horizontal = 12.dp, vertical = 6.dp)
                )
            }
        }

        Text(
            text = report.title,
            style = MaterialTheme.typography.headlineSmall,
            fontWeight = FontWeight.Bold
        )

        Text(text = report.description, style = MaterialTheme.typography.bodyLarge)

        // Photo evidence
        report.photo_url?.let { photoUrl ->
            Image(
                painter = rememberAsyncImagePainter(photoUrl),
                contentDescription = "Report Photo",
                modifier = Modifier
                    .fillMaxWidth()
                    .height(200.dp)
            )
        }

        // Map Snippet
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .height(160.dp)
        ) {
            CivicMapView(
                modifier = Modifier.fillMaxSize(),
                centerGeoPoint = GeoPoint(report.latitude, report.longitude),
                zoomLevel = 15.0
            )
        }

        // Upvote
        Row(verticalAlignment = Alignment.CenterVertically) {
            Button(onClick = onUpvote) {
                Icon(Icons.Default.ThumbUp, contentDescription = null)
                Spacer(Modifier.width(8.dp))
                Text("Upvote (${report.upvote_count})")
            }
        }

        // Official Remediation Transparency Notice
        Card(colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant)) {
            Column(modifier = Modifier.padding(12.dp)) {
                Text(
                    text = "Official Remediation Transparency Notice",
                    fontWeight = FontWeight.Bold,
                    fontSize = 13.sp
                )
                Text(
                    text = "Status updates are independently logged by public observers and verified administrators. This jurisdiction is community-monitored.",
                    fontSize = 11.sp,
                    color = Color.DarkGray
                )
            }
        }

        // Chronological Audit Trail Timeline
        Text(
            text = "Immutable Audit Trail",
            style = MaterialTheme.typography.titleMedium,
            fontWeight = FontWeight.Bold
        )

        if (report.status_history.isEmpty()) {
            Text(text = "No status changes recorded yet.", fontSize = 13.sp, color = Color.Gray)
        } else {
            report.status_history.forEach { history ->
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    colors = CardDefaults.cardColors(containerColor = Color(0xFFF5F5F5))
                ) {
                    Column(modifier = Modifier.padding(12.dp)) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween
                        ) {
                            Text(
                                text = "Status: ${history.new_status}",
                                fontWeight = FontWeight.Bold,
                                fontSize = 13.sp
                            )
                            Text(text = history.created_at, fontSize = 11.sp, color = Color.Gray)
                        }
                        history.changed_by?.let {
                            Text(text = "Actor: $it", fontSize = 11.sp, color = Color.DarkGray)
                        }
                        Text(
                            text = "Rationale: ${history.public_rationale}",
                            fontSize = 12.sp,
                            modifier = Modifier.padding(top = 4.dp)
                        )
                    }
                }
            }
        }
    }
}
