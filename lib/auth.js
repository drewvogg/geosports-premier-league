import crypto from "crypto";
import { cookies } from "next/headers";

export const SESSION_COOKIE = "geosports_admin";

function adminPassword() {
  const pw = process.env.ADMIN_PASSWORD;
  if (!pw) throw new Error("ADMIN_PASSWORD env var is not set.");
  return pw;
}

/**
 * The session token is an HMAC derived from the admin password, so it
 * never exposes the password itself and changes whenever the password
 * is rotated (instantly logging out old sessions).
 */
export function sessionToken() {
  const pw = adminPassword();
  return crypto.createHmac("sha256", pw).update("geosports-admin-session-v1").digest("hex");
}

export function checkPassword(candidate) {
  const pw = adminPassword();
  const a = crypto.createHash("sha256").update(String(candidate ?? "")).digest();
  const b = crypto.createHash("sha256").update(pw).digest();
  return crypto.timingSafeEqual(a, b);
}

export function isAdmin() {
  try {
    const cookie = cookies().get(SESSION_COOKIE);
    if (!cookie?.value) return false;
    const expected = sessionToken();
    const a = crypto.createHash("sha256").update(cookie.value).digest();
    const b = crypto.createHash("sha256").update(expected).digest();
    return crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

export const sessionCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax",
  path: "/",
  maxAge: 60 * 60 * 24 * 30, // 30 days
};
