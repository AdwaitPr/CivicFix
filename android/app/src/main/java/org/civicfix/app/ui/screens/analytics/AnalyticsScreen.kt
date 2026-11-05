package org.civicfix.app.ui.screens.analytics

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import org.civicfix.app.data.api.models.AnalyticsResponse
import org.civicfix.app.ui.screens.home.KpiCard

@Composable
fun AnalyticsScreen(analytics: AnalyticsResponse?, isLoading: Boolean) {
    if (isLoading) {
        Box(modifier = Modifier.fillMaxSize()) {
            CircularProgressIndicator()
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
        Text(
            text = "Platform Accountability Analytics",
            style = MaterialTheme.typography.headlineSmall,
            fontWeight = FontWeight.Bold
        )

        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            KpiCard(
                title = "Total Reports",
                count = analytics?.total_reports ?: analytics?.summary?.total_reports ?: 0,
                containerColor = Color(0xFFE3F2FD),
                contentColor = Color(0xFF1565C0),
                modifier = Modifier.weight(1f)
            )
            KpiCard(
                title = "Resolved",
                count = analytics?.resolved_count ?: analytics?.summary?.resolved_count ?: 0,
                containerColor = Color(0xE8E8F5E9),
                contentColor = Color(0xFF2E7D32),
                modifier = Modifier.weight(1f)
            )
        }

        Text(
            text = "Category Breakdown",
            style = MaterialTheme.typography.titleMedium,
            fontWeight = FontWeight.Bold
        )

        val categories = analytics?.by_category ?: analytics?.summary?.by_category ?: emptyList()
        if (categories.isEmpty()) {
            Text("No category analytics available.", color = Color.Gray)
        } else {
            categories.forEach { cat ->
                Column(modifier = Modifier.fillMaxWidth()) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Text(text = cat.category_name, fontSize = 13.sp)
                        Text(text = "${cat.count} reports", fontSize = 13.sp, fontWeight = FontWeight.Bold)
                    }
                    Spacer(Modifier.height(4.dp))
                    LinearProgressIndicator(
                        progress = {
                            val maxCount = categories.maxOfOrNull { it.count } ?: 1
                            cat.count.toFloat() / maxCount.coerceAtLeast(1)
                        },
                        modifier = Modifier.fillMaxWidth().height(8.dp)
                    )
                    Spacer(Modifier.height(12.dp))
                }
            }
        }
    }
}
