import { JobSearchQuery, JobSourceProvider, NormalizedJob } from "./types";
import { getApproximateCoordinates } from "../geo-utils";

export class RemotiveJobProvider implements JobSourceProvider {
  name = "Remotive Public API";

  isEnabled(): boolean {
    return true;
  }

  async searchJobs(query: JobSearchQuery): Promise<NormalizedJob[]> {
    try {
      const searchTerm = query.roles && query.roles.length > 0 ? query.roles[0] : "developer";
      const url = `https://remotive.com/api/remote-jobs?category=software-dev&search=${encodeURIComponent(
        searchTerm
      )}&limit=${query.limit || 20}`;

      const res = await fetch(url, {
        headers: { Accept: "application/json" },
        signal: AbortSignal.timeout(8000),
      });

      if (!res.ok) {
        console.warn(`[Remotive] Response failed with status: ${res.status}`);
        return [];
      }

      const data = await res.json();
      if (!data || !Array.isArray(data.jobs)) {
        return [];
      }

      return data.jobs.map((raw: any) => this.normalizeJob(raw));
    } catch (err) {
      console.warn("[Remotive] Fetch failed:", err instanceof Error ? err.message : err);
      return [];
    }
  }

  normalizeJob(raw: any): NormalizedJob {
    const title = String(raw.title || "").trim();
    const company = String(raw.company_name || "").trim();
    const location = String(raw.candidate_required_location || "Worldwide (Remote)").trim();
    const cleanDesc = String(raw.description || "")
      .replace(/<[^>]*>?/gm, " ")
      .replace(/\s+/g, " ")
      .trim();

    const skills: string[] = Array.isArray(raw.tags) ? raw.tags : [];
    const coords = getApproximateCoordinates(location);

    return {
      source: "Remotive",
      sourceJobId: String(raw.id || ""),
      title,
      company,
      description: cleanDesc.slice(0, 3000),
      location,
      country: "",
      city: "",
      latitude: coords?.lat,
      longitude: coords?.lng,
      workMode: "Remote",
      employmentType: raw.job_type === "full_time" ? "Full-Time" : "Contract",
      experienceRequired: "",
      skills,
      salary: {
        min: null,
        max: null,
        currency: "USD",
      },
      applicationUrl: raw.url || "",
      recruiterEmail: "",
      postedAt: raw.publication_date ? new Date(raw.publication_date) : new Date(),
      sourceUrl: raw.url || "",
      discoveredAt: new Date(),
    };
  }
}
