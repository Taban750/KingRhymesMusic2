import bcrypt from "bcryptjs";
import { createHash } from "node:crypto";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

const JWT_SECRET = process.env.JWT_SECRET || (process.env.NODE_ENV === "production" ? "" : "dev-secret-change-me-please-32chars");
if (!JWT_SECRET) throw new Error("JWT_SECRET is required in production");
if (process.env.NODE_ENV === "production" && !process.env.ADMIN_EMAIL) throw new Error("ADMIN_EMAIL is required in production");
export const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || "admin@kingrhymesmusic.com").toLowerCase();
const COOKIE_NAME = "kingrhymes_session";

export type SessionUser = {
  id: string;
  email: string;
  displayName: string;
  avatarUrl?: string | null;
  role: string;
};

export async function hashPassword(pw: string) {
  return bcrypt.hash(pw, 10);
}
export async function verifyPassword(pw: string, hash: string) {
  return bcrypt.compare(pw, hash);
}

export function signSession(user: SessionUser) {
  return jwt.sign(user, JWT_SECRET, { expiresIn: "30d" });
}
export function verifySessionToken(token: string): SessionUser | null {
  try {
    return jwt.verify(token, JWT_SECRET) as SessionUser;
  } catch {
    return null;
  }
}

export async function getSession(): Promise<SessionUser | null> {
  try {
    const store = await cookies();
    const token = store.get(COOKIE_NAME)?.value;
    if (!token) return null;
    return verifySessionToken(token);
  } catch {
    return null;
  }
}

export function isAdminEmail(email?: string | null) {
  return !!email && email.toLowerCase() === ADMIN_EMAIL;
}

export async function ensureAdmin(email: string, displayName = "Artist") {
  const existing = await db.select().from(users).where(eq(users.email, email.toLowerCase()));
  if (existing.length > 0) {
    return existing[0];
  }
  const inserted = await db
    .insert(users)
    .values({
      email: email.toLowerCase(),
      displayName,
      role: "admin",
      provider: "email",
    })
    .returning();
  return inserted[0];
}

export const SESSION_COOKIE = COOKIE_NAME;

export function signDownload(payload: { purchaseId?: string; songId?: string; albumId?: string; videoId?: string; email?: string }, expiresIn = "10m") {
  return jwt.sign(payload, JWT_SECRET, { expiresIn } as jwt.SignOptions);
}
export function verifyDownload(token: string) {
  try {
    return jwt.verify(token, JWT_SECRET) as { purchaseId?: string; songId?: string; albumId?: string; videoId?: string; email?: string };
  } catch {
    return null;
  }
}

const buckets = new Map<string, { count: number; reset: number }>();
export function rateLimit(key: string, limit = 20, windowMs = 60_000): boolean {
  const now = Date.now();
  const b = buckets.get(key);
  if (!b || now > b.reset) {
    buckets.set(key, { count: 1, reset: now + windowMs });
    return true;
  }
  b.count += 1;
  return b.count <= limit;
}

export function hashResetToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

const BAD_WORDS = ["fuck", "shit", "bitch", "asshole", "dick", "porn", "xxx", "viagra", "casino", "crypto giveaway"];
export function containsProfanity(text: string) {
  const low = text.toLowerCase();
  return BAD_WORDS.some((w) => low.includes(w));
}

export function slugify(s: string) {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 80);
}
