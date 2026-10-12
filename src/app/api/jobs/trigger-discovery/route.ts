import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { UserProfile } from "@/models/UserProfile";
import { runJobDiscoveryForUser } from "@/lib/job-discovery-engine";
import { generateSuggestedPreferences } from "../preferences/route";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(request: NextRequest) {
  try {
    await connectToDatabase();
    const body = await request.json().catch(() => ({}));
    const userId = body.userId || "default_candidate";
    const candidateProfile = body.candidateProfile;

    let user = await UserProfile.findOne({ userId });

    // If user profile is not yet in MongoDB, create it from candidateProfile payload
    if (!user && candidateProfile) {
      const prefs = generateSuggestedPreferences(candidateProfile);
      user = await UserProfile.create({
        userId,
        name: candidateProfile.name || "",
        email: candidateProfile.email || "",
        phone: candidateProfile.phone || "",
        location: candidateProfile.location || "",
        currentRole: candidateProfile.currentRole || "",
        experience: candidateProfile.experience || "",
        skills: candidateProfile.skills || [],
        education: candidateProfile.education || [],
        projects: candidateProfile.projects || [],
        summary: candidateProfile.summary || "",
        preferences: prefs,
        isActive: true,
      });
    }

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: "Candidate profile not found. Please upload a resume first.",
        },
        { status: 404 }
      );
    }

    console.log(`[ManualTrigger] Running job discovery for user: ${userId}`);
    const result = await runJobDiscoveryForUser(user);

    return NextResponse.json({
      success: true,
      result,
    });
  } catch (error) {
    console.error("POST /api/jobs/trigger-discovery error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to run job discovery",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
