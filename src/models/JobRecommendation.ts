import mongoose, { Schema, Document, Model, Types } from "mongoose";
import { IJob } from "./Job";

export type RecommendationStatus = "NEW" | "VIEWED" | "APPLIED" | "DISMISSED";

export interface IJobRecommendation extends Document {
  userId: string;
  jobId: Types.ObjectId | IJob;
  relevanceScore: number; // 0 - 100
  shortlistChance: number; // 0 - 100
  shortlistAssessment: string;
  strengths: string[];
  missingRequirements: string[];
  riskFactors: string[];
  matchedSkills: string[];
  missingSkills: string[];
  distanceKm?: number;
  distanceCategory: "0–10 km" | "10–25 km" | "25–50 km" | "50+ km" | "Remote";
  profileVersion?: string;
  status: RecommendationStatus;
  discoveredAt: Date;
  viewedAt?: Date;
  appliedAt?: Date;
  dismissedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const JobRecommendationSchema = new Schema<IJobRecommendation>(
  {
    userId: { type: String, required: true, index: true },
    jobId: { type: Schema.Types.ObjectId, ref: "Job", required: true, index: true },
    relevanceScore: { type: Number, required: true, min: 0, max: 100, index: true },
    shortlistChance: { type: Number, required: true, min: 0, max: 100 },
    shortlistAssessment: { type: String, default: "" },
    strengths: { type: [String], default: [] },
    missingRequirements: { type: [String], default: [] },
    riskFactors: { type: [String], default: [] },
    matchedSkills: { type: [String], default: [] },
    missingSkills: { type: [String], default: [] },
    distanceKm: { type: Number },
    distanceCategory: {
      type: String,
      enum: ["0–10 km", "10–25 km", "25–50 km", "50+ km", "Remote"],
      default: "Remote",
    },
    profileVersion: { type: String, default: "1.0" },
    status: {
      type: String,
      enum: ["NEW", "VIEWED", "APPLIED", "DISMISSED"],
      default: "NEW",
      index: true,
    },
    discoveredAt: { type: Date, default: Date.now },
    viewedAt: { type: Date },
    appliedAt: { type: Date },
    dismissedAt: { type: Date },
  },
  {
    timestamps: true,
  }
);

// Unique compound index so a user doesn't get duplicate recommendations for the same job
JobRecommendationSchema.index({ userId: 1, jobId: 1 }, { unique: true });
JobRecommendationSchema.index({ userId: 1, createdAt: -1 });
JobRecommendationSchema.index({ userId: 1, status: 1 });
JobRecommendationSchema.index({ userId: 1, relevanceScore: -1 });

export const JobRecommendation: Model<IJobRecommendation> =
  mongoose.models.JobRecommendation ||
  mongoose.model<IJobRecommendation>("JobRecommendation", JobRecommendationSchema);
