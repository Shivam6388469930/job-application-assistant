import { NextRequest, NextResponse } from "next/server";
import { createGroqChatCompletion } from "@/lib/openai";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const { profile, job } = await request.json();

    if (!profile || !job) {
      return NextResponse.json(
        {
          success: false,
          error: "Profile and job information are required",
        },
        { status: 400 }
      );
    }

    console.log("=== EMAIL GENERATION START ===");

    const response = await createGroqChatCompletion({
      messages: [
        {
          role: "system",
          content: `
You are an expert job application assistant.
Compare the candidate's resume/profile with the job posting.
Generate a concise, compelling, and professional application email.

CRITICAL RULES:
1. Never invent skills, education, projects, or experience not present in the candidate profile.
2. Keep the email professional, crisp, and high-impact (around 150-250 words).
3. Do NOT mention AI or match algorithms in the email subject or body.
4. Do NOT use markdown code blocks or formatting inside the email body string (use clean text with standard line breaks).
5. Return ONLY valid JSON.

Match classification:
- "high" = strong overlap between candidate profile and job requirements
- "medium" = moderate overlap
- "low" = limited overlap

Return JSON structure:
{
  "match": "high" | "medium" | "low",
  "matchReason": "Brief 1-2 sentence explanation of why candidate matches or what is missing",
  "subject": "Clear, professional email subject line (e.g., Application for [Job Title] - [Candidate Name])",
  "body": "Complete email body including greeting, introduction, alignment of candidate background to role, and professional sign-off with candidate contact info."
}
`,
        },
        {
          role: "user",
          content: `
CANDIDATE PROFILE:
${JSON.stringify(profile, null, 2)}

JOB DETAILS:
${JSON.stringify(job, null, 2)}
`,
        },
      ],
      temperature: 0.3,
      response_format: {
        type: "json_object",
      },
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error("AI returned an empty email response");
    }

    let result: any;
    try {
      result = JSON.parse(content);
    } catch {
      const cleaned = content
        .replace(/^```json\s*/i, "")
        .replace(/^```\s*/i, "")
        .replace(/\s*```$/i, "")
        .trim();
      result = JSON.parse(cleaned);
    }

    const match = ["high", "medium", "low"].includes(result.match) ? result.match : "medium";
    const subject = typeof result.subject === "string" && result.subject.trim()
      ? result.subject.trim()
      : `Application for ${job.jobTitle || "Open Role"} - ${profile.name || "Candidate"}`;

    const body = typeof result.body === "string" && result.body.trim()
      ? result.body.trim()
      : `Dear Hiring Team,\n\nI am writing to express my strong interest in the ${job.jobTitle || "role"} position at ${job.company || "your company"}.\n\nWith my background in ${profile.currentRole || "software development"} and experience with ${(profile.skills || []).slice(0, 5).join(", ")}, I am confident in my ability to contribute effectively.\n\nThank you for considering my application.\n\nBest regards,\n${profile.name || "Candidate"}\n${profile.email || ""}\n${profile.phone || ""}`;

    return NextResponse.json({
      success: true,
      match,
      matchReason: typeof result.matchReason === "string" ? result.matchReason.trim() : "",
      subject,
      body,
    });
  } catch (error) {
    console.error("EMAIL GENERATION ERROR:", error);
    const details = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      {
        success: false,
        error: "Failed to generate application email",
        details,
      },
      { status: 500 }
    );
  }
}