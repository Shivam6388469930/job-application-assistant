import { JobSearchQuery, JobSourceProvider, NormalizedJob } from "./types";
import { getApproximateCoordinates } from "../geo-utils";

export class ArbeitnowJobProvider implements JobSourceProvider {
  name = "Arbeitnow Public API";

  isEnabled(): boolean {
    return true;
  }

  async searchJobs(query: JobSearchQuery): Promise<NormalizedJob[]> {
    try {
      const url = "https://www.arbeitnow.com/api/job-board-api";
      const res = await fetch(url, {
        headers: { Accept: "application/json" },
        signal: AbortSignal.timeout(8000),
      });

      if (!res.ok) {
        console.warn(`[Arbeitnow] Response failed with status: ${res.status}`);
        return [];
      }

      const data = await res.json();
      if (!data || !Array.isArray(data.data)) {
        return [];
      }

      const rawJobs = data.data;
      // Filter raw jobs loosely by query roles if specified
      const filtered = query.roles && query.roles.length > 0
        ? rawJobs.filter((j: any) => {
            const text = `${j.title || ""} ${j.description || ""}`.toLowerCase();
            return query.roles.some((r) => text.includes(r.toLowerCase()));
          })
        : rawJobs;

      return filtered.slice(0, query.limit || 20).map((raw: any) => this.normalizeJob(raw));
    } catch (err) {
      console.warn("[Arbeitnow] Fetch failed:", err instanceof Error ? err.message : err);
      return [];
    }
  }

  normalizeJob(raw: any): NormalizedJob {
    const title = String(raw.title || "").trim();
    const company = String(raw.company_name || "").trim();
    const location = String(raw.location || "Remote").trim();
    const cleanDesc = String(raw.description || "")
      .replace(/<[^>]*>?/gm, " ")
      .replace(/\s+/g, " ")
      .trim();

    const isRemote = Boolean(raw.remote);
    const tags = Array.isArray(raw.tags) ? raw.tags : [];
    const coords = getApproximateCoordinates(location);

    return {
      source: "Arbeitnow",
      sourceJobId: String(raw.slug || raw.url || ""),
      title,
      company,
      description: cleanDesc.slice(0, 3000),
      location: isRemote ? `${location} (Remote)` : location,
      country: "",
      city: location,
      latitude: coords?.lat,
      longitude: coords?.lng,
      workMode: isRemote ? "Remote" : "Hybrid",
      employmentType: Array.isArray(raw.job_types) && raw.job_types[0] ? raw.job_types[0] : "Full-Time",
      experienceRequired: "",
      skills: tags,
      salary: {
        min: null,
        max: null,
        currency: "EUR",
      },
      applicationUrl: raw.url || "",
      recruiterEmail: "",
      postedAt: raw.created_at ? new Date(raw.created_at * 1000) : new Date(),
      sourceUrl: raw.url || "",
      discoveredAt: new Date(),
    };
  }
}
