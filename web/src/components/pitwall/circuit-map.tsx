import { apiFetch } from "@/lib/browser-api";
import type { GeometryResponse, RadarResponse, Track } from "@/lib/contracts";
import { usePitwall } from "@/lib/pitwall-context";
import * as L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Layers, Maximize, Pause, Play, RefreshCw } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { radarWindow } from "@/lib/radar-window";

function localTime(t: number, tz: string) {
  return new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: tz,
  }).format(t * 1000);
}
export default function CircuitMap({ track }: { track: Track }) {
  const { appearance } = usePitwall();
  const accent = appearance.colors.accent;
  const casing = appearance.colors.trackCasing;
  const initialCenter = useRef<L.LatLngTuple>([track.lat, track.lon]);
  const node = useRef<HTMLDivElement>(null),
    map = useRef<L.Map | null>(null),
    radarLayer = useRef<L.TileLayer | null>(null),
    geometryLayer = useRef<L.FeatureGroup | null>(null),
    coverageLayer = useRef<L.TileLayer | null>(null);
  const [radar, setRadar] = useState<RadarResponse | null>(null),
    [geometry, setGeometry] = useState<GeometryResponse | null>(null),
    [frame, setFrame] = useState(0),
    [playing, setPlaying] = useState(false),
    [opacity, setOpacity] = useState(65),
    [coverage, setCoverage] = useState(true),
    [radarOn, setRadarOn] = useState(true),
    [mapReady, setMapReady] = useState(false),
    [error, setError] = useState(""),
    [radarError, setRadarError] = useState(""),
    [tileError, setTileError] = useState(""),
    [geoLoading, setGeoLoading] = useState(true),
    [radarVersion, setRadarVersion] = useState(0),
    [rangeFrom, setRangeFrom] = useState<number | null>(null),
    [rangeTo, setRangeTo] = useState<number | null>(null),
    [clock, setClock] = useState(Date.now());
  const windowRange = radarWindow(radar?.frames ?? [], rangeFrom, rangeTo);
  const selectedFrame = Math.min(
    windowRange.end,
    Math.max(windowRange.start, frame),
  );
  useEffect(() => {
    if (!node.current) return;
    let resize: ResizeObserver | undefined;
    try {
      const m = L.map(node.current, {
        zoomControl: false,
        scrollWheelZoom: false,
        attributionControl: true,
      }).setView(initialCenter.current, 10);
      L.control.zoom({ position: "bottomleft" }).addTo(m);
      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        className: "base-map-tiles",
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>',
      })
        .on("tileerror", () => setTileError("Some map tiles could not load."))
        .addTo(m);
      map.current = m;
      setMapReady(true);
      resize = new ResizeObserver(() => m.invalidateSize());
      resize.observe(node.current);
    } catch {
      setError(
        "The map could not be initialized. Reload Pitwall to try again.",
      );
    }
    return () => {
      resize?.disconnect();
      map.current?.remove();
      map.current = null;
      setMapReady(false);
    };
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    setRadarError("");
    apiFetch("/api/radar", { signal: controller.signal })
      .then(async (r) => {
        const j: any = await r.json();
        if (!r.ok) throw Error(j.error || "Radar is unavailable.");
        return j as RadarResponse;
      })
      .then((d) => {
        if (!d.frames?.length)
          throw Error("No recent radar frames are available.");
        setRadar(d);
        setFrame(d.frames.length - 1);
      })
      .catch((e) => {
        if (e.name !== "AbortError") setRadarError(e.message);
      });
    return () => controller.abort();
  }, [radarVersion]);
  useEffect(() => {
    const controller = new AbortController();
    setGeometry(null);
    setGeoLoading(true);
    setPlaying(false);
    apiFetch(
      `/api/geometry?lat=${track.lat}&lon=${track.lon}${track.custom ? "" : `&trackId=${encodeURIComponent(track.id)}`}`,
      {
        signal: controller.signal,
      },
    )
      .then(async (r) => {
        const j: any = await r.json();
        if (!r.ok) throw Error(j.error || "Circuit geometry is unavailable.");
        return j;
      })
      .then(setGeometry)
      .catch((e) => {
        if (e.name !== "AbortError")
          setGeometry({
            coordinates: [],
            source: "OpenStreetMap",
            attribution: "© OpenStreetMap contributors",
            fetchedAt: new Date().toISOString(),
            message: e.message,
          });
      })
      .finally(() => {
        if (!controller.signal.aborted) setGeoLoading(false);
      });
    return () => controller.abort();
  }, [track.id, track.lat, track.lon, track.custom]);
  useEffect(() => {
    if (!mapReady || !map.current) return;
    if (geometryLayer.current) map.current.removeLayer(geometryLayer.current);
    const group = L.featureGroup().addTo(map.current);
    const tooltip = document.createElement("span");
    tooltip.textContent = track.name;
    L.circleMarker([track.lat, track.lon], {
      radius: 5,
      color: accent,
      fillColor: accent,
      fillOpacity: 1,
      weight: 2,
    })
      .bindTooltip(tooltip)
      .addTo(group);
    geometry?.coordinates?.forEach((line) => {
      if (line.length > 1) {
        L.polyline(line, { color: casing, weight: 7, opacity: 1 }).addTo(group);
        L.polyline(line, { color: accent, weight: 3, opacity: 1 }).addTo(group);
      }
    });
    geometryLayer.current = group;
    map.current.setView([track.lat, track.lon], 10);
  }, [mapReady, track, geometry, accent, casing]);
  useEffect(() => {
    if (!mapReady || !map.current) return;
    if (radarLayer.current) map.current.removeLayer(radarLayer.current);
    if (!radar || !radarOn) return;
    const f = radar.frames[selectedFrame];
    if (!f) return;
    const layer = L.tileLayer(
      `${radar.host}${f.path}/256/{z}/{x}/{y}/2/1_1.png`,
      {
        opacity: 0.65,
        maxNativeZoom: 7,
        maxZoom: 19,
        attribution: '<a href="https://www.rainviewer.com/">RainViewer</a>',
        zIndex: 5,
      },
    );
    layer.on("tileerror", () =>
      setTileError(
        "Some radar tiles could not load; blank areas may be missing data.",
      ),
    );
    layer.addTo(map.current);
    radarLayer.current = layer;
    return () => {
      if (map.current) map.current.removeLayer(layer);
    };
  }, [mapReady, radar, selectedFrame, radarOn]);
  useEffect(() => {
    radarLayer.current?.setOpacity(opacity / 100);
  }, [opacity, mapReady, radar, selectedFrame, radarOn]);
  useEffect(() => {
    if (!mapReady || !map.current) return;
    if (coverageLayer.current) map.current.removeLayer(coverageLayer.current);
    if (!coverage || !radar) return;
    const url =
      radar.coverageUrl ||
      `${radar.host}/v2/coverage/0/256/{z}/{x}/{y}/0/0_0.png`;
    const layer = L.tileLayer(url, {
      opacity: 0.6,
      maxNativeZoom: 7,
      maxZoom: 19,
      zIndex: 6,
    })
      .on("tileerror", () =>
        setTileError(
          "Coverage mask could not load; radar coverage is unverified.",
        ),
      )
      .addTo(map.current);
    coverageLayer.current = layer;
    return () => {
      if (map.current) map.current.removeLayer(layer);
    };
  }, [mapReady, coverage, radar]);
  useEffect(() => {
    if (!playing || !radar) return;
    const timer = setInterval(
      () =>
        setFrame((n) =>
          n < windowRange.start || n >= windowRange.end
            ? windowRange.start
            : n + 1,
        ),
      900,
    );
    return () => clearInterval(timer);
  }, [playing, radar, windowRange.start, windowRange.end]);
  useEffect(() => {
    const timer = setInterval(
      () => setRadarVersion((v) => v + 1),
      5 * 60 * 1000,
    );
    const clockTimer = setInterval(() => setClock(Date.now()), 60 * 1000);
    return () => {
      clearInterval(timer);
      clearInterval(clockTimer);
    };
  }, []);
  const current = radar?.frames[selectedFrame];
  const age = current
    ? Math.max(0, Math.round((clock / 1000 - current.time) / 60))
    : null;
  const latestTime = radar?.frames[radar.frames.length - 1]?.time;
  const stale = latestTime !== undefined && clock / 1000 - latestTime > 20 * 60;
  return (
    <section className="panel map-panel">
      <div className="panel-head">
        <h2>Radar</h2>
        <span className={`panel-hint ${stale ? "text-warn" : ""}`}>
          {current
            ? `${stale ? "Stale · " : ""}${age} min ago`
            : "Observed, past 2 h"}
        </span>
      </div>
      <div className="map-stage">
        <div
          ref={node}
          className="circuit-map"
          aria-label={`Weather radar map around ${track.name}`}
        />
        {error && <div className="map-error">{error}</div>}
        <div className="map-top-controls">
          <button
            onClick={() => {
              if (map.current) {
                if (geometry?.coordinates.length && geometryLayer.current)
                  map.current.fitBounds(geometryLayer.current.getBounds(), {
                    padding: [35, 35],
                    maxZoom: 15,
                  });
                else map.current.setView([track.lat, track.lon], 14);
              }
            }}
            title="Fit circuit"
            aria-label="Fit circuit"
          >
            <Maximize size={15} />
          </button>
          <button
            onClick={() => map.current?.setView([track.lat, track.lon], 8)}
            title="Show wider weather"
            aria-label="Show wider weather"
          >
            <Layers size={15} />
          </button>
        </div>
        <div className="map-key" aria-hidden="true">
          <span className="radar-scale" />
          Light to heavy
        </div>
      </div>
      <div className="radar-range">
        <label>
          From
          <select
            aria-label="Radar start time"
            disabled={!radar?.frames.length}
            value={radar?.frames[windowRange.start]?.time ?? ""}
            onChange={(event) => {
              const value = Number(event.target.value);
              setRangeFrom(value);
              if (radar && value > radar.frames[windowRange.end].time)
                setRangeTo(value);
              setPlaying(false);
              setFrame(
                radar?.frames.findIndex((item) => item.time === value) ?? 0,
              );
            }}
          >
            <option value="" disabled>
              Start time
            </option>
            {radar?.frames.map((item) => (
              <option key={item.time} value={item.time}>
                {new Intl.DateTimeFormat("en-GB", {
                  day: "numeric",
                  month: "short",
                  hour: "2-digit",
                  minute: "2-digit",
                  timeZone: track.timezone,
                }).format(item.time * 1000)}
              </option>
            ))}
          </select>
        </label>
        <label>
          To
          <select
            aria-label="Radar end time"
            disabled={!radar?.frames.length}
            value={radar?.frames[windowRange.end]?.time ?? ""}
            onChange={(event) => {
              const value = Number(event.target.value);
              setRangeTo(value);
              if (radar && value < radar.frames[windowRange.start].time)
                setRangeFrom(value);
              setPlaying(false);
              setFrame(
                radar?.frames.findIndex((item) => item.time === value) ?? 0,
              );
            }}
          >
            <option value="" disabled>
              End time
            </option>
            {radar?.frames.map((item) => (
              <option key={item.time} value={item.time}>
                {new Intl.DateTimeFormat("en-GB", {
                  day: "numeric",
                  month: "short",
                  hour: "2-digit",
                  minute: "2-digit",
                  timeZone: track.timezone,
                }).format(item.time * 1000)}
              </option>
            ))}
          </select>
        </label>
        <button
          className="button secondary"
          onClick={() => {
            setRangeFrom(null);
            setRangeTo(null);
            setPlaying(false);
            setFrame((radar?.frames.length ?? 1) - 1);
          }}
          disabled={!radar}
        >
          Full history
        </button>
      </div>
      <p className="radar-history-note">
        Available radar history only · times in{" "}
        {track.timezone.replaceAll("_", " ")}
      </p>
      <div className="radar-playback">
        <button
          className="play-button"
          disabled={
            !radar || !!radarError || windowRange.start === windowRange.end
          }
          onClick={() => setPlaying((v) => !v)}
          aria-label={playing ? "Pause radar" : "Play radar"}
        >
          {playing ? <Pause size={14} /> : <Play size={14} />}
        </button>
        <div className="radar-timeline">
          <input
            aria-label="Radar frame"
            type="range"
            min={windowRange.start}
            max={windowRange.end}
            value={selectedFrame}
            disabled={!radar}
            onChange={(e) => {
              setPlaying(false);
              setFrame(+e.target.value);
            }}
          />
        </div>
        <strong className="radar-time">
          {current ? localTime(current.time, track.timezone) : "—"}
        </strong>
        <button
          className="icon-button"
          onClick={() => setRadarVersion((v) => v + 1)}
          aria-label="Refresh radar"
        >
          <RefreshCw size={14} />
        </button>
      </div>
      <div className="map-options">
        <label>
          <input
            type="checkbox"
            checked={radarOn}
            onChange={(e) => setRadarOn(e.target.checked)}
          />{" "}
          Radar
        </label>
        <label>
          <input
            type="checkbox"
            checked={coverage}
            onChange={(e) => setCoverage(e.target.checked)}
          />{" "}
          Coverage mask
        </label>
        <label className="opacity-label">
          Opacity{" "}
          <input
            type="range"
            min="15"
            max="95"
            value={opacity}
            onChange={(e) => setOpacity(+e.target.value)}
            aria-label="Radar opacity"
          />
        </label>
      </div>
      {(radarError || tileError) && (
        <p className="inline-warning">{radarError || tileError}</p>
      )}
      <p className="fineprint">
        {geoLoading
          ? "Loading circuit outline…"
          : geometry?.coordinates.length
            ? `Outline: ${geometry.source}, ${geometry.attribution}.`
            : geometry?.message || "No circuit outline found."}{" "}
        Dark areas have no radar coverage; clear areas aren’t proof of a dry
        track.
      </p>
    </section>
  );
}
