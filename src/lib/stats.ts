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

export type Totals = {
  count: number;
  miles: number;
  movingSeconds: number;
  elevationFeet: number;
};

export function totals(activities: StravaActivity[]): Totals {
  return activities.reduce<Totals>(
    (acc, activity) => ({
      count: acc.count + 1,
      miles: acc.miles + toMiles(activity.distance),
      movingSeconds: acc.movingSeconds + activity.moving_time,
      elevationFeet: acc.elevationFeet + toFeet(activity.total_elevation_gain),
    }),
    { count: 0, miles: 0, movingSeconds: 0, elevationFeet: 0 },
  );
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

export type PacePoint = {
  date: string;
  label: string;
  pace: number;
  miles: number;
  name: string;
};

/**
 * Pace trend for a single sport, oldest-first. Filtered to runs by default
 * since pace is only comparable within a sport.
 */
export function paceTrend(
  activities: StravaActivity[],
  sport = "Run",
  limit = 30,
): PacePoint[] {
  return activities
    .filter((activity) => (activity.sport_type || activity.type) === sport)
    .map((activity) => {
      const pace = paceMinPerMile(activity);
      if (pace === null) return null;
      const date = new Date(activity.start_date_local);
      return {
        date: activity.start_date_local,
        label: date.toLocaleDateString(undefined, {
          month: "short",
          day: "numeric",
        }),
        pace: Number(pace.toFixed(2)),
        miles: Number(toMiles(activity.distance).toFixed(1)),
        name: activity.name,
      };
    })
    .filter((point): point is PacePoint => point !== null)
    .slice(0, limit)
    .reverse();
}
