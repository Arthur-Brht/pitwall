import type { ConsensusHour, Forecast } from "@/lib/contracts";
import { n, time } from "@/lib/format";
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
        title="No precipitation forecast"
        detail="Refresh the forecast or enable a weather source."
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
          margin={{ top: 12, right: 16, left: -18, bottom: 0 }}
        >
          <defs>
            <linearGradient id="rain-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#e2fa76" stopOpacity={0.25} />
              <stop offset="100%" stopColor="#e2fa76" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="#ffffff0c" vertical={false} />
          <XAxis
            dataKey="time"
            tickFormatter={(t) => time(t, tz)}
            minTickGap={35}
            stroke="#58616b"
            tickLine={false}
            axisLine={false}
            fontSize={10}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            stroke="#58616b"
            fontSize={10}
            unit=""
            domain={[0, "auto"]}
          />
          <Tooltip content={<ChartTip tz={tz} />} />
          <Area
            dataKey="range"
            name="Highest forecast · mm/h"
            type="linear"
            stroke="none"
            fill="#758288"
            fillOpacity={0.09}
          />
          <Area
            dataKey="median"
            name="Family median · mm/h"
            type="linear"
            stroke="#e2fa76"
            strokeWidth={2}
            fill="url(#rain-fill)"
            connectNulls={false}
          />
          {forecasts.map((f) => (
            <Line
              key={f.id}
              dataKey={f.id}
              name={`${f.name} · mm/h`}
              stroke={f.color}
              strokeWidth={1.2}
              dot={false}
              type="linear"
              connectNulls={false}
              opacity={0.7}
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
  return (
    <div className="chart" style={{ height: 185 }}>
      <ResponsiveContainer
        width="100%"
        height="100%"
        initialDimension={{ width: 320, height: 185 }}
      >
        <LineChart
          data={hours}
          margin={{ top: 12, right: 12, left: -18, bottom: 0 }}
        >
          <CartesianGrid stroke="#ffffff0c" vertical={false} />
          <XAxis
            dataKey="time"
            tickFormatter={(t) => time(t, tz)}
            minTickGap={40}
            stroke="#58616b"
            tickLine={false}
            axisLine={false}
            fontSize={10}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            stroke="#58616b"
            fontSize={10}
          />
          <Tooltip content={<ChartTip tz={tz} />} />
          {metric === "temperature" ? (
            <>
              <Line
                dataKey="temperature"
                name="Median air · °C"
                stroke="#edc383"
                strokeWidth={2}
                dot={false}
                connectNulls={false}
              />
              <Line
                dataKey="dewpoint"
                name="Median dew point · °C"
                stroke="#8daaaa"
                strokeWidth={1.2}
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
                stroke="#94b4f5"
                strokeWidth={2}
                dot={false}
                connectNulls={false}
              />
              <Line
                dataKey="gust"
                name="Max gust · km/h"
                stroke="#bd9de5"
                strokeWidth={1.2}
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
