import type { Forecast } from "@/lib/contracts";
import { time } from "@/lib/format";
import { Info } from "lucide-react";
export function SourceCard({
  forecast: f,
  disabled,
  toggle,
  tz,
}: {
  forecast: Forecast;
  disabled: boolean;
  toggle: () => void;
  tz: string;
}) {
  return (
    <article className={`panel source-card ${disabled ? "disabled" : ""}`}>
      <div className="source-card-top">
        <span className="source-swatch" style={{ background: f.color }} />
        <span className="source-provider">{f.provider}</span>
        <label className="toggle-switch">
          <input
            type="checkbox"
            checked={!disabled}
            onChange={toggle}
            aria-label={`Include ${f.name} in comparison`}
          />
          <span />
        </label>
      </div>
      <h3>{f.name}</h3>
      <div className="source-detail">
        <span>MODEL FAMILY</span>
        <strong>{f.family}</strong>
      </div>
      <div className="source-detail">
        <span>GRID / RESOLUTION</span>
        <strong>{f.resolution}</strong>
      </div>
      <div className="source-detail">
        <span>DELIVERED THROUGH</span>
        <strong>{f.transport}</strong>
      </div>
      <div className="source-detail">
        <span>FETCHED · LOCAL TIME</span>
        <strong>{time(new Date(f.fetchedAt).getTime() / 1000, tz)}</strong>
      </div>
      {f.caveat && (
        <p className="source-caveat">
          <Info size={12} />
          {f.caveat}
        </p>
      )}
    </article>
  );
}
