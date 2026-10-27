import { useMemo, useState } from "react";
import type { FormEvent } from "react";
import {
  Droplets,
  Plus,
  SlidersHorizontal,
  Thermometer,
  Wind,
} from "lucide-react";
import { n, time } from "@/lib/format";
import { usePitwall } from "@/lib/pitwall-context";
import { rainOutlook } from "@/lib/rain-outlook";
import { sourceColor } from "@/lib/theme";
import CircuitMap from "./circuit-map";

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
    trackReading,
    saveTrackReading,
    selectedSourceIds,
    disabled,
    loading,
  } = usePitwall();
  const [windowHours, setWindowHours] = useState(3);
  const [manualTemperature, setManualTemperature] = useState("");
  const [readingMessage, setReadingMessage] = useState("");
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
  const ages = trackReading
    ? Math.floor((now - Date.parse(trackReading.recordedAt) / 1000) / 60)
    : null;
  const expected = selectedSourceIds.filter(
    (id) => !disabled.includes(id),
  ).length;
  const unavailable = Math.max(0, expected - active.length);
  const agreementTotal = outlook.wetSources + outlook.drySources;
  const times = Array.from(
    { length: windowHours },
    (_, index) => start + index * 3600,
  );
  function saveReading(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!manualTemperature.trim()) {
      setReadingMessage("Enter a track temperature reading.");
      return;
    }
    try {
      saveTrackReading(Number(manualTemperature));
      setManualTemperature("");
      setReadingMessage("Track reading saved.");
    } catch (error) {
      setReadingMessage(
        error instanceof Error
          ? error.message
          : "The reading could not be saved.",
      );
    }
  }
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
              <span>Estimated chance of rain</span>
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
            {outlook.wetFamilies} of {outlook.reportingFamilies} model families
            have a rain signal.
            {outlook.incompleteSources > 0
              ? ` ${outlook.incompleteSources} forecast${outlook.incompleteSources === 1 ? " is" : "s are"} incomplete.`
              : ""}
            {unavailable > 0
              ? ` ${unavailable} selected source${unavailable === 1 ? " is" : "s are"} unavailable.`
              : ""}
          </p>
          <dl className="risk-timing">
            <div>
              <dt>First rain signal</dt>
              <dd>
                {outlook.firstRain === null
                  ? outlook.incompleteSources || unavailable || !agreementTotal
                    ? "Unknown"
                    : "None in window"
                  : outlook.firstRain <= now
                    ? "This hour"
                    : time(outlook.firstRain, track.timezone)}
              </dd>
            </div>
            <div>
              <dt>Highest hourly forecast</dt>
              <dd>
                {n(outlook.maxRain, 1)} <small>mm/h</small>
              </dd>
            </div>
          </dl>
          <details className="dashboard-method">
            <summary>How to read this</summary>
            <p>
              The percentage estimates at least {threshold} mm in any hour of
              the selected window. Each complete ensemble member is checked
              across the whole window; the middle estimate across model families
              is shown, with their range. Agreement counts are separate from
              this estimate. These are model estimates, not a calibrated
              guarantee or a measure of grip.
            </p>
            <p>
              Rain risk is elevated at an ensemble estimate of 60% or when at
              least half of three or more reporting model families predict rain.
              It is possible when any ensemble estimate reaches 20% or any model
              family signals rain. Otherwise it is low, or limited when there is
              too little evidence.
            </p>
            {outlook.estimates.map((estimate) => (
              <p key={estimate.id}>
                {estimate.name}:{" "}
                {estimate.probability === null
                  ? "unavailable"
                  : `${n(estimate.probability, 0)}% · ${estimate.wetMembers}/${estimate.validMembers} complete members`}
                {estimate.validMembers < estimate.totalMembers
                  ? ` · ${estimate.totalMembers - estimate.validMembers} incomplete`
                  : ""}
              </p>
            ))}
            {oldestEnsemble && (
              <p>
                Oldest ensemble fetched{" "}
                {time(oldestEnsemble / 1000, track.timezone)}. The forecast
                window includes the complete current hour.
              </p>
            )}
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
            <div>
              <dt>
                <Thermometer size={15} /> Track temperature
              </dt>
              <dd>
                {trackReading ? n(trackReading.temperature, 1) : "—"}
                <small>{trackReading ? "°C" : ""}</small>

                <span>
                  {trackReading
                    ? `Manual · ${new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: track.timezone }).format(new Date(trackReading.recordedAt))}${ages !== null && ages > 60 ? " · older reading" : ""}`
                    : "No trackside reading"}
                </span>
              </dd>
            </div>
          </dl>
          <details className="track-reading">
            <summary>
              <Plus size={13} />
              {trackReading ? "Update track reading" : "Add track reading"}
            </summary>
            <p className="fineprint">
              Enter your thermometer reading. Weather models do not measure
              asphalt temperature.
            </p>
            <form onSubmit={saveReading}>
              <label>
                Track temperature (°C)
                <input
                  type="number"
                  min="-50"
                  max="100"
                  step="0.1"
                  value={manualTemperature}
                  onChange={(event) => setManualTemperature(event.target.value)}
                  required
                />
              </label>
              <button className="button" type="submit">
                Save reading
              </button>
            </form>
          </details>
          {readingMessage && (
            <p role="status" className="fineprint">
              {readingMessage}
            </p>
          )}
        </section>
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
        <p className="fineprint">
          A dash means missing data. More forecasts add perspectives; related
          models still share one family vote.
        </p>
      </section>
      <CircuitMap track={track} />
    </>
  );
}
