"use client";

import { useState } from "react";
import {
  Mail,
  MailX,
  Send,
  Copy,
  Check,
  ExternalLink,
  Sparkles,
  AlertTriangle,
  Building,
  MapPin,
  Briefcase,
  Clock,
  CheckCircle2,
} from "lucide-react";

interface ApplicationPreviewProps {
  result: any;
}

export default function ApplicationPreview({ result }: ApplicationPreviewProps) {
  const job = result.job || {};
  const application = result.application || {};

  const initialEmail = job.recruiterEmail || (job.allEmails && job.allEmails.length > 0 ? job.allEmails[0] : "");

  const [toEmail, setToEmail] = useState<string>(initialEmail);
  const [subject, setSubject] = useState<string>(application.subject || "");
  const [body, setBody] = useState<string>(application.body || "");
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error" | "info"; text: string } | null>(null);
  const [copied, setCopied] = useState(false);

  async function sendEmail() {
    if (!toEmail.trim()) {
      setMessage({
        type: "error",
        text: "Recipient email is required to send this email via Gmail. Please enter an email address above.",
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
          to: toEmail.trim(),
          subject,
          body,
        }),
      });

      const data = await response.json();

      if (data.needsAuth) {
        window.location.href = "/api/auth/google";
        return;
      }

      if (!response.ok) {
        throw new Error(data.error || "Failed to send email");
      }

      setMessage({
        type: "success",
        text: "Application email sent successfully via connected Gmail!",
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
    const fullText = `Subject: ${subject}\n\n${body}`;
    navigator.clipboard.writeText(fullText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }

  const hasEmail = Boolean(toEmail.trim());

  return (
    <div className="mt-8 rounded-2xl border border-gray-200 bg-white p-6 sm:p-8 shadow-sm">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 pb-6 border-b border-gray-100">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-bold text-gray-900">
              {job.jobTitle || "Target Job Opportunity"}
            </h2>
          </div>
          <p className="mt-1 text-base text-gray-600 flex items-center gap-2 font-medium">
            <Building className="h-4 w-4 text-gray-400" />
            {job.company || "Company not specified"}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div
            className={`rounded-full px-4 py-1.5 text-xs font-semibold border ${
              application.match === "high"
                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                : application.match === "medium"
                ? "bg-amber-50 text-amber-700 border-amber-200"
                : "bg-rose-50 text-rose-700 border-rose-200"
            }`}
          >
            Match: <span className="capitalize">{application.match || "Analyzed"}</span>
          </div>

          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 rounded-xl border border-gray-200 px-3.5 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition"
          >
            {copied ? (
              <>
                <Check className="h-3.5 w-3.5 text-emerald-600" /> Copied Draft
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5 text-gray-500" /> Copy Draft
              </>
            )}
          </button>
        </div>
      </div>

      {/* Overview Details */}
      <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
        <div className="rounded-xl bg-gray-50 p-3 border border-gray-100">
          <span className="text-gray-400 block font-medium">Location</span>
          <span className="font-semibold text-gray-800 flex items-center gap-1 mt-0.5">
            <MapPin className="h-3.5 w-3.5 text-gray-400" />
            {job.location || "Not specified"}
          </span>
        </div>

        <div className="rounded-xl bg-gray-50 p-3 border border-gray-100">
          <span className="text-gray-400 block font-medium">Work Mode</span>
          <span className="font-semibold text-gray-800 flex items-center gap-1 mt-0.5">
            <Briefcase className="h-3.5 w-3.5 text-gray-400" />
            {job.workMode || "Not specified"}
          </span>
        </div>

        <div className="rounded-xl bg-gray-50 p-3 border border-gray-100">
          <span className="text-gray-400 block font-medium">Experience</span>
          <span className="font-semibold text-gray-800 flex items-center gap-1 mt-0.5">
            <Clock className="h-3.5 w-3.5 text-gray-400" />
            {job.experienceRequired || "Not specified"}
          </span>
        </div>

        <div className="rounded-xl bg-gray-50 p-3 border border-gray-100">
          <span className="text-gray-400 block font-medium">Notice Period</span>
          <span className="font-semibold text-gray-800 block mt-0.5">
            {job.noticePeriod || "Not specified"}
          </span>
        </div>
      </div>

      {/* Skills */}
      {job.skills && job.skills.length > 0 && (
        <div className="mt-4 flex flex-wrap items-center gap-1.5">
          <span className="text-xs font-semibold text-gray-500 mr-1">Required Skills:</span>
          {job.skills.map((skill: string, index: number) => (
            <span
              key={index}
              className="rounded-lg bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-700 border border-gray-200"
            >
              {skill}
            </span>
          ))}
        </div>
      )}

      {/* Match Reason Banner */}
      {application.matchReason && (
        <div className="mt-4 rounded-xl bg-blue-50/60 border border-blue-100 p-3.5 text-xs text-blue-900 flex items-start gap-2">
          <Sparkles className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
          <p>
            <strong>Match Analysis:</strong> {application.matchReason}
          </p>
        </div>
      )}

      {/* Mail Availability Notice */}
      <div className="mt-6">
        {!hasEmail ? (
          <div className="rounded-2xl border border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50/60 p-4 text-amber-900 shadow-sm flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
              <MailX className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h4 className="font-bold text-amber-900">Mail is not available</h4>
                <span className="rounded-full bg-amber-200/80 px-2 py-0.5 text-[10px] font-bold uppercase text-amber-800">
                  No Email Detected
                </span>
              </div>
              <p className="mt-1 text-xs text-amber-800 leading-relaxed">
                No recruiter or contact email address was found in this job posting. You can enter a recipient email manually below, or copy the generated application message and apply through their direct portal.
              </p>
              {job.applicationUrl && (
                <div className="mt-2.5">
                  <a
                    href={job.applicationUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-xl bg-amber-700 px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-amber-800 transition"
                  >
                    Open Application Link <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-3 text-xs text-emerald-900 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-emerald-600 shrink-0" />
              <span>
                <strong>Application Recipient Email:</strong> <span className="font-mono">{toEmail}</span>
              </span>
            </div>
            <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800 uppercase">
              Email Available
            </span>
          </div>
        )}
      </div>

      {/* Application Email Form */}
      <div className="mt-6 space-y-4">
        <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
          <Mail className="h-5 w-5 text-blue-600" />
          Generated Application Email
        </h3>

        {/* Recipient Email Input */}
        <div>
          <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
            Recipient / Recruiter Email
          </label>
          <div className="relative">
            <input
              type="email"
              value={toEmail}
              onChange={(e) => setToEmail(e.target.value)}
              placeholder="e.g. recruiter@company.com or hr@company.com"
              className={`w-full rounded-xl border p-3 text-sm outline-none transition ${
                !toEmail
                  ? "border-amber-300 bg-amber-50/20 focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                  : "border-gray-300 focus:border-black focus:ring-1 focus:ring-black"
              }`}
            />
            {job.allEmails && job.allEmails.length > 1 && (
              <div className="mt-1.5 flex flex-wrap items-center gap-1 text-[11px] text-gray-500">
                <span>Emails found in post:</span>
                {job.allEmails.map((em: string, i: number) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setToEmail(em)}
                    className="underline text-blue-600 hover:text-blue-800 font-mono"
                  >
                    {em}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Subject */}
        <div>
          <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
            Subject
          </label>
          <input
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className="w-full rounded-xl border border-gray-300 p-3 text-sm outline-none focus:border-black focus:ring-1 focus:ring-black transition font-medium"
          />
        </div>

        {/* Email Body */}
        <div>
          <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
            Email Body
          </label>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={12}
            className="w-full rounded-xl border border-gray-300 p-4 text-sm leading-relaxed outline-none focus:border-black focus:ring-1 focus:ring-black transition font-normal"
          />
        </div>

        {message && (
          <div
            className={`rounded-xl p-4 text-sm flex items-start gap-2.5 ${
              message.type === "success"
                ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                : message.type === "error"
                ? "bg-rose-50 text-rose-800 border border-rose-200"
                : "bg-blue-50 text-blue-800 border border-blue-200"
            }`}
          >
            {message.type === "success" ? (
              <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
            ) : (
              <AlertTriangle className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
            )}
            <p className="font-medium">{message.text}</p>
          </div>
        )}

        {/* Actions Bar */}
        <div className="flex flex-col sm:flex-row items-center gap-3 pt-3">
          <button
            type="button"
            onClick={handleCopy}
            className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-xl border border-gray-300 bg-white px-5 py-3.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition shadow-sm"
          >
            {copied ? (
              <>
                <Check className="h-4 w-4 text-emerald-600" />
                <span>Copied to Clipboard!</span>
              </>
            ) : (
              <>
                <Copy className="h-4 w-4 text-gray-500" />
                <span>Copy Draft (Subject + Body)</span>
              </>
            )}
          </button>

          <button
            onClick={sendEmail}
            disabled={sending || !toEmail.trim()}
            className="w-full sm:flex-1 flex items-center justify-center gap-2 rounded-xl bg-black px-6 py-3.5 text-sm font-semibold text-white hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed shadow transition"
          >
            <Send className="h-4 w-4" />
            {sending
              ? "Sending via Gmail..."
              : toEmail.trim()
              ? `Send Application to ${toEmail}`
              : "Mail is not available (Enter recipient email above)"}
          </button>
        </div>
      </div>
    </div>
  );
}