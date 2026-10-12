// import { NextRequest, NextResponse } from "next/server";
// import { getGoogleOAuthClient } from "@/lib/gmail";

// export const runtime = "nodejs";

// export async function GET(request: NextRequest) {
//   try {
//     console.log("=== GOOGLE CALLBACK START ===");

//     const code = request.nextUrl.searchParams.get("code");

//     if (!code) {
//       return NextResponse.json(
//         {
//           success: false,
//           error: "Authorization code missing",
//         },
//         { status: 400 }
//       );
//     }

//     const client = getGoogleOAuthClient();

//     const { tokens } = await client.getToken(code);

//     console.log("Google tokens received");

//     const response = NextResponse.redirect(
//       new URL("/", request.url)
//     );

//     if (tokens.refresh_token) {
//       response.cookies.set(
//         "gmail_refresh_token",
//         tokens.refresh_token,
//         {
//           httpOnly: true,
//           secure: process.env.NODE_ENV === "production",
//           sameSite: "lax",
//           path: "/",
//           maxAge: 60 * 60 * 24 * 30,
//         }
//       );
//     }

//     console.log("=== GOOGLE CALLBACK SUCCESS ===");

//     return response;
//   } catch (error) {
//     console.error("GOOGLE CALLBACK ERROR:", error);

//     return NextResponse.json(
//       {
//         success: false,
//         error: "Google authentication failed",
//         details:
//           error instanceof Error
//             ? error.message
//             : "Unknown error",
//       },
//       { status: 500 }
//     );
//   }
// }

import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";
import { getGoogleOAuthClient } from "@/lib/gmail";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    console.log("=== GOOGLE CALLBACK START ===");

    // =====================================================
    // GET AUTHORIZATION CODE
    // =====================================================

    const code =
      request.nextUrl.searchParams.get("code");

    const googleError =
      request.nextUrl.searchParams.get("error");

    if (googleError) {
      console.error(
        "Google OAuth error:",
        googleError
      );

      return NextResponse.json(
        {
          success: false,
          error: `Google OAuth error: ${googleError}`,
        },
        { status: 400 }
      );
    }

    if (!code) {
      return NextResponse.json(
        {
          success: false,
          error: "Authorization code missing",
        },
        { status: 400 }
      );
    }

    // =====================================================
    // CREATE GOOGLE OAUTH CLIENT
    // =====================================================

    const client = getGoogleOAuthClient();

    // =====================================================
    // EXCHANGE CODE FOR TOKENS
    // =====================================================

    const { tokens } =
      await client.getToken(code);

    console.log(
      "Google tokens received:",
      {
        accessToken: Boolean(
          tokens.access_token
        ),
        refreshToken: Boolean(
          tokens.refresh_token
        ),
      }
    );

    if (!tokens.refresh_token) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Google did not return a refresh token. Please disconnect/revoke Gmail access and connect again.",
        },
        { status: 400 }
      );
    }

    // =====================================================
    // SET TOKENS
    // =====================================================

    client.setCredentials(tokens);

    // =====================================================
    // GET GOOGLE ACCOUNT INFORMATION
    // =====================================================

    const oauth2 = google.oauth2({
      version: "v2",
      auth: client,
    });

    const { data: googleUser } =
      await oauth2.userinfo.get();

    const googleEmail =
      googleUser.email?.trim();

    if (!googleEmail) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Unable to determine Google account email",
        },
        { status: 400 }
      );
    }

    console.log(
      "Google account:",
      googleEmail
    );

    // =====================================================
    // CREATE RESPONSE
    // =====================================================

    const response =
      NextResponse.redirect(
        new URL("/", request.url)
      );

    // =====================================================
    // STORE REFRESH TOKEN
    // =====================================================

    response.cookies.set(
      "gmail_refresh_token",
      tokens.refresh_token,
      {
        httpOnly: true,

        secure:
          process.env.NODE_ENV ===
          "production",

        sameSite: "lax",

        path: "/",

        maxAge:
          60 * 60 * 24 * 30,
      }
    );

    // =====================================================
    // STORE CONNECTED GMAIL ACCOUNT
    // =====================================================

    response.cookies.set(
      "gmail_account",
      googleEmail,
      {
        httpOnly: true,

        secure:
          process.env.NODE_ENV ===
          "production",

        sameSite: "lax",

        path: "/",

        maxAge:
          60 * 60 * 24 * 30,
      }
    );

    console.log(
      "Gmail account connected:",
      googleEmail
    );

    console.log(
      "=== GOOGLE CALLBACK SUCCESS ==="
    );

    return response;
  } catch (error) {
    console.error(
      "================================"
    );

    console.error(
      "GOOGLE CALLBACK ERROR"
    );

    console.error(error);

    console.error(
      "================================"
    );

    return NextResponse.json(
      {
        success: false,
        error:
          "Google authentication failed",
        details:
          error instanceof Error
            ? error.message
            : "Unknown error",
      },
      { status: 500 }
    );
  }
}