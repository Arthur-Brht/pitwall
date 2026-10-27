export const n = (v: number | null | undefined, d = 0) =>
  v === null || v === undefined || !Number.isFinite(v) ? "—" : v.toFixed(d);
export function time(t: number, tz: string, detail = false) {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: tz,
    hour: "2-digit",
    minute: "2-digit",
    ...(detail ? { weekday: "short", day: "2-digit", month: "short" } : {}),
  }).format(t * 1000);
}
export function day(t: number, tz: string) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(t * 1000);
}
export function niceDate(d: string) {
  if (!Number.isFinite(new Date(d + "T12:00:00Z").getTime()))
    return "Choose date";
  return new Date(d + "T12:00:00Z").toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
}
export function max(values: (number | null)[]) {
  const f = values.filter((v): v is number => v !== null && Number.isFinite(v));
  return f.length ? Math.max(...f) : null;
}
export function min(values: (number | null)[]) {
  const f = values.filter((v): v is number => v !== null && Number.isFinite(v));
  return f.length ? Math.min(...f) : null;
}
export function mean(values: (number | null)[]) {
  const f = values.filter((v): v is number => v !== null && Number.isFinite(v));
  return f.length ? f.reduce((a, b) => a + b, 0) / f.length : null;
}
export function compass(deg: number | null) {
  return deg === null
    ? "—"
    : [
        "N",
        "NNE",
        "NE",
        "ENE",
        "E",
        "ESE",
        "SE",
        "SSE",
        "S",
        "SSW",
        "SW",
        "WSW",
        "W",
        "WNW",
        "NW",
        "NNW",
      ][Math.round(deg / 22.5) % 16];
}
