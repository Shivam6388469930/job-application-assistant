export interface JobSearchQuery {
  roles: string[];
  locations: string[];
  workModes?: string[];
  limit?: number;
}

export interface NormalizedJob {
  source: string;
  sourceJobId: string;
  title: string;
  company: string;
  description: string;
  location: string;
  country: string;
  city: string;
  state?: string;
  latitude?: number;
  longitude?: number;
  workMode: "Remote" | "Hybrid" | "Onsite" | "Unknown";
  employmentType: string;
  experienceRequired: string;
  skills: string[];
  salary: {
    min: number | null;
    max: number | null;
    currency: string;
  };
  applicationUrl: string;
  recruiterEmail: string;
  postedAt: Date | null;
  sourceUrl: string;
  discoveredAt: Date;
}

export interface JobSourceProvider {
  name: string;
  isEnabled(): boolean;
  searchJobs(query: JobSearchQuery): Promise<NormalizedJob[]>;
  getJobDetails?(jobId: string): Promise<NormalizedJob | null>;
  normalizeJob(rawJob: any): NormalizedJob;
}
