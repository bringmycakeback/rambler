"use client";

import { useState, useEffect } from "react";

interface Model {
  id: string;
  name: string;
}

interface ModelSelectorProps {
  selectedModel: string;
  onModelChange: (model: string) => void;
}

export default function ModelSelector({
  selectedModel,
  onModelChange,
}: ModelSelectorProps) {
  const [models, setModels] = useState<Model[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchModels() {
      try {
        const response = await fetch("/api/models");
        const data = await response.json();

        if (data.error) {
          setError(data.error);
        } else {
          setModels(data.models);
        }
      } catch {
        setError("Failed to load models");
      } finally {
        setIsLoading(false);
      }
    }

    fetchModels();
  }, []);

  if (isLoading) {
    return (
      <div className="text-xs tracking-[0.1em] text-[var(--color-warm-gray-light)]">
        Loading...
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-xs text-[var(--color-terracotta)]">{error}</div>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <label className="text-xs tracking-[0.1em] uppercase text-[var(--color-warm-gray)]">
        Model
      </label>
      <select
        value={selectedModel}
        onChange={(e) => onModelChange(e.target.value)}
        className="text-xs bg-transparent border-b border-[var(--color-warm-gray-light)]
                   px-0 py-1 text-[var(--color-charcoal)]
                   focus:outline-none focus:border-[var(--color-charcoal)]
                   cursor-pointer appearance-none pr-4"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='8' height='8' viewBox='0 0 8 8'%3E%3Cpath fill='%236b6966' d='M0 2l4 4 4-4z'/%3E%3C/svg%3E")`,
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'right center',
        }}
      >
        {models.map((model) => (
          <option key={model.id} value={model.id}>
            {model.name}
          </option>
        ))}
      </select>
    </div>
  );
}
