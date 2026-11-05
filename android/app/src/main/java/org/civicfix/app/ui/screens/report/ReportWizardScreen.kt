package org.civicfix.app.ui.screens.report

import android.net.Uri
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.Image
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CameraAlt
import androidx.compose.material.icons.filled.Image
import androidx.compose.material.icons.filled.Warning
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil.compose.rememberAsyncImagePainter
import org.civicfix.app.data.api.models.CategoryDto
import org.civicfix.app.data.api.models.DuplicateCandidate
import org.civicfix.app.media.CameraXPreview
import org.civicfix.app.media.ExifStripper
import org.civicfix.app.ui.components.CivicMapView
import org.osmdroid.util.GeoPoint
import java.io.File

@Composable
fun ReportWizardScreen(
    categories: List<CategoryDto>,
    duplicateCandidate: DuplicateCandidate?,
    isSubmitting: Boolean,
    onCheckDuplicates: (categoryId: String, lat: Double, lng: Double, title: String, description: String) -> Unit,
    onSubmitReport: (
        title: String,
        description: String,
        categoryId: String,
        lat: Double,
        lng: Double,
        approxAddress: String?,
        isFuzzed: Boolean,
        photoFile: File?,
        photoBase64: String?
    ) -> Unit,
    onUpvoteCandidate: (String) -> Unit
) {
    val context = LocalContext.current
    var title by remember { mutableStateOf("") }
    var description by remember { mutableStateOf("") }
    var selectedCategory by remember { mutableStateOf<CategoryDto?>(null) }
    var latitude by remember { mutableDoubleStateOf(37.7749) }
    var longitude by remember { mutableDoubleStateOf(-122.4194) }
    var photoFile by remember { mutableStateOf<File?>(null) }
    var photoBase64 by remember { mutableStateOf<String?>(null) }
    var disclaimerAccepted by remember { mutableStateOf(false) }
    var showCameraX by remember { mutableStateOf(false) }

    val galleryLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.GetContent()
    ) { uri: Uri? ->
        uri?.let {
            val sanitized = ExifStripper.sanitizeAndCompress(context, it)
            photoFile = sanitized
            photoBase64 = ExifStripper.fileToBase64(sanitized)
        }
    }

    // Trigger duplicate check debounced
    LaunchedEffect(title, description, selectedCategory) {
        val cat = selectedCategory
        if (cat != null && title.trim().length >= 5 && description.trim().length >= 10) {
            onCheckDuplicates(cat.id, latitude, longitude, title.trim(), description.trim())
        }
    }

    if (showCameraX) {
        CameraXPreview(
            onPhotoCaptured = { file ->
                photoFile = file
                photoBase64 = ExifStripper.fileToBase64(file)
                showCameraX = false
            },
            onError = { showCameraX = false },
            modifier = Modifier.fillMaxSize()
        )
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
            text = "Report a Civic Issue",
            style = MaterialTheme.typography.headlineSmall,
            fontWeight = FontWeight.Bold
        )

        // 1. Category Picker
        Text(text = "1. Select Category *", fontWeight = FontWeight.SemiBold)
        LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            items(categories) { cat ->
                FilterChip(
                    selected = selectedCategory?.id == cat.id,
                    onClick = { selectedCategory = cat },
                    label = { Text(cat.name) }
                )
            }
        }

        // 2. Title & Description
        OutlinedTextField(
            value = title,
            onValueChange = { title = it },
            label = { Text("Title (min 5 chars) *") },
            modifier = Modifier.fillMaxWidth(),
            singleLine = true
        )

        OutlinedTextField(
            value = description,
            onValueChange = { description = it },
            label = { Text("Description (min 10 chars) *") },
            modifier = Modifier.fillMaxWidth(),
            minLines = 3
        )

        // 3. Duplicate Warning Alert
        duplicateCandidate?.let { candidate ->
            Card(
                colors = CardDefaults.cardColors(containerColor = Color(0xFFFFF3CD)),
                modifier = Modifier.fillMaxWidth()
            ) {
                Column(modifier = Modifier.padding(12.dp)) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(Icons.Default.Warning, contentDescription = null, tint = Color(0xFF856404))
                        Spacer(Modifier.width(8.dp))
                        Text(
                            text = "Similar Existing Report Found!",
                            fontWeight = FontWeight.Bold,
                            color = Color(0xFF856404)
                        )
                    }
                    Text(
                        text = "${candidate.reference_code}: ${candidate.title} (${candidate.status})",
                        fontSize = 13.sp,
                        color = Color(0xFF856404)
                    )
                    Spacer(Modifier.height(8.dp))
                    OutlinedButton(
                        onClick = { onUpvoteCandidate(candidate.reference_code) },
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Text("Upvote Existing Report Instead")
                    }
                }
            }
        }

        // 4. Map Location Picker
        Text(text = "2. Set Defect Location *", fontWeight = FontWeight.SemiBold)
        Text(
            text = "Lat: %.5f, Lng: %.5f".format(latitude, longitude),
            fontSize = 12.sp,
            color = Color.Gray
        )
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .height(180.dp)
                .border(1.dp, Color.LightGray)
        ) {
            CivicMapView(
                modifier = Modifier.fillMaxSize(),
                isPickerMode = true,
                pickerLocation = GeoPoint(latitude, longitude),
                centerGeoPoint = GeoPoint(latitude, longitude),
                onLocationPicked = { lat, lng ->
                    latitude = lat
                    longitude = lng
                }
            )
        }

        // 5. Photo Capture
        Text(text = "3. Evidence Photo (Optional)", fontWeight = FontWeight.SemiBold)
        Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
            Button(onClick = { showCameraX = true }) {
                Icon(Icons.Default.CameraAlt, contentDescription = null)
                Spacer(Modifier.width(4.dp))
                Text("Camera")
            }
            OutlinedButton(onClick = { galleryLauncher.launch("image/*") }) {
                Icon(Icons.Default.Image, contentDescription = null)
                Spacer(Modifier.width(4.dp))
                Text("Gallery")
            }
        }

        photoFile?.let { file ->
            Image(
                painter = rememberAsyncImagePainter(file),
                contentDescription = "Selected Photo",
                modifier = Modifier
                    .fillMaxWidth()
                    .height(140.dp)
            )
        }

        // 6. Mandatory Non-Affiliation Disclaimer
        Card(
            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant),
            modifier = Modifier.fillMaxWidth()
        ) {
            Row(
                modifier = Modifier.padding(8.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Checkbox(
                    checked = disclaimerAccepted,
                    onCheckedChange = { disclaimerAccepted = it }
                )
                Text(
                    text = "I understand CivicFix is an independent public tracking registry and does not guarantee municipal work orders.",
                    fontSize = 12.sp,
                    fontWeight = FontWeight.Medium
                )
            }
        }

        // Submit Button
        val isValid = selectedCategory != null &&
                title.trim().length >= 5 &&
                description.trim().length >= 10 &&
                disclaimerAccepted

        Button(
            onClick = {
                val cat = selectedCategory ?: return@Button
                onSubmitReport(
                    title.trim(),
                    description.trim(),
                    cat.id,
                    latitude,
                    longitude,
                    null,
                    false,
                    photoFile,
                    photoBase64
                )
            },
            enabled = isValid && !isSubmitting,
            modifier = Modifier.fillMaxWidth()
        ) {
            if (isSubmitting) {
                CircularProgressIndicator(modifier = Modifier.size(20.dp), color = Color.White)
            } else {
                Text("Submit Civic Report")
            }
        }
    }
}
