import { NextResponse } from "next/server";

export async function GET() {
  if (!process.env.GEMINI_API_KEY) {
    return NextResponse.json(
      { error: "Gemini API key not configured" },
      { status: 500 }
    );
  }

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${process.env.GEMINI_API_KEY}`
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch models: ${response.status}`);
    }

    const data = await response.json();

    // Filter to only models that support generateContent
    const models = data.models
      .filter(
        (model: { supportedGenerationMethods: string[]; displayName: string }) =>
          model.supportedGenerationMethods?.includes("generateContent") &&
          model.displayName?.includes("Gemini") &&
          !/robotics|experimental/i.test(model.displayName)
      )
      .map((model: { name: string; displayName: string }) => ({
        id: model.name.replace("models/", ""),
        name: model.displayName,
      }))
      .sort((a: { name: string }, b: { name: string }) =>
        a.name.localeCompare(b.name)
      );

    return NextResponse.json({ models });
  } catch (error) {
    console.error("Error fetching models:", error);
    return NextResponse.json(
      { error: "Failed to fetch models" },
      { status: 500 }
    );
  }
}
