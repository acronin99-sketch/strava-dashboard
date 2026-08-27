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
import type { PacePoint, SportBreakdown, WeeklyPoint } from "@/lib/stats";
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

export function PaceChart({ data }: { data: PacePoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -8 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
        <XAxis dataKey="label" {...axisProps} />
        <YAxis
          {...axisProps}
          // Faster pace is a lower number, so invert for an intuitive read:
          // up on the chart means faster.
          reversed
          domain={["dataMin - 0.5", "dataMax + 0.5"]}
          tickFormatter={(value: number) => formatPace(value)}
        />
        <Tooltip
          {...tooltipProps}
          formatter={(value: unknown) => [
            `${formatPace(Number(value))} /mi`,
            "Pace",
          ]}
          labelFormatter={(
            label: unknown,
            payload: readonly { payload?: unknown }[],
          ) => {
            const point = payload?.[0]?.payload as PacePoint | undefined;
            return point ? `${label} — ${point.name}` : String(label ?? "");
          }}
        />
        <Line
          type="monotone"
          dataKey="pace"
          stroke={STRAVA_ORANGE}
          strokeWidth={2}
          dot={{ r: 3, fill: STRAVA_ORANGE }}
          activeDot={{ r: 5 }}
        />
      </LineChart>
    </ResponsiveContainer>
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
