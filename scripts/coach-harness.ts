/**
 * Exercises the coaching engine end-to-end against a simulated 50k build.
 *
 * Run with:  npx tsx scripts/coach-harness.ts
 *
 * Uses a fixed clock so output is deterministic and invariants can be asserted
 * rather than eyeballed.
 */

import { generatePlan, peakLongRun } from "../src/lib/coach/plan";
import { reconcile } from "../src/lib/coach/reconcile";
import { acwr } from "../src/lib/coach/signals";
import { applyAdjustments, reviewPlan } from "../src/lib/coach/adapt";
import { AthleteProfile, CompletedActivity, RaceGoal } from "../src/lib/coach/types";

/** When the plan was created. */
const PLAN_START = new Date("2026-08-31T12:00:00Z");
/**
 * When the coach reviews it — two weeks in, so weeks 1 and 2 are genuinely in
 * the past and there is something to adapt from.
 */
const NOW = new Date("2026-09-14T12:00:00Z");

const race: RaceGoal = {
  name: "Bear Chase 50k",
  date: "2026-10-12",
  distanceMiles: 31,
  elevationGainFeet: 4200,
  terrain: "trail",
  goalTimeMinutes: 6 * 60,
};

const profile: AthleteProfile = {
  weeklyMiles: 28,
  longRunMiles: 10,
  weeklyElevationFeet: 1800,
  daysPerWeek: 5,
  longRunDay: 6, // Saturday
  easyPaceMinPerMile: 9.5,
  maxHeartrate: 185,
};

let failures = 0;
function check(label: string, condition: boolean, detail = "") {
  if (condition) {
    console.log(`  PASS  ${label}`);
  } else {
    failures++;
    console.log(`  FAIL  ${label}${detail ? ` — ${detail}` : ""}`);
  }
}

// ---------------------------------------------------------------------------
console.log("=".repeat(72));
console.log("PLAN GENERATION");
console.log("=".repeat(72));

const plan = generatePlan(race, profile, PLAN_START);

console.log(`\nRace: ${race.name} on ${race.date} — ${race.distanceMiles} mi / ${race.elevationGainFeet} ft`);
console.log(`Plan starts ${plan.startDate}, ${plan.weeks.length} weeks\n`);

for (const week of plan.weeks) {
  const tag = week.recovery ? "recovery" : week.phase;
  console.log(
    `Week ${String(week.weekNumber).padStart(2)}  ${week.startDate}  ${tag.padEnd(8)}  ` +
      `${String(week.targetMiles).padStart(5)} mi  ${String(week.targetElevationFeet).padStart(6)} ft`,
  );
}

console.log("\nWeek 3 detail:");
for (const workout of plan.weeks[2].workouts) {
  const day = new Date(workout.date + "T00:00:00Z").toLocaleDateString("en-US", {
    weekday: "short",
    timeZone: "UTC",
  });
  console.log(
    `  ${day} ${workout.date}  ${workout.type.padEnd(9)} ${String(workout.targetMiles).padStart(5)} mi  ` +
      `${String(workout.targetElevationFeet).padStart(5)} ft  ${workout.description}`,
  );
}

console.log("\nRationale:");
for (const note of plan.rationale) console.log(`  - ${note}`);

console.log("\nInvariants:");

const raceWeek = plan.weeks[plan.weeks.length - 1];
check("last week is race week", raceWeek.phase === "race");
check(
  "race day is on the race date",
  raceWeek.workouts.some((w) => w.type === "race" && w.date === race.date),
  raceWeek.workouts.filter((w) => w.type === "race").map((w) => w.date).join(","),
);

const longRuns = plan.weeks.flatMap((w) => w.workouts.filter((x) => x.type === "long"));
const maxLong = Math.max(...longRuns.map((w) => w.targetMiles));
check(
  `peak long run <= computed cap (${peakLongRun(race).toFixed(1)} mi)`,
  maxLong <= peakLongRun(race) + 0.5,
  `got ${maxLong}`,
);

const longDays = new Set(
  longRuns.map((w) => new Date(w.date + "T00:00:00Z").getUTCDay()),
);
check("every long run lands on the chosen day", longDays.size === 1 && longDays.has(profile.longRunDay), [...longDays].join(","));

// Compare successive *working* weeks. A down week deliberately dips and then
// rebounds, so including it would measure the rebound rather than the ramp.
const buildWeeks = plan.weeks.filter((w) => w.phase !== "taper" && w.phase !== "race" && !w.recovery);
let maxRamp = 0;
for (let i = 1; i < buildWeeks.length; i++) {
  maxRamp = Math.max(maxRamp, buildWeeks[i].targetMiles / buildWeeks[i - 1].targetMiles);
}
check("no working week ramps more than 8%", maxRamp <= 1.085, `max ramp ${maxRamp.toFixed(3)}`);

// The rebound out of a down week is the other place a spike can hide. Measuring
// it against the down week itself proves nothing — climbing from 70% back to
// 100% is a 1.43x jump by construction, and that is the entire point of a down
// week. The real question is whether the athlete returns to more work than they
// were already absorbing before the dip.
let maxRebound = 0;
for (let i = 1; i < plan.weeks.length; i++) {
  if (!plan.weeks[i - 1].recovery) continue;
  const lastWorking = plan.weeks
    .slice(0, i - 1)
    .filter((w) => !w.recovery && w.phase !== "taper" && w.phase !== "race")
    .at(-1);
  if (!lastWorking) continue;
  maxRebound = Math.max(maxRebound, plan.weeks[i].targetMiles / lastWorking.targetMiles);
}
check(
  "rebound out of a down week adds no more than 8% over the last working week",
  maxRebound <= 1.085,
  `max rebound ${maxRebound.toFixed(3)}`,
);

const taper = plan.weeks.filter((w) => w.phase === "taper");
check(
  "taper volume decreases into race week",
  taper.length === 0 || taper.every((w, i) => i === 0 || w.targetMiles <= taper[i - 1].targetMiles),
);

const peakVert = Math.max(...plan.weeks.map((w) => w.targetElevationFeet));
check(
  "peak weekly vert exceeds race vert",
  peakVert > race.elevationGainFeet,
  `${peakVert} vs ${race.elevationGainFeet}`,
);

const noBackToBackHard = plan.weeks.every((week) => {
  const hard = week.workouts.filter((w) => w.intensity === "hard").map((w) => w.date);
  return hard.every((date) => {
    const next = new Date(date + "T00:00:00Z");
    next.setUTCDate(next.getUTCDate() + 1);
    return !hard.includes(next.toISOString().slice(0, 10));
  });
});
check("no back-to-back hard days", noBackToBackHard);

// ---------------------------------------------------------------------------
console.log("\n" + "=".repeat(72));
console.log("LOAD SIGNAL (ACWR)");
console.log("=".repeat(72));

/**
 * Fabricates `weeks` of steady running ending at NOW, `perWeek` sessions a week,
 * with the final week scaled by `spike`.
 */
function steadyHistory(weeks: number, perWeek: number, spike = 1): CompletedActivity[] {
  const out: CompletedActivity[] = [];
  const day = 24 * 60 * 60 * 1000;
  let id = 1;
  for (let w = 0; w < weeks; w++) {
    for (let s = 0; s < perWeek; s++) {
      const ageDays = w * 7 + s + 1;
      const factor = ageDays <= 7 ? spike : 1;
      out.push({
        id: String(id++),
        date: new Date(NOW.getTime() - ageDays * day).toISOString(),
        name: "steady",
        sport: "Run",
        miles: 6 * factor,
        elevationFeet: 400 * factor,
        movingMinutes: 60 * factor,
        paceMinPerMile: 10,
        averageHeartrate: 140,
      });
    }
  }
  return out;
}

// The regression this guards: dividing a 28-day total by a nominal four weeks
// when only two weeks exist halves the chronic baseline and reports a phantom
// ~2x spike for an athlete who has done nothing wrong.
const thin = acwr(steadyHistory(2, 4), NOW);
console.log(`  2 weeks of history:  ratio=${thin.ratio ?? "n/a"}  ${thin.summary}`);
check("two weeks of history yields no ratio at all", thin.ratio === null);

const steady = acwr(steadyHistory(6, 4), NOW);
console.log(`  6 weeks steady:      ratio=${steady.ratio?.toFixed(2)}  risk=${steady.risk}`);
check(
  "steady training reads as optimal, not a spike",
  steady.risk === "optimal",
  `ratio ${steady.ratio?.toFixed(2)} risk ${steady.risk}`,
);

const spiked = acwr(steadyHistory(6, 4, 2.2), NOW);
console.log(`  6 weeks + 2.2x week: ratio=${spiked.ratio?.toFixed(2)}  risk=${spiked.risk}`);
check(
  "a genuine load spike is still caught",
  spiked.risk === "high",
  `ratio ${spiked.ratio?.toFixed(2)} risk ${spiked.risk}`,
);

// ---------------------------------------------------------------------------
console.log("\n" + "=".repeat(72));
console.log("RECONCILIATION — athlete under-completing, skipping vert");
console.log("=".repeat(72));

/** Fabricates runs at `factor` of prescription, dropping long runs entirely. */
function simulate(factor: number, skipLong: boolean, vertFactor: number): CompletedActivity[] {
  const out: CompletedActivity[] = [];
  let id = 1;
  for (const week of plan.weeks.slice(0, 2)) {
    for (const workout of week.workouts) {
      if (workout.type === "rest") continue;
      if (skipLong && workout.type === "long") continue;
      const miles = workout.targetMiles * factor;
      if (miles <= 0) continue;
      out.push({
        id: String(id++),
        date: `${workout.date}T08:00:00`,
        name: workout.description,
        sport: "TrailRun",
        miles,
        elevationFeet: workout.targetElevationFeet * vertFactor,
        movingMinutes: miles * 10,
        paceMinPerMile: 10,
        // Easy days deliberately run hot, to exercise the intensity flag.
        averageHeartrate: workout.intensity === "easy" ? 152 : 168,
      });
    }
  }
  return out;
}

const activities = simulate(0.75, true, 0.4);
const reconciliation = reconcile(plan, activities, NOW);

for (const week of reconciliation.weeks.slice(0, 2)) {
  console.log(
    `\nWeek ${week.week.weekNumber} (${week.week.startDate})  complete=${week.complete}\n` +
      `  miles ${week.actualMiles} / ${week.plannedMiles}   ` +
      `vert ${week.actualElevationFeet} / ${week.plannedElevationFeet}   ` +
      `completion ${Math.round(week.completionRate * 100)}%`,
  );
  for (const result of week.workouts.filter((r) => r.planned.type !== "rest")) {
    console.log(
      `    ${result.planned.date} ${result.planned.type.padEnd(9)} ${result.status.padEnd(9)} ` +
        `${result.actualMiles}/${result.planned.targetMiles} mi`,
    );
    for (const flag of result.flags) console.log(`        ! ${flag}`);
  }
}

console.log("\nInvariants:");
const week1 = reconciliation.weeks[0];
check("week 1 is marked complete (in the past)", week1.complete);
check(
  "missed long runs are detected",
  week1.workouts.some((w) => w.planned.type === "long" && w.status === "missed"),
);
check(
  "under-completion shows as partial",
  week1.workouts.some((w) => w.status === "partial"),
);
check(
  "vert shortfall is flagged",
  reconciliation.weeks
    .slice(0, 2)
    .some((w) => w.workouts.some((r) => r.flags.some((f) => f.includes("climbing stimulus")))),
);
check(
  "easy days run too hard are flagged",
  reconciliation.weeks
    .slice(0, 2)
    .some((w) => w.workouts.some((r) => r.flags.some((f) => f.includes("aerobic ceiling")))),
);

// A day that hasn't ended yet must not be graded. Reviewing mid-morning once
// showed the day's own run as "missed" before the athlete had left the house.
const midDay = new Date(`${plan.weeks[0].startDate}T09:00:00Z`);
const sameDay = reconcile(plan, [], midDay).weeks[0].workouts.filter(
  (r) => r.planned.date === plan.weeks[0].startDate && r.planned.type !== "rest",
);
check(
  "today's workout is not graded missed while the day is still running",
  sameDay.length > 0 && sameDay.every((r) => r.status === "upcoming"),
  sameDay.map((r) => r.status).join(","),
);
// ...but a day that has fully passed with nothing logged still counts against
// the athlete, otherwise the grace period would swallow every missed session.
const dayThree = plan.weeks[0].workouts[2].date;
const priorDays = reconcile(plan, [], new Date(`${dayThree}T09:00:00Z`))
  .weeks[0].workouts.filter(
    (r) => r.planned.date < dayThree && r.planned.type !== "rest",
  );
check(
  "a fully elapsed day with nothing logged is still graded missed",
  priorDays.length > 0 && priorDays.every((r) => r.status === "missed"),
  priorDays.map((r) => `${r.planned.date}:${r.status}`).join(" "),
);

// ---------------------------------------------------------------------------
console.log("\n" + "=".repeat(72));
console.log("COACH REVIEW + ADAPTATION");
console.log("=".repeat(72));

const review = reviewPlan(plan, activities, NOW);

console.log(`\nSummary:\n  ${review.summary}\n`);
console.log(`Load: ${review.load.summary}`);
console.log(`  acute=${review.load.acute} chronic=${review.load.chronic} ratio=${review.load.ratio?.toFixed(2) ?? "n/a"}\n`);

console.log("Working:");
for (const note of review.working) console.log(`  + ${note}`);
if (review.working.length === 0) console.log("  (nothing yet)");

console.log("\nNot working:");
for (const note of review.notWorking) console.log(`  - ${note}`);

console.log("\nAdjustments:");
for (const adjustment of review.adjustments) {
  console.log(
    `  Week ${adjustment.weekNumber}: miles x${adjustment.milesScale.toFixed(2)}  ` +
      `vert x${adjustment.elevationScale.toFixed(2)}\n    ${adjustment.reason}`,
  );
}

const adjusted = applyAdjustments(plan, review.adjustments);

console.log("\nBefore -> after:");
for (const adjustment of review.adjustments) {
  const before = plan.weeks.find((w) => w.weekNumber === adjustment.weekNumber)!;
  const after = adjusted.weeks.find((w) => w.weekNumber === adjustment.weekNumber)!;
  console.log(
    `  Week ${before.weekNumber}: ${before.targetMiles} mi -> ${after.targetMiles} mi   ` +
      `${before.targetElevationFeet} ft -> ${after.targetElevationFeet} ft`,
  );
}

console.log("\nInvariants:");
check("under-completion produced a downward adjustment", review.adjustments.length > 0 && review.adjustments[0].milesScale < 1);
check("missed long runs surfaced in notWorking", review.notWorking.some((n) => n.includes("long run")));
check("vert gap surfaced in notWorking", review.notWorking.some((n) => n.includes("Climbing")));
check(
  "adjustments never scale below the floor",
  review.adjustments.every((a) => a.milesScale >= 0.7),
);
check(
  "race week is never rescaled",
  !review.adjustments.some((a) => a.weekNumber === raceWeek.weekNumber),
);
const raceAfter = adjusted.weeks[adjusted.weeks.length - 1].workouts.find((w) => w.type === "race");
check("race distance is untouched by adaptation", raceAfter?.targetMiles === race.distanceMiles);

// --- A second scenario: athlete nailing it -------------------------------
console.log("\n" + "-".repeat(72));
console.log("Scenario: athlete completing everything, vert included");
console.log("-".repeat(72));

const strongReview = reviewPlan(plan, simulate(1.0, false, 1.0), NOW);
console.log(`  ${strongReview.summary}`);
for (const note of strongReview.working) console.log(`  + ${note}`);
const strongAdjustment = strongReview.adjustments[0];
console.log(
  strongAdjustment
    ? `  adjustment: miles x${strongAdjustment.milesScale.toFixed(2)} — ${strongAdjustment.reason}`
    : "  adjustment: none, plan continues as written",
);
check(
  "a compliant athlete is not told to cut volume",
  !strongAdjustment || strongAdjustment.milesScale >= 1,
  strongAdjustment ? `got x${strongAdjustment.milesScale.toFixed(2)}` : "",
);

console.log("\n" + "=".repeat(72));
console.log(failures === 0 ? "ALL CHECKS PASSED" : `${failures} CHECK(S) FAILED`);
console.log("=".repeat(72));
process.exit(failures === 0 ? 0 : 1);
