"use client";

interface Place {
  name: string;
  years: string;
  description: string;
  lat: number;
  lng: number;
}

interface PlacesListProps {
  places: Place[];
  figureName: string;
  error?: string;
  isLoading: boolean;
  visibleCount: number;
}

export default function PlacesList({
  places,
  figureName,
  error,
  isLoading,
  visibleCount,
}: PlacesListProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-[var(--color-warm-gray)] animate-pulse text-center">
          <div className="w-12 h-12 mx-auto mb-6 border border-[var(--color-warm-gray-light)] rounded-full flex items-center justify-center">
            <div className="w-2 h-2 bg-[var(--color-terracotta)] rounded-full animate-ping"></div>
          </div>
          <p className="text-xs tracking-[0.2em] uppercase">Researching...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-[var(--color-warm-gray)] text-center font-light">{error}</p>
      </div>
    );
  }

  if (!figureName) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-[var(--color-warm-gray-light)] text-center text-lg font-light italic">
          Enter a historical figure to discover where they lived
        </p>
      </div>
    );
  }

  if (places.length === 0 && visibleCount === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-[var(--color-warm-gray-light)] text-center font-light italic">
          Tracing their journey...
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-10">
      <div className="border-b border-[var(--color-warm-gray-light)] pb-6">
        <p className="text-xs tracking-[0.2em] uppercase text-[var(--color-warm-gray)] mb-3">The Journey of</p>
        <h2 className="text-3xl font-serif font-light text-[var(--color-charcoal)] italic">
          {figureName}
        </h2>
      </div>
      <div className="space-y-10">
        {places.slice(0, visibleCount).map((place, index) => (
          <article
            key={index}
            className="group animate-fade-in-up"
            style={{
              animationDelay: `${index * 100}ms`,
            }}
          >
            <div className="flex items-center gap-4 mb-3">
              <span className="text-xs tracking-[0.15em] text-[var(--color-terracotta)] uppercase font-medium">
                {place.years}
              </span>
              <div className="flex-1 h-px bg-[var(--color-warm-gray-light)] opacity-50"></div>
            </div>
            <h3 className="text-xl font-serif font-light text-[var(--color-charcoal)] mb-3">
              {place.name}
            </h3>
            <p className="text-[var(--color-warm-gray)] leading-relaxed font-light">
              {place.description}
            </p>
          </article>
        ))}
      </div>
    </div>
  );
}
