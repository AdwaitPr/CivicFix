package org.civicfix.app.data.api

import kotlinx.coroutines.runBlocking
import okhttp3.mockwebserver.MockResponse
import okhttp3.mockwebserver.MockWebServer
import org.civicfix.app.data.api.models.CreateReportRequest
import org.civicfix.app.data.api.models.DuplicateCheckRequest
import org.civicfix.app.data.api.models.UpdateStatusRequest
import org.junit.After
import org.junit.Assert.*
import org.junit.Before
import org.junit.Test
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory

class MockServerApiTest {

    private lateinit var mockWebServer: MockWebServer
    private lateinit var apiService: CivicFixApiService

    @Before
    fun setup() {
        mockWebServer = MockWebServer()
        mockWebServer.start()

        apiService = Retrofit.Builder()
            .baseUrl(mockWebServer.url("/"))
            .addConverterFactory(GsonConverterFactory.create())
            .build()
            .create(CivicFixApiService::class.java)
    }

    @After
    fun teardown() {
        mockWebServer.shutdown()
    }

    @Test
    fun testGetCategoriesSuccess() = runBlocking {
        val jsonResponse = """
            {
                "success": true,
                "categories": [
                    {
                        "id": "cat-pothole",
                        "slug": "potholes",
                        "name": "Potholes",
                        "color_hex": "#174EA6"
                    }
                ]
            }
        """.trimIndent()

        mockWebServer.enqueue(MockResponse().setResponseCode(200).setBody(jsonResponse))

        val response = apiService.getCategories()
        assertTrue(response.isSuccessful)
        val body = response.body()
        assertNotNull(body)
        assertEquals(1, body!!.categories.size)
        assertEquals("Potholes", body.categories[0].name)
    }

    @Test
    fun testDuplicateCheckSuccess() = runBlocking {
        val jsonResponse = """
            {
                "has_likely_duplicate": true,
                "candidate_count": 1,
                "top_candidate": {
                    "id": "rep-1",
                    "reference_code": "CVX-2026-0001",
                    "title": "Deep pothole on Main St",
                    "status": "Submitted",
                    "duplicate_score": 0.85
                }
            }
        """.trimIndent()

        mockWebServer.enqueue(MockResponse().setResponseCode(200).setBody(jsonResponse))

        val request = DuplicateCheckRequest(
            categoryId = "cat-pothole",
            latitude = 37.7749,
            longitude = -122.4194,
            title = "Deep pothole on Main St",
            description = "Dangerous hole in the middle lane"
        )

        val response = apiService.checkDuplicates(request)
        assertTrue(response.isSuccessful)
        val body = response.body()
        assertNotNull(body)
        assertTrue(body!!.has_likely_duplicate)
        assertEquals("CVX-2026-0001", body.top_candidate?.reference_code)
    }

    @Test
    fun testCreateReportSuccess() = runBlocking {
        val jsonResponse = """
            {
                "success": true,
                "reference_code": "CVX-2026-0002",
                "message": "Report submitted successfully"
            }
        """.trimIndent()

        mockWebServer.enqueue(MockResponse().setResponseCode(201).setBody(jsonResponse))

        val request = CreateReportRequest(
            title = "Broken street light",
            description = "Light out at 5th ave intersection",
            categoryId = "cat-lighting",
            latitude = 37.7749,
            longitude = -122.4194,
            acceptedNonAffiliationDisclaimer = true
        )

        val response = apiService.createReport(request)
        assertTrue(response.isSuccessful)
        assertEquals("CVX-2026-0002", response.body()?.reference_code)
    }
}
