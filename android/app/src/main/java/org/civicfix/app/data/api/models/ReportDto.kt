package org.civicfix.app.data.api.models

data class ReportDto(
    val id: String,
    val reference_code: String,
    val title: String,
    val description: String,
    val category_id: String,
    val category_name: String? = null,
    val category_color: String? = null,
    val status: String,
    val latitude: Double,
    val longitude: Double,
    val approximate_address: String? = null,
    val is_location_fuzzed: Boolean? = false,
    val photo_url: String? = null,
    val upvote_count: Int = 0,
    val created_at: String
)

data class ReportsListResponse(
    val reports: List<ReportDto> = emptyList(),
    val count: Int? = null,
    val success: Boolean = true
)
