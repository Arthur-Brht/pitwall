import type { CSSProperties } from "react";
import type { WindOutlook } from "@/lib/wind-outlook";
import { compass, n } from "@/lib/format";

export function WindDirection({
  wind,
  compact = false,
  animate = true,
}: {
  wind: WindOutlook;
  compact?: boolean;
  animate?: boolean;
}) {
  const from = wind.direction;
  const description =
    from !== null
      ? `From ${compass(from)} towards ${compass(wind.towards)}`
      : wind.kind === "calm"
        ? "Calm · below 1 km/h"
        : wind.kind === "variable"
          ? "Directions vary across forecasts or hours"
          : "Wind direction unavailable";
  return (
    <div
      className={`wind-direction ${compact ? "compact" : ""} ${animate ? "" : "wind-paused"}`}
      data-wind-state={wind.kind}
    >
      <svg viewBox="0 0 100 100" role="img" aria-label={description}>
        <circle cx="50" cy="50" r="34" className="wind-compass-ring" />
        <text x="50" y="10">
          N
        </text>
        <text x="94" y="53">
          E
        </text>
        <text x="50" y="98">
          S
        </text>
        <text x="6" y="53">
          W
        </text>
        {from !== null ? (
          <g
            transform={`rotate(${wind.towards} 50 50)`}
            data-wind-towards={wind.towards}
          >
            <path
              className="wind-stream"
              d="M 39 76 V 30 M 61 76 V 30"
              style={
                {
                  "--wind-duration": `${wind.speed && wind.speed.max > 20 ? 1.5 : 2.5}s`,
                } as CSSProperties
              }
            />
            <path className="wind-arrow" d="M50 78 V24 M42 34 L50 24 L58 34" />
          </g>
        ) : (
          <text className="wind-unknown" x="50" y="57">
            {wind.kind === "calm" ? "○" : "—"}
          </text>
        )}
      </svg>
      {!compact && (
        <div className="wind-direction-copy">
          <strong>
            Wind ·{" "}
            {from !== null
              ? `From ${compass(from)}`
              : wind.kind === "variable"
                ? "Direction varies"
                : wind.kind === "calm"
                  ? "Calm"
                  : "Direction unavailable"}
          </strong>
          <span>
            {from !== null
              ? `Blowing towards ${compass(wind.towards)}`
              : description}
          </span>
          <span>
            {wind.speed
              ? `${n(wind.speed.min)}${Math.round(wind.speed.min) !== Math.round(wind.speed.max) ? `–${n(wind.speed.max)}` : ""} km/h`
              : "Speed unavailable"}
          </span>
          <span>
            {wind.gust !== null
              ? `Gusts up to ${n(wind.gust)} km/h`
              : "Gusts unavailable"}
          </span>
        </div>
      )}
    </div>
  );
}
