import CircuitMap from "@/components/pitwall/circuit-map";
import { compass, max, min, n, niceDate, time } from "@/lib/format";
import { usePitwall } from "@/lib/pitwall-context";
import {
  Activity,
  ArrowRight,
  CloudDrizzle,
  CloudRain,
  Compass,
  Layers,
  Thermometer,
  Wind,
} from "lucide-react";
import { MetricChart, RainChart } from "./weather-charts";
import { Empty, WeatherIcon } from "./weather-common";

export function OverviewView() {
  const {
    setView,
    track,
    threshold,
    setSelectedDay,
    active,
    now,
    current,
    days,
    shownDay,
    hours,
    upcoming,
    hasRainEvidence,
    wetHour,
    wetSignalSources,
    dissent,
    availableCount,
    narrative,
  } = usePitwall();
  return (
    <>
      <div className="metric-grid">
        <div className="metric-card">
          <div className="metric-label">
            AIR TEMPERATURE <Thermometer size={16} />
          </div>
          <div className="metric-value">
            {n(current?.temperature, 1)}
            <span>°C</span>
          </div>
          <div className="metric-bottom">
            <span>Model median</span>
            <span>
              {n(current?.tempMin, 1)}–{n(current?.tempMax, 1)}° range
            </span>
          </div>
          <svg className="metric-mini" viewBox="0 0 140 28" aria-hidden="true">
            <path d="M0 27H140" stroke="#27322b" fill="none" />
            {upcoming.length > 1 &&
              upcoming.every((h) => h.temperature !== null) && (
                <polyline
                  points={upcoming
                    .map(
                      (h, i) =>
                        `${(i / (upcoming.length - 1)) * 140},${27 - (((h.temperature ?? 0) - (min(upcoming.map((x) => x.temperature)) ?? 0)) / Math.max(1, (max(upcoming.map((x) => x.temperature)) ?? 0) - (min(upcoming.map((x) => x.temperature)) ?? 0))) * 22}`,
                    )
                    .join(" ")}
                  fill="none"
                  stroke="#e2fa76"
                  strokeWidth="1.5"
                />
              )}
          </svg>
        </div>
        <div className="metric-card">
          <div className="metric-label">
            FIRST WET SIGNAL <CloudRain size={16} />
          </div>
          <div
            className={`metric-value time-value ${!hasRainEvidence ? "missing-value" : ""}`}
          >
            {wetHour
              ? time(wetHour.time, track.timezone)
              : hasRainEvidence
                ? "None"
                : "Unavailable"}
            <span>{wetHour ? "interval" : ""}</span>
          </div>
          <div className="metric-bottom">
            <span>
              {wetHour
                ? `${wetSignalSources.length} source${wetSignalSources.length === 1 ? "" : "s"} · ${wetHour.wetCount}/${wetHour.count} families`
                : "Next 24 forecast hours"}
            </span>
            <span className={wetHour ? "text-blue" : ""}>
              {wetHour ? `≥${threshold} mm/h` : "Above threshold"}
            </span>
          </div>
          <div className="metric-track">
            {upcoming.map((h) => (
              <span
                key={h.time}
                style={{
                  background:
                    h.wetShare === null
                      ? "#273032"
                      : `rgba(134,179,233,${0.12 + (h.wetShare || 0) * 0.7})`,
                }}
              />
            ))}
          </div>
        </div>
        <div className="metric-card">
          <div className="metric-label">
            WIND / PEAK GUST <Wind size={16} />
          </div>
          <div className="metric-value">
            {n(current?.wind)}
            <span>km/h</span>
            <small className="gust-value">
              {n(current?.gust)}
              <span>gust</span>
            </small>
          </div>
          <div className="metric-bottom">
            <span className="wind-direction">
              <Compass
                size={12}
                style={{
                  transform: `rotate(${current?.direction ?? 0}deg)`,
                }}
              />
              {compass(current?.direction ?? null)}
            </span>
            <span>Gust = highest source</span>
          </div>
          <div className="wind-bars">
            {upcoming.map((h) => (
              <i
                key={h.time}
                style={{
                  height: `${Math.max(2, Math.min(25, (h.wind || 0) / 2))}px`,
                }}
              />
            ))}
          </div>
        </div>
        <div className="metric-card agreement-card">
          <div className="metric-label">
            MODEL AGREEMENT <Layers size={16} />
          </div>
          <div
            className={`metric-value agreement-value ${current?.agreement === "unavailable" ? "missing-value" : ""}`}
          >
            {!current
              ? "—"
              : current.agreement === "unavailable"
                ? "Unavailable"
                : current.agreement === "limited"
                  ? "Limited"
                  : current.agreement === "aligned"
                    ? "Aligned"
                    : current.agreement === "split"
                      ? "Split"
                      : "Mixed"}
            <span className={`signal ${current?.agreement || ""}`} />
          </div>
          <div className="metric-bottom">
            <span>{current?.count ?? 0} reporting families</span>
            <span>
              {active.length}/{availableCount} sources on
            </span>
          </div>
          <div className="family-track">
            {Array.from({ length: Math.max(1, current?.count ?? 0) }).map(
              (_, i) => (
                <span key={i} />
              ),
            )}
          </div>
        </div>
      </div>
      <div className={`consensus-banner ${dissent ? "uncertain" : ""}`}>
        <div className="consensus-symbol">
          <Activity size={19} />
        </div>
        <div>
          <span className="eyebrow">THE PADDOCK BRIEF</span>
          <p>{narrative}</p>
        </div>
        <button onClick={() => setView("comparison")}>
          Inspect models <ArrowRight size={15} />
        </button>
      </div>
      <div className="overview-main">
        <CircuitMap track={track} />
        <section className="panel next-hours">
          <div className="panel-head">
            <div>
              <div className="eyebrow">NEXT 12 HOURS</div>
              <h2>The session outlook</h2>
            </div>
            <span className="subtle-chip">Local time</span>
          </div>
          <div className="hours-table">
            <div className="hours-table-head">
              <span>TIME</span>
              <span>FORECAST</span>
              <span>RAIN</span>
              <span>WET VOTE</span>
            </div>
            {upcoming.length ? (
              upcoming.map((h) => (
                <div
                  className={`hour-row ${h.time <= now ? "now" : ""}`}
                  key={h.time}
                >
                  <span className="hour-time">
                    {time(h.time, track.timezone)}
                    {h.time <= now && <small>NOW*</small>}
                  </span>
                  <span className="hour-temperature">
                    <WeatherIcon
                      rain={h.rainMedian}
                      cloud={h.cloud}
                      size={17}
                    />
                    {n(h.temperature)}°
                  </span>
                  <span>
                    {n(h.rainMedian, 1)} <small>mm</small>
                  </span>
                  <span
                    className={`vote ${h.wetShare && h.wetShare > 0 ? "wet" : ""}`}
                  >
                    {h.wetShare === null ? "—" : `${h.wetCount}/${h.count}`}
                    <i style={{ width: `${(h.wetShare ?? 0) * 100}%` }} />
                  </span>
                </div>
              ))
            ) : (
              <Empty
                title="Waiting for the forecast"
                detail="The hourly outlook appears when a source returns data."
              />
            )}
          </div>
          <p className="table-footnote">
            * Current hourly forecast, not an on-track reading. Wet vote counts
            model families, not rain probability.
          </p>
        </section>
      </div>
      <section className="panel forecast-panel">
        <div className="panel-head">
          <div>
            <div className="eyebrow">WHERE MODELS MEET — AND DIFFER</div>
            <h2>
              Precipitation outlook{" "}
              <span className="title-unit">mm per hourly interval</span>
            </h2>
          </div>
          <div className="date-tabs">
            {days.map((d) => (
              <button
                key={d}
                className={shownDay === d ? "active" : ""}
                onClick={() => setSelectedDay(d)}
              >
                {niceDate(d)}
              </button>
            ))}
          </div>
        </div>
        <RainChart hours={hours} forecasts={active} tz={track.timezone} />
        <div className="chart-legend">
          <span>
            <i style={{ background: "#e2fa76" }} />
            Family median
          </span>
          {active.map((f) => (
            <span key={f.id}>
              <i style={{ background: f.color }} />
              {f.name}
            </span>
          ))}
          <span className="legend-note">
            Forecast uncertainty remains even when models agree.
          </span>
        </div>
      </section>
      <div className="two-charts">
        <section className="panel">
          <div className="panel-head">
            <div>
              <div className="eyebrow">THERMAL PICTURE</div>
              <h2>
                Air & dew point <span className="title-unit">°C</span>
              </h2>
            </div>
            <Thermometer size={18} className="muted" />
          </div>
          <MetricChart hours={hours} tz={track.timezone} metric="temperature" />
          <p className="chart-note">
            Air temperature only. Track surface temperature requires a
            measurement or a separate model.
          </p>
        </section>
        <section className="panel">
          <div className="panel-head">
            <div>
              <div className="eyebrow">WIND EXPOSURE</div>
              <h2>
                Wind & gusts <span className="title-unit">km/h</span>
              </h2>
            </div>
            <Wind size={18} className="muted" />
          </div>
          <MetricChart hours={hours} tz={track.timezone} metric="wind" />
          <p className="chart-note">
            Solid: median wind. Dashed: highest available gust. Direction and
            exposure vary around the lap.
          </p>
        </section>
      </div>
      <section className="panel atmosphere-panel">
        <div className="panel-head">
          <div>
            <div className="eyebrow">THE REST OF THE PICTURE</div>
            <h2>
              Atmospheric detail{" "}
              <span className="title-unit">Current hourly model estimate</span>
            </h2>
          </div>
          <CloudDrizzle size={18} className="muted" />
        </div>
        <div className="atmosphere-grid">
          <div>
            <span>RELATIVE HUMIDITY</span>
            <strong>
              {n(current?.humidity)}
              <small>%</small>
            </strong>
          </div>
          <div>
            <span>DEW POINT</span>
            <strong>
              {n(current?.dewpoint, 1)}
              <small>°C</small>
            </strong>
          </div>
          <div>
            <span>AIR − DEW POINT</span>
            <strong>
              {n(current?.dewpointSpread, 1)}
              <small>°C</small>
            </strong>
          </div>
          <div>
            <span>CLOUD COVER</span>
            <strong>
              {n(current?.cloud)}
              <small>%</small>
            </strong>
          </div>
          <div>
            <span>PRESSURE</span>
            <strong>
              {n(current?.pressure)}
              <small>hPa</small>
            </strong>
          </div>
          <div>
            <span>VISIBILITY</span>
            <strong>
              {current?.visibility === null || current?.visibility === undefined
                ? "—"
                : n(current.visibility / 1000, 1)}
              <small>km</small>
            </strong>
          </div>
        </div>
        <p className="chart-note">
          A small air–dew point spread indicates near-saturated air; it does not
          establish surface condensation. A dash means this field was not
          reported by the enabled sources.
        </p>
      </section>
    </>
  );
}
