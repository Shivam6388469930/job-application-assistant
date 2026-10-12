"use client";

import { useState } from "react";

interface ResumeSetupProps {
  onProfileSaved: (profile: any) => void;
}

export default function ResumeSetup({
  onProfileSaved,
}: ResumeSetupProps) {
  const [loading, setLoading] =
    useState(false);

  const [message, setMessage] =
    useState("");

  async function uploadResume(
    file: File
  ) {
    setLoading(true);
    setMessage("");

    try {
      const formData =
        new FormData();

      formData.append(
        "resume",
        file
      );

      const response =
        await fetch(
          "/api/parse-resume",
          {
            method: "POST",
            body: formData,
          }
        );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            "Resume parsing failed"
        );
      }

      localStorage.setItem(
        "candidateProfile",
        JSON.stringify(
          data.profile
        )
      );

      // Persist profile to MongoDB and trigger initial job discovery
      try {
        await fetch("/api/jobs/preferences", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: data.profile.email || "default_candidate",
            candidate: data.profile,
          }),
        });

        // Trigger initial discovery in background
        fetch("/api/jobs/trigger-discovery", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: data.profile.email || "default_candidate",
            candidateProfile: data.profile,
          }),
        }).catch(() => {});
      } catch (syncErr) {
        console.warn("MongoDB profile sync error:", syncErr);
      }

      onProfileSaved(
        data.profile
      );

      setMessage(
        "Resume analyzed and saved to profile. AI Job Discovery is now active!"
      );
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Resume upload failed"
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-2xl border bg-white p-6 shadow-sm">
      <h2 className="text-xl font-semibold">
        First-time setup
      </h2>

      <p className="mt-2 text-sm text-gray-600">
        Upload your resume once. The application
        will automatically use your information
        for future job posts.
      </p>

      <input
        type="file"
        accept=".pdf"
        disabled={loading}
        onChange={(e) => {
          const file =
            e.target.files?.[0];

          if (file) {
            uploadResume(file);
          }
        }}
        className="mt-5 block w-full text-sm"
      />

      {loading && (
        <p className="mt-3 text-sm">
          Reading your resume...
        </p>
      )}

      {message && (
        <p className="mt-3 text-sm">
          {message}
        </p>
      )}
    </div>
  );
}