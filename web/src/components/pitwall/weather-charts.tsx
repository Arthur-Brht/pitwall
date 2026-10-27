import type { ConsensusHour, Forecast } from "@/lib/contracts";
import { n, time } from "@/lib/format";
import { usePitwall } from "@/lib/pitwall-context";
import { sourceColor } from "@/lib/theme";
import { useState } from "react";
import {
  RAIN_MODERATE,
  RAIN_HEAVY,
  rainIntensity,
  rainChartMaximum,
} from "@/lib/rain-intensity";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  ReferenceArea,
  ReferenceLine,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Empty } from "./weather-common";
export function ChartTip({
  active,
  payload,
  label,
  tz,
  rain = false,
}: {
  active?: boolean;
  payload?: any[];
  label?: any;
  tz: string;
  rain?: boolean;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="chart-tooltip">
      <strong>
        {time(Number(label), tz, true)}
        {rain ? `–${time(Number(label) + 3600, tz)}` : ""}
      </strong>
      {payload.map((p: any, i: number) => (
        <div key={i}>
          <span style={{ background: p.color }} className="tiny-dot" />
          {p.name}
          <b>
            {n(p.value, 2)}
            {rain ? ` · ${rainIntensity(p.value)}` : ""}
          </b>
        </div>
      ))}
    </div>
  );
}
export function useChartTheme() {
  const { appearance } = usePitwall();
  const c = appearance.colors;
  return {
    colors: c,
    source: (f: Forecast) => sourceColor(f.color, appearance.theme),
    grid: <CartesianGrid stroke={c.grid} vertical={false} />,
    axis: { stroke: c.axis, tickLine: false, axisLine: false, fontSize: 11 },
  };
}
export function RainChart({
  hours,
  forecasts,
  tz,
  height = 220,
}: {
  hours: ConsensusHour[];
  forecasts: Forecast[];
  tz: string;
  height?: number;
}) {
  const theme = useChartTheme();
  const [detail, setDetail] = useState(false);
  const { colors } = theme;
  const rows = hours.map((h) => {
    const r: Record<string, any> = {
      time: h.time,
      median: h.rainMedian,
      range: h.rainMax,
    };
    forecasts.forEach(
      (f) =>
        (r[f.id] =
          f.hours.find((x) => x.time === h.time)?.precipitation ?? null),
    );
    return r;
  });
  const peak = Math.max(0, ...hours.map((hour) => hour.rainMax ?? 0));
  const ymax = rainChartMaximum(
    hours.map((hour) => hour.rainMax),
    detail,
  );
  if (!rows.length)
    return (
      <Empty
        title="No rain forecast"
        detail="Refresh or turn on a weather source."
      />
    );
  return (
    <>
      <div className="rain-chart-guide">
        <div className="rain-intensity-guide" aria-label="Rain intensity guide">
          <span>
            <i className="intensity-light" />
            Light ≤ 2.5
          </span>
          <span>
            <i className="intensity-moderate" />
            Moderate 2.5–7.6
          </span>
          <span>
            <i className="intensity-heavy" />
            Heavy &gt; 7.6 mm/h
          </span>
        </div>
        <select
          className="compact-select"
          aria-label="Rain chart scale"
          value={detail ? "detail" : "context"}
          onChange={(event) => setDetail(event.target.value === "detail")}
        >
          <option value="context">Intensity scale</option>
          <option value="detail">Zoom to forecast</option>
        </select>
      </div>
      <div className="rain-chart-context">
        {hours.some((hour) => hour.rainMax !== null)
          ? `${rainIntensity(peak)}${peak > 0 ? ` rain · peak ${n(peak, 1)} mm/h` : " forecast"}`
          : "Rain intensity unavailable"}
        {detail && peak < RAIN_MODERATE
          ? " · zoomed within the light-rain range"
          : ""}
      </div>
      <div className="chart" style={{ height }}>
        <ResponsiveContainer
          width="100%"
          height="100%"
          initialDimension={{ width: 320, height }}
        >
          <AreaChart
            data={rows}
            margin={{ top: 12, right: 8, left: -22, bottom: 0 }}
          >
            <defs>
              <linearGradient id="rain-fill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={colors.rain} stopOpacity={0.28} />
                <stop offset="100%" stopColor={colors.rain} stopOpacity={0} />
              </linearGradient>
            </defs>
            {theme.grid}
            <ReferenceArea
              y1={0}
              y2={Math.min(RAIN_MODERATE, ymax)}
              fill={colors.rain}
              fillOpacity={0.035}
            />
            {ymax > RAIN_MODERATE && (
              <ReferenceArea
                y1={RAIN_MODERATE}
                y2={Math.min(RAIN_HEAVY, ymax)}
                fill="var(--warn)"
                fillOpacity={0.045}
              />
            )}
            {ymax > RAIN_HEAVY && (
              <ReferenceArea
                y1={RAIN_HEAVY}
                y2={ymax}
                fill="var(--danger)"
                fillOpacity={0.04}
              />
            )}
            <XAxis
              dataKey="time"
              tickFormatter={(t) => time(t, tz)}
              minTickGap={35}
              {...theme.axis}
            />
            <YAxis
              {...theme.axis}
              domain={[0, ymax]}
              ticks={
                detail
                  ? undefined
                  : [
                      0,
                      2.5,
                      5,
                      7.6,
                      ...[10, ymax].filter(
                        (value, index, values) =>
                          value <= ymax && values.indexOf(value) === index,
                      ),
                    ]
              }
            />
            {ymax >= RAIN_MODERATE && (
              <ReferenceLine
                y={RAIN_MODERATE}
                stroke={colors.axis}
                strokeDasharray="3 4"
                strokeOpacity={0.45}
              />
            )}
            {ymax >= RAIN_HEAVY && (
              <ReferenceLine
                y={RAIN_HEAVY}
                stroke={colors.axis}
                strokeDasharray="3 4"
                strokeOpacity={0.45}
              />
            )}
            <Tooltip content={<ChartTip tz={tz} rain />} />
            <Area
              dataKey="range"
              name="Highest forecast · mm/h"
              type="stepAfter"
              stroke="none"
              fill={colors.rainRange}
              fillOpacity={0.1}
            />
            <Area
              dataKey="median"
              name="Model median · mm/h"
              type="stepAfter"
              stroke={colors.rain}
              strokeWidth={2}
              fill="url(#rain-fill)"
              connectNulls={false}
            />
            {forecasts.map((f) => (
              <Line
                key={f.id}
                dataKey={f.id}
                name={`${f.name} · mm/h`}
                stroke={theme.source(f)}
                strokeWidth={1.4}
                dot={false}
                type="stepAfter"
                connectNulls={false}
                opacity={0.85}
              />
            ))}
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <p className="rain-chart-note">
        Hourly averages can hide a heavier brief shower.
      </p>
    </>
  );
}
export function MetricChart({
  hours,
  tz,
  metric,
}: {
  hours: ConsensusHour[];
  tz: string;
  metric: "temperature" | "wind";
}) {
  const theme = useChartTheme();
  const { colors } = theme;
  return (
    <div className="chart" style={{ height: 220 }}>
      <ResponsiveContainer
        width="100%"
        height="100%"
        initialDimension={{ width: 320, height: 220 }}
      >
        <LineChart
          data={hours}
          margin={{ top: 12, right: 8, left: -22, bottom: 0 }}
        >
          {theme.grid}
          <XAxis
            dataKey="time"
            tickFormatter={(t) => time(t, tz)}
            minTickGap={40}
            {...theme.axis}
          />
          <YAxis {...theme.axis} />
          <Tooltip content={<ChartTip tz={tz} />} />
          {metric === "temperature" ? (
            <>
              <Line
                dataKey="temperature"
                name="Median air · °C"
                stroke={colors.temperature}
                strokeWidth={2}
                dot={false}
                connectNulls={false}
              />
              <Line
                dataKey="dewpoint"
                name="Median dew point · °C"
                stroke={colors.dewpoint}
                strokeWidth={1.4}
                strokeDasharray="4 4"
                dot={false}
                connectNulls={false}
              />
            </>
          ) : (
            <>
              <Line
                dataKey="wind"
                name="Median wind · km/h"
                stroke={colors.wind}
                strokeWidth={2}
                dot={false}
                connectNulls={false}
              />
              <Line
                dataKey="gust"
                name="Max gust · km/h"
                stroke={colors.gust}
                strokeWidth={1.4}
                strokeDasharray="4 4"
                dot={false}
                connectNulls={false}
              />
            </>
          )}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
