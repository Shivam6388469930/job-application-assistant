import { connectToDatabase } from "./mongodb";
import { UserProfile, IUserProfile } from "@/models/UserProfile";
import { Job, IJob } from "@/models/Job";
import { JobRecommendation, IJobRecommendation } from "@/models/JobRecommendation";
import { defaultJobProviderRegistry } from "./job-providers/registry";
import { deduplicateJobs, generateCanonicalHash } from "./deduplication";
import { calculateJobRelevance } from "./relevance-scorer";
import { analyzeJobShortlistChance } from "./ai-shortlist";
import { NormalizedJob } from "./job-providers/types";

export interface UserDiscoveryResult {
  userId: string;
  success: boolean;
  totalFetched: number;
  newRecommendations: number;
  error?: string;
}

export interface BatchDiscoverySummary {
  startedAt: Date;
  completedAt: Date;
  totalUsers: number;
  successfulUsers: number;
  failedUsers: number;
  results: UserDiscoveryResult[];
}

/**
 * Runs discovery pipeline for a single user
 */
export async function runJobDiscoveryForUser(
  user: IUserProfile,
  maxAiAnalysisCount: number = 8
): Promise<UserDiscoveryResult> {
  const userId = user.userId;
  console.log(`[JobDiscovery] Starting discovery for user: ${userId} (${user.name || "Candidate"})`);

  try {
    user.lastJobDiscoveryStatus = "running";
    user.lastJobDiscoveryError = "";
    await user.save();

    // 1. Prepare search query based on preferences and candidate profile
    const preferredRoles =
      user.preferences?.preferredRoles && user.preferences.preferredRoles.length > 0
        ? user.preferences.preferredRoles
        : [user.currentRole || "Full Stack Developer", "Software Engineer"];

    const preferredLocations =
      user.preferences?.preferredLocations && user.preferences.preferredLocations.length > 0
        ? user.preferences.preferredLocations
        : [user.location || "Noida"];

    // 2. Fetch jobs from all active providers
    const rawNormalizedJobs = await defaultJobProviderRegistry.searchAll({
      roles: preferredRoles,
      locations: preferredLocations,
      workModes: user.preferences?.preferredWorkModes,
      limit: 25,
    });

    console.log(`[JobDiscovery] Total raw jobs gathered: ${rawNormalizedJobs.length}`);

    // 3. In-memory deduplication across providers
    const uniqueJobs = deduplicateJobs(rawNormalizedJobs);
    console.log(`[JobDiscovery] Unique jobs after deduplication: ${uniqueJobs.length}`);

    // 4. Deterministic Relevance Scoring & Filtering
    const candidateContext = {
      name: user.name,
      currentRole: user.currentRole,
      experience: user.experience,
      skills: user.skills || [],
      location: user.location,
      preferredRoles: user.preferences?.preferredRoles,
      preferredLocations: user.preferences?.preferredLocations,
      radiusKm: user.preferences?.radiusKm || 50,
      preferredWorkModes: user.preferences?.preferredWorkModes,
      preferredEmploymentTypes: user.preferences?.preferredEmploymentTypes,
    };

    const scoredJobs = uniqueJobs.map((job) => {
      const scoring = calculateJobRelevance(job, candidateContext);
      return { job, scoring };
    });

    // 5. Cheap filtering: Discard completely irrelevant jobs (< 40 relevance score)
    const filteredJobs = scoredJobs.filter((item) => item.scoring.relevanceScore >= 40);

    // Sort by highest relevance score first
    filteredJobs.sort((a, b) => b.scoring.relevanceScore - a.scoring.relevanceScore);

    // Select top candidates for AI evaluation to control Groq cost and latency
    const candidatePool = filteredJobs.slice(0, maxAiAnalysisCount);
    console.log(
      `[JobDiscovery] Filtered down to ${candidatePool.length} top candidates for AI analysis`
    );

    let newRecommendationsCount = 0;

    // 6. Process each top job: Save canonical job and run AI analysis (with caching)
    for (const item of candidatePool) {
      const { job: normJob, scoring } = item;
      const canonicalHash = generateCanonicalHash(normJob);

      // Upsert canonical job in MongoDB
      const canonicalJob = await Job.findOneAndUpdate(
        { canonicalHash },
        {
          $setOnInsert: {
            source: normJob.source,
            sourceJobId: normJob.sourceJobId,
            title: normJob.title,
            company: normJob.company,
            description: normJob.description,
            location: normJob.location,
            city: normJob.city,
            state: normJob.state,
            country: normJob.country,
            latitude: normJob.latitude,
            longitude: normJob.longitude,
            workMode: normJob.workMode,
            employmentType: normJob.employmentType,
            experienceRequired: normJob.experienceRequired,
            skills: normJob.skills,
            salary: normJob.salary,
            applicationUrl: normJob.applicationUrl,
            recruiterEmail: normJob.recruiterEmail,
            postedAt: normJob.postedAt,
            discoveredAt: normJob.discoveredAt,
            canonicalHash,
          },
        },
        { upsert: true, new: true }
      );

      // Check if user already has a recommendation for this job
      const existingRec = await JobRecommendation.findOne({
        userId,
        jobId: canonicalJob._id,
      });

      // AI Cost Control & Cache Check:
      // If already analyzed for this profile version, reuse existing AI analysis
      if (existingRec) {
        if (existingRec.profileVersion === user.profileVersion) {
          console.log(`[JobDiscovery] Reusing cached AI analysis for job: ${normJob.title}`);
          continue;
        }
      }

      // Run Groq AI Shortlist analysis
      console.log(`[JobDiscovery] Running Groq AI analysis for: ${normJob.title} at ${normJob.company}`);
      const aiAnalysis = await analyzeJobShortlistChance(user, {
        title: normJob.title,
        company: normJob.company,
        description: normJob.description,
        location: normJob.location,
        workMode: normJob.workMode,
        experienceRequired: normJob.experienceRequired,
        skills: normJob.skills,
      });

      // Upsert JobRecommendation
      await JobRecommendation.findOneAndUpdate(
        { userId, jobId: canonicalJob._id },
        {
          $set: {
            relevanceScore: scoring.relevanceScore,
            shortlistChance: aiAnalysis.shortlistChance,
            shortlistAssessment: aiAnalysis.shortlistAssessment,
            strengths: aiAnalysis.strengths,
            missingRequirements: aiAnalysis.missingRequirements,
            riskFactors: aiAnalysis.riskFactors,
            matchedSkills: scoring.matchedSkills,
            missingSkills: scoring.missingSkills,
            distanceKm: scoring.distanceKm,
            distanceCategory: scoring.distanceCategory,
            profileVersion: user.profileVersion,
            updatedAt: new Date(),
          },
          $setOnInsert: {
            status: "NEW",
            discoveredAt: new Date(),
          },
        },
        { upsert: true, new: true }
      );

      if (!existingRec) {
        newRecommendationsCount++;
      }
    }

    user.lastJobDiscoveryAt = new Date();
    user.lastJobDiscoveryStatus = "success";
    user.lastJobDiscoveryError = "";
    await user.save();

    console.log(
      `[JobDiscovery] Completed for ${userId}. New recommendations added: ${newRecommendationsCount}`
    );

    return {
      userId,
      success: true,
      totalFetched: uniqueJobs.length,
      newRecommendations: newRecommendationsCount,
    };
  } catch (err: any) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error(`[JobDiscovery] Error processing user ${userId}:`, errorMsg);

    user.lastJobDiscoveryAt = new Date();
    user.lastJobDiscoveryStatus = "error";
    user.lastJobDiscoveryError = errorMsg;
    await user.save();

    return {
      userId,
      success: false,
      totalFetched: 0,
      newRecommendations: 0,
      error: errorMsg,
    };
  }
}

/**
 * Runs full batch discovery for all active users (invoked by CRON)
 */
export async function runBatchJobDiscovery(): Promise<BatchDiscoverySummary> {
  const startedAt = new Date();
  await connectToDatabase();

  // Find all active users with autoJobDiscovery enabled
  const activeUsers = await UserProfile.find({
    isActive: true,
    "preferences.jobDiscoveryEnabled": { $ne: false },
  });

  console.log(`[JobDiscoveryBatch] Found ${activeUsers.length} active users for job discovery`);

  const results: UserDiscoveryResult[] = [];
  let successfulUsers = 0;
  let failedUsers = 0;

  for (const user of activeUsers) {
    try {
      const res = await runJobDiscoveryForUser(user);
      results.push(res);
      if (res.success) {
        successfulUsers++;
      } else {
        failedUsers++;
      }
    } catch (userErr: any) {
      // Isolate failures so other users continue uninterrupted
      console.error(`[JobDiscoveryBatch] Unexpected failure for user ${user.userId}:`, userErr);
      failedUsers++;
      results.push({
        userId: user.userId,
        success: false,
        totalFetched: 0,
        newRecommendations: 0,
        error: userErr?.message || "Unexpected failure",
      });
    }
  }

  const completedAt = new Date();
  console.log(
    `[JobDiscoveryBatch] Finished batch. Successful: ${successfulUsers}, Failed: ${failedUsers}`
  );

  return {
    startedAt,
    completedAt,
    totalUsers: activeUsers.length,
    successfulUsers,
    failedUsers,
    results,
  };
}
