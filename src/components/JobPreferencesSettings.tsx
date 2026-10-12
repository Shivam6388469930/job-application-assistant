"use client";

import { useState, useEffect } from "react";
import {
  Sliders,
  Sparkles,
  MapPin,
  Briefcase,
  Clock,
  DollarSign,
  Save,
  Check,
  Plus,
  X,
  Compass,
} from "lucide-react";

interface JobPreferencesSettingsProps {
  profile: any;
  onPreferencesUpdated?: () => void;
}

export default function JobPreferencesSettings({
  profile,
  onPreferencesUpdated,
}: JobPreferencesSettingsProps) {
  const [preferences, setPreferences] = useState({
    jobDiscoveryEnabled: true,
    preferredRoles: [] as string[],
    preferredLocations: [] as string[],
    radiusKm: 50,
    preferredWorkModes: ["Remote", "Hybrid", "Onsite"],
    preferredEmploymentTypes: ["Full-Time"],
    minimumExperience: "0 years",
    maximumExperience: "3 years",
    preferredShift: "Day Shift",
    minimumSalary: null as number | null,
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [newRoleInput, setNewRoleInput] = useState("");
  const [newLocInput, setNewLocInput] = useState("");

  const userId = profile?.email || "default_candidate";

  // Load saved preferences or suggest from profile
  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const res = await fetch(`/api/jobs/preferences?userId=${encodeURIComponent(userId)}`);
        const data = await res.json();

        if (data.exists && data.profile?.preferences) {
          setPreferences((prev) => ({
            ...prev,
            ...data.profile.preferences,
          }));
        } else {
          // Auto-suggest initial preferences from resume
          suggestFromResume();
        }
      } catch (err) {
        console.error("Failed to load preferences:", err);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [userId]);

  async function suggestFromResume() {
    try {
      const res = await fetch("/api/jobs/preferences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          candidate: profile,
          action: "suggest",
        }),
      });
      const data = await res.json();
      if (data.suggested) {
        setPreferences((prev) => ({
          ...prev,
          ...data.suggested,
        }));
        setMessage("Preferences auto-suggested from your resume! Review and save below.");
      }
    } catch (err) {
      console.error("Failed to suggest:", err);
    }
  }

  async function savePreferences() {
    setSaving(true);
    setMessage("");
    try {
      const res = await fetch("/api/jobs/preferences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          candidate: profile,
          preferences,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to save preferences");
      }
      setMessage("Preferences saved successfully!");
      if (onPreferencesUpdated) {
        onPreferencesUpdated();
      }
    } catch (err: any) {
      setMessage(err.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  function addRole() {
    if (newRoleInput.trim() && !preferences.preferredRoles.includes(newRoleInput.trim())) {
      setPreferences((prev) => ({
        ...prev,
        preferredRoles: [...prev.preferredRoles, newRoleInput.trim()],
      }));
      setNewRoleInput("");
    }
  }

  function removeRole(role: string) {
    setPreferences((prev) => ({
      ...prev,
      preferredRoles: prev.preferredRoles.filter((r) => r !== role),
    }));
  }

  function addLocation() {
    if (newLocInput.trim() && !preferences.preferredLocations.includes(newLocInput.trim())) {
      setPreferences((prev) => ({
        ...prev,
        preferredLocations: [...prev.preferredLocations, newLocInput.trim()],
      }));
      setNewLocInput("");
    }
  }

  function removeLocation(loc: string) {
    setPreferences((prev) => ({
      ...prev,
      preferredLocations: prev.preferredLocations.filter((l) => l !== loc),
    }));
  }

  function toggleWorkMode(mode: string) {
    setPreferences((prev) => {
      const current = prev.preferredWorkModes;
      const updated = current.includes(mode)
        ? current.filter((m) => m !== mode)
        : [...current, mode];
      return { ...prev, preferredWorkModes: updated };
    });
  }

  if (loading) {
    return (
      <div className="rounded-2xl border bg-white p-8 text-center text-sm text-gray-500">
        Loading job preferences...
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b">
        <div>
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Sliders className="h-5 w-5 text-blue-600" />
            Job Discovery Settings & Preferences
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Configures how the automated 6-hour cron engine finds and filters matching job opportunities for you.
          </p>
        </div>

        <button
          onClick={suggestFromResume}
          className="flex items-center gap-2 rounded-xl bg-blue-50 px-3.5 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-100 transition-colors shrink-0"
        >
          <Sparkles className="h-4 w-4" />
          Suggest from Resume
        </button>
      </div>

      {message && (
        <div className="mt-4 rounded-xl bg-blue-50 border border-blue-200 p-3 text-sm text-blue-800 flex items-center gap-2">
          <Check className="h-4 w-4 text-blue-600 shrink-0" />
          <span>{message}</span>
        </div>
      )}

      <div className="mt-6 space-y-6">
        {/* Toggle automated discovery */}
        <div className="flex items-center justify-between rounded-xl bg-gray-50 p-4 border border-gray-100">
          <div>
            <h4 className="font-semibold text-sm text-gray-900">
              Automated 6-Hour Discovery Cycle
            </h4>
            <p className="text-xs text-gray-500 mt-0.5">
              Runs automatically on the server at 00:00, 06:00, 12:00, and 18:00 UTC.
            </p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={preferences.jobDiscoveryEnabled}
              onChange={(e) =>
                setPreferences((prev) => ({
                  ...prev,
                  jobDiscoveryEnabled: e.target.checked,
                }))
              }
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
          </label>
        </div>

        {/* Target Roles */}
        <div>
          <label className="block text-sm font-semibold text-gray-900 mb-2">
            Target Job Roles
          </label>
          <div className="flex flex-wrap gap-2 mb-2">
            {preferences.preferredRoles.map((role) => (
              <span
                key={role}
                className="inline-flex items-center gap-1.5 rounded-lg bg-gray-100 px-3 py-1 text-xs font-medium text-gray-800 border"
              >
                {role}
                <button
                  onClick={() => removeRole(role)}
                  className="text-gray-400 hover:text-rose-600"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="e.g. MERN Stack Developer, React Engineer"
              value={newRoleInput}
              onChange={(e) => setNewRoleInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addRole())}
              className="rounded-xl border border-gray-300 px-3 py-2 text-xs focus:border-blue-500 focus:outline-none flex-1"
            />
            <button
              onClick={addRole}
              className="rounded-xl bg-gray-100 px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-200 flex items-center gap-1"
            >
              <Plus className="h-3.5 w-3.5" /> Add
            </button>
          </div>
        </div>

        {/* Preferred Locations */}
        <div>
          <label className="block text-sm font-semibold text-gray-900 mb-2">
            Preferred Job Locations
          </label>
          <div className="flex flex-wrap gap-2 mb-2">
            {preferences.preferredLocations.map((loc) => (
              <span
                key={loc}
                className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-800 border border-indigo-100"
              >
                <MapPin className="h-3 w-3 text-indigo-500" />
                {loc}
                <button
                  onClick={() => removeLocation(loc)}
                  className="text-indigo-400 hover:text-rose-600"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="e.g. Noida, Gurgaon, Delhi NCR, Remote"
              value={newLocInput}
              onChange={(e) => setNewLocInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addLocation())}
              className="rounded-xl border border-gray-300 px-3 py-2 text-xs focus:border-blue-500 focus:outline-none flex-1"
            />
            <button
              onClick={addLocation}
              className="rounded-xl bg-gray-100 px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-200 flex items-center gap-1"
            >
              <Plus className="h-3.5 w-3.5" /> Add
            </button>
          </div>
        </div>

        {/* Radius Slider */}
        <div className="rounded-xl bg-gray-50 p-4 border border-gray-100">
          <div className="flex items-center justify-between text-xs font-semibold text-gray-700">
            <span className="flex items-center gap-1.5">
              <Compass className="h-4 w-4 text-blue-600" />
              Maximum Commute Radius (Non-Remote Jobs):
            </span>
            <span className="text-blue-600 font-bold">{preferences.radiusKm} km</span>
          </div>
          <input
            type="range"
            min="10"
            max="150"
            step="5"
            value={preferences.radiusKm}
            onChange={(e) =>
              setPreferences((prev) => ({
                ...prev,
                radiusKm: parseInt(e.target.value, 10),
              }))
            }
            className="w-full mt-2 accent-blue-600 cursor-pointer"
          />
          <div className="flex justify-between text-[11px] text-gray-400 mt-1">
            <span>10 km (Local)</span>
            <span>50 km (Metro NCR)</span>
            <span>150 km (Regional)</span>
          </div>
        </div>

        {/* Work Modes */}
        <div>
          <label className="block text-sm font-semibold text-gray-900 mb-2">
            Preferred Work Modes
          </label>
          <div className="flex flex-wrap gap-3">
            {["Remote", "Hybrid", "Onsite"].map((mode) => {
              const checked = preferences.preferredWorkModes.includes(mode);
              return (
                <button
                  key={mode}
                  type="button"
                  onClick={() => toggleWorkMode(mode)}
                  className={`rounded-xl border px-4 py-2 text-xs font-semibold transition-all flex items-center gap-2 ${
                    checked
                      ? "border-blue-600 bg-blue-50 text-blue-700 shadow-sm"
                      : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  <div
                    className={`h-4 w-4 rounded-md border flex items-center justify-center ${
                      checked ? "bg-blue-600 border-blue-600 text-white" : "border-gray-300"
                    }`}
                  >
                    {checked && <Check className="h-3 w-3 stroke-[3]" />}
                  </div>
                  {mode}
                </button>
              );
            })}
          </div>
        </div>

        {/* Experience & Salary Range */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Minimum Experience
            </label>
            <input
              type="text"
              value={preferences.minimumExperience}
              onChange={(e) =>
                setPreferences((prev) => ({
                  ...prev,
                  minimumExperience: e.target.value,
                }))
              }
              placeholder="e.g. 1 year"
              className="w-full rounded-xl border border-gray-300 p-2.5 text-xs focus:border-blue-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Target Experience Bracket
            </label>
            <input
              type="text"
              value={preferences.maximumExperience}
              onChange={(e) =>
                setPreferences((prev) => ({
                  ...prev,
                  maximumExperience: e.target.value,
                }))
              }
              placeholder="e.g. 3 years"
              className="w-full rounded-xl border border-gray-300 p-2.5 text-xs focus:border-blue-500 focus:outline-none"
            />
          </div>
        </div>

        {/* Save Button */}
        <div className="pt-4 border-t flex justify-end">
          <button
            onClick={savePreferences}
            disabled={saving}
            className="flex items-center gap-2 rounded-xl bg-black px-6 py-3 text-sm font-semibold text-white hover:bg-gray-800 disabled:opacity-50 transition-colors shadow-sm"
          >
            <Save className="h-4 w-4" />
            {saving ? "Saving Preferences..." : "Save Discovery Preferences"}
          </button>
        </div>
      </div>
    </div>
  );
}
