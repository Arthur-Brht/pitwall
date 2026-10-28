import { InstallApp } from "@/components/pitwall/install-app";
import { usePitwall } from "@/lib/pitwall-context";
import { TRACKS } from "@/lib/tracks";
import {
  BUFFER_MINUTES,
  customBounds,
  defaultCustom,
} from "@/lib/session-focus";
import { day, niceDate, time } from "@/lib/format";
import { Plus, Settings2, PanelLeftClose } from "lucide-react";
import { useEffect, useState } from "react";

function RunControls() {
  const {
    track,
    now,
    focus,
    focusSelection,
    setFocusSelection,
    localSessions,
  } = usePitwall();
  const [draft, setDraft] = useState(() => ({
    ...defaultCustom(now, track.timezone),
    ...(focusSelection.mode === "custom"
      ? {
          date: focusSelection.date!,
          startTime: focusSelection.startTime!,
          endTime: focusSelection.endTime!,
        }
      : {}),
  }));
  const [error, setError] = useState("");
  const value =
    focusSelection.mode === "saved" &&
    localSessions.some((s) => s.id === focusSelection.sessionId)
      ? focusSelection.sessionId!
      : focusSelection.mode === "saved"
        ? "auto"
        : focusSelection.mode;
  return (
    <section className="run-controls" aria-label="Run selection">
      <h2>Your run</h2>
      <label>
        Session
        <select
          aria-label="Dashboard session"
          value={value}
          onChange={(e) => {
            setError("");
            const value = e.target.value;
            if (value === "auto" || value === "now")
              setFocusSelection({ ...focusSelection, mode: value });
            else if (value === "custom")
              setFocusSelection({
                ...focusSelection,
                ...draft,
                mode: "custom",
              });
            else
              setFocusSelection({
                ...focusSelection,
                mode: "saved",
                sessionId: value,
              });
          }}
        >
          <option value="auto">Next saved session, or next 3 h</option>
          <option value="now">Next 3 hours</option>
          <option value="custom">Choose date &amp; times…</option>
          {localSessions.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name} · {niceDate(s.date)} {s.time}
            </option>
          ))}
        </select>
      </label>
      {value === "custom" ? (
        <form
          className="run-time-form"
          onSubmit={(e) => {
            e.preventDefault();
            if (
              !customBounds(
                draft.date,
                draft.startTime,
                draft.endTime,
                track.timezone,
              )
            ) {
              setError(
                "Choose valid start and end times. Repeated or skipped daylight-saving times cannot be used.",
              );
              return;
            }
            setError("");
            setFocusSelection({ ...focusSelection, ...draft, mode: "custom" });
          }}
        >
          <label>
            Date
            <input
              type="date"
              aria-label="Run date"
              required
              value={draft.date}
              onChange={(e) =>
                setDraft((d) => ({ ...d, date: e.target.value }))
              }
            />
          </label>
          <div className="form-pair">
            <label>
              Start
              <input
                type="time"
                aria-label="Run start time"
                required
                value={draft.startTime}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, startTime: e.target.value }))
                }
              />
            </label>
            <label>
              End
              <input
                type="time"
                aria-label="Run end time"
                required
                value={draft.endTime}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, endTime: e.target.value }))
                }
              />
            </label>
          </div>
          {draft.endTime < draft.startTime && (
            <p className="fineprint">Ends the following day.</p>
          )}
          {error && (
            <p role="alert" className="inline-warning">
              {error}
            </p>
          )}
          <button className="button full-width" type="submit">
            Apply times
          </button>
        </form>
      ) : (
        <p className="selected-run-note">
          {focus.kind === "session" ? (
            <>
              {focus.label}
              <br />
              {niceDate(day(focus.start, track.timezone))} ·{" "}
              {time(focus.start, track.timezone)}–
              {time(focus.end, track.timezone)}
            </>
          ) : (
            "No session selected. Showing the next 3 hours from now."
          )}
        </p>
      )}
      <div className="run-buffers form-pair">
        <label>
          Before
          <select
            aria-label="Buffer before run"
            value={focusSelection.before}
            onChange={(e) =>
              setFocusSelection({
                ...focusSelection,
                before: Number(e.target.value),
              })
            }
          >
            {BUFFER_MINUTES.map((m) => (
              <option value={m} key={m}>
                {m} min
              </option>
            ))}
          </select>
        </label>
        <label>
          After
          <select
            aria-label="Buffer after run"
            value={focusSelection.after}
            onChange={(e) =>
              setFocusSelection({
                ...focusSelection,
                after: Number(e.target.value),
              })
            }
          >
            {BUFFER_MINUTES.map((m) => (
              <option value={m} key={m}>
                {m} min
              </option>
            ))}
          </select>
        </label>
      </div>
      <p className="fineprint">
        {focus.kind === "session"
          ? "Buffers extend the timeline; the rain summary stays focused on your run."
          : "Buffers apply when you choose a session."}{" "}
        Times are local to the circuit ({track.timezone}).
      </p>
    </section>
  );
}

export function Sidebar() {
  const {
    pwa,
    setView,
    track,
    favorites,
    setSettings,
    setSearchOpen,
    setCoordinateMode,
    mobileNav,
    setMobileNav,
    choose,
  } = usePitwall();
  const otherCircuits = TRACKS.filter(
    (circuit) => !favorites.some((saved) => saved.id === circuit.id),
  );
  const close = () => {
    setMobileNav(false);
    document.querySelector<HTMLButtonElement>(".active-circuit")?.focus();
  };
  useEffect(() => {
    if (!mobileNav) return;
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setMobileNav(false);
        document.querySelector<HTMLButtonElement>(".active-circuit")?.focus();
      }
    };
    document.addEventListener("keydown", key);
    return () => document.removeEventListener("keydown", key);
  }, [mobileNav, setMobileNav]);
  return (
    <>
      <aside
        id="saved-circuits"
        className={`sidebar ${mobileNav ? "open" : ""}`}
        aria-label="Circuit and session"
        aria-hidden={!mobileNav}
        inert={!mobileNav}
      >
        <div className="sidebar-brand-row">
          <a
            className="brand"
            href="#"
            onClick={(e) => {
              e.preventDefault();
              setView("dashboard");
            }}
          >
            <span className="brand-mark" aria-hidden="true" />
            Pitwall<small className="preview-badge">2.4.2</small>
          </a>
          <button
            className="icon-button"
            onClick={close}
            aria-label="Close circuit and session sidebar"
          >
            <PanelLeftClose size={18} />
          </button>
        </div>
        <nav className="circuit-picker" aria-label="Saved circuits">
          <label>
            Circuit
            <select
              aria-label="Circuit"
              value={track.id}
              onChange={(e) => {
                const chosen = [...favorites, ...otherCircuits].find(
                  (t) => t.id === e.target.value,
                );
                if (chosen) choose(chosen);
              }}
            >
              <optgroup label="Saved circuits">
                {favorites.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
              </optgroup>
              {otherCircuits.length > 0 && (
                <optgroup label="More circuits">
                  {otherCircuits.map((circuit) => (
                    <option key={circuit.id} value={circuit.id}>
                      {circuit.name}
                    </option>
                  ))}
                </optgroup>
              )}
            </select>
          </label>
        </nav>
        <button
          className="add-circuit"
          aria-label="Add a circuit or location"
          onClick={(e) => {
            e.currentTarget.focus();
            setCoordinateMode(false);
            setSearchOpen(true);
          }}
        >
          <Plus size={15} /> Add location
        </button>
        {mobileNav && <RunControls key={track.id} />}
        <div className="sidebar-bottom">
          <InstallApp pwa={pwa} />
          <button
            className="sidebar-settings"
            onClick={(e) => {
              e.currentTarget.focus();
              setSettings(true);
            }}
          >
            <Settings2 size={15} /> Weather preferences
          </button>
        </div>
      </aside>
      {mobileNav && (
        <button
          className="sidebar-scrim"
          aria-label="Close circuits"
          onClick={close}
        />
      )}
    </>
  );
}
