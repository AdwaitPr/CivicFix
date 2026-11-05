package org.civicfix.app.domain

import org.junit.Assert.*
import org.junit.Test

class FsmTransitionTest {

    @Test
    fun testValidTransitions() {
        assertTrue(ReportStatusFsm.isValidTransition("Submitted", "Under review"))
        assertTrue(ReportStatusFsm.isValidTransition("Submitted", "Rejected"))
        assertTrue(ReportStatusFsm.isValidTransition("Under review", "Accepted"))
        assertTrue(ReportStatusFsm.isValidTransition("Under review", "Rejected"))
        assertTrue(ReportStatusFsm.isValidTransition("Accepted", "Assigned"))
        assertTrue(ReportStatusFsm.isValidTransition("Accepted", "In progress"))
        assertTrue(ReportStatusFsm.isValidTransition("Assigned", "In progress"))
        assertTrue(ReportStatusFsm.isValidTransition("In progress", "Resolved"))
        assertTrue(ReportStatusFsm.isValidTransition("Resolved", "Reopened"))
        assertTrue(ReportStatusFsm.isValidTransition("Rejected", "Reopened"))
    }

    @Test
    fun testInvalidTransitions() {
        assertFalse(ReportStatusFsm.isValidTransition("Submitted", "Resolved"))
        assertFalse(ReportStatusFsm.isValidTransition("Submitted", "In progress"))
        assertFalse(ReportStatusFsm.isValidTransition("Under review", "Resolved"))
        assertFalse(ReportStatusFsm.isValidTransition("Resolved", "Accepted"))
        assertFalse(ReportStatusFsm.isValidTransition("Resolved", "Assigned"))
    }

    @Test
    fun testRationaleValidation() {
        val validWithRationale = ReportStatusFsm.validateTransition(
            current = "Submitted",
            target = "Rejected",
            publicRationale = "Duplicate of existing report CVX-2026-0001"
        )
        assertTrue(validWithRationale.isSuccess)

        val invalidShortRationale = ReportStatusFsm.validateTransition(
            current = "Submitted",
            target = "Rejected",
            publicRationale = "No"
        )
        assertTrue(invalidShortRationale.isFailure)

        val illegalStateResult = ReportStatusFsm.validateTransition(
            current = "Submitted",
            target = "Resolved",
            publicRationale = "Fixed immediately"
        )
        assertTrue(illegalStateResult.isFailure)
    }
}
