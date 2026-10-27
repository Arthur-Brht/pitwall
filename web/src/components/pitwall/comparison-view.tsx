import { day, n, time } from "@/lib/format";
import { usePitwall } from "@/lib/pitwall-context";
import { Info, SlidersHorizontal } from "lucide-react";
import { SourceCard } from "./source-card";
import { RainChart } from "./weather-charts";

export function ComparisonView() {
  const {
    track,
    data,
    disabled,
    threshold,
    setSettings,
    horizon,
    setHorizon,
    active,
    future,
    availableCount,
    toggleSource,
  } = usePitwall();
  return (
    <>
      <div className="section-intro">
        <div>
          <div className="eyebrow">A SECOND OPINION. AND A THIRD.</div>
          <h2>See the disagreement.</h2>
          <p>
            Compare the same valid hour across the enabled sources. A family
            gets one consensus vote, even when multiple services use it.
          </p>
        </div>
        <button className="button secondary" onClick={() => setSettings(true)}>
          <SlidersHorizontal size={14} />
          Choose sources
        </button>
      </div>
      <section className="panel">
        <div className="panel-head">
          <div>
            <h2>Rain by source</h2>
            <p className="subtext">
              Precipitation · mm in the hourly interval beginning at the
              indicated time
            </p>
          </div>
          <select
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
          height={280}
        />
        <div className="chart-legend">
          {active.map((f) => (
            <button
              className="legend-source"
              key={f.id}
              onClick={() => toggleSource(f.id)}
              title="Hide this source"
            >
              <i style={{ background: f.color }} />
              {f.name}
            </button>
          ))}
        </div>
      </section>
      <section className="panel heatmap-panel">
        <div className="panel-head">
          <div>
            <div className="eyebrow">MODEL RAINFALL MATRIX</div>
            <h2>A wet hour, at a glance.</h2>
          </div>
          <span className="subtle-chip">Wet threshold ≥ {threshold} mm/h</span>
        </div>
        <div
          className="heatmap-scroll"
          tabIndex={0}
          role="region"
          aria-label="Hourly rainfall comparison"
        >
          <table className="heatmap">
            <thead>
              <tr>
                <th>FORECAST SOURCE</th>
                {future.slice(0, 24).map((h) => (
                  <th key={h.time}>
                    {time(h.time, track.timezone).slice(0, 2)}
                    <small>
                      {day(h.time, track.timezone) !==
                      day(future[0].time, track.timezone)
                        ? "+1d"
                        : ""}
                    </small>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {active.map((f) => (
                <tr key={f.id}>
                  <th>
                    <i style={{ background: f.color }} />
                    {f.name}
                    <small>{f.resolution}</small>
                  </th>
                  {future.slice(0, 24).map((h) => {
                    const v =
                      f.hours.find((x) => x.time === h.time)?.precipitation ??
                      null;
                    return (
                      <td
                        key={h.time}
                        title={`${f.name} · ${time(h.time, track.timezone, true)} · ${n(v, 2)} mm`}
                        style={{
                          background:
                            v === null
                              ? "#171c1e"
                              : v >= threshold
                                ? `rgba(127,177,224,${Math.min(0.45, 0.15 + v * 0.15)})`
                                : "#ffffff03",
                          color:
                            v === null
                              ? "#a1b0a5"
                              : v >= threshold
                                ? "#d2e9ff"
                                : "#a1b0a5",
                        }}
                      >
                        {n(v, 1)}
                      </td>
                    );
                  })}
                </tr>
              ))}
              <tr className="consensus-row">
                <th>
                  Wet family vote<small>Not probability</small>
                </th>
                {future.slice(0, 24).map((h) => (
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
        <p className="chart-note">
          A dash means unavailable; it is never treated as zero rain. Hourly
          amounts can conceal short, intense showers.
        </p>
      </section>
      <div className="section-label">
        THE SOURCES BEHIND YOUR FORECAST{" "}
        <span>{availableCount} returned data</span>
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
      <div className="method-note">
        <Info size={18} />
        <div>
          <strong>Agreement is a signal, not a guarantee.</strong>
          <p>
            The median summarizes enabled, available model families. Related
            services are grouped before counting votes. Different models share
            observations and methods, and their errors can be correlated. More
            sources do not automatically mean better accuracy.
          </p>
        </div>
      </div>
    </>
  );
}
