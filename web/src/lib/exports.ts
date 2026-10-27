import type { Session, Track } from "./contracts";
import { localEpoch } from "./local-time.ts";

export function csvEscape(value: unknown) {
  const text =
    typeof value === "string" && /^[\t\r\n ]*[=+\-@]/.test(value)
      ? "'" + value
      : String(value ?? "");
  return '"' + text.replaceAll('"', '""') + '"';
}
export const toCsv = (rows: unknown[][]) =>
  rows.map((row) => row.map(csvEscape).join(",")).join("\r\n");

export function download(
  name: string,
  text: string,
  type = "text/csv;charset=utf-8",
) {
  const link = document.createElement("a");
  const url = URL.createObjectURL(new Blob([text], { type }));
  link.href = url;
  link.download = name;
  document.body.appendChild(link);
  link.click();
  link.remove();
  // Some browsers begin consuming the Blob after the click task has completed.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
const calendarText = (text: string) =>
  text
    .replaceAll("\\", "\\\\")
    .replace(/\r\n|\r|\n/g, "\\n")
    .replaceAll(";", "\\;")
    .replaceAll(",", "\\,");
const calendarTime = (time: number) =>
  new Date(time * 1000)
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}Z$/, "Z");
/** Fold iCalendar content lines at 75 UTF-8 octets, without splitting a character. */
function foldLine(text: string) {
  let line = "",
    bytes = 0;
  const lines: string[] = [];
  for (const character of text) {
    const length = new TextEncoder().encode(character).length;
    if (bytes + length > 75) {
      lines.push(line);
      line = " ";
      bytes = 1;
    }
    line += character;
    bytes += length;
  }
  lines.push(line);
  return lines.join("\r\n");
}

export function sessionsCalendar(
  sessions: Session[],
  tracks: Track[],
  now = Date.now() / 1000,
): string {
  if (!sessions.length)
    throw new Error("Save a session before exporting a calendar.");
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Pitwall//Race Weather//EN",
    "CALSCALE:GREGORIAN",
  ];
  for (const session of sessions) {
    const track = session.track ?? tracks.find((t) => t.id === session.trackId);
    const start = track
      ? localEpoch(session.date, session.time, track.timezone)
      : NaN;
    if (
      !track ||
      !Number.isFinite(start) ||
      !Number.isFinite(session.duration) ||
      session.duration <= 0
    ) {
      throw new Error(
        `The circuit or local time for “${session.name}” is unavailable. Edit the session before exporting.`,
      );
    }
    lines.push(
      "BEGIN:VEVENT",
      `UID:${calendarText(session.id)}@pitwall.local`,
      `DTSTAMP:${calendarTime(now)}`,
      `DTSTART:${calendarTime(start)}`,
      `DTEND:${calendarTime(start + session.duration * 60)}`,
      `SUMMARY:${calendarText(session.name + " · " + track.name)}`,
      `LOCATION:${calendarText(track.name + " (" + track.lat + ", " + track.lon + ")")}`,
      `GEO:${track.lat};${track.lon}`,
      `DESCRIPTION:${calendarText("Planned in Pitwall for " + session.date + " at " + session.time + " (" + track.timezone + ").\nWeather forecasts can change; review Pitwall before your session.")}`,
      "END:VEVENT",
    );
  }
  lines.push("END:VCALENDAR");
  return lines.map(foldLine).join("\r\n") + "\r\n";
}
