import { day, n, time } from "@/lib/format";
import { usePitwall } from "@/lib/pitwall-context";
import { sourceColor } from "@/lib/theme";
import { rainIntensity } from "@/lib/rain-intensity";
import { rainValue } from "@/lib/rain-value";
import { SourceRow } from "./source-card";
import { RainChart } from "./weather-charts";
import { buildConsensus } from "@/lib/consensus";

export function ComparisonView() {
  const {
    track,
    data,
    disabled,
    horizon,
    setHorizon,
    active,
    future,
    toggleSource,
    appearance,
    focus,
    threshold,
  } = usePitwall();
  const matrix =
    horizon === 0
      ? buildConsensus(active, threshold).filter(
          (h) =>
            h.time < focus.displayEnd && h.time + 3600 > focus.displayStart,
        )
      : future.slice(0, horizon);
  return (
    <>
      <section className="panel heatmap-panel">
        <div className="panel-head">
          <div>
            <h2>Hour by hour</h2>
            <p className="panel-sub">Compare rain amounts · mm/h</p>
          </div>
          <select
            className="compact-select"
            aria-label="Forecast hours displayed"
            value={horizon}
            onChange={(e) => setHorizon(+e.target.value)}
          >
            <option value={0}>Your run + buffers</option>
            {[1, 3, 6, 12, 24, 48, 72].map((h) => (
              <option key={h} value={h}>
                {h} {h === 1 ? "hour" : "hours"}
              </option>
            ))}
          </select>
        </div>
        <div
          className="table-scroll"
          tabIndex={0}
          role="region"
          aria-label="Hourly rainfall comparison"
        >
          <table className="heatmap">
            <thead>
              <tr>
                <th scope="col">Forecast</th>
                {matrix.map((h) => (
                  <th scope="col" key={h.time}>
                    {time(h.time, track.timezone)}
                    {day(h.time, track.timezone) !==
                      day(matrix[0].time, track.timezone) && (
                      <small>{day(h.time, track.timezone).slice(5)}</small>
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {active.map((f) => (
                <tr key={f.id}>
                  <th scope="row">
                    <i
                      style={{
                        background: sourceColor(f.color, appearance.theme),
                      }}
                    />
                    {f.name}
                  </th>
                  {matrix.map((h) => {
                    const value = rainValue(
                      f.hours.find((x) => x.time === h.time)?.precipitation,
                    );
                    const intensity = rainIntensity(value);
                    return (
                      <td
                        key={h.time}
                        className={`rain-cell rain-${intensity.toLowerCase().replaceAll(" ", "-")}`}
                        title={`${f.name} · ${time(h.time, track.timezone, true)}–${time(h.time + 3600, track.timezone)} · ${value === null ? "Missing data" : `${n(value, 2)} mm/h · ${intensity}`}`}
                      >
                        {value === null ? "—" : value === 0 ? "·" : n(value, 1)}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!matrix.length && (
          <p className="empty-table">No hourly rain data available.</p>
        )}
        <p className="fineprint">
          A dot means zero; a dash means missing data. Blue is light, amber
          moderate and red heavy rain.
        </p>
      </section>
      <details className="panel comparison-chart">
        <summary>Rain chart · show more detail</summary>
        <div className="panel-head">
          <div>
            <h2>Rain by source</h2>
            <p className="panel-sub">
              {horizon === 0 ? "Your run + buffers" : `${horizon}-hour window`}{" "}
              · hourly averages
            </p>
          </div>
        </div>
        <RainChart
          hours={matrix}
          forecasts={active}
          tz={track.timezone}
          height={240}
        />
        <div className="chart-legend">
          <span>
            <i className="legend-median" />
            Median
          </span>
          {active.map((f) => (
            <span key={f.id}>
              <i
                style={{ background: sourceColor(f.color, appearance.theme) }}
              />
              {f.name}
            </span>
          ))}
        </div>
      </details>
      <section className="panel">
        <div className="panel-head">
          <h2>
            Sources <span className="count">{active.length}</span>
          </h2>
          <span className="panel-hint">Related models share one vote</span>
        </div>
        <ul className="list">
          {data?.forecasts.map((f) => (
            <SourceRow
              key={f.id}
              forecast={f}
              disabled={disabled.includes(f.id)}
              toggle={() => toggleSource(f.id)}
              tz={track.timezone}
            />
          ))}
        </ul>
        <p className="fineprint">
          Agreement is a signal, not a guarantee: models share data and can be
          wrong together.
        </p>
      </section>
    </>
  );
}
