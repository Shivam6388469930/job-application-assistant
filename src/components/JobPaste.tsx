"use client";

import { useState, useRef, ChangeEvent, DragEvent, ClipboardEvent, useEffect } from "react";
import {
  Upload,
  FileText,
  Image as ImageIcon,
  X,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  ScanLine,
  Loader2,
  Mail,
  MailX,
} from "lucide-react";

interface JobPasteProps {
  profile: any;
  onResult: (result: any) => void;
}

export default function JobPaste({ profile, onResult }: JobPasteProps) {
  const [jobPost, setJobPost] = useState("");
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [statusStep, setStatusStep] = useState<string>("");
  const [error, setError] = useState("");
  const [ocrExtractedPreview, setOcrExtractedPreview] = useState<string>("");

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Clean up object URL when component unmounts or image changes
  useEffect(() => {
    return () => {
      if (imagePreviewUrl) {
        URL.revokeObjectURL(imagePreviewUrl);
      }
    };
  }, [imagePreviewUrl]);

  function handleFileSelect(file: File) {
    if (!file.type.startsWith("image/")) {
      setError("Please select a valid image file (PNG, JPG, JPEG, WEBP, etc.)");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setError("Image size exceeds 10MB limit. Please choose a smaller image.");
      return;
    }

    if (imagePreviewUrl) {
      URL.revokeObjectURL(imagePreviewUrl);
    }

    setSelectedImage(file);
    setImagePreviewUrl(URL.createObjectURL(file));
    setError("");
  }

  function handleFileInputChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  }

  function handleDragOver(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }

  function handleDragLeave(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      handleFileSelect(files[0]);
    }
  }

  function handlePaste(e: ClipboardEvent<HTMLDivElement | HTMLTextAreaElement>) {
    const items = e.clipboardData?.items;
    if (items) {
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf("image") !== -1) {
          const file = items[i].getAsFile();
          if (file) {
            e.preventDefault();
            handleFileSelect(file);
            return;
          }
        }
      }
    }
  }

  function handleRemoveImage() {
    if (imagePreviewUrl) {
      URL.revokeObjectURL(imagePreviewUrl);
    }
    setSelectedImage(null);
    setImagePreviewUrl(null);
    setOcrExtractedPreview("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  async function generateApplication() {
    if (!jobPost.trim() && !selectedImage) {
      setError("Please paste a job description or upload an image screenshot.");
      return;
    }

    if (!profile) {
      setError("Please upload and configure your resume first.");
      return;
    }

    setLoading(true);
    setError("");
    setOcrExtractedPreview("");

    try {
      if (selectedImage) {
        setStatusStep("Scanning screenshot with OCR...");
      } else {
        setStatusStep("Analyzing job details with AI...");
      }

      let jobData: any;

      if (selectedImage) {
        const formData = new FormData();
        formData.append("image", selectedImage);
        if (jobPost.trim()) {
          formData.append("jobPost", jobPost.trim());
        }

        const jobResponse = await fetch("/api/analyze-job", {
          method: "POST",
          body: formData,
        });

        jobData = await jobResponse.json();

        if (!jobResponse.ok) {
          throw new Error(jobData.error || jobData.details || "Failed to analyze image");
        }

        if (jobData.extractedImageText) {
          setOcrExtractedPreview(jobData.extractedImageText);
        }
      } else {
        const jobResponse = await fetch("/api/analyze-job", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            jobPost: jobPost.trim(),
          }),
        });

        jobData = await jobResponse.json();

        if (!jobResponse.ok) {
          throw new Error(jobData.error || jobData.details || "Failed to analyze job post");
        }
      }

      setStatusStep("Drafting tailored application email...");

      const emailResponse = await fetch("/api/generate-email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          profile,
          job: jobData.job,
        }),
      });

      const emailData = await emailResponse.json();

      if (!emailResponse.ok) {
        throw new Error(emailData.error || emailData.details || "Failed to generate application email");
      }

      onResult({
        job: jobData.job,
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
      setError(err instanceof Error ? err.message : "Something went wrong while generating application.");
    } finally {
      setLoading(false);
      setStatusStep("");
    }
  }

  return (
    <div
      onPaste={handlePaste}
      className="rounded-2xl border border-gray-200 bg-white p-6 sm:p-8 shadow-sm transition-all"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-gray-100">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-blue-600" />
            Paste Job Post or Upload Screenshot
          </h2>
          <p className="mt-1 text-sm text-gray-600">
            Paste text from LinkedIn, WhatsApp, Telegram, or upload/paste a screenshot image (`Ctrl+V`).
          </p>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Text Area */}
        <div className="flex flex-col">
          <label className="text-sm font-semibold text-gray-800 flex items-center justify-between mb-2">
            <span className="flex items-center gap-1.5">
              <FileText className="h-4 w-4 text-gray-500" /> Job Description Text
            </span>
            {jobPost.length > 0 && (
              <span className="text-xs text-gray-400 font-normal">
                {jobPost.length} chars
              </span>
            )}
          </label>
          <textarea
            value={jobPost}
            onChange={(e) => setJobPost(e.target.value)}
            placeholder="Paste complete job post, email, or message here..."
            rows={10}
            className="w-full flex-1 rounded-xl border border-gray-300 p-4 text-sm text-gray-900 placeholder:text-gray-400 outline-none focus:border-black focus:ring-1 focus:ring-black transition resize-y min-h-[220px]"
          />
        </div>

        {/* Right: Image Upload & Drag/Drop Zone */}
        <div className="flex flex-col">
          <label className="text-sm font-semibold text-gray-800 flex items-center justify-between mb-2">
            <span className="flex items-center gap-1.5">
              <ImageIcon className="h-4 w-4 text-blue-600" /> Job Screenshot / Flyer
            </span>
            <span className="text-xs text-blue-600 font-medium bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100">
              OCR Supported
            </span>
          </label>

          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileInputChange}
            accept="image/*"
            className="hidden"
          />

          {!selectedImage ? (
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`flex-1 min-h-[220px] flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-6 text-center cursor-pointer transition-all ${
                isDragging
                  ? "border-blue-500 bg-blue-50/60 scale-[0.99]"
                  : "border-gray-300 bg-gray-50/60 hover:bg-gray-50 hover:border-gray-400"
              }`}
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 text-blue-600 mb-3 shadow-sm">
                <Upload className="h-6 w-6" />
              </div>
              <p className="text-sm font-semibold text-gray-800">
                Click to upload screenshot or drag & drop
              </p>
              <p className="text-xs text-gray-500 mt-1 max-w-xs">
                Supports PNG, JPG, WEBP • You can also press <kbd className="px-1.5 py-0.5 bg-gray-200 text-gray-700 rounded text-[11px] font-mono">Ctrl+V</kbd> to paste directly from clipboard
              </p>
            </div>
          ) : (
            <div className="relative flex-1 min-h-[220px] rounded-xl border border-gray-200 bg-gray-900 p-3 overflow-hidden flex flex-col items-center justify-center group">
              {imagePreviewUrl && (
                <img
                  src={imagePreviewUrl}
                  alt="Job Screenshot Preview"
                  className="max-h-56 max-w-full object-contain rounded-lg shadow"
                />
              )}

              <div className="absolute top-2 right-2 flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handleRemoveImage}
                  className="rounded-full bg-rose-600 text-white p-1.5 shadow hover:bg-rose-700 transition"
                  title="Remove image"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="absolute bottom-2 left-2 right-2 bg-black/75 backdrop-blur-sm px-3 py-1.5 rounded-lg flex items-center justify-between text-xs text-white">
                <span className="truncate max-w-[200px]">{selectedImage.name}</span>
                <span className="text-gray-300">
                  {(selectedImage.size / 1024).toFixed(0)} KB
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {ocrExtractedPreview && (
        <div className="mt-4 rounded-xl bg-blue-50 border border-blue-100 p-3.5 text-xs text-blue-900">
          <div className="flex items-center gap-1.5 font-bold mb-1">
            <ScanLine className="h-4 w-4 text-blue-600" />
            Extracted Text from Screenshot ({ocrExtractedPreview.length} characters):
          </div>
          <p className="line-clamp-3 text-blue-800/90 whitespace-pre-line font-mono text-[11px]">
            {ocrExtractedPreview}
          </p>
        </div>
      )}

      {error && (
        <div className="mt-5 rounded-xl bg-rose-50 border border-rose-200 p-4 text-sm text-rose-700 flex items-start gap-2.5">
          <AlertCircle className="h-5 w-5 shrink-0 text-rose-500 mt-0.5" />
          <div>
            <p className="font-semibold">Analysis Notice</p>
            <p className="mt-0.5 text-xs text-rose-600">{error}</p>
          </div>
        </div>
      )}

      {/* Progress & Action button */}
      <div className="mt-6 flex flex-col sm:flex-row items-center gap-4 pt-4 border-t border-gray-100">
        {loading && (
          <div className="flex items-center gap-2 text-xs font-semibold text-blue-700 bg-blue-50 px-3.5 py-2 rounded-xl border border-blue-200 flex-1">
            <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
            <span>{statusStep || "Processing..."}</span>
          </div>
        )}

        <button
          onClick={generateApplication}
          disabled={loading || (!jobPost.trim() && !selectedImage)}
          className="w-full sm:w-auto sm:ml-auto flex items-center justify-center gap-2 rounded-xl bg-black px-6 py-3.5 text-sm font-semibold text-white shadow hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Analyzing Job...</span>
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4" />
              <span>Generate Application Email</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}