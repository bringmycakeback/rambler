import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextRequest, NextResponse } from "next/server";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

export async function POST(request: NextRequest) {
  try {
    const { name, model: modelId } = await request.json();

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

    const model = genAI.getGenerativeModel({ model: modelId || "gemini-2.0-flash" });

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

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    // Parse the JSON response
    const cleanedText = text.replace(/```json\n?|\n?```/g, "").trim();
    const data = JSON.parse(cleanedText);

    return NextResponse.json(data);
  } catch (error) {
    console.error("Error calling Gemini API:", error);

    const errorMessage = error instanceof Error ? error.message : "";

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
  }
}
