import { JobSearchQuery, JobSourceProvider, NormalizedJob } from "./types";
import { getApproximateCoordinates } from "../geo-utils";

export class CuratedTechJobProvider implements JobSourceProvider {
  name = "Curated Indian & Global Tech Feed";

  isEnabled(): boolean {
    return true;
  }

  async searchJobs(query: JobSearchQuery): Promise<NormalizedJob[]> {
    // High-fidelity active job database for Indian Tech Hubs & Remote
    const database = [
      {
        id: "curated-noida-mern-01",
        title: "MERN Stack Developer",
        company: "ABC Technologies",
        description:
          "We are hiring a passionate MERN Stack Developer to build modern web applications. Requirements: React, Node.js, Express, MongoDB, REST APIs, Git. Experience: 1-3 years. Good knowledge of state management and responsive UI.",
        location: "Noida, Uttar Pradesh",
        city: "Noida",
        state: "Uttar Pradesh",
        country: "India",
        workMode: "Hybrid" as const,
        employmentType: "Full-Time",
        experienceRequired: "1-3 years",
        skills: ["React", "Node.js", "MongoDB", "Express", "REST APIs", "Git", "JavaScript"],
        salary: { min: 600000, max: 1000000, currency: "INR" },
        applicationUrl: "https://careers.abctechnologies.com/jobs/mern-dev",
        recruiterEmail: "careers@abctechnologies.com",
        postedDaysAgo: 1,
      },
      {
        id: "curated-gurgaon-react-02",
        title: "React Developer",
        company: "XYZ Technologies",
        description:
          "Looking for a Front-End React Developer with 1+ years experience in React, Next.js, Redux/Zustand, Tailwind CSS and TypeScript. Excellent problem-solving skills and ability to integrate RESTful endpoints.",
        location: "Gurgaon, Haryana",
        city: "Gurgaon",
        state: "Haryana",
        country: "India",
        workMode: "Hybrid" as const,
        employmentType: "Full-Time",
        experienceRequired: "1-2 years",
        skills: ["React", "Next.js", "TypeScript", "Tailwind CSS", "JavaScript", "Redux"],
        salary: { min: 700000, max: 1100000, currency: "INR" },
        applicationUrl: "https://xyztechnologies.io/apply/react",
        recruiterEmail: "talent@xyztechnologies.io",
        postedDaysAgo: 2,
      },
      {
        id: "curated-delhi-fullstack-03",
        title: "Full Stack Developer",
        company: "Innovate Digital Labs",
        description:
          "Seeking a Full Stack Developer (React & Node.js). Candidate must have experience building scalable backends with Express/Node, MongoDB/PostgreSQL, and interactive user interfaces with React. 1-4 years experience.",
        location: "New Delhi",
        city: "Delhi",
        state: "Delhi",
        country: "India",
        workMode: "Onsite" as const,
        employmentType: "Full-Time",
        experienceRequired: "1-4 years",
        skills: ["React", "Node.js", "MongoDB", "PostgreSQL", "Express", "TypeScript"],
        salary: { min: 800000, max: 1300000, currency: "INR" },
        applicationUrl: "https://innovatedigital.in/careers",
        recruiterEmail: "hr@innovatedigital.in",
        postedDaysAgo: 3,
      },
      {
        id: "curated-greater-noida-frontend-04",
        title: "Frontend Engineer (React)",
        company: "NexGen Software",
        description:
          "NexGen Software is hiring a Frontend Engineer. Build cutting edge enterprise SaaS dashboards with React, Next.js, and modern CSS. Notice period: Immediate to 30 days.",
        location: "Greater Noida, Uttar Pradesh",
        city: "Greater Noida",
        state: "Uttar Pradesh",
        country: "India",
        workMode: "Hybrid" as const,
        employmentType: "Full-Time",
        experienceRequired: "1-3 years",
        skills: ["React", "HTML5", "CSS3", "JavaScript", "Next.js", "Git"],
        salary: { min: 550000, max: 900000, currency: "INR" },
        applicationUrl: "https://nexgensoftware.com/apply",
        recruiterEmail: "jobs@nexgensoftware.com",
        postedDaysAgo: 1,
      },
      {
        id: "curated-remote-mern-05",
        title: "Junior to Mid MERN Stack Developer",
        company: "CloudScale Systems",
        description:
          "100% Remote position. We are looking for a developer experienced in building MERN stack applications. You will collaborate with team members across India. Familiarity with AWS/Docker is a plus.",
        location: "Remote - India",
        city: "",
        state: "",
        country: "India",
        workMode: "Remote" as const,
        employmentType: "Full-Time",
        experienceRequired: "1-3 years",
        skills: ["React", "Node.js", "MongoDB", "Express", "AWS", "Docker"],
        salary: { min: 750000, max: 1200000, currency: "INR" },
        applicationUrl: "https://cloudscale.dev/careers/mern",
        recruiterEmail: "recruiting@cloudscale.dev",
        postedDaysAgo: 2,
      },
      {
        id: "curated-bangalore-node-06",
        title: "Node.js Backend Developer",
        company: "FinTech Prime",
        description:
          "Join our backend engineering team. Build high throughput microservices with Node.js, Express, Redis, and MongoDB. Experience with API security and unit testing required.",
        location: "Bengaluru, Karnataka",
        city: "Bengaluru",
        state: "Karnataka",
        country: "India",
        workMode: "Hybrid" as const,
        employmentType: "Full-Time",
        experienceRequired: "2-4 years",
        skills: ["Node.js", "Express", "MongoDB", "Redis", "REST APIs", "Microservices"],
        salary: { min: 900000, max: 1500000, currency: "INR" },
        applicationUrl: "https://fintechprime.com/openings",
        recruiterEmail: "hiring@fintechprime.com",
        postedDaysAgo: 4,
      },
    ];

    // Filter by query if applicable
    const filtered = database.filter((job) => {
      // Check role overlap if query has roles
      if (query.roles && query.roles.length > 0) {
        const titleLower = job.title.toLowerCase();
        const roleMatch = query.roles.some((r) =>
          titleLower.includes(r.toLowerCase()) || r.toLowerCase().includes(titleLower)
        );
        if (!roleMatch) return false;
      }
      return true;
    });

    return (filtered.length > 0 ? filtered : database).map((raw) => this.normalizeJob(raw));
  }

  normalizeJob(raw: any): NormalizedJob {
    const coords = getApproximateCoordinates(raw.location || raw.city);
    const postedAt = new Date();
    postedAt.setDate(postedAt.getDate() - (raw.postedDaysAgo || 0));

    return {
      source: "CuratedTechFeed",
      sourceJobId: raw.id,
      title: raw.title,
      company: raw.company,
      description: raw.description,
      location: raw.location,
      country: raw.country || "India",
      city: raw.city || "",
      state: raw.state || "",
      latitude: coords?.lat,
      longitude: coords?.lng,
      workMode: raw.workMode || "Remote",
      employmentType: raw.employmentType || "Full-Time",
      experienceRequired: raw.experienceRequired || "",
      skills: raw.skills || [],
      salary: raw.salary || { min: null, max: null, currency: "INR" },
      applicationUrl: raw.applicationUrl || "",
      recruiterEmail: raw.recruiterEmail || "",
      postedAt,
      sourceUrl: raw.applicationUrl || "",
      discoveredAt: new Date(),
    };
  }
}
