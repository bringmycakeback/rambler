"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import SearchInput from "@/components/SearchInput";
import PlacesList from "@/components/PlacesList";

const PlacesMap = dynamic(() => import("@/components/PlacesMap"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full bg-stone-100 flex items-center justify-center rounded-lg min-h-[400px]">
      <p className="text-stone-400">Loading map...</p>
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
      <div className="max-w-6xl mx-auto px-6 py-12 md:py-16">
        <header className="text-center mb-10">
          <h1 className="text-4xl md:text-5xl font-serif text-stone-800 mb-4">
            Historical Places
          </h1>
          <p className="text-stone-500 text-lg max-w-xl mx-auto">
            Discover the places where history&apos;s notable figures lived
          </p>
        </header>

        <div className="max-w-xl mx-auto mb-10">
          <SearchInput onSearch={handleSearch} isLoading={isLoading} />
        </div>

        {(figureName || isLoading) && (
          <div className="grid md:grid-cols-2 gap-8">
            <section className="h-[500px]">
              <PlacesMap places={places} />
            </section>

            <section className="h-[500px] overflow-y-auto">
              <PlacesList
                places={places}
                figureName={figureName}
                error={error}
                isLoading={isLoading}
              />
            </section>
          </div>
        )}
      </div>
    </main>
  );
}
