import { getApproximateCoordinates, calculateDistanceKm, categorizeDistance, DistanceCategory } from "./geo-utils";
import { NormalizedJob } from "./job-providers/types";

export interface CandidateContext {
  name?: string;
  currentRole?: string;
  experience?: string;
  skills: string[];
  location?: string;
  noticePeriod?: string;
  preferredRoles?: string[];
  preferredLocations?: string[];
  radiusKm?: number;
  preferredWorkModes?: string[];
  preferredEmploymentTypes?: string[];
}

export interface RelevanceScoreResult {
  relevanceScore: number; // 0 - 100
  matchCategory: "High Match" | "Medium Match" | "Low Match";
  matchedSkills: string[];
  missingSkills: string[];
  distanceKm?: number;
  distanceCategory: DistanceCategory;
  breakdown: {
    skillsScore: number; // max 30
    roleScore: number; // max 25
    experienceScore: number; // max 15
    locationScore: number; // max 10
    workModeScore: number; // max 10
    noticePeriodScore: number; // max 5
    employmentTypeScore: number; // max 5
  };
}

export function parseYearsOfExperience(expStr?: string): number {
  if (!expStr) return 0;
  // Match patterns like "1.4 years", "2+ years", "3-5 years", "1.5"
  const match = expStr.match(/(\d+(\.\d+)?)/);
  return match ? parseFloat(match[1]) : 0;
}

export function calculateJobRelevance(
  job: NormalizedJob,
  candidate: CandidateContext
): RelevanceScoreResult {
  const candidateSkills = (candidate.skills || []).map((s) => s.toLowerCase().trim());
  const jobSkills = (job.skills || []).map((s) => s.toLowerCase().trim());
  const jobText = `${job.title} ${job.description}`.toLowerCase();

  // 1. Skills Match (Weight: 30%)
  const matchedSkills: string[] = [];
  const missingSkills: string[] = [];

  if (jobSkills.length > 0) {
    for (const jSkill of jobSkills) {
      const isMatched = candidateSkills.some(
        (cSkill) => cSkill.includes(jSkill) || jSkill.includes(cSkill)
      );
      if (isMatched) {
        matchedSkills.push(jSkill);
      } else {
        missingSkills.push(jSkill);
      }
    }
  } else {
    // If job has no explicit skills list, scan candidate skills inside job text
    for (const cSkill of candidateSkills) {
      if (cSkill.length > 2 && jobText.includes(cSkill)) {
        matchedSkills.push(cSkill);
      }
    }
  }

  const skillCoverage =
    jobSkills.length > 0
      ? matchedSkills.length / jobSkills.length
      : Math.min(matchedSkills.length / 5, 1);
  const skillsScore = Math.round(skillCoverage * 30);

  // 2. Role / Title Match (Weight: 25%)
  let roleScore = 0;
  const targetRoles = [
    ...(candidate.preferredRoles || []),
    candidate.currentRole || "",
  ].filter(Boolean).map((r) => r.toLowerCase().trim());

  const jobTitleLower = job.title.toLowerCase();

  for (const role of targetRoles) {
    if (jobTitleLower.includes(role) || role.includes(jobTitleLower)) {
      roleScore = 25;
      break;
    }
    // Partial word overlap (e.g. "mern", "react", "full stack", "node")
    const roleWords = role.split(/\s+/).filter((w) => w.length > 2);
    const matchedWords = roleWords.filter((w) => jobTitleLower.includes(w));
    if (matchedWords.length > 0) {
      const partial = Math.round((matchedWords.length / roleWords.length) * 20);
      roleScore = Math.max(roleScore, partial);
    }
  }
  if (roleScore === 0 && targetRoles.length === 0) {
    roleScore = 15; // default fallback if unconfigured
  }

  // 3. Experience Match (Weight: 15%)
  let experienceScore = 10;
  const candidateExp = parseYearsOfExperience(candidate.experience);
  const jobExp = parseYearsOfExperience(job.experienceRequired);

  if (jobExp === 0) {
    // No strict requirement stated
    experienceScore = 15;
  } else {
    const diff = Math.abs(candidateExp - jobExp);
    if (diff <= 1.0) {
      experienceScore = 15;
    } else if (diff <= 2.0) {
      experienceScore = 10;
    } else {
      experienceScore = 5;
    }
  }

  // 4. Location & Distance Match (Weight: 10%)
  let locationScore = 5;
  let distanceKm: number | undefined;
  const isRemote = job.workMode.toLowerCase() === "remote" || job.location.toLowerCase().includes("remote");

  if (isRemote) {
    // For remote jobs, distance does not penalize
    locationScore = 10;
  } else {
    const candidateLoc = candidate.location || (candidate.preferredLocations && candidate.preferredLocations[0]) || "";
    const candCoords = getApproximateCoordinates(candidateLoc);
    const jobCoords =
      job.latitude && job.longitude
        ? { lat: job.latitude, lng: job.longitude }
        : getApproximateCoordinates(job.location || job.city);

    if (candCoords && jobCoords) {
      distanceKm = calculateDistanceKm(candCoords.lat, candCoords.lng, jobCoords.lat, jobCoords.lng);
      const radius = candidate.radiusKm || 50;

      if (distanceKm <= 10) {
        locationScore = 10;
      } else if (distanceKm <= 25) {
        locationScore = 9;
      } else if (distanceKm <= radius) {
        locationScore = 8;
      } else {
        locationScore = 3;
      }
    } else {
      // Check city name string match
      const locMatch = (candidate.preferredLocations || []).some(
        (loc) => job.location.toLowerCase().includes(loc.toLowerCase()) || loc.toLowerCase().includes(job.location.toLowerCase())
      );
      locationScore = locMatch ? 10 : 6;
    }
  }

  const distanceCategory = categorizeDistance(distanceKm, job.workMode);

  // 5. Work Mode Match (Weight: 10%)
  let workModeScore = 7;
  const preferredModes = (candidate.preferredWorkModes || ["Remote", "Hybrid", "Onsite"]).map((m) =>
    m.toLowerCase()
  );
  if (preferredModes.includes(job.workMode.toLowerCase())) {
    workModeScore = 10;
  } else if (preferredModes.includes("hybrid") && job.workMode.toLowerCase() === "onsite") {
    workModeScore = 6;
  }

  // 6. Notice Period Match (Weight: 5%)
  const noticePeriodScore = 5;

  // 7. Employment Type Match (Weight: 5%)
  let employmentTypeScore = 5;
  if (candidate.preferredEmploymentTypes && candidate.preferredEmploymentTypes.length > 0) {
    const prefTypes = candidate.preferredEmploymentTypes.map((t) => t.toLowerCase());
    if (prefTypes.includes(job.employmentType.toLowerCase())) {
      employmentTypeScore = 5;
    } else {
      employmentTypeScore = 2;
    }
  }

  const total =
    skillsScore +
    roleScore +
    experienceScore +
    locationScore +
    workModeScore +
    noticePeriodScore +
    employmentTypeScore;

  const relevanceScore = Math.min(Math.max(total, 0), 100);

  let matchCategory: "High Match" | "Medium Match" | "Low Match" = "Low Match";
  if (relevanceScore >= 80) {
    matchCategory = "High Match";
  } else if (relevanceScore >= 60) {
    matchCategory = "Medium Match";
  }

  return {
    relevanceScore,
    matchCategory,
    matchedSkills: Array.from(new Set(matchedSkills)),
    missingSkills: Array.from(new Set(missingSkills)),
    distanceKm,
    distanceCategory,
    breakdown: {
      skillsScore,
      roleScore,
      experienceScore,
      locationScore,
      workModeScore,
      noticePeriodScore,
      employmentTypeScore,
    },
  };
}
