package org.civicfix.app.data.local

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "categories")
data class CategoryEntity(
    @PrimaryKey val id: String,
    val slug: String,
    val name: String,
    val description: String?,
    val iconName: String?,
    val colorHex: String?,
    val duplicateRadiusMeters: Double?,
    val duplicateWindowHours: Int?,
    val isSensitiveLocation: Boolean
)
