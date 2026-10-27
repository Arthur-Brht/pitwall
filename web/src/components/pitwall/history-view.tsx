import { time } from "@/lib/format";
import { usePitwall } from "@/lib/pitwall-context";
import { sourceColor } from "@/lib/theme";
import { ArrowDownToLine, Loader2, RefreshCw } from "lucide-react";
import {
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ChartTip, useChartTheme } from "./weather-charts";
import { Empty } from "./weather-common";
import { VerificationPanel } from "./verification-panel";

export function HistoryView() {
  const {
    track,
    threshold,
    data,
    history,
    historyLoading,
    historyMessage,
    setHistoryRefresh,
    setHistoryValidHour,
    historyMetric,
    setHistoryMetric,
    exportHistory,
    validHistoryHours,
    selectedHistoryHour,
    historyLabel,
    historyUnit,
    historySeries,
    hasHistoryEvolution,
    historyByFetch,
    appearance,
  } = usePitwall();
  const chart = useChartTheme();
  const fallback = [
    chart.colors.accent,
    chart.colors.rain,
    chart.colors.gust,
    chart.colors.temperature,
  ];
  return (
    <>
      <section className="panel">
        <div className="panel-head wrap">
          <div>
            <h2>Forecast changes</h2>
            <p className="panel-sub">
              How each source’s prediction for one hour shifted over time
            </p>
          </div>
          <div className="history-controls">
            <select
              className="compact-select"
              aria-label="Forecast evolution metric"
              value={historyMetric}
              onChange={(e) =>
                setHistoryMetric(e.target.value as typeof historyMetric)
              }
            >
              <option value="temperature">Temperature</option>
              <option value="precipitation">Rain</option>
              <option value="wind">Wind</option>
            </select>
            <select
              className="compact-select"
              aria-label="Forecast valid hour"
              value={selectedHistoryHour}
              onChange={(e) => setHistoryValidHour(+e.target.value)}
            >
              {validHistoryHours.map((t) => (
                <option key={t} value={t}>
                  {time(t, track.timezone, true)}
                </option>
              ))}
            </select>
            <button
              className="icon-button"
              onClick={() => setHistoryRefresh((v) => v + 1)}
              disabled={historyLoading}
              aria-label="Reload history"
              title="Reload history"
            >
              <RefreshCw size={14} />
            </button>
            <button
              className="icon-button"
              disabled={!history.length || historyLoading}
              onClick={exportHistory}
              aria-label="Export history"
              title="Export history (CSV)"
            >
              <ArrowDownToLine size={14} />
            </button>
          </div>
        </div>
        {historyLoading ? (
          <div className="empty-state">
            <Loader2 className="spin" size={22} />
            <p>Loading saved snapshots…</p>
          </div>
        ) : hasHistoryEvolution ? (
          <>
            <div className="chart" style={{ height: 220 }}>
              <ResponsiveContainer
                width="100%"
                height="100%"
                initialDimension={{ width: 320, height: 220 }}
              >
                <LineChart
                  data={historyByFetch}
                  margin={{ top: 12, right: 8, left: -22, bottom: 0 }}
                >
                  {chart.grid}
                  <XAxis
                    dataKey="time"
                    type="number"
                    domain={["dataMin", "dataMax"]}
                    scale="time"
                    tickFormatter={(v) => time(v, track.timezone)}
                    {...chart.axis}
                  />
                  <YAxis unit={historyUnit} {...chart.axis} />
                  <Tooltip content={<ChartTip tz={track.timezone} />} />
                  {historySeries.map(({ id, points }, i) => {
                    const source = data?.forecasts.find((f) => f.id === id);
                    return (
                      <Line
                        key={id}
                        data={points}
                        dataKey="value"
                        name={`${source?.name || id} · ${historyUnit}`}
                        stroke={
                          source
                            ? sourceColor(source.color, appearance.theme)
                            : fallback[i % fallback.length]
                        }
                        strokeWidth={2}
                        dot={{ r: 3 }}
                        connectNulls={false}
                      />
                    );
                  })}
                </LineChart>
              </ResponsiveContainer>
            </div>
            <p className="fineprint">
              Each point is a real fetch of the {historyLabel} forecast. This
              shows change, not accuracy.
            </p>
          </>
        ) : (
          <Empty
            title={
              historyByFetch.length
                ? "History is building up"
                : "No history yet"
            }
            detail={
              historyMessage ||
              "Pitwall saves each forecast you fetch. Refresh later to see how predictions move."
            }
          />
        )}
      </section>

      <VerificationPanel
        history={history}
        track={track}
        threshold={threshold}
      />

      <section className="panel">
        <div className="panel-head">
          <h2>
            Connection status{" "}
            <span className="count">
              {data?.statuses.filter((s) => s.status === "ok").length || 0}/
              {data?.statuses.length || 0}
            </span>
          </h2>
        </div>
        <ul className="list">
          {data?.statuses.map((s) => (
            <li key={s.id} className="list-row connection-row">
              <span className={`status-dot ${s.status}`} aria-hidden="true" />
              <div className="list-main static">
                <strong>{s.name}</strong>
                <span>{s.message}</span>
              </div>
              <span className={`status-pill ${s.status}`}>
                {s.status === "ok"
                  ? "Online"
                  : s.status === "cached"
                    ? "Saved forecast"
                    : s.status === "unconfigured"
                      ? "Not set up"
                      : "Unavailable"}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <details className="panel disclosure methodology">
        <summary>How Pitwall reads the forecast</summary>
        <div className="method-grid">
          <div>
            <h3>One family, one vote</h3>
            <p>
              Related services are grouped. The median across families is the
              centre; “families wet” counts how many reach your rain threshold.
              It isn’t a calibrated probability.
            </p>
          </div>
          <div>
            <h3>Hourly, local time</h3>
            <p>
              All sources are aligned to the same hours in the circuit’s
              timezone. Rain at 14:00 means the total for 14:00–15:00, so exact
              shower timing isn’t known.
            </p>
          </div>
          <div>
            <h3>Radar is the past</h3>
            <p>
              RainViewer frames show recent observed rain at about zoom 7.
              Zooming closer adds no detail, and coverage gaps matter.
            </p>
          </div>
          <div>
            <h3>Not the surface</h3>
            <p>
              None of this measures grip, standing water or track temperature.
              Combine it with trackside observations and race control.
            </p>
          </div>
        </div>
        {data?.notes?.length ? (
          <ul className="provider-notes">
            {data.notes.map((note, i) => (
              <li key={i}>{note}</li>
            ))}
          </ul>
        ) : null}
        <p className="attributions">
          <a
            href="https://open-meteo.com/en/docs"
            target="_blank"
            rel="noreferrer"
          >
            Open-Meteo docs
          </a>
          <a
            href="https://docs.api.met.no/doc/locationforecast/datamodel.html"
            target="_blank"
            rel="noreferrer"
          >
            MET Norway docs
          </a>
          <a
            href="https://www.rainviewer.com/api/weather-maps-api.html"
            target="_blank"
            rel="noreferrer"
          >
            RainViewer docs
          </a>
          <a
            href="https://www.openstreetmap.org/copyright"
            target="_blank"
            rel="noreferrer"
          >
            OpenStreetMap
          </a>
        </p>
      </details>
    </>
  );
}
