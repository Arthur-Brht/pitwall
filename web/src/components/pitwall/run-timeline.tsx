import { useState } from "react";
import { SlidersHorizontal } from "lucide-react";
import type { RainRow } from "@/lib/run-weather";
import { overlaps } from "@/lib/run-weather";
import { rainIntensity } from "@/lib/rain-intensity";
import { compass, n, time } from "@/lib/format";
import { runConditions } from "@/lib/run-weather";
import { windOutlook } from "@/lib/wind-outlook";
import { usePitwall } from "@/lib/pitwall-context";
import { forecastExplanation } from "@/lib/forecast-explanation";

export function RunTimeline({ rows }: { rows: RainRow[] }) {
  const { track, focus, now, setSettings, threshold, data, active } =
    usePitwall();
  const [selected, setSelected] = useState("");
  const span = focus.displayEnd - focus.displayStart;
  const position = (value: number) =>
    Math.max(0, Math.min(100, ((value - focus.displayStart) / span) * 100));
  const runLeft = position(focus.start),
    runRight = position(focus.end);
  const tickStep =
    [900, 1800, 3600, 7200, 14400, 21600].find((step) => step >= span / 5) ??
    21600;
  const ticks = [focus.displayStart];
  for (
    let t = Math.ceil(focus.displayStart / tickStep) * tickStep;
    t < focus.displayEnd;
    t += tickStep
  )
    if (position(t) >= 14 && position(t) <= 86) ticks.push(t);
  ticks.push(focus.displayEnd);
  const visible = rows.filter(
    (row) =>
      !row.native ||
      row.intervals.some(
        (i) =>
          i.rate !== null && overlaps(i, focus.displayStart, focus.displayEnd),
      ),
  );
  const hasData = (row: RainRow) =>
    row.intervals.some(
      (i) =>
        i.rate !== null && overlaps(i, focus.displayStart, focus.displayEnd),
    );
  const hasNative = visible.some((row) => row.native && hasData(row));
  const hasHourly = visible.some((row) => !row.native && hasData(row));
  const nowVisible = now >= focus.displayStart && now < focus.displayEnd;
  return (
    <section
      className="panel run-timeline"
      aria-label="Forecast rain comparison"
    >
      <div className="panel-head">
        <div>
          <h2>Who forecasts what</h2>
          <p className="panel-sub">
            Forecast · {time(focus.displayStart, track.timezone)}–
            {time(focus.displayEnd, track.timezone)}
          </p>
          <p className="panel-sub">
            Each row explains rain during your run. The bars also include your
            buffers.
          </p>
          {(hasNative || hasHourly) && (
            <p className="panel-sub" aria-label="Available rain timing">
              {hasNative
                ? hasHourly
                  ? "15-min regional timing where covered · hourly elsewhere"
                  : "15-min regional timing · hourly data unavailable"
                : "Hourly timing only · no 15-min data for this window"}
            </p>
          )}
        </div>
        <button
          className="icon-button"
          aria-label="Manage forecasts"
          onClick={() => setSettings(true)}
        >
          <SlidersHorizontal size={18} />
        </button>
      </div>
      <div
        className="timeline-scroll"
        tabIndex={0}
        role="region"
        aria-label="Model rain timeline"
      >
        <div className="timeline-axis">
          <span>Forecast</span>
          <div>
            {ticks.map((t, i) => (
              <span key={i} style={{ left: `${position(t)}%` }}>
                {time(t, track.timezone)}
              </span>
            ))}
          </div>
        </div>
        {focus.kind === "session" && (
          <div className="timeline-bracket">
            <span />
            <div>
              <span
                style={{ left: `${runLeft}%`, width: `${runRight - runLeft}%` }}
              >
                Your run
              </span>
            </div>
          </div>
        )}
        {visible.map((row) => {
          const explanation = forecastExplanation(
            row,
            focus,
            threshold,
            track.timezone,
          );
          const forecast = active.find((f) => f.id === row.id);
          const conditions = forecast
            ? runConditions([forecast], focus.start, focus.end)
            : null;
          const wind = forecast
            ? windOutlook([forecast], focus.start, focus.end)
            : null;
          const fetched = Date.parse(row.fetchedAt) / 1000;
          const saved = [
            ...(data?.statuses ?? []),
            ...(data?.nearRain?.statuses ?? []),
          ].some((s) => s.id === row.id && s.status === "cached");
          return (
            <div
              className={`timeline-row ${row.native ? "native-row" : ""}`}
              key={row.id}
              role="group"
              aria-label={`${row.name} forecast for your run`}
            >
              <div className="timeline-source">
                <strong>{row.name}</strong>
                <small>
                  {row.native ? "15 min · regional" : "1 hour"}
                  {saved ? " · saved" : ""}
                  {Number.isFinite(fetched)
                    ? ` · fetched ${time(fetched, track.timezone, true)}`
                    : ""}
                </small>
              </div>
              <div className="timeline-plot">
                {row.intervals
                  .filter((i) =>
                    overlaps(i, focus.displayStart, focus.displayEnd),
                  )
                  .map((interval) => {
                    const left = position(interval.start),
                      right = position(interval.end);
                    const intensity = rainIntensity(interval.rate);
                    const description = `${row.name} · ${time(interval.start, track.timezone, true)}–${time(interval.end, track.timezone)} · ${interval.rate === null ? "Missing rain data" : `${n(interval.rate, 2)} mm/h · ${intensity}${row.native ? ` (${n(interval.rate / 4, 2)} mm in 15 min)` : ""}`}`;
                    const wet =
                      interval.rate !== null && interval.rate >= threshold;
                    return (
                      <button
                        key={interval.start}
                        className={`timeline-block rain-${intensity.toLowerCase().replaceAll(" ", "-")} ${wet ? "wet" : ""}`}
                        style={{ left: `${left}%`, width: `${right - left}%` }}
                        title={description}
                        aria-label={description}
                        onClick={() => setSelected(description)}
                        onFocus={() => setSelected(description)}
                      >
                        {right - left >= 9
                          ? interval.rate === null
                            ? "—"
                            : interval.rate === 0
                              ? "·"
                              : n(interval.rate, 1)
                          : ""}
                      </button>
                    );
                  })}
                {focus.kind === "session" && (
                  <span
                    className="timeline-run-highlight"
                    style={{
                      left: `${runLeft}%`,
                      width: `${runRight - runLeft}%`,
                    }}
                  />
                )}
                {nowVisible && (
                  <span
                    className="timeline-now"
                    title="Now"
                    style={{ left: `${position(now)}%` }}
                  />
                )}
              </div>
              <div className={`timeline-explanation ${explanation.state}`}>
                <strong>{explanation.text}</strong>
                <span>{explanation.detail}</span>
                {conditions && wind && (
                  <span className="timeline-conditions">
                    {conditions.temperature
                      ? `${n(conditions.temperature.min)}${Math.round(conditions.temperature.min) !== Math.round(conditions.temperature.max) ? `–${n(conditions.temperature.max)}` : ""}°C`
                      : "Temperature unavailable"}
                    {" · "}
                    {wind.speed
                      ? `Wind ${n(wind.speed.min)}${Math.round(wind.speed.min) !== Math.round(wind.speed.max) ? `–${n(wind.speed.max)}` : ""} km/h`
                      : "Wind unavailable"}
                    {wind.direction !== null
                      ? ` from ${compass(wind.direction)}`
                      : wind.kind === "variable"
                        ? ", direction varies"
                        : wind.kind === "calm"
                          ? ", calm"
                          : ", direction unavailable"}
                    {wind.gust !== null
                      ? ` · gusts to ${n(wind.gust)} km/h`
                      : " · gusts unavailable"}
                  </span>
                )}
              </div>
            </div>
          );
        })}
        {!visible.length && (
          <p className="empty-table">
            No rain forecasts available. Try Refresh or choose another time.
          </p>
        )}
      </div>
      <div className="timeline-legend" aria-label="Rain intensity guide">
        <span>
          <i className="rain-no-rain" />
          No rain
        </span>
        <span>
          <i className="rain-light" />
          Light ≤ 2.5
        </span>
        <span>
          <i className="rain-moderate" />
          Moderate ≤ 7.6
        </span>
        <span>
          <i className="rain-heavy" />
          Heavy &gt; 7.6 mm/h
        </span>
        <span>
          <i className="rain-unknown" />
          Missing
        </span>
        {nowVisible && <span className="now-key">│ Now</span>}
      </div>
      <p className="timeline-readout" aria-live="polite">
        {selected ||
          "Select a block for its amount and actual forecast interval. Shading shows rain intensity."}
      </p>
    </section>
  );
}
