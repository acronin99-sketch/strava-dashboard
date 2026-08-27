import { NextRequest, NextResponse } from "next/server";
import { STRAVA_AUTHORIZE_URL, STRAVA_SCOPE } from "@/lib/strava";
import { callbackUrl, STATE_COOKIE } from "@/lib/oauth";

export async function GET(request: NextRequest) {
  const clientId = process.env.STRAVA_CLIENT_ID;
  if (!clientId) {
    return NextResponse.json(
      { error: "STRAVA_CLIENT_ID is not set" },
      { status: 500 },
    );
  }

  // Random state, echoed back by Strava and compared in the callback to
  // prevent CSRF on the OAuth exchange.
  const state = crypto.randomUUID();

  const authorize = new URL(STRAVA_AUTHORIZE_URL);
  authorize.searchParams.set("client_id", clientId);
  authorize.searchParams.set("redirect_uri", callbackUrl(request));
  authorize.searchParams.set("response_type", "code");
  authorize.searchParams.set("approval_prompt", "auto");
  authorize.searchParams.set("scope", STRAVA_SCOPE);
  authorize.searchParams.set("state", state);

  const response = NextResponse.redirect(authorize);
  response.cookies.set(STATE_COOKIE, state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 600,
  });
  return response;
}
