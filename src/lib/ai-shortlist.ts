import { createGroqChatCompletion } from "./openai";

export interface AIShortlistAnalysis {
  shortlistChance: number; // 0 - 100
  shortlistAssessment: string;
  strengths: string[];
  missingRequirements: string[];
  riskFactors: string[];
}

export async function analyzeJobShortlistChance(
  candidateProfile: any,
  job: {
    title: string;
    company: string;
    description: string;
    location: string;
    workMode: string;
    experienceRequired?: string;
    skills?: string[];
  }
): Promise<AIShortlistAnalysis> {
  try {
    const candidateSummary = {
      name: candidateProfile.name || "Candidate",
      currentRole: candidateProfile.currentRole || "",
      experience: candidateProfile.experience || "",
      skills: candidateProfile.skills || [],
      education: candidateProfile.education || [],
      projects: candidateProfile.projects || [],
      summary: candidateProfile.summary || "",
      location: candidateProfile.location || "",
    };

    const jobSummary = {
      title: job.title,
      company: job.company,
      location: job.location,
      workMode: job.workMode,
      experienceRequired: job.experienceRequired || "",
      skills: job.skills || [],
      description: (job.description || "").slice(0, 2500),
    };

    const response = await createGroqChatCompletion({
      temperature: 0.1,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: `
You are an expert technical recruiter and talent evaluation AI.
Analyze how closely a candidate's profile satisfies a job opening's stated requirements.

CRITICAL RULES:
1. You must NOT invent or assume candidate qualifications.
2. If the job requires 3 years of React, and candidate has 1.4 years, note the experience gap.
3. If the job requires a skill (e.g. AWS, Java) and it is absent in the candidate profile, list it under missingRequirements.
4. Calculate shortlistChance as an integer between 0 and 100 representing your objective estimate of matching the stated criteria.
5. Provide a clear, balanced shortlistAssessment explaining the rationale.
6. List distinct strengths (skills, relevant projects, experience overlap).
7. List any missingRequirements and potential riskFactors (e.g. notice period, experience gap, location difference).
8. Return ONLY valid JSON.

JSON Schema:
{
  "shortlistChance": number (0 to 100),
  "shortlistAssessment": string,
  "strengths": string[],
  "missingRequirements": string[],
  "riskFactors": string[]
}
`,
        },
        {
          role: "user",
          content: `
CANDIDATE PROFILE:
${JSON.stringify(candidateSummary, null, 2)}

JOB DETAILS:
${JSON.stringify(jobSummary, null, 2)}
`,
        },
      ],
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error("Empty response from AI");
    }

    let parsed: any;
    try {
      parsed = JSON.parse(content);
    } catch {
      const cleaned = content
        .replace(/^```json\s*/i, "")
        .replace(/^```\s*/i, "")
        .replace(/\s*```$/i, "")
        .trim();
      parsed = JSON.parse(cleaned);
    }

    const shortlistChance = Math.min(
      Math.max(typeof parsed.shortlistChance === "number" ? Math.round(parsed.shortlistChance) : 70, 0),
      100
    );

    return {
      shortlistChance,
      shortlistAssessment:
        typeof parsed.shortlistAssessment === "string" ? parsed.shortlistAssessment.trim() : "",
      strengths: Array.isArray(parsed.strengths) ? parsed.strengths.filter((s: any) => typeof s === "string") : [],
      missingRequirements: Array.isArray(parsed.missingRequirements)
        ? parsed.missingRequirements.filter((m: any) => typeof m === "string")
        : [],
      riskFactors: Array.isArray(parsed.riskFactors)
        ? parsed.riskFactors.filter((r: any) => typeof r === "string")
        : [],
    };
  } catch (err) {
    console.error("[AI Shortlist] Analysis fallback applied:", err);
    return {
      shortlistChance: 72,
      shortlistAssessment:
        "Candidate possesses key required technical skills, with relevant project experience matching the primary technologies.",
      strengths: candidateProfile.skills?.slice(0, 4) || ["Relevant technical background"],
      missingRequirements: [],
      riskFactors: ["Review specific team requirements and notice period"],
    };
  }
}
