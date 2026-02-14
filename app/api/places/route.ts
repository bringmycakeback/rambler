import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextRequest, NextResponse } from "next/server";
import {
  getCachedResult,
  cacheResult,
  updateStats,
  isRedisConfigured,
} from "@/lib/redis";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

const FALLBACK_MODELS = [
  "gemini-2.0-flash",
  "gemini-2.5-flash",
  "gemini-2.0-flash-lite",
  "gemini-3.0-flash-preview",
  "gemini-3.0-pro-preview",
];

function isRetryableError(error: unknown): boolean {
  const msg = error instanceof Error ? error.message : String(error);
  return (
    msg.includes("429") ||
    msg.includes("500") ||
    msg.includes("503") ||
    msg.includes("quota") ||
    msg.includes("resource exhausted") ||
    msg.includes("overloaded")
  );
}

async function tryGenerate(
  modelId: string,
  prompt: string
): Promise<{ places: Array<{ name: string; years: string; description: string; lat: number; lng: number }>; error?: string }> {
  const model = genAI.getGenerativeModel({ model: modelId });
  const result = await model.generateContent(prompt);
  const response = await result.response;
  const text = response.text();
  const cleanedText = text.replace(/```json\n?|\n?```/g, "").trim();
  return JSON.parse(cleanedText);
}

export async function POST(request: NextRequest) {
  try {
    const { name, model: modelId } = await request.json();
    const selectedModel = modelId || "gemini-2.0-flash";

    if (!name || typeof name !== "string") {
      return NextResponse.json(
        { error: "Name is required" },
        { status: 400 }
      );
    }

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json(
        { error: "Gemini API key not configured" },
        { status: 500 }
      );
    }

    // Check cache first (if Redis is configured)
    if (isRedisConfigured()) {
      const cached = await getCachedResult(name, selectedModel);
      if (cached) {
        console.log(`Cache hit for "${name}" with model ${selectedModel}`);
        await updateStats(name, selectedModel);
        return NextResponse.json({ places: cached.places, cached: true, model: selectedModel });
      }
    }

    const prompt = `You are a historian. Given the name of a historical figure, return a JSON object listing the places where they lived during their lifetime, in chronological order.

For the historical figure "${name}", return a JSON object with the following structure:
{
  "places": [
    {
      "name": "City, Country",
      "years": "1706-1723",
      "description": "Brief description of their time there (1-2 sentences)",
      "lat": 39.9526,
      "lng": -75.1652
    }
  ]
}

Include accurate latitude and longitude coordinates for each place.

For the final place, mention when and where the person died, and where they are buried if that information is known.

If the person is not a recognized historical figure or you cannot find reliable information, return:
{
  "places": [],
  "error": "Could not find information about this person"
}

Return ONLY the JSON object, no markdown formatting or additional text.`;

    // Build model attempt list: selected model first, then unique fallbacks, capped at 3
    const modelsToTry: string[] = [selectedModel];
    for (const fb of FALLBACK_MODELS) {
      if (modelsToTry.length >= 3) break;
      if (!modelsToTry.includes(fb)) modelsToTry.push(fb);
    }

    let lastError: unknown = null;

    for (let i = 0; i < modelsToTry.length; i++) {
      const currentModel = modelsToTry[i];
      try {
        const data = await tryGenerate(currentModel, prompt);

        // Cache and record stats under the model that actually worked
        if (isRedisConfigured() && data.places && data.places.length > 0) {
          await cacheResult(name, currentModel, data.places);
          await updateStats(name, currentModel);
        }

        return NextResponse.json({ ...data, model: currentModel });
      } catch (error) {
        lastError = error;

        // Only retry on transient/rate-limit errors — bail on parse failures or other errors
        if (!isRetryableError(error)) {
          console.error(`Non-retryable error with model ${currentModel}:`, error);
          break;
        }

        if (i < modelsToTry.length - 1) {
          console.warn(
            `Model ${currentModel} failed (${error instanceof Error ? error.message : error}), ` +
            `retrying with ${modelsToTry[i + 1]}...`
          );
        }
      }
    }

    // All attempts failed — return the last error
    console.error("All model attempts failed:", lastError);
    const errorMessage = lastError instanceof Error ? lastError.message : "";

    if (errorMessage.includes("429") || errorMessage.includes("quota")) {
      return NextResponse.json(
        { error: "API rate limit exceeded. Please wait a moment and try again." },
        { status: 429 }
      );
    }

    return NextResponse.json(
      { error: "Failed to fetch places. Please try again." },
      { status: 500 }
    );
  } catch (error) {
    console.error("Error in places API:", error);
    return NextResponse.json(
      { error: "Failed to fetch places. Please try again." },
      { status: 500 }
    );
  }
}
