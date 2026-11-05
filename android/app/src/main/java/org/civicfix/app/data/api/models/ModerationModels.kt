package org.civicfix.app.data.api.models

data class FlagReportRequest(
    val reportId: String,
    val reason: String,
    val details: String? = null
)

data class FlagReportResponse(
    val success: Boolean = true,
    val message: String? = null
)

data class ModerationFlagsResponse(
    val flags: List<FlagReportDto> = emptyList(),
    val success: Boolean = true
)

data class ModerationEventRequest(
    val flagId: String,
    val action: String,
    val note: String? = null
)

data class ModerationEventResponse(
    val success: Boolean = true,
    val message: String? = null
)
