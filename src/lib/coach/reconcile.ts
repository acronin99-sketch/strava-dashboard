import { CompletedActivity, PlanWeek, PlannedWorkout, TrainingPlan } from "./types";

/**
 * Reconciliation: what was prescribed vs what actually happened.
 *
 * This is the layer that turns Strava from a scrapbook into coaching input.
 * It answers three questions the adaptation engine needs:
 *   1. Did the session happen at all?
 *   2. Was it the right size (distance and climbing)?
 *   3. Was it run at the right effort?
 *
 * Question 3 matters more than it looks. The most common failure mode in
 * self-coached endurance training is not missed workouts, it is easy days run
 * too hard, which quietly erodes the recovery that makes hard days possible.
 */

const RUN_SPORTS = new Set(["Run", "TrailRun", "VirtualRun"]);

export function isRun(activity: CompletedActivity): boolean {
  return RUN_SPORTS.has(activity.sport);
}

export type WorkoutStatus =
  | "completed"
  | "partial"
  | "exceeded"
  | "missed"
  | "upcoming";

/** Below this fraction of target the session did not do its job. */
const PARTIAL_THRESHOLD = 0.8;
/** Above this, the athlete went meaningfully beyond the prescription. */
const EXCEEDED_THRESHOLD = 1.15;

export type WorkoutResult = {
  planned: PlannedWorkout;
  activities: CompletedActivity[];
  actualMiles: number;
  actualElevationFeet: number;
  actualMinutes: number;
  /** Null when the workout prescribed no distance, or nothing was done. */
  milesRatio: number | null;
  elevationRatio: number | null;
  status: WorkoutStatus;
  /** Coaching observations, e.g. an easy day run at threshold. */
  flags: string[];
};

export type WeekResult = {
  week: PlanWeek;
  workouts: WorkoutResult[];
  plannedMiles: number;
  actualMiles: number;
  plannedElevationFeet: number;
  actualElevationFeet: number;
  /** Fraction of prescribed sessions completed or exceeded. 0–1. */
  completionRate: number;
  /** True once every day in the week is in the past. */
  complete: boolean;
};

export type Reconciliation = {
  weeks: WeekResult[];
  /** Runs that didn't line up with any prescribed session. */
  unplanned: CompletedActivity[];
};

function dateOf(activity: CompletedActivity): string {
  return activity.date.slice(0, 10);
}

/**
 * Detects an easy or long run carried out at obviously elevated effort.
 *
 * Pace alone can't do this — a hilly easy run is legitimately slow — so this
 * only fires when heart rate is available and clearly above the aerobic band.
 */
function intensityFlags(
  planned: PlannedWorkout,
  activities: CompletedActivity[],
  maxHeartrate: number | undefined,
): string[] {
  if (!maxHeartrate) return [];
  if (planned.intensity !== "easy") return [];

  const withHr = activities.filter((a) => a.averageHeartrate !== null);
  if (withHr.length === 0) return [];

  const weighted =
    withHr.reduce((total, a) => total + (a.averageHeartrate ?? 0) * a.movingMinutes, 0) /
    withHr.reduce((total, a) => total + a.movingMinutes, 0);

  // ~76% of max is a common upper bound for genuinely aerobic running.
  const ceiling = maxHeartrate * 0.76;
  if (weighted > ceiling) {
    return [
      `Ran at ${Math.round(weighted)} bpm on an easy day — above the ~${Math.round(ceiling)} bpm aerobic ceiling.`,
    ];
  }
  return [];
}

function statusFor(
  planned: PlannedWorkout,
  activities: CompletedActivity[],
  milesRatio: number | null,
  inFuture: boolean,
  isToday: boolean,
): WorkoutStatus {
  if (planned.type === "rest") {
    return activities.length > 0 ? "exceeded" : "completed";
  }
  if (inFuture) return "upcoming";
  // A day still in progress is neither done nor missed. Marking this morning's
  // run "missed" at breakfast is both wrong and the fastest way to teach the
  // athlete to distrust the whole readout.
  if (activities.length === 0) return isToday ? "upcoming" : "missed";
  if (milesRatio === null) return "completed";
  if (milesRatio < PARTIAL_THRESHOLD) return "partial";
  if (milesRatio > EXCEEDED_THRESHOLD) return "exceeded";
  return "completed";
}

/**
 * Matches activities to prescriptions by calendar date.
 *
 * Same-day runs are aggregated rather than competing for the slot, since a
 * deliberate double still satisfies the day's volume. Cross-training is left
 * unmatched on purpose: it is real training, but it does not substitute for a
 * prescribed run, and silently counting it would overstate adherence.
 */
export function reconcile(
  plan: TrainingPlan,
  activities: CompletedActivity[],
  now: Date = new Date(),
): Reconciliation {
  const today = now.toISOString().slice(0, 10);

  const runsByDate = new Map<string, CompletedActivity[]>();
  for (const activity of activities) {
    if (!isRun(activity)) continue;
    const key = dateOf(activity);
    const bucket = runsByDate.get(key) ?? [];
    bucket.push(activity);
    runsByDate.set(key, bucket);
  }

  const matched = new Set<string>();
  const weeks: WeekResult[] = [];

  for (const week of plan.weeks) {
    const results: WorkoutResult[] = [];

    for (const planned of week.workouts) {
      const dayActivities = runsByDate.get(planned.date) ?? [];
      // A rest day shouldn't consume the activity; leave it visible as
      // unplanned so extra volume is accounted for rather than hidden.
      if (planned.type !== "rest") {
        for (const activity of dayActivities) matched.add(activity.id);
      }

      const actualMiles = sum(dayActivities.map((a) => a.miles));
      const actualElevationFeet = sum(dayActivities.map((a) => a.elevationFeet));
      const actualMinutes = sum(dayActivities.map((a) => a.movingMinutes));
      const inFuture = planned.date > today;

      const milesRatio =
        planned.targetMiles > 0 ? actualMiles / planned.targetMiles : null;
      const elevationRatio =
        planned.targetElevationFeet > 0
          ? actualElevationFeet / planned.targetElevationFeet
          : null;

      const status = statusFor(
        planned,
        dayActivities,
        milesRatio,
        inFuture,
        planned.date === today,
      );

      const flags: string[] = [];
      if (!inFuture && dayActivities.length > 0) {
        flags.push(...intensityFlags(planned, dayActivities, plan.profile.maxHeartrate));
        if (
          elevationRatio !== null &&
          elevationRatio < 0.5 &&
          planned.targetElevationFeet >= 500
        ) {
          flags.push(
            `Only ${Math.round(actualElevationFeet).toLocaleString()} ft of the prescribed ${planned.targetElevationFeet.toLocaleString()} ft — the climbing stimulus was missed even though the mileage landed.`,
          );
        }
      }

      results.push({
        planned,
        activities: dayActivities,
        actualMiles: round(actualMiles),
        actualElevationFeet: Math.round(actualElevationFeet),
        actualMinutes: Math.round(actualMinutes),
        milesRatio,
        elevationRatio,
        status,
        flags,
      });
    }

    const prescribed = results.filter(
      (r) => r.planned.type !== "rest" && r.status !== "upcoming",
    );
    const satisfied = prescribed.filter(
      (r) => r.status === "completed" || r.status === "exceeded",
    );
    const lastDay = week.workouts[week.workouts.length - 1]?.date ?? week.startDate;

    weeks.push({
      week,
      workouts: results,
      plannedMiles: week.targetMiles,
      actualMiles: round(sum(results.map((r) => r.actualMiles))),
      plannedElevationFeet: week.targetElevationFeet,
      actualElevationFeet: Math.round(sum(results.map((r) => r.actualElevationFeet))),
      completionRate: prescribed.length === 0 ? 0 : satisfied.length / prescribed.length,
      complete: lastDay < today,
    });
  }

  const unplanned = activities.filter(
    (activity) => isRun(activity) && !matched.has(activity.id),
  );

  return { weeks, unplanned };
}

function sum(values: number[]): number {
  return values.reduce((total, value) => total + value, 0);
}

function round(value: number): number {
  return Math.round(value * 10) / 10;
}
