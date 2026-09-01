import { reconcile, Reconciliation, WeekResult } from "./reconcile";
import { acwr, AcwrSignal, efficiencyTrend, EfficiencySignal } from "./signals";
import { CompletedActivity, PlanWeek, TrainingPlan } from "./types";

/**
 * Adaptation: closing the loop between what was prescribed and what happened.
 *
 * The governing principle is that the plan should follow the athlete, not the
 * other way around. A plan that keeps prescribing 50-mile weeks to someone
 * consistently running 35 isn't a plan, it's a wish — and the growing gap
 * quietly destroys the athlete's trust in every other recommendation it makes.
 *
 * So adjustments are anchored to *demonstrated* volume, then bounded: never a
 * huge swing from one week's evidence, and never a ramp beyond what the load
 * signals say is absorbable.
 */

/** Below this completion rate the plan is outrunning the athlete. */
const UNDER_COMPLETION = 0.7;
/** At or above this, with healthy load, the athlete has room for more. */
const STRONG_COMPLETION = 0.9;
/** Bounds on any single week's rescaling, so adaptation is never violent. */
const MIN_SCALE = 0.7;
const MAX_SCALE = 1.1;

export type Adjustment = {
  weekNumber: number;
  /** Multiplier applied to prescribed mileage. */
  milesScale: number;
  /** Multiplier applied to prescribed climbing. */
  elevationScale: number;
  reason: string;
};

export type CoachReview = {
  /** One-paragraph plain-language read on the block so far. */
  summary: string;
  working: string[];
  notWorking: string[];
  adjustments: Adjustment[];
  load: AcwrSignal;
  efficiency: EfficiencySignal | null;
  reconciliation: Reconciliation;
};

function completedWeeks(reconciliation: Reconciliation): WeekResult[] {
  return reconciliation.weeks.filter((week) => week.complete);
}

function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((total, value) => total + value, 0) / values.length;
}

/**
 * Reviews progress and proposes adjustments to the remaining weeks.
 *
 * Only the next two unfinished weeks are adjusted. Rewriting the whole block
 * on the strength of one bad fortnight overreacts to noise — illness, travel,
 * a heat wave — and discards periodization that is still sound.
 */
export function reviewPlan(
  plan: TrainingPlan,
  activities: CompletedActivity[],
  now: Date = new Date(),
): CoachReview {
  const reconciliation = reconcile(plan, activities, now);
  const load = acwr(activities, now);
  const efficiency = efficiencyTrend(activities, now);

  const done = completedWeeks(reconciliation);
  const recent = done.slice(-2);

  const working: string[] = [];
  const notWorking: string[] = [];
  const adjustments: Adjustment[] = [];

  if (done.length === 0) {
    return {
      summary:
        "The block hasn't completed a full week yet, so there's nothing to adapt from. Run the plan as written and check back after your first full week.",
      working,
      notWorking,
      adjustments,
      load,
      efficiency,
      reconciliation,
    };
  }

  const completion = mean(recent.map((week) => week.completionRate));
  const volumeRatio = mean(
    recent.map((week) => (week.plannedMiles > 0 ? week.actualMiles / week.plannedMiles : 1)),
  );
  const vertRatio = mean(
    recent.map((week) =>
      week.plannedElevationFeet > 0
        ? week.actualElevationFeet / week.plannedElevationFeet
        : 1,
    ),
  );

  // Long runs are the load-bearing session of an ultra build; treat them
  // separately rather than letting midweek volume mask a missed long day.
  const longResults = recent.flatMap((week) =>
    week.workouts.filter((w) => w.planned.type === "long" && w.status !== "upcoming"),
  );
  const longHit = longResults.filter(
    (w) => w.status === "completed" || w.status === "exceeded",
  ).length;
  const longMissed = longResults.length - longHit;

  const easyTooHard = recent
    .flatMap((week) => week.workouts)
    .flatMap((w) => w.flags)
    .filter((flag) => flag.includes("aerobic ceiling"));

  // --- Read the evidence -------------------------------------------------

  if (completion >= STRONG_COMPLETION) {
    working.push(
      `You completed ${Math.round(completion * 100)}% of prescribed sessions over the last ${recent.length} week${recent.length === 1 ? "" : "s"}.`,
    );
  }
  if (volumeRatio >= 0.95 && volumeRatio <= 1.1) {
    working.push(`Weekly volume is tracking the plan (${Math.round(volumeRatio * 100)}% of target).`);
  }
  if (longHit > 0 && longMissed === 0) {
    working.push(`Every long run landed — the session that matters most for a ${plan.race.distanceMiles}-mile race.`);
  }
  if (efficiency?.confident && efficiency.changePercent > 0) {
    working.push(efficiency.summary);
  }
  if (load.risk === "optimal") {
    working.push(load.summary);
  }

  if (completion < UNDER_COMPLETION) {
    notWorking.push(
      `Only ${Math.round(completion * 100)}% of sessions are getting done. The plan is prescribing more than your week actually holds.`,
    );
  }
  if (longMissed > 0) {
    notWorking.push(
      `${longMissed} long run${longMissed === 1 ? "" : "s"} missed. Midweek mileage doesn't substitute — the long run builds the durability this race demands.`,
    );
  }
  if (vertRatio < 0.7 && mean(recent.map((w) => w.plannedElevationFeet)) >= 1000) {
    notWorking.push(
      `Climbing is at ${Math.round(vertRatio * 100)}% of target. For ${plan.race.elevationGainFeet.toLocaleString()} ft of race vert, this is the gap most likely to cost you on race day.`,
    );
  }
  if (easyTooHard.length >= 2) {
    notWorking.push(
      `${easyTooHard.length} easy runs were above the aerobic ceiling. Running easy days too hard is why hard days stop producing.`,
    );
  }
  if (load.risk === "high" || load.risk === "caution") {
    notWorking.push(load.summary);
  }
  if (efficiency?.confident && efficiency.changePercent < 0) {
    notWorking.push(efficiency.summary);
  }

  // --- Decide the adjustment --------------------------------------------

  let scale = 1;
  let reason = "Plan is tracking; continuing as written.";

  if (load.risk === "high") {
    scale = 0.8;
    reason = "Load spiked well above your chronic base — cutting volume to let it settle before it becomes an injury.";
  } else if (completion < UNDER_COMPLETION) {
    // Re-anchor to what is actually being absorbed, with a floor so a single
    // disrupted week doesn't collapse the block.
    scale = Math.max(MIN_SCALE, volumeRatio);
    reason = `Rescaling to the volume you're actually completing (${Math.round(volumeRatio * 100)}% of plan) so the plan stays honest and achievable.`;
  } else if (load.risk === "caution") {
    scale = 0.95;
    reason = "Holding volume steady rather than ramping — load is already at the top of the productive range.";
  } else if (
    completion >= STRONG_COMPLETION &&
    (load.risk === "optimal" || load.risk === "detraining") &&
    !(efficiency?.confident && efficiency.changePercent < 0)
  ) {
    scale = 1.05;
    reason = "You're absorbing the work with load in a healthy range — adding a small amount of volume.";
  }

  scale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, scale));

  // Climbing is adjusted separately: a vert shortfall is usually a routing
  // problem, not a fitness one, so it gets nudged up even when mileage holds.
  let elevationScale = scale;
  if (vertRatio < 0.7 && scale >= 0.95 && load.risk !== "high") {
    elevationScale = Math.min(MAX_SCALE, scale * 1.1);
  }

  const upcoming = reconciliation.weeks
    .filter((week) => !week.complete && week.week.phase !== "race")
    .slice(0, 2);

  for (const week of upcoming) {
    if (scale === 1 && elevationScale === 1) continue;
    adjustments.push({
      weekNumber: week.week.weekNumber,
      milesScale: scale,
      elevationScale,
      reason,
    });
  }

  return {
    summary: summarize(plan, completion, volumeRatio, load, adjustments.length > 0 ? scale : 1),
    working,
    notWorking,
    adjustments,
    load,
    efficiency,
    reconciliation,
  };
}

function summarize(
  plan: TrainingPlan,
  completion: number,
  volumeRatio: number,
  load: AcwrSignal,
  scale: number,
): string {
  const weeksOut = plan.weeks.filter((week) => week.phase !== "race").length;
  const direction =
    scale > 1 ? "adding a little volume" : scale < 1 ? "pulling volume back" : "holding the plan as written";

  return [
    `You're completing ${Math.round(completion * 100)}% of sessions at ${Math.round(volumeRatio * 100)}% of prescribed volume, with ${weeksOut} week${weeksOut === 1 ? "" : "s"} of work before ${plan.race.name}.`,
    load.ratio === null ? load.summary : `${load.summary}`,
    `Next two weeks: ${direction}.`,
  ].join(" ");
}

/**
 * Returns a copy of the plan with adjustments applied. The original is left
 * untouched so the prescribed-vs-adjusted comparison stays available.
 */
export function applyAdjustments(
  plan: TrainingPlan,
  adjustments: Adjustment[],
): TrainingPlan {
  if (adjustments.length === 0) return plan;
  const byWeek = new Map(adjustments.map((a) => [a.weekNumber, a]));

  const weeks: PlanWeek[] = plan.weeks.map((week) => {
    const adjustment = byWeek.get(week.weekNumber);
    if (!adjustment) return week;

    const workouts = week.workouts.map((workout) => {
      if (workout.type === "race" || workout.type === "rest") return workout;
      return {
        ...workout,
        targetMiles: Math.round(workout.targetMiles * adjustment.milesScale * 10) / 10,
        targetElevationFeet: Math.round(
          workout.targetElevationFeet * adjustment.elevationScale,
        ),
      };
    });

    return {
      ...week,
      workouts,
      targetMiles:
        Math.round(workouts.reduce((total, w) => total + w.targetMiles, 0) * 10) / 10,
      targetElevationFeet: workouts.reduce(
        (total, w) => total + w.targetElevationFeet,
        0,
      ),
    };
  });

  return { ...plan, weeks };
}
