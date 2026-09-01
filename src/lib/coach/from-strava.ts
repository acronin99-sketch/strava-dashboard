import { paceMinPerMile, sportOf, toFeet, toMiles } from "../stats";
import { StravaActivity } from "../strava";
import { CompletedActivity } from "./types";

/**
 * Maps a Strava activity into the coaching domain.
 *
 * This is the only place the coaching engine touches a Strava-shaped object,
 * which keeps the training logic testable with plain fixtures and portable if
 * another data source is ever added.
 */
export function toCompletedActivity(activity: StravaActivity): CompletedActivity {
  return {
    id: String(activity.id),
    date: activity.start_date_local,
    name: activity.name,
    sport: sportOf(activity),
    miles: toMiles(activity.distance),
    elevationFeet: toFeet(activity.total_elevation_gain),
    movingMinutes: activity.moving_time / 60,
    paceMinPerMile: paceMinPerMile(activity),
    averageHeartrate: activity.average_heartrate ?? null,
  };
}

export function toCompletedActivities(
  activities: StravaActivity[],
): CompletedActivity[] {
  return activities.map(toCompletedActivity);
}
