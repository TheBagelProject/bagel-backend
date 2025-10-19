import mongoose, { Schema, Document } from "mongoose";
import { v4 as uuidv4 } from "uuid";

export interface ISpace {
  spaceId: string;
  spaceName: string;
  spaceDescription?: string;
}

export interface IProject extends Document {
  projectId: string;
  projectName: string;
  profile: string;
  projectDescription?: string;
  ownerId?: string;
  ownerName?: string;
  repoUrl?: string;
  branch?: string;
  csp?: "aws" | "gcp" | "azure";
  status: "idle" | "running" | "error";
  spaces: ISpace[];
  steps: string;
  createdAt: Date;
  updatedAt: Date;
}

const SpaceSchema = new Schema<ISpace>(
  {
    spaceId: { type: String, default: uuidv4, required: true },
    spaceName: { type: String, required: true, trim: true },
    spaceDescription: { type: String, default: "" },
  },
  { _id: false } // don’t generate extra _id for each space
);

const ProjectSchema: Schema = new Schema(
  {
    projectId: {
      type: String,
      default: uuidv4,
      unique: true,
      required: true,
      index: true,
    },
    projectName: { type: String, required: true },
  profile:{ type: String },
    projectDescription: { type: String },
    ownerId: { type: String },
    ownerName: { type: String },
    repoUrl: { type: String },
    branch: { type: String },
    csp: { type: String, enum: ["aws", "gcp", "azure"] },
    status: {
      type: String,
      enum: ["idle", "running", "error"],
      default: "idle",
    },
    spaces: [SpaceSchema],
    steps: { type: String, default: "" },
  },
  { timestamps: true }
);

// Index for quickly finding which project contains a space
ProjectSchema.index({ "spaces.spaceId": 1 });

// Index for ownerId to speed up queries by owner
ProjectSchema.index({ ownerId: 1 });

export default mongoose.model<IProject>("Project", ProjectSchema);
