// src/utils/helper.ts
import DeploymentLogs from "../models/deployment.schema";
import { v4 as uuidv4 } from "uuid";

/**
 * Generate deploymentId and deploymentName
 */
export async function generateDeploymentIdentifiers(
  projectName: string,
  spaceName: string
): Promise<{ deploymentId: string; deploymentName: string }> {
  const today = new Date();
  const dateStr = today.toISOString().split("T")[0].replace(/-/g, ""); // YYYYMMDD
  const prettyDate = today.toLocaleDateString("en-US");
  const timeStr = today
    .toTimeString()
    .split(" ")[0]
    .replace(/:/g, ""); // HHmmss

  // Add a random UUID for uniqueness
  const uuid = uuidv4().split("-")[0]; // short uuid
  const deploymentId = `bagel-dep-${dateStr}-${projectName}-${spaceName}-${uuid}`;
  const deploymentName = `${projectName} ${spaceName} Deployment-${prettyDate}-${timeStr}`;

  return { deploymentId, deploymentName };
}
