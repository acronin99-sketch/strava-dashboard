"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { SportBreakdown, TrendPoint, WeeklyPoint } from "@/lib/stats";
import { formatPace } from "@/lib/stats";

const STRAVA_ORANGE = "#fc4c02";

const axisProps = {
  stroke: "#71717a",
  fontSize: 12,
  tickLine: false,
  axisLine: false,
} as const;

const tooltipProps = {
  contentStyle: {
    background: "#18181b",
    border: "1px solid #3f3f46",
    borderRadius: "0.5rem",
    fontSize: "0.8125rem",
  },
  labelStyle: { color: "#a1a1aa" },
  cursor: { fill: "rgba(255,255,255,0.04)" },
} as const;

export function WeeklyMileageChart({ data }: { data: WeeklyPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
        <XAxis dataKey="label" {...axisProps} />
        <YAxis {...axisProps} />
        <Tooltip
          {...tooltipProps}
          formatter={(value: unknown) => [`${Number(value)} mi`, "Distance"]}
        />
        <Bar dataKey="miles" fill={STRAVA_ORANGE} radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function ElevationChart({ data }: { data: WeeklyPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -8 }}>
        <defs>
          <linearGradient id="elevationFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={STRAVA_ORANGE} stopOpacity={0.5} />
            <stop offset="100%" stopColor={STRAVA_ORANGE} stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
        <XAxis dataKey="label" {...axisProps} />
        <YAxis {...axisProps} />
        <Tooltip
          {...tooltipProps}
          formatter={(value: unknown) => [
            `${Number(value).toLocaleString()} ft`,
            "Elevation",
          ]}
        />
        <Area
          type="monotone"
          dataKey="elevationFeet"
          stroke={STRAVA_ORANGE}
          strokeWidth={2}
          fill="url(#elevationFill)"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

type MetricKey = "pace" | "mph" | "heartrate" | "watts" | "efficiency";

function TrendChart({
  data,
  dataKey,
  name,
  color,
  reversed = false,
  domain = ["auto", "auto"],
  format,
}: {
  data: TrendPoint[];
  dataKey: MetricKey;
  name: string;
  color: string;
  reversed?: boolean;
  domain?: [string, string];
  format: (value: number) => string;
}) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -8 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
        <XAxis dataKey="label" {...axisProps} />
        <YAxis
          {...axisProps}
          reversed={reversed}
          domain={domain}
          tickFormatter={(value: number) => format(value)}
        />
        <Tooltip
          {...tooltipProps}
          formatter={(value: unknown) => [format(Number(value)), name]}
          labelFormatter={(
            label: unknown,
            payload: readonly { payload?: unknown }[],
          ) => {
            const point = payload?.[0]?.payload as TrendPoint | undefined;
            return point ? `${label} — ${point.name}` : String(label ?? "");
          }}
        />
        <Line
          type="monotone"
          dataKey={dataKey}
          stroke={color}
          strokeWidth={2}
          dot={{ r: 3, fill: color }}
          activeDot={{ r: 5 }}
          connectNulls
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

export function PaceChart({ data }: { data: TrendPoint[] }) {
  return (
    <TrendChart
      data={data}
      dataKey="pace"
      name="Pace"
      color={STRAVA_ORANGE}
      // Faster pace is a lower number, so invert for an intuitive read:
      // up on the chart means faster.
      reversed
      domain={["dataMin - 0.5", "dataMax + 0.5"]}
      format={(value) => `${formatPace(value)} /mi`}
    />
  );
}

export function SpeedChart({ data }: { data: TrendPoint[] }) {
  return (
    <TrendChart
      data={data}
      dataKey="mph"
      name="Speed"
      color={STRAVA_ORANGE}
      format={(value) => `${value.toFixed(1)} mph`}
    />
  );
}

export function HeartRateChart({ data }: { data: TrendPoint[] }) {
  return (
    <TrendChart
      data={data}
      dataKey="heartrate"
      name="Avg HR"
      color="#f472b6"
      format={(value) => `${Math.round(value)} bpm`}
    />
  );
}

export function PowerChart({ data }: { data: TrendPoint[] }) {
  return (
    <TrendChart
      data={data}
      dataKey="watts"
      name="Normalized power"
      color="#a78bfa"
      format={(value) => `${Math.round(value)} W`}
    />
  );
}

export function EfficiencyChart({ data }: { data: TrendPoint[] }) {
  return (
    <TrendChart
      data={data}
      dataKey="efficiency"
      name="Efficiency"
      color="#38bdf8"
      format={(value) => value.toFixed(2)}
    />
  );
}

const SPORT_COLORS = [
  "#fc4c02",
  "#f59e0b",
  "#38bdf8",
  "#a78bfa",
  "#34d399",
  "#f472b6",
];

export function SportChart({ data }: { data: SportBreakdown[] }) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart
        data={data}
        layout="vertical"
        margin={{ top: 8, right: 16, bottom: 0, left: 24 }}
      >
        <CartesianGrid
          strokeDasharray="3 3"
          stroke="#27272a"
          horizontal={false}
        />
        <XAxis type="number" {...axisProps} />
        <YAxis type="category" dataKey="sport" width={92} {...axisProps} />
        <Tooltip
          {...tooltipProps}
          formatter={(
            value: unknown,
            _name: unknown,
            entry: { payload?: unknown },
          ) => [
            `${Number(value)} mi · ${(entry.payload as SportBreakdown).count} activities`,
            "Total",
          ]}
        />
        <Bar dataKey="miles" radius={[0, 4, 4, 0]}>
          {data.map((entry, index) => (
            <Cell
              key={entry.sport}
              fill={SPORT_COLORS[index % SPORT_COLORS.length]}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
