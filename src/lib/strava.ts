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

/**
 * Fetches activities newest-first, paging until `limit` is reached or Strava
 * runs out. Strava caps `per_page` at 200.
 */
export async function fetchActivities(
  session: Session,
  limit = 200,
): Promise<StravaActivity[]> {
  const fresh = await ensureFreshSession(session);
  const activities: StravaActivity[] = [];
  const perPage = Math.min(limit, 200);

  for (let page = 1; activities.length < limit; page++) {
    const url = `${STRAVA_API}/athlete/activities?per_page=${perPage}&page=${page}`;
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${fresh.accessToken}` },
      cache: "no-store",
    });

    if (!res.ok) {
      throw new Error(`Strava activities request failed (${res.status})`);
    }

    const batch: StravaActivity[] = await res.json();
    activities.push(...batch);
    if (batch.length < perPage) break;
  }

  return activities.slice(0, limit);
}
