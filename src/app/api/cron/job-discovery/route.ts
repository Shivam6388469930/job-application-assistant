import { NextRequest, NextResponse } from "next/server";
import { runBatchJobDiscovery } from "@/lib/job-discovery-engine";

export const runtime = "nodejs";
export const maxDuration = 300; // Allow 5 minutes on serverless if needed

export async function GET(request: NextRequest) {
  return handleCronRequest(request);
}

export async function POST(request: NextRequest) {
  return handleCronRequest(request);
}

async function handleCronRequest(request: NextRequest) {
  try {
    const cronSecret = process.env.CRON_SECRET;
    const authHeader = request.headers.get("authorization");
    const querySecret = request.nextUrl.searchParams.get("secret");

    // Vercel Cron sends `Authorization: Bearer <CRON_SECRET>` or header `x-vercel-cron`
    const isAuthorized =
      Boolean(cronSecret) &&
      (authHeader === `Bearer ${cronSecret}` ||
        querySecret === cronSecret ||
        (process.env.NODE_ENV !== "production" && !cronSecret));

    if (!isAuthorized) {
      console.warn("[Cron] Unauthorized cron invocation attempt rejected");
      return NextResponse.json(
        {
          success: false,
          error: "Unauthorized: Invalid or missing CRON_SECRET",
        },
        { status: 401 }
      );
    }

    console.log("=== SERVER-SIDE CRON JOB DISCOVERY TRIGGERED ===");
    console.log(`Timestamp: ${new Date().toISOString()}`);

    const summary = await runBatchJobDiscovery();

    return NextResponse.json({
      success: true,
      message: "Job discovery batch completed",
      schedule: "0 */6 * * *",
      summary,
    });
  } catch (error) {
    console.error("[Cron] Unhandled cron execution error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Cron job execution failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
