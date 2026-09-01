import { EncryptJWT, jwtDecrypt } from "jose";
import { cookies } from "next/headers";
import { AthleteProfile, RaceGoal } from "./types";

/**
 * Persistence for the coaching plan.
 *
 * `generatePlan` is deterministic: the same race, profile, and start date always
 * produce the same weeks. So only those three inputs are stored, and the plan is
 * rebuilt on each request. That keeps the payload small enough for a cookie —
 * a serialized 12-week plan is tens of kilobytes, well past the 4KB limit — and
 * means this app still needs no database.
 *
 * The tradeoff is honest: there is no history, so a plan cannot be revised and
 * re-read later. That's the right call while the plan shape is still changing;
 * a real datastore is the upgrade path once plans need to be edited or shared.
 */

const COOKIE_NAME = "coach_plan";

export type StoredPlan = {
  race: RaceGoal;
  profile: AthleteProfile;
  /** ISO date the plan was generated from. */
  startDate: string;
};

async function getKey(): Promise<Uint8Array> {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error("SESSION_SECRET is not set");
  }
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(secret),
  );
  return new Uint8Array(digest);
}

export async function readStoredPlan(): Promise<StoredPlan | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;

  try {
    const { payload } = await jwtDecrypt(token, await getKey());
    return (payload as { plan: StoredPlan }).plan;
  } catch {
    return null;
  }
}

export async function writeStoredPlan(plan: StoredPlan): Promise<void> {
  const token = await new EncryptJWT({ plan })
    .setProtectedHeader({ alg: "dir", enc: "A256GCM" })
    .setIssuedAt()
    .setExpirationTime("1y")
    .encrypt(await getKey());

  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
}

export async function clearStoredPlan(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}
