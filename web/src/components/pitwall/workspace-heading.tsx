import { time } from "@/lib/format";
import { usePitwall } from "@/lib/pitwall-context";
import { TABS } from "@/lib/use-pitwall-state";
import {
  ArrowDownToLine,
  ChevronRight,
  Flag,
  History,
  Info,
  Loader2,
  RefreshCw,
  Settings2,
} from "lucide-react";

export function Topbar() {
  const { track, setSettings, mobileNav, setMobileNav } = usePitwall();
  return (
    <header className="topbar">
      <div className="breadcrumbs">
        <button
          className="mobile-menu"
          onClick={() => setMobileNav((v) => !v)}
          aria-label="Open saved circuits"
          aria-expanded={mobileNav}
          aria-controls="saved-circuits"
        >
          <Flag size={17} />
        </button>
        <span>Weather desk</span>
        <ChevronRight size={12} />
        <strong>{track.name}</strong>
      </div>
      <div className="topbar-right">
        <span className="timezone-label">
          {track.timezone.replace("_", " ")}
        </span>
        <span className="topbar-divider" />
        <span className="unit">°C · km/h</span>
        <button
          className="icon-button"
          onClick={(event) => {
            event.currentTarget.focus();
            setSettings(true);
          }}
          aria-label="Weather preferences"
        >
          <Settings2 size={16} />
        </button>
      </div>
    </header>
  );
}

export function WorkspaceHeading() {
  const {
    pwa,
    view,
    setView,
    track,
    data,
    loading,
    error,
    setSettings,
    storageMessage,
    active,
    families,
    cachedSources,
    oldestFetch,
    oldestAge,
    refreshWeather,
    exportForecast,
    dateLabel,
  } = usePitwall();
  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">
            {track.country.toUpperCase()}{" "}
            <span className="dot-separator">/</span>{" "}
            {track.lengthKm
              ? `${track.lengthKm.toFixed(3)} KM CIRCUIT`
              : "CUSTOM WEATHER LOCATION"}
          </div>
          <h1>
            {track.name}
            <span className="heading-dot" />
          </h1>
          <p>
            {dateLabel}
            <span className="dot-separator">·</span>
            {track.lat.toFixed(4)}°, {track.lon.toFixed(4)}°
          </p>
        </div>
        <div className="heading-actions">
          <button
            className="button secondary"
            aria-label="Export data"
            onClick={exportForecast}
            disabled={!data?.forecasts.length}
          >
            <ArrowDownToLine size={14} />
            <span>Export data</span>
          </button>
          <button
            className="button"
            onClick={refreshWeather}
            disabled={loading}
          >
            <RefreshCw size={14} className={loading ? "spin" : ""} />
            {loading ? "Updating" : "Refresh"}
          </button>
        </div>
      </div>
      <nav className="view-tabs" aria-label="Weather views">
        {TABS.map(([id, label, Icon]) => (
          <button
            key={id}
            className={view === id ? "active" : ""}
            aria-current={view === id ? "page" : undefined}
            onClick={() => setView(id)}
          >
            <Icon size={15} />
            {label}
          </button>
        ))}
        <span className="updated-label">
          {loading ? (
            <>
              <span className="tiny-dot amber" />
              Fetching sources
            </>
          ) : data ? (
            <>
              <span
                className={`tiny-dot ${cachedSources.length ? "amber" : "lime"}`}
              />
              {cachedSources.length
                ? "Saved data · "
                : data.delivery === "cache"
                  ? "Cached · "
                  : ""}
              Fetched{" "}
              {time(new Date(data.fetchedAt).getTime() / 1000, track.timezone)}
            </>
          ) : (
            "Awaiting data"
          )}
        </span>
      </nav>
      {data?.forecasts.length ? (
        <div className="forecast-provenance">
          <span>
            {active.length} enabled feed{active.length === 1 ? "" : "s"} ·{" "}
            {families} model famil{families === 1 ? "y" : "ies"}
          </span>
          <span
            title={
              oldestFetch === null
                ? undefined
                : `Oldest enabled forecast fetched ${time(oldestFetch, track.timezone, true)}`
            }
          >
            {oldestAge === null
              ? "No source enabled"
              : `Oldest fetch ${oldestAge < 60 ? `${oldestAge} min` : `${Math.floor(oldestAge / 60)}h ${oldestAge % 60}m`} ago`}
          </span>
        </div>
      ) : null}
      {pwa.offline && (
        <div className="offline-banner" role="status">
          <Info size={17} />
          <div>
            <strong>You are offline</strong>
            <p>
              Saved circuits and sessions are available on this device.
              Forecasts and radar require a connection; anything still on screen
              may be out of date.
            </p>
          </div>
        </div>
      )}
      {cachedSources.length > 0 && (
        <div className="offline-banner" role="status">
          <History size={17} />
          <div>
            <strong>
              {data?.delivery === "stale"
                ? "Showing saved forecasts"
                : "Some sources are using saved forecasts"}
            </strong>
            <p>
              {cachedSources
                .map(
                  (s) =>
                    `${s.name} (${s.fetchedAt ? time(Date.parse(s.fetchedAt) / 1000, track.timezone, true) : "fetch time unavailable"})`,
                )
                .join(" · ")}
              . These sources could not refresh. Their original fetch times and
              missing values are preserved.
            </p>
          </div>
        </div>
      )}
      {(storageMessage ||
        (data?.storage &&
          !data.storage.saved &&
          data.forecasts.length > 0)) && (
        <div className="offline-banner" role="status">
          <Info size={17} />
          <div>
            <strong>Device storage needs attention</strong>
            <p>{storageMessage || data?.storage?.message}</p>
          </div>
          <button
            className="button secondary"
            onClick={() => setSettings(true)}
          >
            Backups
          </button>
        </div>
      )}
      {error && (
        <div className="error-banner" role="alert">
          <Info size={18} />
          <div>
            <strong>Forecast unavailable</strong>
            <p>{error}</p>
          </div>
          <button onClick={refreshWeather} disabled={loading}>
            Try again <RefreshCw size={13} />
          </button>
        </div>
      )}
      {!loading &&
      data?.forecasts.length &&
      data.statuses.some((s) => s.status === "error") ? (
        <div className="error-banner" role="status">
          <Info size={18} />
          <div>
            <strong>Some forecast sources are unavailable</strong>
            <p>
              {data.statuses.filter((s) => s.status === "error").length} sources
              could not respond.{" "}
              {data.statuses.some(
                (s) => s.status === "error" && s.message.includes("rate limit"),
              )
                ? "The provider has rate-limited requests from this connection. Remaining sources still update."
                : "The comparison uses only the sources that returned data."}
            </p>
          </div>
          <button onClick={() => setView("history")}>
            View source status <ChevronRight size={13} />
          </button>
        </div>
      ) : null}
      {loading && (
        <div className="loading-banner" role="status">
          <Loader2 size={16} className="spin" />
          Comparing weather sources for {track.name}…
          <span>Each source can succeed independently.</span>
        </div>
      )}
    </>
  );
}
