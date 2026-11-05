package org.civicfix.app.ui.components

import android.graphics.Color
import android.graphics.drawable.GradientDrawable
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.viewinterop.AndroidView
import org.civicfix.app.data.api.models.ReportDto
import org.osmdroid.events.MapEventsReceiver
import org.osmdroid.events.MapListener
import org.osmdroid.events.ScrollEvent
import org.osmdroid.events.ZoomEvent
import org.osmdroid.tileprovider.tilesource.TileSourceFactory
import org.osmdroid.util.GeoPoint
import org.osmdroid.views.MapView
import org.osmdroid.views.overlay.MapEventsOverlay
import org.osmdroid.views.overlay.Marker

@Composable
fun CivicMapView(
    modifier: Modifier = Modifier,
    reports: List<ReportDto> = emptyList(),
    selectedReport: ReportDto? = null,
    isPickerMode: Boolean = false,
    pickerLocation: GeoPoint? = null,
    centerGeoPoint: GeoPoint = GeoPoint(37.7749, -122.4194),
    zoomLevel: Double = 14.0,
    onBoundsChanged: ((west: Double, south: Double, east: Double, north: Double) -> Unit)? = null,
    onReportSelected: ((ReportDto) -> Unit)? = null,
    onLocationPicked: ((lat: Double, lng: Double) -> Unit)? = null
) {
    val context = LocalContext.current
    val mapView = remember {
        MapView(context).apply {
            setTileSource(TileSourceFactory.MAPNIK)
            setMultiTouchControls(true)
            controller.setZoom(zoomLevel)
            controller.setCenter(centerGeoPoint)
        }
    }

    DisposableEffect(mapView) {
        onDispose {
            mapView.onDetach()
        }
    }

    AndroidView(
        factory = { mapView },
        modifier = modifier,
        update = { view ->
            view.overlays.clear()

            // 1. Interactive Pin Picker overlay
            if (isPickerMode) {
                val mapEventsReceiver = object : MapEventsReceiver {
                    override fun singleTapConfirmedHelper(p: GeoPoint?): Boolean {
                        if (p != null) {
                            onLocationPicked?.invoke(p.latitude, p.longitude)
                        }
                        return true
                    }

                    override fun longPressHelper(p: GeoPoint?): Boolean {
                        if (p != null) {
                            onLocationPicked?.invoke(p.latitude, p.longitude)
                        }
                        return true
                    }
                }
                view.overlays.add(MapEventsOverlay(mapEventsReceiver))

                pickerLocation?.let { loc ->
                    val marker = Marker(view).apply {
                        position = loc
                        title = "Selected Report Location"
                        setAnchor(Marker.ANCHOR_CENTER, Marker.ANCHOR_BOTTOM)
                        icon = createCircleDrawable("#FF9800", context) // Amber pin
                    }
                    view.overlays.add(marker)
                }
            } else {
                // 2. Report markers
                reports.forEach { report ->
                    val geoPoint = GeoPoint(report.latitude, report.longitude)
                    val markerColor = report.category_color ?: getColorForCategory(report.category_id)
                    val marker = Marker(view).apply {
                        position = geoPoint
                        title = "${report.reference_code}: ${report.title}"
                        snippet = report.description
                        setAnchor(Marker.ANCHOR_CENTER, Marker.ANCHOR_BOTTOM)
                        icon = createCircleDrawable(markerColor, context)
                        setOnMarkerClickListener { m, _ ->
                            m.showInfoWindow()
                            onReportSelected?.invoke(report)
                            true
                        }
                    }
                    view.overlays.add(marker)
                }
            }

            // 3. Pan / Zoom Listener for bounding box queries
            view.addMapListener(object : MapListener {
                override fun onScroll(event: ScrollEvent?): Boolean {
                    notifyBounds()
                    return true
                }

                override fun onZoom(event: ZoomEvent?): Boolean {
                    notifyBounds()
                    return true
                }

                private fun notifyBounds() {
                    val box = view.boundingBox
                    if (box != null) {
                        onBoundsChanged?.invoke(
                            box.lonWest,
                            box.latSouth,
                            box.lonEast,
                            box.latNorth
                        )
                    }
                }
            })

            view.invalidate()
        }
    )
}

private fun getColorForCategory(categoryId: String): String {
    return when (categoryId.lowercase()) {
        "pothole", "potholes" -> "#174EA6"
        "water_leakage", "water" -> "#12B5CB"
        "garbage", "waste" -> "#D93025"
        "street_light", "lighting" -> "#F9AB00"
        "traffic", "signal" -> "#E37400"
        else -> "#1976D2"
    }
}

private fun createCircleDrawable(colorHex: String, context: android.content.Context): android.graphics.drawable.Drawable {
    val parsedColor = try {
        Color.parseColor(colorHex)
    } catch (e: Exception) {
        Color.parseColor("#1976D2")
    }
    val density = context.resources.displayMetrics.density
    val sizePx = (24 * density).toInt()

    return GradientDrawable().apply {
        shape = GradientDrawable.OVAL
        setColor(parsedColor)
        setStroke((2 * density).toInt(), Color.WHITE)
        setSize(sizePx, sizePx)
    }
}
