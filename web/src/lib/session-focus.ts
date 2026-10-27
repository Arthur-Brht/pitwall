import type { Session, Track } from "./contracts";
import { day, time } from "./format.ts";
import { localEpoch } from "./local-time.ts";

export type FocusSelection = {
  mode: "auto" | "now" | "custom" | "saved";
  sessionId?: string;
  date?: string;
  startTime?: string;
  endTime?: string;
  before: number;
  after: number;
};
export type RunFocus = {
  start: number;
  end: number;
  displayStart: number;
  displayEnd: number;
  label: string;
  sessionId?: string;
  kind: "session" | "now";
};
export const DEFAULT_FOCUS: FocusSelection = {
  mode: "auto",
  before: 15,
  after: 15,
};
export const BUFFER_MINUTES = [0, 5, 10, 15, 30, 60];

export function customBounds(
  date: string,
  startTime: string,
  endTime: string,
  timezone: string,
) {
  const start = localEpoch(date, startTime, timezone);
  if (!Number.isFinite(start)) return null;
  const nextDay =
    endTime < startTime
      ? new Date(Date.parse(`${date}T12:00:00Z`) + 86400000)
          .toISOString()
          .slice(0, 10)
      : date;
  const end = localEpoch(nextDay, endTime, timezone);
  return Number.isFinite(start) &&
    Number.isFinite(end) &&
    end > start &&
    end - start <= 86400
    ? { start, end }
    : null;
}

export function validFocus(value: unknown): value is FocusSelection {
  if (!value || typeof value !== "object") return false;
  const v = value as FocusSelection;
  if (
    !["auto", "now", "saved", "custom"].includes(v.mode) ||
    !BUFFER_MINUTES.includes(v.before) ||
    !BUFFER_MINUTES.includes(v.after)
  )
    return false;
  if (v.mode === "saved")
    return (
      typeof v.sessionId === "string" &&
      v.sessionId.length > 0 &&
      v.sessionId.length <= 200
    );
  if (v.mode === "custom")
    return (
      typeof v.date === "string" &&
      typeof v.startTime === "string" &&
      typeof v.endTime === "string" &&
      !!customBounds(v.date, v.startTime, v.endTime, "UTC")
    );
  return true;
}

export function resolveFocus(
  track: Track,
  sessions: Session[],
  now: number,
  selection: FocusSelection = DEFAULT_FOCUS,
): RunFocus {
  const local = sessions
    .filter((s) => s.trackId === track.id)
    .map((session) => {
      const start = localEpoch(session.date, session.time, track.timezone);
      return { session, start, end: start + session.duration * 60 };
    })
    .filter((s) => Number.isFinite(s.start))
    .sort((a, b) => a.start - b.start);
  const saved =
    selection.mode === "saved"
      ? local.find((s) => s.session.id === selection.sessionId)
      : selection.mode === "auto"
        ? local.find((s) => s.end > now && s.start <= now + 86400)
        : undefined;
  const custom =
    selection.mode === "custom"
      ? customBounds(
          selection.date ?? "",
          selection.startTime ?? "",
          selection.endTime ?? "",
          track.timezone,
        )
      : null;
  const bounds = saved ?? custom;
  if (!bounds)
    return {
      start: now,
      end: now + 10800,
      displayStart: now,
      displayEnd: now + 10800,
      label: "Next 3 hours",
      kind: "now",
    };
  return {
    start: bounds.start,
    end: bounds.end,
    displayStart: bounds.start - selection.before * 60,
    displayEnd: bounds.end + selection.after * 60,
    label: saved?.session.name ?? "Your run",
    sessionId: saved?.session.id,
    kind: "session",
  };
}

export function defaultCustom(now: number, timezone: string) {
  const start = Math.ceil(now / 900) * 900;
  return {
    date: day(start, timezone),
    startTime: time(start, timezone),
    endTime: time(start + 1800, timezone),
  };
}
