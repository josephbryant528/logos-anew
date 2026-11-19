import { headers } from "next/headers";
import { PASS_COOKIE, passcodeToken, safeEqual } from "../../lib/passcode";

// Slow down guessing: 5 tries per minute per visitor.
const attempts = new Map<string, { count: number; resetAt: number }>();
const MAX_TRIES = 5;
const WINDOW_MS = 60 * 1000;

function allowTry(ip: string) {
  const now = Date.now();
  const entry = attempts.get(ip);
  if (!entry || now > entry.resetAt) {
    attempts.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return true;
  }
  if (entry.count >= MAX_TRIES) return false;
  entry.count++;
  return true;
}

export async function POST(request: Request) {
  const passcode = process.env.APP_PASSCODE;
  if (!passcode) return Response.json({ ok: true });

  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? h.get("x-real-ip") ?? "unknown";
  if (!allowTry(ip)) {
    return Response.json({ error: "Too many tries. Wait a minute and try again." }, { status: 429 });
  }

  let body: { passcode?: unknown };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request." }, { status: 400 });
  }

  const entered = typeof body.passcode === "string" ? body.passcode : "";
  const [given, expected] = await Promise.all([passcodeToken(entered), passcodeToken(passcode)]);
  if (!safeEqual(given, expected)) {
    return Response.json({ error: "That passcode didn't match." }, { status: 401 });
  }

  const res = Response.json({ ok: true });
  const secure = new URL(request.url).protocol === "https:" ? "; Secure" : "";
  res.headers.append(
    "Set-Cookie",
    `${PASS_COOKIE}=${expected}; Path=/; Max-Age=${60 * 60 * 24 * 365}; HttpOnly; SameSite=Lax${secure}`,
  );
  return res;
}
