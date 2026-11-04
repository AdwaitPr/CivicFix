"use client";

import React, { useCallback } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  useMapEvents,
} from "react-leaflet";
import MarkerClusterGroup from "react-leaflet-cluster";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "react-leaflet-cluster/dist/assets/MarkerCluster.css";
import "react-leaflet-cluster/dist/assets/MarkerCluster.Default.css";
import type { MapReportItem, ReportStatus } from "@/lib/domain/types";
import {
  STATUS_BADGE_COLORS,
  generateMarkerSvgHtml,
} from "./CategoryMarker";

export interface BoundingBoxCoords {
  west: number;
  south: number;
  east: number;
  north: number;
}

export interface CivicMapCanvasProps {
  reports: MapReportItem[];
  center?: [number, number];
  zoom?: number;
  interactivePinMode?: boolean;
  selectedPin?: { lat: number; lng: number } | null;
  onSelectPin?: (coords: { lat: number; lng: number }) => void;
  onBoundsChange?: (bbox: BoundingBoxCoords) => void;
  onSelectReport?: (report: MapReportItem) => void;
}

function createCategoryMarkerIcon(colorHex: string, status: ReportStatus): L.DivIcon {
  return L.divIcon({
    className: "civicfix-custom-marker",
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -28],
    html: generateMarkerSvgHtml(colorHex, status),
  });
}

function MapViewportListener({
  interactivePinMode,
  onSelectPin,
  onBoundsChange,
}: {
  interactivePinMode?: boolean;
  onSelectPin?: (coords: { lat: number; lng: number }) => void;
  onBoundsChange?: (bbox: BoundingBoxCoords) => void;
}) {
  const map = useMapEvents({
    click(e) {
      if (interactivePinMode && onSelectPin) {
        onSelectPin({
          lat: Number(e.latlng.lat.toFixed(6)),
          lng: Number(e.latlng.lng.toFixed(6)),
        });
      }
    },
    moveend() {
      if (onBoundsChange) {
        const bounds = map.getBounds();
        onBoundsChange({
          west: Number(bounds.getWest().toFixed(5)),
          south: Number(bounds.getSouth().toFixed(5)),
          east: Number(bounds.getEast().toFixed(5)),
          north: Number(bounds.getNorth().toFixed(5)),
        });
      }
    },
  });
  return null;
}

export default function CivicMapCanvas({
  reports,
  center = [26.4499, 80.3319],
  zoom = 13,
  interactivePinMode = false,
  selectedPin = null,
  onSelectPin,
  onBoundsChange,
  onSelectReport,
}: CivicMapCanvasProps) {
  const tileUrl =
    process.env.NEXT_PUBLIC_MAP_TILE_URL ||
    "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";

  const handleLocateMe = useCallback(() => {
    if (!("geolocation" in navigator) || !onSelectPin) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        onSelectPin({
          lat: Number(pos.coords.latitude.toFixed(6)),
          lng: Number(pos.coords.longitude.toFixed(6)),
        });
      },
      () => {
        alert(
          "Location permission was denied. Click directly on the map to set the approximate issue location manually."
        );
      },
      { enableHighAccuracy: false, timeout: 8000 }
    );
  }, [onSelectPin]);

  return (
    <div className="relative h-full w-full min-h-[480px] rounded-xl overflow-hidden border border-slate-200 shadow-sm">
      {interactivePinMode && (
        <div className="absolute top-3 right-3 z-[1000] flex gap-2">
          <button
            type="button"
            onClick={handleLocateMe}
            className="bg-[#174EA6] hover:bg-blue-800 text-white text-xs font-medium px-3 py-2 rounded-lg shadow transition"
          >
            Use Current Location (Opt-In)
          </button>
        </div>
      )}

      <MapContainer
        center={selectedPin ? [selectedPin.lat, selectedPin.lng] : center}
        zoom={zoom}
        maxZoom={19}
        className="h-full w-full z-0"
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url={tileUrl}
        />

        <MapViewportListener
          interactivePinMode={interactivePinMode}
          onSelectPin={onSelectPin}
          onBoundsChange={onBoundsChange}
        />

        {interactivePinMode && selectedPin && (
          <Marker
            position={[selectedPin.lat, selectedPin.lng]}
            icon={createCategoryMarkerIcon("#0D9488", "Submitted")}
          >
            <Popup>
              <div className="text-xs font-sans">
                <p className="font-bold text-slate-900">Selected Issue Coordinates</p>
                <p className="text-slate-600">
                  {selectedPin.lat.toFixed(5)}, {selectedPin.lng.toFixed(5)}
                </p>
              </div>
            </Popup>
          </Marker>
        )}

        <MarkerClusterGroup chunkedLoading>
          {(reports || [])
            .filter((r) => r && typeof r.latitude === "number" && typeof r.longitude === "number")
            .map((report) => (
            <Marker
              key={report.id}
              position={[report.latitude, report.longitude]}
              icon={createCategoryMarkerIcon(report.category_color, report.status)}
              eventHandlers={{
                click: () => onSelectReport?.(report),
              }}
            >
              <Popup>
                <div className="w-60 font-sans space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-mono font-semibold text-slate-500">
                      {report.reference_code}
                    </span>
                    <span
                      className="text-[10px] font-semibold px-2 py-0.5 rounded-full text-white"
                      style={{ backgroundColor: STATUS_BADGE_COLORS[report.status] }}
                    >
                      {report.status}
                    </span>
                  </div>
                  <p className="text-sm font-bold text-slate-900 leading-snug">
                    {report.title}
                  </p>
                  <p className="text-xs text-slate-600 line-clamp-2">
                    {report.description_excerpt}
                  </p>
                  <div className="pt-1 flex items-center justify-between text-[11px] text-teal-700 font-medium">
                    <span>{report.category_name}</span>
                    {report.is_location_fuzzed && (
                      <span className="text-amber-700">Approx. Location</span>
                    )}
                  </div>
                </div>
              </Popup>
            </Marker>
          ))}
        </MarkerClusterGroup>
      </MapContainer>
    </div>
  );
}
