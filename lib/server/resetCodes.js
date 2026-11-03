import "server-only";
import { createHmac, randomInt, timingSafeEqual } from "crypto";

export const CODE_TTL_MIN = 10;
export const MAX_ATTEMPTS = 5;
export const MIN_RESEND_SEC = 60;
export const MAX_SENDS_PER_HOUR = 5;

export const normalizeEmail = (e) => String(e ?? "").trim().toLowerCase();
export const validEmail = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e) && e.length <= 254;

// Cryptographically random 6-digit code (000000-999999).
export const newCode = () => String(randomInt(0, 1_000_000)).padStart(6, "0");

// Salted hash: the code is never stored in plain text.
export function hashCode(email, code) {
  return createHmac("sha256", process.env.SUPABASE_SECRET_KEY || "fitmate").update(`${email}:${code}`).digest("hex");
}

export function sameHash(a, b) {
  const x = Buffer.from(a, "hex");
  const y = Buffer.from(b, "hex");
  return x.length === y.length && timingSafeEqual(x, y);
}

// Finds a user id by email with the admin API (paged).
export async function findUserId(admin, email) {
  for (let page = 1; page <= 50; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw error;
    const hit = data.users.find((u) => u.email?.toLowerCase() === email);
    if (hit) return hit.id;
    if (data.users.length < 1000) return null;
  }
  return null;
}
