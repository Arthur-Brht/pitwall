import { day, n, time } from "@/lib/format";
import { usePitwall } from "@/lib/pitwall-context";
import { sourceColor } from "@/lib/theme";
import { SourceRow } from "./source-card";
import type { CSSProperties } from "react";
import { RainChart } from "./weather-charts";

export function ComparisonView() {
  const {
    track,
    data,
    disabled,
    threshold,
    horizon,
    setHorizon,
    active,
    future,
    toggleSource,
    appearance,
  } = usePitwall();
  const matrix = future.slice(0, 24);
  return (
    <>
      <section className="panel">
        <div className="panel-head">
          <div>
            <h2>Rain by source</h2>
            <p className="panel-sub">mm in each hour</p>
          </div>
          <select
            className="compact-select"
            aria-label="Forecast hours displayed"
            value={horizon}
            onChange={(e) => setHorizon(+e.target.value)}
          >
            <option value={12}>12 hours</option>
            <option value={24}>24 hours</option>
            <option value={48}>48 hours</option>
            <option value={72}>72 hours</option>
          </select>
        </div>
        <RainChart
          hours={future.slice(0, horizon)}
          forecasts={active}
          tz={track.timezone}
          height={260}
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
      </section>

      <section className="panel heatmap-panel">
        <div className="panel-head">
          <h2>Hour by hour</h2>
          <span className="panel-hint">Highlighted at ≥ {threshold} mm/h</span>
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
                <th scope="col">
                  <span className="sr-only">Source</span>
                </th>
                {matrix.map((h) => (
                  <th scope="col" key={h.time}>
                    {time(h.time, track.timezone).slice(0, 2)}
                    {day(h.time, track.timezone) !==
                      day(matrix[0].time, track.timezone) && <small>+1</small>}
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
                    const v =
                      f.hours.find((x) => x.time === h.time)?.precipitation ??
                      null;
                    const wet = v !== null && v >= threshold;
                    return (
                      <td
                        key={h.time}
                        className={v === null ? "missing" : wet ? "wet" : ""}
                        title={`${f.name} · ${time(h.time, track.timezone, true)} · ${n(v, 2)} mm`}
                        style={
                          wet
                            ? ({
                                "--wet": Math.min(1, 0.35 + v * 0.3),
                              } as CSSProperties)
                            : undefined
                        }
                      >
                        {v === null ? "—" : v === 0 ? "·" : n(v, 1)}
                      </td>
                    );
                  })}
                </tr>
              ))}
              <tr className="consensus-row">
                <th
                  scope="row"
                  title="Model families at or above the threshold; not a probability"
                >
                  Families wet
                </th>
                {matrix.map((h) => (
                  <td
                    key={h.time}
                    className={
                      h.agreement === "split" || h.agreement === "mixed"
                        ? "split-cell"
                        : ""
                    }
                  >
                    {h.wetShare === null ? "—" : `${h.wetCount}/${h.count}`}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
        <p className="fineprint">
          A dash means no data, never zero. Hourly totals can hide short, heavy
          showers.
        </p>
      </section>

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
