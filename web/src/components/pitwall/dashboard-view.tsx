import { useMemo, useState } from "react";
import { Droplets, SlidersHorizontal, Thermometer, Wind } from "lucide-react";
import { n, time } from "@/lib/format";
import { usePitwall } from "@/lib/pitwall-context";
import { rainOutlook } from "@/lib/rain-outlook";
import { sourceColor } from "@/lib/theme";
import CircuitMap from "./circuit-map";
import { RainArrivalView } from "./rain-arrival";
import { rainIntensity } from "@/lib/rain-intensity";

const RISK = {
  elevated: "Elevated rain risk",
  possible: "Rain is possible",
  low: "Low rain signal",
  limited: "Limited rain data",
} as const;

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
  } = usePitwall();
  const [windowHours, setWindowHours] = useState(3);
  const start = Math.floor(now / 3600) * 3600,
    end = start + windowHours * 3600;
  const outlook = useMemo(
    () =>
      rainOutlook(
        active,
        data?.ensembles?.forecasts ?? [],
        start,
        end,
        threshold,
      ),
    [active, data?.ensembles, start, end, threshold],
  );
  const oldestEnsemble = outlook.estimates
    .map((item) => Date.parse(item.fetchedAt))
    .filter(Number.isFinite)
    .sort((a, b) => a - b)[0];
  const expected = selectedSourceIds.filter(
    (id) => !disabled.includes(id),
  ).length;
  const unavailable = Math.max(0, expected - active.length);
  const agreementTotal = outlook.wetSources + outlook.drySources;
  const times = Array.from(
    { length: windowHours },
    (_, index) => start + index * 3600,
  );
  return (
    <>
      <div className="dashboard-controls">
        <div>
          <h2>Rain outlook</h2>
          <p>
            {new Intl.DateTimeFormat("en-GB", {
              day: "numeric",
              month: "short",
              hour: "2-digit",
              minute: "2-digit",
              timeZone: track.timezone,
            }).formatRange(new Date(start * 1000), new Date(end * 1000))}{" "}
            · {track.timezone.replaceAll("_", " ")}
          </p>
        </div>
        <label className="dashboard-window">
          Forecast window
          <select
            value={windowHours}
            onChange={(event) => setWindowHours(Number(event.target.value))}
            aria-label="Dashboard forecast window"
          >
            <option value={1}>This hour</option>
            <option value={3}>Next 3 hours</option>
            <option value={6}>Next 6 hours</option>
            <option value={12}>Next 12 hours</option>
            <option value={24}>Next 24 hours</option>
          </select>
        </label>
      </div>
      <div className="dashboard-summary">
        <section
          className={`panel rain-risk ${outlook.risk}`}
          aria-label="Rain risk snapshot"
          aria-busy={loading}
        >
          <div className="panel-head">
            <h2>{RISK[outlook.risk]}</h2>
            <span className="tag">≥ {threshold} mm/h</span>
          </div>
          <div className="risk-probability">
            <strong>
              {outlook.probability === null ? "—" : n(outlook.probability, 0)}
              {outlook.probability !== null && <small>%</small>}
            </strong>
            <div>
              <span>Chance of rain</span>
              <p>
                {outlook.ensembleSystems
                  ? `${n(outlook.probabilityMin, 0) !== n(outlook.probabilityMax, 0) ? `${n(outlook.probabilityMin, 0)}–${n(outlook.probabilityMax, 0)}% · ` : ""}${outlook.ensembleSystems} ensemble systems`
                  : "Ensemble estimate unavailable"}
              </p>
            </div>
          </div>
          <div className="agreement-line">
            <strong>
              {outlook.wetSources}
              <span> of {agreementTotal}</span>
            </strong>
            <span>forecasts expect rain</span>
          </div>
          <div className="agreement-bar" aria-hidden="true">
            <i
              style={{
                width: `${agreementTotal ? (outlook.wetSources / agreementTotal) * 100 : 0}%`,
              }}
            />
          </div>
          <p className="risk-context">
            {outlook.wetFamilies}/{outlook.reportingFamilies} model families
            agree.
            {outlook.incompleteSources > 0
              ? ` ${outlook.incompleteSources} forecast${outlook.incompleteSources === 1 ? " is" : "s are"} incomplete.`
              : ""}
            {unavailable > 0
              ? ` ${unavailable} selected source${unavailable === 1 ? " is" : "s are"} unavailable.`
              : ""}
          </p>
          <dl className="risk-timing">
            <div>
              <dt>Earliest hourly signal</dt>
              <dd>
                {outlook.firstRain === null
                  ? outlook.incompleteSources || unavailable || !agreementTotal
                    ? "Unknown"
                    : "None in window"
                  : `${time(outlook.firstRain, track.timezone)}–${time(outlook.firstRain + 3600, track.timezone)}`}
              </dd>
            </div>
            <div>
              <dt>Heaviest forecast hour</dt>
              <dd>
                {n(outlook.maxRain, 1)} <small>mm/h</small>
                <span className="rain-intensity-note">
                  {rainIntensity(outlook.maxRain)}
                </span>
              </dd>
            </div>
          </dl>
          <details className="dashboard-method">
            <summary>Estimate details</summary>
            <p>
              The chance estimates at least {threshold} mm in any hour of this
              window. It comes from repeated model runs, not the number of
              providers agreeing.
            </p>
            <p>
              Models can miss showers. This is a weather estimate, not a grip
              assessment.
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
            {oldestEnsemble && (
              <p>
                Updated {time(oldestEnsemble / 1000, track.timezone)} · includes
                the full current hour.
              </p>
            )}
            <a href="https://github.com/Arthur-Brht/pitwall/blob/main/docs/DASHBOARD.md">
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
      <div className="dashboard-weather-grid">
        <CircuitMap track={track} />
        <RainArrivalView end={end} />
      </div>
      <section className="panel dashboard-comparison">
        <div className="panel-head wrap">
          <div>
            <h2>Who expects rain?</h2>
            <p className="panel-sub">
              Hourly rain in mm · {time(start, track.timezone)}–
              {time(end, track.timezone)}
            </p>
          </div>
          <button
            className="button secondary"
            onClick={() => setSettings(true)}
          >
            <SlidersHorizontal size={14} /> Manage forecasts
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
                <th scope="col">Outlook</th>
                {times.map((value) => (
                  <th scope="col" key={value}>
                    {time(value, track.timezone)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {outlook.rows.map((row) => (
                <tr key={row.forecast.id}>
                  <th scope="row">
                    <span className="provider-name">
                      <i
                        style={{
                          background: sourceColor(
                            row.forecast.color,
                            appearance.theme,
                          ),
                        }}
                      />
                      {row.forecast.name}
                    </span>
                  </th>
                  <td className={row.wet ? "text-rain" : ""}>
                    {row.wet ? "Rain" : row.complete ? "Dry" : "Incomplete"}
                  </td>
                  {times.map((value) => {
                    const hour = row.forecast.hours.find(
                        (item) => item.time === value,
                      ),
                      rain = hour?.precipitation;
                    return (
                      <td
                        key={value}
                        className={
                          rain !== null &&
                          rain !== undefined &&
                          rain >= threshold
                            ? "wet-cell"
                            : ""
                        }
                      >
                        {n(rain, 1)}
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
                : "No forecasts available for comparison."}
            </p>
          )}
        </div>
        <details className="forecast-explainer">
          <summary>Why forecasts from other countries?</summary>
          <p>
            JMA, NOAA and other agencies run global models, so they forecast
            Europe too. The country names identify the agency. Open-Meteo
            delivers these forecasts to Pitwall.
          </p>
          <p>
            A dash means missing data. Related models share one family vote.
          </p>
        </details>
      </section>
    </>
  );
}
