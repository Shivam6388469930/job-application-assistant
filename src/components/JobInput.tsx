"use client";

import { ChangeEvent, FormEvent, useState } from "react";

interface JobInputProps {
  onGenerated: (data: {
    subject: string;
    body: string;
    to: string;
  }) => void;
}

export default function JobInput({
  onGenerated,
}: JobInputProps) {
  const [jobDescription, setJobDescription] = useState("");
  const [name, setName] = useState("");
  const [experience, setExperience] = useState("");
  const [skills, setSkills] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [recruiterEmail, setRecruiterEmail] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(
    e: FormEvent<HTMLFormElement>
  ) {
    e.preventDefault();

    setError("");
    setLoading(true);

    try {
      const response = await fetch(
        "/api/generate-email",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            jobDescription,
            name,
            experience,
            skills,
            phone,
            email,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "Failed to generate email"
        );
      }

      onGenerated({
        subject: data.subject,
        body: data.body,
        to: recruiterEmail,
      });
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Something went wrong"
      );
    } finally {
      setLoading(false);
    }
  }

  function handleFileUpload(
    e: ChangeEvent<HTMLInputElement>
  ) {
    const file = e.target.files?.[0];

    if (!file) return;

    if (file.type === "text/plain") {
      const reader = new FileReader();

      reader.onload = () => {
        setJobDescription(
          String(reader.result || "")
        );
      };

      reader.readAsText(file);
    } else {
      setError(
        "For now, upload a .txt file or paste the job description."
      );
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-5"
    >
      <div>
        <label className="mb-2 block text-sm font-medium">
          Job Description
        </label>

        <textarea
          value={jobDescription}
          onChange={(e) =>
            setJobDescription(e.target.value)
          }
          placeholder="Paste the complete job description here..."
          className="h-52 w-full rounded-xl border border-gray-300 p-4 outline-none focus:border-black"
          required
        />

        <div className="mt-2">
          <input
            type="file"
            accept=".txt"
            onChange={handleFileUpload}
            className="text-sm"
          />
        </div>
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium">
          Recruiter Email
        </label>

        <input
          type="email"
          value={recruiterEmail}
          onChange={(e) =>
            setRecruiterEmail(e.target.value)
          }
          placeholder="recruiter@company.com"
          className="w-full rounded-xl border border-gray-300 p-3 outline-none focus:border-black"
          required
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Your Name"
          className="rounded-xl border border-gray-300 p-3"
          required
        />

        <input
          value={experience}
          onChange={(e) =>
            setExperience(e.target.value)
          }
          placeholder="Experience e.g. 1.4 years"
          className="rounded-xl border border-gray-300 p-3"
        />

        <input
          value={skills}
          onChange={(e) => setSkills(e.target.value)}
          placeholder="Skills e.g. React, Node.js, MongoDB"
          className="rounded-xl border border-gray-300 p-3"
        />

        <input
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="Phone"
          className="rounded-xl border border-gray-300 p-3"
        />

        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Your Email"
          className="rounded-xl border border-gray-300 p-3 md:col-span-2"
        />
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-xl bg-black px-5 py-3 font-medium text-white transition hover:bg-gray-800 disabled:opacity-50"
      >
        {loading
          ? "Generating Email..."
          : "Generate Application Email"}
      </button>
    </form>
  );
}