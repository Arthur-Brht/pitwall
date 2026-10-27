import { time } from "@/lib/format";
import { usePitwall } from "@/lib/pitwall-context";
import { TABS } from "@/lib/use-pitwall-state";
import {
  AlertTriangle,
  ArrowDownToLine,
  CloudOff,
  History,
  Menu,
  Moon,
  RefreshCw,
  Settings2,
  Sun,
} from "lucide-react";

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
    availableCount,
    cachedSources,
    oldestAge,
    refreshWeather,
    exportForecast,
    dateLabel,
    mobileNav,
    setMobileNav,
    appearance,
  } = usePitwall();
  const failed = data?.statuses.filter((s) => s.status === "error") ?? [];
  const rateLimited = failed.some((s) => s.message.includes("rate limit"));
  const nextTheme = appearance.theme === "dark" ? "light" : "dark";
  return (
    <header className="page-header">
      <div className="header-top">
        <button
          className="icon-button mobile-menu"
          onClick={() => setMobileNav((v) => !v)}
          aria-label="Open saved circuits"
          aria-expanded={mobileNav}
          aria-controls="saved-circuits"
        >
          <Menu size={18} />
        </button>
        <div className="header-title">
          <h1>
            <button
              className="active-circuit"
              onClick={() => setMobileNav((v) => !v)}
              aria-expanded={mobileNav}
              aria-controls="saved-circuits"
            >
              {track.name}
            </button>
          </h1>
          <p className="header-meta">
            <span>{track.country}</span>
            {track.custom && (
              <span>
                {track.lat.toFixed(4)}, {track.lon.toFixed(4)}
              </span>
            )}
            <span>{dateLabel}</span>
            {data?.forecasts.length ? (
              <span
                title={
                  oldestAge === null
                    ? undefined
                    : `Oldest enabled forecast fetched ${oldestAge} min ago`
                }
              >
                {active.length} of {availableCount} sources
                {data.fetchedAt &&
                  ` · updated ${time(new Date(data.fetchedAt).getTime() / 1000, track.timezone)}`}
              </span>
            ) : null}
          </p>
        </div>
        <div className="header-actions">
          <button
            className="icon-button"
            onClick={() => appearance.setPreference(nextTheme)}
            aria-label={`Switch to ${nextTheme} mode`}
            title={`Switch to ${nextTheme} mode`}
          >
            {appearance.theme === "dark" ? (
              <Sun size={16} />
            ) : (
              <Moon size={16} />
            )}
          </button>
          <button
            className="icon-button"
            aria-label="Export data"
            title="Export forecast data"
            onClick={exportForecast}
            disabled={!data?.forecasts.length}
          >
            <ArrowDownToLine size={16} />
          </button>
          <button
            className="icon-button"
            onClick={(event) => {
              event.currentTarget.focus();
              setSettings(true);
            }}
            aria-label="Weather preferences"
            title="Preferences"
          >
            <Settings2 size={16} />
          </button>
          <button
            className="button refresh-button"
            onClick={refreshWeather}
            disabled={loading}
          >
            <RefreshCw size={14} className={loading ? "spin" : ""} />
            {loading ? "Updating" : "Refresh"}
          </button>
        </div>
      </div>
      <nav className="view-tabs" aria-label="Weather views">
        {TABS.map(([id, label]) => (
          <button
            key={id}
            className={view === id ? "active" : ""}
            aria-current={view === id ? "page" : undefined}
            onClick={() => setView(id)}
          >
            {label}
          </button>
        ))}
      </nav>
      {loading && (
        <div className="loading-banner" role="status">
          <span className="sr-only">
            Updating the forecast for {track.name}
          </span>
        </div>
      )}
      {pwa.offline && (
        <div className="notice offline-banner" role="status">
          <CloudOff size={16} />
          <p>
            <strong>You are offline.</strong> Saved circuits and sessions still
            work; forecasts and radar need a connection.
          </p>
        </div>
      )}
      {cachedSources.length > 0 && (
        <div className="notice offline-banner" role="status">
          <History size={16} />
          <p>
            <strong>
              {data?.delivery === "stale"
                ? "Showing saved forecasts."
                : "Some sources are showing a saved forecast."}
            </strong>{" "}
            {cachedSources
              .map(
                (s) =>
                  `${s.name} from ${s.fetchedAt ? time(Date.parse(s.fetchedAt) / 1000, track.timezone, true) : "an unknown time"}`,
              )
              .join(", ")}
            .
          </p>
        </div>
      )}
      {(storageMessage ||
        (data?.storage &&
          !data.storage.saved &&
          data.forecasts.length > 0)) && (
        <div className="notice offline-banner" role="status">
          <AlertTriangle size={16} />
          <p>{storageMessage || data?.storage?.message}</p>
          <button onClick={() => setSettings(true)}>Backups</button>
        </div>
      )}
      {error && (
        <div className="notice error-banner" role="alert">
          <AlertTriangle size={16} />
          <p>
            <strong>Forecast unavailable.</strong> {error}
          </p>
          <button onClick={refreshWeather} disabled={loading}>
            Try again
          </button>
        </div>
      )}
      {!loading && data?.forecasts.length && failed.length ? (
        <div className="notice error-banner" role="status">
          <AlertTriangle size={16} />
          <p>
            <strong>
              {failed.length} source{failed.length === 1 ? "" : "s"} didn’t
              respond.
            </strong>{" "}
            {rateLimited
              ? "The provider is rate-limiting this connection."
              : "Pitwall is using the rest."}
          </p>
          <button onClick={() => setView("history")}>Details</button>
        </div>
      ) : null}
    </header>
  );
}
