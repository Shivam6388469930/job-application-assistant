
import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

import { connectToDatabase } from "@/lib/mongodb";
import {
  UserProfile,
  IUserPreferences,
} from "@/models/UserProfile";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

// =========================================================
// TYPES
// =========================================================

interface Candidate {
  userId?: string;

  name?: string;
  email?: string;
  phone?: string;

  location?: string;
  currentRole?: string;
  experience?: string;

  skills?: string[];

  education?: any[];
  projects?: any[];

  summary?: string;
}

interface PreferencesRequest {
  userId?: string;

  candidate?: Candidate;

  preferences?: Partial<IUserPreferences>;

  action?: string;
}

// =========================================================
// SUGGEST PREFERENCES
// =========================================================

export function generateSuggestedPreferences(
  candidate: Candidate = {}
): IUserPreferences {
  const role =
    typeof candidate.currentRole === "string"
      ? candidate.currentRole.trim()
      : "";

  const location =
    typeof candidate.location === "string"
      ? candidate.location.trim()
      : "";

  const experience =
    typeof candidate.experience === "string"
      ? candidate.experience.trim()
      : "";

  const skills = Array.isArray(candidate.skills)
    ? candidate.skills
        .filter(
          (skill): skill is string =>
            typeof skill === "string"
        )
        .map((skill) =>
          skill.toLowerCase().trim()
        )
    : [];

  // =======================================================
  // ROLES
  // =======================================================

  const rolesSet = new Set<string>();

  if (role) {
    rolesSet.add(role);
  }

  const hasMern =
    role.toLowerCase().includes("mern") ||
    skills.includes("react") ||
    skills.includes("node.js") ||
    skills.includes("node") ||
    skills.includes("mongodb");

  const hasFrontend =
    role.toLowerCase().includes("frontend") ||
    role.toLowerCase().includes("front end") ||
    skills.includes("react");

  const hasBackend =
    role.toLowerCase().includes("backend") ||
    role.toLowerCase().includes("back end") ||
    skills.includes("node.js") ||
    skills.includes("node");

  if (hasMern) {
    rolesSet.add("MERN Stack Developer");
    rolesSet.add("Full Stack Developer");
    rolesSet.add("React Developer");
    rolesSet.add("Node.js Developer");
  } else if (hasFrontend) {
    rolesSet.add("Frontend Developer");
    rolesSet.add("React Developer");
    rolesSet.add("Web Developer");
  } else if (hasBackend) {
    rolesSet.add("Backend Developer");
    rolesSet.add("Node.js Developer");
    rolesSet.add("Software Engineer");
  } else {
    rolesSet.add("Full Stack Developer");
    rolesSet.add("Software Engineer");
  }

  // =======================================================
  // LOCATIONS
  // =======================================================

  const locationSet = new Set<string>();

  if (location) {
    locationSet.add(location);
  }

  const locationLower =
    location.toLowerCase();

  if (
    locationLower.includes("noida") ||
    locationLower.includes("delhi") ||
    locationLower.includes("gurgaon") ||
    locationLower.includes("gurugram")
  ) {
    locationSet.add("Noida");
    locationSet.add("Greater Noida");
    locationSet.add("Delhi NCR");
    locationSet.add("Gurgaon");
  } else if (
    locationLower.includes("bangalore") ||
    locationLower.includes("bengaluru")
  ) {
    locationSet.add("Bengaluru");
    locationSet.add("Remote");
  } else if (
    locationLower.includes("mumbai")
  ) {
    locationSet.add("Mumbai");
    locationSet.add("Remote");
  } else if (
    locationLower.includes("hyderabad")
  ) {
    locationSet.add("Hyderabad");
    locationSet.add("Remote");
  } else {
    locationSet.add("Remote");
  }

  // =======================================================
  // EXPERIENCE
  // =======================================================

  const maximumExperience =
    experience || "3 years";

  // =======================================================
  // RETURN
  // =======================================================

  return {
    preferredRoles:
      Array.from(rolesSet),

    preferredLocations:
      Array.from(locationSet),

    radiusKm: 50,

    preferredWorkModes: [
      "Remote",
      "Hybrid",
      "Onsite",
    ],

    preferredEmploymentTypes: [
      "Full-Time",
    ],

    minimumExperience: "0 years",

    maximumExperience,

    preferredShift: "Day Shift",

    minimumSalary: null,

    jobDiscoveryEnabled: true,
  };
}

// =========================================================
// GET
// =========================================================

export async function GET(
  request: NextRequest
) {
  try {
    await connectToDatabase();

    const userId =
      request.nextUrl.searchParams
        .get("userId")
        ?.trim() || "default_candidate";

    console.log(
      "[preferences][GET] userId:",
      userId
    );

    const profile =
      await UserProfile.findOne({
        userId,
      }).lean();

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

        currentRole:
          profile.currentRole,

        experience:
          profile.experience,

        skills:
          profile.skills,

        education:
          profile.education,

        projects:
          profile.projects,

        summary:
          profile.summary,

        preferences:
          profile.preferences,

        lastJobDiscoveryAt:
          profile.lastJobDiscoveryAt,

        lastJobDiscoveryStatus:
          profile.lastJobDiscoveryStatus,

        lastJobDiscoveryError:
          profile.lastJobDiscoveryError,

        profileVersion:
          profile.profileVersion,
      },
    });
  } catch (error) {
    console.error(
      "[preferences][GET] ERROR:",
      error
    );

    const message =
      error instanceof Error
        ? error.message
        : String(error);

    return NextResponse.json(
      {
        success: false,
        error:
          "Failed to fetch preferences",
        details: message,
      },
      {
        status: 500,
      }
    );
  }
}

// =========================================================
// POST
// =========================================================

export async function POST(
  request: NextRequest
) {
  try {
    // =======================================================
    // DATABASE
    // =======================================================

    await connectToDatabase();

    // =======================================================
    // BODY
    // =======================================================

    let body: PreferencesRequest;

    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid JSON request body",
        },
        {
          status: 400,
        }
      );
    }

    const candidate =
      body?.candidate ?? {};

    const action =
      typeof body?.action === "string"
        ? body.action.trim().toLowerCase()
        : "";

    // =======================================================
    // USER ID
    // =======================================================

    const candidateEmail =
      typeof candidate.email === "string"
        ? candidate.email.trim()
        : "";

    const requestedUserId =
      typeof body.userId === "string"
        ? body.userId.trim()
        : "";

    const userId =
      requestedUserId ||
      candidateEmail ||
      "candidate@example.com";

    console.log(
      "[preferences][POST]",
      {
        action,
        userId,
      }
    );

    // =======================================================
    // SUGGEST ONLY
    // =======================================================

    if (action === "suggest") {
      const suggested =
        generateSuggestedPreferences(
          candidate
        );

      return NextResponse.json({
        success: true,
        suggested,
      });
    }

    // =======================================================
    // NORMALIZE ARRAYS
    // =======================================================

    const skills = Array.isArray(
      candidate.skills
    )
      ? candidate.skills.filter(
          (skill): skill is string =>
            typeof skill === "string"
        )
      : [];

    const education =
      Array.isArray(
        candidate.education
      )
        ? candidate.education
        : [];

    const projects =
      Array.isArray(
        candidate.projects
      )
        ? candidate.projects
        : [];

    // =======================================================
    // PROFILE VERSION
    // =======================================================

    const profileContent =
      JSON.stringify({
        name:
          candidate.name ?? "",

        email:
          candidate.email ?? "",

        location:
          candidate.location ?? "",

        currentRole:
          candidate.currentRole ?? "",

        experience:
          candidate.experience ?? "",

        skills,

        summary:
          candidate.summary ?? "",

        education,

        projects,
      });

    const profileVersion =
      crypto
        .createHash("md5")
        .update(profileContent)
        .digest("hex")
        .slice(0, 8);

    // =======================================================
    // PREFERENCES
    // =======================================================

    const suggested =
      generateSuggestedPreferences(
        candidate
      );

    const incomingPreferences =
      body.preferences;

    const finalPreferences: IUserPreferences =
      {
        preferredRoles:
          Array.isArray(
            incomingPreferences
              ?.preferredRoles
          )
            ? incomingPreferences!.preferredRoles!.filter(
                (value): value is string =>
                  typeof value ===
                  "string"
              )
            : suggested.preferredRoles,

        preferredLocations:
          Array.isArray(
            incomingPreferences
              ?.preferredLocations
          )
            ? incomingPreferences!.preferredLocations!.filter(
                (value): value is string =>
                  typeof value ===
                  "string"
              )
            : suggested.preferredLocations,

        radiusKm:
          typeof incomingPreferences
            ?.radiusKm === "number"
            ? incomingPreferences.radiusKm
            : suggested.radiusKm,

        preferredWorkModes:
          Array.isArray(
            incomingPreferences
              ?.preferredWorkModes
          )
            ? incomingPreferences!.preferredWorkModes!.filter(
                (value): value is string =>
                  typeof value ===
                  "string"
              )
            : suggested.preferredWorkModes,

        preferredEmploymentTypes:
          Array.isArray(
            incomingPreferences
              ?.preferredEmploymentTypes
          )
            ? incomingPreferences!.preferredEmploymentTypes!.filter(
                (value): value is string =>
                  typeof value ===
                  "string"
              )
            : suggested.preferredEmploymentTypes,

        minimumExperience:
          typeof incomingPreferences
            ?.minimumExperience ===
          "string"
            ? incomingPreferences.minimumExperience
            : suggested.minimumExperience,

        maximumExperience:
          typeof incomingPreferences
            ?.maximumExperience ===
          "string"
            ? incomingPreferences.maximumExperience
            : suggested.maximumExperience,

        preferredShift:
          typeof incomingPreferences
            ?.preferredShift === "string"
            ? incomingPreferences.preferredShift
            : suggested.preferredShift,

        minimumSalary:
          typeof incomingPreferences
            ?.minimumSalary === "number"
            ? incomingPreferences.minimumSalary
            : null,

        jobDiscoveryEnabled:
          typeof incomingPreferences
            ?.jobDiscoveryEnabled ===
          "boolean"
            ? incomingPreferences.jobDiscoveryEnabled
            : true,
      };

    // =======================================================
    // SAVE PROFILE
    // =======================================================

    const updated =
      await UserProfile.findOneAndUpdate(
        {
          userId,
        },
        {
          $set: {
            userId,

            name:
              typeof candidate.name ===
              "string"
                ? candidate.name
                : "",

            email:
              typeof candidate.email ===
              "string"
                ? candidate.email
                : "",

            phone:
              typeof candidate.phone ===
              "string"
                ? candidate.phone
                : "",

            location:
              typeof candidate.location ===
              "string"
                ? candidate.location
                : "",

            currentRole:
              typeof candidate.currentRole ===
              "string"
                ? candidate.currentRole
                : "",

            experience:
              typeof candidate.experience ===
              "string"
                ? candidate.experience
                : "",

            skills,

            education,

            projects,

            summary:
              typeof candidate.summary ===
              "string"
                ? candidate.summary
                : "",

            preferences:
              finalPreferences,

            profileVersion,

            isActive: true,
          },
        },
        {
          upsert: true,
          new: true,
          runValidators: true,
          setDefaultsOnInsert: true,
        }
      ).lean();

    // =======================================================
    // RESPONSE
    // =======================================================

    return NextResponse.json({
      success: true,

      profile: updated,

      preferences:
        updated?.preferences ??
        finalPreferences,

      profileVersion,
    });
  } catch (error) {
    // =======================================================
    // ERROR
    // =======================================================

    console.error(
      "================================================"
    );

    console.error(
      "[preferences][POST] ERROR"
    );

    console.error(error);

    console.error(
      "================================================"
    );

    const message =
      error instanceof Error
        ? error.message
        : String(error);

    return NextResponse.json(
      {
        success: false,

        error:
          "Failed to save preferences",

        details: message,
      },
      {
        status: 500,
      }
    );
  }
}
