import mongoose, { Schema, Document, Model } from "mongoose";

export interface IJob extends Document {
  source: string;
  sourceJobId: string;
  title: string;
  company: string;
  description: string;
  location: string;
  city: string;
  state?: string;
  country: string;
  latitude?: number;
  longitude?: number;
  workMode: string;
  employmentType: string;
  experienceRequired: string;
  skills: string[];
  salary: {
    min: number | null;
    max: number | null;
    currency: string;
  };
  applicationUrl: string;
  recruiterEmail: string;
  postedAt: Date | null;
  discoveredAt: Date;
  canonicalHash: string;
  createdAt: Date;
  updatedAt: Date;
}

const JobSchema = new Schema<IJob>(
  {
    source: { type: String, required: true, index: true },
    sourceJobId: { type: String, default: "" },
    title: { type: String, required: true, trim: true, index: true },
    company: { type: String, required: true, trim: true, index: true },
    description: { type: String, default: "" },
    location: { type: String, default: "Remote", index: true },
    city: { type: String, default: "" },
    state: { type: String, default: "" },
    country: { type: String, default: "" },
    latitude: { type: Number },
    longitude: { type: Number },
    workMode: {
      type: String,
      enum: ["Remote", "Hybrid", "Onsite", "Unknown"],
      default: "Remote",
      index: true,
    },
    employmentType: {
      type: String,
      default: "Full-Time",
      index: true,
    },
    experienceRequired: { type: String, default: "" },
    skills: { type: [String], default: [], index: true },
    salary: {
      min: { type: Number, default: null },
      max: { type: Number, default: null },
      currency: { type: String, default: "INR" },
    },
    applicationUrl: { type: String, default: "" },
    recruiterEmail: { type: String, default: "" },
    postedAt: { type: Date, default: null },
    discoveredAt: { type: Date, default: Date.now },
    canonicalHash: { type: String, required: true, unique: true, index: true },
  },
  {
    timestamps: true,
  }
);

// Compound indexes for fast querying and deduplication
JobSchema.index({ source: 1, sourceJobId: 1 });
JobSchema.index({ company: 1, title: 1 });
JobSchema.index({ createdAt: -1 });

export const Job: Model<IJob> =
  mongoose.models.Job || mongoose.model<IJob>("Job", JobSchema);
