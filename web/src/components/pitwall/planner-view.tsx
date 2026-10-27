import { day, n, niceDate, time } from "@/lib/format";
import { usePitwall } from "@/lib/pitwall-context";
import {
  Activity,
  ArrowDownToLine,
  ArrowRight,
  CalendarDays,
  Check,
  ChevronRight,
  Flag,
  MapPin,
  Plus,
  Sun,
  Trash2,
} from "lucide-react";
import { RainChart } from "./weather-charts";
import { Empty } from "./weather-common";

export function PlannerView() {
  const {
    track,
    threshold,
    setSessions,
    sessionName,
    setSessionName,
    sessionDate,
    setSessionDate,
    sessionTime,
    setSessionTime,
    duration,
    setDuration,
    gustLimit,
    setGustLimit,
    sessionError,
    setSessionError,
    editingSessionId,
    setEditingSessionId,
    sessionFeedback,
    setSessionFeedback,
    deletedSession,
    setDeletedSession,
    active,
    sessionStats,
    draft,
    stats,
    localSessions,
    dryWindows,
    saveSession,
    exportCalendar,
  } = usePitwall();
  return (
    <>
      <div className="section-intro">
        <div>
          <div className="eyebrow">PREPARE FOR YOUR TIME ON TRACK</div>
          <h2>The session comes first.</h2>
          <p>
            Inspect the forecast over a session window. Rain and gust summaries
            use all overlapping hourly intervals.
          </p>
        </div>
        <span className="subtle-chip">
          <MapPin size={12} />
          {track.name}
        </span>
      </div>
      <div className="planner-grid">
        <section className="panel session-form">
          <div className="panel-head">
            <h2>{editingSessionId ? "Edit session" : "Plan a session"}</h2>
            <CalendarDays size={18} className="muted" />
          </div>
          <div className="form-body">
            <label>
              SESSION NAME
              <input
                value={sessionName}
                maxLength={60}
                onChange={(e) => setSessionName(e.target.value)}
                placeholder="Qualifying, Race 1, Practice…"
              />
            </label>
            <div className="form-pair">
              <label>
                DATE
                <input
                  type="date"
                  aria-label="Session date"
                  value={sessionDate}
                  onChange={(e) => setSessionDate(e.target.value)}
                />
              </label>
              <label>
                START · LOCAL TIME
                <input
                  type="time"
                  aria-label="Session start time"
                  value={sessionTime}
                  onChange={(e) => setSessionTime(e.target.value)}
                />
              </label>
            </div>
            <div className="form-pair">
              <label>
                DURATION
                <select
                  aria-label="Session duration"
                  value={duration}
                  onChange={(e) => setDuration(+e.target.value)}
                >
                  <option value={15}>15 minutes</option>
                  <option value={20}>20 minutes</option>
                  <option value={30}>30 minutes</option>
                  <option value={45}>45 minutes</option>
                  <option value={60}>1 hour</option>
                  <option value={90}>90 minutes</option>
                  <option value={120}>2 hours</option>
                  <option value={180}>3 hours</option>
                  <option value={360}>6 hours</option>
                  <option value={720}>12 hours</option>
                  <option value={1440}>24 hours</option>
                  {![15, 20, 30, 45, 60, 90, 120, 180, 360, 720, 1440].includes(
                    duration,
                  ) && <option value={duration}>{duration} minutes</option>}
                </select>
              </label>
              <label>
                GUST REVIEW THRESHOLD
                <select
                  value={gustLimit}
                  onChange={(e) => setGustLimit(+e.target.value)}
                >
                  <option value={25}>25 km/h</option>
                  <option value={30}>30 km/h</option>
                  <option value={40}>40 km/h</option>
                  <option value={50}>50 km/h</option>
                  <option value={60}>60 km/h</option>
                </select>
              </label>
            </div>
            <p className="field-note">
              Times use {track.timezone}. The gust threshold is your review
              preference, not a safety or race-control limit.
            </p>
            {sessionError && (
              <p className="inline-warning" role="alert">
                {sessionError}
              </p>
            )}
            <button className="button full-width" onClick={saveSession}>
              {editingSessionId ? <Check size={15} /> : <Plus size={15} />}
              {editingSessionId
                ? "Update saved session"
                : "Save session on this device"}
            </button>
            {editingSessionId && (
              <button
                className="button secondary full-width"
                onClick={() => {
                  setEditingSessionId(null);
                  setSessionName("Practice");
                  setSessionError("");
                  setSessionFeedback("");
                }}
              >
                <Plus size={15} />
                Plan another session
              </button>
            )}
            {sessionFeedback && (
              <p className="session-feedback" role="status">
                {sessionFeedback}
              </p>
            )}
          </div>
        </section>
        <section className="panel session-summary">
          <div className="panel-head">
            <div>
              <div className="eyebrow">
                {niceDate(draft.date)} · {sessionTime}
              </div>
              <h2>
                {sessionName || "Your session"}{" "}
                <span className="title-unit">{duration} min</span>
              </h2>
            </div>
            <span className={`status-pill ${stats.complete ? "" : "amber"}`}>
              {stats.complete
                ? "Rain coverage complete"
                : "Incomplete rain coverage"}
            </span>
          </div>
          {stats.hs.length ? (
            <>
              <div className="session-metrics">
                <div>
                  <span>MAX HOURLY RAIN</span>
                  <strong>
                    {n(stats.rain, 1)}
                    <small> mm</small>
                  </strong>
                  <p>Highest source, overlapping hours</p>
                </div>
                <div>
                  <span>PEAK GUST</span>
                  <strong>
                    {n(stats.gust)}
                    <small> km/h</small>
                  </strong>
                  <p>
                    {stats.gust !== null && stats.gust >= gustLimit
                      ? "Above your review threshold"
                      : stats.partialGusts
                        ? "Some sources do not report gusts"
                        : "Compared with your threshold"}
                  </p>
                </div>
                <div>
                  <span>MEDIAN AIR</span>
                  <strong>
                    {n(stats.temp, 1)}
                    <small> °C</small>
                  </strong>
                  <p>Mean of hourly family medians</p>
                </div>
                <div>
                  <span>MAX WET VOTE</span>
                  <strong>
                    {stats.share === null
                      ? "—"
                      : `${Math.round(stats.share * 100)}%`}
                    <small> families</small>
                  </strong>
                  <p>Not a chance of precipitation</p>
                </div>
              </div>
              <div
                className={`session-assessment ${stats.anyWet || (stats.gust !== null && stats.gust >= gustLimit) ? "review" : ""}`}
              >
                <Activity size={20} />
                <div>
                  <strong>
                    {!stats.complete
                      ? "Incomplete forecast coverage"
                      : stats.split
                        ? "Models disagree during this window"
                        : stats.anyWet
                          ? "Rain appears in this window"
                          : stats.gust !== null && stats.gust >= gustLimit
                            ? "Gusts exceed your review threshold"
                            : "No wet signal above your threshold"}
                  </strong>
                  <p>
                    {!stats.complete
                      ? "Some enabled sources or hourly rain intervals are missing. Inspect the source coverage below; unavailable rain is not dry weather."
                      : stats.split
                        ? "Inspect each source and radar before the session."
                        : stats.anyWet
                          ? `At least one source reaches ${threshold} mm/h. Hourly forecasts cannot resolve exact shower onset.`
                          : "This describes forecast rainfall, not grip, standing water, or whether the surface has dried."}
                  </p>
                </div>
              </div>
              <RainChart
                hours={stats.hs}
                forecasts={active}
                tz={track.timezone}
                height={170}
              />
            </>
          ) : (
            <Empty
              title="No forecast for this window"
              detail="Choose a time within the available forecast horizon, then refresh if needed."
            />
          )}
        </section>
      </div>
      <section className="panel session-source-panel">
        <div className="panel-head">
          <div>
            <div className="eyebrow">EVERY SOURCE DURING YOUR SESSION</div>
            <h2>What each forecast says</h2>
          </div>
          <span className="subtle-chip">
            {duration} min · {track.timezone}
          </span>
        </div>
        {stats.sources.length ? (
          <div
            className="session-table-scroll"
            tabIndex={0}
            role="region"
            aria-label="Per-source session forecasts, scroll horizontally"
          >
            <table className="session-source-table">
              <caption className="sr-only">
                Forecast evidence for {sessionName}, {niceDate(draft.date)} at{" "}
                {draft.time}, {duration} minutes.
              </caption>
              <thead>
                <tr>
                  <th scope="col">Source · fetched</th>
                  <th scope="col">
                    Peak hourly rain
                    <br />
                    mm/h
                  </th>
                  <th scope="col">
                    Session rain estimate
                    <br />
                    mm
                  </th>
                  <th scope="col">
                    Peak gust
                    <br />
                    km/h
                  </th>
                  <th scope="col">
                    Air range
                    <br />
                    °C
                  </th>
                  <th scope="col">Rain coverage</th>
                  <th scope="col">Gust coverage</th>
                </tr>
              </thead>
              <tbody>
                {stats.sources.map((source) => (
                  <tr key={source.id}>
                    <th scope="row">
                      <span
                        className="tiny-dot"
                        style={{ background: source.color }}
                      />
                      {source.name}
                      <small>
                        {time(
                          Date.parse(source.fetchedAt) / 1000,
                          track.timezone,
                          true,
                        )}
                      </small>
                    </th>
                    <td className={source.wetIntervals ? "text-amber" : ""}>
                      {n(source.peakRain, 2)}
                    </td>
                    <td>
                      {n(source.rainEstimate, 2)}
                      {source.rainCoverage > 0 && source.rainCoverage < 1
                        ? "*"
                        : ""}
                    </td>
                    <td
                      className={
                        source.peakGust !== null && source.peakGust >= gustLimit
                          ? "text-amber"
                          : ""
                      }
                    >
                      {n(source.peakGust)}
                    </td>
                    <td>
                      {n(source.minTemperature, 1)}–
                      {n(source.maxTemperature, 1)}
                    </td>
                    <td>
                      <span
                        className={`status-pill ${source.rainCoverage === 1 ? "" : "amber"}`}
                      >
                        {Math.round(source.rainCoverage * 100)}%
                      </span>
                    </td>
                    <td>
                      <span
                        className={`status-pill ${source.gustCoverage === 1 ? "" : "amber"}`}
                      >
                        {Math.round(source.gustCoverage * 100)}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty
            title="No enabled forecasts"
            detail="Enable a source or refresh to inspect the session."
          />
        )}
        <p className="chart-note">
          Session rain is a rough estimate: hourly amounts are prorated over the
          session’s overlap. It does not resolve shower timing. * Partial
          coverage totals include reported intervals only. Coverage is the
          fraction of your session with that field available; related feeds
          remain visible separately.
        </p>
      </section>
      <div className="two-charts">
        <section className="panel">
          <div className="panel-head">
            <div>
              <div className="eyebrow">A WINDOW TO INVESTIGATE</div>
              <h2>Model-dry windows</h2>
            </div>
            <Sun size={18} className="text-lime" />
          </div>
          <div className="dry-windows">
            {dryWindows.length ? (
              dryWindows.slice(0, 5).map((w, i) => (
                <div className="dry-window" key={i}>
                  <span className="window-icon">
                    <Sun size={16} />
                  </span>
                  <div>
                    <strong>
                      {time(w.start, track.timezone)} –{" "}
                      {time(w.end, track.timezone)}
                    </strong>
                    <span>
                      {niceDate(day(w.start, track.timezone))}
                      {day(w.start, track.timezone) !==
                      day(w.end, track.timezone)
                        ? ` → ${niceDate(day(w.end, track.timezone))}`
                        : ""}{" "}
                      · {n((w.end - w.start) / 3600, 1)}h available
                      <br />
                      {w.sourceCount} rain sources · gusts from ≥
                      {w.minGustSources}/{w.sourceCount} sources
                    </span>
                  </div>
                  <span className="status-pill">{n(w.peakGust)} km/h gust</span>
                  <button
                    className="button secondary window-use"
                    onClick={() => {
                      setSessionDate(day(w.start, track.timezone));
                      setSessionTime(time(w.start, track.timezone));
                      setEditingSessionId(null);
                      setSessionError("");
                      setSessionFeedback(
                        `Selected a window for your ${duration}-minute session.`,
                      );
                      document
                        .querySelector(".session-form")
                        ?.scrollIntoView({ block: "center" });
                    }}
                  >
                    Use window <ArrowRight size={12} />
                  </button>
                </div>
              ))
            ) : (
              <Empty
                title="No qualifying window"
                detail={`Needs ${duration} contiguous minutes, rain below ${threshold} mm/h from every enabled source, and gusts from at least two families below ${gustLimit} km/h.`}
              />
            )}
          </div>
          <p className="chart-note">
            Every enabled source must report rain below {threshold} mm/h
            throughout a window that fits your {duration}-minute session.
            Highest reported gust stays below {gustLimit} km/h, with at least
            two gust-reporting families. Missing gust sources are counted above.
            This does not establish a dry racing surface.
          </p>
        </section>
        <section className="panel">
          <div className="panel-head">
            <div>
              <div className="eyebrow">SAVED ON THIS DEVICE</div>
              <h2>
                Your sessions{" "}
                <span className="title-unit">{localSessions.length}</span>
              </h2>
            </div>
            <Flag size={18} className="muted" />
          </div>
          <div className="session-list-actions">
            <button
              className="button secondary"
              disabled={!localSessions.length}
              onClick={exportCalendar}
            >
              <ArrowDownToLine size={14} />
              Export calendar (.ics)
            </button>
          </div>
          {deletedSession && (
            <div className="undo-session" role="status">
              <span>Removed {deletedSession.name}.</span>
              <button
                onClick={() => {
                  setSessions((saved) =>
                    saved.some((s) => s.id === deletedSession.id)
                      ? saved
                      : [...saved, deletedSession],
                  );
                  setDeletedSession(null);
                }}
              >
                Undo
              </button>
            </div>
          )}
          <div className="saved-sessions">
            {localSessions.length ? (
              localSessions.map((s) => {
                const ss = sessionStats(s);
                return (
                  <div className="saved-session" key={s.id}>
                    <button
                      onClick={() => {
                        setSessionName(s.name);
                        setSessionDate(s.date);
                        setSessionTime(s.time);
                        setDuration(s.duration);
                        setEditingSessionId(s.id);
                        setSessionError("");
                        setSessionFeedback("");
                        document
                          .querySelector(".session-form")
                          ?.scrollIntoView({ block: "center" });
                      }}
                    >
                      <strong>
                        {s.name}
                        <ChevronRight size={13} />
                      </strong>
                      <span>
                        {niceDate(s.date)} · {s.time} · {s.duration} min
                        {s.track && s.track.timezone !== track.timezone
                          ? ` · ${s.track.timezone}`
                          : ""}
                      </span>
                      <small>
                        {ss.complete
                          ? `${n(ss.rain, 1)} mm max hourly rain · ${n(ss.gust)} km/h peak gust`
                          : "Forecast not fully available yet"}
                      </small>
                    </button>
                    <button
                      className="icon-button delete-session"
                      onClick={() => {
                        setDeletedSession(s);
                        setSessions((a) => a.filter((x) => x.id !== s.id));
                        if (editingSessionId === s.id)
                          setEditingSessionId(null);
                      }}
                      aria-label={`Delete ${s.name}`}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                );
              })
            ) : (
              <Empty
                title="Your next session starts here"
                detail="Save practice, qualifying and race windows for this circuit."
              />
            )}
          </div>
        </section>
      </div>
    </>
  );
}
