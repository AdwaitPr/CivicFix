package org.civicfix.app.domain

object ReportStatusFsm {

    const val SUBMITTED = "Submitted"
    const val UNDER_REVIEW = "Under review"
    const val ACCEPTED = "Accepted"
    const val ASSIGNED = "Assigned"
    const val IN_PROGRESS = "In progress"
    const val RESOLVED = "Resolved"
    const val REJECTED = "Rejected"
    const val REOPENED = "Reopened"

    val ALL_STATES = listOf(
        SUBMITTED,
        UNDER_REVIEW,
        ACCEPTED,
        ASSIGNED,
        IN_PROGRESS,
        RESOLVED,
        REJECTED,
        REOPENED
    )

    val VALID_TRANSITIONS: Map<String, List<String>> = mapOf(
        SUBMITTED to listOf(UNDER_REVIEW, REJECTED),
        UNDER_REVIEW to listOf(ACCEPTED, REJECTED),
        ACCEPTED to listOf(ASSIGNED, IN_PROGRESS, REJECTED),
        ASSIGNED to listOf(IN_PROGRESS, ACCEPTED, REJECTED),
        IN_PROGRESS to listOf(RESOLVED, ASSIGNED, ACCEPTED),
        RESOLVED to listOf(REOPENED),
        REJECTED to listOf(REOPENED, UNDER_REVIEW),
        REOPENED to listOf(UNDER_REVIEW, ACCEPTED, ASSIGNED, IN_PROGRESS, REJECTED)
    )

    fun isValidTransition(current: String, target: String): Boolean {
        val allowed = VALID_TRANSITIONS[current] ?: emptyList()
        return allowed.contains(target)
    }

    fun getValidNextStates(current: String): List<String> {
        return VALID_TRANSITIONS[current] ?: emptyList()
    }

    fun requiresRationale(target: String): Boolean {
        return target in listOf(REJECTED, RESOLVED, REOPENED, UNDER_REVIEW, ASSIGNED)
    }

    fun validateTransition(current: String, target: String, publicRationale: String?): Result<Unit> {
        if (!isValidTransition(current, target)) {
            return Result.failure(
                IllegalArgumentException("Illegal state transition from '$current' to '$target'")
            )
        }
        if (requiresRationale(target)) {
            val trimmed = publicRationale?.trim() ?: ""
            if (trimmed.length < 5) {
                return Result.failure(
                    IllegalArgumentException("Public rationale is required and must be at least 5 characters for state '$target'")
                )
            }
        }
        return Result.success(Unit)
    }

    fun getStatusColorHex(status: String): String {
        return when (status) {
            SUBMITTED -> "#174EA6"    // Blue
            UNDER_REVIEW -> "#F9AB00" // Amber
            ACCEPTED -> "#12B5CB"     // Cyan
            ASSIGNED -> "#9334E6"     // Purple
            IN_PROGRESS -> "#E37400"  // Deep Orange
            RESOLVED -> "#1E8E3E"     // Green
            REJECTED -> "#D93025"     // Red
            REOPENED -> "#A50E0E"     // Dark Red
            else -> "#5F6368"
        }
    }
}
