import { time } from "@/lib/format";
import { usePitwall } from "@/lib/pitwall-context";
import { ArrowDownToLine, Info, Loader2, RefreshCw } from "lucide-react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { SourceCard } from "./source-card";
import { ChartTip } from "./weather-charts";
import { Empty } from "./weather-common";
import { VerificationPanel } from "./verification-panel";

export function HistoryView() {
  const {
    track,
    threshold,
    data,
    disabled,
    history,
    historyLoading,
    historyMessage,
    setHistoryRefresh,
    setHistoryValidHour,
    historyMetric,
    setHistoryMetric,
    toggleSource,
    exportHistory,
    validHistoryHours,
    selectedHistoryHour,
    historyLabel,
    historyUnit,
    historySeries,
    hasHistoryEvolution,
    historyByFetch,
  } = usePitwall();
  return (
    <>
      <div className="section-intro">
        <div>
          <div className="eyebrow">PROVENANCE, WITHOUT THE GUESSWORK</div>
          <h2>Know what you are looking at.</h2>
          <p>
            Every source has a different model, resolution and update cycle.
            These details matter when you compare forecasts.
          </p>
        </div>
        <button
          className="button secondary"
          onClick={() => setHistoryRefresh((v) => v + 1)}
          disabled={historyLoading}
        >
          <RefreshCw size={14} />
          Reload history
        </button>
      </div>
      <section className="panel">
        <div className="panel-head">
          <div>
            <div className="eyebrow">LOCAL FETCH LOG</div>
            <h2>
              Forecast evolution{" "}
              <span className="title-unit">{history.length} recorded rows</span>
            </h2>
          </div>
          <div className="history-controls">
            <label className="history-hour-select">
              METRIC
              <select
                aria-label="Forecast evolution metric"
                value={historyMetric}
                onChange={(e) =>
                  setHistoryMetric(e.target.value as typeof historyMetric)
                }
              >
                <option value="temperature">Air temperature · °C</option>
                <option value="precipitation">Hourly rainfall · mm/h</option>
                <option value="wind">Wind speed · km/h</option>
              </select>
            </label>
            <label className="history-hour-select">
              FORECAST VALID HOUR
              <select
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
            </label>
            <button
              className="button secondary"
              disabled={!history.length || historyLoading}
              onClick={exportHistory}
            >
              <ArrowDownToLine size={14} />
              Export history
            </button>
          </div>
        </div>
        {historyLoading ? (
          <div className="empty-state">
            <Loader2 className="spin" size={24} />
            <p>Loading recorded snapshots…</p>
          </div>
        ) : hasHistoryEvolution ? (
          <>
            <div className="history-chart">
              <ResponsiveContainer
                width="100%"
                height="100%"
                initialDimension={{ width: 320, height: 185 }}
              >
                <LineChart
                  data={historyByFetch}
                  margin={{ top: 15, right: 20, left: 0, bottom: 0 }}
                >
                  <CartesianGrid stroke="#ffffff0c" vertical={false} />
                  <XAxis
                    dataKey="time"
                    type="number"
                    domain={["dataMin", "dataMax"]}
                    scale="time"
                    tickFormatter={(v) => time(v, track.timezone)}
                    stroke="#58616b"
                    fontSize={10}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    stroke="#58616b"
                    fontSize={10}
                    unit={historyUnit}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip content={<ChartTip tz={track.timezone} />} />
                  {historySeries.map(({ id, points }, i) => (
                    <Line
                      key={id}
                      data={points}
                      dataKey="value"
                      name={`${data?.forecasts.find((f) => f.id === id)?.name || id} · ${historyUnit}`}
                      stroke={
                        data?.forecasts.find((f) => f.id === id)?.color ||
                        ["#e2fa76", "#91b9ec", "#bd9de5", "#e9bd76"][i % 4]
                      }
                      strokeWidth={2}
                      dot={{ r: 3 }}
                      connectNulls={false}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
            <p className="chart-note">
              Each point is a real fetched prediction for the same selected
              valid hour. Lines show how each source changed its {historyLabel}{" "}
              forecast ({historyUnit}). The horizontal axis is fetch time; this
              is not observed weather or an accuracy score.
            </p>
          </>
        ) : (
          <Empty
            title={
              historyByFetch.length
                ? "Your history is beginning."
                : "No logged history yet."
            }
            detail={`Forecast evolution needs at least two fetched ${historyLabel} values from the same source for this valid hour. ${historyMessage || "Snapshots accumulate from real fetches on this device."}`}
          />
        )}
      </section>
      <VerificationPanel
        history={history}
        track={track}
        threshold={threshold}
      />
      <div className="section-label">
        CONNECTION STATUS{" "}
        <span>
          {data?.statuses.filter((s) => s.status === "ok").length || 0} sources
          responding
        </span>
      </div>
      <div className="connection-list">
        {data?.statuses.map((s) => (
          <div key={s.id} className="connection-row">
            <span className={`connection-symbol ${s.status}`}>
              <span className="tiny-dot" />
            </span>
            <strong>{s.name}</strong>
            <span className="connection-message">{s.message}</span>
            <span
              className={`status-pill ${s.status === "ok" ? "" : s.status === "unconfigured" ? "neutral" : "amber"}`}
            >
              {s.status === "ok"
                ? "Available"
                : s.status === "cached"
                  ? "Saved forecast"
                  : s.status === "unconfigured"
                    ? "Optional · not configured"
                    : "Unavailable"}
            </span>
          </div>
        ))}
      </div>
      <div className="sources-grid">
        {data?.forecasts.map((f) => (
          <SourceCard
            key={f.id}
            forecast={f}
            disabled={disabled.includes(f.id)}
            toggle={() => toggleSource(f.id)}
            tz={track.timezone}
          />
        ))}
      </div>
      <section className="panel methodology">
        <div className="panel-head">
          <div>
            <div className="eyebrow">HOW TO READ PITWALL</div>
            <h2>Useful evidence. Visible limits.</h2>
          </div>
          <Info size={18} className="muted" />
        </div>
        <div className="method-grid">
          <div>
            <span>01 / CONSENSUS</span>
            <h3>One model family, one vote.</h3>
            <p>
              Related services are grouped. Each family’s available outputs are
              summarized by their median for an hour; the median across families
              describes the center. Wet vote is the fraction of reporting
              families at or above your rain threshold. It is not a calibrated
              rain probability.
            </p>
          </div>
          <div>
            <span>02 / TIME & RAIN</span>
            <h3>Hourly forecasts, local clock.</h3>
            <p>
              Series are aligned to the same UTC valid times and shown in the
              selected circuit’s timezone. Precipitation is an hourly amount.
              Providers are normalized to the following interval: 14:00 rain
              describes 14:00–15:00. Instantaneous fields such as air
              temperature remain at the hour timestamp. Exact shower arrival is
              not known.
            </p>
          </div>
          <div>
            <span>03 / RADAR</span>
            <h3>Recent observation, not prediction.</h3>
            <p>
              RainViewer supplies recent radar frames. The frame timestamp is
              not necessarily each underlying radar scan’s time. Native zoom 7
              limits detail; zooming closer cannot resolve the weather at
              individual corners. Coverage gaps and delayed scans matter.
            </p>
          </div>
          <div>
            <span>04 / THE SURFACE</span>
            <h3>Track conditions need context.</h3>
            <p>
              Air temperature, dew point and rain signals do not measure grip,
              surface water, drying rate, or track temperature. Compare radar
              with trackside observations and official race-control information.
            </p>
          </div>
        </div>
        {data?.notes?.length ? (
          <div className="provider-notes">
            {data.notes.map((note, i) => (
              <p key={i}>
                <Info size={12} />
                {note}
              </p>
            ))}
          </div>
        ) : null}
        <div className="attributions">
          <a
            href="https://open-meteo.com/en/docs"
            target="_blank"
            rel="noreferrer"
          >
            Open-Meteo documentation ↗
          </a>
          <a
            href="https://docs.api.met.no/doc/locationforecast/datamodel.html"
            target="_blank"
            rel="noreferrer"
          >
            MET Norway documentation ↗
          </a>
          <a
            href="https://www.rainviewer.com/api/weather-maps-api.html"
            target="_blank"
            rel="noreferrer"
          >
            RainViewer documentation ↗
          </a>
          <a
            href="https://www.openstreetmap.org/copyright"
            target="_blank"
            rel="noreferrer"
          >
            OpenStreetMap attribution ↗
          </a>
        </div>
      </section>
    </>
  );
}
