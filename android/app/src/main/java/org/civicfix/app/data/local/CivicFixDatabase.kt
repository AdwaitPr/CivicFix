package org.civicfix.app.data.local

import android.content.Context
import androidx.room.Database
import androidx.room.Room
import androidx.room.RoomDatabase

@Database(
    entities = [DraftReportEntity::class, CategoryEntity::class],
    version = 1,
    exportSchema = false
)
abstract class CivicFixDatabase : RoomDatabase() {
    abstract fun draftReportDao(): DraftReportDao
    abstract fun categoryDao(): CategoryDao

    companion object {
        @Volatile
        private var INSTANCE: CivicFixDatabase? = null

        fun getDatabase(context: Context): CivicFixDatabase {
            return INSTANCE ?: synchronized(this) {
                val instance = Room.databaseBuilder(
                    context.applicationContext,
                    CivicFixDatabase::class.java,
                    "civicfix_database"
                ).fallbackToDestructiveMigration().build()
                INSTANCE = instance
                instance
            }
        }
    }
}
