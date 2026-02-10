import { NextRequest, NextResponse } from "next/server";
import { Redis } from "@upstash/redis";

const redis =
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
    ? new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
      })
    : null;

export async function middleware(request: NextRequest) {
  // If no AUTH_PASSWORD is set, skip authentication entirely
  if (!process.env.AUTH_PASSWORD) {
    return NextResponse.next();
  }

  const sessionId = request.cookies.get("rambler-auth")?.value;

  if (sessionId && redis) {
    try {
      const exists = await redis.exists(`session:${sessionId}`);
      if (exists === 1) {
        return NextResponse.next();
      }
    } catch (error) {
      console.error("Middleware session check failed:", error);
    }
  }

  const loginUrl = new URL("/login", request.url);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: [
    /*
     * Match all paths except:
     * - /login
     * - /api/auth/login
     * - /_next (static files)
     * - /favicon.ico
     * - static assets (images, etc.)
     */
    "/((?!login|api/auth/login|_next|favicon\\.ico|.*\\.(?:jpg|jpeg|png|gif|svg|ico|webp)).*)",
  ],
};
