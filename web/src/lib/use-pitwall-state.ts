import { usePwa } from "@/components/pitwall/install-app";
import { apiFetch } from "@/lib/browser-api";
import { buildConsensus, summarizeSession } from "@/lib/consensus";
import type {
  HistoryPoint,
  Session,
  Track,
  WeatherResponse,
} from "@/lib/contracts";
import {
  mergeBackup,
  parseBackup,
  parsePreferences,
  validSession,
} from "@/lib/device-state";
import { csvEscape, download, sessionsCalendar, toCsv } from "@/lib/exports";
import { day, max, mean, min, niceDate, time } from "@/lib/format";
import { localEpoch } from "@/lib/local-time";
import { getDryWindows, sessionSources } from "@/lib/session-planner";
import {
  coordinateTrack,
  INITIAL_TRACKS,
  TRACKS,
  searchTrack,
} from "@/lib/tracks";
import { useModalFocus } from "@/lib/use-modal-focus";
import { useTheme } from "@/lib/theme";
import { useEffect, useMemo, useRef, useState } from "react";
type View = "overview" | "comparison" | "planner" | "history";
export const TABS: [View, string][] = [
  ["overview", "Overview"],
  ["planner", "Sessions"],
  ["comparison", "Models"],
  ["history", "History"],
];
export function usePitwallState() {
  const pwa = usePwa();
  const appearance = useTheme();
  const refreshRequested = useRef(false);
  const backupInput = useRef<HTMLInputElement>(null);
  const [view, setView] = useState<View>("overview"),
    [track, setTrack] = useState<Track>(TRACKS[0]),
    [favorites, setFavorites] = useState<Track[]>(INITIAL_TRACKS),
    [data, setData] = useState<WeatherResponse | null>(null),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [refresh, setRefresh] = useState(0),
    [disabled, setDisabled] = useState<string[]>([]),
    [threshold, setThreshold] = useState(0.1),
    [settings, setSettings] = useState(false),
    [selectedDay, setSelectedDay] = useState(""),
    [horizon, setHorizon] = useState(24),
    [searchOpen, setSearchOpen] = useState(false),
    [query, setQuery] = useState(""),
    [searching, setSearching] = useState(false),
    [searchResults, setSearchResults] = useState<Track[]>([]),
    [searchError, setSearchError] = useState(""),
    [coordinateMode, setCoordinateMode] = useState(false),
    [coordName, setCoordName] = useState(""),
    [coordLat, setCoordLat] = useState(""),
    [coordLon, setCoordLon] = useState(""),
    [coordTz, setCoordTz] = useState("Europe/Madrid"),
    [hydrated, setHydrated] = useState(false),
    [mobileNav, setMobileNav] = useState(false),
    [sessions, setSessions] = useState<Session[]>([]),
    [sessionName, setSessionName] = useState("Practice"),
    [sessionDate, setSessionDate] = useState(""),
    [sessionTime, setSessionTime] = useState("10:00"),
    [duration, setDuration] = useState(60),
    [gustLimit, setGustLimit] = useState(40),
    [sessionError, setSessionError] = useState(""),
    [history, setHistory] = useState<HistoryPoint[]>([]),
    [historyLoading, setHistoryLoading] = useState(false),
    [historyMessage, setHistoryMessage] = useState(""),
    [historyRefresh, setHistoryRefresh] = useState(0),
    [historyValidHour, setHistoryValidHour] = useState(0),
    [historyMetric, setHistoryMetric] = useState<
      "temperature" | "precipitation" | "wind"
    >("temperature"),
    [clock, setClock] = useState(Date.now()),
    [editingSessionId, setEditingSessionId] = useState<string | null>(null),
    [sessionFeedback, setSessionFeedback] = useState(""),
    [deletedSession, setDeletedSession] = useState<Session | null>(null),
    [storageMessage, setStorageMessage] = useState(""),
    [canSave, setCanSave] = useState(true),
    [backupMessage, setBackupMessage] = useState("");
  useModalFocus(searchOpen || settings);
  useEffect(() => {
    try {
      const saved = JSON.parse(
        localStorage.getItem("pitwall-preferences") || "null",
      );
      if (saved) {
        const preferences = parsePreferences(saved);
        setFavorites(preferences.favorites);
        setTrack(preferences.track);
        setDisabled(preferences.disabled);
        setThreshold(preferences.threshold);
        setGustLimit(preferences.gustLimit);
      }
    } catch {
      setCanSave(false);
      setStorageMessage(
        "Saved preferences could not be read. Automatic saving is paused to preserve the existing data. Export your current plans or restore a Pitwall backup in preferences.",
      );
    }
    try {
      const ss = JSON.parse(localStorage.getItem("pitwall-sessions") || "[]");
      if (!Array.isArray(ss) || !ss.every(validSession))
        throw Error("Invalid saved sessions");
      setSessions(ss);
    } catch {
      setCanSave(false);
      setStorageMessage(
        "Saved sessions could not be read. Automatic saving is paused to preserve the existing data. Restore a Pitwall backup in preferences to resume saving.",
      );
    }
    setHydrated(true);
  }, []);
  useEffect(() => {
    if (hydrated && canSave)
      try {
        localStorage.setItem(
          "pitwall-preferences",
          JSON.stringify({ favorites, track, disabled, threshold, gustLimit }),
        );
        localStorage.setItem("pitwall-sessions", JSON.stringify(sessions));
        setStorageMessage("");
      } catch {
        setStorageMessage(
          "This browser could not save your latest changes. Keep Pitwall open and export a backup in preferences; storage may be full or blocked.",
        );
      }
  }, [
    hydrated,
    canSave,
    favorites,
    track,
    disabled,
    threshold,
    gustLimit,
    sessions,
  ]);
  useEffect(() => {
    if (!hydrated) return;
    const controller = new AbortController();
    setLoading(true);
    setError("");
    setData((previous) =>
      previous &&
      previous.location.lat.toFixed(4) === track.lat.toFixed(4) &&
      previous.location.lon.toFixed(4) === track.lon.toFixed(4) &&
      previous.location.timezone === track.timezone
        ? previous
        : null,
    );
    const force = refreshRequested.current;
    refreshRequested.current = false;
    apiFetch(
      `/api/weather?lat=${track.lat}&lon=${track.lon}&timezone=${encodeURIComponent(track.timezone)}${force ? "&refresh=1" : ""}`,
      { signal: controller.signal },
    )
      .then(async (r) => {
        const j: any = await r.json();
        if (!r.ok && !Array.isArray(j.forecasts))
          throw Error(
            j.error || "Weather could not be loaded. Please try again.",
          );
        return j as WeatherResponse;
      })
      .then((d) => {
        setData(d);
        if (!d.forecasts?.length)
          setError(
            "No forecast sources returned data. Check source status and try again.",
          );
      })
      .catch((e) => {
        if (e.name !== "AbortError") setError(e.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [hydrated, track.id, track.lat, track.lon, track.timezone, refresh]);
  useEffect(() => {
    if (!hydrated) return;
    const nextHour = (Math.floor(Date.now() / 3600000) + 1) * 3600;
    setSessionDate(day(nextHour, track.timezone));
    setSessionTime(time(nextHour, track.timezone));
    setSelectedDay("");
    setEditingSessionId(null);
    setSessionFeedback("");
    setSessionError("");
    setDeletedSession(null);
  }, [hydrated, track.id, track.timezone]);
  useEffect(() => {
    const i = setInterval(() => setRefresh((v) => v + 1), 10 * 60 * 1000);
    return () => clearInterval(i);
  }, []);
  useEffect(() => {
    const tick = () => setClock(Date.now());
    const connected = () => {
      tick();
      refreshRequested.current = true;
      setRefresh((v) => v + 1);
    };
    const interval = setInterval(tick, 60000);
    window.addEventListener("focus", tick);
    window.addEventListener("online", connected);
    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", tick);
      window.removeEventListener("online", connected);
    };
  }, []);
  useEffect(() => {
    if (!searchOpen || query.trim().length < 2) {
      setSearchResults([]);
      setSearchError("");
      setSearching(false);
      return;
    }
    const controller = new AbortController();
    const timer = setTimeout(() => {
      setSearching(true);
      setSearchError("");
      apiFetch(`/api/search?q=${encodeURIComponent(query.trim())}`, {
        signal: controller.signal,
      })
        .then(async (r) => {
          const j: any = await r.json();
          if (!r.ok) throw Error(j.error || "Location search is unavailable.");
          return j;
        })
        .then((j) => {
          const rows = Array.isArray(j) ? j : j.results || [];
          const locations = rows
            .map(searchTrack)
            .filter((track: Track | null): track is Track => track !== null);
          setSearchResults(locations);
          if (rows.length && !locations.length)
            setSearchError(
              "The provider returned no locations with valid coordinates and timezones. Add exact coordinates instead.",
            );
        })
        .catch((e) => {
          if (e.name !== "AbortError") setSearchError(e.message);
        })
        .finally(() => {
          if (!controller.signal.aborted) setSearching(false);
        });
    }, 350);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query, searchOpen]);
  useEffect(() => {
    if (view !== "history") return;
    const controller = new AbortController();
    setHistoryLoading(true);
    setHistoryMessage("");
    apiFetch(`/api/history?lat=${track.lat}&lon=${track.lon}`, {
      signal: controller.signal,
    })
      .then(async (r) => {
        const j: any = await r.json();
        if (!r.ok) throw Error(j.error || "History is not available.");
        return j;
      })
      .then((j) => {
        setHistory(Array.isArray(j) ? j : j.points || j.history || []);
        setHistoryMessage(j.message || "");
      })
      .catch((e) => {
        if (e.name !== "AbortError") {
          setHistory([]);
          setHistoryMessage(e.message);
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setHistoryLoading(false);
      });
    return () => controller.abort();
  }, [view, track.lat, track.lon, historyRefresh, data?.fetchedAt]);
  useEffect(() => {
    if (!searchOpen && !settings) return;
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setSearchOpen(false);
        setSettings(false);
      }
    };
    document.addEventListener("keydown", key);
    return () => document.removeEventListener("keydown", key);
  }, [searchOpen, settings]);
  const active = useMemo(
    () => (data?.forecasts || []).filter((f) => !disabled.includes(f.id)),
    [data, disabled],
  );
  const consensus = useMemo(
    () => buildConsensus(active, threshold),
    [active, threshold],
  );
  const now = clock / 1000;
  const future = consensus.filter((h) => h.time + 3600 > now);
  const current = future.find((h) => h.time <= now);
  const days = [...new Set(future.map((h) => day(h.time, track.timezone)))];
  const shownDay = days.includes(selectedDay)
    ? selectedDay
    : days[0] || day(now, track.timezone);
  const hours = future
    .filter((h) => day(h.time, track.timezone) === shownDay)
    .slice(0, horizon);
  const upcoming = future.slice(0, 12);
  const hasRainEvidence = future.slice(0, 24).some((h) => h.wetShare !== null);
  const fullRainOutlook =
    future.length >= 24 &&
    future[0].time <= now &&
    future
      .slice(0, 24)
      .every(
        (h, i) =>
          h.wetShare !== null &&
          active.every((f) =>
            f.hours.some(
              (point) => point.time === h.time && point.precipitation !== null,
            ),
          ) &&
          (i === 0 || h.time === future[i - 1].time + 3600),
      );
  const wetHour = future
    .slice(0, 24)
    .find((h) => h.rainMax !== null && h.rainMax >= threshold);
  const wetSignalSources = wetHour
    ? active.filter((f) =>
        f.hours.some(
          (h) =>
            h.time === wetHour.time &&
            h.precipitation !== null &&
            h.precipitation >= threshold,
        ),
      )
    : [];
  const dissent = upcoming.find(
    (h) => h.agreement === "split" || h.agreement === "mixed",
  );
  const availableCount = data?.forecasts.length || 0;
  const families = [...new Set(active.map((f) => f.family))].length;
  const cachedSources =
    data?.statuses.filter((s) => s.status === "cached") ?? [];
  const oldestFetch = min(active.map((f) => Date.parse(f.fetchedAt) / 1000));
  const oldestAge =
    oldestFetch === null
      ? null
      : Math.max(0, Math.floor((now - oldestFetch) / 60));
  const first = upcoming[0];
  const headline = !active.length
    ? "No sources enabled"
    : !first
      ? "No forecast available"
      : first.wetShare === null
        ? "Rain data unavailable"
        : dissent
          ? `Models split on rain around ${time(dissent.time, track.timezone)}`
          : wetHour
            ? `Rain in the forecast around ${time(wetHour.time, track.timezone)}`
            : fullRainOutlook
              ? "No rain forecast in the next 24 hours"
              : "Rain outlook incomplete";
  const narrative = !active.length
    ? "Turn on a source in preferences to see the forecast."
    : !first
      ? "No forecast hours came back for this location."
      : first.wetShare === null
        ? "No source reported rainfall for this hour, so wet or dry can't be judged."
        : first.count < 3
          ? "Fewer than three model families are reporting, so agreement is limited."
          : dissent
            ? `${dissent.wetCount} of ${dissent.count} model families expect at least ${threshold} mm in that hour. Keep an eye on the radar.`
            : wetHour
              ? `${wetSignalSources.map((f) => f.name).join(", ")} ${wetSignalSources.length === 1 ? "reaches" : "reach"} ${threshold} mm/h; ${wetHour.wetCount} of ${wetHour.count} model families agree.`
              : fullRainOutlook
                ? `No source reaches ${threshold} mm/h. Local showers can still be missed.`
                : "Some rain data or hours are missing. Check individual sources before planning.";
  function refreshWeather() {
    refreshRequested.current = true;
    setRefresh((v) => v + 1);
  }
  function choose(t: Track) {
    setTrack(t);
    setFavorites((fs) => (fs.some((f) => f.id === t.id) ? fs : [...fs, t]));
    setSearchOpen(false);
    setQuery("");
    setMobileNav(false);
  }
  function toggleSource(id: string) {
    setDisabled((a) =>
      a.includes(id) ? a.filter((x) => x !== id) : [...a, id],
    );
  }
  function exportForecast() {
    if (!data) return;
    const rows = [
      [
        "location",
        "latitude",
        "longitude",
        "provider",
        "model",
        "family",
        "fetched_at_utc",
        "forecast_time_utc",
        "air_temperature_C",
        "precipitation_mm_hour",
        "rain_probability_pct",
        "wind_km_h",
        "gust_km_h",
        "humidity_pct",
        "dewpoint_C",
        "cloud_pct",
        "pressure_hPa",
        "visibility_m",
      ],
    ];
    data.forecasts.forEach((f) =>
      f.hours.forEach((h) =>
        rows.push([
          track.name,
          track.lat,
          track.lon,
          f.provider,
          f.name,
          f.family,
          f.fetchedAt,
          new Date(h.time * 1000).toISOString(),
          h.temperature,
          h.precipitation,
          h.probability,
          h.wind,
          h.gust,
          h.humidity,
          h.dewpoint,
          h.cloud,
          h.pressure,
          h.visibility,
        ] as any),
      ),
    );
    download(
      `pitwall-${track.id}-${day(now, "UTC")}.csv`,
      rows.map((r) => r.map(csvEscape).join(",")).join("\r\n"),
    );
  }
  function addCoordinates() {
    setSearchError("");
    const lat = Number(coordLat),
      lon = Number(coordLon);
    if (
      !coordName.trim() ||
      !coordLat.trim() ||
      !coordLon.trim() ||
      !Number.isFinite(lat) ||
      Math.abs(lat) > 90 ||
      !Number.isFinite(lon) ||
      Math.abs(lon) > 180
    ) {
      setSearchError(
        "Enter a name and valid latitude (−90 to 90) and longitude (−180 to 180).",
      );
      return;
    }
    try {
      choose(
        coordinateTrack(coordName, lat, lon, coordTz, [...favorites, track]),
      );
    } catch {
      setSearchError("Enter a valid IANA timezone, such as Europe/Paris.");
    }
  }
  function sessionStats(s: Session) {
    const start = localEpoch(
        s.date,
        s.time,
        s.track?.timezone ?? track.timezone,
      ),
      end = start + s.duration * 60;
    const hs = consensus.filter((h) => h.time < end && h.time + 3600 > start);
    const coverage = summarizeSession(consensus, start, end);
    const sources = sessionSources(active, start, end, threshold);
    const complete =
      coverage.coverage === 1 &&
      sources.length > 0 &&
      sources.every((source) => source.rainCoverage === 1);
    const rawDisagreement = hs.some((h) => {
      const rain = sources
        .flatMap((source) =>
          source.hours.filter((hour) => hour.time === h.time),
        )
        .map((hour) => hour.precipitation)
        .filter(
          (value): value is number => value !== null && Number.isFinite(value),
        );
      return (
        rain.some((value) => value >= threshold) &&
        rain.some((value) => value < threshold)
      );
    });
    return {
      start,
      end,
      hs,
      complete,
      sources,
      anyWet: sources.some((source) => source.wetIntervals > 0),
      partialGusts: sources.some((source) => source.gustCoverage < 1),
      rain: max(hs.map((h) => h.rainMax)),
      gust: max(hs.map((h) => h.gust)),
      temp: mean(hs.map((h) => h.temperature)),
      share: max(hs.map((h) => h.wetShare)),
      split: rawDisagreement,
    };
  }
  const draft: Session = {
    id: "draft",
    name: sessionName,
    trackId: track.id,
    date: sessionDate,
    time: sessionTime,
    duration,
    track,
  };
  const stats = sessionStats(draft);
  const localSessions = sessions
    .filter((s) => s.trackId === track.id)
    .sort((a, b) => `${a.date}T${a.time}`.localeCompare(`${b.date}T${b.time}`));
  const dryWindows = useMemo(
    () => getDryWindows(active, now, threshold, gustLimit, duration),
    [active, now, threshold, gustLimit, duration],
  );
  const preferences = { favorites, track, disabled, threshold, gustLimit };
  function saveSession() {
    setSessionError("");
    setSessionFeedback("");
    const session: Session = {
      ...draft,
      id: editingSessionId ?? `session-${crypto.randomUUID()}`,
      name: sessionName.trim(),
    };
    if (
      !validSession(session) ||
      !Number.isFinite(localEpoch(session.date, session.time, track.timezone))
    ) {
      setSessionError(
        "Enter a valid name, date, duration and local time. Skipped or repeated daylight-saving times cannot be used; choose an unambiguous local hour.",
      );
      return;
    }
    const duplicate = sessions.find(
      (s) =>
        s.id !== session.id &&
        s.trackId === session.trackId &&
        s.name === session.name &&
        s.date === session.date &&
        s.time === session.time &&
        s.duration === session.duration,
    );
    if (duplicate) {
      setSessionError(
        "This session is already saved. Select it below to edit it.",
      );
      return;
    }
    setSessions((saved) =>
      editingSessionId
        ? saved.map((s) => (s.id === editingSessionId ? session : s))
        : [...saved, session],
    );
    setEditingSessionId(session.id);
    setSessionFeedback(
      `${editingSessionId ? "Updated" : "Saved"} ${session.name} for ${niceDate(session.date)} at ${session.time}.`,
    );
  }
  function exportCalendar() {
    try {
      download(
        `pitwall-${track.id}-sessions.ics`,
        sessionsCalendar(localSessions, [...TRACKS, ...favorites, track]),
        "text/calendar;charset=utf-8",
      );
      setSessionFeedback(
        "Calendar file downloaded. Open it to add these sessions to your calendar.",
      );
    } catch (error) {
      setSessionError(
        error instanceof Error
          ? error.message
          : "The calendar could not be exported.",
      );
    }
  }
  async function importBackup(file: File | undefined) {
    if (!file) return;
    setBackupMessage("");
    try {
      if (file.size > 1048576)
        throw new Error("Choose a Pitwall backup smaller than 1 MB.");
      const merged = mergeBackup(
        preferences,
        sessions,
        parseBackup(await file.text()),
        () => `session-${crypto.randomUUID()}`,
      );
      setFavorites(merged.preferences.favorites);
      setTrack(merged.preferences.track);
      setDisabled(merged.preferences.disabled);
      setThreshold(merged.preferences.threshold);
      setGustLimit(merged.preferences.gustLimit);
      setSessions(merged.sessions);
      setEditingSessionId(null);
      setCanSave(true);
      setBackupMessage(
        `Backup restored: ${merged.added} session${merged.added === 1 ? "" : "s"} added. Your existing plans were kept.`,
      );
    } catch (error) {
      setBackupMessage(
        error instanceof Error
          ? error.message
          : "The backup could not be imported. Existing data are unchanged.",
      );
    } finally {
      if (backupInput.current) backupInput.current.value = "";
    }
  }
  function exportHistory() {
    download(
      `pitwall-${track.id}-history.csv`,
      toCsv([
        [
          "location",
          "latitude",
          "longitude",
          "timezone",
          "source",
          "fetched_at_utc",
          "forecast_time_utc",
          "temperature_C",
          "precipitation_mm_hour",
          "wind_km_h",
        ],
        ...history.map((p) => [
          track.name,
          track.lat,
          track.lon,
          track.timezone,
          p.provider,
          p.fetchedAt,
          new Date(p.forecastTime * 1000).toISOString(),
          p.temperature,
          p.precipitation,
          p.wind,
        ]),
      ]),
    );
  }
  const filteredTracks = TRACKS.filter((t) =>
    `${t.name} ${t.country}`.toLowerCase().includes(query.toLowerCase()),
  );
  const dateLabel = new Intl.DateTimeFormat("en-GB", {
    timeZone: track.timezone,
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format();
  const validHistoryHours = [
    ...new Set(history.map((p) => p.forecastTime)),
  ].sort((a, b) => a - b);
  const selectedHistoryHour = validHistoryHours.includes(historyValidHour)
    ? historyValidHour
    : validHistoryHours.find((t) => t + 3600 > now) ||
      validHistoryHours[0] ||
      0;
  const historyForHour = history.filter(
    (p) => p.forecastTime === selectedHistoryHour,
  );
  const historyLabel =
    historyMetric === "temperature"
      ? "air temperature"
      : historyMetric === "precipitation"
        ? "hourly rainfall"
        : "wind speed";
  const historyUnit =
    historyMetric === "temperature"
      ? "°C"
      : historyMetric === "precipitation"
        ? "mm/h"
        : "km/h";
  const historySourceIds = [...new Set(historyForHour.map((p) => p.provider))];
  const historySeries = historySourceIds.map((id) => ({
    id,
    points: historyForHour
      .filter((p) => p.provider === id)
      .map((p) => ({
        time: new Date(p.fetchedAt).getTime() / 1000,
        value: p[historyMetric],
      }))
      .sort((a, b) => a.time - b.time),
  }));
  const hasHistoryEvolution = historySeries.some(
    (series) =>
      new Set(series.points.filter((p) => p.value !== null).map((p) => p.time))
        .size >= 2,
  );
  const historyByFetch = [...new Set(historyForHour.map((p) => p.fetchedAt))]
    .map((f) => {
      const ps = historyForHour.filter((p) => p.fetchedAt === f);
      const row: Record<string, any> = { time: new Date(f).getTime() / 1000 };
      ps.forEach((p) => (row[p.provider] = p[historyMetric]));
      return row;
    })
    .sort((a, b) => a.time - b.time);

  return {
    pwa,
    backupInput,
    view,
    setView,
    track,
    favorites,
    setFavorites,
    data,
    loading,
    error,
    disabled,
    threshold,
    setThreshold,
    settings,
    setSettings,
    setSelectedDay,
    horizon,
    setHorizon,
    searchOpen,
    setSearchOpen,
    query,
    setQuery,
    searching,
    searchResults,
    searchError,
    coordinateMode,
    setCoordinateMode,
    coordName,
    setCoordName,
    coordLat,
    setCoordLat,
    coordLon,
    setCoordLon,
    coordTz,
    setCoordTz,
    mobileNav,
    setMobileNav,
    sessions,
    setSessions,
    sessionName,
    setSessionName,
    sessionDate,
    setSessionDate,
    sessionTime,
    setSessionTime,
    duration,
    setDuration,
    gustLimit,
    setGustLimit,
    sessionError,
    setSessionError,
    history,
    historyLoading,
    historyMessage,
    setHistoryRefresh,
    setHistoryValidHour,
    historyMetric,
    setHistoryMetric,
    editingSessionId,
    setEditingSessionId,
    sessionFeedback,
    setSessionFeedback,
    deletedSession,
    setDeletedSession,
    storageMessage,
    backupMessage,
    setBackupMessage,
    active,
    now,
    future,
    current,
    days,
    shownDay,
    hours,
    upcoming,
    hasRainEvidence,
    fullRainOutlook,
    wetHour,
    wetSignalSources,
    dissent,
    availableCount,
    families,
    cachedSources,
    oldestFetch,
    oldestAge,
    narrative,
    headline,
    appearance,
    refreshWeather,
    choose,
    toggleSource,
    exportForecast,
    addCoordinates,
    sessionStats,
    draft,
    stats,
    localSessions,
    dryWindows,
    preferences,
    saveSession,
    exportCalendar,
    importBackup,
    exportHistory,
    filteredTracks,
    dateLabel,
    validHistoryHours,
    selectedHistoryHour,
    historyLabel,
    historyUnit,
    historySeries,
    hasHistoryEvolution,
    historyByFetch,
  };
}
