package org.civicfix.app.data.local

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "draft_reports")
data class DraftReportEntity(
    @PrimaryKey(autoGenerate = true) val localId: Long = 0,
    val title: String,
    val description: String,
    val categoryId: String,
    val latitude: Double,
    val longitude: Double,
    val approximateAddress: String? = null,
    val isLocationFuzzed: Boolean = false,
    val photoFilePath: String? = null,
    val syncStatus: String = "PENDING_SYNC", // PENDING_SYNC, SYNCING, SYNCED, FAILED
    val remoteReferenceCode: String? = null,
    val createdAt: Long = System.currentTimeMillis()
)
