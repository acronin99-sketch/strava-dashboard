import { EncryptJWT, jwtDecrypt } from "jose";
import { cookies } from "next/headers";

const COOKIE_NAME = "strava_session";

export type Session = {
  accessToken: string;
  refreshToken: string;
  /** Unix seconds at which the access token expires. */
  expiresAt: number;
  athlete: {
    id: number;
    firstName: string;
    lastName: string;
    avatar: string | null;
  };
};

/**
 * Derives a 32-byte AES key from SESSION_SECRET. Throws at call time (not
 * module load) so a missing secret surfaces as a readable runtime error.
 */
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

export async function sealSession(session: Session): Promise<string> {
  return new EncryptJWT({ session })
    .setProtectedHeader({ alg: "dir", enc: "A256GCM" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .encrypt(await getKey());
}

export async function readSession(): Promise<Session | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;

  try {
    const { payload } = await jwtDecrypt(token, await getKey());
    return (payload as { session: Session }).session;
  } catch {
    // Tampered, expired, or signed with a rotated secret.
    return null;
  }
}

export async function writeSession(session: Session): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, await sealSession(session), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}

export async function clearSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}
