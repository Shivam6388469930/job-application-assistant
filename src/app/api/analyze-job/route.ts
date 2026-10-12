import { NextRequest, NextResponse } from "next/server";
import { createGroqChatCompletion } from "@/lib/openai";
import { createWorker } from "tesseract.js";

export const runtime = "nodejs";

// Helper regex to extract emails from raw text
function extractEmailsFromText(text: string): string[] {
  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
  const matches = text.match(emailRegex) || [];
  return Array.from(new Set(matches.map((e) => e.trim().toLowerCase())));
}

export async function POST(request: NextRequest) {
  try {
    let jobPost = "";
    let extractedImageText = "";
    const contentType = request.headers.get("content-type") || "";

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      const textParam = formData.get("jobPost");
      const imageParam = formData.get("image");

      if (typeof textParam === "string") {
        jobPost = textParam.trim();
      }

      if (imageParam instanceof File && imageParam.size > 0) {
        console.log(`[AnalyzeJob] Processing uploaded image: ${imageParam.name}, size: ${imageParam.size} bytes`);
        const bytes = await imageParam.arrayBuffer();
        const buffer = Buffer.from(bytes);

        const worker = await createWorker("eng");
        const ret = await worker.recognize(buffer);
        await worker.terminate();

        extractedImageText = (ret.data.text || "").trim();
        console.log(`[AnalyzeJob] OCR extracted ${extractedImageText.length} characters from image`);
      }
    } else {
      const body = await request.json().catch(() => ({}));
      jobPost = typeof body.jobPost === "string" ? body.jobPost.trim() : "";
    }

    // Combine text from image and user paste
    const combinedContent = [jobPost, extractedImageText ? `[TEXT EXTRACTED FROM JOB POST IMAGE/SCREENSHOT]:\n${extractedImageText}` : ""]
      .filter(Boolean)
      .join("\n\n");

    if (!combinedContent.trim()) {
      return NextResponse.json(
        {
          success: false,
          error: "Please provide a job post description or upload a job screenshot.",
        },
        { status: 400 }
      );
    }

    console.log("=== JOB ANALYSIS START ===");
    console.log("Combined content characters:", combinedContent.length);

    const regexEmails = extractEmailsFromText(combinedContent);

    const response = await createGroqChatCompletion({
      messages: [
        {
          role: "system",
          content: `
You are an expert job-post parser.
Your job is to extract structured information from a complete job advertisement or screenshot text.

The job post may come from LinkedIn, WhatsApp, Telegram, Facebook, job portals, or flyers.

IMPORTANT:
Ignore:
- LinkedIn follow links, Telegram/WhatsApp join links
- Unrelated promotional content, disclaimers, "Follow for more"
- Unrelated promotional emails

Extract the actual job opportunity and the recruiter/application contact email.
If an email is mentioned for applications (e.g., "Send CV to", "Apply at", "Email:"), select it as recruiterEmail.

If an attribute is not available, use an empty string or empty array. Do not invent details.

Return ONLY valid JSON with this exact structure:
{
  "jobTitle": "",
  "company": "",
  "location": "",
  "workMode": "Remote" | "Hybrid" | "Onsite" | "Unknown",
  "employmentType": "",
  "shift": "",
  "noticePeriod": "",
  "experienceRequired": "",
  "skills": [],
  "responsibilities": [],
  "recruiterEmail": "",
  "allEmails": [],
  "applicationInstructions": "",
  "applicationUrl": ""
}
`,
        },
        {
          role: "user",
          content: `JOB POST CONTENT:\n\n${combinedContent}\n\nEND JOB POST`,
        },
      ],
      temperature: 0.1,
      response_format: {
        type: "json_object",
      },
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error("AI returned an empty response");
    }

    let job: any;
    try {
      job = JSON.parse(content);
    } catch {
      const cleaned = content
        .replace(/^```json\s*/i, "")
        .replace(/^```\s*/i, "")
        .replace(/\s*```$/i, "")
        .trim();
      job = JSON.parse(cleaned);
    }

    // Merge regex emails with LLM extracted emails
    const allEmailsSet = new Set<string>([
      ...(Array.isArray(job.allEmails) ? job.allEmails.map((e: string) => String(e).toLowerCase().trim()) : []),
      ...regexEmails,
    ]);

    const allEmails = Array.from(allEmailsSet).filter(Boolean);

    let recruiterEmail = typeof job.recruiterEmail === "string" ? job.recruiterEmail.trim().toLowerCase() : "";
    if (!recruiterEmail && allEmails.length > 0) {
      recruiterEmail = allEmails[0];
    }

    // Normalize response
    const normalizedJob = {
      jobTitle: typeof job.jobTitle === "string" ? job.jobTitle.trim() : "",
      company: typeof job.company === "string" ? job.company.trim() : "",
      location: typeof job.location === "string" ? job.location.trim() : "",
      workMode: typeof job.workMode === "string" ? job.workMode.trim() : "Unknown",
      employmentType: typeof job.employmentType === "string" ? job.employmentType.trim() : "",
      shift: typeof job.shift === "string" ? job.shift.trim() : "",
      noticePeriod: typeof job.noticePeriod === "string" ? job.noticePeriod.trim() : "",
      experienceRequired: typeof job.experienceRequired === "string" ? job.experienceRequired.trim() : "",
      skills: Array.isArray(job.skills)
        ? job.skills.filter((s: unknown) => typeof s === "string").map((s: string) => s.trim()).filter(Boolean)
        : [],
      responsibilities: Array.isArray(job.responsibilities)
        ? job.responsibilities.filter((r: unknown) => typeof r === "string").map((r: string) => r.trim()).filter(Boolean)
        : [],
      recruiterEmail,
      allEmails,
      applicationInstructions: typeof job.applicationInstructions === "string" ? job.applicationInstructions.trim() : "",
      applicationUrl: typeof job.applicationUrl === "string" ? job.applicationUrl.trim() : "",
      rawText: combinedContent,
      ocrUsed: Boolean(extractedImageText),
    };

    return NextResponse.json({
      success: true,
      job: normalizedJob,
      extractedImageText: extractedImageText || undefined,
    });
  } catch (error) {
    console.error("JOB ANALYSIS ERROR:", error);
    const details = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      {
        success: false,
        error: "Failed to analyze job post",
        details,
      },
      { status: 500 }
    );
  }
}