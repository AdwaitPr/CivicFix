package org.civicfix.app.data.api.models

data class StatusHistoryDto(
    val id: String? = null,
    val previous_status: String? = null,
    val new_status: String,
    val changed_by: String? = null,
    val public_rationale: String,
    val created_at: String
)

data class FlagReportDto(
    val id: String? = null,
    val report_id: String? = null,
    val reason: String,
    val details: String? = null,
    val status: String? = null,
    val created_at: String? = null
)

data class ReportDetailDto(
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
    val created_at: String,
    val status_history: List<StatusHistoryDto> = emptyList(),
    val flags: List<FlagReportDto> = emptyList()
)

data class ReportDetailResponse(
    val report: ReportDetailDto? = null,
    val success: Boolean = true
)
