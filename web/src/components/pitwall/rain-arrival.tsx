import { usePitwall } from "@/lib/pitwall-context";
import { rainArrival } from "@/lib/near-rain";
import { rainIntensity } from "@/lib/rain-intensity";
import { n, time } from "@/lib/format";

export function RainArrivalView({ end }: { end: number }) {
  const { data, active, now, threshold, track, loading } = usePitwall();
  const forecasts = (data?.nearRain?.forecasts ?? []).filter((forecast) =>
    active.some((source) => source.id === forecast.sourceId),
  );
  const finish = Math.min(end, now + 6 * 3600);
  const first = Math.floor(now / 900) * 900;
  const times = Array.from(
    { length: Math.min(8, Math.ceil((finish - first) / 900)) },
    (_, index) => first + index * 900,
  );
  return (
    <section className="panel rain-arrival" aria-label="15-minute rain timing">
      <div className="panel-head">
        <div>
          <h2>Rain timing</h2>
          <p className="panel-sub">15-minute regional forecasts</p>
        </div>
      </div>
      {forecasts.length ? (
        <>
          <div className="arrival-models">
            {forecasts.map((forecast) => {
              const arrival = rainArrival(
                forecast.points,
                900,
                now,
                finish,
                threshold,
              );
              return (
                <div className="arrival-model" key={forecast.id}>
                  <span>{forecast.name}</span>
                  <strong>
                    {arrival.first
                      ? `${time(arrival.first.start, track.timezone)}–${time(arrival.first.end, track.timezone)}`
                      : arrival.complete
                        ? "No rain in window"
                        : "Timing incomplete"}
                  </strong>
                  <p>
                    {arrival.first
                      ? arrival.complete
                        ? "First model rain signal"
                        : "First available signal · incomplete window"
                      : `Until ${time(finish, track.timezone)}`}
                  </p>
                  <ol
                    className="arrival-strip"
                    aria-label={`${forecast.name}, next ${times.length * 15} minutes`}
                  >
                    {times.map((value) => {
                      const point = forecast.points.find(
                        (point) => point.time === value,
                      );
                      const rate =
                        point?.precipitation == null
                          ? null
                          : point.precipitation * 4;
                      const label = `${time(value, track.timezone)}–${time(value + 900, track.timezone)}: ${rate === null ? "unavailable" : `${rainIntensity(rate)} rain, ${n(rate, 1)} mm/h average`}`;
                      return (
                        <li key={value} title={label} aria-label={label}>
                          <span className="arrival-bar" aria-hidden="true">
                            <i
                              style={{
                                height:
                                  rate === null
                                    ? "0"
                                    : `${Math.min(100, Math.max(rate > 0 ? 8 : 2, (rate / 10) * 100))}%`,
                              }}
                            />
                          </span>
                          <small>{time(value, track.timezone)}</small>
                          <b>
                            {rate === null
                              ? "—"
                              : rate === 0
                                ? "·"
                                : n(rate, 1)}
                          </b>
                        </li>
                      );
                    })}
                  </ol>
                </div>
              );
            })}
          </div>
          <p className="fineprint">
            Bars show the next {times.length * 15} minutes in mm/h. Start times
            are forecast windows, not exact arrival times.
          </p>
        </>
      ) : (
        <div className="arrival-unavailable">
          <strong>
            {loading ? "Checking finer timing…" : "Hourly timing available"}
          </strong>
          <p>
            Native 15-minute data{" "}
            {loading
              ? "is loading."
              : "is unavailable here. Use the one-hour windows in the rain snapshot."}
          </p>
        </div>
      )}
      <details className="forecast-explainer">
        <summary>Timing limits</summary>
        <p>
          Only native ICON-D2 and AROME 15-minute output is used here, when
          available and enabled. These are separate regional runs from the same
          model families, not extra independent votes.
        </p>
        <p>
          Some regions and model runs have no data. The app keeps those gaps
          rather than interpolating hourly amounts into more precise times.
        </p>
        {data?.nearRain?.statuses
          .filter((status) => status.status === "error")
          .map((status) => (
            <p key={status.id}>
              {status.name}: {status.message}
            </p>
          ))}
      </details>
    </section>
  );
}
