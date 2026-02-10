import { NextRequest, NextResponse } from "next/server";
import { deleteSession } from "@/lib/auth";

export async function POST(request: NextRequest) {
  const sessionId = request.cookies.get("rambler-auth")?.value;

  if (sessionId) {
    await deleteSession(sessionId);
  }

  const response = NextResponse.json({ success: true });
  response.cookies.set("rambler-auth", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });

  return response;
}
