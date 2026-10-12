import { NextRequest, NextResponse } from "next/server";
import { getGoogleOAuthClient } from "@/lib/gmail";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    console.log("=== GOOGLE CALLBACK START ===");

    const code = request.nextUrl.searchParams.get("code");

    if (!code) {
      return NextResponse.json(
        {
          success: false,
          error: "Authorization code missing",
        },
        { status: 400 }
      );
    }

    const client = getGoogleOAuthClient();

    const { tokens } = await client.getToken(code);

    console.log("Google tokens received");

    const response = NextResponse.redirect(
      new URL("/", request.url)
    );

    if (tokens.refresh_token) {
      response.cookies.set(
        "gmail_refresh_token",
        tokens.refresh_token,
        {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "lax",
          path: "/",
          maxAge: 60 * 60 * 24 * 30,
        }
      );
    }

    console.log("=== GOOGLE CALLBACK SUCCESS ===");

    return response;
  } catch (error) {
    console.error("GOOGLE CALLBACK ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Google authentication failed",
        details:
          error instanceof Error
            ? error.message
            : "Unknown error",
      },
      { status: 500 }
    );
  }
}