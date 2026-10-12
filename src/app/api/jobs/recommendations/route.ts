// import { NextRequest, NextResponse } from "next/server";
// import { connectToDatabase } from "@/lib/mongodb";
// import { JobRecommendation } from "@/models/JobRecommendation";
// import { Job } from "@/models/Job";
// import { UserProfile } from "@/models/UserProfile";

// export const runtime = "nodejs";
// export const dynamic = "force-dynamic";
// export const revalidate = 0;

// export async function GET(request: NextRequest) {
//   try {
//     await connectToDatabase();

//     const { searchParams } = request.nextUrl;

//     const userId =
//       searchParams.get("userId")?.trim() || "default_candidate";

//     const sortBy =
//       searchParams.get("sortBy")?.trim() || "relevance";

//     const workMode = searchParams.get("workMode");
//     const status = searchParams.get("status");
//     const minSalary = searchParams.get("minSalary");
//     const role = searchParams.get("role");
//     const location = searchParams.get("location");

//     console.log("GET /api/jobs/recommendations", {
//       userId,
//       sortBy,
//       workMode,
//       status,
//       minSalary,
//       role,
//       location,
//     });

//     // ---------------------------------------------------------
//     // Recommendation query
//     // ---------------------------------------------------------

//     const recQuery: Record<string, any> = {
//       userId,
//     };

//     if (status && status !== "all") {
//       if (status === "active") {
//         recQuery.status = {
//           $ne: "DISMISSED",
//         };
//       } else {
//         recQuery.status = status;
//       }
//     }

//     // ---------------------------------------------------------
//     // Fetch recommendations
//     // ---------------------------------------------------------

//     let recommendations = await JobRecommendation.find(recQuery)
//       .populate({
//         path: "jobId",
//         model: Job,
//       })
//       .lean();

//     console.log(
//       "Recommendations found:",
//       recommendations.length
//     );

//     // ---------------------------------------------------------
//     // Remove recommendations with deleted/missing jobs
//     // ---------------------------------------------------------

//     recommendations = recommendations.filter(
//       (rec: any) => rec.jobId
//     );

//     // ---------------------------------------------------------
//     // Work mode
//     // ---------------------------------------------------------

//     if (workMode && workMode !== "all") {
//       const workModeLower = workMode.toLowerCase();

//       recommendations = recommendations.filter((rec: any) => {
//         const job = rec.jobId;

//         return (
//           typeof job.workMode === "string" &&
//           job.workMode.toLowerCase() === workModeLower
//         );
//       });
//     }

//     // ---------------------------------------------------------
//     // Role
//     // ---------------------------------------------------------

//     if (role?.trim()) {
//       const roleLower = role.toLowerCase().trim();

//       recommendations = recommendations.filter((rec: any) => {
//         const job = rec.jobId;

//         const title =
//           typeof job.title === "string"
//             ? job.title.toLowerCase()
//             : "";

//         return title.includes(roleLower);
//       });
//     }

//     // ---------------------------------------------------------
//     // Location
//     // ---------------------------------------------------------

//     if (location?.trim()) {
//       const locationLower = location.toLowerCase().trim();

//       recommendations = recommendations.filter((rec: any) => {
//         const job = rec.jobId;

//         const jobLocation =
//           typeof job.location === "string"
//             ? job.location.toLowerCase()
//             : "";

//         const city =
//           typeof job.city === "string"
//             ? job.city.toLowerCase()
//             : "";

//         return (
//           jobLocation.includes(locationLower) ||
//           city.includes(locationLower)
//         );
//       });
//     }

//     // ---------------------------------------------------------
//     // Minimum salary
//     // ---------------------------------------------------------

//     if (minSalary) {
//       const minVal = Number(minSalary);

//       if (!Number.isNaN(minVal)) {
//         recommendations = recommendations.filter((rec: any) => {
//           const salary = rec.jobId?.salary;

//           if (!salary) {
//             return true;
//           }

//           const salaryMin = Number(salary.min || 0);
//           const salaryMax = Number(salary.max || 0);

//           const effectiveSalary =
//             salaryMin > 0 ? salaryMin : salaryMax;

//           if (!effectiveSalary) {
//             return true;
//           }

//           return effectiveSalary >= minVal;
//         });
//       }
//     }

//     // ---------------------------------------------------------
//     // Sorting
//     // ---------------------------------------------------------

//     recommendations.sort((a: any, b: any) => {
//       if (sortBy === "relevance") {
//         return (
//           Number(b.relevanceScore || 0) -
//           Number(a.relevanceScore || 0)
//         );
//       }

//       if (sortBy === "shortlist") {
//         return (
//           Number(b.shortlistChance || 0) -
//           Number(a.shortlistChance || 0)
//         );
//       }

//       if (sortBy === "distance") {
//         const distA = Number(a.distanceKm ?? 999999);
//         const distB = Number(b.distanceKm ?? 999999);

//         return distA - distB;
//       }

//       if (sortBy === "newest") {
//         const dateA = new Date(
//           a.discoveredAt ||
//             a.createdAt ||
//             0
//         ).getTime();

//         const dateB = new Date(
//           b.discoveredAt ||
//             b.createdAt ||
//             0
//         ).getTime();

//         return dateB - dateA;
//       }

//       return 0;
//     });

//     // ---------------------------------------------------------
//     // New recommendation count
//     // ---------------------------------------------------------

//     const newCount =
//       await JobRecommendation.countDocuments({
//         userId,
//         status: "NEW",
//       });

//     // ---------------------------------------------------------
//     // User profile
//     // ---------------------------------------------------------

//     const userProfile =
//       await UserProfile.findOne({
//         userId,
//       }).lean();

//     // ---------------------------------------------------------
//     // Response
//     // ---------------------------------------------------------

//     return NextResponse.json({
//       success: true,
//       total: recommendations.length,
//       newCount,

//       lastDiscoveryAt:
//         userProfile?.lastJobDiscoveryAt || null,

//       lastDiscoveryStatus:
//         userProfile?.lastJobDiscoveryStatus || "idle",

//       recommendations,
//     });
//   } catch (error) {
//     console.error(
//       "GET /api/jobs/recommendations error:",
//       error
//     );

//     const message =
//       error instanceof Error
//         ? error.message
//         : "Unknown error";

//     return NextResponse.json(
//       {
//         success: false,
//         error: "Failed to fetch job recommendations",
//         details: message,
//       },
//       {
//         status: 500,
//       }
//     );
//   }
// }



import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";

import { connectToDatabase } from "@/lib/mongodb";

// IMPORTANT:
// Import Job model so Mongoose registers the "Job" model
// before populate("jobId") is executed.
import "@/models/Job";

import { JobRecommendation } from "@/models/JobRecommendation";
import { UserProfile } from "@/models/UserProfile";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: NextRequest) {
  try {
    // =========================================================
    // DATABASE CONNECTION
    // =========================================================

    await connectToDatabase();

    console.log(
      "[recommendations] MongoDB readyState:",
      mongoose.connection.readyState
    );

    console.log(
      "[recommendations] Registered models:",
      mongoose.modelNames()
    );

    // =========================================================
    // QUERY PARAMETERS
    // =========================================================

    const { searchParams } = request.nextUrl;

    const userId =
      searchParams.get("userId")?.trim() ||
      "default_candidate";

    const sortBy =
      searchParams.get("sortBy")?.trim() ||
      "relevance";

    const workMode =
      searchParams.get("workMode")?.trim() || null;

    const status =
      searchParams.get("status")?.trim() || null;

    const minSalary =
      searchParams.get("minSalary")?.trim() || null;

    const role =
      searchParams.get("role")?.trim() || null;

    const location =
      searchParams.get("location")?.trim() || null;

    console.log(
      "[recommendations] Request params:",
      {
        userId,
        sortBy,
        workMode,
        status,
        minSalary,
        role,
        location,
      }
    );

    // =========================================================
    // RECOMMENDATION QUERY
    // =========================================================

    const recQuery: Record<string, unknown> = {
      userId,
    };

    if (status && status.toLowerCase() !== "all") {
      if (status.toLowerCase() === "active") {
        recQuery.status = {
          $ne: "DISMISSED",
        };
      } else {
        recQuery.status = status.toUpperCase();
      }
    }

    console.log(
      "[recommendations] Mongo query:",
      recQuery
    );

    // =========================================================
    // FETCH RECOMMENDATIONS
    // =========================================================

    let recommendations =
      await JobRecommendation.find(recQuery)
        .populate("jobId")
        .lean();

    console.log(
      "[recommendations] Found:",
      recommendations.length
    );

    // =========================================================
    // REMOVE RECOMMENDATIONS WHERE JOB NO LONGER EXISTS
    // =========================================================

    recommendations = recommendations.filter(
      (rec: any) => rec?.jobId
    );

    // =========================================================
    // WORK MODE FILTER
    // =========================================================

    if (
      workMode &&
      workMode.toLowerCase() !== "all"
    ) {
      const workModeLower =
        workMode.toLowerCase();

      recommendations =
        recommendations.filter((rec: any) => {
          const job = rec?.jobId;

          if (!job) {
            return false;
          }

          const jobWorkMode =
            typeof job.workMode === "string"
              ? job.workMode.toLowerCase()
              : "";

          return (
            jobWorkMode === workModeLower
          );
        });
    }

    // =========================================================
    // ROLE FILTER
    // =========================================================

    if (role) {
      const roleLower =
        role.toLowerCase();

      recommendations =
        recommendations.filter((rec: any) => {
          const job = rec?.jobId;

          if (!job) {
            return false;
          }

          const title =
            typeof job.title === "string"
              ? job.title.toLowerCase()
              : "";

          return title.includes(roleLower);
        });
    }

    // =========================================================
    // LOCATION FILTER
    // =========================================================

    if (location) {
      const locationLower =
        location.toLowerCase();

      recommendations =
        recommendations.filter((rec: any) => {
          const job = rec?.jobId;

          if (!job) {
            return false;
          }

          const jobLocation =
            typeof job.location === "string"
              ? job.location.toLowerCase()
              : "";

          const city =
            typeof job.city === "string"
              ? job.city.toLowerCase()
              : "";

          const state =
            typeof job.state === "string"
              ? job.state.toLowerCase()
              : "";

          return (
            jobLocation.includes(
              locationLower
            ) ||
            city.includes(locationLower) ||
            state.includes(locationLower)
          );
        });
    }

    // =========================================================
    // MINIMUM SALARY FILTER
    // =========================================================

    if (minSalary) {
      const minVal = Number(minSalary);

      if (
        Number.isFinite(minVal)
      ) {
        recommendations =
          recommendations.filter(
            (rec: any) => {
              const salary =
                rec?.jobId?.salary;

              // If salary doesn't exist,
              // don't remove the recommendation.
              if (!salary) {
                return true;
              }

              const salaryMin =
                Number(
                  salary.min ?? 0
                );

              const salaryMax =
                Number(
                  salary.max ?? 0
                );

              const effectiveSalary =
                salaryMin > 0
                  ? salaryMin
                  : salaryMax;

              // Unknown salary => keep job
              if (
                !effectiveSalary ||
                !Number.isFinite(
                  effectiveSalary
                )
              ) {
                return true;
              }

              return (
                effectiveSalary >= minVal
              );
            }
          );
      }
    }

    // =========================================================
    // SORT
    // =========================================================

    recommendations.sort(
      (a: any, b: any) => {
        switch (sortBy) {
          // ---------------------------------------------------
          // RELEVANCE
          // ---------------------------------------------------

          case "relevance":
            return (
              Number(
                b?.relevanceScore ?? 0
              ) -
              Number(
                a?.relevanceScore ?? 0
              )
            );

          // ---------------------------------------------------
          // SHORTLIST
          // ---------------------------------------------------

          case "shortlist":
            return (
              Number(
                b?.shortlistChance ?? 0
              ) -
              Number(
                a?.shortlistChance ?? 0
              )
            );

          // ---------------------------------------------------
          // DISTANCE
          // ---------------------------------------------------

          case "distance": {
            const distanceA =
              Number(
                a?.distanceKm ??
                  999999
              );

            const distanceB =
              Number(
                b?.distanceKm ??
                  999999
              );

            return (
              distanceA - distanceB
            );
          }

          // ---------------------------------------------------
          // NEWEST
          // ---------------------------------------------------

          case "newest": {
            const timeA =
              new Date(
                a?.discoveredAt ??
                  a?.createdAt ??
                  0
              ).getTime();

            const timeB =
              new Date(
                b?.discoveredAt ??
                  b?.createdAt ??
                  0
              ).getTime();

            return timeB - timeA;
          }

          default:
            return 0;
        }
      }
    );

    // =========================================================
    // NEW RECOMMENDATION COUNT
    // =========================================================

    const newCount =
      await JobRecommendation.countDocuments(
        {
          userId,
          status: "NEW",
        }
      );

    // =========================================================
    // USER PROFILE
    // =========================================================

    let userProfile: any = null;

    try {
      userProfile =
        await UserProfile.findOne({
          userId,
        }).lean();
    } catch (profileError) {
      // Profile failure should not make
      // recommendations API fail.
      console.error(
        "[recommendations] UserProfile error:",
        profileError
      );
    }

    // =========================================================
    // RESPONSE
    // =========================================================

    return NextResponse.json({
      success: true,

      total:
        recommendations.length,

      newCount,

      lastDiscoveryAt:
        userProfile?.lastJobDiscoveryAt ??
        null,

      lastDiscoveryStatus:
        userProfile?.lastJobDiscoveryStatus ??
        "idle",

      recommendations,
    });
  } catch (error) {
    // =========================================================
    // ERROR
    // =========================================================

    console.error(
      "================================================"
    );

    console.error(
      "[recommendations] API ERROR"
    );

    console.error(
      error
    );

    console.error(
      "Registered Mongoose models:",
      mongoose.modelNames()
    );

    console.error(
      "MongoDB readyState:",
      mongoose.connection.readyState
    );

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
          "Failed to fetch job recommendations",

        details: message,
      },
      {
        status: 500,
      }
    );
  }
}
