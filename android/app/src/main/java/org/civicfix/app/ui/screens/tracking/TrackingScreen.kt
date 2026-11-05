package org.civicfix.app.ui.screens.tracking

import androidx.compose.foundation.layout.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Search
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import org.civicfix.app.data.api.models.ReportDetailDto
import org.civicfix.app.ui.screens.detail.DetailScreen

@Composable
fun TrackingScreen(
    initialRef: String = "",
    reportDetail: ReportDetailDto?,
    isLoading: Boolean,
    errorMessage: String?,
    onSearchRef: (String) -> Unit
) {
    var query by remember { mutableStateOf(initialRef) }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        Text(
            text = "Track Public Civic Issue",
            style = MaterialTheme.typography.headlineSmall
        )

        OutlinedTextField(
            value = query,
            onValueChange = { query = it },
            label = { Text("Reference Code (e.g. CVX-2026-0001)") },
            modifier = Modifier.fillMaxWidth(),
            trailingIcon = {
                IconButton(onClick = {
                    if (query.isNotBlank()) onSearchRef(query.trim())
                }) {
                    Icon(Icons.Default.Search, contentDescription = "Search")
                }
            },
            singleLine = true
        )

        errorMessage?.let {
            Text(text = it, color = MaterialTheme.colorScheme.error)
        }

        if (reportDetail != null) {
            DetailScreen(
                report = reportDetail,
                isLoading = isLoading,
                onUpvote = {}
            )
        }
    }
}
