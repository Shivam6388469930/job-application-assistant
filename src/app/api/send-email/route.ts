import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";
import { getGoogleOAuthClient } from "@/lib/gmail";

export const runtime = "nodejs";

function encodeMessage(message: string) {
  return Buffer.from(message, "utf-8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function encodeSubject(subject: string) {
  const encoded = Buffer.from(
    subject,
    "utf-8"
  ).toString("base64");

  return `=?UTF-8?B?${encoded}?=`;
}

export async function POST(request: NextRequest) {
  try {
    console.log("=== GMAIL SEND START ===");

    const refreshToken =
      request.cookies.get(
        "gmail_refresh_token"
      )?.value;

    if (!refreshToken) {
      console.log(
        "Gmail refresh token not found"
      );

      return NextResponse.json(
        {
          success: false,
          error: "Gmail is not connected",
          needsAuth: true,
        },
        { status: 401 }
      );
    }

    const {
      to,
      subject,
      body,
    } = await request.json();

    if (!to || !subject || !body) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Recipient, subject and body are required",
        },
        { status: 400 }
      );
    }

    console.log("Recipient:", to);
    console.log("Subject:", subject);

    const client =
      getGoogleOAuthClient();

    client.setCredentials({
      refresh_token: refreshToken,
    });

    const gmail = google.gmail({
      version: "v1",
      auth: client,
    });

    const encodedSubject =
      encodeSubject(subject);

    const rawMessage = [
      `To: ${to}`,
      `Subject: ${encodedSubject}`,
      "MIME-Version: 1.0",
      "Content-Type: text/plain; charset=UTF-8",
      "Content-Transfer-Encoding: 8bit",
      "",
      body,
    ].join("\r\n");

    const encodedMessage =
      encodeMessage(rawMessage);

    const result =
      await gmail.users.messages.send({
        userId: "me",
        requestBody: {
          raw: encodedMessage,
        },
      });

    console.log(
      "Gmail message sent:",
      result.data.id
    );

    console.log(
      "=== GMAIL SEND SUCCESS ==="
    );

    return NextResponse.json({
      success: true,
      messageId: result.data.id,
    });
  } catch (error) {
    console.error(
      "================================"
    );

    console.error(
      "GMAIL SEND ERROR"
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
        error: "Failed to send email",
        details,
      },
      { status: 500 }
    );
  }
}