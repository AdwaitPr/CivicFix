package org.civicfix.app.data.api

import org.civicfix.app.data.api.models.*
import retrofit2.Response
import retrofit2.http.*

interface CivicFixApiService {

    @GET("api/categories")
    suspend fun getCategories(): Response<CategoriesResponse>

    @GET("api/reports")
    suspend fun getReports(
        @Query("west") west: Double? = null,
        @Query("south") south: Double? = null,
        @Query("east") east: Double? = null,
        @Query("north") north: Double? = null,
        @Query("category") category: String? = null,
        @Query("status") status: String? = null,
        @Query("limit") limit: Int = 100
    ): Response<ReportsListResponse>

    @POST("api/reports")
    suspend fun createReport(@Body request: CreateReportRequest): Response<CreateReportResponse>

    @POST("api/reports/duplicate-check")
    suspend fun checkDuplicates(@Body request: DuplicateCheckRequest): Response<DuplicateCheckResponse>

    @GET("api/reports/{ref}")
    suspend fun getReportByRef(@Path("ref") ref: String): Response<ReportDetailResponse>

    @PATCH("api/admin/reports/{id}/status")
    suspend fun updateReportStatus(
        @Path("id") id: String,
        @Header("x-user-role") userRole: String = "admin",
        @Body request: UpdateStatusRequest
    ): Response<UpdateStatusResponse>

    @GET("api/moderation/flags")
    suspend fun getModerationFlags(
        @Header("x-user-role") userRole: String = "moderator"
    ): Response<ModerationFlagsResponse>

    @POST("api/moderation/flags")
    suspend fun flagReport(@Body request: FlagReportRequest): Response<FlagReportResponse>

    @POST("api/moderation/events")
    suspend fun postModerationEvent(
        @Header("x-user-role") userRole: String = "moderator",
        @Body request: ModerationEventRequest
    ): Response<ModerationEventResponse>

    @GET("api/analytics")
    suspend fun getAnalytics(): Response<AnalyticsResponse>
}
