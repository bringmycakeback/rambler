import { NextResponse } from "next/server";
import { getAllStats, isRedisConfigured } from "@/lib/redis";

export async function GET() {
  if (!isRedisConfigured()) {
    return NextResponse.json(
      { error: "Stats not available - Redis not configured" },
      { status: 503 }
    );
  }

  try {
    const stats = await getAllStats();
    return NextResponse.json({ stats });
  } catch (error) {
    console.error("Error fetching stats:", error);
    return NextResponse.json(
      { error: "Failed to fetch stats" },
      { status: 500 }
    );
  }
}
