"use client";

// Requires: leaflet + react-leaflet

import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import dynamic from "next/dynamic";
import type {
  MapContainerProps,
  TileLayerProps,
  CircleMarkerProps,
  PolygonProps,
  PopupProps,
  ScaleControlProps,
} from "react-leaflet";
import type { LatLngTuple } from "leaflet";
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";
import "leaflet/dist/leaflet.css";

import { useIncident } from "@/app/context/IncidentContext";
import type { Incident } from "@/app/context/IncidentContext";
import { useLocale } from "@/app/context/LocaleContext";
import { useFarmerProfile } from "@/app/context/FarmerProfileContext";
import { useActivity } from "@/app/context/ActivityContext";
import type { SpreadProjection } from "@/app/lib/spread-projection";

const MapContainer = dynamic<MapContainerProps>(
  () => import("react-leaflet").then((mod) => mod.MapContainer),
  { ssr: false }
);
const TileLayer = dynamic<TileLayerProps>(
  () => import("react-leaflet").then((mod) => mod.TileLayer),
  { ssr: false }
);
const CircleMarker = dynamic<CircleMarkerProps>(
  () => import("react-leaflet").then((mod) => mod.CircleMarker),
  { ssr: false }
);
const Polygon = dynamic<PolygonProps>(
  () => import("react-leaflet").then((mod) => mod.Polygon),
  { ssr: false }
);
const Popup = dynamic<PopupProps>(
  () => import("react-leaflet").then((mod) => mod.Popup),
  { ssr: false }
);
const ScaleControl = dynamic<ScaleControlProps>(
  () => import("react-leaflet").then((mod) => mod.ScaleControl),
  { ssr: false }
);

const MapRecenter = dynamic(
  async () => {
    const { useMap } = await import("react-leaflet");
    const { useEffect: useFx } = await import("react");

    function RecenterInner({
      center,
      zoom,
    }: {
      center: LatLngTuple;
      zoom: number;
    }) {
      const map = useMap();
      useFx(() => {
        map.setView(center, zoom, { animate: true });
      }, [map, center, zoom]);
      return null;
    }

    return RecenterInner;
  },
  { ssr: false }
);

const OSM_TILES = {
  url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
  attribution:
    '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
} as const;

export interface OutbreakPoint {
  id: string;
  position: LatLngTuple;
  sector: string;
  label: string;
}

export interface DispersionZone {
  id: string;
  positions: LatLngTuple[];
  label?: string;
  color?: string;
}

export interface MapWidgetProps {
  center?: LatLngTuple;
  zoom?: number;
  outbreakPoints?: OutbreakPoint[];
  dispersionZones?: DispersionZone[];
  /** Weather-driven spread projection overlay */
  spreadProjection?: SpreadProjection | null;
  className?: string;
  showLegend?: boolean;
  /** When true, omit default placeholder zones so empty maps stay clean. */
  emptyWhenNoData?: boolean;
}

const DEFAULT_CENTER: LatLngTuple = [19.35, 74.65];
const DEFAULT_ZOOM = 10;

function incidentsToOutbreakPoints(incidents: Incident[]): OutbreakPoint[] {
  return incidents
    .filter((inc) => Number.isFinite(inc.latitude) && Number.isFinite(inc.longitude))
    .map((inc) => ({
      id: inc.id,
      position: [inc.latitude!, inc.longitude!] as LatLngTuple,
      sector: inc.sector,
      label: `${inc.cropType} · ${inc.pathogen}`,
    }));
}

function incidentsToDispersionZones(incidents: Incident[]): DispersionZone[] {
  return incidents
    .filter((inc) => inc.dispersion && inc.dispersion.length >= 3)
    .map((inc) => {
      const highZone = inc.riskZones?.find(
        (z) => z.level === "high" || z.level === "critical"
      );
      return {
        id: `dispersion-${inc.id}`,
        label: highZone?.label ?? "Predicted spread cone",
        color: highZone?.color ?? "#b85d38",
        positions: inc.dispersion as LatLngTuple[],
      };
    });
}

export function MapWidget({
  center,
  zoom = DEFAULT_ZOOM,
  outbreakPoints: outbreakPointsProp,
  dispersionZones: dispersionZonesProp,
  spreadProjection,
  className,
  showLegend = true,
  emptyWhenNoData = false,
}: MapWidgetProps) {
  const [isClientReady, setIsClientReady] = useState(false);
  const { incidents, latestIncident } = useIncident();
  const { t } = useLocale();
  const { profile } = useFarmerProfile();
  const { logActivity } = useActivity();
  const lastLoggedCenterRef = useRef<string>("");

  const outbreakPoints = useMemo(() => {
    if (outbreakPointsProp) return outbreakPointsProp;
    return incidentsToOutbreakPoints(incidents);
  }, [outbreakPointsProp, incidents]);

  const dispersionZones = useMemo(() => {
    if (dispersionZonesProp) return dispersionZonesProp;
    return incidentsToDispersionZones(incidents);
  }, [dispersionZonesProp, incidents]);

  const mapCenter: LatLngTuple = useMemo(() => {
    if (center) return center;
    if (
      latestIncident &&
      Number.isFinite(latestIncident.latitude) &&
      Number.isFinite(latestIncident.longitude)
    ) {
      return [latestIncident.latitude!, latestIncident.longitude!];
    }
    if (outbreakPoints[0]) return outbreakPoints[0].position;
    return DEFAULT_CENTER;
  }, [center, latestIncident, outbreakPoints]);

  // Log map viewport changes (debounced by center comparison)
  useEffect(() => {
    const key = `${mapCenter[0].toFixed(4)},${mapCenter[1].toFixed(4)}`;
    if (key !== lastLoggedCenterRef.current) {
      lastLoggedCenterRef.current = key;
      logActivity("map_viewport_changed", `Center: ${key}, Zoom: ${zoom}`, {
        lat: mapCenter[0].toFixed(4),
        lng: mapCenter[1].toFixed(4),
        zoom: String(zoom),
        district: profile.district,
      });
    }
  }, [mapCenter, zoom, logActivity, profile.district]);

  useEffect(() => {
    let cancelled = false;

    import("leaflet").then((leafletModule) => {
      if (cancelled) return;
      const L = leafletModule.default;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: markerIcon2x.src,
        iconUrl: markerIcon.src,
        shadowUrl: markerShadow.src,
      });

      setIsClientReady(true);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  const hasData = outbreakPoints.length > 0 || dispersionZones.length > 0;

  return (
    <div
      className={[
        "relative h-full w-full overflow-hidden border border-[var(--color-border)] bg-[var(--color-background-sunken)]",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {isClientReady ? (
        <MapContainer
          center={mapCenter}
          zoom={zoom}
          scrollWheelZoom
          className="h-full w-full"
        >
          <TileLayer url={OSM_TILES.url} attribution={OSM_TILES.attribution} />
          <MapRecenter center={mapCenter} zoom={zoom} />

          {dispersionZones.map((zone) => (
            <Polygon
              key={zone.id}
              positions={zone.positions}
              pathOptions={{
                color: zone.color ?? "#b85d38",
                weight: 1.5,
                dashArray: "6 4",
                fillColor: zone.color ?? "#b85d38",
                fillOpacity: 0.28,
              }}
            >
              {zone.label && (
                <Popup>
                  <span className="text-[12px] font-medium">{zone.label}</span>
                </Popup>
              )}
            </Polygon>
          ))}

          {outbreakPoints.map((point) => (
            <CircleMarker
              key={point.id}
              center={point.position}
              radius={9}
              pathOptions={{
                color: "#8a3f24",
                weight: 2,
                fillColor: "#b85d38",
                fillOpacity: 0.9,
              }}
            >
              <Popup>
                <div className="flex flex-col gap-0.5">
                  <span className="text-[11px] font-semibold uppercase tracking-wide text-[#8a3f24]">
                    {point.sector}
                  </span>
                  <span className="text-[12px]">{point.label}</span>
                </div>
              </Popup>
            </CircleMarker>
          ))}

          {!emptyWhenNoData && !hasData && (
            <CircleMarker
              center={DEFAULT_CENTER}
              radius={8}
              pathOptions={{
                color: "var(--color-brand)",
                weight: 2,
                fillColor: "var(--color-brand)",
                fillOpacity: 0.5,
              }}
            >
              <Popup>
                <span className="text-[12px]">Rahuri sugarcane belt (Ahmednagar)</span>
              </Popup>
            </CircleMarker>
          )}

          {/* Weather-driven spread projection overlay */}
          {spreadProjection && spreadProjection.polygon.length >= 3 && (
            <Polygon
              positions={spreadProjection.polygon}
              pathOptions={{
                color: spreadProjection.color,
                weight: 2,
                dashArray: "8 4",
                fillColor: spreadProjection.color,
                fillOpacity: spreadProjection.fillOpacity,
              }}
            >
              <Popup>
                <div className="flex flex-col gap-0.5">
                  <span className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: spreadProjection.color }}>
                    Spread Projection
                  </span>
                  <span className="text-[12px]">{spreadProjection.label}</span>
                  <span className="text-[10px] text-gray-500">
                    Radius: ~{spreadProjection.effectiveRadiusKm} km
                  </span>
                </div>
              </Popup>
            </Polygon>
          )}

          <ScaleControl position="bottomleft" imperial={false} />
        </MapContainer>
      ) : (
        <div className="flex h-full w-full items-center justify-center">
          <span className="text-[12px] text-[var(--color-muted-foreground)]">
            Loading map…
          </span>
        </div>
      )}

      {showLegend && (
        <div className="absolute bottom-3 right-3 z-[1000] flex flex-col gap-1.5 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)]/95 p-2.5 shadow-sm backdrop-blur">
          <div className="flex items-center gap-2 text-[11px] font-medium text-[var(--color-foreground)]">
            <span
              className="h-2.5 w-2.5 rounded-sm"
              style={{ background: "var(--color-risk-high)" }}
            />
            {t("legendHigh")}
          </div>
          <div className="flex items-center gap-2 text-[11px] font-medium text-[var(--color-foreground)]">
            <span
              className="h-2.5 w-2.5 rounded-sm"
              style={{ background: "var(--color-risk-monitor)" }}
            />
            {t("legendMonitor")}
          </div>
          <div className="flex items-center gap-2 text-[11px] font-medium text-[var(--color-foreground)]">
            <span
              className="h-2.5 w-2.5 rounded-sm"
              style={{ background: "var(--color-risk-safe)" }}
            />
            {t("legendSafe")}
          </div>
        </div>
      )}
    </div>
  );
}
