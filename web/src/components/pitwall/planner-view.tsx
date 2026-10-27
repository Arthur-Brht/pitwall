import { day, n, niceDate, time } from "@/lib/format";
import { usePitwall } from "@/lib/pitwall-context";
import { sourceColor } from "@/lib/theme";
import { ArrowDownToLine, Check, Plus, Trash2 } from "lucide-react";
import { RainChart } from "./weather-charts";
import { Empty } from "./weather-common";

const DURATIONS = [15, 20, 30, 45, 60, 90, 120, 180, 360, 720, 1440];
const durationLabel = (m: number) =>
  m % 60 === 0 && m >= 60 ? `${m / 60} h` : `${m} min`;

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
    sessionStats,
    draft,
    stats,
    localSessions,
    dryWindows,
    saveSession,
    exportCalendar,
    appearance,
  } = usePitwall();
  const gusty = stats.gust !== null && stats.gust >= gustLimit;
  const verdict = !stats.complete
    ? [
        "review",
        "Forecast incomplete",
        "Some sources or hours are missing. Missing rain isn’t dry weather.",
      ]
    : stats.split
      ? [
          "review",
          "Models disagree",
          "Check each source and the radar before you go out.",
        ]
      : stats.anyWet
        ? [
            "wet",
            "Rain expected",
            `At least one source reaches ${threshold} mm/h during the session.`,
          ]
        : gusty
          ? [
              "review",
              "Gusty",
              `Gusts reach ${n(stats.gust)} km/h, above your ${gustLimit} km/h alert.`,
            ]
          : [
              "dry",
              "Looks dry",
              "No source reaches your rain threshold. This says nothing about grip or standing water.",
            ];
  const focusForm = () =>
    document
      .querySelector(".session-form")
      ?.scrollIntoView({ block: "center", behavior: "smooth" });
  return (
    <>
      <div className="planner-grid">
        <section className="panel session-form">
          <div className="panel-head">
            <h2>{editingSessionId ? "Edit session" : "Plan a session"}</h2>
          </div>
          <div className="form-body">
            <label>
              Session name
              <input
                value={sessionName}
                maxLength={60}
                onChange={(e) => setSessionName(e.target.value)}
                placeholder="Qualifying, Race 1…"
              />
            </label>
            <div className="form-pair">
              <label>
                Date
                <input
                  type="date"
                  aria-label="Session date"
                  value={sessionDate}
                  onChange={(e) => setSessionDate(e.target.value)}
                />
              </label>
              <label>
                Start
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
                Duration
                <select
                  aria-label="Session duration"
                  value={duration}
                  onChange={(e) => setDuration(+e.target.value)}
                >
                  {DURATIONS.map((m) => (
                    <option key={m} value={m}>
                      {durationLabel(m)}
                    </option>
                  ))}
                  {!DURATIONS.includes(duration) && (
                    <option value={duration}>{duration} min</option>
                  )}
                </select>
              </label>
              <label>
                Gust alert
                <select
                  value={gustLimit}
                  onChange={(e) => setGustLimit(+e.target.value)}
                >
                  {[25, 30, 40, 50, 60].map((g) => (
                    <option key={g} value={g}>
                      {g} km/h
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <p className="fineprint">Times are local to {track.name}.</p>
            {sessionError && (
              <p className="inline-warning" role="alert">
                {sessionError}
              </p>
            )}
            <button className="button full-width" onClick={saveSession}>
              {editingSessionId ? <Check size={15} /> : <Plus size={15} />}
              {editingSessionId ? "Update session" : "Save session"}
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
                New session
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
              <h2>{sessionName || "Your session"}</h2>
              <p className="panel-sub">
                {niceDate(draft.date)} · {sessionTime} ·{" "}
                {durationLabel(duration)}
              </p>
            </div>
          </div>
          {stats.hs.length ? (
            <>
              <div className={`verdict ${verdict[0]}`}>
                <strong>{verdict[1]}</strong>
                <p>{verdict[2]}</p>
              </div>
              <dl className="stat-row">
                <div>
                  <dt>Peak rain</dt>
                  <dd>
                    {n(stats.rain, 1)} <small>mm/h</small>
                  </dd>
                </div>
                <div>
                  <dt>Peak gust</dt>
                  <dd className={gusty ? "text-warn" : ""}>
                    {n(stats.gust)} <small>km/h</small>
                  </dd>
                </div>
                <div>
                  <dt>Air</dt>
                  <dd>
                    {n(stats.temp, 1)} <small>°C</small>
                  </dd>
                </div>
                <div>
                  <dt title="Share of model families at or above your rain threshold; not a probability">
                    Models wet
                  </dt>
                  <dd>
                    {stats.share === null
                      ? "—"
                      : `${Math.round(stats.share * 100)}%`}
                  </dd>
                </div>
              </dl>
              <RainChart
                hours={stats.hs}
                forecasts={[]}
                tz={track.timezone}
                height={150}
              />
              {stats.sources.length > 0 && (
                <details className="disclosure">
                  <summary>Breakdown by source</summary>
                  <div
                    className="table-scroll"
                    tabIndex={0}
                    role="region"
                    aria-label="Per-source session forecasts, scroll horizontally"
                  >
                    <table className="data-table">
                      <caption className="sr-only">
                        Forecast for {sessionName}, {niceDate(draft.date)} at{" "}
                        {draft.time}, {duration} minutes.
                      </caption>
                      <thead>
                        <tr>
                          <th scope="col">Source</th>
                          <th scope="col">Peak rain</th>
                          <th scope="col">Session rain</th>
                          <th scope="col">Peak gust</th>
                          <th scope="col">Air</th>
                          <th scope="col">Coverage</th>
                        </tr>
                      </thead>
                      <tbody>
                        {stats.sources.map((source) => (
                          <tr key={source.id}>
                            <th scope="row">
                              <span
                                className="tiny-dot"
                                style={{
                                  background: sourceColor(
                                    source.color,
                                    appearance.theme,
                                  ),
                                }}
                              />
                              {source.name}
                            </th>
                            <td
                              className={source.wetIntervals ? "text-rain" : ""}
                            >
                              {n(source.peakRain, 2)} mm/h
                            </td>
                            <td>
                              {n(source.rainEstimate, 2)} mm
                              {source.rainCoverage > 0 &&
                              source.rainCoverage < 1
                                ? "*"
                                : ""}
                            </td>
                            <td
                              className={
                                source.peakGust !== null &&
                                source.peakGust >= gustLimit
                                  ? "text-warn"
                                  : ""
                              }
                            >
                              {n(source.peakGust)} km/h
                            </td>
                            <td>
                              {n(source.minTemperature, 1)}–
                              {n(source.maxTemperature, 1)}°
                            </td>
                            <td
                              className={
                                source.rainCoverage < 1 ||
                                source.gustCoverage < 1
                                  ? "text-warn"
                                  : ""
                              }
                              title="Rain / gust coverage of the session"
                            >
                              {Math.round(source.rainCoverage * 100)}% /{" "}
                              {Math.round(source.gustCoverage * 100)}%
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <p className="fineprint">
                    Session rain prorates hourly amounts, so it can’t time a
                    shower. * Partial coverage. Coverage is rain / gust.
                  </p>
                </details>
              )}
            </>
          ) : (
            <Empty
              title="No forecast for this window"
              detail="Pick a time within the next few days."
            />
          )}
        </section>
      </div>

      <div className="two-col">
        <section className="panel">
          <div className="panel-head">
            <h2>
              Your sessions{" "}
              <span className="count">{localSessions.length}</span>
            </h2>
            <button
              className="button secondary small"
              disabled={!localSessions.length}
              onClick={exportCalendar}
            >
              <ArrowDownToLine size={13} />
              Export to calendar
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
          {localSessions.length ? (
            <ul className="list">
              {localSessions.map((s) => {
                const ss = sessionStats(s);
                return (
                  <li
                    className={`list-row saved-session ${editingSessionId === s.id ? "active" : ""}`}
                    key={s.id}
                  >
                    <button
                      className="list-main"
                      onClick={() => {
                        setSessionName(s.name);
                        setSessionDate(s.date);
                        setSessionTime(s.time);
                        setDuration(s.duration);
                        setEditingSessionId(s.id);
                        setSessionError("");
                        setSessionFeedback("");
                        focusForm();
                      }}
                    >
                      <strong>{s.name}</strong>
                      <span>
                        {niceDate(s.date)} · {s.time} ·{" "}
                        {durationLabel(s.duration)}
                        {s.track && s.track.timezone !== track.timezone
                          ? ` · ${s.track.timezone}`
                          : ""}
                      </span>
                    </button>
                    <span className="list-meta">
                      {ss.complete
                        ? `${n(ss.rain, 1)} mm · ${n(ss.gust)} km/h`
                        : "Forecast pending"}
                    </span>
                    <button
                      className="icon-button"
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
                  </li>
                );
              })}
            </ul>
          ) : (
            <Empty
              title="No sessions yet"
              detail="Saved sessions for this circuit show up here."
            />
          )}
        </section>

        <section className="panel">
          <div className="panel-head">
            <h2>Dry windows</h2>
            <span
              className="panel-hint"
              title={`Every source below ${threshold} mm/h for ${duration} minutes, and gusts from at least two model families below ${gustLimit} km/h. Not a dry-track guarantee.`}
            >
              Fits {durationLabel(duration)} · gusts &lt; {gustLimit}
            </span>
          </div>
          {dryWindows.length ? (
            <ul className="list">
              {dryWindows.slice(0, 5).map((w, i) => (
                <li className="list-row dry-window" key={i}>
                  <div className="list-main static">
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
                      · {n((w.end - w.start) / 3600, 1)} h · gusts{" "}
                      {n(w.peakGust)} km/h
                    </span>
                  </div>
                  <button
                    className="button secondary small"
                    onClick={() => {
                      setSessionDate(day(w.start, track.timezone));
                      setSessionTime(time(w.start, track.timezone));
                      setEditingSessionId(null);
                      setSessionError("");
                      setSessionFeedback(
                        `Window selected for your ${durationLabel(duration)} session.`,
                      );
                      focusForm();
                    }}
                  >
                    Use
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <Empty
              title="No dry window"
              detail={`Nothing fits ${durationLabel(duration)} with every source below ${threshold} mm/h and gusts under ${gustLimit} km/h.`}
            />
          )}
        </section>
      </div>
    </>
  );
}
