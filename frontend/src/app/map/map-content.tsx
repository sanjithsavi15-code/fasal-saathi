"use client";

/**
 * SugarcaneMap — client-only map component.
 *
 * This file is intentionally loaded via a single `dynamic(() => import("./map-content"), { ssr: false })`
 * call in page.tsx. Keeping the entire react-leaflet tree in one chunk prevents
 * Turbopack HMR from reloading individual dynamic fragments out-of-sync, which
 * was the root cause of the "Map container is being reused by another instance"
 * and "Cannot read properties of undefined (reading 'appendChild')" runtime errors.
 *
 * Because this module is NEVER executed on the server (SSR-false dynamic import),
 * it is safe to import Leaflet and react-leaflet directly at the top level.
 */

import { useEffect, useCallback, useRef } from "react";
import {
  MapContainer,
  TileLayer,
  CircleMarker,
  Polygon,
  Popup,
  ScaleControl,
  Tooltip,
  useMap,
  useMapEvents,
} from "react-leaflet";
import type { LatLngTuple } from "leaflet";
import "leaflet/dist/leaflet.css";
import { MapPin } from "lucide-react";

import {
  AHMEDNAGAR_CENTER,
  SUGARCANE_FIELDS,
  riskColor,
  riskFillOpacity,
  type SimulationResult,
  type SpreadContour,
  type WeatherState,
  type RiskLevel,
} from "@/app/lib/sugarcane-simulation";
import type { SpreadProjection } from "@/app/lib/spread-projection";

/* ─── Constants ─── */
const TILE_URL = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
const TILE_ATTR =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';

/* ─── Inner map helpers (must be inside MapContainer context) ─── */

function MapRecenter({ center, zoom }: { center: LatLngTuple; zoom: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, zoom, { animate: true });
  }, [map, center, zoom]);
  return null;
}

function MapClickHandler({
  onLocationSelect,
}: {
  onLocationSelect: (pos: LatLngTuple) => void;
}) {
  const cbRef = useRef(onLocationSelect);
  cbRef.current = onLocationSelect;

  const handler = useCallback((e: { latlng: { lat: number; lng: number } }) => {
    try {
      cbRef.current([e.latlng.lat, e.latlng.lng]);
    } catch (err) {
      console.error("[MapClickHandler] Error:", err);
    }
  }, []);

  useMapEvents({ click: handler });
  return null;
}

/* ─── Props ─── */

export interface SugarcaneMapProps {
  weather: WeatherState;
  result: SimulationResult | null;
  visibleContours: SpreadContour[];
  epicenterFieldId: string;
  selectedLocation: LatLngTuple | null;
  onLocationSelect: (pos: LatLngTuple | null) => void;
  manualSpreadProjection: SpreadProjection | null;
}

/* ─── Component ─── */

export default function SugarcaneMap({
  weather,
  result,
  visibleContours,
  epicenterFieldId,
  selectedLocation,
  onLocationSelect,
  manualSpreadProjection,
}: SugarcaneMapProps) {
  return (
    <div className="relative flex-1">
      <MapContainer
          center={AHMEDNAGAR_CENTER}
          zoom={13}
          scrollWheelZoom
          className="h-full w-full"
        >
          <TileLayer url={TILE_URL} attribution={TILE_ATTR} />
          <MapRecenter center={AHMEDNAGAR_CENTER} zoom={13} />
          <MapClickHandler onLocationSelect={onLocationSelect} />

          {/* Field boundaries */}
          {SUGARCANE_FIELDS.map((field) => {
            const assessment = result?.fieldAssessments.find(
              (a) => a.fieldId === field.id
            );
            const level = assessment?.riskLevel ?? "low";
            const isEpicenter = field.id === epicenterFieldId;

            return (
              <Polygon
                key={field.id}
                positions={field.boundary}
                pathOptions={{
                  color: isEpicenter ? "#dc2626" : riskColor(level),
                  weight: isEpicenter ? 3 : 2,
                  dashArray: isEpicenter ? undefined : "5 3",
                  fillColor: riskColor(level),
                  fillOpacity: isEpicenter ? 0.4 : riskFillOpacity(level),
                }}
              >
                <Tooltip direction="top" offset={[0, -5]} opacity={0.95} permanent={false}>
                  <div className="text-[11px]">
                    <strong>{field.name}</strong>
                    <br />
                    {field.variety} · {field.areaAcres}ac
                    {assessment && (
                      <>
                        <br />
                        <span style={{ color: riskColor(assessment.riskLevel) }}>■</span>{" "}
                        {assessment.riskLevel.toUpperCase()} ({assessment.riskScore})
                      </>
                    )}
                  </div>
                </Tooltip>
                <Popup>
                  <div className="flex flex-col gap-1.5 text-[11px]">
                    <strong className="text-[13px]">{field.name}</strong>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-0.5">
                      <span className="text-gray-500">Taluka</span>
                      <span>{field.taluka}</span>
                      <span className="text-gray-500">Variety</span>
                      <span>{field.variety}</span>
                      <span className="text-gray-500">Area</span>
                      <span>{field.areaAcres} acres</span>
                      <span className="text-gray-500">Soil</span>
                      <span>{field.soilType}</span>
                      <span className="text-gray-500">Irrigation</span>
                      <span>{field.irrigationType}</span>
                      <span className="text-gray-500">Age</span>
                      <span>{field.ageMonths} months</span>
                    </div>
                    {assessment && (
                      <div
                        className="mt-1 rounded px-2 py-1 text-[10px] font-semibold"
                        style={{
                          color: riskColor(assessment.riskLevel),
                          background: `color-mix(in srgb, ${riskColor(assessment.riskLevel)} 12%, transparent)`,
                        }}
                      >
                        Risk: {assessment.riskLevel.toUpperCase()} · Score{" "}
                        {assessment.riskScore} · P(infection){" "}
                        {(assessment.infectionProbability * 100).toFixed(0)}%
                      </div>
                    )}
                  </div>
                </Popup>
              </Polygon>
            );
          })}

          {/* Epicenter marker */}
          {result && (
            <CircleMarker
              center={result.epicenter}
              radius={8}
              pathOptions={{
                color: "#dc2626",
                weight: 3,
                fillColor: "#fca5a5",
                fillOpacity: 0.9,
              }}
            >
              <Popup>
                <div className="text-[11px]">
                  <strong className="text-red-600">⚠ Disease Epicenter</strong>
                  <br />
                  {result.disease.name} ({result.disease.pathogen})
                </div>
              </Popup>
            </CircleMarker>
          )}

          {/* Spread contours */}
          {visibleContours.map((contour) => {
            const c = riskColor(contour.riskLevel);
            return (
              <Polygon
                key={`contour-${contour.dayIndex}`}
                positions={contour.polygon}
                pathOptions={{
                  color: c,
                  weight: 1,
                  dashArray: "4 2",
                  fillColor: c,
                  fillOpacity: riskFillOpacity(contour.riskLevel) * 0.6,
                }}
              >
                <Tooltip direction="center" permanent={false}>
                  <span className="text-[10px] font-medium">
                    Day {contour.dayIndex} · {contour.radiusKm.toFixed(2)} km
                  </span>
                </Tooltip>
              </Polygon>
            );
          })}

          {/* User-dropped marker */}
          {selectedLocation && (
            <CircleMarker
              center={selectedLocation}
              radius={10}
              pathOptions={{
                color: "var(--color-brand-deep, #2d5016)",
                weight: 3,
                fillColor: "var(--color-brand, #5a7d3a)",
                fillOpacity: 0.85,
              }}
            >
              <Popup>
                <div className="flex flex-col gap-0.5 text-[11px]">
                  <strong className="text-[var(--color-brand-deep)]">
                    Dropped Marker
                  </strong>
                  <span className="tabular-nums text-gray-500">
                    {selectedLocation[0].toFixed(5)},{" "}
                    {selectedLocation[1].toFixed(5)}
                  </span>
                  {manualSpreadProjection && (
                    <span
                      className="mt-0.5 font-semibold"
                      style={{ color: manualSpreadProjection.color }}
                    >
                      {manualSpreadProjection.label}
                    </span>
                  )}
                </div>
              </Popup>
            </CircleMarker>
          )}

          {/* Weather-driven spread polygon from the dropped marker */}
          {manualSpreadProjection &&
            manualSpreadProjection.polygon.length >= 3 && (
              <Polygon
                positions={manualSpreadProjection.polygon}
                pathOptions={{
                  color: manualSpreadProjection.color,
                  weight: 2,
                  dashArray: "8 4",
                  fillColor: manualSpreadProjection.color,
                  fillOpacity: manualSpreadProjection.fillOpacity,
                }}
              >
                <Popup>
                  <div className="flex flex-col gap-0.5 text-[11px]">
                    <strong style={{ color: manualSpreadProjection.color }}>
                      Spread Projection
                    </strong>
                    <span>{manualSpreadProjection.label}</span>
                    <span className="text-gray-500">
                      Radius: ~{manualSpreadProjection.effectiveRadiusKm} km ·
                      Risk: <strong>{manualSpreadProjection.riskLevel}</strong>
                    </span>
                  </div>
                </Popup>
              </Polygon>
            )}

          <ScaleControl position="bottomleft" imperial={false} />
        </MapContainer>

        {/* Legend overlay */}
        <div className="absolute bottom-3 right-3 z-[1000] flex flex-col gap-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)]/95 px-3 py-2.5 shadow-lg backdrop-blur">
          <span className="mb-0.5 text-[9px] font-semibold uppercase tracking-wider text-[var(--color-muted-foreground)]">
            Risk Level
          </span>
          {(
            [
              ["critical", "Critical"],
              ["high", "High Risk"],
              ["monitor", "Monitor"],
              ["low", "Lower Risk"],
            ] as [RiskLevel, string][]
          ).map(([level, label]) => (
            <div
              key={level}
              className="flex items-center gap-2 text-[11px] font-medium text-[var(--color-foreground)]"
            >
              <span
                className="h-2.5 w-2.5 rounded-sm"
                style={{ background: riskColor(level) }}
              />
              {label}
            </div>
          ))}
        </div>

        {/* Drop-marker affordance / clear button */}
        <div className="absolute left-1/2 top-3 z-[1000] -translate-x-1/2">
          {selectedLocation ? (
            <button
              type="button"
              className="flex items-center gap-1.5 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)]/95 px-3 py-1.5 text-[10px] font-semibold shadow-lg backdrop-blur transition-colors hover:bg-[var(--color-background-sunken)]"
              onClick={() => onLocationSelect(null)}
            >
              <MapPin className="h-3 w-3 text-[var(--color-brand)]" />
              Clear marker
            </button>
          ) : (
            <span className="flex items-center gap-1.5 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)]/90 px-3 py-1.5 text-[10px] text-[var(--color-muted-foreground)] shadow-md backdrop-blur">
              <MapPin className="h-3 w-3" />
              Click the map to drop a spread-origin marker
            </span>
          )}
        </div>

        {/* Wind direction indicator */}
        {result && (
          <div className="absolute left-3 top-3 z-[1000] flex flex-col items-center gap-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)]/95 px-3 py-2.5 shadow-lg backdrop-blur">
            <span className="text-[9px] font-semibold uppercase tracking-wider text-[var(--color-muted-foreground)]">
              Wind
            </span>
            <div
              className="flex h-8 w-8 items-center justify-center rounded-full border border-[var(--color-border)] bg-[var(--color-background-sunken)]"
              title={`Wind from ${weather.windDirectionDeg}° at ${weather.windSpeedKmh} km/h`}
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 20 20"
                style={{ transform: `rotate(${weather.windDirectionDeg}deg)` }}
              >
                <path
                  d="M10 2 L13 14 L10 11 L7 14 Z"
                  fill="var(--color-brand)"
                  stroke="var(--color-brand-deep)"
                  strokeWidth="0.5"
                />
              </svg>
            </div>
            <span className="text-[10px] font-medium text-[var(--color-foreground)]">
              {weather.windSpeedKmh} km/h
            </span>
            <span className="text-[9px] text-[var(--color-muted-foreground)]">
              {weather.windDirectionDeg}°
            </span>
          </div>
        )}
      </div>
  );
}
