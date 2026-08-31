import { Session, writeSession } from "./session";

const STRAVA_API = "https://www.strava.com/api/v3";
const STRAVA_TOKEN_URL = "https://www.strava.com/oauth/token";

export const STRAVA_AUTHORIZE_URL = "https://www.strava.com/oauth/authorize";
/** `activity:read_all` is needed to include private activities. */
export const STRAVA_SCOPE = "read,activity:read_all";

export type StravaActivity = {
  id: number;
  name: string;
  type: string;
  sport_type: string;
  start_date_local: string;
  /** Meters. */
  distance: number;
  /** Seconds. */
  moving_time: number;
  elapsed_time: number;
  /** Meters. */
  total_elevation_gain: number;
  average_speed: number;
  average_heartrate?: number;
  max_heartrate?: number;
  /** Strava estimates this when no power meter is present; see `device_watts`. */
  average_watts?: number;
  /** Strava's normalized power. Only present for power-meter rides. */
  weighted_average_watts?: number;
  max_watts?: number;
  /** True when watts came from a real power meter rather than an estimate. */
  device_watts?: boolean;
};

type TokenResponse = {
  access_token: string;
  refresh_token: string;
  expires_at: number;
  athlete?: {
    id: number;
    firstname: string;
    lastname: string;
    profile?: string;
  };
};

function credentials() {
  const clientId = process.env.STRAVA_CLIENT_ID;
  const clientSecret = process.env.STRAVA_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error("STRAVA_CLIENT_ID and STRAVA_CLIENT_SECRET must be set");
  }
  return { clientId, clientSecret };
}

export async function exchangeCodeForSession(code: string): Promise<Session> {
  const { clientId, clientSecret } = credentials();
  const res = await fetch(STRAVA_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      grant_type: "authorization_code",
    }),
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`Strava token exchange failed (${res.status})`);
  }

  const data: TokenResponse = await res.json();
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: data.expires_at,
    athlete: {
      id: data.athlete?.id ?? 0,
      firstName: data.athlete?.firstname ?? "",
      lastName: data.athlete?.lastname ?? "",
      avatar: data.athlete?.profile ?? null,
    },
  };
}

/**
 * Returns a session with a valid access token, refreshing and persisting it
 * when the current one is within 60s of expiry.
 */
async function ensureFreshSession(session: Session): Promise<Session> {
  const now = Math.floor(Date.now() / 1000);
  if (session.expiresAt - 60 > now) return session;

  const { clientId, clientSecret } = credentials();
  const res = await fetch(STRAVA_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: session.refreshToken,
      grant_type: "refresh_token",
    }),
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`Strava token refresh failed (${res.status})`);
  }

  const data: TokenResponse = await res.json();
  const refreshed: Session = {
    ...session,
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: data.expires_at,
  };
  await writeSession(refreshed);
  return refreshed;
}

/** Strava caps `per_page` at 200. */
const PER_PAGE = 200;
/** Safety valve so a misbehaving response can't page forever. */
const MAX_PAGES = 100;

/**
 * Fetches the athlete's full activity history, newest-first, paging until
 * Strava runs out. Per-sport views need the whole history rather than a slice
 * of a shared page-one, since a single fixed cap would leave the less frequent
 * sport with only a handful of activities.
 */
export async function fetchActivities(
  session: Session,
): Promise<StravaActivity[]> {
  const fresh = await ensureFreshSession(session);
  const activities: StravaActivity[] = [];

  for (let page = 1; page <= MAX_PAGES; page++) {
    const url = `${STRAVA_API}/athlete/activities?per_page=${PER_PAGE}&page=${page}`;
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${fresh.accessToken}` },
      cache: "no-store",
    });

    if (!res.ok) {
      throw new Error(`Strava activities request failed (${res.status})`);
    }

    const batch: StravaActivity[] = await res.json();
    activities.push(...batch);
    if (batch.length < PER_PAGE) break;
  }

  return activities;
}
