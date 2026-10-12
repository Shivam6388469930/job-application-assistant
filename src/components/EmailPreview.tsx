"use client";

import { useState } from "react";
import { Mail, MailX, Send, Copy, Check, AlertCircle } from "lucide-react";

interface EmailPreviewProps {
  subject: string;
  body: string;
  to: string;
}

export default function EmailPreview({
  subject: initialSubject,
  body: initialBody,
  to: initialTo,
}: EmailPreviewProps) {
  const [to, setTo] = useState(initialTo || "");
  const [subject, setSubject] = useState(initialSubject);
  const [body, setBody] = useState(initialBody);

  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [copied, setCopied] = useState(false);

  async function connectGmail() {
    window.location.href = "/api/auth/google";
  }

  async function sendEmail() {
    if (!to.trim()) {
      setMessage({
        type: "error",
        text: "Please enter a recipient email address.",
      });
      return;
    }

    setSending(true);
    setMessage(null);

    try {
      const response = await fetch("/api/send-email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          to: to.trim(),
          subject,
          body,
        }),
      });

      const data = await response.json();

      if (response.status === 401 || data.needsAuth) {
        await connectGmail();
        return;
      }

      if (!response.ok) {
        throw new Error(data.error || "Failed to send email");
      }

      setMessage({
        type: "success",
        text: "Email sent successfully via Gmail.",
      });
    } catch (error) {
      setMessage({
        type: "error",
        text: error instanceof Error ? error.message : "Failed to send email",
      });
    } finally {
      setSending(false);
    }
  }

  function handleCopy() {
    navigator.clipboard.writeText(`Subject: ${subject}\n\n${body}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }

  const hasEmail = Boolean(to.trim());

  return (
    <div className="mt-8 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="mb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <Mail className="h-5 w-5 text-blue-600" />
          Email Preview
        </h2>

        {hasEmail ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 border border-emerald-200">
            To: {to}
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700 border border-amber-200">
            <MailX className="h-3.5 w-3.5" /> Mail is not available
          </span>
        )}
      </div>

      {!hasEmail && (
        <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-3.5 text-xs text-amber-800 flex items-start gap-2">
          <AlertCircle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
          <span>
            <strong>Mail is not available:</strong> No email address was detected. Please enter recipient email below or copy the message.
          </span>
        </div>
      )}

      <div className="space-y-4">
        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-gray-700">
            Recipient Email (To)
          </label>
          <input
            type="email"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            placeholder="recruiter@company.com"
            className="w-full rounded-xl border border-gray-300 p-3 text-sm outline-none focus:border-black"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-gray-700">
            Subject
          </label>
          <input
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className="w-full rounded-xl border border-gray-300 p-3 text-sm outline-none focus:border-black font-medium"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-gray-700">
            Email Body
          </label>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={10}
            className="w-full rounded-xl border border-gray-300 p-4 text-sm leading-relaxed outline-none focus:border-black font-normal"
          />
        </div>

        {message && (
          <div
            className={`rounded-xl p-3.5 text-sm ${
              message.type === "success"
                ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                : "bg-rose-50 text-rose-800 border border-rose-200"
            }`}
          >
            {message.text}
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <button
            type="button"
            onClick={handleCopy}
            className="flex items-center justify-center gap-2 rounded-xl border border-gray-300 px-4 py-3 text-sm font-semibold hover:bg-gray-50"
          >
            {copied ? (
              <>
                <Check className="h-4 w-4 text-emerald-600" /> Copied
              </>
            ) : (
              <>
                <Copy className="h-4 w-4 text-gray-500" /> Copy Text
              </>
            )}
          </button>

          <button
            type="button"
            onClick={connectGmail}
            className="rounded-xl border border-gray-300 px-5 py-3 text-sm font-semibold hover:bg-gray-50"
          >
            Connect Gmail
          </button>

          <button
            type="button"
            onClick={sendEmail}
            disabled={sending || !hasEmail}
            className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-black px-5 py-3 text-sm font-semibold text-white hover:bg-gray-800 disabled:opacity-40"
          >
            <Send className="h-4 w-4" />
            {sending
              ? "Sending..."
              : hasEmail
              ? "Send Email"
              : "Mail is not available (Enter email)"}
          </button>
        </div>
      </div>
    </div>
  );
}