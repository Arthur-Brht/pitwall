import { usePitwall } from "@/lib/pitwall-context";
import { enabledNearRain } from "@/lib/rain-decision";
import { NEAR_RAIN_SPECS } from "@/lib/near-rain";
import { rainIntensity } from "@/lib/rain-intensity";
import { rainValue } from "@/lib/rain-value";
import { n, time } from "@/lib/format";

export function RainArrivalView({ end }: { end: number }) {
  const { data, selectedSourceIds, disabled, now, track, loading } =
    usePitwall();
  const forecasts = enabledNearRain(
    data?.nearRain?.forecasts ?? [],
    selectedSourceIds,
    disabled,
  );
  const first = Math.floor(now / 900) * 900;
  const times = Array.from(
    { length: Math.min(8, Math.ceil((end - first) / 900)) },
    (_, i) => first + i * 900,
  );
  return (
    <section className="panel rain-arrival" aria-label="15-minute rain timing">
      <div className="panel-head">
        <div>
          <h2>Rain timing</h2>
          <p className="panel-sub">
            15-minute regional forecasts · {time(first, track.timezone)}–
            {time(first + times.length * 900, track.timezone)}
          </p>
        </div>
      </div>
      {forecasts.length ? (
        <div
          className="table-scroll"
          role="region"
          aria-label="15-minute forecast comparison"
          tabIndex={0}
        >
          <table className="matrix arrival-matrix">
            <thead>
              <tr>
                <th scope="col">Forecast</th>
                {times.map((t) => (
                  <th key={t} scope="col">
                    {time(t, track.timezone)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {forecasts.map((f) => (
                <tr key={f.id}>
                  <th scope="row">{f.name}</th>
                  {times.map((t) => {
                    const amount = rainValue(
                      f.points.find((p) => p.time === t)?.precipitation,
                    );
                    const rate = amount === null ? null : amount * 4;
                    const intensity = rainIntensity(rate);
                    const label = `${f.name} · ${time(t, track.timezone)}–${time(t + 900, track.timezone)}: ${rate === null ? "unavailable" : `${intensity}, ${n(rate, 1)} mm/h average`}`;
                    return (
                      <td
                        key={t}
                        className={`rain-cell rain-${intensity.toLowerCase().replaceAll(" ", "-")}`}
                        title={label}
                        aria-label={label}
                      >
                        {rate === null ? "—" : rate === 0 ? "·" : n(rate, 1)}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="arrival-unavailable">
          {loading
            ? "Checking finer timing…"
            : "15-minute regional data is unavailable here. Use hourly windows for timing."}
        </p>
      )}
      <details className="forecast-explainer">
        <summary>Timing and units</summary>
        <p>
          Cells show average mm/h in each 15-minute window. A dot means zero; a
          dash means missing data. These are regional model forecasts, not radar
          observations or exact arrival times.
        </p>
        <p>
          Only native ICON-D2 and AROME output is shown, when enabled and
          available. Hourly values are never interpolated into finer times.
          Related regional forecasts do not add independent family votes.
        </p>
        {data?.nearRain?.statuses
          .filter(
            (s) =>
              s.status === "error" &&
              NEAR_RAIN_SPECS.some(
                (spec) =>
                  spec.id === s.id &&
                  selectedSourceIds.includes(spec.sourceId) &&
                  !disabled.includes(spec.sourceId),
              ),
          )
          .map((s) => (
            <p key={s.id}>
              {s.name}: {s.message}
            </p>
          ))}
      </details>
    </section>
  );
}
