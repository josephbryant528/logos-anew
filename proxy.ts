import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { PASS_COOKIE, passcodeToken, safeEqual } from "./app/lib/passcode";

// Passcode lock. Does nothing unless APP_PASSCODE is set in the environment.
export async function proxy(request: NextRequest) {
  const passcode = process.env.APP_PASSCODE;
  if (!passcode) return NextResponse.next();

  const cookie = request.cookies.get(PASS_COOKIE)?.value ?? "";
  const expected = await passcodeToken(passcode);
  if (cookie && safeEqual(cookie, expected)) return NextResponse.next();

  const { pathname, search } = request.nextUrl;
  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Locked. Enter the passcode to continue." }, { status: 401 });
  }

  const url = request.nextUrl.clone();
  url.pathname = "/unlock";
  url.search = `?next=${encodeURIComponent(pathname + search)}`;
  return NextResponse.redirect(url);
}

export const config = {
  matcher: [
    // Everything except the unlock screen, Next.js assets, and the files a phone
    // needs to show the home-screen icon before unlocking.
    "/((?!unlock|api/unlock|_next/static|_next/image|favicon\\.ico|manifest\\.webmanifest|apple-icon|icons/).*)",
  ],
};
