import { NextRequest, NextResponse } from "next/server";
import { redis, isRedisConfigured } from "@/lib/redis";

// Keep-alive endpoint hit by Vercel Cron to prevent Upstash from
// archiving the database due to inactivity.
export async function GET(request: NextRequest) {
  if (process.env.CRON_SECRET) {
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  if (!isRedisConfigured()) {
    return NextResponse.json({ ok: false, reason: "redis_not_configured" });
  }

  try {
    await redis.set("keepalive:last_ping", new Date().toISOString(), {
      ex: 60 * 60 * 24 * 30,
    });
    const value = await redis.get<string>("keepalive:last_ping");
    return NextResponse.json({ ok: true, lastPing: value });
  } catch (error) {
    console.error("Ping failed:", error);
    return NextResponse.json({ ok: false, error: String(error) }, { status: 500 });
  }
}
