import { NextRequest, NextResponse } from "next/server";
import { readFileSync } from "fs";
import { join } from "path";
import { normalizeName, isRedisConfigured } from "@/lib/redis";
import { Redis } from "@upstash/redis";

interface Figure {
  n: string;
  d: string;
  b: number | null;
  y: number | null;
}

const redis =
  isRedisConfigured()
    ? new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL!,
        token: process.env.UPSTASH_REDIS_REST_TOKEN!,
      })
    : null;

// Module-level cache — loaded once per cold start
let figures: Figure[] | null = null;
// Pre-computed lowercase names for search
let lcNames: string[] | null = null;

function loadFigures(): Figure[] {
  if (figures) return figures;
  try {
    const filePath = join(process.cwd(), "data", "figures.json");
    const raw = readFileSync(filePath, "utf-8");
    figures = JSON.parse(raw) as Figure[];
    lcNames = figures.map((f) => f.n.toLowerCase());
    return figures;
  } catch {
    figures = [];
    lcNames = [];
    return figures;
  }
}

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q")?.trim().toLowerCase();

  if (!q || q.length < 2) {
    return NextResponse.json({ suggestions: [] });
  }

  try {
    const data = loadFigures();
    const names = lcNames!;
    const results: Figure[] = [];

    for (let i = 0; i < data.length && results.length < 8; i++) {
      const name = names[i];
      // Prefix match on full name
      if (name.startsWith(q)) {
        results.push(data[i]);
        continue;
      }
      // Word-boundary match (match on any word start)
      // Check if query matches after a space (word boundary)
      if (name.includes(" " + q)) {
        results.push(data[i]);
      }
    }

    // Check cache status for each result
    let cachedFlags: boolean[] = results.map(() => false);
    if (redis) {
      try {
        const keys = results.map((r) => `cache:${normalizeName(r.n)}:*`);
        const checks = await Promise.all(keys.map((k) => redis.keys(k)));
        cachedFlags = checks.map((k) => k.length > 0);
      } catch {
        // Non-critical, leave all false
      }
    }

    const suggestions = results.map((r, i) => ({
      ...r,
      c: cachedFlags[i], // c = cached
    }));

    return NextResponse.json({ suggestions });
  } catch {
    return NextResponse.json({ suggestions: [] });
  }
}
