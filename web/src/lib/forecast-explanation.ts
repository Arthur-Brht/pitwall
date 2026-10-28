import type { RainRow } from "./run-weather";
import type { RunFocus } from "./session-focus";
import {
  clearingAfter,
  CLEARING_LOOKAHEAD_SECONDS,
  overlaps,
  rowWindow,
} from "./run-weather.ts";
import { day, n, niceDate, time } from "./format.ts";
import { rainIntensity } from "./rain-intensity.ts";

export function intervalText(
  start: number,
  end: number,
  timezone: string,
  reference: number,
) {
  const date =
    day(start, timezone) !== day(reference, timezone)
      ? ` · ${niceDate(day(start, timezone))}`
      : "";
  return `${time(start, timezone)}–${time(end, timezone)}${date}${day(start, timezone) !== day(end, timezone) ? " (+1 day)" : ""}`;
}

/** Source-level wording uses original forecast intervals, not invented minute precision. */
export function forecastExplanation(
  row: RainRow,
  focus: RunFocus,
  threshold: number,
  timezone: string,
) {
  const run = rowWindow(row, focus.start, focus.end, threshold);
  const known = row.intervals.filter(
    (i) => i.rate !== null && overlaps(i, focus.start, focus.end),
  );
  const wet = row.intervals
    .filter(
      (i) =>
        i.rate !== null &&
        i.rate >= threshold &&
        overlaps(i, focus.start, focus.end),
    )
    .sort((a, b) => a.start - b.start);
  const spells: { start: number; end: number }[] = [];
  for (const interval of wet) {
    const previous = spells.at(-1);
    if (previous?.end === interval.start) previous.end = interval.end;
    else spells.push({ start: interval.start, end: interval.end });
  }
  if (!known.length)
    return {
      state: "missing",
      text: "No rain data for this run.",
      detail: "No dry-weather conclusion is available.",
    };
  if (!wet.length) {
    const buffer = rowWindow(
      row,
      focus.displayStart,
      focus.displayEnd,
      threshold,
    ).wet;
    return {
      state: run.complete ? "dry" : "missing",
      text: run.complete
        ? known.some((i) => i.rate! > 0)
          ? `Rain stays below ${n(threshold, 2)} mm/h.`
          : "No rain during your run."
        : "No rain in known intervals; gaps remain.",
      detail: buffer
        ? "Rain appears outside the run, in the buffer."
        : run.complete
          ? "Below your rain threshold throughout the run."
          : "Incomplete forecast; not a dry vote.",
    };
  }
  const timing = spells
    .slice(0, 2)
    .map((s) => intervalText(s.start, s.end, timezone, focus.start))
    .join("; ");
  const stop = clearingAfter(
    row,
    wet.at(-1)!,
    focus.displayEnd + CLEARING_LOOKAHEAD_SECONDS,
    threshold,
  );
  return {
    state: "wet",
    text: `Rain ${timing}${spells.length > 2 ? `; +${spells.length - 2} more periods` : ""}.`,
    detail: `${rainIntensity(run.peak)} · up to ${n(run.peak, 1)} mm/h${!run.complete ? " · gaps in this run" : ""}. ${stop ? `Next dry interval ${intervalText(stop.start, stop.end, timezone, focus.start)}${stop.start >= focus.end ? " (after your run)" : ""}.` : "No confirmed stop within the look-ahead."}`,
  };
}
