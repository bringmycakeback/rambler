"use client";

import { useState, FormEvent } from "react";

interface SearchInputProps {
  onSearch: (name: string) => void;
  isLoading: boolean;
}

export default function SearchInput({ onSearch, isLoading }: SearchInputProps) {
  const [name, setName] = useState("");

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (name.trim() && !isLoading) {
      onSearch(name.trim());
    }
  };

  return (
    <form onSubmit={handleSubmit} className="w-full">
      <div className="space-y-8">
        <div className="space-y-3">
          <label
            htmlFor="figure-name"
            className="block text-xs tracking-[0.2em] uppercase text-[var(--color-warm-gray)]"
          >
            Historical Figure
          </label>
          <input
            id="figure-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter a name..."
            disabled={isLoading}
            className="w-full px-0 py-4 text-xl font-light border-b border-[var(--color-warm-gray-light)] bg-transparent
                       placeholder-[var(--color-warm-gray-light)] text-[var(--color-charcoal)]
                       focus:outline-none focus:border-[var(--color-charcoal)]
                       disabled:opacity-50"
          />
        </div>
        <button
          type="submit"
          disabled={!name.trim() || isLoading}
          className="w-full py-4 px-8 text-xs tracking-[0.2em] uppercase
                     bg-[var(--color-terracotta)] text-white
                     hover:bg-[var(--color-terracotta-dark)]
                     disabled:bg-[var(--color-warm-gray-light)] disabled:cursor-not-allowed"
        >
          {isLoading ? "Searching..." : "Discover Places"}
        </button>
      </div>
    </form>
  );
}
