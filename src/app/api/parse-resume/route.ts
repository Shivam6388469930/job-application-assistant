// import { NextRequest, NextResponse } from "next/server";
// import { extractText, getDocumentProxy } from "unpdf";
// import { groq } from "@/lib/openai";

// export const runtime = "nodejs";

// export async function POST(request: NextRequest) {
//   try {
//     console.log("=== RESUME PARSE START ===");

//     const formData = await request.formData();

//     const file = formData.get("resume");

//     if (!(file instanceof File)) {
//       return NextResponse.json(
//         {
//           success: false,
//           error: "Resume file is required",
//         },
//         { status: 400 }
//       );
//     }

//     console.log("Resume:", file.name);
//     console.log("Type:", file.type);
//     console.log("Size:", file.size);

//     if (file.size === 0) {
//       return NextResponse.json(
//         {
//           success: false,
//           error: "Uploaded resume is empty",
//         },
//         { status: 400 }
//       );
//     }

//     if (
//       file.type !== "application/pdf" &&
//       !file.name.toLowerCase().endsWith(".pdf")
//     ) {
//       return NextResponse.json(
//         {
//           success: false,
//           error: "Only PDF resumes are supported",
//         },
//         { status: 400 }
//       );
//     }

//     // Convert uploaded file to Uint8Array
//     const arrayBuffer = await file.arrayBuffer();

//     const pdfData = new Uint8Array(arrayBuffer);

//     console.log("PDF loaded successfully");

//     // -----------------------------------------
//     // Extract PDF text using unpdf
//     // -----------------------------------------

//     const pdf = await getDocumentProxy(pdfData);

//     const { totalPages, text } = await extractText(pdf, {
//       mergePages: true,
//     });

//     console.log("PDF pages:", totalPages);

//     const resumeText =
//       typeof text === "string"
//         ? text.trim()
//         : text.join("\n").trim();

//     console.log(
//       "Extracted characters:",
//       resumeText.length
//     );

//     if (!resumeText) {
//       return NextResponse.json(
//         {
//           success: false,
//           error:
//             "No text could be extracted from this PDF. Your resume may be an image/scanned PDF.",
//         },
//         { status: 400 }
//       );
//     }

//     // -----------------------------------------
//     // Send extracted resume to OpenAI
//     // -----------------------------------------

//     const response =
//   await groq.chat.completions.create({
//     model: "llama-3.3-70b-versatile",

//         messages: [
//           {
//             role: "system",

//             content: `
// You are an expert resume parser.

// Extract the candidate's information from the
// resume provided by the user.

// IMPORTANT RULES:

// 1. Return ONLY valid JSON.
// 2. Do not return markdown.
// 3. Do not invent information.
// 4. If information is missing, use an empty string.
// 5. Skills must be an array.
// 6. Education must be an array.
// 7. Projects must be an array.

// Return exactly this structure:

// {
//   "name": "",
//   "email": "",
//   "phone": "",
//   "location": "",
//   "currentRole": "",
//   "experience": "",
//   "skills": [],
//   "education": [],
//   "projects": [],
//   "summary": ""
// }
// `,
//           },

//           {
//             role: "user",

//             content: `
// Extract the candidate information from
// the following resume:

// ---------------- RESUME ----------------

// ${resumeText}

// -------------- END RESUME --------------
// `,
//           },
//         ],

//         temperature: 0,
//       });

//     const content =
//       response.choices[0]?.message?.content;

//     if (!content) {
//       throw new Error(
//         "OpenAI returned an empty response"
//       );
//     }

//     console.log("OpenAI response received");

//     // -----------------------------------------
//     // Parse AI JSON
//     // -----------------------------------------

//     let profile;

//     try {
//       profile = JSON.parse(content);
//     } catch {
//       const cleaned = content
//         .replace(/^```json\s*/i, "")
//         .replace(/^```\s*/i, "")
//         .replace(/\s*```$/i, "")
//         .trim();

//       profile = JSON.parse(cleaned);
//     }

//     // -----------------------------------------
//     // Normalize profile
//     // -----------------------------------------

//     profile = {
//       name: profile.name || "",
//       email: profile.email || "",
//       phone: profile.phone || "",
//       location: profile.location || "",
//       currentRole: profile.currentRole || "",
//       experience: profile.experience || "",

//       skills: Array.isArray(profile.skills)
//         ? profile.skills
//         : [],

//       education: Array.isArray(profile.education)
//         ? profile.education
//         : [],

//       projects: Array.isArray(profile.projects)
//         ? profile.projects
//         : [],

//       summary: profile.summary || "",
//     };

//     console.log("Profile extracted:", profile);

//     return NextResponse.json({
//       success: true,
//       profile,
//     });
//   } catch (error) {
//     console.error(
//       "================================"
//     );

//     console.error("RESUME PARSING ERROR");

//     console.error(error);

//     console.error(
//       "================================"
//     );

//     const details =
//       error instanceof Error
//         ? error.message
//         : "Unknown error";

//     return NextResponse.json(
//       {
//         success: false,
//         error: "Failed to parse resume",
//         details,
//       },
//       { status: 500 }
//     );
//   }
// }

import { NextRequest, NextResponse } from "next/server";
import { extractText, getDocumentProxy } from "unpdf";
import { createGroqChatCompletion } from "@/lib/openai";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    console.log("=== RESUME PARSE START ===");

    // -----------------------------------------
    // Get uploaded file
    // -----------------------------------------

    const formData = await request.formData();

    const file = formData.get("resume");

    if (!(file instanceof File)) {
      return NextResponse.json(
        {
          success: false,
          error: "Resume file is required",
        },
        { status: 400 }
      );
    }

    console.log("Resume:", file.name);
    console.log("Type:", file.type);
    console.log("Size:", file.size);

    // -----------------------------------------
    // Validate file
    // -----------------------------------------

    if (file.size === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Uploaded resume is empty",
        },
        { status: 400 }
      );
    }

    if (
      file.type !== "application/pdf" &&
      !file.name.toLowerCase().endsWith(".pdf")
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Only PDF resumes are supported",
        },
        { status: 400 }
      );
    }

    // -----------------------------------------
    // Convert PDF to Uint8Array
    // -----------------------------------------

    const arrayBuffer = await file.arrayBuffer();

    const pdfData = new Uint8Array(arrayBuffer);

    console.log("PDF loaded successfully");

    // -----------------------------------------
    // Extract PDF text using unpdf
    // -----------------------------------------

    const pdf = await getDocumentProxy(pdfData);

    const { totalPages, text } = await extractText(pdf, {
      mergePages: true,
    });

    console.log("PDF pages:", totalPages);

    const resumeText =
      typeof text === "string"
        ? text.trim()
        : Array.isArray(text)
        ? (text as string[]).join("\n").trim()
        : String(text || "").trim();

    console.log(
      "Extracted characters:",
      resumeText.length
    );

    // -----------------------------------------
    // Check extracted text
    // -----------------------------------------

    if (!resumeText) {
      return NextResponse.json(
        {
          success: false,
          error:
            "No text could be extracted from this PDF. Your resume may be an image/scanned PDF.",
        },
        { status: 400 }
      );
    }

    // -----------------------------------------
    // Limit extremely large resumes
    // -----------------------------------------

    const maxResumeCharacters = 50000;

    const finalResumeText =
      resumeText.length > maxResumeCharacters
        ? resumeText.substring(0, maxResumeCharacters)
        : resumeText;

    console.log(
      "Text sent to Groq:",
      finalResumeText.length
    );

    // -----------------------------------------
    // Send resume to Groq
    // -----------------------------------------

    const response = await createGroqChatCompletion({
      temperature: 0,

      response_format: {
        type: "json_object",
      },

      messages: [
        {
          role: "system",

          content: `
You are an expert resume parser.

Your job is to extract candidate information
from the resume provided by the user.

IMPORTANT RULES:

1. Return ONLY valid JSON.
2. Do not return markdown.
3. Do not return explanations.
4. Do not invent information.
5. If information is missing, use an empty string.
6. Skills must always be an array.
7. Education must always be an array.
8. Projects must always be an array.
9. Keep information faithful to the resume.
10. Do not assume information that is not present.

Return exactly this JSON structure:

{
  "name": "",
  "email": "",
  "phone": "",
  "location": "",
  "currentRole": "",
  "experience": "",
  "skills": [],
  "education": [],
  "projects": [],
  "summary": ""
}

Field rules:

name:
Candidate's full name.

email:
Candidate's email address.

phone:
Candidate's phone number.

location:
Candidate's city/location.

currentRole:
Current or most recent job title.

experience:
Total professional experience as written or reasonably calculated from the resume.

skills:
Technical and professional skills mentioned in the resume.

education:
Education qualifications, degrees, universities, colleges, and relevant details.

projects:
Projects mentioned in the resume.

summary:
A concise professional summary based ONLY on information present in the resume.
`,
        },

        {
          role: "user",

          content: `
Extract the candidate information from the
following resume.

---------------- RESUME ----------------

${finalResumeText}

-------------- END RESUME --------------
`,
        },
      ],
    });

    // -----------------------------------------
    // Get Groq response
    // -----------------------------------------

    const content =
      response.choices[0]?.message?.content;

    if (!content) {
      throw new Error(
        "Groq returned an empty response"
      );
    }

    console.log("Groq response received");

    console.log("Raw AI response:", content);

    // -----------------------------------------
    // Parse JSON
    // -----------------------------------------

    let profile;

    try {
      profile = JSON.parse(content);
    } catch (jsonError) {
      console.error(
        "Invalid JSON returned by Groq:",
        content
      );

      throw new Error(
        "Groq returned invalid JSON"
      );
    }

    // -----------------------------------------
    // Normalize profile
    // -----------------------------------------

    profile = {
      name:
        typeof profile.name === "string"
          ? profile.name.trim()
          : "",

      email:
        typeof profile.email === "string"
          ? profile.email.trim()
          : "",

      phone:
        typeof profile.phone === "string"
          ? profile.phone.trim()
          : "",

      location:
        typeof profile.location === "string"
          ? profile.location.trim()
          : "",

      currentRole:
        typeof profile.currentRole === "string"
          ? profile.currentRole.trim()
          : "",

      experience:
        typeof profile.experience === "string"
          ? profile.experience.trim()
          : "",

      skills: Array.isArray(profile.skills)
        ? profile.skills
        : [],

      education: Array.isArray(profile.education)
        ? profile.education
        : [],

      projects: Array.isArray(profile.projects)
        ? profile.projects
        : [],

      summary:
        typeof profile.summary === "string"
          ? profile.summary.trim()
          : "",
    };

    // -----------------------------------------
    // Final result
    // -----------------------------------------

    console.log(
      "Profile extracted successfully:",
      profile
    );

    console.log("=== RESUME PARSE END ===");

    return NextResponse.json({
      success: true,
      profile,
    });
  } catch (error) {
    console.error(
      "================================"
    );

    console.error(
      "RESUME PARSING ERROR"
    );

    console.error(error);

    console.error(
      "================================"
    );

    const details =
      error instanceof Error
        ? error.message
        : "Unknown error";

    return NextResponse.json(
      {
        success: false,
        error: "Failed to parse resume",
        details,
      },
      { status: 500 }
    );
  }
}