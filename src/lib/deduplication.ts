import crypto from "crypto";
import { NormalizedJob } from "./job-providers/types";

export function cleanText(str: string): string {
  if (!str) return "";
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .trim();
}

/**
 * Generates a stable canonical hash for a job based on normalized company, title, and location.
 * Also incorporates application URL if available.
 */
export function generateCanonicalHash(job: {
  company: string;
  title: string;
  location?: string;
  applicationUrl?: string;
}): string {
  const normCompany = cleanText(job.company);
  const normTitle = cleanText(job.title);
  const normLoc = cleanText(job.location || "");

  // If application URL is clean, we can use normalized domain + path
  let urlClean = "";
  if (job.applicationUrl) {
    try {
      const parsed = new URL(job.applicationUrl);
      urlClean = `${parsed.hostname}${parsed.pathname}`.toLowerCase();
    } catch {
      urlClean = cleanText(job.applicationUrl);
    }
  }

  // Create hash string
  const rawKey = `${normCompany}|${normTitle}|${normLoc}|${urlClean}`;
  return crypto.createHash("sha256").update(rawKey).digest("hex").slice(0, 32);
}

/**
 * Deduplicates an array of incoming normalized jobs in memory
 */
export function deduplicateJobs(jobs: NormalizedJob[]): NormalizedJob[] {
  const seenHashes = new Set<string>();
  const seenUrls = new Set<string>();
  const deduplicated: NormalizedJob[] = [];

  for (const job of jobs) {
    const hash = generateCanonicalHash(job);

    if (seenHashes.has(hash)) {
      continue;
    }

    if (job.applicationUrl && seenUrls.has(job.applicationUrl.trim().toLowerCase())) {
      continue;
    }

    seenHashes.add(hash);
    if (job.applicationUrl) {
      seenUrls.add(job.applicationUrl.trim().toLowerCase());
    }

    deduplicated.push(job);
  }

  return deduplicated;
}
