import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { UserProfile, IUserPreferences } from "@/models/UserProfile";
import crypto from "crypto";

export const runtime = "nodejs";

export function generateSuggestedPreferences(candidate: {
  currentRole?: string;
  location?: string;
  experience?: string;
  skills?: string[];
}): IUserPreferences {
  const role = (candidate.currentRole || "").trim();
  const loc = (candidate.location || "").trim();
  const exp = (candidate.experience || "").trim();
  const skills = (candidate.skills || []).map((s) => s.toLowerCase());

  // Suggested roles
  const rolesSet = new Set<string>();
  if (role) rolesSet.add(role);

  if (
    role.toLowerCase().includes("mern") ||
    skills.includes("react") ||
    skills.includes("node.js") ||
    skills.includes("mongodb")
  ) {
    rolesSet.add("MERN Stack Developer");
    rolesSet.add("Full Stack Developer");
    rolesSet.add("React Developer");
    rolesSet.add("Node.js Developer");
  } else if (role.toLowerCase().includes("frontend") || skills.includes("react")) {
    rolesSet.add("Frontend Developer");
    rolesSet.add("React Developer");
    rolesSet.add("Web Developer");
  } else if (role.toLowerCase().includes("backend") || skills.includes("node.js")) {
    rolesSet.add("Backend Developer");
    rolesSet.add("Node.js Developer");
    rolesSet.add("Software Engineer");
  } else {
    rolesSet.add("Full Stack Developer");
    rolesSet.add("Software Engineer");
  }

  // Suggested locations
  const locSet = new Set<string>();
  if (loc) locSet.add(loc);

  const locLower = loc.toLowerCase();
  if (
    locLower.includes("noida") ||
    locLower.includes("delhi") ||
    locLower.includes("gurgaon") ||
    locLower.includes("gurugram")
  ) {
    locSet.add("Noida");
    locSet.add("Greater Noida");
    locSet.add("Delhi NCR");
    locSet.add("Gurgaon");
  } else if (locLower.includes("bangalore") || locLower.includes("bengaluru")) {
    locSet.add("Bengaluru");
    locSet.add("Remote");
  } else {
    locSet.add("Remote");
  }

  return {
    preferredRoles: Array.from(rolesSet),
    preferredLocations: Array.from(locSet),
    radiusKm: 50,
    preferredWorkModes: ["Remote", "Hybrid", "Onsite"],
    preferredEmploymentTypes: ["Full-Time"],
    minimumExperience: "0 years",
    maximumExperience: exp || "3 years",
    preferredShift: "Day Shift",
    minimumSalary: null,
    jobDiscoveryEnabled: true,
  };
}

export async function GET(request: NextRequest) {
  try {
    await connectToDatabase();
    const userId = request.nextUrl.searchParams.get("userId") || "default_candidate";

    const profile = await UserProfile.findOne({ userId });
    if (!profile) {
      return NextResponse.json({
        success: true,
        exists: false,
        preferences: null,
      });
    }

    return NextResponse.json({
      success: true,
      exists: true,
      profile: {
        userId: profile.userId,
        name: profile.name,
        email: profile.email,
        phone: profile.phone,
        location: profile.location,
        currentRole: profile.currentRole,
        experience: profile.experience,
        skills: profile.skills,
        summary: profile.summary,
        preferences: profile.preferences,
        lastJobDiscoveryAt: profile.lastJobDiscoveryAt,
        lastJobDiscoveryStatus: profile.lastJobDiscoveryStatus,
        lastJobDiscoveryError: profile.lastJobDiscoveryError,
      },
    });
  } catch (error) {
    console.error("GET /api/jobs/preferences error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch preferences" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectToDatabase();
    const body = await request.json();
    const { candidate, preferences, action } = body;

    const email = candidate?.email || "candidate@example.com";
    const userId = body.userId || email;

    if (action === "suggest") {
      const suggested = generateSuggestedPreferences(candidate || {});
      return NextResponse.json({
        success: true,
        suggested,
      });
    }

    // Hash profile content to detect changes and invalidate AI cache if candidate edits resume
    const profileContent = JSON.stringify({
      skills: candidate?.skills,
      experience: candidate?.experience,
      currentRole: candidate?.currentRole,
      summary: candidate?.summary,
    });
    const profileVersion = crypto
      .createHash("md5")
      .update(profileContent)
      .digest("hex")
      .slice(0, 8);

    const updated = await UserProfile.findOneAndUpdate(
      { userId },
      {
        $set: {
          userId,
          name: candidate?.name || "",
          email: candidate?.email || "",
          phone: candidate?.phone || "",
          location: candidate?.location || "",
          currentRole: candidate?.currentRole || "",
          experience: candidate?.experience || "",
          skills: candidate?.skills || [],
          education: candidate?.education || [],
          projects: candidate?.projects || [],
          summary: candidate?.summary || "",
          preferences: preferences || generateSuggestedPreferences(candidate || {}),
          profileVersion,
          isActive: true,
          updatedAt: new Date(),
        },
      },
      { upsert: true, new: true }
    );

    return NextResponse.json({
      success: true,
      profile: updated,
    });
  } catch (error) {
    console.error("POST /api/jobs/preferences error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to save preferences" },
      { status: 500 }
    );
  }
}
