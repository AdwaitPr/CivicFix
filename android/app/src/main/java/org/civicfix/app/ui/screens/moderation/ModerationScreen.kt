package org.civicfix.app.ui.screens.moderation

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import org.civicfix.app.data.api.models.FlagReportDto

@Composable
fun ModerationScreen(
    flags: List<FlagReportDto>,
    isLoading: Boolean,
    onModerationAction: (flagId: String, action: String) -> Unit
) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        Text(
            text = "Moderation Queue",
            style = MaterialTheme.typography.headlineSmall,
            fontWeight = FontWeight.Bold
        )

        if (isLoading) {
            CircularProgressIndicator()
        } else if (flags.isEmpty()) {
            Text("No active flags needing moderation.")
        } else {
            LazyColumn(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                items(flags) { flag ->
                    Card(
                        modifier = Modifier.fillMaxWidth(),
                        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant)
                    ) {
                        Column(modifier = Modifier.padding(12.dp)) {
                            Text(text = "Reason: ${flag.reason}", fontWeight = FontWeight.Bold)
                            flag.details?.let { Text(text = "Details: $it", fontSize = 12.sp) }
                            Spacer(Modifier.height(8.dp))
                            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                Button(onClick = { flag.id?.let { onModerationAction(it, "dismiss") } }) {
                                    Text("Dismiss Flag")
                                }
                                OutlinedButton(onClick = { flag.id?.let { onModerationAction(it, "hide_report") } }) {
                                    Text("Hide Report")
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}
