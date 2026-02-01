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
        <div className="text-stone-400 animate-pulse">
          <svg
            className="w-8 h-8 mx-auto mb-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1}
              d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1}
              d="M9 12l2 2 4-4"
            />
          </svg>
          <p className="text-sm uppercase tracking-wider">Researching...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-stone-500 text-center">{error}</p>
      </div>
    );
  }

  if (!figureName) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-stone-400 text-center text-lg italic">
          Enter a historical figure to discover where they lived
        </p>
      </div>
    );
  }

  if (places.length === 0 && visibleCount === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-stone-400 text-center italic">
          Tracing their journey...
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <h2 className="text-2xl font-serif text-stone-800 border-b border-stone-200 pb-4">
        Places of <span className="italic">{figureName}</span>
      </h2>
      <div className="space-y-6">
        {places.slice(0, visibleCount).map((place, index) => (
          <article
            key={index}
            className="group border-l-2 border-stone-200 pl-6 py-2
                       hover:border-stone-400 transition-all duration-500
                       animate-fade-in-up"
            style={{
              animationDelay: `${index * 100}ms`,
            }}
          >
            <div className="flex items-baseline justify-between mb-2">
              <h3 className="text-lg font-medium text-stone-800">{place.name}</h3>
              <span className="text-sm text-stone-500 font-mono">{place.years}</span>
            </div>
            <p className="text-stone-600 leading-relaxed">{place.description}</p>
          </article>
        ))}
      </div>
    </div>
  );
}
