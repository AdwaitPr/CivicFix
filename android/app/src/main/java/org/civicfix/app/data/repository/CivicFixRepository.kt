package org.civicfix.app.data.repository

import android.content.Context
import androidx.work.*
import kotlinx.coroutines.flow.Flow
import org.civicfix.app.data.api.ApiClient
import org.civicfix.app.data.api.CivicFixApiService
import org.civicfix.app.data.api.models.*
import org.civicfix.app.data.local.*
import org.civicfix.app.worker.SyncReportWorker
import java.io.File

class CivicFixRepository(private val context: Context) {
    private val database = CivicFixDatabase.getDatabase(context)
    private val draftDao = database.draftReportDao()
    private val categoryDao = database.categoryDao()
    private val apiService: CivicFixApiService
        get() = ApiClient.getApiService()

    val allDrafts: Flow<List<DraftReportEntity>> = draftDao.getAllDraftsFlow()
    val localCategories: Flow<List<CategoryEntity>> = categoryDao.getAllCategoriesFlow()

    suspend fun refreshCategories(): Result<List<CategoryDto>> {
        return try {
            val response = apiService.getCategories()
            if (response.isSuccessful && response.body() != null) {
                val cats = response.body()!!.categories
                val entities = cats.map {
                    CategoryEntity(
                        id = it.id,
                        slug = it.slug,
                        name = it.name,
                        description = it.description,
                        iconName = it.icon_name,
                        colorHex = it.color_hex,
                        duplicateRadiusMeters = it.duplicate_radius_meters,
                        duplicateWindowHours = it.duplicate_window_hours,
                        isSensitiveLocation = it.is_sensitive_location ?: false
                    )
                }
                categoryDao.insertCategories(entities)
                Result.success(cats)
            } else {
                Result.failure(Exception("Failed to fetch categories: ${response.code()}"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun getReports(
        west: Double? = null,
        south: Double? = null,
        east: Double? = null,
        north: Double? = null,
        category: String? = null,
        status: String? = null
    ): Result<List<ReportDto>> {
        return try {
            val response = apiService.getReports(west, south, east, north, category, status)
            if (response.isSuccessful && response.body() != null) {
                Result.success(response.body()!!.reports)
            } else {
                Result.failure(Exception("Error fetching reports: ${response.code()}"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun checkDuplicates(
        categoryId: String,
        lat: Double,
        lng: Double,
        title: String,
        description: String
    ): Result<DuplicateCheckResponse> {
        return try {
            val req = DuplicateCheckRequest(categoryId, lat, lng, title, description)
            val response = apiService.checkDuplicates(req)
            if (response.isSuccessful && response.body() != null) {
                Result.success(response.body()!!)
            } else {
                Result.failure(Exception("Duplicate check failed: ${response.code()}"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun submitReportOrSaveDraft(
        title: String,
        description: String,
        categoryId: String,
        lat: Double,
        lng: Double,
        approximateAddress: String?,
        isLocationFuzzed: Boolean,
        photoFile: File?,
        photoBase64: String?
    ): Result<CreateReportResponse> {
        return try {
            val request = CreateReportRequest(
                title = title,
                description = description,
                categoryId = categoryId,
                latitude = lat,
                longitude = lng,
                approximateAddress = approximateAddress,
                isLocationFuzzed = isLocationFuzzed,
                acceptedNonAffiliationDisclaimer = true,
                photoBase64 = photoBase64
            )

            val response = apiService.createReport(request)
            if (response.isSuccessful && response.body() != null) {
                Result.success(response.body()!!)
            } else {
                saveDraftAndEnqueueWorker(
                    title, description, categoryId, lat, lng, approximateAddress, isLocationFuzzed, photoFile
                )
                Result.failure(Exception("Server returned ${response.code()}, saved draft offline."))
            }
        } catch (e: Exception) {
            saveDraftAndEnqueueWorker(
                title, description, categoryId, lat, lng, approximateAddress, isLocationFuzzed, photoFile
            )
            Result.failure(e)
        }
    }

    private suspend fun saveDraftAndEnqueueWorker(
        title: String,
        description: String,
        categoryId: String,
        lat: Double,
        lng: Double,
        approximateAddress: String?,
        isLocationFuzzed: Boolean,
        photoFile: File?
    ) {
        val draft = DraftReportEntity(
            title = title,
            description = description,
            categoryId = categoryId,
            latitude = lat,
            longitude = lng,
            approximateAddress = approximateAddress,
            isLocationFuzzed = isLocationFuzzed,
            photoFilePath = photoFile?.absolutePath,
            syncStatus = "PENDING_SYNC"
        )
        draftDao.insertDraft(draft)
        triggerSyncWorker()
    }

    fun triggerSyncWorker() {
        val constraints = Constraints.Builder()
            .setRequiredNetworkType(NetworkType.CONNECTED)
            .build()
        val syncRequest = OneTimeWorkRequestBuilder<SyncReportWorker>()
            .setConstraints(constraints)
            .build()
        WorkManager.getInstance(context).enqueueUniqueWork(
            "civicfix_sync_worker",
            ExistingWorkPolicy.REPLACE,
            syncRequest
        )
    }

    suspend fun getReportByRef(ref: String): Result<ReportDetailDto> {
        return try {
            val response = apiService.getReportByRef(ref)
            if (response.isSuccessful && response.body()?.report != null) {
                Result.success(response.body()!!.report!!)
            } else {
                Result.failure(Exception("Report not found"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun updateReportStatus(
        id: String,
        targetStatus: String,
        publicRationale: String,
        internalAdminNote: String? = null
    ): Result<UpdateStatusResponse> {
        return try {
            val req = UpdateStatusRequest(targetStatus, publicRationale, internalAdminNote)
            val response = apiService.updateReportStatus(id = id, request = req)
            if (response.isSuccessful && response.body() != null) {
                Result.success(response.body()!!)
            } else {
                Result.failure(Exception("Status update failed: ${response.code()}"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun getAnalytics(): Result<AnalyticsResponse> {
        return try {
            val response = apiService.getAnalytics()
            if (response.isSuccessful && response.body() != null) {
                Result.success(response.body()!!)
            } else {
                Result.failure(Exception("Failed to fetch analytics"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun getModerationFlags(): Result<List<FlagReportDto>> {
        return try {
            val response = apiService.getModerationFlags()
            if (response.isSuccessful && response.body() != null) {
                Result.success(response.body()!!.flags)
            } else {
                Result.failure(Exception("Failed to fetch moderation flags"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun flagReport(reportId: String, reason: String, details: String?): Result<Boolean> {
        return try {
            val response = apiService.flagReport(FlagReportRequest(reportId, reason, details))
            if (response.isSuccessful && response.body()?.success == true) {
                Result.success(true)
            } else {
                Result.failure(Exception("Failed to flag report"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun postModerationEvent(flagId: String, action: String, note: String?): Result<Boolean> {
        return try {
            val response = apiService.postModerationEvent(request = ModerationEventRequest(flagId, action, note))
            if (response.isSuccessful && response.body()?.success == true) {
                Result.success(true)
            } else {
                Result.failure(Exception("Failed to process moderation event"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
}
