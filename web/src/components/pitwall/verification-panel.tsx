import { MODEL_SPECS } from "@/lib/providers";
import { useMemo, useRef, useState } from "react";
import { ArrowDownToLine, Upload } from "lucide-react";
import type { HistoryPoint, Track } from "@/lib/contracts";
import { download, toCsv } from "@/lib/exports";
import {
  OBSERVATION_HEADER,
  parseObservations,
  verifyForecasts,
  type Observation,
} from "@/lib/verification";

const sourceName = (id: string) =>
  MODEL_SPECS.find((source) => source.id === id)?.name ??
  (id === "metno" ? "MET Norway" : id);
export function VerificationPanel({
  history,
  track,
  threshold,
}: {
  history: HistoryPoint[];
  track: Track;
  threshold: number;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [observations, setObservations] = useState<Observation[]>([]);
  const [message, setMessage] = useState("");
  const assessment = useMemo(() => {
    try {
      return {
        result: verifyForecasts(history, observations, track, threshold),
        error: "",
      };
    } catch (error) {
      return {
        result: null,
        error:
          error instanceof Error
            ? error.message
            : "Observations could not be compared.",
      };
    }
  }, [history, observations, track, threshold]);
  async function load(file?: File) {
    if (!file) return;
    try {
      if (file.size > 1048576) throw Error("Choose a CSV smaller than 1 MB.");
      const points = parseObservations(await file.text());
      verifyForecasts(history, points, track, threshold);
      setObservations(points);
      setMessage(
        `Loaded ${points.length} measured hours from ${points[0].station}.`,
      );
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "The observations could not be loaded.",
      );
    } finally {
      if (input.current) input.current.value = "";
    }
  }
  const result = assessment.result;
  return (
    <section className="panel verification-panel">
      <div className="panel-head">
        <div>
          <div className="eyebrow">CHECK FORECASTS AGAINST MEASUREMENTS</div>
          <h2>Forecast verification</h2>
        </div>
        <button
          className="button secondary"
          onClick={() => input.current?.click()}
        >
          <Upload size={14} />
          Import observations
        </button>
        <input
          ref={input}
          type="file"
          hidden
          accept=".csv,text/csv"
          aria-label="Import hourly observations"
          onChange={(e) => void load(e.target.files?.[0])}
        />
      </div>
      <p className="verification-note">
        Compare saved forecasts with your own hourly station measurements. Files
        stay in this page until you reload; nothing is uploaded. Forecast
        changes alone do not establish accuracy.
      </p>
      {message && (
        <p className="verification-note" role="status">
          {message}
        </p>
      )}
      {assessment.error && (
        <p className="inline-warning" role="alert">
          {assessment.error}
        </p>
      )}
      {observations.length > 0 && result && (
        <>
          <p className="verification-note">
            <strong>{observations[0].station}</strong> ·{" "}
            {result.distance?.toFixed(1)} km from the selected coordinates ·{" "}
            {result.matchedHours} matched valid hours. Source:{" "}
            {observations[0].source}. Nearby station conditions can differ from
            the circuit.
          </p>
          {result.matchedHours < 24 && (
            <p className="inline-warning">
              Limited sample: {result.matchedHours} distinct measured hours.
              This comparison cannot establish general forecast accuracy.
            </p>
          )}
          {!result.scores.length ? (
            <p className="verification-note">
              No eligible matches yet. Keep forecasts captured before the
              measured UTC hour, then import observations for those same hours.
              Missing values are excluded.
            </p>
          ) : (
            <>
              <div
                className="session-source-scroll"
                tabIndex={0}
                role="region"
                aria-label="Forecast verification results"
              >
                <table className="session-source-table">
                  <caption>
                    Errors against measured station conditions; lower mean
                    absolute error is better. Positive bias means
                    overprediction.
                  </caption>
                  <thead>
                    <tr>
                      <th scope="col">Source</th>
                      <th scope="col">Lead</th>
                      <th scope="col">Field</th>
                      <th scope="col">Hours</th>
                      <th scope="col">Mean absolute error</th>
                      <th scope="col">Bias</th>
                      <th scope="col">Wet hits / misses / false alarms</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.scores.map((score) => (
                      <tr
                        key={`${score.provider}-${score.lead}-${score.metric}`}
                      >
                        <th scope="row">{sourceName(score.provider)}</th>
                        <td>{score.lead}</td>
                        <td>{score.metric}</td>
                        <td>{score.count}</td>
                        <td>
                          {score.mae.toFixed(2)}{" "}
                          {score.metric === "temperature"
                            ? "°C"
                            : score.metric === "wind"
                              ? "km/h"
                              : "mm"}
                        </td>
                        <td>{score.bias.toFixed(2)}</td>
                        <td>
                          {score.wet
                            ? `${score.wet.hits} / ${score.wet.misses} / ${score.wet.falseAlarms}`
                            : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="verification-actions">
                <button
                  className="button secondary"
                  onClick={() =>
                    download(
                      `pitwall-${track.id}-verification.csv`,
                      toCsv([
                        [
                          "station",
                          "source",
                          "station_distance_km",
                          "forecast_source",
                          "lead_band",
                          "metric",
                          "matched_hours",
                          "mae",
                          "bias",
                          "rmse",
                          "wet_threshold_mm",
                          "wet_hits",
                          "wet_misses",
                          "false_alarms",
                          "correct_dry",
                        ],
                        ...result.scores.map((s) => [
                          observations[0].station,
                          observations[0].source,
                          result.distance,
                          s.provider,
                          s.lead,
                          s.metric,
                          s.count,
                          s.mae,
                          s.bias,
                          s.rmse,
                          threshold,
                          s.wet?.hits,
                          s.wet?.misses,
                          s.wet?.falseAlarms,
                          s.wet?.correctDry,
                        ]),
                      ]),
                    )
                  }
                >
                  <ArrowDownToLine size={14} />
                  Export verification
                </button>
              </div>
            </>
          )}
        </>
      )}
      <details className="verification-note">
        <summary>Observation CSV format and method</summary>
        <p>
          Use one station within 25 km. UTC timestamps must mark exact hours.
          Temperature is °C, wind is km/h, and rain is the measured total for
          the following hour. Leave unavailable values empty. Use real
          observations, not reanalysis or another forecast. Match the
          measurement periods and sensor heights; hourly means differ from
          instant model values.
        </p>
        <code className="csv-schema">{OBSERVATION_HEADER}</code>
        <p>
          Scores retain the latest forecast per source, valid hour and lead
          band, captured strictly before the valid hour. They exclude missing
          values and never fill gaps. Lead bands use fetch time, since model
          initialization time is not supplied. A small sample or a nearby
          station does not establish track-level or general forecast accuracy.
        </p>
        <button
          className="button secondary"
          onClick={() =>
            download(
              "pitwall-observations-template.csv",
              OBSERVATION_HEADER + "\r\n",
            )
          }
        >
          Download empty CSV template
        </button>
      </details>
    </section>
  );
}
