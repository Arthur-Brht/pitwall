import { useMemo, useState } from "react";
import { ArrowRight, Clock3, Thermometer, Wind } from "lucide-react";
import { compass, day, n, niceDate, time } from "@/lib/format";
import { usePitwall } from "@/lib/pitwall-context";
import { enabledNearRain } from "@/lib/rain-decision";
import { rainOutlook } from "@/lib/rain-outlook";
import { rainIntensity } from "@/lib/rain-intensity";
import {
  forecastChanges,
  forecastRows,
  overlaps,
  runConditions,
  runRain,
  timingCluster,
} from "@/lib/run-weather";
import { buildConsensus } from "@/lib/consensus";
import CircuitMap from "./circuit-map";
import { RunTimeline } from "./run-timeline";
import { MetricChart, RainChart } from "./weather-charts";

const range = (value: { min: number; max: number } | null) =>
  !value
    ? "—"
    : Math.round(value.min) === Math.round(value.max)
      ? n(value.min)
      : `${n(value.min)}–${n(value.max)}`;
export function DashboardView() {
  const {
    track,
    data,
    active,
    threshold,
    selectedSourceIds,
    disabled,
    loading,
    focus,
    focusSelection,
    setMobileNav,
    history,
    current,
  } = usePitwall();
  const native = useMemo(
    () =>
      enabledNearRain(
        data?.nearRain?.forecasts ?? [],
        selectedSourceIds,
        disabled,
      ),
    [data?.nearRain, selectedSourceIds, disabled],
  );
  const rows = useMemo(() => forecastRows(active, native), [active, native]);
  const rain = useMemo(
    () => runRain(rows, focus, threshold),
    [rows, focus, threshold],
  );
  const conditions = useMemo(
    () => runConditions(active, focus.start, focus.end),
    [active, focus.start, focus.end],
  );
  const probabilityStart = Math.floor(focus.start / 3600) * 3600,
    probabilityEnd = Math.ceil(focus.end / 3600) * 3600;
  const ensemble = useMemo(
    () =>
      rainOutlook(
        [],
        data?.ensembles?.forecasts ?? [],
        probabilityStart,
        probabilityEnd,
        threshold,
      ),
    [data?.ensembles, probabilityStart, probabilityEnd, threshold],
  );
  const changes = useMemo(
    () => forecastChanges(active, history, focus.start, focus.end, threshold),
    [active, history, focus.start, focus.end, threshold],
  );
  const chartHours = useMemo(
    () =>
      buildConsensus(active, threshold).filter((h) =>
        overlaps(
          { start: h.time, end: h.time + 3600 },
          focus.displayStart,
          focus.displayEnd,
        ),
      ),
    [active, threshold, focus.displayStart, focus.displayEnd],
  );
  const [trend, setTrend] = useState<"rain" | "temperature" | "wind">("rain");
  const expected = selectedSourceIds.filter(
    (id) => !disabled.includes(id),
  ).length;
  const unavailable = Math.max(0, expected - active.length);
  const context =
    focus.kind === "session" ? "during your run" : "in the next 3 hours";
  const headline =
    loading && !data
      ? "Checking the weather…"
      : !rain.reporting
        ? "Rain outlook incomplete."
        : rain.wet > rain.reporting / 2
          ? "Rain forecast during this window."
          : rain.wet
            ? "Some forecasts show rain."
            : rain.regionalWet.length
              ? "Regional showers possible."
              : rain.missing || unavailable
                ? "No hourly rain signal; data is incomplete."
                : rain.contextWet.length
                  ? "Rain in the buffer, outside your run."
                  : `No hourly rain forecast ${context}.`;
  const intervalLabel = (value: { start: number; end: number } | null) =>
    value
      ? `${time(value.start, track.timezone)}–${time(value.end, track.timezone)}`
      : "—";
  const regionalCluster = timingCluster(
    rain.regionalWet.flatMap((r) => (r.first ? [r.first] : [])),
  );
  const regionalClear = timingCluster(
    rain.regionalWet.flatMap((r) =>
      r.context.clearing ? [r.context.clearing] : [],
    ),
  );
  const changeLabels = {
    wet: "now show rain",
    dry: "no longer show rain",
    earlier: "move rain earlier",
    later: "move rain later",
    heavier: "show heavier rain",
    lighter: "show lighter rain",
  };
  return (
    <>
      <div className="focus-ribbon" aria-label="Run window">
        <div>
          <span className="eyebrow">{focus.label}</span>
          <strong>
            {niceDate(day(focus.start, track.timezone))} <span>·</span>{" "}
            {time(focus.start, track.timezone)} <ArrowRight size={14} />{" "}
            {time(focus.end, track.timezone)}
            {day(focus.start, track.timezone) !==
              day(focus.end, track.timezone) && <small> +1 day</small>}
          </strong>
        </div>
        <div className="focus-buffer-label">
          {focus.kind === "session"
            ? `${focusSelection.before} min before · ${focusSelection.after} min after`
            : "Starting now"}
          <button onClick={() => setMobileNav(true)}>
            <Clock3 size={14} /> Change times
          </button>
        </div>
      </div>
      <div className="run-snapshot">
        <section
          className={`rain-story ${rain.wet || rain.regionalWet.length ? "has-rain" : ""}`}
          aria-label="Rain risk snapshot"
          aria-busy={loading}
        >
          <span className="eyebrow">Rain {context}</span>
          <h2>{headline}</h2>
          <details className="run-agreement">
            <summary>
              {rain.wet} of {rain.reporting} reporting hourly forecasts show
              rain {context}.
            </summary>
            <p>
              {rain.hourly
                .filter((r) => r.wet)
                .map((r) => r.row.name)
                .join(", ") || "No hourly source shows rain."}
            </p>
            {rain.hourly.some((r) => r.complete && !r.wet) && (
              <p>
                Below your rain threshold:{" "}
                {rain.hourly
                  .filter((r) => r.complete && !r.wet)
                  .map((r) => r.row.name)
                  .join(", ")}
                .
              </p>
            )}
            <p>
              {rain.missing > 0
                ? `${rain.missing} hourly forecasts have gaps. `
                : ""}
              {unavailable > 0
                ? `${unavailable} selected sources unavailable. `
                : ""}
              Related forecasts share model ancestry; this count is not a
              probability.
            </p>
          </details>
          <dl className="run-rain-facts">
            <div>
              <dt>First hourly signal</dt>
              <dd>
                {intervalLabel(rain.cluster)}
                <small>
                  {rain.cluster
                    ? `${rain.cluster.count} forecasts in this timing group`
                    : "None in the displayed window"}
                </small>
              </dd>
            </div>
            <div>
              <dt>Rain clearing</dt>
              <dd>
                {rain.clearing
                  ? intervalLabel(rain.clearing)
                  : rain.contextWet.length
                    ? "Not yet shown"
                    : "—"}
                <small>
                  {rain.clearing
                    ? `${rain.clearing.count} forecasts · rain stopping, not track drying`
                    : rain.contextWet.length
                      ? "Extend the window to look further"
                      : "No hourly wet period to clear"}
                </small>
              </dd>
            </div>
            <div>
              <dt>Intensity in your window</dt>
              <dd>
                {rain.maxPeak === null ? "—" : rainIntensity(rain.maxPeak)}
                <small>
                  {rain.maxPeak === null
                    ? "No wet signal in available data"
                    : `Up to ${n(rain.maxPeak, 1)} mm/h across forecasts`}
                </small>
              </dd>
            </div>
          </dl>
          {rain.regionalWet.length > 0 ? (
            <p className={`regional-signal ${rain.conflict ? "conflict" : ""}`}>
              <strong>
                {rain.regionalWet.length} regional 15-minute forecasts:
              </strong>{" "}
              rain {intervalLabel(regionalCluster)}
              {regionalClear
                ? `; clearing ${intervalLabel(regionalClear)}`
                : "; no clearing yet in this window"}
              .{rain.conflict && " Hourly forecasts differ."}
            </p>
          ) : rain.regional.some((r) => r.complete) ? (
            <p className={`regional-signal ${rain.conflict ? "conflict" : ""}`}>
              Regional 15-minute forecasts:{" "}
              {rain.regional.filter((r) => r.complete && !r.wet).length} show no
              rain {context}.{rain.conflict && " Hourly forecasts differ."}
            </p>
          ) : null}
          {ensemble.ensembleSystems > 0 && (
            <details className="ensemble-line">
              <summary>
                <strong>{n(ensemble.probability)}%</strong> ensemble rain
                estimate{" "}
                <span>
                  · {time(probabilityStart, track.timezone)}–
                  {time(probabilityEnd, track.timezone)}
                  {probabilityStart !== focus.start ||
                  probabilityEnd !== focus.end
                    ? " (surrounding whole hours)"
                    : ""}
                  {ensemble.probabilityMin !== ensemble.probabilityMax
                    ? ` · systems span ${n(ensemble.probabilityMin)}–${n(ensemble.probabilityMax)}%`
                    : ""}
                </span>
              </summary>
              <p>
                Chance of at least {threshold} mm in any whole hour shown, from{" "}
                {ensemble.ensembleSystems} ensemble systems. It can include rain
                outside your run. Models wet is a separate count, not a second
                probability.
              </p>
              {ensemble.estimates.map((e) => (
                <p key={e.id}>
                  {e.name}:{" "}
                  {e.probability === null
                    ? "Unavailable"
                    : `${n(e.probability)}%`}{" "}
                  · {e.validMembers}/{e.totalMembers} members complete
                </p>
              ))}
            </details>
          )}
        </section>
        <section className="run-conditions" aria-label="Conditions snapshot">
          <span className="eyebrow">During this window</span>
          <div>
            <Thermometer size={18} />
            <dl>
              <dt>Air temperature</dt>
              <dd>
                {range(conditions.temperature)}
                <small>°C</small>
              </dd>
            </dl>
          </div>
          <div>
            <Wind size={18} />
            <dl>
              <dt>
                Wind ·{" "}
                {conditions.direction === null
                  ? "direction variable / unavailable"
                  : `from ${compass(conditions.direction)}`}
              </dt>
              <dd>
                {range(conditions.wind)}
                <small>km/h</small>
                <p>Gusts up to {n(conditions.gust?.max)} km/h</p>
              </dd>
            </dl>
          </div>
          <span className="condition-range-note">
            Ranges across available hourly forecasts.
          </span>
        </section>
      </div>
      {changes && (
        <p className="forecast-change" aria-label="Forecast changes">
          Since {time(changes.since, track.timezone)}
          {changes.until !== changes.since
            ? `–${time(changes.until, track.timezone)}`
            : ""}
          :{" "}
          {changes.changes.length
            ? Object.entries(changeLabels)
                .flatMap(([kind, label]) => {
                  const count = changes.changes.filter(
                    (c) => c.kind === kind,
                  ).length;
                  return count
                    ? [
                        `${count} ${count === 1 ? "forecast" : "forecasts"} ${label}`,
                      ]
                    : [];
                })
                .join("; ")
            : "rain outlook unchanged"}
          . Compared {changes.compared} hourly forecasts for the same run hours.
        </p>
      )}
      <div className="run-weather-grid">
        <RunTimeline rows={rows} />
        <CircuitMap track={track} />
      </div>
      <details className="panel run-details">
        <summary>
          More detail · conditions, charts &amp; forecast methods
        </summary>
        <div className="run-details-body">
          <dl className="detail-conditions">
            <div>
              <dt>Humidity during the window</dt>
              <dd>{range(conditions.humidity)}%</dd>
            </div>
            <div>
              <dt>Dew point now</dt>
              <dd>{n(current?.dewpoint, 1)}°C</dd>
            </div>
            <div>
              <dt>Pressure now</dt>
              <dd>{n(current?.pressure)} hPa</dd>
            </div>
          </dl>
          <div className="segmented" role="group" aria-label="Chart">
            {(
              [
                ["rain", "Rain"],
                ["temperature", "Temperature"],
                ["wind", "Wind"],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                aria-pressed={trend === id}
                onClick={() => setTrend(id)}
              >
                {label}
              </button>
            ))}
          </div>
          {trend === "rain" ? (
            <RainChart hours={chartHours} forecasts={[]} tz={track.timezone} />
          ) : (
            <MetricChart
              hours={chartHours}
              tz={track.timezone}
              metric={trend}
            />
          )}
          <p className="fineprint">
            Hourly forecasts retain their full interval. Regional blocks show
            actual 15-minute amounts, expressed as mm/h for the same intensity
            scale. An interval average can hide a shorter, heavier shower. Rain
            threshold: {threshold} mm/h.
          </p>
          <p className="fineprint">
            The radar shows recent observations; the timeline shows forecasts.
            Clear forecasts do not measure standing water or grip. Global
            agencies, including JMA, forecast Europe too.
          </p>
          <a href="https://github.com/Arthur-Brht/pitwall/blob/preview/2.4/docs/DASHBOARD.md">
            Calculation notes
          </a>
        </div>
      </details>
    </>
  );
}
