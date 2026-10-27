import { apiFetch } from "@/lib/browser-api";
import type { GeometryResponse, RadarResponse, Track } from "@/lib/contracts";
import { usePitwall } from "@/lib/pitwall-context";
import * as L from "leaflet";
import "leaflet/dist/leaflet.css";
import {
  Layers,
  Maximize,
  Pause,
  Play,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { radarWindow } from "@/lib/radar-window";
import { RadarPlayback, type RadarSlot } from "@/lib/radar-playback";

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
    player = useRef<RadarPlayback | null>(null),
    geometryLayer = useRef<L.FeatureGroup | null>(null),
    coverageLayer = useRef<L.TileLayer | null>(null);
  const [radar, setRadar] = useState<RadarResponse | null>(null),
    [geometry, setGeometry] = useState<GeometryResponse | null>(null),
    [frame, setFrame] = useState(0),
    [playing, setPlaying] = useState(false),
    [buffering, setBuffering] = useState(false),
    [displayed, setDisplayed] = useState<{ time: number; path: string } | null>(
      null,
    ),
    [readyTime, setReadyTime] = useState<number | null>(null),
    [speed, setSpeed] = useState(1),
    [smooth, setSmooth] = useState(true),
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
  const radarRef = useRef<RadarResponse | null>(null);
  useEffect(() => {
    radarRef.current = radar;
  }, [radar]);
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
        player.current?.retryFailed();
        setTileError("");
        setPlaying(false);
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
    if (!radar?.host || !radarOn) return;
    const m = map.current;
    const create = (timestamp: number): RadarSlot => {
      const f = radarRef.current?.frames.find(
        (frame) => frame.time === timestamp,
      );
      if (!f) throw new Error("This radar scan is no longer available.");
      const layer = L.tileLayer(
        `${radarRef.current!.host}${f.path}/512/{z}/{x}/{y}/2/1_1.png`,
        {
          opacity: 0,
          maxNativeZoom: 7,
          maxZoom: 19,
          zIndex: 5,
          className: "radar-scan",
          attribution: '<a href="https://www.rainviewer.com/">RainViewer</a>',
          keepBuffer: 1,
        },
      );
      let failed = false,
        removed = false;
      const waiting = new Set<(success: boolean) => void>();
      const complete = (success: boolean) => {
        for (const resolve of waiting) resolve(success);
        waiting.clear();
      };
      layer.on("loading", () => {
        failed = false;
      });
      layer.on("tileerror", () => {
        failed = true;
        setTileError(
          "A radar scan could not load. Keeping the last complete scan.",
        );
      });
      layer.on("load", () => complete(!failed));
      layer.addTo(m);
      return {
        layer: {
          setOpacity: (value) => layer.setOpacity(value),
          remove: () => {
            removed = true;
            complete(false);
            layer.remove();
          },
        },
        retryFailed: () => {
          if (failed && !removed) {
            failed = false;
            layer.redraw();
          }
        },
        ready: () => {
          if (removed || !layer.isLoading())
            return Promise.resolve(!removed && !failed);
          return new Promise((resolve) => {
            const done = (success: boolean) => {
              clearTimeout(timeout);
              waiting.delete(done);
              resolve(success);
            };
            const timeout = setTimeout(() => {
              setTileError(
                "Radar is slow to load. Keeping the last complete scan.",
              );
              done(false);
            }, 10000);
            waiting.add(done);
          });
        },
      };
    };
    const sequence = new RadarPlayback(
      create,
      (timestamp) => {
        const frame = radarRef.current?.frames.find(
          (frame) => frame.time === timestamp,
        );
        if (frame) setDisplayed(frame);
      },
      setBuffering,
    );
    player.current = sequence;
    return () => {
      sequence.destroy();
      player.current = null;
    };
  }, [mapReady, radar?.host, radarOn]);
  const selectedTime = radar?.frames[selectedFrame]?.time;
  const nextTime =
    radar?.frames[
      selectedFrame >= windowRange.end ? windowRange.start : selectedFrame + 1
    ]?.time;
  useEffect(() => {
    player.current?.setOpacity(opacity / 100);
  }, [opacity, mapReady, radar?.host, radarOn]);
  useEffect(() => {
    const sequence = player.current;
    if (!sequence || selectedTime === undefined) return;
    let cancelled = false;
    setReadyTime(null);
    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    sequence
      .show(selectedTime, smooth && playing && !reducedMotion ? 700 / speed : 0)
      .then((success) => {
        if (cancelled) return;
        if (success) {
          setReadyTime(selectedTime);
          if (
            nextTime !== undefined &&
            radarRef.current?.frames.some((frame) => frame.time === nextTime)
          )
            sequence.preload(nextTime);
        } else setPlaying(false);
      });
    return () => {
      cancelled = true;
    };
  }, [
    mapReady,
    radar,
    radarOn,
    selectedTime,
    nextTime,
    playing,
    smooth,
    speed,
  ]);
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
    if (!playing || !radarOn || buffering || readyTime !== selectedTime) return;
    const timer = setTimeout(
      () =>
        setFrame((n) =>
          n < windowRange.start || n >= windowRange.end
            ? windowRange.start
            : n + 1,
        ),
      450 / speed,
    );
    return () => clearTimeout(timer);
  }, [
    playing,
    radarOn,
    buffering,
    readyTime,
    selectedTime,
    speed,
    windowRange.start,
    windowRange.end,
  ]);
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
  const current = displayed;
  const age = current
    ? Math.max(0, Math.round((clock / 1000 - current.time) / 60))
    : null;
  const latestTime = radar?.frames[radar.frames.length - 1]?.time;
  const stale = latestTime !== undefined && clock / 1000 - latestTime > 20 * 60;
  return (
    <section className="panel map-panel">
      <div className="panel-head">
        <div>
          <h2>Radar</h2>
          <p className="panel-sub">10-minute scans</p>
        </div>
        <span className={`panel-hint ${stale ? "text-warn" : ""}`}>
          {current
            ? `${stale ? "Stale · " : ""}${age} min ago`
            : "Loading scans…"}
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
      <div className="radar-playback">
        <button
          className="icon-button"
          aria-label="Previous radar scan"
          disabled={!radar || selectedFrame <= windowRange.start}
          onClick={() => {
            setPlaying(false);
            setFrame(selectedFrame - 1);
          }}
        >
          <ChevronLeft size={16} />
        </button>
        <button
          className="play-button"
          disabled={
            !radar ||
            !radarOn ||
            !!radarError ||
            windowRange.start === windowRange.end
          }
          onClick={() => setPlaying((value) => !value)}
          aria-label={playing ? "Pause radar" : "Play radar"}
        >
          {playing ? <Pause size={17} /> : <Play size={17} />}
        </button>
        <button
          className="icon-button"
          aria-label="Next radar scan"
          disabled={!radar || selectedFrame >= windowRange.end}
          onClick={() => {
            setPlaying(false);
            setFrame(selectedFrame + 1);
          }}
        >
          <ChevronRight size={16} />
        </button>
        <div className="radar-timeline">
          <input
            aria-label="Radar frame"
            type="range"
            min={windowRange.start}
            max={windowRange.end}
            value={selectedFrame}
            disabled={!radar}
            onChange={(event) => {
              setPlaying(false);
              setFrame(Number(event.target.value));
            }}
          />
        </div>
        <strong className="radar-time" aria-label="Displayed radar time">
          {current ? localTime(current.time, track.timezone) : "—"}
        </strong>
        <select
          className="radar-speed"
          aria-label="Radar playback speed"
          value={speed}
          onChange={(event) => setSpeed(Number(event.target.value))}
        >
          <option value={0.5}>0.5×</option>
          <option value={1}>1×</option>
          <option value={2}>2×</option>
        </select>
        <button
          className="icon-button"
          onClick={() => setRadarVersion((value) => value + 1)}
          aria-label="Refresh radar"
        >
          <RefreshCw size={14} />
        </button>
      </div>
      {buffering && (
        <p className="radar-buffer" role="status">
          Loading scan…
        </p>
      )}
      <details className="radar-settings">
        <summary>Playback range &amp; map options</summary>
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
          Past scans only · times in {track.timezone.replaceAll("_", " ")}
        </p>
        <div className="map-options">
          <label>
            <input
              type="checkbox"
              checked={radarOn}
              onChange={(e) => {
                setRadarOn(e.target.checked);
                setPlaying(false);
              }}
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
          <label>
            <input
              type="checkbox"
              checked={smooth}
              onChange={(event) => setSmooth(event.target.checked)}
            />
            Smooth transitions
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
        <p className="fineprint">
          Blending changes playback only; scans are still ten minutes apart.
          There is no future radar or extra detail between scans.
        </p>
      </details>
      {(radarError || tileError) && (
        <p className="inline-warning">{radarError || tileError}</p>
      )}
      <details className="radar-data-note">
        <summary>
          {geoLoading
            ? "Loading circuit outline…"
            : geometry?.coordinates.length
              ? "Circuit outline · radar coverage"
              : "Circuit point only · radar coverage"}
        </summary>
        <p>
          {geoLoading
            ? "Loading circuit outline…"
            : geometry?.coordinates.length
              ? `Outline: ${geometry.source}, ${geometry.attribution}.`
              : geometry?.message || "No circuit outline found."}{" "}
          Dark areas have no radar coverage; clear areas aren’t proof of a dry
          track.
        </p>
      </details>
    </section>
  );
}
