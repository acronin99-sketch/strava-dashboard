import {
  AthleteProfile,
  Intensity,
  Phase,
  PlanWeek,
  PlannedWorkout,
  RaceGoal,
  TrainingPlan,
  WorkoutType,
} from "./types";

/**
 * Plan generation.
 *
 * The shape of the block follows mainstream endurance practice rather than
 * anything exotic, because the athlete-specific part comes from *reconciling*
 * the plan against real activities (see `adapt.ts`), not from a clever
 * template:
 *
 * - Progressive overload capped at `WEEKLY_RAMP`, which is below the folk "10%
 *   rule" because ultra volume compounds quickly.
 * - Every `RECOVERY_CADENCE`-th week is a deliberate down week. Adaptation
 *   happens during recovery, not during the work.
 * - Polarized intensity: most volume easy, with one or two quality sessions.
 * - A taper that cuts volume while retaining some intensity, so the athlete
 *   sheds fatigue without shedding sharpness.
 * - Vert is planned as its own progression. For a mountain 50k, weekly
 *   climbing is the variable that actually determines the outcome, and it is
 *   routinely under-trained relative to mileage.
 */

/** Max week-over-week volume growth. */
const WEEKLY_RAMP = 1.08;
/** Every Nth week is a down week. */
const RECOVERY_CADENCE = 4;
/** Down weeks run at this fraction of the preceding build week. */
const RECOVERY_FACTOR = 0.7;
/** Ceiling on total growth over the block, relative to starting volume. */
const MAX_BLOCK_GROWTH = 1.6;
/** Long run as a fraction of weekly volume. */
const LONG_RUN_SHARE = 0.33;

/** Fractions of peak volume during the taper, ordered by proximity to race. */
const TAPER_FACTORS = [0.4, 0.6];

// ---------------------------------------------------------------------------
// Dates
//
// All date maths is done at UTC midnight and formatted back to YYYY-MM-DD.
// Using local Date arithmetic here would drift across the DST boundary that
// falls inside most northern-hemisphere race builds.
// ---------------------------------------------------------------------------

export function parseISODate(iso: string): Date {
  const [year, month, day] = iso.slice(0, 10).split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

export function toISODate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

/** The Monday on or before `date`. */
export function mondayOf(date: Date): Date {
  const daysSinceMonday = (date.getUTCDay() + 6) % 7;
  return addDays(date, -daysSinceMonday);
}

function weeksBetween(start: Date, end: Date): number {
  const ms = end.getTime() - start.getTime();
  return Math.floor(ms / (7 * 24 * 60 * 60 * 1000));
}

// ---------------------------------------------------------------------------
// Progression targets
// ---------------------------------------------------------------------------

/**
 * Peak long run. Ultras are trained at a fraction of race distance — running
 * 31 miles in training to race 31 costs more in recovery than it returns in
 * fitness — while shorter races can rehearse most of the distance.
 */
export function peakLongRun(race: RaceGoal): number {
  if (race.distanceMiles <= 13.1) {
    return Math.min(race.distanceMiles * 1.1, 15);
  }
  if (race.distanceMiles <= 26.2) {
    return Math.min(race.distanceMiles * 0.8, 20);
  }
  return Math.min(race.distanceMiles * 0.65, 24);
}

/**
 * Peak weekly climbing. Training weeks should exceed race-day vert so the race
 * is not the biggest climbing day of the block.
 */
export function peakWeeklyVert(race: RaceGoal, profile: AthleteProfile): number {
  const raceDriven = race.elevationGainFeet * 1.15;
  const athleteDriven = Math.max(profile.weeklyElevationFeet, 500) * 1.8;
  return Math.max(raceDriven, athleteDriven);
}

function phaseFor(
  weekNumber: number,
  totalWeeks: number,
  taperWeeks: number,
): Phase {
  if (weekNumber === totalWeeks) return "race";
  const buildWeeks = totalWeeks - taperWeeks;
  if (weekNumber > buildWeeks) return "taper";
  if (weekNumber > buildWeeks * 0.66) return "peak";
  if (weekNumber > buildWeeks * 0.33) return "build";
  return "base";
}

const INTENSITY_OF: Record<WorkoutType, Intensity> = {
  rest: "rest",
  recovery: "easy",
  easy: "easy",
  long: "easy",
  tempo: "threshold",
  intervals: "hard",
  hills: "hard",
  race: "hard",
};

/**
 * Chooses the week's quality sessions. Trail and mountain races get hill work
 * in place of flat intervals, since climbing economy transfers to the course
 * and flat speed largely does not.
 */
function qualityTypes(phase: Phase, race: RaceGoal): WorkoutType[] {
  const climbing = race.terrain !== "road";
  if (phase === "base") return [climbing ? "hills" : "tempo"];
  if (phase === "taper" || phase === "race") return ["tempo"];
  return climbing ? ["hills", "tempo"] : ["tempo", "intervals"];
}

/**
 * Lays out one week. Days are assigned around the athlete's long run day so
 * quality sessions never land adjacent to it, which is the most common way a
 * self-made plan produces back-to-back hard days.
 */
function buildWeek(
  weekNumber: number,
  startDate: Date,
  phase: Phase,
  recovery: boolean,
  targetMiles: number,
  targetVert: number,
  longRunMiles: number,
  profile: AthleteProfile,
  race: RaceGoal,
): PlanWeek {
  const workouts: PlannedWorkout[] = [];

  // Offset of the long run from Monday.
  const longOffset = (profile.longRunDay + 6) % 7;
  const quality = recovery ? [] : qualityTypes(phase, race);

  // Space quality days as far from the long run as the week allows.
  const qualityOffsets = [
    (longOffset + 3) % 7,
    (longOffset + 5) % 7,
  ].slice(0, quality.length);

  // Remaining training days, nearest-to-long-run first, become easy runs.
  const used = new Set<number>([longOffset, ...qualityOffsets]);
  const easyOffsets: number[] = [];
  for (let offset = 0; offset < 7 && used.size + easyOffsets.length < profile.daysPerWeek; offset++) {
    if (!used.has(offset)) easyOffsets.push(offset);
  }

  const isRaceWeek = phase === "race";
  // The race lands on its actual date, which is frequently not the athlete's
  // usual long run day.
  const raceOffset = isRaceWeek
    ? Math.round(
        (parseISODate(race.date).getTime() - startDate.getTime()) /
          (24 * 60 * 60 * 1000),
      )
    : -1;

  // Vert concentrates on the long run and the hill session; a flat easy run
  // does nothing for climbing durability.
  const longVert = Math.round(targetVert * (quality.includes("hills") ? 0.55 : 0.75));
  const hillVert = Math.round(targetVert * 0.3);
  const easyVert =
    easyOffsets.length > 0
      ? Math.round((targetVert - longVert - (quality.includes("hills") ? hillVert : 0)) / easyOffsets.length)
      : 0;

  const qualityMiles = Math.max(3, Math.round(targetMiles * 0.15));
  const easyTotal = Math.max(
    0,
    targetMiles - longRunMiles - qualityMiles * quality.length,
  );
  const easyEach = easyOffsets.length > 0 ? easyTotal / easyOffsets.length : 0;

  for (let offset = 0; offset < 7; offset++) {
    const date = toISODate(addDays(startDate, offset));
    const id = `w${weekNumber}-d${offset}`;

    if (isRaceWeek) {
      if (offset === raceOffset) {
        workouts.push({
          id,
          date,
          type: "race",
          targetMiles: race.distanceMiles,
          targetElevationFeet: race.elevationGainFeet,
          intensity: "hard",
          description: `${race.name} — ${race.distanceMiles} mi, ${race.elevationGainFeet.toLocaleString()} ft`,
        });
        continue;
      }

      // Nothing after the race; recovery is the only useful prescription.
      // Before it, only short shakeouts to stay loose without adding fatigue.
      const isShakeoutDay = offset < raceOffset && offset % 2 === 0;
      workouts.push({
        id,
        date,
        type: isShakeoutDay ? "easy" : "rest",
        targetMiles: isShakeoutDay ? 3 : 0,
        targetElevationFeet: 0,
        intensity: isShakeoutDay ? "easy" : "rest",
        description: isShakeoutDay
          ? "3 mi shakeout — easy, legs turning over, nothing more"
          : offset > raceOffset
            ? "Rest — post-race recovery"
            : "Rest",
      });
      continue;
    }

    if (offset === longOffset) {
      workouts.push({
        id,
        date,
        type: "long",
        targetMiles: round(longRunMiles),
        targetElevationFeet: longVert,
        intensity: INTENSITY_OF.long,
        description: longRunDescription(longRunMiles, longVert, race),
      });
      continue;
    }

    const qualityIndex = qualityOffsets.indexOf(offset);
    if (qualityIndex !== -1) {
      const type = quality[qualityIndex];
      workouts.push({
        id,
        date,
        type,
        targetMiles: qualityMiles,
        targetElevationFeet: type === "hills" ? hillVert : 0,
        intensity: INTENSITY_OF[type],
        description: qualityDescription(type, qualityMiles, hillVert),
      });
      continue;
    }

    if (easyOffsets.includes(offset)) {
      const type: WorkoutType = recovery ? "recovery" : "easy";
      workouts.push({
        id,
        date,
        type,
        targetMiles: round(easyEach),
        targetElevationFeet: Math.max(0, easyVert),
        intensity: INTENSITY_OF[type],
        description: `${round(easyEach)} mi ${recovery ? "recovery" : "easy"} — conversational effort`,
      });
      continue;
    }

    workouts.push({
      id,
      date,
      type: "rest",
      targetMiles: 0,
      targetElevationFeet: 0,
      intensity: "rest",
      description: "Rest",
    });
  }

  return {
    weekNumber,
    startDate: toISODate(startDate),
    phase,
    recovery,
    targetMiles: round(sum(workouts.map((w) => w.targetMiles))),
    targetElevationFeet: Math.round(sum(workouts.map((w) => w.targetElevationFeet))),
    workouts,
  };
}

function longRunDescription(miles: number, vert: number, race: RaceGoal): string {
  const base = `${round(miles)} mi long run`;
  if (vert < 300) return `${base} — steady, conversational`;
  const terrain = race.terrain === "road" ? "rolling" : "on trail";
  return `${base} ${terrain} with ~${vert.toLocaleString()} ft of climbing — hike the steep pitches`;
}

function qualityDescription(
  type: WorkoutType,
  miles: number,
  hillVert: number,
): string {
  switch (type) {
    case "hills":
      return `${miles} mi with ~${hillVert.toLocaleString()} ft climbing — 5–8 x 3 min uphill hard, jog down`;
    case "tempo":
      return `${miles} mi including 20 min at threshold — comfortably hard, controlled`;
    case "intervals":
      return `${miles} mi including 6 x 3 min at 5k effort, 2 min jog recovery`;
    default:
      return `${miles} mi`;
  }
}

function sum(values: number[]): number {
  return values.reduce((total, value) => total + value, 0);
}

function round(value: number): number {
  return Math.round(value * 10) / 10;
}

/**
 * Builds a periodized plan from today (or `from`) through race day.
 *
 * Returns weeks starting on the Monday of the current week, so the athlete's
 * partially-completed current week is still reconciled rather than ignored.
 */
export function generatePlan(
  race: RaceGoal,
  profile: AthleteProfile,
  from: Date = new Date(),
): TrainingPlan {
  const raceDate = parseISODate(race.date);
  const startDate = mondayOf(parseISODate(toISODate(from)));
  const raceWeekStart = mondayOf(raceDate);

  const totalWeeks = Math.max(1, weeksBetween(startDate, raceWeekStart) + 1);
  const taperWeeks = totalWeeks >= 5 ? 2 : totalWeeks >= 3 ? 1 : 0;

  const baseMiles = Math.max(profile.weeklyMiles, 8);
  const baseLong = Math.max(profile.longRunMiles, 4);
  const baseVert = Math.max(profile.weeklyElevationFeet, 200);

  const targetLong = peakLongRun(race);
  const targetVert = peakWeeklyVert(race, profile);
  const ceilingMiles = baseMiles * MAX_BLOCK_GROWTH;

  const buildWeeks = totalWeeks - taperWeeks;
  const weeks: PlanWeek[] = [];

  // Volume, long run and vert each ramp independently: an athlete can be ready
  // for more climbing while still capped on mileage, and vice versa.
  let miles = baseMiles;
  let peakMiles = baseMiles;

  for (let weekNumber = 1; weekNumber <= totalWeeks; weekNumber++) {
    const weekStart = addDays(startDate, (weekNumber - 1) * 7);
    const phase = phaseFor(weekNumber, totalWeeks, taperWeeks);
    const isTaper = phase === "taper" || phase === "race";
    const recovery =
      !isTaper && weekNumber % RECOVERY_CADENCE === 0 && weekNumber < buildWeeks;

    // Fraction through the build, used to interpolate long run and vert.
    const progress = buildWeeks <= 1 ? 1 : Math.min(1, (weekNumber - 1) / (buildWeeks - 1));

    let weekMiles: number;
    let weekLong: number;
    let weekVert: number;

    if (isTaper) {
      const fromEnd = totalWeeks - weekNumber; // 0 on race week
      const factor = TAPER_FACTORS[Math.min(fromEnd, TAPER_FACTORS.length - 1)];
      weekMiles = peakMiles * factor;
      weekLong = Math.min(targetLong * factor * 1.2, weekMiles * LONG_RUN_SHARE * 1.4);
      weekVert = targetVert * factor * 0.6;
    } else {
      // Down weeks don't advance the ramp. Compounding through a recovery week
      // makes the following week jump by two weeks' growth at once, which is
      // exactly the spike the down week existed to prevent.
      if (weekNumber > 1 && !recovery) {
        miles = Math.min(miles * WEEKLY_RAMP, ceilingMiles);
      }
      weekMiles = recovery ? miles * RECOVERY_FACTOR : miles;
      peakMiles = Math.max(peakMiles, weekMiles);

      const longTarget = baseLong + (targetLong - baseLong) * progress;
      weekLong = recovery ? longTarget * RECOVERY_FACTOR : longTarget;
      // Never let the long run swallow the week.
      weekLong = Math.min(weekLong, weekMiles * LONG_RUN_SHARE * 1.5);

      const vertTarget = baseVert + (targetVert - baseVert) * progress;
      weekVert = recovery ? vertTarget * RECOVERY_FACTOR : vertTarget;
    }

    weeks.push(
      buildWeek(
        weekNumber,
        weekStart,
        phase,
        recovery,
        weekMiles,
        weekVert,
        weekLong,
        profile,
        race,
      ),
    );
  }

  return {
    race,
    profile,
    startDate: toISODate(startDate),
    weeks,
    rationale: rationaleFor(race, profile, totalWeeks, taperWeeks, targetLong, targetVert),
  };
}

function rationaleFor(
  race: RaceGoal,
  profile: AthleteProfile,
  totalWeeks: number,
  taperWeeks: number,
  targetLong: number,
  targetVert: number,
): string[] {
  const notes = [
    `${totalWeeks} week${totalWeeks === 1 ? "" : "s"} to ${race.name}, including a ${taperWeeks}-week taper.`,
    `Volume ramps at most ${Math.round((WEEKLY_RAMP - 1) * 100)}% per week from your current ${profile.weeklyMiles} mi/wk, with a down week every ${RECOVERY_CADENCE}th week.`,
    `Long run builds toward ${Math.round(targetLong)} mi — about ${Math.round((targetLong / race.distanceMiles) * 100)}% of race distance, which is where the return on a long effort starts to flatten for this distance.`,
  ];

  if (race.elevationGainFeet > 1000) {
    notes.push(
      `Climbing is planned separately and peaks near ${Math.round(targetVert).toLocaleString()} ft/wk, above the race's ${race.elevationGainFeet.toLocaleString()} ft, so race day isn't your biggest climbing day.`,
    );
  }

  if (totalWeeks < 8) {
    notes.push(
      `This is a short runway. The plan holds volume growth conservative and leans on specificity — vert and time on feet — rather than chasing mileage you can't absorb before race day.`,
    );
  }

  if (profile.daysPerWeek <= 4) {
    notes.push(
      `On ${profile.daysPerWeek} days/week every session has a job, so easy days stay genuinely easy to protect the two that matter.`,
    );
  }

  return notes;
}
