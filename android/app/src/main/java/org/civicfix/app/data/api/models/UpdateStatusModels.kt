package org.civicfix.app.data.api.models

data class UpdateStatusRequest(
    val targetStatus: String,
    val publicRationale: String,
    val internalAdminNote: String? = null
)

data class UpdateStatusResponse(
    val success: Boolean = true,
    val report: ReportDto? = null,
    val message: String? = null
)
