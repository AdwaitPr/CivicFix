package org.civicfix.app.data.api

import okhttp3.Interceptor
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import java.util.concurrent.TimeUnit

object ApiClient {
    const val DEFAULT_BASE_URL = "http://10.0.2.2:3000/"

    @Volatile
    var currentBaseUrl: String = DEFAULT_BASE_URL
        private set

    @Volatile
    var currentRole: String = "citizen"

    private var retrofit: Retrofit? = null
    private var apiServiceInstance: CivicFixApiService? = null

    fun updateBaseUrl(newUrl: String) {
        var formatted = newUrl.trim()
        if (!formatted.endsWith("/")) {
            formatted += "/"
        }
        if (currentBaseUrl != formatted) {
            currentBaseUrl = formatted
            retrofit = null
            apiServiceInstance = null
        }
    }

    private fun buildOkHttpClient(): OkHttpClient {
        val loggingInterceptor = HttpLoggingInterceptor().apply {
            level = HttpLoggingInterceptor.Level.BODY
        }
        val headerInterceptor = Interceptor { chain ->
            val original = chain.request()
            val requestBuilder = original.newBuilder()
                .header("X-CivicFix-Client", "android-native")
                .header("x-user-role", currentRole)
                .method(original.method, original.body)
            chain.proceed(requestBuilder.build())
        }

        return OkHttpClient.Builder()
            .connectTimeout(30, TimeUnit.SECONDS)
            .readTimeout(30, TimeUnit.SECONDS)
            .writeTimeout(30, TimeUnit.SECONDS)
            .addInterceptor(headerInterceptor)
            .addInterceptor(loggingInterceptor)
            .build()
    }

    fun getApiService(baseUrlOverride: String? = null): CivicFixApiService {
        val urlToUse = baseUrlOverride ?: currentBaseUrl
        if (retrofit == null || currentBaseUrl != urlToUse) {
            currentBaseUrl = urlToUse
            retrofit = Retrofit.Builder()
                .baseUrl(currentBaseUrl)
                .client(buildOkHttpClient())
                .addConverterFactory(GsonConverterFactory.create())
                .build()
            apiServiceInstance = retrofit!!.create(CivicFixApiService::class.java)
        }
        return apiServiceInstance!!
    }
}
