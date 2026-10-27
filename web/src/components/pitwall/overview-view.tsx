import CircuitMap from "@/components/pitwall/circuit-map";
import { compass, max, n, niceDate, time } from "@/lib/format";
import { usePitwall } from "@/lib/pitwall-context";
import { ArrowUp } from "lucide-react";
import { useState } from "react";
import { MetricChart, RainChart } from "./weather-charts";
import { Empty, WeatherIcon } from "./weather-common";

const AGREEMENT = {
  aligned: "Aligned",
  mixed: "Mixed",
  split: "Split",
  limited: "Limited",
  unavailable: "Unavailable",
} as const;

export function OverviewView() {
  const {
    track,
    threshold,
    setSelectedDay,
    now,
    current,
    days,
    shownDay,
    hours,
    future,
    hasRainEvidence,
    fullRainOutlook,
    wetHour,
    dissent,
    headline,
    narrative,
  } = usePitwall();
  const [trend, setTrend] = useState<"rain" | "temperature" | "wind">("rain");
  const strip = future.slice(0, 24);
  const peakRain = Math.max(
    threshold * 4,
    max(strip.map((h) => h.rainMax)) ?? 0,
  );
  const tone = dissent
    ? "split"
    : wetHour
      ? "wet"
      : hasRainEvidence
        ? fullRainOutlook
          ? "dry"
          : "unknown"
        : "unknown";
  return (
    <>
      <section className={`summary ${tone}`} aria-label="Current conditions">
        <div className="summary-main">
          <div className="summary-temp">
            <WeatherIcon
              rain={current?.rainMedian ?? null}
              cloud={current?.cloud}
              size={34}
            />
            <span>
              {n(current?.temperature)}
              <small>°C</small>
            </span>
          </div>
          <h2>{headline}</h2>
          <p>{narrative}</p>
        </div>
        <dl className="summary-stats">
          <div>
            <dt>Wind</dt>
            <dd>
              {n(current?.wind)} <small>km/h</small>
              <span className="stat-note">
                <ArrowUp
                  size={11}
                  aria-hidden="true"
                  style={{
                    transform: `rotate(${(current?.direction ?? 0) + 180}deg)`,
                  }}
                />
                {compass(current?.direction ?? null)} · gusts {n(current?.gust)}
              </span>
            </dd>
          </div>
          <div>
            <dt>First rain</dt>
            <dd>
              {wetHour
                ? time(wetHour.time, track.timezone)
                : fullRainOutlook
                  ? "None"
                  : "—"}
              <span className="stat-note">Next 24 h, ≥ {threshold} mm/h</span>
            </dd>
          </div>
          <div>
            <dt>Agreement now</dt>
            <dd>
              {current ? AGREEMENT[current.agreement] : "—"}
              <span className="stat-note">
                {current?.count ?? 0} famil{current?.count === 1 ? "y" : "ies"}{" "}
                reporting
              </span>
            </dd>
          </div>
        </dl>
      </section>

      <section className="panel">
        <div className="panel-head">
          <h2>Next 24 hours</h2>
          <span className="panel-hint">
            Bar shade shows how many models expect rain
          </span>
        </div>
        {strip.length ? (
          <ol
            className="hourly"
            aria-label="Hourly forecast, scroll horizontally"
            tabIndex={0}
          >
            {strip.map((h) => {
              const isNow = h.time <= now;
              const height =
                h.rainMax === null
                  ? 0
                  : Math.max(
                      h.rainMax > 0 ? 6 : 2,
                      Math.min(100, ((h.rainMax ?? 0) / peakRain) * 100),
                    );
              return (
                <li
                  key={h.time}
                  className={isNow ? "now" : ""}
                  title={
                    h.wetShare === null
                      ? "Rain unavailable"
                      : `${h.wetCount} of ${h.count} model families wet · up to ${n(h.rainMax, 1)} mm`
                  }
                >
                  <span className="hour-label">
                    {isNow ? "Now" : time(h.time, track.timezone)}
                  </span>
                  <WeatherIcon rain={h.rainMedian} cloud={h.cloud} size={18} />
                  <strong>{n(h.temperature)}°</strong>
                  <span className="rain-bar" aria-hidden="true">
                    <i
                      style={{
                        height: `${height}%`,
                        opacity:
                          h.wetShare === null ? 0 : 0.3 + h.wetShare * 0.7,
                      }}
                    />
                  </span>
                  <span className="hour-rain">
                    {h.rainMedian === null ? "—" : n(h.rainMedian, 1)}
                  </span>
                </li>
              );
            })}
          </ol>
        ) : (
          <Empty
            title="Waiting for the forecast"
            detail="Hours appear once a source responds."
          />
        )}
      </section>

      <div className="overview-grid">
        <CircuitMap track={track} />
        <section className="panel conditions">
          <div className="panel-head">
            <h2>Conditions</h2>
          </div>
          <dl>
            <div>
              <dt>Humidity</dt>
              <dd>{n(current?.humidity)}%</dd>
            </div>
            <div>
              <dt>Dew point</dt>
              <dd>{n(current?.dewpoint, 1)}°</dd>
            </div>
            <div>
              <dt title="A small gap means near-saturated air">
                Air − dew point
              </dt>
              <dd>{n(current?.dewpointSpread, 1)}°</dd>
            </div>
            <div>
              <dt>Cloud cover</dt>
              <dd>{n(current?.cloud)}%</dd>
            </div>
            <div>
              <dt>Pressure</dt>
              <dd>{n(current?.pressure)} hPa</dd>
            </div>
            <div>
              <dt>Visibility</dt>
              <dd>
                {current?.visibility === null ||
                current?.visibility === undefined
                  ? "—"
                  : `${n(current.visibility / 1000, 1)} km`}
              </dd>
            </div>
            <div>
              <dt>Range across models</dt>
              <dd>
                {n(current?.tempMin, 1)}–{n(current?.tempMax, 1)}°
              </dd>
            </div>
          </dl>
          <p className="fineprint">
            Model estimates for this hour. Air temperature isn’t track
            temperature.
          </p>
        </section>
      </div>

      <section className="panel">
        <div className="panel-head wrap">
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
          <div className="segmented subtle" role="group" aria-label="Day">
            {days.map((d) => (
              <button
                key={d}
                aria-pressed={shownDay === d}
                onClick={() => setSelectedDay(d)}
              >
                {niceDate(d)}
              </button>
            ))}
          </div>
        </div>
        {trend === "rain" ? (
          <RainChart hours={hours} forecasts={[]} tz={track.timezone} />
        ) : (
          <MetricChart hours={hours} tz={track.timezone} metric={trend} />
        )}
        <p className="fineprint">
          {trend === "rain"
            ? "Line: model median in mm per hour. Shaded: highest single forecast."
            : trend === "temperature"
              ? "Solid: air temperature. Dashed: dew point."
              : "Solid: median wind. Dashed: highest gust."}
        </p>
      </section>
    </>
  );
}
