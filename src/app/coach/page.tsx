import Link from "next/link";
import { readSession } from "@/lib/session";
import { fetchActivities } from "@/lib/strava";
import { toCompletedActivities } from "@/lib/coach/from-strava";
import { generatePlan, parseISODate } from "@/lib/coach/plan";
import { applyAdjustments, reviewPlan } from "@/lib/coach/adapt";
import { readStoredPlan } from "@/lib/coach/store";
import { WorkoutStatus } from "@/lib/coach/reconcile";
import { Phase } from "@/lib/coach/types";
import { createPlan, deletePlan } from "./actions";

const DAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

const PHASE_LABEL: Record<Phase, string> = {
  base: "Base",
  build: "Build",
  peak: "Peak",
  taper: "Taper",
  race: "Race",
};

/**
 * Whole days from now until an ISO date. Reading the clock lives here rather
 * than in the component body: the render-purity rule rightly forbids calling
 * `Date.now` mid-render, and this page is rendered per-request on the server
 * where a single clock read is exactly what's wanted.
 */
function daysUntil(isoDate: string): number {
  return Math.ceil(
    (parseISODate(isoDate).getTime() - Date.now()) / (24 * 60 * 60 * 1000),
  );
}

const STATUS_STYLE: Record<WorkoutStatus, string> = {
  completed: "text-emerald-400",
  exceeded: "text-sky-400",
  partial: "text-amber-400",
  missed: "text-red-400",
  upcoming: "text-zinc-600",
};

function Card({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-5">
      <header className="mb-4">
        <h2 className="text-sm font-semibold text-zinc-200">{title}</h2>
        {subtitle && <p className="text-xs text-zinc-500">{subtitle}</p>}
      </header>
      {children}
    </section>
  );
}

function Field({
  label,
  name,
  type = "number",
  defaultValue,
  hint,
  required = true,
  step,
}: {
  label: string;
  name: string;
  type?: string;
  defaultValue?: string | number;
  hint?: string;
  required?: boolean;
  step?: string;
}) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-zinc-400">{label}</span>
      <input
        name={name}
        type={type}
        step={step}
        defaultValue={defaultValue}
        required={required}
        className="mt-1 w-full rounded-lg border border-zinc-800 bg-zinc-900/60 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-zinc-600"
      />
      {hint && <span className="mt-1 block text-xs text-zinc-600">{hint}</span>}
    </label>
  );
}

function SetupForm() {
  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-10">
      <h1 className="text-2xl font-bold tracking-tight">Build your plan</h1>
      <p className="mt-2 max-w-xl text-sm leading-relaxed text-zinc-400">
        The plan is built from where you are now, not an idealized template — so
        answer with what you have actually been running, not what you wish you
        were. Every week is then checked against your Strava activities and
        adjusted from there.
      </p>

      <form action={createPlan} className="mt-8 space-y-8">
        <Card title="The race" subtitle="What you're training for">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Race name" name="name" type="text" defaultValue="" />
            <Field label="Race date" name="date" type="date" />
            <Field
              label="Distance (miles)"
              name="distanceMiles"
              defaultValue={31}
              step="0.1"
            />
            <Field
              label="Elevation gain (feet)"
              name="elevationGainFeet"
              defaultValue={4000}
            />
            <label className="block">
              <span className="text-xs font-medium text-zinc-400">Terrain</span>
              <select
                name="terrain"
                defaultValue="trail"
                className="mt-1 w-full rounded-lg border border-zinc-800 bg-zinc-900/60 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-zinc-600"
              >
                <option value="road">Road</option>
                <option value="trail">Trail</option>
                <option value="mountain">Mountain</option>
              </select>
              <span className="mt-1 block text-xs text-zinc-600">
                Trail and mountain swap track intervals for hill work.
              </span>
            </label>
            <Field
              label="Goal time (hours)"
              name="goalHours"
              defaultValue=""
              required={false}
              step="0.25"
              hint="Optional. Leave blank if the goal is to finish."
            />
          </div>
        </Card>

        <Card title="Where you are now" subtitle="Your recent, honest baseline">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Typical weekly miles"
              name="weeklyMiles"
              defaultValue={25}
              step="0.1"
            />
            <Field
              label="Longest recent run (miles)"
              name="longRunMiles"
              defaultValue={10}
              step="0.1"
            />
            <Field
              label="Typical weekly vert (feet)"
              name="weeklyElevationFeet"
              defaultValue={1500}
            />
            <Field
              label="Training days per week"
              name="daysPerWeek"
              defaultValue={5}
              hint="3 to 7."
            />
            <label className="block">
              <span className="text-xs font-medium text-zinc-400">
                Long run day
              </span>
              <select
                name="longRunDay"
                defaultValue={6}
                className="mt-1 w-full rounded-lg border border-zinc-800 bg-zinc-900/60 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-zinc-600"
              >
                {DAY_NAMES.map((day, index) => (
                  <option key={day} value={index}>
                    {day}
                  </option>
                ))}
              </select>
            </label>
            <Field
              label="Easy pace (min/mile)"
              name="easyPaceMinPerMile"
              defaultValue=""
              required={false}
              step="0.1"
              hint="Optional. Conversational effort."
            />
            <Field
              label="Max heart rate"
              name="maxHeartrate"
              defaultValue=""
              required={false}
              hint="Optional. Enables the easy-days-too-hard check."
            />
          </div>
        </Card>

        <button
          type="submit"
          className="rounded-lg bg-[#fc4c02] px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#e34402]"
        >
          Build my plan
        </button>
      </form>
    </main>
  );
}

export default async function Coach() {
  const session = await readSession();
  if (!session) {
    return (
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-6 py-16">
        <h1 className="text-2xl font-bold tracking-tight">Coach</h1>
        <p className="mt-3 text-sm leading-relaxed text-zinc-400">
          The coach reads your Strava activities to see which sessions actually
          happened, so it needs a connected account before it can plan anything.
        </p>
        <a
          href="/api/auth/login"
          className="mt-8 inline-flex items-center justify-center rounded-lg bg-[#fc4c02] px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#e34402]"
        >
          Connect with Strava
        </a>
      </main>
    );
  }

  const stored = await readStoredPlan();
  if (!stored) return <SetupForm />;

  const plan = generatePlan(
    stored.race,
    stored.profile,
    parseISODate(stored.startDate),
  );

  let activities;
  try {
    activities = await fetchActivities(session);
  } catch (err) {
    return (
      <main className="mx-auto w-full max-w-md flex-1 px-6 py-16">
        <h1 className="text-xl font-semibold">Could not reach Strava</h1>
        <p className="mt-3 text-sm text-zinc-400">
          {err instanceof Error ? err.message : "Unknown error"}
        </p>
      </main>
    );
  }

  const review = reviewPlan(plan, toCompletedActivities(activities));
  const adjusted = applyAdjustments(plan, review.adjustments);
  const adjustedByWeek = new Map(adjusted.weeks.map((w) => [w.weekNumber, w]));
  const adjustedWeeks = new Set(review.adjustments.map((a) => a.weekNumber));

  const daysOut = daysUntil(plan.race.date);

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-10">
      <header className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-wide text-zinc-500">
            {PHASE_LABEL[plan.weeks[0]?.phase ?? "base"]} through race day
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight">
            {plan.race.name}
          </h1>
          <p className="mt-1 text-sm text-zinc-400">
            {new Date(plan.race.date + "T00:00:00").toLocaleDateString(
              undefined,
              { month: "long", day: "numeric", year: "numeric" },
            )}
            {" · "}
            {plan.race.distanceMiles} mi ·{" "}
            {plan.race.elevationGainFeet.toLocaleString()} ft ·{" "}
            {plan.race.terrain}
            {daysOut >= 0 && ` · ${daysOut} days out`}
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/"
            className="rounded-lg border border-zinc-800 px-3 py-1.5 text-xs text-zinc-400 transition-colors hover:bg-zinc-900 hover:text-zinc-200"
          >
            Dashboard
          </Link>
          <form action={deletePlan}>
            <button
              type="submit"
              className="rounded-lg border border-zinc-800 px-3 py-1.5 text-xs text-zinc-400 transition-colors hover:bg-zinc-900 hover:text-zinc-200"
            >
              Start over
            </button>
          </form>
        </div>
      </header>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card title="Coach read" subtitle="Updated from your Strava activity">
            <p className="text-sm leading-relaxed text-zinc-300">
              {review.summary}
            </p>

            {review.working.length > 0 && (
              <div className="mt-5">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-emerald-400">
                  Working
                </h3>
                <ul className="mt-2 space-y-1.5">
                  {review.working.map((item) => (
                    <li key={item} className="text-sm text-zinc-400">
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {review.notWorking.length > 0 && (
              <div className="mt-5">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-amber-400">
                  Needs attention
                </h3>
                <ul className="mt-2 space-y-1.5">
                  {review.notWorking.map((item) => (
                    <li key={item} className="text-sm text-zinc-400">
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {review.adjustments.length > 0 && (
              <div className="mt-5 rounded-lg border border-zinc-800 bg-zinc-900/40 p-4">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-300">
                  Adjustments applied
                </h3>
                <p className="mt-2 text-sm text-zinc-400">
                  {review.adjustments[0].reason}
                </p>
                <ul className="mt-3 space-y-1">
                  {review.adjustments.map((adjustment) => {
                    const before = plan.weeks.find(
                      (w) => w.weekNumber === adjustment.weekNumber,
                    );
                    const after = adjustedByWeek.get(adjustment.weekNumber);
                    if (!before || !after) return null;
                    return (
                      <li
                        key={adjustment.weekNumber}
                        className="text-sm tabular-nums text-zinc-500"
                      >
                        Week {adjustment.weekNumber}: {before.targetMiles} →{" "}
                        <span className="text-zinc-300">
                          {after.targetMiles} mi
                        </span>
                        {" · "}
                        {before.targetElevationFeet.toLocaleString()} →{" "}
                        <span className="text-zinc-300">
                          {after.targetElevationFeet.toLocaleString()} ft
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
          </Card>
        </div>

        <div className="space-y-4">
          <Card title="Training load" subtitle="Acute vs chronic workload">
            <div className="text-3xl font-semibold tabular-nums text-zinc-50">
              {review.load.ratio === null
                ? "—"
                : review.load.ratio.toFixed(2) + "x"}
            </div>
            <p className="mt-2 text-sm leading-relaxed text-zinc-400">
              {review.load.summary}
            </p>
          </Card>

          {review.efficiency && (
            <Card
              title="Aerobic efficiency"
              subtitle="Speed produced per heartbeat"
            >
              <div className="text-3xl font-semibold tabular-nums text-zinc-50">
                {review.efficiency.changePercent >= 0 ? "+" : ""}
                {review.efficiency.changePercent.toFixed(1)}%
              </div>
              <p className="mt-2 text-sm leading-relaxed text-zinc-400">
                {review.efficiency.summary}
              </p>
            </Card>
          )}
        </div>
      </div>

      <div className="mt-4">
        <Card title="The plan" subtitle="Prescribed vs actual, week by week">
          <div className="space-y-6">
            {review.reconciliation.weeks.map((result) => {
              const week = adjustedByWeek.get(result.week.weekNumber) ?? result.week;
              // The same observation often fires on several days of a week —
              // four identical "easy day run too hard" lines is nagging, not
              // coaching. Collapse to one line with a count.
              const flagCounts = new Map<string, number>();
              for (const flag of result.workouts.flatMap((w) => w.flags)) {
                flagCounts.set(flag, (flagCounts.get(flag) ?? 0) + 1);
              }
              return (
                <div key={week.weekNumber}>
                  <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-zinc-900 pb-2">
                    <h3 className="text-sm font-medium text-zinc-200">
                      Week {week.weekNumber}
                      <span className="ml-2 text-xs font-normal text-zinc-500">
                        {new Date(
                          week.startDate + "T00:00:00",
                        ).toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                        })}
                        {" · "}
                        {week.recovery ? "Down week" : PHASE_LABEL[week.phase]}
                        {adjustedWeeks.has(week.weekNumber) && " · adjusted"}
                      </span>
                    </h3>
                    <p className="text-xs tabular-nums text-zinc-500">
                      {result.complete
                        ? `${result.actualMiles} / ${week.targetMiles} mi · ${result.actualElevationFeet.toLocaleString()} / ${week.targetElevationFeet.toLocaleString()} ft`
                        : `${week.targetMiles} mi · ${week.targetElevationFeet.toLocaleString()} ft`}
                    </p>
                  </div>

                  <ul className="mt-2 space-y-1">
                    {result.workouts.map((workout) => (
                      <li
                        key={workout.planned.id}
                        className="flex flex-wrap items-baseline gap-x-3 py-0.5 text-sm"
                      >
                        <span className="w-10 shrink-0 text-xs text-zinc-600">
                          {new Date(
                            workout.planned.date + "T00:00:00",
                          ).toLocaleDateString(undefined, {
                            weekday: "short",
                          })}
                        </span>
                        <span
                          className={`w-16 shrink-0 text-xs ${STATUS_STYLE[workout.status]}`}
                        >
                          {workout.status === "upcoming" ? "" : workout.status}
                        </span>
                        <span className="min-w-0 flex-1 text-zinc-400">
                          {workout.planned.description}
                        </span>
                        {workout.status !== "upcoming" &&
                          workout.planned.type !== "rest" && (
                            <span className="shrink-0 text-xs tabular-nums text-zinc-600">
                              {workout.actualMiles} / {workout.planned.targetMiles} mi
                            </span>
                          )}
                      </li>
                    ))}
                  </ul>

                  {flagCounts.size > 0 && (
                    <ul className="mt-2 space-y-1 border-l-2 border-amber-900/60 pl-3">
                      {[...flagCounts].map(([flag, count]) => (
                        <li key={flag} className="text-xs text-amber-500/80">
                          {flag}
                          {count > 1 && (
                            <span className="text-amber-600/70"> (×{count})</span>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      <div className="mt-4">
        <Card title="Why the plan looks like this" subtitle="Coach rationale">
          <ul className="space-y-2">
            {plan.rationale.map((note) => (
              <li key={note} className="text-sm leading-relaxed text-zinc-400">
                {note}
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </main>
  );
}
