"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import dynamic from "next/dynamic";
import type {
  MapContainerProps,
  TileLayerProps,
  CircleMarkerProps,
  PolygonProps,
  PopupProps,
  ScaleControlProps,
  TooltipProps,
} from "react-leaflet";
import type { LatLngTuple } from "leaflet";
import "leaflet/dist/leaflet.css";
import {
  AlertTriangle,
  BarChart3,
  ChevronRight,
  Cloud,
  Droplets,
  Leaf,
  Loader2,
  MapPin,
  Play,
  Pause,
  RotateCcw,
  Thermometer,
  Wind,
  Info,
  Clock,
  Target,
} from "lucide-react";

import {
  AHMEDNAGAR_CENTER,
  AHMEDNAGAR_SEPT_WEATHER,
  SUGARCANE_DISEASES,
  SUGARCANE_FIELDS,
  runSimulation,
  riskColor,
  riskFillOpacity,
  type DiseaseProfile,
  type FieldRiskAssessment,
  type SimulationResult,
  type WeatherState,
  type RiskLevel,
} from "@/app/lib/sugarcane-simulation";
import { useLocale } from "@/app/context/LocaleContext";
import {
  fetchSmartWeather,
} from "@/app/lib/weather";

/* ─── Lazy-loaded react-leaflet components (SSR-safe) ─── */
const MapContainer = dynamic<MapContainerProps>(
  () => import("react-leaflet").then((m) => m.MapContainer),
  { ssr: false }
);
const TileLayer = dynamic<TileLayerProps>(
  () => import("react-leaflet").then((m) => m.TileLayer),
  { ssr: false }
);
const CircleMarker = dynamic<CircleMarkerProps>(
  () => import("react-leaflet").then((m) => m.CircleMarker),
  { ssr: false }
);
const Polygon = dynamic<PolygonProps>(
  () => import("react-leaflet").then((m) => m.Polygon),
  { ssr: false }
);
const Popup = dynamic<PopupProps>(
  () => import("react-leaflet").then((m) => m.Popup),
  { ssr: false }
);
const ScaleControl = dynamic<ScaleControlProps>(
  () => import("react-leaflet").then((m) => m.ScaleControl),
  { ssr: false }
);
const Tooltip = dynamic<TooltipProps>(
  () => import("react-leaflet").then((m) => m.Tooltip),
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

/* ─── Constants ─── */
const TILE_URL = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
const TILE_ATTR =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';

const DISEASE_KEYS = Object.keys(SUGARCANE_DISEASES);
const FIELD_OPTIONS = SUGARCANE_FIELDS.map((f) => ({
  value: f.id,
  label: `${f.name} (${f.variety}, ${f.areaAcres}ac)`,
}));

/* ═══════════════════════════════════════════════════════════════════════════
 *  Main Page Component
 * ═══════════════════════════════════════════════════════════════════════════ */

export default function SugarcaneSimulationPage() {
  const { t } = useLocale();
  const [isClient, setIsClient] = useState(false);

  // Simulation parameters
  const [diseaseKey, setDiseaseKey] = useState("red_rot");
  const [epicenterFieldId, setEpicenterFieldId] = useState("field-01");
  const [simDays, setSimDays] = useState(14);
  const [weather, setWeather] = useState<WeatherState>(AHMEDNAGAR_SEPT_WEATHER);
  const [isFetchingLive, setIsFetchingLive] = useState(false);

  // Simulation state
  const [result, setResult] = useState<SimulationResult | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [animDay, setAnimDay] = useState(0); // 0 = show all, 1..N = animate
  const [isAnimating, setIsAnimating] = useState(false);
  const [selectedField, setSelectedField] = useState<FieldRiskAssessment | null>(null);

  // Leaflet init
  useEffect(() => {
    import("leaflet").then((L) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (L.default.Icon.Default.prototype as any)._getIconUrl;
      setIsClient(true);
    });
  }, []);

  // Run simulation
  const handleRun = useCallback(() => {
    setIsRunning(true);
    setSelectedField(null);
    setAnimDay(0);
    setIsAnimating(false);

    // Slight delay for UI feedback
    requestAnimationFrame(() => {
      const res = runSimulation(diseaseKey, epicenterFieldId, weather, simDays);
      setResult(res);
      setIsRunning(false);
    });
  }, [diseaseKey, epicenterFieldId, weather, simDays]);

  // Auto-run on mount
  useEffect(() => {
    if (isClient && !result) {
      handleRun();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isClient]);

  // Animation timer
  useEffect(() => {
    if (!isAnimating || !result) return;
    if (animDay >= result.totalDaysSimulated) {
      setIsAnimating(false);
      return;
    }
    const timer = setTimeout(() => {
      setAnimDay((d) => d + 1);
    }, 600);
    return () => clearTimeout(timer);
  }, [isAnimating, animDay, result]);

  // Fetch live weather for Ahmednagar
  const fetchLiveWeather = useCallback(async () => {
    setIsFetchingLive(true);
    try {
      const w = await fetchSmartWeather({
        latitude: AHMEDNAGAR_CENTER[0],
        longitude: AHMEDNAGAR_CENTER[1],
        district: "Ahmednagar",
      });
      setWeather({
        temperatureC: Number(w.temperatureC.toFixed(1)),
        humidityPct: Number(w.humidityPct.toFixed(0)),
        windSpeedKmh: Number(w.windSpeedKmh.toFixed(1)),
        windDirectionDeg: Number(w.windDirectionDeg.toFixed(0)),
        rainfallMmPerDay: weather.rainfallMmPerDay,
      });
    } catch {
      // Keep simulated defaults
    } finally {
      setIsFetchingLive(false);
    }
  }, [weather.rainfallMmPerDay]);

  // Contours visible for current animation day
  const visibleContours = useMemo(() => {
    if (!result) return [];
    if (animDay === 0) return result.spreadContours; // show all
    return result.spreadContours.filter((c) => c.dayIndex <= animDay);
  }, [result, animDay]);

  const disease: DiseaseProfile | undefined =
    SUGARCANE_DISEASES[diseaseKey];

  return (
    <div className="flex h-[calc(100vh-3.5rem)] flex-col overflow-hidden">
      {/* Header */}
      <header className="flex shrink-0 items-center justify-between gap-3 border-b border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2.5">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[color-mix(in_srgb,var(--color-brand)_15%,transparent)]">
            <Target className="h-4 w-4 text-[var(--color-brand)]" />
          </div>
          <div>
            <h1 className="font-display text-base font-semibold text-[var(--color-brand-deep)]">
              Sugarcane Disease Spread Simulation
            </h1>
            <p className="text-[11px] text-[var(--color-muted-foreground)]">
              Ahmednagar District · Kharif Season · {disease?.name ?? "—"}
            </p>
          </div>
        </div>
        {result && (
          <div className="hidden items-center gap-2 md:flex">
            <RiskBadge level="critical" count={result.overallRiskSummary.critical} />
            <RiskBadge level="high" count={result.overallRiskSummary.high} />
            <RiskBadge level="monitor" count={result.overallRiskSummary.monitor} />
            <RiskBadge level="low" count={result.overallRiskSummary.low} />
          </div>
        )}
      </header>

      <div className="flex min-h-0 flex-1">
        {/* ─── Left Panel: Controls ─── */}
        <aside className="flex w-80 shrink-0 flex-col gap-0 overflow-y-auto border-r border-[var(--color-border)] bg-[var(--color-surface)]">
          {/* Disease selector */}
          <Section title="Disease" icon={<Leaf className="h-3.5 w-3.5" />}>
            <select
              className="fs-input text-[12px]"
              value={diseaseKey}
              onChange={(e) => setDiseaseKey(e.target.value)}
            >
              {DISEASE_KEYS.map((k) => (
                <option key={k} value={k}>
                  {SUGARCANE_DISEASES[k].name} — {SUGARCANE_DISEASES[k].pathogen}
                </option>
              ))}
            </select>
            {disease && (
              <p className="mt-1.5 text-[10px] leading-relaxed text-[var(--color-muted-foreground)]">
                {disease.description}
              </p>
            )}
          </Section>

          {/* Epicenter */}
          <Section title="Epicenter Field" icon={<MapPin className="h-3.5 w-3.5" />}>
            <select
              className="fs-input text-[12px]"
              value={epicenterFieldId}
              onChange={(e) => setEpicenterFieldId(e.target.value)}
            >
              {FIELD_OPTIONS.map((f) => (
                <option key={f.value} value={f.value}>
                  {f.label}
                </option>
              ))}
            </select>
          </Section>

          {/* Weather */}
          <Section
            title="Weather Telemetry"
            icon={<Cloud className="h-3.5 w-3.5" />}
            extra={
              <button
                type="button"
                className="fs-btn-secondary !px-2 !py-1 !text-[10px]"
                disabled={isFetchingLive}
                onClick={() => void fetchLiveWeather()}
              >
                {isFetchingLive ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <MapPin className="h-3 w-3" />
                )}
                Live
              </button>
            }
          >
            <div className="grid grid-cols-2 gap-2">
              <WeatherInput
                icon={<Thermometer className="h-3 w-3" />}
                label="Temp (°C)"
                value={weather.temperatureC}
                step={0.1}
                onChange={(v) =>
                  setWeather((w) => ({ ...w, temperatureC: v }))
                }
              />
              <WeatherInput
                icon={<Droplets className="h-3 w-3" />}
                label="Humidity (%)"
                value={weather.humidityPct}
                step={1}
                min={0}
                max={100}
                onChange={(v) =>
                  setWeather((w) => ({ ...w, humidityPct: v }))
                }
              />
              <WeatherInput
                icon={<Wind className="h-3 w-3" />}
                label="Wind (km/h)"
                value={weather.windSpeedKmh}
                step={0.1}
                min={0}
                onChange={(v) =>
                  setWeather((w) => ({ ...w, windSpeedKmh: v }))
                }
              />
              <WeatherInput
                icon={<Wind className="h-3 w-3" />}
                label="Dir (°)"
                value={weather.windDirectionDeg}
                step={1}
                min={0}
                max={359}
                onChange={(v) =>
                  setWeather((w) => ({ ...w, windDirectionDeg: v }))
                }
              />
              <WeatherInput
                icon={<Droplets className="h-3 w-3" />}
                label="Rain (mm/d)"
                value={weather.rainfallMmPerDay}
                step={0.1}
                min={0}
                onChange={(v) =>
                  setWeather((w) => ({ ...w, rainfallMmPerDay: v }))
                }
              />
              <div className="flex flex-col gap-0.5">
                <label className="text-[10px] text-[var(--color-muted-foreground)]">
                  Sim Days
                </label>
                <input
                  type="number"
                  className="fs-input !py-1.5 !text-[12px]"
                  value={simDays}
                  min={1}
                  max={30}
                  onChange={(e) =>
                    setSimDays(Math.max(1, Math.min(30, parseInt(e.target.value) || 14)))
                  }
                />
              </div>
            </div>
          </Section>

          {/* Run / Animate */}
          <div className="flex flex-col gap-2 border-b border-[var(--color-border)] px-4 py-3">
            <button
              type="button"
              className="fs-btn-primary !py-2 !text-[12px]"
              disabled={isRunning}
              onClick={handleRun}
            >
              {isRunning ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Computing…
                </>
              ) : (
                <>
                  <BarChart3 className="h-3.5 w-3.5" />
                  Run Simulation
                </>
              )}
            </button>
            {result && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="fs-btn-secondary flex-1 !py-1.5 !text-[11px]"
                  onClick={() => {
                    if (isAnimating) {
                      setIsAnimating(false);
                    } else {
                      setAnimDay(0);
                      setIsAnimating(true);
                    }
                  }}
                >
                  {isAnimating ? (
                    <Pause className="h-3 w-3" />
                  ) : (
                    <Play className="h-3 w-3" />
                  )}
                  {isAnimating ? "Pause" : "Animate Spread"}
                </button>
                <button
                  type="button"
                  className="fs-btn-secondary !px-2.5 !py-1.5 !text-[11px]"
                  onClick={() => {
                    setAnimDay(0);
                    setIsAnimating(false);
                  }}
                >
                  <RotateCcw className="h-3 w-3" />
                </button>
              </div>
            )}
            {result && animDay > 0 && (
              <div className="flex items-center gap-2">
                <Clock className="h-3 w-3 text-[var(--color-muted-foreground)]" />
                <input
                  type="range"
                  min={1}
                  max={result.totalDaysSimulated}
                  value={animDay}
                  onChange={(e) => {
                    setAnimDay(parseInt(e.target.value));
                    setIsAnimating(false);
                  }}
                  className="h-1 flex-1 accent-[var(--color-brand)]"
                />
                <span className="text-[10px] font-semibold tabular-nums text-[var(--color-brand)]">
                  Day {animDay}
                </span>
              </div>
            )}
          </div>

          {/* Field Risk Assessments */}
          {result && (
            <div className="flex flex-1 flex-col overflow-y-auto">
              <div className="flex items-center gap-2 border-b border-[var(--color-border)] px-4 py-2">
                <AlertTriangle className="h-3.5 w-3.5 text-[var(--color-clay)]" />
                <span className="text-[11px] font-semibold uppercase tracking-wide text-[var(--color-muted-foreground)]">
                  Field Risk Assessment
                </span>
              </div>
              {result.fieldAssessments.map((fa) => (
                <button
                  key={fa.fieldId}
                  type="button"
                  className={[
                    "flex items-center gap-3 border-b border-[var(--color-border)] px-4 py-2.5 text-left transition-colors",
                    selectedField?.fieldId === fa.fieldId
                      ? "bg-[color-mix(in_srgb,var(--color-brand)_8%,transparent)]"
                      : "hover:bg-[var(--color-background-sunken)]",
                  ].join(" ")}
                  onClick={() =>
                    setSelectedField(
                      selectedField?.fieldId === fa.fieldId ? null : fa
                    )
                  }
                >
                  <div
                    className="h-8 w-1 shrink-0 rounded-full"
                    style={{ background: riskColor(fa.riskLevel) }}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline gap-2">
                      <span className="truncate text-[12px] font-semibold text-[var(--color-foreground)]">
                        {fa.field.name}
                      </span>
                      <span
                        className="ml-auto shrink-0 rounded px-1.5 py-0.5 text-[9px] font-bold uppercase"
                        style={{
                          color: riskColor(fa.riskLevel),
                          background: `color-mix(in srgb, ${riskColor(fa.riskLevel)} 12%, transparent)`,
                        }}
                      >
                        {fa.riskLevel}
                      </span>
                    </div>
                    <div className="mt-0.5 flex items-center gap-3 text-[10px] text-[var(--color-muted-foreground)]">
                      <span>Score: {fa.riskScore}</span>
                      <span>
                        P(inf): {(fa.infectionProbability * 100).toFixed(0)}%
                      </span>
                      {fa.estimatedSpreadDaysTillReach != null && fa.estimatedSpreadDaysTillReach > 0 && (
                        <span>
                          ~{fa.estimatedSpreadDaysTillReach}d
                        </span>
                      )}
                    </div>
                    {/* Risk score bar */}
                    <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-[var(--color-background-sunken)]">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${fa.riskScore}%`,
                          background: riskColor(fa.riskLevel),
                        }}
                      />
                    </div>
                  </div>
                  <ChevronRight className="h-3 w-3 shrink-0 text-[var(--color-muted-foreground)]" />
                </button>
              ))}
            </div>
          )}
        </aside>

        {/* ─── Main Map Area ─── */}
        <div className="relative flex min-h-0 flex-1 flex-col">
          <div className="relative flex-1">
            {isClient ? (
              <MapContainer
                center={AHMEDNAGAR_CENTER}
                zoom={13}
                scrollWheelZoom
                className="h-full w-full"
              >
                <TileLayer url={TILE_URL} attribution={TILE_ATTR} />
                <MapRecenter center={AHMEDNAGAR_CENTER} zoom={13} />

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
                        color: isEpicenter
                          ? "#dc2626"
                          : riskColor(level),
                        weight: isEpicenter ? 3 : 2,
                        dashArray: isEpicenter ? undefined : "5 3",
                        fillColor: riskColor(level),
                        fillOpacity: isEpicenter
                          ? 0.4
                          : riskFillOpacity(level),
                      }}
                    >
                      <Tooltip
                        direction="top"
                        offset={[0, -5]}
                        opacity={0.95}
                        permanent={false}
                      >
                        <div className="text-[11px]">
                          <strong>{field.name}</strong>
                          <br />
                          {field.variety} · {field.areaAcres}ac
                          {assessment && (
                            <>
                              <br />
                              <span
                                style={{ color: riskColor(assessment.riskLevel) }}
                              >
                                ■
                              </span>{" "}
                              {assessment.riskLevel.toUpperCase()} (
                              {assessment.riskScore})
                            </>
                          )}
                        </div>
                      </Tooltip>
                      <Popup>
                        <div className="flex flex-col gap-1.5 text-[11px]">
                          <strong className="text-[13px]">
                            {field.name}
                          </strong>
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
                              {(assessment.infectionProbability * 100).toFixed(
                                0
                              )}
                              %
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
                        <strong className="text-red-600">
                          ⚠ Disease Epicenter
                        </strong>
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
                          Day {contour.dayIndex} ·{" "}
                          {contour.radiusKm.toFixed(2)} km
                        </span>
                      </Tooltip>
                    </Polygon>
                  );
                })}

                <ScaleControl position="bottomleft" imperial={false} />
              </MapContainer>
            ) : (
              <div className="flex h-full items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-[var(--color-brand)]" />
              </div>
            )}

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
                    style={{
                      transform: `rotate(${weather.windDirectionDeg}deg)`,
                    }}
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

          {/* Selected Field Detail Panel */}
          {selectedField && (
            <div className="shrink-0 border-t border-[var(--color-border)] bg-[var(--color-surface)]">
              <div className="flex items-center gap-3 px-4 py-2.5">
                <div
                  className="h-6 w-1.5 rounded-full"
                  style={{ background: riskColor(selectedField.riskLevel) }}
                />
                <div className="flex-1">
                  <h3 className="text-[13px] font-semibold text-[var(--color-brand-deep)]">
                    {selectedField.field.name}
                  </h3>
                  <p className="text-[10px] text-[var(--color-muted-foreground)]">
                    {selectedField.field.variety} · {selectedField.field.areaAcres}ac
                    · {selectedField.field.irrigationType}
                  </p>
                </div>
                <span
                  className="rounded px-2 py-0.5 text-[10px] font-bold uppercase"
                  style={{
                    color: riskColor(selectedField.riskLevel),
                    background: `color-mix(in srgb, ${riskColor(selectedField.riskLevel)} 15%, transparent)`,
                  }}
                >
                  {selectedField.riskLevel} · {selectedField.riskScore}
                </span>
                <button
                  type="button"
                  className="text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]"
                  onClick={() => setSelectedField(null)}
                >
                  ✕
                </button>
              </div>

              <div className="flex gap-6 overflow-x-auto px-4 pb-3">
                {/* Factor breakdown */}
                <div className="shrink-0">
                  <span className="mb-1 block text-[9px] font-semibold uppercase tracking-wider text-[var(--color-muted-foreground)]">
                    Risk Factors
                  </span>
                  <div className="grid grid-cols-4 gap-x-4 gap-y-1 text-[10px]">
                    <FactorBar
                      label="Temperature"
                      value={selectedField.factors.temperatureScore}
                    />
                    <FactorBar
                      label="Humidity"
                      value={selectedField.factors.humidityScore}
                    />
                    <FactorBar
                      label="Wind Alignment"
                      value={selectedField.factors.windAlignmentScore}
                    />
                    <FactorBar
                      label="Proximity"
                      value={selectedField.factors.proximityScore}
                    />
                    <FactorBar
                      label="Variety Suscept."
                      value={selectedField.factors.varietySusceptibility}
                    />
                    <FactorBar
                      label="Crop Age"
                      value={selectedField.factors.ageVulnerability}
                    />
                    <FactorBar
                      label="Irrigation Risk"
                      value={selectedField.factors.irrigationRisk}
                    />
                    <div className="flex flex-col gap-0.5">
                      <span className="text-[var(--color-muted-foreground)]">
                        ETA
                      </span>
                      <span className="font-semibold text-[var(--color-foreground)]">
                        {selectedField.estimatedSpreadDaysTillReach === 0
                          ? "NOW"
                          : `~${selectedField.estimatedSpreadDaysTillReach}d`}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Recommendations */}
                <div className="min-w-0 flex-1">
                  <span className="mb-1 block text-[9px] font-semibold uppercase tracking-wider text-[var(--color-muted-foreground)]">
                    <Info className="mr-1 inline h-3 w-3" />
                    Recommendations
                  </span>
                  <ul className="flex flex-col gap-0.5">
                    {selectedField.recommendations.map((r, i) => (
                      <li
                        key={i}
                        className="text-[10px] leading-snug text-[var(--color-foreground)]"
                      >
                        <span className="mr-1 text-[var(--color-brand)]">
                          •
                        </span>
                        {r}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
 *  Presentational sub-components
 * ═══════════════════════════════════════════════════════════════════════════ */

function Section({
  title,
  icon,
  extra,
  children,
}: {
  title: string;
  icon?: React.ReactNode;
  extra?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="border-b border-[var(--color-border)] px-4 py-3">
      <div className="mb-2 flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--color-muted-foreground)]">
          {icon}
          {title}
        </span>
        {extra}
      </div>
      {children}
    </div>
  );
}

function WeatherInput({
  icon,
  label,
  value,
  step,
  min,
  max,
  onChange,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  step: number;
  min?: number;
  max?: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <label className="flex items-center gap-1 text-[10px] text-[var(--color-muted-foreground)]">
        {icon}
        {label}
      </label>
      <input
        type="number"
        className="fs-input !py-1.5 !text-[12px]"
        value={value}
        step={step}
        min={min}
        max={max}
        onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
      />
    </div>
  );
}

function RiskBadge({ level, count }: { level: RiskLevel; count: number }) {
  if (count === 0) return null;
  return (
    <span
      className="inline-flex items-center gap-1 rounded px-2 py-0.5 text-[10px] font-bold uppercase"
      style={{
        color: riskColor(level),
        background: `color-mix(in srgb, ${riskColor(level)} 12%, transparent)`,
      }}
    >
      <span
        className="h-1.5 w-1.5 rounded-full"
        style={{ background: riskColor(level) }}
      />
      {count} {level}
    </span>
  );
}

function FactorBar({ label, value }: { label: string; value: number }) {
  const pct = Math.round(value * 100);
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[var(--color-muted-foreground)]">{label}</span>
      <div className="flex items-center gap-1.5">
        <div className="h-1 w-12 overflow-hidden rounded-full bg-[var(--color-background-sunken)]">
          <div
            className="h-full rounded-full bg-[var(--color-brand)]"
            style={{ width: `${pct}%` }}
          />
        </div>
        <span className="text-[9px] font-semibold tabular-nums text-[var(--color-foreground)]">
          {pct}%
        </span>
      </div>
    </div>
  );
}
