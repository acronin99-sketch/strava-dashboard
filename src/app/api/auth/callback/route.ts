import { NextRequest, NextResponse } from "next/server";
import { exchangeCodeForSession } from "@/lib/strava";
import { sealSession } from "@/lib/session";
import { STATE_COOKIE } from "@/lib/oauth";

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const home = new URL("/", request.url);

  const error = params.get("error");
  if (error) {
    home.searchParams.set("error", error);
    return NextResponse.redirect(home);
  }

  const code = params.get("code");
  const state = params.get("state");
  const expectedState = request.cookies.get(STATE_COOKIE)?.value;

  if (!code || !state || !expectedState || state !== expectedState) {
    home.searchParams.set("error", "invalid_oauth_state");
    return NextResponse.redirect(home);
  }

  try {
    const session = await exchangeCodeForSession(code);
    const response = NextResponse.redirect(home);
    response.cookies.set("strava_session", await sealSession(session), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });
    response.cookies.delete(STATE_COOKIE);
    return response;
  } catch {
    home.searchParams.set("error", "token_exchange_failed");
    return NextResponse.redirect(home);
  }
}
