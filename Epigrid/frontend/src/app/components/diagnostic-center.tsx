"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Camera, Landmark, Loader2, MapPin, Upload, X } from "lucide-react";
import { useIncident } from "@/app/context/IncidentContext";
import type { Incident } from "@/app/context/IncidentContext";
import { useFarmerProfile } from "@/app/context/FarmerProfileContext";
import { useLocale } from "@/app/context/LocaleContext";
import {
  ApiError,
  API_BASE_URL,
  fetchGovtWeather,
  polygonToLatLng,
  predictSimulation,
} from "@/app/lib/api";
import {
  fetchOpenMeteoWeather,
  getCurrentPosition,
} from "@/app/lib/weather";
import { MapWidget } from "@/app/components/mapwidget";
import { PreventionsBox } from "@/app/components/preventions-box";

const HOST_CROPS = [
  "Potato",
  "Tomato",
  "Cotton",
  "Soybean",
  "Wheat",
  "Onion",
  "Grapes",
  "Sugarcane",
] as const;

const MAX_FILE_SIZE_MB = 10;
const MANUAL_DISEASE_PROMPT = "Enter disease manually";

function isLikelyImageFile(file: File): boolean {
  const type = (file.type || "").toLowerCase();
  if (type.startsWith("image/")) return true;
  // Camera / OS pickers often omit MIME — fall back to extension.
  return /\.(jpe?g|png|webp|gif|bmp|heic|heif)$/i.test(file.name);
}

function severityFromRisk(level?: string): Incident["severity"] {
  const key = (level ?? "").toLowerCase();
  if (key === "critical" || key === "high") return "critical";
  if (key === "warning" || key === "monitor") return "warning";
  return "contained";
}

function getConfidenceColor(confidence: number): string {
  if (confidence >= 0.80) return "text-green-600";
  if (confidence >= 0.50) return "text-orange-500";
  return "text-red-600";
}

export function DiagnosticCenter() {
  const { t } = useLocale();
  const { profile } = useFarmerProfile();
  const { addIncident, latestIncident } = useIncident();

  const [cropType, setCropType] = useState(profile.preferredCrop || "Potato");
  const [disease, setDisease] = useState("");
  const [district, setDistrict] = useState(profile.district || "Ahmednagar");
  const [sector, setSector] = useState("Farm Block A");
  const [latitude, setLatitude] = useState(19.0952);
  const [longitude, setLongitude] = useState(74.7496);
  const [temperatureC, setTemperatureC] = useState(22.4);
  const [humidityPct, setHumidityPct] = useState(84);
  const [windSpeedKmh, setWindSpeedKmh] = useState(14.5);
  const [windDirectionDeg, setWindDirectionDeg] = useState(217);
  const [sourceMode, setSourceMode] = useState<"manual" | "live">("manual");

  const [fieldImage, setFieldImage] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isClassifying, setIsClassifying] = useState(false);
  const [confidence, setConfidence] = useState<number | null>(null);
  const [isFetchingWeather, setIsFetchingWeather] = useState(false);
  const [isSimulating, setIsSimulating] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [weatherError, setWeatherError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [preventionSteps, setPreventionSteps] = useState<string[]>([]);
  const [icarCure, setIcarCure] = useState<string | null>(null);
  const [isFetchingGovtWeather, setIsFetchingGovtWeather] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const classifyAbortRef = useRef<AbortController | null>(null);

  const cropOptions = HOST_CROPS.includes(cropType as (typeof HOST_CROPS)[number])
    ? [...HOST_CROPS]
    : [cropType, ...HOST_CROPS];

  useEffect(() => {
    if (profile.district) setDistrict(profile.district);
    if (profile.preferredCrop) setCropType(profile.preferredCrop);
  }, [profile.district, profile.preferredCrop]);

  useEffect(() => {
    if (!fieldImage) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(fieldImage);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [fieldImage]);

  useEffect(() => {
    if (latestIncident?.preventionSteps?.length) {
      setPreventionSteps(latestIncident.preventionSteps);
    }
  }, [latestIncident]);

  useEffect(() => {
    return () => {
      classifyAbortRef.current?.abort();
    };
  }, []);

  /** POST leaf image → FastAPI Vision AI; auto-fill crop, disease, ICAR cure. */
  const runClassification = useCallback(async (file: File) => {
    classifyAbortRef.current?.abort();
    const controller = new AbortController();
    classifyAbortRef.current = controller;

    setIsClassifying(true);
    setConfidence(null);
    setIcarCure(null);
    setErrorMessage(null);
    setStatusMessage(null);

    try {
      // Package file and hit the PyTorch classify endpoint directly.
      const formData = new FormData();
      formData.append("file", file, file.name || "leaf.jpg");

      const response = await fetch(
        "http://127.0.0.1:8000/api/diagnosis/classify",
        {
          method: "POST",
          body: formData,
          signal: controller.signal,
          // Do NOT set Content-Type — browser must attach multipart boundary.
        }
      );

      if (!response.ok) {
        throw new ApiError(
          `Classification failed (${response.status}). Enter disease manually.`,
          response.status
        );
      }

      const result = (await response.json()) as {
        crop_type?: unknown;
        disease?: unknown;
        confidence?: unknown;
        cure?: unknown;
      };

      if (typeof result.disease !== "string" || !result.disease.trim()) {
        throw new ApiError(
          "Malformed diagnosis response. Enter disease manually.",
          response.status
        );
      }

      const crop =
        typeof result.crop_type === "string" && result.crop_type.trim()
          ? result.crop_type.trim()
          : "Potato";
      const diseaseName =
        result.disease === "Healthy"
          ? "Healthy (no disease detected)"
          : result.disease.trim();
      const conf =
        typeof result.confidence === "number" ? result.confidence : null;
      const cure =
        typeof result.cure === "string" && result.cure.trim()
          ? result.cure.trim()
          : null;

      setCropType(crop);
      setDisease(diseaseName);
      setConfidence(conf);
      setIcarCure(cure);
      setStatusMessage(
        conf != null
          ? `AI: ${crop} · ${diseaseName} (${(conf * 100).toFixed(0)}%)`
          : `AI: ${crop} · ${diseaseName}`
      );
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        // Replaced by a newer upload — leave UI to the new request.
        return;
      }
      const msg =
        err instanceof ApiError
          ? err.message
          : "Classification failed. Please enter crop and disease manually.";
      setErrorMessage(msg);
      setDisease(MANUAL_DISEASE_PROMPT);
      setConfidence(null);
      setIcarCure(null);
    } finally {
      if (classifyAbortRef.current === controller) {
        setIsClassifying(false);
        classifyAbortRef.current = null;
      }
    }
  }, []);

  const handleFileSelect = useCallback(
    (file: File) => {
      if (!isLikelyImageFile(file)) {
        setErrorMessage("Please upload a JPEG, PNG, or WebP image.");
        return;
      }
      if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
        setErrorMessage(`Image must be under ${MAX_FILE_SIZE_MB} MB.`);
        return;
      }

      // Preview first, then kick off Vision AI classification.
      setFieldImage(file);
      setDisease("");
      setIcarCure(null);
      setConfidence(null);
      void runClassification(file);
    },
    [runClassification]
  );

  const handleAutoWeather = useCallback(async () => {
    setIsFetchingWeather(true);
    setErrorMessage(null);
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), 15_000);

    try {
      const pos = await getCurrentPosition();
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;
      setLatitude(Number(lat.toFixed(4)));
      setLongitude(Number(lng.toFixed(4)));

      const weather = await fetchOpenMeteoWeather(lat, lng, controller.signal);
      setTemperatureC(Number(weather.temperatureC.toFixed(1)));
      setHumidityPct(Number(weather.humidityPct.toFixed(0)));
      setWindSpeedKmh(Number(weather.windSpeedKmh.toFixed(1)));
      setWindDirectionDeg(Number(weather.windDirectionDeg.toFixed(0)));
      setSourceMode("live");
      setStatusMessage("Weather auto-filled from your location (editable).");
    } catch {
      setErrorMessage(t("locationNeeded"));
    } finally {
      window.clearTimeout(timeoutId);
      setIsFetchingWeather(false);
    }
  }, [t]);

  const handleFetchGovtWeather = useCallback(async () => {
    setIsFetchingGovtWeather(true);
    setWeatherError(null);
    setErrorMessage(null);

    try {
      // No client AbortSignal — backend returns simulated IMD within ~3s on failure.
      const weather = await fetchGovtWeather({
        district: district || undefined,
        latitude,
        longitude,
      });

      // HTTP 200 with payload — clear any prior weather error explicitly.
      setWeatherError(null);
      setErrorMessage(null);

      setTemperatureC(Number(weather.temperature_c.toFixed(1)));
      setHumidityPct(Number(weather.humidity_pct.toFixed(0)));
      setWindSpeedKmh(Number(weather.wind_speed_kmh.toFixed(1)));
      setWindDirectionDeg(Number(weather.wind_direction_deg.toFixed(0)));
      if (weather.latitude != null) setLatitude(Number(weather.latitude.toFixed(4)));
      if (weather.longitude != null) {
        setLongitude(Number(weather.longitude.toFixed(4)));
      }
      setSourceMode("live");
      const src =
        weather.source === "data.gov.in/imd"
          ? "IMD (data.gov.in)"
          : "simulated IMD fallback";
      setStatusMessage(
        `Govt weather loaded · ${src}${weather.note ? ` — ${weather.note}` : ""}`
      );
    } catch (err) {
      const msg =
        err instanceof ApiError
          ? err.message
          : "Could not fetch government weather data.";
      setWeatherError(msg);
    } finally {
      setIsFetchingGovtWeather(false);
    }
  }, [district, latitude, longitude]);

  const handleSimulate = useCallback(async () => {
    if (!cropType.trim() || !disease.trim()) {
      setErrorMessage("Detected crop and disease are required.");
      return;
    }

    setIsSimulating(true);
    setErrorMessage(null);
    setStatusMessage(null);

    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), 60_000);

    try {
      const result = await predictSimulation(
        {
          district,
          sector,
          cropType,
          pathogen: disease,
          latitude,
          longitude,
          windSpeedKmh,
          windDirectionDeg,
          humidityPct,
          temperatureC,
          sourceMode,
        },
        controller.signal
      );

      const dispersion = polygonToLatLng(result.spread_polygon_coordinates);
      const steps = result.prevention_steps ?? [];
      setPreventionSteps(steps);

      const incident: Incident = {
        id: `INC-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        timestamp: new Date().toISOString(),
        district,
        sector,
        cropType,
        pathogen: disease,
        severity: severityFromRisk(result.risk_level),
        latitude,
        longitude,
        preventionSteps: steps,
        riskZones: result.risk_zones,
        dispersion,
        policyId: result.policy_id,
      };

      addIncident(incident);
      setStatusMessage(
        result.risk_level
          ? `Risk: ${result.risk_level}${result.policy_id ? ` · ${result.policy_id}` : ""}`
          : "Risk map and preventions updated."
      );
    } catch (err) {
      const msg =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : t("simulateFailed");
      setErrorMessage(msg);
    } finally {
      window.clearTimeout(timeoutId);
      setIsSimulating(false);
    }
  }, [
    addIncident,
    cropType,
    disease,
    district,
    humidityPct,
    latitude,
    longitude,
    sector,
    sourceMode,
    t,
    temperatureC,
    windDirectionDeg,
    windSpeedKmh,
  ]);

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 p-4 sm:p-6">
      <header className="flex flex-col gap-1">
        <h1 className="font-display text-xl font-semibold tracking-tight text-[var(--color-brand-deep)] sm:text-2xl">
          {t("tabDiagnose")}
        </h1>
        <p className="text-[13px] text-[var(--color-muted-foreground)]">
          {t("tagline")}
        </p>
      </header>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        {/* Left: upload + form */}
        <section className="fs-panel flex flex-col gap-5 p-4 sm:p-5 lg:col-span-5">
          {/* Photo upload */}
          <div>
            <h2 className="mb-2 text-[12px] font-semibold uppercase tracking-wide text-[var(--color-muted-foreground)]">
              {t("photoUpload")}
            </h2>
            {!fieldImage ? (
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="sr-only"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileSelect(file);
                    e.target.value = "";
                  }}
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDragOver(true);
                  }}
                  onDragLeave={() => setIsDragOver(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setIsDragOver(false);
                    const file = e.dataTransfer.files[0];
                    if (file) handleFileSelect(file);
                  }}
                  disabled={isClassifying}
                  className={[
                    "flex w-full flex-col items-center gap-2 rounded-lg border-2 border-dashed px-4 py-8 transition-colors",
                    isDragOver
                      ? "border-[var(--color-clay)] bg-[var(--color-background-sunken)]"
                      : "border-[var(--color-border)] bg-[var(--color-background-sunken)] hover:border-[var(--color-brand)]",
                  ].join(" ")}
                >
                  <div className="flex gap-3 text-[var(--color-muted-foreground)]">
                    <Upload className="h-5 w-5" strokeWidth={1.75} />
                    <Camera className="h-5 w-5" strokeWidth={1.75} />
                  </div>
                  <span className="text-[13px] font-medium text-[var(--color-foreground)]">
                    {isClassifying
                      ? "Analyzing crop health..."
                      : t("photoUpload")}
                  </span>
                  <span className="text-center text-[11px] text-[var(--color-muted-foreground)]">
                    {isClassifying
                      ? "Running PyTorch disease classifier…"
                      : t("photoHint")}
                  </span>
                </button>
              </div>
            ) : (
              <div className="flex items-start gap-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-background-sunken)] p-3">
                <div className="relative shrink-0">
                  {previewUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={previewUrl}
                      alt="Leaf preview"
                      className="h-20 w-20 rounded-md object-cover"
                    />
                  )}
                  {isClassifying && (
                    <div className="absolute inset-0 flex items-center justify-center rounded-md bg-[var(--color-surface)]/70">
                      <Loader2 className="h-5 w-5 animate-spin text-[var(--color-clay)]" />
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-medium">{fieldImage.name}</p>
                  {isClassifying ? (
                    <p className="mt-1 inline-flex items-center gap-1.5 text-[11px] font-medium text-[var(--color-clay)]">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      Analyzing crop health...
                    </p>
                  ) : confidence != null ? (
                    <p className={`mt-1 text-[11px] font-semibold ${getConfidenceColor(confidence)}`}>
                      {(confidence * 100).toFixed(0)}% confidence
                    </p>
                  ) : null}
                </div>
                <button
                  type="button"
                  aria-label="Remove image"
                  onClick={() => {
                    setFieldImage(null);
                    setConfidence(null);
                    setIcarCure(null);
                  }}
                  className="rounded p-1 text-[var(--color-muted-foreground)] hover:bg-[var(--color-border)]"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>

          {/* Detected crop / disease */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="crop" className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-[var(--color-muted-foreground)]">
                {t("detectedCrop")}
              </label>
              <select
                id="crop"
                className="fs-input"
                value={cropType}
                onChange={(e) => setCropType(e.target.value)}
              >
                {cropOptions.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="disease" className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-[var(--color-muted-foreground)]">
                {t("detectedDisease")}
              </label>
              <input
                id="disease"
                className="fs-input"
                value={disease}
                onChange={(e) => setDisease(e.target.value)}
                placeholder="e.g. Late Blight"
              />
              {icarCure && (
                <div
                  role="status"
                  className="mt-2 rounded-md border border-[color-mix(in_srgb,var(--color-brand)_35%,transparent)] bg-[color-mix(in_srgb,var(--color-brand)_10%,transparent)] px-3 py-2.5"
                >
                  <p className="mb-1 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--color-brand)]">
                    <Landmark className="h-3 w-3" strokeWidth={1.75} />
                    ICAR recommended cure
                  </p>
                  <p className="text-[12px] leading-relaxed text-[var(--color-foreground)]">
                    {icarCure}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Location */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="district" className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-[var(--color-muted-foreground)]">
                {t("district")}
              </label>
              <input
                id="district"
                className="fs-input"
                value={district}
                onChange={(e) => setDistrict(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="sector" className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-[var(--color-muted-foreground)]">
                Sector
              </label>
              <input
                id="sector"
                className="fs-input"
                value={sector}
                onChange={(e) => setSector(e.target.value)}
              />
            </div>
          </div>

          {/* Weather */}
          <div>
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-[12px] font-semibold uppercase tracking-wide text-[var(--color-muted-foreground)]">
                {t("weatherTitle")}
              </h2>
              <button
                type="button"
                className="fs-btn-secondary"
                onClick={() => void handleAutoWeather()}
                disabled={isFetchingWeather || isFetchingGovtWeather}
              >
                {isFetchingWeather ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <MapPin className="h-3.5 w-3.5" />
                )}
                {t("autoWeather")}
              </button>
            </div>
            <button
              type="button"
              className="fs-btn-primary mb-3"
              onClick={() => void handleFetchGovtWeather()}
              disabled={isFetchingGovtWeather || isFetchingWeather}
            >
              {isFetchingGovtWeather ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Fetching IMD data…
                </>
              ) : (
                <>
                  <Landmark className="h-4 w-4" />
                  Fetch Govt Weather Data
                </>
              )}
            </button>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="temp" className="mb-1 block text-[11px] text-[var(--color-muted-foreground)]">
                  {t("temperature")}
                </label>
                <input
                  id="temp"
                  type="number"
                  step={0.1}
                  className="fs-input"
                  value={temperatureC}
                  onChange={(e) => {
                    setTemperatureC(parseFloat(e.target.value) || 0);
                    setSourceMode("manual");
                  }}
                />
              </div>
              <div>
                <label htmlFor="humidity" className="mb-1 block text-[11px] text-[var(--color-muted-foreground)]">
                  {t("humidity")}
                </label>
                <input
                  id="humidity"
                  type="number"
                  step={1}
                  min={0}
                  max={100}
                  className="fs-input"
                  value={humidityPct}
                  onChange={(e) => {
                    setHumidityPct(parseFloat(e.target.value) || 0);
                    setSourceMode("manual");
                  }}
                />
              </div>
              <div>
                <label htmlFor="windSpeed" className="mb-1 block text-[11px] text-[var(--color-muted-foreground)]">
                  {t("windSpeed")}
                </label>
                <input
                  id="windSpeed"
                  type="number"
                  step={0.1}
                  min={0}
                  className="fs-input"
                  value={windSpeedKmh}
                  onChange={(e) => {
                    setWindSpeedKmh(parseFloat(e.target.value) || 0);
                    setSourceMode("manual");
                  }}
                />
              </div>
              <div>
                <label htmlFor="windDir" className="mb-1 block text-[11px] text-[var(--color-muted-foreground)]">
                  {t("windDirection")}
                </label>
                <input
                  id="windDir"
                  type="number"
                  step={1}
                  min={0}
                  max={359}
                  className="fs-input"
                  value={windDirectionDeg}
                  onChange={(e) => {
                    setWindDirectionDeg(parseFloat(e.target.value) || 0);
                    setSourceMode("manual");
                  }}
                />
              </div>
            </div>
            {sourceMode === "live" && (
              <p className="mt-2 text-[11px] text-[var(--color-brand)]">
                Live weather · override any field to switch to manual
              </p>
            )}
          </div>

          {weatherError && (
            <div
              role="alert"
              className="rounded-md border border-[color-mix(in_srgb,var(--color-clay)_40%,transparent)] bg-[color-mix(in_srgb,var(--color-clay)_12%,transparent)] px-3 py-2 text-[12px] text-[var(--color-clay)]"
            >
              {weatherError}
            </div>
          )}
          {errorMessage && (
            <div
              role="alert"
              className="rounded-md border border-[color-mix(in_srgb,var(--color-clay)_40%,transparent)] bg-[color-mix(in_srgb,var(--color-clay)_12%,transparent)] px-3 py-2 text-[12px] text-[var(--color-clay)]"
            >
              {errorMessage}
            </div>
          )}
          {statusMessage && !errorMessage && !weatherError && (
            <div
              role="status"
              className="rounded-md border border-[color-mix(in_srgb,var(--color-brand)_35%,transparent)] bg-[color-mix(in_srgb,var(--color-brand)_10%,transparent)] px-3 py-2 text-[12px] text-[var(--color-brand)]"
            >
              {statusMessage}
            </div>
          )}

          <button
            type="button"
            className="fs-btn-primary"
            disabled={isSimulating || isClassifying || !disease.trim()}
            onClick={() => void handleSimulate()}
          >
            {isSimulating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                {t("computing")}
              </>
            ) : (
              t("runSimulation")
            )}
          </button>
        </section>

        {/* Right: map + preventions */}
        <section className="flex flex-col gap-4 lg:col-span-7">
          <div className="fs-panel overflow-hidden">
            <div className="flex items-center justify-between border-b border-[var(--color-border)] px-4 py-3">
              <h2 className="text-[13px] font-semibold text-[var(--color-brand-deep)]">
                {t("riskMap")}
              </h2>
              {isSimulating && (
                <span className="inline-flex items-center gap-1.5 text-[11px] text-[var(--color-muted-foreground)]">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  {t("computing")}
                </span>
              )}
            </div>
            <div className="h-[320px] sm:h-[420px]">
              <MapWidget
                className="rounded-none border-0"
                zoom={11}
                showLegend
              />
            </div>
          </div>

          <PreventionsBox steps={preventionSteps} icarCure={icarCure} />
        </section>
      </div>
    </div>
  );
}
