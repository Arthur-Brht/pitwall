// Approximate hourly-rate guides based on NOAA's rainfall-intensity table.
// Forecast interval averages can conceal a much heavier short shower.
export const RAIN_MODERATE = 2.5;
export const RAIN_HEAVY = 7.6;
export function rainIntensity(value: number | null | undefined) {
  if (
    value === null ||
    value === undefined ||
    !Number.isFinite(value) ||
    value < 0
  )
    return "Unknown";
  if (value === 0) return "No rain";
  if (value <= RAIN_MODERATE) return "Light";
  if (value <= RAIN_HEAVY) return "Moderate";
  return "Heavy";
}
export function rainChartMaximum(
  values: (number | null | undefined)[],
  detail: boolean,
) {
  const peak = Math.max(
    0,
    ...values.filter(
      (value): value is number =>
        typeof value === "number" && Number.isFinite(value) && value >= 0,
    ),
  );
  return detail
    ? Math.max(1, Math.ceil(peak * 1.15 * 10) / 10)
    : Math.max(10, Math.ceil((peak * 1.1) / 5) * 5);
}
