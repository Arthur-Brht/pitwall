export const validRain = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value) && value >= 0;

/** Invalid accumulation is unknown; zero is a valid dry amount. */
export const rainValue = (value: unknown): number | null =>
  validRain(value) ? value : null;
