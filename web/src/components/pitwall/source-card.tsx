import type { Forecast } from "@/lib/contracts";
import { time } from "@/lib/format";
import { usePitwall } from "@/lib/pitwall-context";
import { sourceColor } from "@/lib/theme";
export function SourceRow({
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
  const { appearance } = usePitwall();
  return (
    <li className={`list-row source-row ${disabled ? "disabled" : ""}`}>
      <span
        className="source-swatch"
        style={{ background: sourceColor(f.color, appearance.theme) }}
      />
      <div className="list-main static">
        <strong>{f.name}</strong>
        <span>
          {f.provider} · {f.family} · {f.resolution}
        </span>
        {f.caveat && (
          <details className="source-details">
            <summary>Model details</summary>
            <p>{f.caveat}</p>
          </details>
        )}
      </div>
      <span className="list-meta" title="Fetched, local time">
        {time(new Date(f.fetchedAt).getTime() / 1000, tz)}
      </span>
      <label className="toggle-switch">
        <input
          type="checkbox"
          checked={!disabled}
          onChange={toggle}
          aria-label={`Include ${f.name} in comparison`}
        />
        <span />
      </label>
    </li>
  );
}
