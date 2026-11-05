package org.civicfix.app.data.api.models

data class CategoryDto(
    val id: String,
    val slug: String,
    val name: String,
    val description: String? = null,
    val icon_name: String? = null,
    val color_hex: String? = null,
    val duplicate_radius_meters: Double? = null,
    val duplicate_window_hours: Int? = null,
    val is_sensitive_location: Boolean? = false
)

data class CategoriesResponse(
    val categories: List<CategoryDto> = emptyList(),
    val success: Boolean = true
)
