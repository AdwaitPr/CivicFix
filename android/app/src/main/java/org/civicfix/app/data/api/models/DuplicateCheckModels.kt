package org.civicfix.app.data.api.models

data class DuplicateCheckRequest(
    val categoryId: String,
    val latitude: Double,
    val longitude: Double,
    val title: String,
    val description: String
)

data class DuplicateCandidate(
    val id: String,
    val reference_code: String,
    val title: String,
    val status: String,
    val distance_meters: Double? = 0.0,
    val duplicate_score: Double? = 0.0
)

data class DuplicateCheckResponse(
    val has_likely_duplicate: Boolean = false,
    val candidate_count: Int = 0,
    val top_candidate: DuplicateCandidate? = null,
    val candidates: List<DuplicateCandidate> = emptyList()
)
