"use client";

import { useState, useEffect } from "react";
import {
  Briefcase,
  MapPin,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  ExternalLink,
  ChevronRight,
  X,
  Compass,
  Building,
  Clock,
  ArrowUpDown,
  Filter,
} from "lucide-react";

interface JobItem {
  _id: string;
  source: string;
  sourceJobId?: string;
  title: string;
  company: string;
  description: string;
  location: string;
  city?: string;
  workMode: "Remote" | "Hybrid" | "Onsite" | "Unknown";
  employmentType: string;
  experienceRequired?: string;
  skills: string[];
  salary?: { min: number | null; max: number | null; currency: string };
  applicationUrl?: string;
  recruiterEmail?: string;
  postedAt?: string;
}

export interface RecommendationItem {
  _id: string;
  userId: string;
  jobId: JobItem;
  relevanceScore: number;
  shortlistChance: number;
  shortlistAssessment: string;
  strengths: string[];
  missingRequirements: string[];
  riskFactors: string[];
  matchedSkills: string[];
  missingSkills: string[];
  distanceKm?: number;
  distanceCategory: "0–10 km" | "10–25 km" | "25–50 km" | "50+ km" | "Remote";
  status: "NEW" | "VIEWED" | "APPLIED" | "DISMISSED";
  discoveredAt: string;
}

interface RecommendedJobsProps {
  profile: any;
  onSelectJobForApplication: (job: any) => void;
}

export default function RecommendedJobs({
  profile,
  onSelectJobForApplication,
}: RecommendedJobsProps) {
  const [recommendations, setRecommendations] = useState<RecommendationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [discovering, setDiscovering] = useState(false);
  const [error, setError] = useState("");
  const [newCount, setNewCount] = useState(0);
  const [lastDiscoveryAt, setLastDiscoveryAt] = useState<string | null>(null);

  // Filters & Sorting state
  const [sortBy, setSortBy] = useState<"relevance" | "shortlist" | "newest" | "distance">("relevance");
  const [workModeFilter, setWorkModeFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Modal detail
  const [selectedRec, setSelectedRec] = useState<RecommendationItem | null>(null);

  const userId = profile?.email || "default_candidate";

  async function fetchRecommendations() {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({
        userId,
        sortBy,
        status: "active", // show non-dismissed jobs
      });
      if (workModeFilter !== "all") {
        params.set("workMode", workModeFilter);
      }

      const res = await fetch(`/api/jobs/recommendations?${params.toString()}`);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to load recommendations");
      }

      setRecommendations(data.recommendations || []);
      setNewCount(data.newCount || 0);
      setLastDiscoveryAt(data.lastDiscoveryAt || null);
    } catch (err: any) {
      setError(err.message || "Failed to fetch jobs");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchRecommendations();
  }, [sortBy, workModeFilter]);

  async function triggerManualDiscovery() {
    setDiscovering(true);
    setError("");
    try {
      const res = await fetch("/api/jobs/trigger-discovery", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          candidateProfile: profile,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Job discovery failed");
      }
      await fetchRecommendations();
    } catch (err: any) {
      setError(err.message || "Discovery failed");
    } finally {
      setDiscovering(false);
    }
  }

  async function updateStatus(recommendationId: string, status: "VIEWED" | "APPLIED" | "DISMISSED") {
    try {
      await fetch("/api/jobs/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recommendationId, status }),
      });

      if (status === "DISMISSED") {
        setRecommendations((prev) => prev.filter((r) => r._id !== recommendationId));
        if (selectedRec?._id === recommendationId) {
          setSelectedRec(null);
        }
      } else {
        setRecommendations((prev) =>
          prev.map((r) => (r._id === recommendationId ? { ...r, status } : r))
        );
      }
    } catch (err) {
      console.error("Failed to update status:", err);
    }
  }

  function handleOpenJob(rec: RecommendationItem) {
    setSelectedRec(rec);
    if (rec.status === "NEW") {
      updateStatus(rec._id, "VIEWED");
    }
  }

  function handleApply(rec: RecommendationItem) {
    updateStatus(rec._id, "APPLIED");
    onSelectJobForApplication({
      jobTitle: rec.jobId.title,
      company: rec.jobId.company,
      location: rec.jobId.location,
      workMode: rec.jobId.workMode,
      employmentType: rec.jobId.employmentType,
      experienceRequired: rec.jobId.experienceRequired || "",
      skills: rec.jobId.skills || [],
      recruiterEmail: rec.jobId.recruiterEmail || "",
      allEmails: rec.jobId.recruiterEmail ? [rec.jobId.recruiterEmail] : [],
      responsibilities: [],
      applicationInstructions: rec.jobId.applicationUrl ? `Apply online at ${rec.jobId.applicationUrl}` : "",
      relevanceScore: rec.relevanceScore,
      shortlistChance: rec.shortlistChance,
    });
    setSelectedRec(null);
  }

  // Filter recommendations by title/company/skills client-side
  const filteredRecs = recommendations.filter((rec) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    const job = rec.jobId;
    return (
      job.title.toLowerCase().includes(query) ||
      job.company.toLowerCase().includes(query) ||
      job.location.toLowerCase().includes(query) ||
      job.skills.some((s) => s.toLowerCase().includes(query))
    );
  });

  const getMatchCategoryBadge = (score: number) => {
    if (score >= 80) {
      return {
        label: "High Match",
        color: "bg-emerald-50 text-emerald-700 border-emerald-200",
        bar: "bg-emerald-500",
      };
    }
    if (score >= 60) {
      return {
        label: "Medium Match",
        color: "bg-amber-50 text-amber-700 border-amber-200",
        bar: "bg-amber-500",
      };
    }
    return {
      label: "Low Match",
      color: "bg-rose-50 text-rose-700 border-rose-200",
      bar: "bg-rose-500",
    };
  };

  return (
    <div className="space-y-6">
      {/* 6-Hour Cron Notification Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 rounded-2xl border border-blue-100 bg-gradient-to-r from-blue-50/80 to-indigo-50/50 p-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white shadow-sm">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-gray-900">
                AI Job Discovery Engine
              </h3>
              {newCount > 0 && (
                <span className="rounded-full bg-blue-600 px-2.5 py-0.5 text-xs font-semibold text-white animate-pulse">
                  {newCount} new jobs found
                </span>
              )}
            </div>
            <p className="text-xs text-gray-600 mt-0.5">
              Automated 6-hour cron cycle (00:00, 06:00, 12:00, 18:00) with multi-provider discovery
              {lastDiscoveryAt && ` • Last run: ${new Date(lastDiscoveryAt).toLocaleTimeString()}`}
            </p>
          </div>
        </div>

        <button
          onClick={triggerManualDiscovery}
          disabled={discovering}
          className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow hover:bg-blue-700 disabled:opacity-50 transition-all shrink-0"
        >
          <RefreshCw className={`h-4 w-4 ${discovering ? "animate-spin" : ""}`} />
          {discovering ? "Discovering Jobs..." : "Find Jobs Now"}
        </button>
      </div>

      {error && (
        <div className="rounded-xl bg-rose-50 border border-rose-200 p-3 text-sm text-rose-700 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Sorting & Filtering Toolbar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 rounded-2xl border bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-1 mr-1">
            <Filter className="h-3.5 w-3.5" /> Work Mode:
          </span>
          {["all", "Remote", "Hybrid", "Onsite"].map((mode) => (
            <button
              key={mode}
              onClick={() => setWorkModeFilter(mode)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                workModeFilter === mode
                  ? "bg-gray-900 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              {mode === "all" ? "All Modes" : mode}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <input
              type="text"
              placeholder="Search title, company, skill..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="rounded-xl border border-gray-200 py-1.5 px-3 text-xs focus:border-blue-500 focus:outline-none w-48 sm:w-56"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-2 text-gray-400 hover:text-gray-600"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <ArrowUpDown className="h-3.5 w-3.5 text-gray-500" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="rounded-xl border border-gray-200 py-1.5 px-3 text-xs bg-white text-gray-700 focus:border-blue-500 focus:outline-none font-medium"
            >
              <option value="relevance">Sort by Relevance</option>
              <option value="shortlist">Sort by Shortlist Chance</option>
              <option value="newest">Sort by Newest</option>
              <option value="distance">Sort by Distance</option>
            </select>
          </div>
        </div>
      </div>

      {/* Loading state */}
      {loading ? (
        <div className="rounded-2xl border bg-white p-12 text-center shadow-sm">
          <RefreshCw className="mx-auto h-8 w-8 text-blue-600 animate-spin" />
          <p className="mt-3 text-sm font-medium text-gray-700">Loading recommendations...</p>
        </div>
      ) : filteredRecs.length === 0 ? (
        <div className="rounded-2xl border bg-white p-12 text-center shadow-sm">
          <Compass className="mx-auto h-12 w-12 text-gray-300" />
          <h3 className="mt-3 text-lg font-semibold text-gray-800">
            No recommendations match your criteria
          </h3>
          <p className="mt-1 text-sm text-gray-500 max-w-md mx-auto">
            Try adjusting your search filters or click "Find Jobs Now" to trigger a fresh multi-source discovery.
          </p>
          <button
            onClick={triggerManualDiscovery}
            disabled={discovering}
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
          >
            <Sparkles className="h-4 w-4" />
            Run Job Discovery
          </button>
        </div>
      ) : (
        /* Recommended Jobs Grid */
        <div className="grid gap-4 md:grid-cols-2">
          {filteredRecs.map((rec) => {
            const job = rec.jobId;
            const relBadge = getMatchCategoryBadge(rec.relevanceScore);
            const shortBadge = getMatchCategoryBadge(rec.shortlistChance);

            return (
              <div
                key={rec._id}
                className="group relative rounded-2xl border border-gray-200 bg-white p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
              >
                {/* Status Indicator */}
                {rec.status === "NEW" && (
                  <div className="absolute top-4 right-4">
                    <span className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-semibold text-blue-700">
                      NEW
                    </span>
                  </div>
                )}

                <div>
                  <div className="pr-12">
                    <h3 className="text-lg font-bold text-gray-900 group-hover:text-blue-600 transition-colors">
                      {job.title}
                    </h3>
                    <p className="text-sm font-medium text-gray-600 flex items-center gap-1.5 mt-0.5">
                      <Building className="h-3.5 w-3.5 text-gray-400" />
                      {job.company}
                    </p>
                  </div>

                  {/* Badges: Location, WorkMode, Distance */}
                  <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                    <span className="inline-flex items-center gap-1 rounded-lg bg-gray-100 px-2.5 py-1 text-gray-700 font-medium">
                      <MapPin className="h-3 w-3 text-gray-500" />
                      {job.location}
                      {rec.distanceCategory !== "Remote" && rec.distanceKm !== undefined && (
                        <span className="text-gray-500 font-normal">
                          ({rec.distanceKm} km • {rec.distanceCategory})
                        </span>
                      )}
                    </span>

                    <span className="inline-flex items-center gap-1 rounded-lg bg-indigo-50 px-2.5 py-1 text-indigo-700 font-medium">
                      <Briefcase className="h-3 w-3 text-indigo-500" />
                      {job.workMode}
                    </span>

                    <span className="inline-flex items-center rounded-lg bg-gray-100 px-2.5 py-1 text-gray-600">
                      {job.employmentType}
                    </span>
                  </div>

                  {/* Dual Metric Display: Deterministic Relevance vs AI Shortlist Chance */}
                  <div className="mt-4 grid grid-cols-2 gap-3 rounded-xl bg-gray-50 p-3 border border-gray-100">
                    <div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-gray-500 font-medium">Relevance:</span>
                        <span className="font-bold text-gray-900">{rec.relevanceScore}%</span>
                      </div>
                      <div className="mt-1.5 h-1.5 w-full bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className={`h-full ${relBadge.bar} rounded-full`}
                          style={{ width: `${rec.relevanceScore}%` }}
                        />
                      </div>
                      <span className={`mt-1 inline-block text-[10px] font-semibold px-1.5 py-0.2 rounded border ${relBadge.color}`}>
                        {relBadge.label}
                      </span>
                    </div>

                    <div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-gray-500 font-medium" title="Honest requirement gap analysis by AI">
                          AI Shortlist:
                        </span>
                        <span className="font-bold text-gray-900">{rec.shortlistChance}%</span>
                      </div>
                      <div className="mt-1.5 h-1.5 w-full bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className={`h-full ${shortBadge.bar} rounded-full`}
                          style={{ width: `${rec.shortlistChance}%` }}
                        />
                      </div>
                      <span className="text-[10px] text-gray-500 block mt-1 truncate">
                        AI estimated shortlist chance
                      </span>
                    </div>
                  </div>

                  {/* Matched & Missing Skills */}
                  <div className="mt-4 space-y-2">
                    {rec.matchedSkills.length > 0 && (
                      <div className="flex flex-wrap items-center gap-1.5 text-xs">
                        <span className="text-emerald-700 font-medium text-[11px]">Matched:</span>
                        {rec.matchedSkills.slice(0, 4).map((skill, i) => (
                          <span
                            key={i}
                            className="rounded-md bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-800 border border-emerald-100"
                          >
                            {skill}
                          </span>
                        ))}
                        {rec.matchedSkills.length > 4 && (
                          <span className="text-[10px] text-emerald-600">
                            +{rec.matchedSkills.length - 4} more
                          </span>
                        )}
                      </div>
                    )}

                    {rec.missingSkills && rec.missingSkills.length > 0 && (
                      <div className="flex flex-wrap items-center gap-1.5 text-xs">
                        <span className="text-rose-700 font-medium text-[11px]">Missing:</span>
                        {rec.missingSkills.slice(0, 3).map((skill, i) => (
                          <span
                            key={i}
                            className="rounded-md bg-rose-50 px-2 py-0.5 text-[11px] font-medium text-rose-800 border border-rose-100"
                          >
                            {skill}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="mt-5 pt-4 border-t border-gray-100 flex items-center justify-between gap-2">
                  <button
                    onClick={() => handleOpenJob(rec)}
                    className="rounded-xl border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    View Job
                  </button>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => updateStatus(rec._id, "DISMISSED")}
                      className="rounded-xl px-2.5 py-2 text-xs font-medium text-gray-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                      title="Dismiss job"
                    >
                      Dismiss
                    </button>

                    <button
                      onClick={() => handleApply(rec)}
                      className="flex items-center gap-1.5 rounded-xl bg-black px-4 py-2 text-xs font-semibold text-white hover:bg-gray-800 transition-colors shadow-sm"
                    >
                      Apply
                      <ChevronRight className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Job Details & Transparent AI Match Analysis Modal */}
      {selectedRec && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="relative w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl my-8 max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setSelectedRec(null)}
              className="absolute right-4 top-4 rounded-xl p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
            >
              <X className="h-5 w-5" />
            </button>

            {/* Header */}
            <div>
              <span className="text-xs font-semibold text-blue-600 uppercase tracking-wider">
                {selectedRec.jobId.source} Job
              </span>
              <h2 className="text-2xl font-bold text-gray-900 mt-0.5">
                {selectedRec.jobId.title}
              </h2>
              <p className="text-base text-gray-600 mt-1 flex items-center gap-2">
                <Building className="h-4 w-4" />
                {selectedRec.jobId.company}
              </p>
            </div>

            {/* Badges */}
            <div className="mt-4 flex flex-wrap gap-2 text-xs">
              <span className="inline-flex items-center gap-1 rounded-lg bg-gray-100 px-3 py-1.5 text-gray-800 font-medium">
                <MapPin className="h-3.5 w-3.5 text-gray-500" />
                {selectedRec.jobId.location}
              </span>
              <span className="inline-flex items-center gap-1 rounded-lg bg-indigo-50 px-3 py-1.5 text-indigo-700 font-medium">
                <Briefcase className="h-3.5 w-3.5 text-indigo-500" />
                {selectedRec.jobId.workMode}
              </span>
              <span className="inline-flex items-center rounded-lg bg-gray-100 px-3 py-1.5 text-gray-700">
                {selectedRec.jobId.employmentType}
              </span>
              {selectedRec.jobId.experienceRequired && (
                <span className="inline-flex items-center gap-1 rounded-lg bg-amber-50 px-3 py-1.5 text-amber-800 font-medium">
                  <Clock className="h-3.5 w-3.5 text-amber-600" />
                  Exp: {selectedRec.jobId.experienceRequired}
                </span>
              )}
            </div>

            {/* AI Match Analysis Box */}
            <div className="mt-6 rounded-2xl border border-blue-100 bg-blue-50/50 p-5">
              <div className="flex items-center justify-between border-b border-blue-100 pb-3">
                <h4 className="font-bold text-blue-900 flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-blue-600" />
                  AI Match Analysis
                </h4>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <span className="text-[11px] text-gray-500 block">Relevance</span>
                    <span className="font-bold text-gray-900">{selectedRec.relevanceScore}%</span>
                  </div>
                  <div className="text-right">
                    <span className="text-[11px] text-gray-500 block">AI Shortlist Chance</span>
                    <span className="font-bold text-blue-700">{selectedRec.shortlistChance}%</span>
                  </div>
                </div>
              </div>

              {selectedRec.shortlistAssessment && (
                <p className="mt-3 text-sm text-gray-700 leading-relaxed">
                  {selectedRec.shortlistAssessment}
                </p>
              )}

              {/* Strengths */}
              {selectedRec.strengths && selectedRec.strengths.length > 0 && (
                <div className="mt-3">
                  <span className="text-xs font-semibold text-emerald-800 uppercase tracking-wider">
                    Candidate Strengths:
                  </span>
                  <ul className="mt-1 space-y-1">
                    {selectedRec.strengths.map((str, i) => (
                      <li key={i} className="text-xs text-gray-700 flex items-start gap-1.5">
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0 mt-0.5" />
                        <span>{str}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Missing Requirements & Risk Factors */}
              {((selectedRec.missingRequirements && selectedRec.missingRequirements.length > 0) ||
                (selectedRec.riskFactors && selectedRec.riskFactors.length > 0)) && (
                <div className="mt-3">
                  <span className="text-xs font-semibold text-amber-800 uppercase tracking-wider">
                    Gaps & Considerations:
                  </span>
                  <ul className="mt-1 space-y-1">
                    {(selectedRec.missingRequirements || []).map((req, i) => (
                      <li key={`req-${i}`} className="text-xs text-gray-700 flex items-start gap-1.5">
                        <AlertTriangle className="h-3.5 w-3.5 text-amber-600 shrink-0 mt-0.5" />
                        <span>Missing Requirement: {req}</span>
                      </li>
                    ))}
                    {(selectedRec.riskFactors || []).map((risk, i) => (
                      <li key={`risk-${i}`} className="text-xs text-gray-700 flex items-start gap-1.5">
                        <AlertTriangle className="h-3.5 w-3.5 text-rose-500 shrink-0 mt-0.5" />
                        <span>{risk}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Description */}
            <div className="mt-6">
              <h4 className="font-semibold text-gray-900 text-sm">Job Description</h4>
              <p className="mt-2 text-sm text-gray-700 leading-relaxed whitespace-pre-line bg-gray-50 p-4 rounded-xl border border-gray-100 max-h-48 overflow-y-auto">
                {selectedRec.jobId.description}
              </p>
            </div>

            {/* Recruiter Email & Source */}
            <div className="mt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-gray-600 pt-3 border-t">
              <div>
                <strong>Recruiter Email:</strong>{" "}
                {selectedRec.jobId.recruiterEmail ? (
                  <span className="text-emerald-700 font-mono bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    {selectedRec.jobId.recruiterEmail}
                  </span>
                ) : (
                  <span className="text-amber-700 font-medium bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                    Mail is not available (Portal application)
                  </span>
                )}
              </div>
              {selectedRec.jobId.applicationUrl && (
                <a
                  href={selectedRec.jobId.applicationUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-blue-600 hover:underline"
                >
                  View Original Listing <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </div>

            {/* Action Bar */}
            <div className="mt-6 flex items-center justify-end gap-3 pt-4 border-t">
              <button
                onClick={() => setSelectedRec(null)}
                className="rounded-xl border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Close
              </button>
              <button
                onClick={() => handleApply(selectedRec)}
                className="flex items-center gap-2 rounded-xl bg-black px-6 py-2.5 text-sm font-semibold text-white hover:bg-gray-800 shadow-md"
              >
                <Sparkles className="h-4 w-4" />
                Generate Application & Review
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
