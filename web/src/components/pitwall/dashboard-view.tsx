import { useMemo } from "react";
import { Droplets, SlidersHorizontal, Thermometer, Wind } from "lucide-react";
import { n, time } from "@/lib/format";
import { usePitwall } from "@/lib/pitwall-context";
import { enabledNearRain, rainDecision } from "@/lib/rain-decision";
import { rainIntensity } from "@/lib/rain-intensity";
import { rainValue } from "@/lib/rain-value";
import { sourceColor } from "@/lib/theme";
import CircuitMap from "./circuit-map";
import { RainArrivalView } from "./rain-arrival";

export function DashboardView() {
  const {
    track,
    now,
    data,
    active,
    current,
    threshold,
    appearance,
    setSettings,
    selectedSourceIds,
    disabled,
    loading,
    dashboardWindow,
    setDashboardWindow,
    setHorizon,
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
  const decision = useMemo(
    () =>
      rainDecision(
        active,
        data?.ensembles?.forecasts ?? [],
        native,
        now,
        dashboardWindow,
        threshold,
      ),
    [active, data?.ensembles, native, now, dashboardWindow, threshold],
  );
  const { outlook, onset } = decision;
  const { start, end } = outlook;
  const expected = selectedSourceIds.filter(
    (id) => !disabled.includes(id),
  ).length;
  const unavailable = Math.max(0, expected - active.length);
  const total = outlook.wetSources + outlook.drySources;
  const headline =
    loading && !data
      ? "Checking rain forecasts…"
      : onset
        ? `${decision.intensity === "Unknown" ? "Rain" : `${decision.intensity} rain`} possible ${time(onset.start, track.timezone)}–${time(onset.end, track.timezone)}.`
        : decision.conflict
          ? "Forecasts differ on rain timing."
          : decision.risk === "possible" || decision.risk === "elevated"
            ? "Rain remains possible."
            : !total || outlook.incompleteSources || unavailable
              ? "Rain outlook is incomplete."
              : "Available forecasts stay dry.";
  const times = Array.from(
    { length: dashboardWindow },
    (_, i) => start + i * 3600,
  );
  return (
    <>
      <div className="dashboard-controls">
        <div>
          <h2>Rain outlook</h2>
          <p>
            {time(start, track.timezone, true)}–{time(end, track.timezone)} ·
            includes this hour
          </p>
        </div>
        <label className="dashboard-window">
          Forecast window
          <select
            value={dashboardWindow}
            onChange={(e) => {
              const value = Number(e.target.value);
              setDashboardWindow(value);
              setHorizon(value);
            }}
            aria-label="Dashboard forecast window"
          >
            {[1, 3, 6, 12, 24].map((h) => (
              <option key={h} value={h}>
                {h === 1 ? "This hour" : `${h}-hour outlook`}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="dashboard-summary">
        <section
          className={`panel rain-risk ${decision.risk}`}
          aria-label="Rain risk snapshot"
          aria-busy={loading}
        >
          <h2 className="rain-decision">{headline}</h2>
          <p className="decision-basis">
            {loading && !data
              ? `Loading ${expected} selected forecasts.`
              : decision.basis}
          </p>
          {decision.conflict && onset && (
            <p className="timing-difference">
              15-minute and hourly forecasts differ. The finer regional window
              is shown first.
            </p>
          )}
          {data && <p className="agreement-sentence">{decision.agreement}</p>}
          <div className="risk-probability">
            <strong>
              {outlook.probability === null ? "—" : n(outlook.probability, 0)}
              {outlook.probability !== null && <small>%</small>}
            </strong>
            <div>
              <span>Hourly ensemble estimate</span>
              <p>
                {outlook.ensembleSystems
                  ? `${outlook.probabilityMin !== outlook.probabilityMax ? `${n(outlook.probabilityMin, 0)}–${n(outlook.probabilityMax, 0)}% · ` : ""}${outlook.ensembleSystems} ensemble systems`
                  : "Estimate unavailable"}
              </p>
            </div>
          </div>
          {!loading && (outlook.incompleteSources > 0 || unavailable > 0) && (
            <p className="risk-context">
              {outlook.incompleteSources > 0
                ? `${outlook.incompleteSources} incomplete hourly forecasts. `
                : ""}
              {unavailable > 0
                ? `${unavailable} selected sources unavailable.`
                : ""}
            </p>
          )}
          <details className="dashboard-method">
            <summary>Estimate details</summary>
            <p>
              The percentage estimates at least {threshold} mm in any hour of
              this window. It comes from ensemble model runs; the provider count
              is a separate comparison.
            </p>
            <p>
              {outlook.wetFamilies} of {outlook.reportingFamilies} reporting
              model families predict rain. Related forecasts share one family
              vote.
            </p>
            <dl className="ensemble-estimates">
              {outlook.estimates.map((estimate) => (
                <div key={estimate.id}>
                  <dt>{estimate.name.replace(" ensemble", "")}</dt>
                  <dd>
                    {estimate.probability === null
                      ? "Unavailable"
                      : `${n(estimate.probability, 0)}%`}
                  </dd>
                </div>
              ))}
            </dl>
            <p>
              Earliest hourly signal:{" "}
              {outlook.firstRain === null
                ? "none in available data"
                : `${time(outlook.firstRain, track.timezone)}–${time(outlook.firstRain + 3600, track.timezone)}`}
              . Peak hourly forecast: {n(outlook.maxRain, 1)} mm/h (
              {rainIntensity(outlook.maxRain).toLowerCase()}).
            </p>
            <p>
              The window includes the complete current hour. Models can miss
              showers; these estimates do not measure grip.
            </p>
            <a href="https://github.com/Arthur-Brht/pitwall/blob/preview/2.3/docs/DASHBOARD.md">
              Calculation notes
            </a>
          </details>
        </section>
        <section
          className="panel dashboard-conditions"
          aria-label="Conditions snapshot"
        >
          <div className="panel-head">
            <h2>At the circuit</h2>
            <span className="panel-hint">This hour</span>
          </div>
          <dl className="condition-snapshot">
            <div>
              <dt>
                <Thermometer size={15} /> Air temperature
              </dt>
              <dd>
                {n(current?.temperature)}
                <small>°C</small>
                <span>
                  {n(current?.tempMin)}–{n(current?.tempMax)}° across forecasts
                </span>
              </dd>
            </div>
            <div>
              <dt>
                <Droplets size={15} /> Humidity
              </dt>
              <dd>
                {n(current?.humidity)}
                <small>%</small>
                <span>Dew point {n(current?.dewpoint, 1)}°C</span>
              </dd>
            </div>
            <div>
              <dt>
                <Wind size={15} /> Wind
              </dt>
              <dd>
                {n(current?.wind)}
                <small>km/h</small>
                <span>Gusts up to {n(current?.gust)} km/h</span>
              </dd>
            </div>
          </dl>
        </section>
      </div>
      <RainArrivalView end={end} />
      <div className="dashboard-weather-grid">
        <CircuitMap track={track} />
        <section className="panel dashboard-comparison">
          <div className="panel-head wrap">
            <div>
              <h2>Who expects rain?</h2>
              <p className="panel-sub">Hourly rain · mm/h</p>
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
            className="table-scroll"
            role="region"
            aria-label="Forecast rain comparison"
            tabIndex={0}
          >
            <table className="matrix dashboard-matrix">
              <thead>
                <tr>
                  <th scope="col">Forecast</th>
                  {times.map((value) => (
                    <th scope="col" key={value}>
                      {time(value, track.timezone)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {outlook.rows.map(({ forecast }) => (
                  <tr key={forecast.id}>
                    <th scope="row">
                      <span className="provider-name">
                        <i
                          style={{
                            background: sourceColor(
                              forecast.color,
                              appearance.theme,
                            ),
                          }}
                        />
                        {forecast.name}
                      </span>
                      {data?.statuses.some(
                        (s) => s.id === forecast.id && s.status === "cached",
                      ) && (
                        <small className="saved-source">
                          Saved{" "}
                          {time(
                            Date.parse(forecast.fetchedAt) / 1000,
                            track.timezone,
                          )}
                        </small>
                      )}
                    </th>
                    {times.map((value) => {
                      const rain = rainValue(
                        forecast.hours.find((h) => h.time === value)
                          ?.precipitation,
                      );
                      const intensity = rainIntensity(rain)
                        .toLowerCase()
                        .replaceAll(" ", "-");
                      return (
                        <td
                          key={value}
                          className={`rain-cell rain-${intensity}`}
                          title={`${forecast.name} · ${time(value, track.timezone)}–${time(value + 3600, track.timezone)} · ${rain === null ? "Missing data" : `${n(rain, 1)} mm/h · ${rainIntensity(rain)}`}`}
                        >
                          {rain === null ? "—" : rain === 0 ? "·" : n(rain, 1)}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
            {!outlook.rows.length && (
              <p className="empty-table">
                {loading
                  ? "Loading forecasts…"
                  : "No hourly forecasts available."}
              </p>
            )}
          </div>
          <details className="forecast-explainer">
            <summary>Reading the comparison</summary>
            <p>
              A dot means zero rain; a dash means missing data. Blue is light,
              amber moderate and red heavy rain.
            </p>
            <p>
              JMA, NOAA and other agencies run global models, including Europe.
              Their country names identify the agency; Open-Meteo delivers their
              forecasts.
            </p>
          </details>
        </section>
      </div>
    </>
  );
}
