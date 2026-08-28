import { StravaActivity } from "./strava";

export const METERS_PER_MILE = 1609.344;
export const FEET_PER_METER = 3.28084;

export function toMiles(meters: number): number {
  return meters / METERS_PER_MILE;
}

export function toFeet(meters: number): number {
  return meters * FEET_PER_METER;
}

/** Formats seconds as `H:MM:SS`, or `M:SS` when under an hour. */
export function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  }
  return `${minutes}:${String(secs).padStart(2, "0")}`;
}

/** Minutes per mile. Returns null when the activity covered no distance. */
export function paceMinPerMile(activity: StravaActivity): number | null {
  const miles = toMiles(activity.distance);
  if (miles <= 0) return null;
  return activity.moving_time / 60 / miles;
}

export function formatPace(minPerMile: number | null): string {
  if (minPerMile === null || !Number.isFinite(minPerMile)) return "—";
  const minutes = Math.floor(minPerMile);
  const seconds = Math.round((minPerMile - minutes) * 60);
  // Rounding can push seconds to 60; roll it into the minutes.
  if (seconds === 60) return `${minutes + 1}:00`;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

export type SportGroup = "all" | "run" | "ride";

const RUN_TYPES = new Set(["Run", "TrailRun", "VirtualRun"]);
const RIDE_TYPES = new Set([
  "Ride",
  "GravelRide",
  "MountainBikeRide",
  "VirtualRide",
  "EBikeRide",
  "Handcycle",
  "Velomobile",
]);

export function sportOf(activity: StravaActivity): string {
  return activity.sport_type || activity.type || "Other";
}

export function filterSport(
  activities: StravaActivity[],
  group: SportGroup,
): StravaActivity[] {
  if (group === "all") return activities;
  const types = group === "run" ? RUN_TYPES : RIDE_TYPES;
  return activities.filter((activity) => types.has(sportOf(activity)));
}

/**
 * Normalized power when a real power meter was used, else null. Strava
 * estimates watts from speed for rides without one, which isn't comparable
 * across activities, so those are excluded.
 */
export function wattsOf(activity: StravaActivity): number | null {
  if (!activity.device_watts) return null;
  return activity.weighted_average_watts ?? activity.average_watts ?? null;
}

export type Totals = {
  count: number;
  miles: number;
  movingSeconds: number;
  elevationFeet: number;
  /** Time-weighted, over activities that recorded it. Null when none did. */
  avgHeartrate: number | null;
  avgWatts: number | null;
};

export function totals(activities: StravaActivity[]): Totals {
  let miles = 0;
  let movingSeconds = 0;
  let elevationFeet = 0;
  let hrSeconds = 0;
  let hrWeighted = 0;
  let wattSeconds = 0;
  let wattWeighted = 0;

  for (const activity of activities) {
    miles += toMiles(activity.distance);
    movingSeconds += activity.moving_time;
    elevationFeet += toFeet(activity.total_elevation_gain);

    if (activity.average_heartrate) {
      hrSeconds += activity.moving_time;
      hrWeighted += activity.average_heartrate * activity.moving_time;
    }
    const watts = wattsOf(activity);
    if (watts !== null) {
      wattSeconds += activity.moving_time;
      wattWeighted += watts * activity.moving_time;
    }
  }

  return {
    count: activities.length,
    miles,
    movingSeconds,
    elevationFeet,
    avgHeartrate: hrSeconds > 0 ? hrWeighted / hrSeconds : null,
    avgWatts: wattSeconds > 0 ? wattWeighted / wattSeconds : null,
  };
}

/** Monday-start week key, derived from the activity's local start date. */
function weekStart(date: Date): Date {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const daysSinceMonday = (start.getDay() + 6) % 7;
  start.setDate(start.getDate() - daysSinceMonday);
  return start;
}

export type WeeklyPoint = {
  week: string;
  label: string;
  miles: number;
  elevationFeet: number;
  movingHours: number;
  count: number;
};

/**
 * Buckets activities into the trailing `weeks` Monday-start weeks, including
 * empty weeks so gaps in training show up as zeroes rather than being skipped.
 */
export function weeklyTotals(
  activities: StravaActivity[],
  weeks = 12,
): WeeklyPoint[] {
  const buckets = new Map<string, WeeklyPoint>();
  const currentWeek = weekStart(new Date());

  for (let i = weeks - 1; i >= 0; i--) {
    const start = new Date(currentWeek);
    start.setDate(start.getDate() - i * 7);
    const key = start.toISOString().slice(0, 10);
    buckets.set(key, {
      week: key,
      label: start.toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
      }),
      miles: 0,
      elevationFeet: 0,
      movingHours: 0,
      count: 0,
    });
  }

  for (const activity of activities) {
    const key = weekStart(new Date(activity.start_date_local))
      .toISOString()
      .slice(0, 10);
    const bucket = buckets.get(key);
    if (!bucket) continue; // Older than the window we're charting.
    bucket.miles += toMiles(activity.distance);
    bucket.elevationFeet += toFeet(activity.total_elevation_gain);
    bucket.movingHours += activity.moving_time / 3600;
    bucket.count += 1;
  }

  return [...buckets.values()].map((bucket) => ({
    ...bucket,
    miles: Number(bucket.miles.toFixed(1)),
    elevationFeet: Math.round(bucket.elevationFeet),
    movingHours: Number(bucket.movingHours.toFixed(1)),
  }));
}

export type SportBreakdown = {
  sport: string;
  count: number;
  miles: number;
};

export function bySport(activities: StravaActivity[]): SportBreakdown[] {
  const buckets = new Map<string, SportBreakdown>();
  for (const activity of activities) {
    const sport = activity.sport_type || activity.type || "Other";
    const bucket = buckets.get(sport) ?? { sport, count: 0, miles: 0 };
    bucket.count += 1;
    bucket.miles += toMiles(activity.distance);
    buckets.set(sport, bucket);
  }
  return [...buckets.values()]
    .map((bucket) => ({ ...bucket, miles: Number(bucket.miles.toFixed(1)) }))
    .sort((a, b) => b.miles - a.miles);
}

export function mphOf(activity: StravaActivity): number | null {
  if (activity.moving_time <= 0) return null;
  return toMiles(activity.distance) / (activity.moving_time / 3600);
}

/**
 * Aerobic efficiency: meters covered per minute, per heartbeat. Comparing the
 * same athlete over time, a rising value means more speed for the same effort.
 */
export function efficiencyFactor(activity: StravaActivity): number | null {
  if (!activity.average_heartrate || activity.moving_time <= 0) return null;
  const metersPerMinute = activity.distance / (activity.moving_time / 60);
  return metersPerMinute / activity.average_heartrate;
}

export type TrendPoint = {
  date: string;
  label: string;
  name: string;
  miles: number;
  /** Minutes per mile. */
  pace: number | null;
  mph: number | null;
  heartrate: number | null;
  /** Normalized power, power-meter rides only. */
  watts: number | null;
  efficiency: number | null;
};

/**
 * Per-activity trend series, oldest-first. Callers filter by sport first, since
 * pace and power are only comparable within a sport.
 */
export function activityTrend(
  activities: StravaActivity[],
  limit = 30,
): TrendPoint[] {
  return activities
    .slice(0, limit)
    .map((activity) => {
      const pace = paceMinPerMile(activity);
      const mph = mphOf(activity);
      const efficiency = efficiencyFactor(activity);
      return {
        date: activity.start_date_local,
        label: new Date(activity.start_date_local).toLocaleDateString(
          undefined,
          { month: "short", day: "numeric" },
        ),
        name: activity.name,
        miles: Number(toMiles(activity.distance).toFixed(1)),
        pace: pace === null ? null : Number(pace.toFixed(2)),
        mph: mph === null ? null : Number(mph.toFixed(1)),
        heartrate: activity.average_heartrate
          ? Math.round(activity.average_heartrate)
          : null,
        watts: wattsOf(activity),
        efficiency:
          efficiency === null ? null : Number(efficiency.toFixed(3)),
      };
    })
    .reverse();
}

/** True when at least one point in the series has a value for `key`. */
export function hasMetric(
  points: TrendPoint[],
  key: "pace" | "mph" | "heartrate" | "watts" | "efficiency",
): boolean {
  return points.some((point) => point[key] !== null);
}
