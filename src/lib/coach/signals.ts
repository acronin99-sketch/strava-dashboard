import { CompletedActivity } from "./types";
import { isRun } from "./reconcile";

/**
 * Objective training signals derived from completed work.
 *
 * These are deliberately conservative and few. It is easy to invent a dozen
 * plausible metrics from Strava data; it is hard to invent ones that survive
 * contact with noisy GPS, missing heart rate, and varied terrain. Each signal
 * here reports its own confidence so the adaptation engine can decline to act
 * on thin evidence.
 */

const METERS_PER_MILE = 1609.344;

/**
 * Session load in arbitrary units.
 *
 * Duration is the base, since time on feet drives adaptation more than
 * distance. Climbing is added at roughly a minute per 100 ft, the common trail
 * running equivalence, so a steep 6-miler isn't scored as easier than a flat
 * one just because it covered less ground.
 */
export function sessionLoad(activity: CompletedActivity): number {
  return activity.movingMinutes + activity.elevationFeet / 100;
}

export type LoadRisk = "detraining" | "optimal" | "caution" | "high";

export type AcwrSignal = {
  /** Load over the last 7 days. */
  acute: number;
  /** Average 7-day load over the last 28 days. */
  chronic: number;
  /** acute / chronic. Null until there is enough history to be meaningful. */
  ratio: number | null;
  risk: LoadRisk | null;
  summary: string;
};

/**
 * Acute:chronic workload ratio.
 *
 * Ramping acute load far beyond what the athlete is chronically prepared for
 * is one of the better-supported injury risk signals in endurance sport. The
 * usual sweet spot is ~0.8–1.3; above ~1.5 is where risk climbs sharply.
 *
 * Returns a null ratio when chronic load is too thin to divide by — early in a
 * plan, or after a layoff, the number is arithmetically huge and meaningless.
 */
export function acwr(
  activities: CompletedActivity[],
  now: Date = new Date(),
): AcwrSignal {
  const end = now.getTime();
  const day = 24 * 60 * 60 * 1000;

  let acute = 0;
  let chronicTotal = 0;
  /** Age of the oldest available run, in days. */
  let historyDays = 0;

  for (const activity of activities) {
    if (!isRun(activity)) continue;
    const age = end - new Date(activity.date).getTime();
    if (age < 0) continue;
    historyDays = Math.max(historyDays, age / day);
    const load = sessionLoad(activity);
    if (age <= 7 * day) acute += load;
    if (age <= 28 * day) chronicTotal += load;
  }

  // Divide by the history actually available rather than a nominal four weeks.
  // Two weeks of data divided by four manufactures a chronic baseline half its
  // true size and reports a ~2x "spike" for an athlete who has done nothing
  // wrong. Telling a healthy athlete to back off is worse than saying nothing.
  const chronicWeeks = Math.min(4, Math.max(historyDays / 7, 1));
  const chronic = chronicTotal / chronicWeeks;

  // Under three weeks there is no chronic base to compare against at all.
  if (historyDays < 21 || chronic < 30) {
    return {
      acute: Math.round(acute),
      chronic: Math.round(chronic),
      ratio: null,
      risk: null,
      summary:
        "Not enough training history to judge load ramp yet — this becomes meaningful after about four weeks of consistent work.",
    };
  }

  const ratio = acute / chronic;
  const risk: LoadRisk =
    ratio < 0.8 ? "detraining" : ratio <= 1.3 ? "optimal" : ratio <= 1.5 ? "caution" : "high";

  const summary = {
    detraining: `Load is ${ratio.toFixed(2)}x your 4-week average — you're coasting. Fine during a taper, a problem mid-build.`,
    optimal: `Load is ${ratio.toFixed(2)}x your 4-week average — a productive, absorbable ramp.`,
    caution: `Load is ${ratio.toFixed(2)}x your 4-week average — on the high side. Hold here rather than adding.`,
    high: `Load is ${ratio.toFixed(2)}x your 4-week average — a spike this size is where injuries cluster. Back off.`,
  }[risk];

  return { acute: Math.round(acute), chronic: Math.round(chronic), ratio, risk, summary };
}

export type EfficiencySignal = {
  /** Meters per minute per heartbeat, recent window. */
  recent: number;
  prior: number;
  /** Positive means improving aerobic efficiency. */
  changePercent: number;
  /** False when the sample is too small or too varied to trust. */
  confident: boolean;
  summary: string;
};

/**
 * Aerobic efficiency trend: speed produced per heartbeat.
 *
 * Rising means the same effort is buying more pace, the clearest sign a base
 * block is working. Falling can mean accumulated fatigue — or simply hillier
 * routes or hot weather, which is why this is reported with a confidence flag
 * and never acted on alone.
 */
export function efficiencyTrend(
  activities: CompletedActivity[],
  now: Date = new Date(),
): EfficiencySignal | null {
  const day = 24 * 60 * 60 * 1000;
  const end = now.getTime();

  const usable = activities.filter(
    (a) =>
      isRun(a) &&
      a.averageHeartrate !== null &&
      a.averageHeartrate > 0 &&
      a.movingMinutes > 10 &&
      a.miles > 0,
  );

  const ef = (a: CompletedActivity) =>
    (a.miles * METERS_PER_MILE) / a.movingMinutes / (a.averageHeartrate as number);

  const recentSet = usable.filter((a) => end - new Date(a.date).getTime() <= 14 * day);
  const priorSet = usable.filter((a) => {
    const age = end - new Date(a.date).getTime();
    return age > 14 * day && age <= 42 * day;
  });

  if (recentSet.length < 3 || priorSet.length < 3) return null;

  const recent = mean(recentSet.map(ef));
  const prior = mean(priorSet.map(ef));
  const changePercent = ((recent - prior) / prior) * 100;

  // Small samples on varied terrain swing several percent for no real reason.
  const confident = recentSet.length >= 5 && priorSet.length >= 5 && Math.abs(changePercent) >= 3;

  let summary: string;
  if (!confident) {
    summary = `Aerobic efficiency is roughly flat (${changePercent >= 0 ? "+" : ""}${changePercent.toFixed(1)}%) — within the noise of terrain and weather.`;
  } else if (changePercent > 0) {
    summary = `Aerobic efficiency is up ${changePercent.toFixed(1)}% over the last two weeks — you're producing more pace per heartbeat, which is the base block working.`;
  } else {
    summary = `Aerobic efficiency is down ${Math.abs(changePercent).toFixed(1)}% — often accumulated fatigue, though heat or hillier routes produce the same shape.`;
  }

  return { recent, prior, changePercent, confident, summary };
}

function mean(values: number[]): number {
  return values.reduce((total, value) => total + value, 0) / values.length;
}
