"use client";

import { useState } from "react";
import SearchInput from "@/components/SearchInput";
import PlacesList from "@/components/PlacesList";

interface Place {
  name: string;
  years: string;
  description: string;
}

export default function Home() {
  const [places, setPlaces] = useState<Place[]>([]);
  const [figureName, setFigureName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSearch = async (name: string) => {
    setIsLoading(true);
    setError("");
    setFigureName(name);
    setPlaces([]);

    try {
      const response = await fetch("/api/places", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch places");
      }

      if (data.error) {
        setError(data.error);
      } else {
        setPlaces(data.places || []);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-stone-50">
      <div className="max-w-6xl mx-auto px-6 py-16 md:py-24">
        <header className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-serif text-stone-800 mb-4">
            Historical Places
          </h1>
          <p className="text-stone-500 text-lg max-w-xl mx-auto">
            Discover the places where history&apos;s notable figures lived and shaped their legacy
          </p>
        </header>

        <div className="grid md:grid-cols-3 gap-12 md:gap-16">
          <aside className="md:col-span-1">
            <SearchInput onSearch={handleSearch} isLoading={isLoading} />
          </aside>

          <section className="md:col-span-2 min-h-[400px]">
            <PlacesList
              places={places}
              figureName={figureName}
              error={error}
              isLoading={isLoading}
            />
          </section>
        </div>
      </div>
    </main>
  );
}
