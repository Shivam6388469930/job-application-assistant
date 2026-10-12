"use client";

import { useEffect, useState } from "react";
import {
  Sparkles,
  Sliders,
  FileText,
  UserCheck,
  Briefcase,
  Layers,
  ArrowRight,
} from "lucide-react";

import ResumeSetup from "@/components/ResumeSetup";
import JobPaste from "@/components/JobPaste";
import ApplicationPreview from "@/components/ApplicationPreview";
import RecommendedJobs from "@/components/RecommendedJobs";
import JobPreferencesSettings from "@/components/JobPreferencesSettings";

export default function Home() {
  const [profile, setProfile] = useState<any>(null);
  const [result, setResult] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<"discovery" | "preferences" | "paste">("discovery");
  const [generatingForJob, setGeneratingForJob] = useState(false);
  const [genError, setGenError] = useState("");

  useEffect(() => {
    const saved = localStorage.getItem("candidateProfile");

    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setProfile(parsed);

        // Ensure user is registered in MongoDB
        fetch("/api/jobs/preferences", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: parsed.email || "default_candidate",
            candidate: parsed,
          }),
        }).catch(() => {});
      } catch {
        localStorage.removeItem("candidateProfile");
      }
    }
  }, []);

  async function handleApplyFromDiscovery(job: any) {
    if (!profile) return;
    setGeneratingForJob(true);
    setGenError("");

    try {
      const emailResponse = await fetch("/api/generate-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          profile,
          job,
        }),
      });

      const emailData = await emailResponse.json();
      if (!emailResponse.ok) {
        throw new Error(emailData.error || "Failed to generate email");
      }

      setResult({
        job,
        application: emailData,
      });

      // Smooth scroll to application preview
      setTimeout(() => {
        const el = document.getElementById("application-preview-section");
        if (el) {
          el.scrollIntoView({ behavior: "smooth" });
        }
      }, 100);
    } catch (err: any) {
      setGenError(err.message || "Failed to generate application");
    } finally {
      setGeneratingForJob(false);
    }
  }

  return (
    <main className="min-h-screen bg-gray-50/70 pb-20">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 py-8">
        {/* Header */}
        <header className="mb-8 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50/80 px-3.5 py-1 text-xs font-semibold text-blue-700 shadow-sm mb-3">
            <Sparkles className="h-3.5 w-3.5" />
            AI-Powered Job Application & Autonomous Discovery
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 tracking-tight">
            Job Discovery & Application Assistant
          </h1>
          <p className="mx-auto mt-2 max-w-2xl text-sm sm:text-base text-gray-600">
            Autonomous 6-hour job finder that scans multiple job sources, scores relevance,
            estimates shortlist probability with AI, and drafts tailored applications ready for Gmail.
          </p>
        </header>

        {!profile ? (
          <ResumeSetup onProfileSaved={setProfile} />
        ) : (
          <div className="space-y-6">
            {/* Candidate Profile Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl bg-white border border-gray-200 p-4 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700 font-bold">
                  <UserCheck className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-bold text-gray-900">{profile.name || "Candidate"}</p>
                    <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 border border-emerald-200">
                      Resume Active
                    </span>
                  </div>
                  <p className="text-xs text-gray-500">
                    {profile.currentRole || "Tech Professional"} • {profile.location || "Remote"} •{" "}
                    {profile.experience || "Experience listed"}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    localStorage.removeItem("candidateProfile");
                    setProfile(null);
                    setResult(null);
                  }}
                  className="rounded-xl border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 hover:text-rose-600 transition-colors"
                >
                  Change Resume
                </button>
              </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex rounded-2xl border border-gray-200 bg-white p-1.5 shadow-sm">
              <button
                onClick={() => setActiveTab("discovery")}
                className={`flex-1 flex items-center justify-center gap-2 rounded-xl py-2.5 px-4 text-xs sm:text-sm font-semibold transition-all ${
                  activeTab === "discovery"
                    ? "bg-black text-white shadow-sm"
                    : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                }`}
              >
                <Sparkles className="h-4 w-4" />
                Recommended Jobs
              </button>

              <button
                onClick={() => setActiveTab("preferences")}
                className={`flex-1 flex items-center justify-center gap-2 rounded-xl py-2.5 px-4 text-xs sm:text-sm font-semibold transition-all ${
                  activeTab === "preferences"
                    ? "bg-black text-white shadow-sm"
                    : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                }`}
              >
                <Sliders className="h-4 w-4" />
                Discovery Preferences
              </button>

              <button
                onClick={() => setActiveTab("paste")}
                className={`flex-1 flex items-center justify-center gap-2 rounded-xl py-2.5 px-4 text-xs sm:text-sm font-semibold transition-all ${
                  activeTab === "paste"
                    ? "bg-black text-white shadow-sm"
                    : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                }`}
              >
                <FileText className="h-4 w-4" />
                Paste Job Post
              </button>
            </div>

            {/* Loading state when generating email from discovery */}
            {generatingForJob && (
              <div className="rounded-2xl border border-blue-200 bg-blue-50 p-6 text-center shadow-sm animate-pulse">
                <Sparkles className="mx-auto h-8 w-8 text-blue-600 animate-spin" />
                <h4 className="mt-2 font-bold text-blue-900">
                  AI Crafting Your Tailored Application Email...
                </h4>
                <p className="mt-1 text-xs text-blue-700">
                  Aligning your verified experience with the job requirements without inventing credentials.
                </p>
              </div>
            )}

            {genError && (
              <div className="rounded-xl bg-rose-50 border border-rose-200 p-3 text-xs text-rose-700">
                {genError}
              </div>
            )}

            {/* Tab Contents */}
            {activeTab === "discovery" && (
              <RecommendedJobs
                profile={profile}
                onSelectJobForApplication={handleApplyFromDiscovery}
              />
            )}

            {activeTab === "preferences" && (
              <JobPreferencesSettings profile={profile} />
            )}

            {activeTab === "paste" && (
              <JobPaste profile={profile} onResult={setResult} />
            )}

            {/* Application Preview & Gmail Dispatch */}
            {result && (
              <div id="application-preview-section" className="pt-4">
                <div className="flex items-center gap-2 mb-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  <ArrowRight className="h-3.5 w-3.5 text-blue-600" /> Review Generated Application
                </div>
                <ApplicationPreview result={result} />
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}