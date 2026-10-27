import { createBackup } from "@/lib/device-state";
import { download } from "@/lib/exports";
import { day } from "@/lib/format";
import { usePitwall } from "@/lib/pitwall-context";
import {
  ArrowDownToLine,
  Check,
  Flag,
  Loader2,
  MapPin,
  Plus,
  Search,
  ShieldCheck,
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
              <div>
                <div className="eyebrow">EXPAND YOUR WEATHER DESK</div>
                <h2 id="search-title">Find your circuit.</h2>
              </div>
              <button
                className="icon-button"
                onClick={() => setSearchOpen(false)}
                aria-label="Close location search"
              >
                <X size={19} />
              </button>
            </div>
            <div className="modal-tabs">
              <button
                className={!coordinateMode ? "active" : ""}
                onClick={() => setCoordinateMode(false)}
              >
                Search locations
              </button>
              <button
                className={coordinateMode ? "active" : ""}
                onClick={() => setCoordinateMode(true)}
              >
                Coordinates
              </button>
            </div>
            {coordinateMode ? (
              <div className="form-body">
                <label>
                  LOCATION NAME
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
                    LATITUDE
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
                    LONGITUDE
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
                  TIMEZONE
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
                <p className="field-note">
                  Use the circuit’s local IANA timezone. Forecast and radar are
                  requested for these coordinates.
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
                    {query ? "CIRCUITS" : "POPULAR CIRCUITS"}
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
                      No matching circuit in the curated list. Try the city
                      search below or enter coordinates.
                    </p>
                  )}
                  {query.length >= 2 && (
                    <>
                      <div className="search-group-label">
                        PLACES · OPEN-METEO GEOCODING
                      </div>
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
            <div className="modal-footnote">
              <ShieldCheck size={13} />
              Saved locations stay on this browser. City search may not locate
              the exact track.
            </div>
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
              <div>
                <div className="eyebrow">MAKE THE COMPARISON YOURS</div>
                <h2 id="preferences-title">Weather preferences</h2>
              </div>
              <button
                className="icon-button"
                onClick={() => setSettings(false)}
                aria-label="Close preferences"
              >
                <X size={19} />
              </button>
            </div>
            <div className="form-body">
              <label>
                WET VOTE THRESHOLD
                <select
                  value={threshold}
                  onChange={(e) => setThreshold(+e.target.value)}
                >
                  <option value={0.1}>0.1 mm per hour · trace-sensitive</option>
                  <option value={0.2}>0.2 mm per hour</option>
                  <option value={0.5}>0.5 mm per hour</option>
                  <option value={1}>1.0 mm per hour</option>
                </select>
              </label>
              <p className="field-note">
                A family votes wet when its hourly precipitation reaches this
                amount. This is an analytical threshold, not a tyre or grip
                recommendation.
              </p>
              <div className="settings-section-label">
                ENABLED FORECAST SOURCES
              </div>
              {data?.forecasts.length ? (
                data.forecasts.map((f) => (
                  <label className="source-toggle" key={f.id}>
                    <span
                      className="tiny-dot"
                      style={{ background: f.color }}
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
                <p className="field-note">
                  Sources appear after a successful forecast fetch.
                </p>
              )}
              <div className="settings-section-label">SAVED CIRCUITS</div>
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
              <div className="settings-section-label">DEVICE BACKUP</div>
              <p className="field-note">
                Export your circuits, weather preferences and {sessions.length}{" "}
                saved session{sessions.length === 1 ? "" : "s"}. Import adds
                missing circuits and sessions, keeps existing plans, and applies
                the backup’s preferences. Forecast history and provider caches
                are separate; export forecast history as CSV from History &amp;
                sources.
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
                    setBackupMessage(
                      "Device backup downloaded. Keep the file somewhere you can recover it.",
                    );
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
              <p className="field-note">
                Preferences and sessions are stored on this device. Forecast
                snapshots are recorded in this browser’s local database when
                storage is available. They do not sync between devices.
              </p>
            </div>
          </section>
        </div>
      )}
    </>
  );
}
