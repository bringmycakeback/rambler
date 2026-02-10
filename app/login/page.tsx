"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!password.trim() || isLoading) return;

    setIsLoading(true);
    setError("");

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      if (response.ok) {
        router.push("/");
      } else {
        setError("Incorrect password");
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[var(--color-cream)] relative flex items-center justify-center">
      <div
        className="absolute inset-x-0 top-0 h-[70vh] pointer-events-none"
        style={{
          backgroundImage: `url('/old-map-bg.jpg')`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          opacity: 0.12,
          maskImage:
            "linear-gradient(to bottom, black 0%, black 40%, transparent 100%)",
          WebkitMaskImage:
            "linear-gradient(to bottom, black 0%, black 40%, transparent 100%)",
        }}
      />
      <div className="relative z-10 w-full max-w-sm mx-auto px-8">
        <div className="text-center mb-12">
          <p className="text-xs tracking-[0.3em] uppercase text-[var(--color-warm-gray)] mb-6">
            A Journey Through Time
          </p>
          <h1 className="text-4xl font-serif font-light text-[var(--color-charcoal)] mb-4 tracking-tight">
            Rambler
          </h1>
          <p className="text-[var(--color-warm-gray)] text-sm font-light">
            Enter password to continue
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          <div className="space-y-3">
            <label
              htmlFor="password"
              className="block text-xs tracking-[0.2em] uppercase text-[var(--color-warm-gray)]"
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password..."
              disabled={isLoading}
              autoFocus
              className="w-full px-0 py-4 text-xl font-light border-b border-[var(--color-warm-gray-light)] bg-transparent
                         placeholder-[var(--color-warm-gray-light)] text-[var(--color-charcoal)]
                         focus:outline-none focus:border-[var(--color-charcoal)]
                         disabled:opacity-50"
            />
          </div>

          {error && (
            <p className="text-sm text-[var(--color-terracotta)] animate-fade-in-up">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={!password.trim() || isLoading}
            className="w-full py-4 px-8 text-xs tracking-[0.2em] uppercase
                       bg-[var(--color-terracotta)] text-white
                       hover:bg-[var(--color-terracotta-dark)]
                       disabled:bg-[var(--color-warm-gray-light)] disabled:cursor-not-allowed"
          >
            {isLoading ? "Signing in..." : "Enter"}
          </button>
        </form>
      </div>
    </main>
  );
}
