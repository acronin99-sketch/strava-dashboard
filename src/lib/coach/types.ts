/**
 * Domain types for the coaching engine.
 *
 * Deliberately free of Strava, database, and LLM concerns: a plan is generated
 * from a goal race plus an athlete profile, and is then *reconciled* against
 * whatever activities actually happened. Keeping this layer pure means the
 * training logic can be tested without network, storage, or model calls.
 *
 * Units follow the rest of the app: miles, feet, and minutes-per-mile.
 */

/** Terrain drives how much vert and hiking the plan prescribes. */
export type Terrain = "road" | "trail" | "mountain";

export type RaceGoal = {
  name: string;
  /** ISO date (YYYY-MM-DD) of the race, in the athlete's local time. */
  date: string;
  distanceMiles: number;
  elevationGainFeet: number;
  terrain: Terrain;
  /**
   * Target finish time in minutes. Optional — plenty of ultra runners enter a
   * first 50k to finish, and a pace target would be noise rather than signal.
   */
  goalTimeMinutes?: number;
};

/**
 * What the athlete brings to the plan. `weeklyMiles` and `longRunMiles` are the
 * anchors for progression: the plan builds from where they actually are, not
 * from an idealized template.
 */
export type AthleteProfile = {
  /** Recent typical weekly volume, in miles. */
  weeklyMiles: number;
  /** Longest run in the last month, in miles. */
  longRunMiles: number;
  /** Recent typical weekly climbing, in feet. */
  weeklyElevationFeet: number;
  /** How many days per week they can train. 3–7. */
  daysPerWeek: number;
  /** 0 = Sunday … 6 = Saturday. The day the long run lands on. */
  longRunDay: number;
  /**
   * Comfortable conversational pace, min/mile. Used as the anchor for every
   * other prescribed pace, since easy pace is the one an athlete can report
   * reliably without a recent test effort.
   */
  easyPaceMinPerMile?: number;
  maxHeartrate?: number;
};

/**
 * Workout intent. Intensity is expressed as intent rather than a fixed pace so
 * the same plan works for an athlete training by feel, by pace, or by HR.
 */
export type WorkoutType =
  | "rest"
  | "recovery"
  | "easy"
  | "long"
  | "tempo"
  | "intervals"
  | "hills"
  | "race";

/** Where a week sits in the periodization arc. */
export type Phase = "base" | "build" | "peak" | "taper" | "race";

export type PlannedWorkout = {
  id: string;
  /** ISO date (YYYY-MM-DD). */
  date: string;
  type: WorkoutType;
  /** Zero for rest days. */
  targetMiles: number;
  targetElevationFeet: number;
  /** Prescribed effort, used to grade whether intensity was respected. */
  intensity: Intensity;
  /** Human-readable prescription, e.g. "6 mi easy + 4 x 3 min uphill hard". */
  description: string;
};

/**
 * Effort bands, roughly the polarized model: `easy` below the aerobic
 * threshold, `threshold` at roughly one-hour race effort, `hard` above it.
 */
export type Intensity = "rest" | "easy" | "moderate" | "threshold" | "hard";

export type PlanWeek = {
  /** 1-based, counting from the first week of the plan. */
  weekNumber: number;
  /** ISO date of the Monday that starts this week. */
  startDate: string;
  phase: Phase;
  /** True for a deliberate down week. */
  recovery: boolean;
  targetMiles: number;
  targetElevationFeet: number;
  workouts: PlannedWorkout[];
};

export type TrainingPlan = {
  race: RaceGoal;
  profile: AthleteProfile;
  /** ISO date of the Monday the plan starts. */
  startDate: string;
  weeks: PlanWeek[];
  /** Notes explaining the shape of the plan, surfaced to the athlete. */
  rationale: string[];
};

/**
 * A completed effort, reduced to the fields the coach reasons about. Mapping
 * from `StravaActivity` happens at the edge so this layer stays portable.
 */
export type CompletedActivity = {
  id: string;
  /** ISO datetime, local. */
  date: string;
  name: string;
  /** Normalized sport, e.g. "Run" | "TrailRun" | "Ride". */
  sport: string;
  miles: number;
  elevationFeet: number;
  movingMinutes: number;
  /** Minutes per mile. Null when the activity covered no distance. */
  paceMinPerMile: number | null;
  averageHeartrate: number | null;
};
