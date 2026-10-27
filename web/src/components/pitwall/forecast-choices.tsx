import { SOURCE_CATALOG } from "@/lib/forecast-catalog";
import { usePitwall } from "@/lib/pitwall-context";

export function ForecastChoices() {
  const { track, selectedSourceIds, toggleFetchedSource, data } = usePitwall();
  return (
    <fieldset className="forecast-choices">
      <legend>Forecasts for {track.name}</legend>
      <p className="fineprint">
        Saved for this location. Regional models may have shorter or limited
        coverage.
      </p>
      {SOURCE_CATALOG.map((source) => {
        const selected = selectedSourceIds.includes(source.id);
        const status = data?.statuses.find((item) => item.id === source.id);
        return (
          <label className="forecast-choice" key={source.id}>
            <input
              type="checkbox"
              checked={selected}
              disabled={selected && selectedSourceIds.length === 1}
              onChange={() => toggleFetchedSource(source.id)}
              aria-label={`Fetch ${source.name}`}
            />
            <span>
              <strong>{source.name}</strong>
              <small>{source.resolution}</small>
              {selected && status?.status === "error" && (
                <small className="text-warn">
                  Unavailable on the last check
                </small>
              )}
            </span>
            {source.optional && <span className="tag">Regional</span>}
          </label>
        );
      })}
      <p className="fineprint">
        ECMWF and MET Norway share ancestry. KNMI is grouped with AROME, and
        ItaliaMeteo with ICON, so related forecasts don’t add independent votes.
      </p>
    </fieldset>
  );
}
