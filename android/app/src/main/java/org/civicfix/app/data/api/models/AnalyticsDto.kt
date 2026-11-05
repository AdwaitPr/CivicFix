package org.civicfix.app.data.api.models

data class CategoryCountDto(
    val category_id: String,
    val category_name: String,
    val count: Int
)

data class StatusCountDto(
    val status: String,
    val count: Int
)

data class AnalyticsSummaryDto(
    val total_reports: Int = 0,
    val resolved_count: Int = 0,
    val pending_active_count: Int = 0,
    val closed_rejected_count: Int = 0,
    val by_category: List<CategoryCountDto> = emptyList(),
    val by_status: List<StatusCountDto> = emptyList()
)

data class AnalyticsResponse(
    val summary: AnalyticsSummaryDto? = null,
    val total_reports: Int = 0,
    val resolved_count: Int = 0,
    val pending_active_count: Int = 0,
    val closed_rejected_count: Int = 0,
    val by_category: List<CategoryCountDto> = emptyList(),
    val by_status: List<StatusCountDto> = emptyList(),
    val success: Boolean = true
)
