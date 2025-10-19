import { Document } from "mongoose";


export interface DeploymentStepLog {
  step: "init" | "plan" | "apply" | "destroy";
  stepStatus: "pending" | "running" | "successful" | "failed";
  message: string;
  timestamp: Date;
  structuredData?: any;
}


export interface Deployment extends Document {
  deploymentId: string;
  projectId: string;
  spaceId: string;
  deploymentName: string;
  deploymentSummary?: string;
  steps: DeploymentStepLog[];
  startedAt: Date;
  finishedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}
import { Schema, model } from "mongoose";
import { v4 as uuidv4 } from "uuid";


const DeploymentSchema = new Schema(
  {
    deploymentId: {
      type: String,
      default: uuidv4,
      unique: true,
    },
    projectId: {
      type: String,
      required: true,
      index: true,
    },
    spaceId: {
      type: String,
      required: true,
    },

    // --- New fields ---
    deploymentName: { type: String, required: true, unique: true }, // e.g. "Sangeeth Project EC2 Deployment-9/29/2025"
    deploymentSummary: { type: String }, // optional short text
    
    steps: [
      {
        step: { type: String, required: true }, // init | plan | apply | destroy
        stepStatus: {
          type: String,
          enum: ["pending", "running", "successful", "failed"],
          required: true,
        },
        message: { type: String, required: true },
        timestamp: { type: Date, default: Date.now },
        structuredData: { type: Schema.Types.Mixed },
      },
    ],
    startedAt: { type: Date, default: Date.now },
    finishedAt: { type: Date },
  },
  { timestamps: true }
);

export default model("Deployment", DeploymentSchema);
