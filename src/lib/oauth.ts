import { NextRequest } from "next/server";

export const STATE_COOKIE = "strava_oauth_state";

/**
 * Builds the OAuth callback URL from the incoming request so the same code
 * works on localhost and on any deployment domain. Behind Vercel's proxy the
 * request URL is http internally, so trust the forwarded protocol header.
 */
export function callbackUrl(request: NextRequest): string {
  const url = new URL("/api/auth/callback", request.url);
  const forwardedProto = request.headers.get("x-forwarded-proto");
  const forwardedHost = request.headers.get("x-forwarded-host");
  if (forwardedProto) url.protocol = `${forwardedProto}:`;
  if (forwardedHost) url.host = forwardedHost;
  return url.toString();
}
