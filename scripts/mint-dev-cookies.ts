/**
 * Mints local-only cookies so authenticated pages can be inspected in the dev
 * browser.
 *
 * Strava allows a single OAuth callback domain per app, and this one points at
 * the Vercel host, so localhost can never complete a real login. The tokens
 * below are deliberately fake: pages that render from the session alone work,
 * and any real Strava call correctly fails — pair this with `npm run
 * dev:fixtures`, which stubs the Strava API.
 *
 * Also mints a `coach_plan` cookie dated several weeks in the past, so the
 * coach has completed weeks to reconcile and adapt from. A plan created through
 * the UI always starts today, which only ever exercises the empty state.
 *
 * Run with:  npx tsx --env-file=.env.local scripts/mint-dev-cookies.ts
 * Then paste the printed `document.cookie` lines into the dev browser console.
 */

import { EncryptJWT } from "jose";

/** How far back to date the plan, so early weeks are complete. */
const WEEKS_ELAPSED = 4;

async function main() {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error("SESSION_SECRET is not set");

  const key = new Uint8Array(
    await crypto.subtle.digest("SHA-256", new TextEncoder().encode(secret)),
  );

  const seal = (payload: Record<string, unknown>) =>
    new EncryptJWT(payload)
      .setProtectedHeader({ alg: "dir", enc: "A256GCM" })
      .setIssuedAt()
      .setExpirationTime("1d")
      .encrypt(key);

  const session = await seal({
    session: {
      accessToken: "dev-only-not-a-real-token",
      refreshToken: "dev-only-not-a-real-token",
      expiresAt: Math.floor(Date.now() / 1000) + 3600,
      athlete: { id: 0, firstName: "Dev", lastName: "Athlete", avatar: null },
    },
  });

  const start = new Date(Date.now() - WEEKS_ELAPSED * 7 * 24 * 60 * 60 * 1000);
  const race = new Date(Date.now() + 42 * 24 * 60 * 60 * 1000);

  const plan = await seal({
    plan: {
      race: {
        name: "Bear Chase 50k",
        date: race.toISOString().slice(0, 10),
        distanceMiles: 31,
        elevationGainFeet: 4200,
        terrain: "trail",
        goalTimeMinutes: 360,
      },
      profile: {
        weeklyMiles: 28,
        longRunMiles: 10,
        weeklyElevationFeet: 1800,
        daysPerWeek: 5,
        longRunDay: 6,
        easyPaceMinPerMile: 9.5,
        maxHeartrate: 185,
      },
      startDate: start.toISOString().slice(0, 10),
    },
  });

  console.log(`document.cookie = "strava_session=${session}; path=/";`);
  console.log(`document.cookie = "coach_plan=${plan}; path=/";`);
}

main();
