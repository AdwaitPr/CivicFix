package org.civicfix.app.ui.screens.admin

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
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
import org.civicfix.app.ui.screens.home.parseColor

@Composable
fun AdminScreen(
    reports: List<ReportDto>,
    onUpdateStatus: (id: String, targetStatus: String, rationale: String, note: String?) -> Unit
) {
    var selectedReport by remember { mutableStateOf<ReportDto?>(null) }
    var targetStatus by remember { mutableStateOf("") }
    var rationale by remember { mutableStateOf("") }
    var adminNote by remember { mutableStateOf("") }
    var errorMessage by remember { mutableStateOf<String?>(null) }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        Text(
            text = "Administrative Triage Desk",
            style = MaterialTheme.typography.headlineSmall,
            fontWeight = FontWeight.Bold
        )

        LazyColumn(verticalArrangement = Arrangement.spacedBy(8.dp)) {
            items(reports) { report ->
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant)
                ) {
                    Column(modifier = Modifier.padding(12.dp)) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween
                        ) {
                            Text(text = report.reference_code, fontWeight = FontWeight.Bold)
                            Surface(
                                color = parseColor(ReportStatusFsm.getStatusColorHex(report.status)),
                                shape = MaterialTheme.shapes.small
                            ) {
                                Text(
                                    text = report.status,
                                    color = Color.White,
                                    fontSize = 11.sp,
                                    modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                                )
                            }
                        }
                        Text(text = report.title, fontWeight = FontWeight.SemiBold)
                        Spacer(Modifier.height(8.dp))
                        Button(
                            onClick = {
                                selectedReport = report
                                val validNext = ReportStatusFsm.getValidNextStates(report.status)
                                targetStatus = validNext.firstOrNull() ?: ""
                                rationale = ""
                                adminNote = ""
                                errorMessage = null
                            }
                        ) {
                            Text("Update Status (FSM)")
                        }
                    }
                }
            }
        }
    }

    // FSM Update Status Dialog
    selectedReport?.let { report ->
        val validNextStates = ReportStatusFsm.getValidNextStates(report.status)

        AlertDialog(
            onDismissRequest = { selectedReport = null },
            title = { Text("Update Status for ${report.reference_code}") },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text("Current Status: ${report.status}", fontWeight = FontWeight.Bold)

                    if (validNextStates.isEmpty()) {
                        Text("No valid next status transitions available.")
                    } else {
                        Text("Select Target Status *:")
                        validNextStates.forEach { st ->
                            Row(
                                verticalAlignment = Alignment.CenterVertically,
                                modifier = Modifier.fillMaxWidth()
                            ) {
                                RadioButton(
                                    selected = targetStatus == st,
                                    onClick = { targetStatus = st }
                                )
                                Text(text = st)
                            }
                        }

                        OutlinedTextField(
                            value = rationale,
                            onValueChange = { rationale = it },
                            label = { Text("Public Rationale (min 5 chars) *") },
                            modifier = Modifier.fillMaxWidth()
                        )

                        OutlinedTextField(
                            value = adminNote,
                            onValueChange = { adminNote = it },
                            label = { Text("Internal Admin Note (Optional)") },
                            modifier = Modifier.fillMaxWidth()
                        )

                        errorMessage?.let {
                            Text(text = it, color = MaterialTheme.colorScheme.error, fontSize = 12.sp)
                        }
                    }
                }
            },
            confirmButton = {
                if (validNextStates.isNotEmpty()) {
                    Button(onClick = {
                        val validation = ReportStatusFsm.validateTransition(
                            current = report.status,
                            target = targetStatus,
                            publicRationale = rationale
                        )
                        if (validation.isSuccess) {
                            onUpdateStatus(report.id, targetStatus, rationale.trim(), adminNote.ifBlank { null })
                            selectedReport = null
                        } else {
                            errorMessage = validation.exceptionOrNull()?.message
                        }
                    }) {
                        Text("Confirm Transition")
                    }
                }
            },
            dismissButton = {
                TextButton(onClick = { selectedReport = null }) {
                    Text("Cancel")
                }
            }
        )
    }
}
