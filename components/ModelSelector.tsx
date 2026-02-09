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
      <div className="text-sm text-stone-400">Loading models...</div>
    );
  }

  if (error) {
    return (
      <div className="text-sm text-red-500">{error}</div>
    );
  }

  return (
    <select
      value={selectedModel}
      onChange={(e) => onModelChange(e.target.value)}
      className="text-sm bg-stone-100 border border-stone-300 rounded px-2 py-1 text-stone-700 focus:outline-none focus:border-stone-400 cursor-pointer"
    >
      {models.map((model) => (
        <option key={model.id} value={model.id}>
          {model.name}
        </option>
      ))}
    </select>
  );
}
