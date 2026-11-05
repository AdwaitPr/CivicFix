package org.civicfix.app.ui.screens.settings

import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import org.civicfix.app.data.api.ApiClient

@Composable
fun SettingsScreen() {
    var baseUrl by remember { mutableStateOf(ApiClient.currentBaseUrl) }
    var selectedRole by remember { mutableStateOf(ApiClient.currentRole) }
    var statusMessage by remember { mutableStateOf<String?>(null) }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        Text(
            text = "Developer & System Settings",
            style = MaterialTheme.typography.headlineSmall,
            fontWeight = FontWeight.Bold
        )

        Text(text = "1. Server Base URL", fontWeight = FontWeight.SemiBold)
        OutlinedTextField(
            value = baseUrl,
            onValueChange = { baseUrl = it },
            label = { Text("Base URL") },
            modifier = Modifier.fillMaxWidth()
        )
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            OutlinedButton(onClick = { baseUrl = "http://10.0.2.2:3000/" }) {
                Text("Emulator (10.0.2.2:3000)")
            }
            Button(onClick = {
                ApiClient.updateBaseUrl(baseUrl)
                statusMessage = "Base URL updated!"
            }) {
                Text("Save Base URL")
            }
        }

        HorizontalDivider()

        Text(text = "2. Simulated User Role", fontWeight = FontWeight.SemiBold)
        listOf("citizen", "admin", "moderator", "community_org").forEach { role ->
            Row(verticalAlignment = Alignment.CenterVertically) {
                RadioButton(
                    selected = selectedRole == role,
                    onClick = {
                        selectedRole = role
                        ApiClient.currentRole = role
                        statusMessage = "Role set to $role"
                    }
                )
                Text(text = role)
            }
        }

        statusMessage?.let {
            Text(text = it, color = MaterialTheme.colorScheme.primary)
        }
    }
}
