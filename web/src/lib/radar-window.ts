/** Clamp a playback window to the frames actually supplied by the radar service. */
export function radarWindow(
  frames: { time: number }[],
  from: number | null,
  to: number | null,
) {
  if (!frames.length) return { start: 0, end: 0 };
  let start =
    from === null ? 0 : frames.findIndex((frame) => frame.time >= from);
  if (start < 0) start = frames.length - 1;
  let end = frames.length - 1;
  if (to !== null) while (end > 0 && frames[end].time > to) end--;
  end = Math.max(start, end);
  return { start, end };
}
