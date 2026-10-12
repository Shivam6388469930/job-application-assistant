import mongoose, { Schema, Document, Model } from "mongoose";

export interface IUserPreferences {
  preferredRoles: string[];
  preferredLocations: string[];
  radiusKm: number;
  preferredWorkModes: string[];
  preferredEmploymentTypes: string[];
  minimumExperience: string;
  maximumExperience: string;
  preferredShift: string;
  minimumSalary: number | null;
  jobDiscoveryEnabled: boolean;
}

export interface IUserProfile extends Document {
  userId: string;
  name: string;
  email: string;
  phone: string;
  location: string;
  currentRole: string;
  experience: string;
  skills: string[];
  education: any[];
  projects: any[];
  summary: string;
  preferences: IUserPreferences;
  lastJobDiscoveryAt?: Date;
  lastJobDiscoveryStatus?: "idle" | "running" | "success" | "error";
  lastJobDiscoveryError?: string;
  profileVersion: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const UserPreferencesSchema = new Schema<IUserPreferences>(
  {
    preferredRoles: { type: [String], default: [] },
    preferredLocations: { type: [String], default: [] },
    radiusKm: { type: Number, default: 50 },
    preferredWorkModes: {
      type: [String],
      default: ["Remote", "Hybrid", "Onsite"],
    },
    preferredEmploymentTypes: {
      type: [String],
      default: ["Full-Time"],
    },
    minimumExperience: { type: String, default: "" },
    maximumExperience: { type: String, default: "" },
    preferredShift: { type: String, default: "" },
    minimumSalary: { type: Number, default: null },
    jobDiscoveryEnabled: { type: Boolean, default: true },
  },
  { _id: false }
);

const UserProfileSchema = new Schema<IUserProfile>(
  {
    userId: { type: String, required: true, unique: true, index: true },
    name: { type: String, default: "" },
    email: { type: String, default: "" },
    phone: { type: String, default: "" },
    location: { type: String, default: "" },
    currentRole: { type: String, default: "" },
    experience: { type: String, default: "" },
    skills: { type: [String], default: [] },
    education: [Schema.Types.Mixed],
    projects: [Schema.Types.Mixed],
    summary: { type: String, default: "" },
    preferences: { type: UserPreferencesSchema, default: () => ({}) },
    lastJobDiscoveryAt: { type: Date },
    lastJobDiscoveryStatus: {
      type: String,
      enum: ["idle", "running", "success", "error"],
      default: "idle",
    },
    lastJobDiscoveryError: { type: String, default: "" },
    profileVersion: { type: String, default: "1.0" },
    isActive: { type: Boolean, default: true, index: true },
  },
  {
    timestamps: true,
  }
);

export const UserProfile: Model<IUserProfile> =
  mongoose.models.UserProfile ||
  mongoose.model<IUserProfile>("UserProfile", UserProfileSchema);
