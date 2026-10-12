// import { NextResponse } from "next/server";
// import { getGoogleAuthUrl } from "@/lib/gmail";

// export const runtime = "nodejs";

// export async function GET() {
//   try {
//     const url = getGoogleAuthUrl();

//     return NextResponse.redirect(url);
//   } catch (error) {
//     console.error("Google auth error:", error);

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

import { NextResponse } from "next/server";
import { getGoogleAuthUrl } from "@/lib/gmail";

export const runtime = "nodejs";

export async function GET() {
  try {
    const url = getGoogleAuthUrl();

    return NextResponse.redirect(url);
  } catch (error) {
    console.error("Google auth error:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Google authentication failed",
        details:
          error instanceof Error
            ? error.message
            : "Unknown error",
      },
      {
        status: 500,
      }
    );
  }
}