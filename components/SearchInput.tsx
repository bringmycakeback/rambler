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
      <div className="space-y-4">
        <label
          htmlFor="figure-name"
          className="block text-sm font-medium text-stone-600 uppercase tracking-wider"
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
          className="w-full px-4 py-3 text-lg border-b-2 border-stone-200 bg-transparent
                     placeholder-stone-400 text-stone-800
                     focus:outline-none focus:border-stone-400
                     transition-colors duration-200
                     disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={!name.trim() || isLoading}
          className="w-full py-3 px-6 text-sm font-medium uppercase tracking-wider
                     bg-stone-800 text-white
                     hover:bg-stone-700
                     disabled:bg-stone-300 disabled:cursor-not-allowed
                     transition-colors duration-200"
        >
          {isLoading ? "Searching..." : "Discover Places"}
        </button>
      </div>
    </form>
  );
}
