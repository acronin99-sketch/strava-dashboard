/**
 * Intercepts Strava API calls in local dev and answers them with fixture data.
 *
 * Why this exists: a Strava app permits exactly one OAuth callback domain, and
 * this one points at the Vercel host, so localhost can never complete a real
 * login. Without a stub, every authenticated page in the dev browser is
 * unreachable and the only way to see the dashboard or coach view is to deploy.
 *
 * Loaded via NODE_OPTIONS=--require, so it patches `fetch` before Next wraps it
 * for caching. It touches no application source — the app makes ordinary Strava
 * requests and cannot tell the difference.
 *
 * Used by the `strava-dashboard-fixtures` entry in .claude/launch.json.
 * NEVER load this in production; it fabricates training data.
 */

const DAY = 24 * 60 * 60 * 1000;

/**
 * Twelve weeks of plausible trail running: five sessions a week, a Saturday
 * long run, and Sunday off. Deliberately imperfect — a couple of long runs are
 * skipped and easy days run slightly hot — so the coach has something real to
 * react to rather than a flawless athlete no plan would ever need to adapt for.
 */
function activities() {
  const out = [];
  const now = Date.now();
  let id = 1000;

  for (let daysAgo = 84; daysAgo >= 1; daysAgo--) {
    const date = new Date(now - daysAgo * DAY);
    const weekday = date.getDay();
    if (weekday === 0) continue; // rest day

    const isLong = weekday === 6;
    // Skip two long runs so the "missed long run" path has something to find.
    if (isLong && (daysAgo === 29 || daysAgo === 43)) continue;

    // Gentle upward drift in fitness over the block.
    const ramp = 1 + (84 - daysAgo) / 400;
    const miles = (isLong ? 13 : 5.5) * ramp;
    const feet = (isLong ? 2000 : 550) * ramp;
    const minutes = miles * (isLong ? 11.5 : 9.4);

    date.setHours(7, 30, 0, 0);

    out.push({
      id: id++,
      name: isLong ? "Long trail run" : "Easy miles",
      type: "Run",
      sport_type: "TrailRun",
      distance: miles * 1609.344,
      moving_time: Math.round(minutes * 60),
      elapsed_time: Math.round(minutes * 60 * 1.05),
      total_elevation_gain: feet / 3.28084,
      start_date_local: date.toISOString().replace("Z", ""),
      average_heartrate: isLong ? 148 : 143,
      max_heartrate: isLong ? 168 : 160,
      average_watts: null,
      weighted_average_watts: null,
      device_watts: false,
      average_speed: (miles * 1609.344) / (minutes * 60),
    });
  }

  // Newest first, matching Strava's ordering.
  return out.reverse();
}

const realFetch = globalThis.fetch;

globalThis.fetch = async function (input, init) {
  const url = String(
    typeof input === "string" ? input : (input && input.url) || input,
  );

  if (url.includes("/api/v3/athlete/activities")) {
    const page = Number(new URL(url).searchParams.get("page") ?? "1");
    // One page of data, then an empty page so the pager terminates.
    const body = page === 1 ? activities() : [];
    return new Response(JSON.stringify(body), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  }

  return realFetch(input, init);
};

console.log("[stub-strava] Strava API responses are fixtures, not real data.");
