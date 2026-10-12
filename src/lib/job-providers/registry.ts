import { JobSearchQuery, JobSourceProvider, NormalizedJob } from "./types";
import { RemotiveJobProvider } from "./remotive-provider";
import { ArbeitnowJobProvider } from "./arbeitnow-provider";
import { CuratedTechJobProvider } from "./curated-tech-provider";

export class JobProviderRegistry {
  private providers: JobSourceProvider[] = [];

  constructor() {
    // Default active providers
    this.register(new CuratedTechJobProvider());
    this.register(new RemotiveJobProvider());
    this.register(new ArbeitnowJobProvider());
  }

  register(provider: JobSourceProvider) {
    // Avoid duplicates
    if (!this.providers.some((p) => p.name === provider.name)) {
      this.providers.push(provider);
    }
  }

  unregister(providerName: string) {
    this.providers = this.providers.filter((p) => p.name !== providerName);
  }

  getProviders(): JobSourceProvider[] {
    return this.providers.filter((p) => p.isEnabled());
  }

  async searchAll(query: JobSearchQuery): Promise<NormalizedJob[]> {
    const activeProviders = this.getProviders();
    const results: NormalizedJob[] = [];

    // Run providers in parallel with individual error isolation
    const promises = activeProviders.map(async (provider) => {
      try {
        console.log(`[JobProviderRegistry] Querying provider: ${provider.name}...`);
        const jobs = await provider.searchJobs(query);
        console.log(`[JobProviderRegistry] ${provider.name} returned ${jobs.length} jobs`);
        return jobs;
      } catch (err) {
        console.error(`[JobProviderRegistry] Error from ${provider.name}:`, err);
        return [];
      }
    });

    const settled = await Promise.allSettled(promises);
    for (const res of settled) {
      if (res.status === "fulfilled" && Array.isArray(res.value)) {
        results.push(...res.value);
      }
    }

    return results;
  }
}

export const defaultJobProviderRegistry = new JobProviderRegistry();
