package org.civicfix.app.data.api.models

data class CreateReportRequest(
    val title: String,
    val description: String,
    val categoryId: String,
    val latitude: Double,
    val longitude: Double,
    val approximateAddress: String? = null,
    val isLocationFuzzed: Boolean = false,
    val acceptedNonAffiliationDisclaimer: Boolean = true,
    val photoBase64: String? = null
)

data class CreateReportResponse(
    val success: Boolean = true,
    val report: ReportDto? = null,
    val reference_code: String? = null,
    val message: String? = null
)
