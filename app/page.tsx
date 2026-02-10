"use client";

import { useState, useEffect, useCallback, useRef, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import Link from "next/link";
import SearchInput from "@/components/SearchInput";
import PlacesList from "@/components/PlacesList";
import ModelSelector from "@/components/ModelSelector";

const PlacesMap = dynamic(() => import("@/components/PlacesMap"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full bg-[var(--color-cream-dark)] flex items-center justify-center min-h-[400px]">
      <p className="text-xs tracking-[0.2em] uppercase text-[var(--color-warm-gray-light)]">Loading map...</p>
    </div>
  ),
});

interface Place {
  name: string;
  years: string;
  description: string;
  lat: number;
  lng: number;
}

export default function Home() {
  return (
    <Suspense>
      <HomeContent />
    </Suspense>
  );
}

function HomeContent() {
  const [places, setPlaces] = useState<Place[]>([]);
  const [figureName, setFigureName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [visibleCount, setVisibleCount] = useState(0);
  const [selectedModel, setSelectedModel] = useState("gemini-2.0-flash");
  const [statusMessage, setStatusMessage] = useState("");
  const searchParams = useSearchParams();
  const router = useRouter();
  const hasAutoSearched = useRef(false);

  // Clear status when places start appearing
  useEffect(() => {
    if (visibleCount > 0) {
      setStatusMessage("");
    }
  }, [visibleCount]);

  // Auto-search when navigating with ?search= query param (e.g. from stats page)
  useEffect(() => {
    const name = searchParams.get("search");
    if (name && !hasAutoSearched.current) {
      hasAutoSearched.current = true;
      handleSearch(name);
    }
  }, [searchParams]); // eslint-disable-line react-hooks/exhaustive-deps

  // Show the first two places after data loads to kick off the animation
  useEffect(() => {
    if (places.length > 0 && visibleCount === 0) {
      // Small delay before showing first place
      const timer = setTimeout(() => {
        setVisibleCount(1);
      }, 500);
      return () => clearTimeout(timer);
    }
    // After first place appears, show second place to start path animation
    if (places.length > 1 && visibleCount === 1) {
      const timer = setTimeout(() => {
        setVisibleCount(2);
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [places, visibleCount]);

  // Called by the map when a path animation completes
  const handlePathAnimationComplete = useCallback(() => {
    setVisibleCount((prev) => {
      if (prev < places.length) {
        return prev + 1;
      }
      return prev;
    });
  }, [places.length]);

  const handleSearch = async (name: string) => {
    setIsLoading(true);
    setError("");
    setFigureName(name);
    setPlaces([]);
    setVisibleCount(0);
    setStatusMessage(`Querying Gemini API · ${selectedModel}`);

    try {
      const response = await fetch("/api/places", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name, model: selectedModel }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch places");
      }

      if (data.error) {
        setError(data.error);
        setStatusMessage("");
      } else {
        setStatusMessage(
          data.cached
            ? "Loaded from cache"
            : `Response from Gemini · ${selectedModel}`
        );
        setPlaces(data.places || []);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
      setStatusMessage("");
    } finally {
      setIsLoading(false);
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
      <div className="relative z-10">
      <div className="absolute top-6 right-6 md:top-8 md:right-8 flex flex-col items-end gap-3">
        <ModelSelector
          selectedModel={selectedModel}
          onModelChange={setSelectedModel}
        />
        <div className="flex items-center gap-4">
          <Link
            href="/stats"
            className="text-xs tracking-[0.1em] uppercase text-[var(--color-warm-gray)] hover:text-[var(--color-terracotta)] transition-colors"
          >
            View Stats
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
      </div>
      <div className="max-w-6xl mx-auto px-8 md:px-12 py-16 md:py-24">
        <header className="text-center mb-16 md:mb-20">
          <p className="text-xs tracking-[0.3em] uppercase text-[var(--color-warm-gray)] mb-6">
            A Journey Through Time
          </p>
          <h1 className="text-4xl md:text-6xl font-serif font-light text-[var(--color-charcoal)] mb-6 tracking-tight">
            Paths of Past Lives
          </h1>
          <p className="text-[var(--color-warm-gray)] text-lg md:text-xl max-w-2xl mx-auto font-light leading-relaxed">
            Each life, drawn on a map. A line, a zag, a loop.
          </p>
        </header>

        <div className="max-w-lg mx-auto mb-16 md:mb-20">
          <SearchInput onSearch={handleSearch} isLoading={isLoading} defaultValue={searchParams.get("search") || ""} />
          {statusMessage && (
            <div className="mt-4 text-center animate-fade-in-up">
              <p className="inline-flex items-center gap-2 text-xs tracking-[0.15em] uppercase text-[var(--color-warm-gray)]">
                {isLoading && (
                  <span className="inline-block w-3 h-3 border border-[var(--color-warm-gray)] border-t-transparent rounded-full animate-spin" />
                )}
                {statusMessage}
              </p>
            </div>
          )}
        </div>

        {(figureName || isLoading) && (
          <div className="grid md:grid-cols-2 gap-12 md:gap-16">
            <section className="h-[500px] md:h-[600px]">
              <PlacesMap
                places={places}
                visibleCount={visibleCount}
                onPathAnimationComplete={handlePathAnimationComplete}
              />
            </section>

            <section className="h-[500px] md:h-[600px] overflow-y-auto pr-4">
              <PlacesList
                places={places}
                figureName={figureName}
                error={error}
                isLoading={isLoading}
                visibleCount={visibleCount}
              />
            </section>
          </div>
        )}
      </div>
      </div>
    </main>
  );
}
