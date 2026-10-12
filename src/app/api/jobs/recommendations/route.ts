import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { JobRecommendation } from "@/models/JobRecommendation";
import { Job } from "@/models/Job";
import { UserProfile } from "@/models/UserProfile";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: NextRequest) {
  try {
    await connectToDatabase();

    const { searchParams } = request.nextUrl;

    const userId =
      searchParams.get("userId")?.trim() || "default_candidate";

    const sortBy =
      searchParams.get("sortBy")?.trim() || "relevance";

    const workMode = searchParams.get("workMode");
    const status = searchParams.get("status");
    const minSalary = searchParams.get("minSalary");
    const role = searchParams.get("role");
    const location = searchParams.get("location");

    console.log("GET /api/jobs/recommendations", {
      userId,
      sortBy,
      workMode,
      status,
      minSalary,
      role,
      location,
    });

    // ---------------------------------------------------------
    // Recommendation query
    // ---------------------------------------------------------

    const recQuery: Record<string, any> = {
      userId,
    };

    if (status && status !== "all") {
      if (status === "active") {
        recQuery.status = {
          $ne: "DISMISSED",
        };
      } else {
        recQuery.status = status;
      }
    }

    // ---------------------------------------------------------
    // Fetch recommendations
    // ---------------------------------------------------------

    let recommendations = await JobRecommendation.find(recQuery)
      .populate({
        path: "jobId",
        model: Job,
      })
      .lean();

    console.log(
      "Recommendations found:",
      recommendations.length
    );

    // ---------------------------------------------------------
    // Remove recommendations with deleted/missing jobs
    // ---------------------------------------------------------

    recommendations = recommendations.filter(
      (rec: any) => rec.jobId
    );

    // ---------------------------------------------------------
    // Work mode
    // ---------------------------------------------------------

    if (workMode && workMode !== "all") {
      const workModeLower = workMode.toLowerCase();

      recommendations = recommendations.filter((rec: any) => {
        const job = rec.jobId;

        return (
          typeof job.workMode === "string" &&
          job.workMode.toLowerCase() === workModeLower
        );
      });
    }

    // ---------------------------------------------------------
    // Role
    // ---------------------------------------------------------

    if (role?.trim()) {
      const roleLower = role.toLowerCase().trim();

      recommendations = recommendations.filter((rec: any) => {
        const job = rec.jobId;

        const title =
          typeof job.title === "string"
            ? job.title.toLowerCase()
            : "";

        return title.includes(roleLower);
      });
    }

    // ---------------------------------------------------------
    // Location
    // ---------------------------------------------------------

    if (location?.trim()) {
      const locationLower = location.toLowerCase().trim();

      recommendations = recommendations.filter((rec: any) => {
        const job = rec.jobId;

        const jobLocation =
          typeof job.location === "string"
            ? job.location.toLowerCase()
            : "";

        const city =
          typeof job.city === "string"
            ? job.city.toLowerCase()
            : "";

        return (
          jobLocation.includes(locationLower) ||
          city.includes(locationLower)
        );
      });
    }

    // ---------------------------------------------------------
    // Minimum salary
    // ---------------------------------------------------------

    if (minSalary) {
      const minVal = Number(minSalary);

      if (!Number.isNaN(minVal)) {
        recommendations = recommendations.filter((rec: any) => {
          const salary = rec.jobId?.salary;

          if (!salary) {
            return true;
          }

          const salaryMin = Number(salary.min || 0);
          const salaryMax = Number(salary.max || 0);

          const effectiveSalary =
            salaryMin > 0 ? salaryMin : salaryMax;

          if (!effectiveSalary) {
            return true;
          }

          return effectiveSalary >= minVal;
        });
      }
    }

    // ---------------------------------------------------------
    // Sorting
    // ---------------------------------------------------------

    recommendations.sort((a: any, b: any) => {
      if (sortBy === "relevance") {
        return (
          Number(b.relevanceScore || 0) -
          Number(a.relevanceScore || 0)
        );
      }

      if (sortBy === "shortlist") {
        return (
          Number(b.shortlistChance || 0) -
          Number(a.shortlistChance || 0)
        );
      }

      if (sortBy === "distance") {
        const distA = Number(a.distanceKm ?? 999999);
        const distB = Number(b.distanceKm ?? 999999);

        return distA - distB;
      }

      if (sortBy === "newest") {
        const dateA = new Date(
          a.discoveredAt ||
            a.createdAt ||
            0
        ).getTime();

        const dateB = new Date(
          b.discoveredAt ||
            b.createdAt ||
            0
        ).getTime();

        return dateB - dateA;
      }

      return 0;
    });

    // ---------------------------------------------------------
    // New recommendation count
    // ---------------------------------------------------------

    const newCount =
      await JobRecommendation.countDocuments({
        userId,
        status: "NEW",
      });

    // ---------------------------------------------------------
    // User profile
    // ---------------------------------------------------------

    const userProfile =
      await UserProfile.findOne({
        userId,
      }).lean();

    // ---------------------------------------------------------
    // Response
    // ---------------------------------------------------------

    return NextResponse.json({
      success: true,
      total: recommendations.length,
      newCount,

      lastDiscoveryAt:
        userProfile?.lastJobDiscoveryAt || null,

      lastDiscoveryStatus:
        userProfile?.lastJobDiscoveryStatus || "idle",

      recommendations,
    });
  } catch (error) {
    console.error(
      "GET /api/jobs/recommendations error:",
      error
    );

    const message =
      error instanceof Error
        ? error.message
        : "Unknown error";

    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch job recommendations",
        details: message,
      },
      {
        status: 500,
      }
    );
  }
}
