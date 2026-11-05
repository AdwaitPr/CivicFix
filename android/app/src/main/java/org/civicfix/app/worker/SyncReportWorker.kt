package org.civicfix.app.worker

import android.content.Context
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.util.Base64
import androidx.work.CoroutineWorker
import androidx.work.WorkerParameters
import org.civicfix.app.data.api.ApiClient
import org.civicfix.app.data.api.models.CreateReportRequest
import org.civicfix.app.data.local.CivicFixDatabase
import java.io.ByteArrayOutputStream
import java.io.File

class SyncReportWorker(
    context: Context,
    params: WorkerParameters
) : CoroutineWorker(context, params) {

    override suspend fun doWork(): Result {
        val database = CivicFixDatabase.getDatabase(applicationContext)
        val dao = database.draftReportDao()
        val pendingDrafts = dao.getPendingDrafts()

        if (pendingDrafts.isEmpty()) {
            return Result.success()
        }

        var anyFailed = false

        for (draft in pendingDrafts) {
            try {
                dao.updateDraft(draft.copy(syncStatus = "SYNCING"))

                var photoBase64: String? = null
                draft.photoFilePath?.let { path ->
                    val file = File(path)
                    if (file.exists()) {
                        val bitmap = BitmapFactory.decodeFile(file.absolutePath)
                        if (bitmap != null) {
                            val baos = ByteArrayOutputStream()
                            bitmap.compress(Bitmap.CompressFormat.JPEG, 80, baos)
                            val bytes = baos.toByteArray()
                            photoBase64 = "data:image/jpeg;base64," + Base64.encodeToString(bytes, Base64.NO_WRAP)
                        }
                    }
                }

                val request = CreateReportRequest(
                    title = draft.title,
                    description = draft.description,
                    categoryId = draft.categoryId,
                    latitude = draft.latitude,
                    longitude = draft.longitude,
                    approximateAddress = draft.approximateAddress,
                    isLocationFuzzed = draft.isLocationFuzzed,
                    acceptedNonAffiliationDisclaimer = true,
                    photoBase64 = photoBase64
                )

                val response = ApiClient.getApiService().createReport(request)
                if (response.isSuccessful && response.body()?.success == true) {
                    val refCode = response.body()?.reference_code ?: response.body()?.report?.reference_code
                    dao.updateDraft(
                        draft.copy(
                            syncStatus = "SYNCED",
                            remoteReferenceCode = refCode
                        )
                    )
                } else {
                    dao.updateDraft(draft.copy(syncStatus = "FAILED"))
                    anyFailed = true
                }
            } catch (e: Exception) {
                dao.updateDraft(draft.copy(syncStatus = "FAILED"))
                anyFailed = true
            }
        }

        return if (anyFailed) Result.retry() else Result.success()
    }
}
