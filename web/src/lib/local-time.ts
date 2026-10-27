/** Convert an unambiguous circuit-local date/time to UTC seconds.
 * Reject incomplete inputs, nonexistent spring times, and repeated autumn times.
 * Silent offset selection would compare the wrong weather interval.
 */
export function localEpoch(
  date: string,
  hhmm: string,
  timezone: string,
): number {
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
    !/^([01]\d|2[0-3]):[0-5]\d$/.test(hhmm)
  )
    return Number.NaN;
  const desired = new Date(`${date}T${hhmm}:00Z`).getTime();
  if (!Number.isFinite(desired)) return Number.NaN;
  let guess = desired;
  try {
    const format = new Intl.DateTimeFormat("en-CA", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23",
    });
    const parts = (epoch: number) =>
      Object.fromEntries(
        format.formatToParts(epoch).map((x) => [x.type, x.value]),
      );
    const matches = (epoch: number) => {
      const p = parts(epoch);
      return (
        `${p.year}-${p.month}-${p.day}` === date &&
        `${p.hour}:${p.minute}` === hhmm
      );
    };
    for (let k = 0; k < 3; k++) {
      const p = parts(guess);
      const utc = Date.UTC(
        +p.year,
        +p.month - 1,
        +p.day,
        +p.hour,
        +p.minute,
        +p.second,
      );
      guess += desired - utc;
    }
    if (!matches(guess)) return Number.NaN;
    for (const offset of [
      -7200000, -5400000, -3600000, -1800000, 1800000, 3600000, 5400000,
      7200000,
    ])
      if (matches(guess + offset)) return Number.NaN;
    return guess / 1000;
  } catch {
    return Number.NaN;
  }
}
