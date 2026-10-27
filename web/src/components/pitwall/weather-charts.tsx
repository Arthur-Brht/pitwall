import type { ConsensusHour, Forecast } from "@/lib/contracts";
import { n, time } from "@/lib/format";
import { usePitwall } from "@/lib/pitwall-context";
import { sourceColor } from "@/lib/theme";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
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
}: {
  active?: boolean;
  payload?: any[];
  label?: any;
  tz: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="chart-tooltip">
      <strong>{time(Number(label), tz, true)}</strong>
      {payload.map((p: any, i: number) => (
        <div key={i}>
          <span style={{ background: p.color }} className="tiny-dot" />
          {p.name}
          <b>{n(p.value, 2)}</b>
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
  if (!rows.length)
    return (
      <Empty
        title="No rain forecast"
        detail="Refresh or turn on a weather source."
      />
    );
  return (
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
          <XAxis
            dataKey="time"
            tickFormatter={(t) => time(t, tz)}
            minTickGap={35}
            {...theme.axis}
          />
          <YAxis {...theme.axis} domain={[0, "auto"]} />
          <Tooltip content={<ChartTip tz={tz} />} />
          <Area
            dataKey="range"
            name="Highest forecast · mm/h"
            type="linear"
            stroke="none"
            fill={colors.rainRange}
            fillOpacity={0.1}
          />
          <Area
            dataKey="median"
            name="Model median · mm/h"
            type="linear"
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
              type="linear"
              connectNulls={false}
              opacity={0.85}
            />
          ))}
        </AreaChart>
      </ResponsiveContainer>
    </div>
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
