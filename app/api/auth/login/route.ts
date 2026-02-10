import { NextRequest, NextResponse } from "next/server";
import { createSession } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const { password } = await request.json();
    const authPassword = process.env.AUTH_PASSWORD;

    if (!authPassword) {
      return NextResponse.json({ error: "Auth not configured" }, { status: 500 });
    }

    if (password !== authPassword) {
      return NextResponse.json({ error: "Incorrect password" }, { status: 401 });
    }

    const sessionId = await createSession();
    if (!sessionId) {
      return NextResponse.json({ error: "Failed to create session" }, { status: 500 });
    }

    const response = NextResponse.json({ success: true });
    response.cookies.set("rambler-auth", sessionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    return response;
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
