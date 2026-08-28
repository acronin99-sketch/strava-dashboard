import { readSession } from "@/lib/session";
import { fetchActivities } from "@/lib/strava";
import {
  activityTrend,
  bySport,
  filterSport,
  formatDuration,
  formatPace,
  hasMetric,
  mphOf,
  paceMinPerMile,
  toFeet,
  toMiles,
  totals,
  wattsOf,
  weeklyTotals,
  type SportGroup,
} from "@/lib/stats";
import {
  EfficiencyChart,
  ElevationChart,
  HeartRateChart,
  PaceChart,
  PowerChart,
  SpeedChart,
  SportChart,
  WeeklyMileageChart,
} from "@/components/charts";

const ERROR_MESSAGES: Record<string, string> = {
  access_denied: "You declined access on Strava. Nothing was connected.",
  invalid_oauth_state: "That login attempt expired. Please try again.",
  token_exchange_failed:
    "Strava rejected the token exchange. Check the client ID and secret.",
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

function Stat({
  label,
  value,
  unit,
}: {
  label: string;
  value: string;
  unit?: string;
}) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-5">
      <div className="text-xs uppercase tracking-wide text-zinc-500">
        {label}
      </div>
      <div className="mt-1 text-2xl font-semibold tabular-nums text-zinc-50">
        {value}
        {unit && (
          <span className="ml-1 text-sm font-normal text-zinc-500">{unit}</span>
        )}
      </div>
    </div>
  );
}

const SPORT_TABS: { key: SportGroup; label: string }[] = [
  { key: "all", label: "All" },
  { key: "run", label: "Run" },
  { key: "ride", label: "Bike" },
];

function SportTabs({ active }: { active: SportGroup }) {
  return (
    <nav className="mb-4 inline-flex gap-1 rounded-xl border border-zinc-800 bg-zinc-950/60 p-1">
      {SPORT_TABS.map((tab) => (
        <a
          key={tab.key}
          href={tab.key === "all" ? "/" : `/?sport=${tab.key}`}
          aria-current={tab.key === active ? "page" : undefined}
          className={`rounded-lg px-4 py-1.5 text-sm transition-colors ${
            tab.key === active
              ? "bg-zinc-800 font-medium text-zinc-100"
              : "text-zinc-400 hover:text-zinc-200"
          }`}
        >
          {tab.label}
        </a>
      ))}
    </nav>
  );
}

function ConnectScreen({ error }: { error?: string }) {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-6 py-16">
      <h1 className="text-3xl font-bold tracking-tight">Strava Dashboard</h1>
      <p className="mt-3 text-sm leading-relaxed text-zinc-400">
        Connect your Strava account to see your mileage, pace, and elevation
        trends. Your data stays between this app and Strava.
      </p>
      {error && (
        <p className="mt-6 rounded-lg border border-red-900/60 bg-red-950/40 px-4 py-3 text-sm text-red-300">
          {ERROR_MESSAGES[error] ?? `Something went wrong: ${error}`}
        </p>
      )}
      <a
        href="/api/auth/login"
        className="mt-8 inline-flex items-center justify-center rounded-lg bg-[#fc4c02] px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#e34402]"
      >
        Connect with Strava
      </a>
    </main>
  );
}

function ErrorScreen({ message }: { message: string }) {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-6 py-16">
      <h1 className="text-xl font-semibold">Could not load your activities</h1>
      <p className="mt-3 text-sm text-zinc-400">{message}</p>
      <form action="/api/auth/logout" method="post" className="mt-8">
        <button
          type="submit"
          className="rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-900"
        >
          Disconnect and try again
        </button>
      </form>
    </main>
  );
}

export default async function Home({ searchParams }: PageProps<"/">) {
  const params = await searchParams;
  const error = typeof params.error === "string" ? params.error : undefined;

  const session = await readSession();
  if (!session) return <ConnectScreen error={error} />;

  let activities;
  try {
    activities = await fetchActivities(session, 200);
  } catch (err) {
    return (
      <ErrorScreen
        message={err instanceof Error ? err.message : "Unknown error"}
      />
    );
  }

  const sport: SportGroup =
    params.sport === "run" || params.sport === "ride" ? params.sport : "all";
  const scoped = filterSport(activities, sport);

  const summary = totals(scoped);
  const weekly = weeklyTotals(scoped, 12);
  const sports = bySport(scoped);
  const trend = activityTrend(scoped, 30);
  const recent = scoped.slice(0, 10);

  const showSpeed = sport === "ride";
  const showHeartrate = recent.some((a) => a.average_heartrate);
  const showWatts = recent.some((a) => wattsOf(a) !== null);

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-10">
      <header className="mb-8 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          {session.athlete.avatar && (
            // eslint-disable-next-line @next/next/no-img-element -- Strava's CDN host isn't configured for next/image.
            <img
              src={session.athlete.avatar}
              alt=""
              className="h-10 w-10 rounded-full border border-zinc-800"
            />
          )}
          <div>
            <h1 className="text-lg font-semibold tracking-tight">
              {session.athlete.firstName} {session.athlete.lastName}
            </h1>
            <p className="text-xs text-zinc-500">
              Last {summary.count} activities
            </p>
          </div>
        </div>
        <form action="/api/auth/logout" method="post">
          <button
            type="submit"
            className="rounded-lg border border-zinc-800 px-3 py-1.5 text-xs text-zinc-400 transition-colors hover:bg-zinc-900 hover:text-zinc-200"
          >
            Disconnect
          </button>
        </form>
      </header>

      <SportTabs active={sport} />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat
          label="Distance"
          value={summary.miles.toLocaleString(undefined, {
            maximumFractionDigits: 0,
          })}
          unit="mi"
        />
        <Stat
          label="Moving time"
          value={Math.round(summary.movingSeconds / 3600).toLocaleString()}
          unit="hrs"
        />
        <Stat
          label="Elevation"
          value={Math.round(summary.elevationFeet).toLocaleString()}
          unit="ft"
        />
        <Stat label="Activities" value={summary.count.toLocaleString()} />
        {summary.avgHeartrate !== null && (
          <Stat
            label="Avg heart rate"
            value={Math.round(summary.avgHeartrate).toLocaleString()}
            unit="bpm"
          />
        )}
        {summary.avgWatts !== null && (
          <Stat
            label="Avg power"
            value={Math.round(summary.avgWatts).toLocaleString()}
            unit="W"
          />
        )}
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card title="Weekly mileage" subtitle="Last 12 weeks">
          <WeeklyMileageChart data={weekly} />
        </Card>
        <Card title="Weekly elevation gain" subtitle="Last 12 weeks">
          <ElevationChart data={weekly} />
        </Card>
        {sport === "run" && hasMetric(trend, "pace") && (
          <Card title="Pace trend" subtitle="Last 30 runs · higher is faster">
            <PaceChart data={trend} />
          </Card>
        )}
        {sport === "ride" && hasMetric(trend, "mph") && (
          <Card title="Speed trend" subtitle="Last 30 rides">
            <SpeedChart data={trend} />
          </Card>
        )}
        {sport === "ride" && hasMetric(trend, "watts") && (
          <Card
            title="Power trend"
            subtitle="Normalized power · power-meter rides only"
          >
            <PowerChart data={trend} />
          </Card>
        )}
        {sport !== "all" && hasMetric(trend, "heartrate") && (
          <Card title="Heart rate trend" subtitle="Average per activity">
            <HeartRateChart data={trend} />
          </Card>
        )}
        {sport === "run" && hasMetric(trend, "efficiency") && (
          <Card
            title="Efficiency factor"
            subtitle="Speed per heartbeat · rising means fitter"
          >
            <EfficiencyChart data={trend} />
          </Card>
        )}
        {sport === "all" && (
          <Card title="Distance by sport" subtitle="All fetched activities">
            <SportChart data={sports} />
          </Card>
        )}
      </div>

      <div className="mt-4">
        <Card title="Recent activities" subtitle="Newest first">
          <div className="-mx-1 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs uppercase tracking-wide text-zinc-500">
                <tr>
                  <th className="px-1 pb-2 font-medium">Activity</th>
                  <th className="px-1 pb-2 font-medium">Date</th>
                  <th className="px-1 pb-2 text-right font-medium">Distance</th>
                  <th className="px-1 pb-2 text-right font-medium">Time</th>
                  <th className="px-1 pb-2 text-right font-medium">
                    {showSpeed ? "Speed" : "Pace"}
                  </th>
                  {showHeartrate && (
                    <th className="px-1 pb-2 text-right font-medium">HR</th>
                  )}
                  {showWatts && (
                    <th className="px-1 pb-2 text-right font-medium">Power</th>
                  )}
                  <th className="px-1 pb-2 text-right font-medium">Elev</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-900">
                {recent.map((activity) => {
                  const watts = wattsOf(activity);
                  return (
                    <tr key={activity.id} className="text-zinc-300">
                      <td className="max-w-64 truncate px-1 py-2.5">
                        <a
                          href={`https://www.strava.com/activities/${activity.id}`}
                          target="_blank"
                          rel="noreferrer"
                          className="hover:text-[#fc4c02]"
                        >
                          {activity.name}
                        </a>
                        <span className="ml-2 text-xs text-zinc-600">
                          {activity.sport_type || activity.type}
                        </span>
                      </td>
                      <td className="px-1 py-2.5 text-zinc-500">
                        {new Date(
                          activity.start_date_local,
                        ).toLocaleDateString()}
                      </td>
                      <td className="px-1 py-2.5 text-right tabular-nums">
                        {toMiles(activity.distance).toFixed(1)} mi
                      </td>
                      <td className="px-1 py-2.5 text-right tabular-nums">
                        {formatDuration(activity.moving_time)}
                      </td>
                      <td className="px-1 py-2.5 text-right tabular-nums">
                        {showSpeed
                          ? `${mphOf(activity)?.toFixed(1) ?? "—"} mph`
                          : formatPace(paceMinPerMile(activity))}
                      </td>
                      {showHeartrate && (
                        <td className="px-1 py-2.5 text-right tabular-nums">
                          {activity.average_heartrate
                            ? `${Math.round(activity.average_heartrate)} bpm`
                            : "—"}
                        </td>
                      )}
                      {showWatts && (
                        <td className="px-1 py-2.5 text-right tabular-nums">
                          {watts === null ? "—" : `${Math.round(watts)} W`}
                        </td>
                      )}
                      <td className="px-1 py-2.5 text-right tabular-nums">
                        {Math.round(
                          toFeet(activity.total_elevation_gain),
                        ).toLocaleString()}{" "}
                        ft
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </main>
  );
}
