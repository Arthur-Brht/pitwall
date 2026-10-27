import { createBackup } from "@/lib/device-state";
import { download } from "@/lib/exports";
import { day } from "@/lib/format";
import { usePitwall } from "@/lib/pitwall-context";
import { sourceColor } from "@/lib/theme";
import { version } from "../../../../package.json";
import {
  ArrowDownToLine,
  Check,
  Flag,
  Loader2,
  MapPin,
  Plus,
  Search,
  Trash2,
  Upload,
  X,
} from "lucide-react";

export function WorkspaceDialogs() {
  const {
    backupInput,
    track,
    favorites,
    setFavorites,
    data,
    disabled,
    threshold,
    setThreshold,
    settings,
    setSettings,
    searchOpen,
    setSearchOpen,
    query,
    setQuery,
    searching,
    searchResults,
    searchError,
    coordinateMode,
    setCoordinateMode,
    coordName,
    setCoordName,
    coordLat,
    setCoordLat,
    coordLon,
    setCoordLon,
    coordTz,
    setCoordTz,
    sessions,
    backupMessage,
    setBackupMessage,
    now,
    choose,
    toggleSource,
    addCoordinates,
    preferences,
    importBackup,
    filteredTracks,
    appearance,
  } = usePitwall();
  return (
    <>
      {searchOpen && (
        <div className="modal-scrim" onClick={() => setSearchOpen(false)}>
          <section
            className="modal search-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="search-title"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-head">
              <h2 id="search-title">Add a location</h2>
              <button
                className="icon-button"
                onClick={() => setSearchOpen(false)}
                aria-label="Close location search"
              >
                <X size={19} />
              </button>
            </div>
            <div
              className="segmented modal-tabs"
              role="group"
              aria-label="Add by"
            >
              <button
                aria-pressed={!coordinateMode}
                onClick={() => setCoordinateMode(false)}
              >
                Search
              </button>
              <button
                aria-pressed={coordinateMode}
                onClick={() => setCoordinateMode(true)}
              >
                Coordinates
              </button>
            </div>
            {coordinateMode ? (
              <div className="form-body">
                <label>
                  Location name
                  <input
                    autoFocus
                    value={coordName}
                    maxLength={80}
                    onChange={(e) => setCoordName(e.target.value)}
                    placeholder="Your circuit or test location"
                  />
                </label>
                <div className="form-pair">
                  <label>
                    Latitude
                    <input
                      type="number"
                      min="-90"
                      max="90"
                      step="any"
                      value={coordLat}
                      onChange={(e) => setCoordLat(e.target.value)}
                      placeholder="37.2319"
                    />
                  </label>
                  <label>
                    Longitude
                    <input
                      type="number"
                      min="-180"
                      max="180"
                      step="any"
                      value={coordLon}
                      onChange={(e) => setCoordLon(e.target.value)}
                      placeholder="−8.6267"
                    />
                  </label>
                </div>
                <label>
                  Timezone
                  <input
                    value={coordTz}
                    onChange={(e) => setCoordTz(e.target.value)}
                    placeholder="Europe/Paris"
                  />
                </label>
                {searchError && (
                  <p className="inline-warning" role="alert">
                    {searchError}
                  </p>
                )}
                <button className="button full-width" onClick={addCoordinates}>
                  <Plus size={15} />
                  Add location
                </button>
                <p className="fineprint">
                  Use an IANA timezone such as Europe/Paris.
                </p>
              </div>
            ) : (
              <>
                <div className="search-input">
                  <Search size={18} />
                  <input
                    autoFocus
                    aria-label="Search circuits or places"
                    placeholder="Search a circuit, city or region…"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                  />
                  {searching && <Loader2 size={16} className="spin" />}
                </div>
                <div className="search-results">
                  <div className="search-group-label">
                    {query ? "Circuits" : "Popular circuits"}
                  </div>
                  {filteredTracks.length ? (
                    filteredTracks.map((t) => (
                      <button key={t.id} onClick={() => choose(t)}>
                        <span className="search-pin">
                          <Flag size={16} />
                        </span>
                        <span>
                          <strong>{t.name}</strong>
                          <small>
                            {t.country}
                            {t.lengthKm ? ` · ${t.lengthKm} km` : ""}
                          </small>
                        </span>
                        {favorites.some((f) => f.id === t.id) ? (
                          <Check size={15} className="text-lime" />
                        ) : (
                          <Plus size={15} />
                        )}
                      </button>
                    ))
                  ) : (
                    <p className="search-no-results">
                      No circuit matches. Try a town, or enter coordinates.
                    </p>
                  )}
                  {query.length >= 2 && (
                    <>
                      <div className="search-group-label">Places</div>
                      {searchResults.map((t) => (
                        <button key={t.id} onClick={() => choose(t)}>
                          <span className="search-pin">
                            <MapPin size={16} />
                          </span>
                          <span>
                            <strong>{t.name}</strong>
                            <small>
                              {t.country} · {t.lat.toFixed(3)},{" "}
                              {t.lon.toFixed(3)}
                            </small>
                          </span>
                          <Plus size={15} />
                        </button>
                      ))}
                      {!searching && !searchResults.length && (
                        <p className="search-no-results">
                          {searchError ||
                            "No places found. Enter exact coordinates for a circuit."}
                        </p>
                      )}
                    </>
                  )}
                </div>
              </>
            )}
            <p className="modal-footnote">
              Saved locations stay on this device.
            </p>
          </section>
        </div>
      )}
      {settings && (
        <div className="modal-scrim" onClick={() => setSettings(false)}>
          <section
            className="modal preferences-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="preferences-title"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-head">
              <h2 id="preferences-title">Preferences</h2>
              <button
                className="icon-button"
                onClick={() => setSettings(false)}
                aria-label="Close preferences"
              >
                <X size={19} />
              </button>
            </div>
            <div className="form-body">
              <div className="settings-section-label" id="appearance-label">
                Appearance
              </div>
              <div
                className="segmented full"
                role="group"
                aria-labelledby="appearance-label"
              >
                {(["system", "light", "dark"] as const).map((option) => (
                  <button
                    key={option}
                    aria-pressed={appearance.preference === option}
                    onClick={() => appearance.setPreference(option)}
                  >
                    {option === "system"
                      ? "System"
                      : option === "light"
                        ? "Light"
                        : "Dark"}
                  </button>
                ))}
              </div>
              <label>
                Rain threshold
                <select
                  value={threshold}
                  onChange={(e) => setThreshold(+e.target.value)}
                >
                  <option value={0.1}>0.1 mm/h · any trace</option>
                  <option value={0.2}>0.2 mm/h</option>
                  <option value={0.5}>0.5 mm/h</option>
                  <option value={1}>1.0 mm/h</option>
                </select>
              </label>
              <p className="fineprint">
                A model counts as wet when its hourly rain reaches this amount.
              </p>
              <div className="settings-section-label">Sources</div>
              {data?.forecasts.length ? (
                data.forecasts.map((f) => (
                  <label className="source-toggle" key={f.id}>
                    <span
                      className="tiny-dot"
                      style={{
                        background: sourceColor(f.color, appearance.theme),
                      }}
                    />
                    <span>
                      <strong>{f.name}</strong>
                      <small>
                        {f.provider} · {f.family}
                      </small>
                    </span>
                    <input
                      type="checkbox"
                      checked={!disabled.includes(f.id)}
                      onChange={() => toggleSource(f.id)}
                    />
                  </label>
                ))
              ) : (
                <p className="fineprint">
                  Sources appear after the forecast loads.
                </p>
              )}
              <div className="settings-section-label">Saved circuits</div>
              {favorites.map((f) => (
                <div className="favorite-setting" key={f.id}>
                  <span>{f.name}</span>
                  <button
                    disabled={favorites.length <= 1 || f.id === track.id}
                    onClick={() =>
                      setFavorites((a) => a.filter((x) => x.id !== f.id))
                    }
                    aria-label={`Remove ${f.name} from saved circuits`}
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
              <div className="settings-section-label">Backup</div>
              <p className="fineprint">
                Your circuits, preferences and {sessions.length} session
                {sessions.length === 1 ? "" : "s"}. Importing adds what’s
                missing and keeps your current plans.
              </p>
              <div className="backup-actions">
                <button
                  className="button secondary"
                  onClick={() => {
                    download(
                      `pitwall-backup-${day(now, "UTC")}.json`,
                      JSON.stringify(
                        createBackup(preferences, sessions),
                        null,
                        2,
                      ),
                      "application/json",
                    );
                    setBackupMessage("Backup downloaded.");
                  }}
                >
                  <ArrowDownToLine size={14} />
                  Export backup
                </button>
                <button
                  className="button secondary"
                  onClick={() => backupInput.current?.click()}
                >
                  <Upload size={14} />
                  Import backup
                </button>
                <input
                  ref={backupInput}
                  type="file"
                  accept="application/json,.json"
                  className="sr-only"
                  tabIndex={-1}
                  aria-label="Import Pitwall device backup"
                  onChange={(e) => void importBackup(e.target.files?.[0])}
                />
              </div>
              {backupMessage && (
                <p className="backup-feedback" role="status">
                  {backupMessage}
                </p>
              )}
              <button
                className="button full-width"
                onClick={() => setSettings(false)}
              >
                Done <Check size={14} />
              </button>
              <p className="modal-footnote">
                Everything is stored on this device only · Pitwall v{version}
              </p>
            </div>
          </section>
        </div>
      )}
    </>
  );
}
