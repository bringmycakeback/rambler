import { NextRequest, NextResponse } from "next/server";
import {
  getAllStats,
  hasCacheEntries,
  purgeCacheEntries,
  isRedisConfigured,
} from "@/lib/redis";

export async function GET() {
  if (!isRedisConfigured()) {
    return NextResponse.json(
      { error: "Stats not available - Redis not configured" },
      { status: 503 }
    );
  }

  try {
    const stats = await getAllStats();
    const statsWithCache = await Promise.all(
      stats.map(async (stat) => ({
        ...stat,
        hasCachedData: await hasCacheEntries(stat.normalizedName),
      }))
    );
    return NextResponse.json({ stats: statsWithCache });
  } catch (error) {
    console.error("Error fetching stats:", error);
    return NextResponse.json(
      { error: "Failed to fetch stats" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  if (!isRedisConfigured()) {
    return NextResponse.json(
      { error: "Redis not configured" },
      { status: 503 }
    );
  }

  try {
    const { normalizedName } = await request.json();
    if (!normalizedName || typeof normalizedName !== "string") {
      return NextResponse.json(
        { error: "normalizedName is required" },
        { status: 400 }
      );
    }

    const success = await purgeCacheEntries(normalizedName);
    return NextResponse.json({ success });
  } catch (error) {
    console.error("Error purging cache:", error);
    return NextResponse.json(
      { error: "Failed to purge cache" },
      { status: 500 }
    );
  }
}
