"use client";

import { useState, useEffect, useRef, useCallback, FormEvent } from "react";

interface Suggestion {
  n: string;
  d: string;
  b: number | null;
  y: number | null;
  c?: boolean; // cached in Redis
}

interface SearchInputProps {
  onSearch: (name: string) => void;
  isLoading: boolean;
  defaultValue?: string;
}

export default function SearchInput({ onSearch, isLoading, defaultValue = "" }: SearchInputProps) {
  const [name, setName] = useState(defaultValue);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownId = "suggestions-listbox";

  const fetchSuggestions = useCallback(async (query: string) => {
    if (query.trim().length < 2) {
      setSuggestions([]);
      setShowDropdown(false);
      return;
    }
    try {
      const res = await fetch(`/api/suggest?q=${encodeURIComponent(query.trim())}`);
      const data = await res.json();
      setSuggestions(data.suggestions || []);
      setShowDropdown((data.suggestions || []).length > 0);
      setActiveIndex(-1);
    } catch {
      setSuggestions([]);
      setShowDropdown(false);
    }
  }, []);

  const handleInputChange = (value: string) => {
    setName(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchSuggestions(value), 300);
  };

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const selectSuggestion = (suggestion: Suggestion) => {
    setName(suggestion.n);
    setSuggestions([]);
    setShowDropdown(false);
    onSearch(suggestion.n);
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (activeIndex >= 0 && activeIndex < suggestions.length) {
      selectSuggestion(suggestions[activeIndex]);
      return;
    }
    if (name.trim() && !isLoading) {
      setShowDropdown(false);
      onSearch(name.trim());
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showDropdown || suggestions.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((prev) => (prev > 0 ? prev - 1 : suggestions.length - 1));
    } else if (e.key === "Escape") {
      setShowDropdown(false);
      setActiveIndex(-1);
    }
  };

  const handleBlur = () => {
    // Small delay to allow click events on dropdown items to fire
    setTimeout(() => setShowDropdown(false), 150);
  };

  const handleFocus = () => {
    if (suggestions.length > 0) {
      setShowDropdown(true);
    }
  };

  const formatYears = (b: number | null, y: number | null) => {
    if (b && y) return `${b}–${y}`;
    if (b) return `b. ${b}`;
    if (y) return `d. ${y}`;
    return "";
  };

  return (
    <form onSubmit={handleSubmit} className="w-full">
      <div className="space-y-8">
        <div className="space-y-3 relative">
          <label
            htmlFor="figure-name"
            className="block text-xs tracking-[0.2em] uppercase text-[var(--color-warm-gray)]"
          >
            Historical Figure
          </label>
          <input
            ref={inputRef}
            id="figure-name"
            type="text"
            value={name}
            onChange={(e) => handleInputChange(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={handleBlur}
            onFocus={handleFocus}
            placeholder="Enter a name..."
            disabled={isLoading}
            autoComplete="off"
            role="combobox"
            aria-expanded={showDropdown}
            aria-controls={dropdownId}
            aria-activedescendant={activeIndex >= 0 ? `suggestion-${activeIndex}` : undefined}
            className="w-full px-0 py-4 text-xl font-light border-b border-[var(--color-warm-gray-light)] bg-transparent
                       placeholder-[var(--color-warm-gray-light)] text-[var(--color-charcoal)]
                       focus:outline-none focus:border-[var(--color-charcoal)]
                       disabled:opacity-50"
          />
          {showDropdown && suggestions.length > 0 && (
            <ul
              id={dropdownId}
              role="listbox"
              className="absolute left-0 right-0 top-full mt-1 bg-[var(--color-cream)] border border-[var(--color-warm-gray-light)] shadow-lg max-h-[360px] overflow-y-auto"
              style={{ zIndex: 10000 }}
            >
              {suggestions.map((s, i) => (
                <li
                  key={i}
                  id={`suggestion-${i}`}
                  role="option"
                  aria-selected={i === activeIndex}
                  onMouseDown={(e) => {
                    e.preventDefault(); // Prevent blur before click
                    selectSuggestion(s);
                  }}
                  className={`px-4 py-3 cursor-pointer border-b border-[var(--color-warm-gray-light)] last:border-b-0 transition-colors
                    ${i === activeIndex ? "bg-[var(--color-cream-dark)]" : "hover:bg-[var(--color-cream-dark)]"}`}
                >
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="text-[var(--color-charcoal)] font-medium truncate">
                      {s.n}
                      {s.c && <span className="text-green-600 ml-1.5" title="Cached">&#10003;</span>}
                    </span>
                    {(s.b || s.y) && (
                      <span className="text-xs text-[var(--color-terracotta)] whitespace-nowrap flex-shrink-0">
                        {formatYears(s.b, s.y)}
                      </span>
                    )}
                  </div>
                  {s.d && (
                    <p className="text-xs text-[var(--color-warm-gray)] mt-0.5 truncate">
                      {s.d}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          )}
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
