import jwt from "jsonwebtoken";
import { cookies } from "next/headers";

const JWT_SECRET = process.env.JWT_SECRET || "change-me-in-production-please";

// ── JWT helpers ───────────────────────────────────────────────────
export type SessionPayload = {
  id: string;
  username: string;
  email?: string;
  role: string;
};

export const signToken = (payload: SessionPayload) =>
  jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" });

export const verifyToken = (token: string): SessionPayload | null => {
  try {
    return jwt.verify(token, JWT_SECRET) as SessionPayload;
  } catch {
    return null;
  }
};

// ── Cookie helpers ────────────────────────────────────────────────
export const SESSION_COOKIE = "daily_dose_session";

export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return verifyToken(token);
}
