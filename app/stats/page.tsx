"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface FigureStats {
  name: string;
  normalizedName: string;
  requestCount: number;
  model: string;
  lastRequested: string;
  hasCachedData: boolean;
}

export default function StatsPage() {
  const [stats, setStats] = useState<FigureStats[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [purging, setPurging] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    async function fetchStats() {
      try {
        const response = await fetch("/api/stats");
        const data = await response.json();

        if (data.error) {
          setError(data.error);
        } else {
          setStats(data.stats || []);
        }
      } catch {
        setError("Failed to load stats");
      } finally {
        setIsLoading(false);
      }
    }

    fetchStats();
  }, []);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const handlePurge = async (normalizedName: string) => {
    setPurging(normalizedName);
    try {
      const res = await fetch("/api/stats", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ normalizedName }),
      });
      const data = await res.json();
      if (data.success) {
        setStats((prev) =>
          prev.map((s) =>
            s.normalizedName === normalizedName
              ? { ...s, hasCachedData: false }
              : s
          )
        );
      }
    } catch {
      // silently fail
    } finally {
      setPurging(null);
    }
  };

  return (
    <main className="min-h-screen bg-[var(--color-cream)] relative">
      {/* Old map background with fade */}
      <div
        className="absolute inset-x-0 top-0 h-[70vh] pointer-events-none"
        style={{
          backgroundImage: `url('/old-map-bg.jpg')`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          opacity: 0.12,
          maskImage: 'linear-gradient(to bottom, black 0%, black 40%, transparent 100%)',
          WebkitMaskImage: 'linear-gradient(to bottom, black 0%, black 40%, transparent 100%)',
        }}
      />
      <div className="relative z-10 max-w-4xl mx-auto px-8 md:px-12 py-16 md:py-24">
        <div className="mb-8 flex items-center justify-between">
          <Link
            href="/"
            className="text-xs tracking-[0.2em] uppercase text-[var(--color-terracotta)] hover:text-[var(--color-terracotta-dark)] transition-colors"
          >
            &larr; Back to Search
          </Link>
          <button
            onClick={async () => {
              await fetch("/api/auth/logout", { method: "POST" });
              router.push("/login");
            }}
            className="text-xs tracking-[0.1em] uppercase text-[var(--color-warm-gray)] hover:text-[var(--color-terracotta)] transition-colors"
          >
            Log Out
          </button>
        </div>

        <header className="mb-16">
          <p className="text-xs tracking-[0.3em] uppercase text-[var(--color-warm-gray)] mb-6">
            Usage Statistics
          </p>
          <h1 className="text-4xl md:text-5xl font-serif font-light text-[var(--color-charcoal)] tracking-tight">
            Historical Figures Explored
          </h1>
        </header>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-[var(--color-warm-gray)] animate-pulse text-center">
              <div className="w-12 h-12 mx-auto mb-6 border border-[var(--color-warm-gray-light)] rounded-full flex items-center justify-center">
                <div className="w-2 h-2 bg-[var(--color-terracotta)] rounded-full animate-ping"></div>
              </div>
              <p className="text-xs tracking-[0.2em] uppercase">Loading stats...</p>
            </div>
          </div>
        ) : error ? (
          <div className="text-center py-20">
            <p className="text-[var(--color-warm-gray)] font-light">{error}</p>
          </div>
        ) : stats.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-[var(--color-warm-gray-light)] font-light italic text-lg">
              No searches yet. Be the first to explore a historical figure!
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[var(--color-warm-gray-light)]">
                  <th className="text-left py-4 pr-6 text-xs tracking-[0.15em] uppercase text-[var(--color-warm-gray)] font-medium">
                    Historical Figure
                  </th>
                  <th className="text-center py-4 px-6 text-xs tracking-[0.15em] uppercase text-[var(--color-warm-gray)] font-medium">
                    Requests
                  </th>
                  <th className="text-left py-4 px-6 text-xs tracking-[0.15em] uppercase text-[var(--color-warm-gray)] font-medium">
                    Model
                  </th>
                  <th className="text-right py-4 px-6 text-xs tracking-[0.15em] uppercase text-[var(--color-warm-gray)] font-medium">
                    Last Requested
                  </th>
                  <th className="text-center py-4 pl-6 text-xs tracking-[0.15em] uppercase text-[var(--color-warm-gray)] font-medium">
                    Cache
                  </th>
                </tr>
              </thead>
              <tbody>
                {stats.map((stat, index) => (
                  <tr
                    key={stat.normalizedName}
                    className="border-b border-[var(--color-cream-dark)] hover:bg-[var(--color-cream-dark)] transition-colors"
                    style={{
                      animation: `fade-in-up 0.5s ease-out forwards`,
                      animationDelay: `${index * 50}ms`,
                      opacity: 0,
                    }}
                  >
                    <td className="py-5 pr-6">
                      <Link
                        href={`/?search=${encodeURIComponent(stat.name)}`}
                        className="font-serif text-lg text-[var(--color-charcoal)] hover:text-[var(--color-terracotta)] transition-colors"
                      >
                        {stat.name}
                      </Link>
                    </td>
                    <td className="py-5 px-6 text-center">
                      <span className="inline-flex items-center justify-center w-8 h-8 bg-[#ba5b3f] text-white text-sm font-medium rounded-full">
                        {stat.requestCount ?? 1}
                      </span>
                    </td>
                    <td className="py-5 px-6">
                      <span className="text-sm text-[var(--color-warm-gray)] font-mono">
                        {stat.model}
                      </span>
                    </td>
                    <td className="py-5 px-6 text-right">
                      <span className="text-sm text-[var(--color-warm-gray-light)]">
                        {formatDate(stat.lastRequested)}
                      </span>
                    </td>
                    <td className="py-5 pl-6 text-center">
                      <button
                        onClick={() => handlePurge(stat.normalizedName)}
                        disabled={!stat.hasCachedData || purging === stat.normalizedName}
                        className={`text-xs tracking-[0.1em] uppercase transition-colors ${
                          stat.hasCachedData && purging !== stat.normalizedName
                            ? "text-[var(--color-terracotta)] hover:text-[var(--color-terracotta-dark)] cursor-pointer"
                            : "text-[var(--color-warm-gray-light)] cursor-default"
                        }`}
                      >
                        {purging === stat.normalizedName ? "..." : "Purge"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="mt-8 pt-8 border-t border-[var(--color-warm-gray-light)]">
              <p className="text-sm text-[var(--color-warm-gray)]">
                Total figures explored:{" "}
                <span className="font-medium text-[var(--color-charcoal)]">
                  {stats.length}
                </span>
              </p>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
