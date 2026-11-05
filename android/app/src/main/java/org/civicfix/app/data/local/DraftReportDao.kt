package org.civicfix.app.data.local

import androidx.room.*
import kotlinx.coroutines.flow.Flow

@Dao
interface DraftReportDao {
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertDraft(draft: DraftReportEntity): Long

    @Update
    suspend fun updateDraft(draft: DraftReportEntity)

    @Delete
    suspend fun deleteDraft(draft: DraftReportEntity)

    @Query("SELECT * FROM draft_reports WHERE syncStatus = 'PENDING_SYNC' OR syncStatus = 'FAILED'")
    suspend fun getPendingDrafts(): List<DraftReportEntity>

    @Query("SELECT * FROM draft_reports ORDER BY createdAt DESC")
    fun getAllDraftsFlow(): Flow<List<DraftReportEntity>>

    @Query("SELECT * FROM draft_reports WHERE localId = :id")
    suspend fun getDraftById(id: Long): DraftReportEntity?
}
