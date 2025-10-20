// controllers/Docker/terraformInjector.ts
import { Request, Response } from "express";
import { spawn, execSync } from "child_process";
import Project from "../../models/project.schema";
import * as DeploymentRepository from "../../repositories/deployment.reposiory";
import Deployment from "../../models/deployment.schema";
import { generateDeploymentIdentifiers } from "../../utils/deploymentIDGenerator";
import { getContainerIdsByImage } from "../../utils/dockerUtils";

type CommandResult = {
  exitCode: number | null;
  stdout: string;
  stderr: string;
  combined?: string;
  summary: {
    toAdd?: number;
    toChange?: number;
    toDestroy?: number;
    added?: number;
    changed?: number;
    destroyed?: number;
  } | null;
};

/**
 * Parse Terraform output into structured summary (init, apply, destroy only)
 */
const parseTerraformSummary = (stdout: string): CommandResult["summary"] => {
  let summary: CommandResult["summary"] | null = null;
  const lines = stdout.split("\n");

  for (const line of lines) {
    const planMatch = line.match(
      /Plan:\s+(\d+)\s+to add,\s+(\d+)\s+to change,\s+(\d+)\s+to destroy/
    );
    if (planMatch) {
      summary = {
        toAdd: parseInt(planMatch[1], 10),
        toChange: parseInt(planMatch[2], 10),
        toDestroy: parseInt(planMatch[3], 10),
      };
      break;
    }

    const applyMatch = line.match(
      /Apply complete! Resources:\s+(\d+)\s+added,\s+(\d+)\s+changed,\s+(\d+)\s+destroyed/
    );
    if (applyMatch) {
      summary = {
        added: parseInt(applyMatch[1], 10),
        changed: parseInt(applyMatch[2], 10),
        destroyed: parseInt(applyMatch[3], 10),
      };
      break;
    }

    const destroyMatch = line.match(
      /Destroy complete! Resources:\s+(\d+)\s+destroyed/
    );
    if (destroyMatch) {
      summary = {
        destroyed: parseInt(destroyMatch[1], 10),
      };
      break;
    }
  }

  return summary;
};

/**
 * Utility: run commands inside a container workspace and collect output
 */
const runCommands = (
  containerId: string,
  workspacePath: string,
  commands: string[]
): Promise<CommandResult> => {
  return new Promise((resolve, reject) => {
    const safePath = workspacePath.replace(/(["\s'$`\\])/g, "\\$1");
    const fullCmd = commands.join(" && ");
    // Redirect stderr to stdout to preserve output order as seen in the terminal
    const wrappedCmd = `cd ${safePath} && ${fullCmd} 2>&1`;

    const proc = spawn("docker", [
      "exec",
      "-i",
      "-e",
      "TF_IN_AUTOMATION=true",
      "-e",
      "FORCE_COLOR=0",
      containerId,
      "bash",
      "-c",
      wrappedCmd,
    ]);

    proc.stdout.setEncoding("utf8");
    proc.stderr.setEncoding("utf8");

  let stdoutBuffer = "";
  let stderrBuffer = "";

    proc.stdout.on("data", (data) => {
      stdoutBuffer += data.toString();
    });

    proc.stderr.on("data", (data) => {
      stderrBuffer += data.toString();
    });

    proc.on("close", (code) => {
      // Combine buffers to avoid losing logs that Terraform prints to stderr
      const combined = `${stdoutBuffer}${stderrBuffer}`;
      resolve({
        exitCode: code,
        stdout: stdoutBuffer,
        stderr: stderrBuffer,
        combined,
        summary: parseTerraformSummary(stdoutBuffer),
      });
    });

    proc.on("error", (err) => {
      reject(err);
    });
  });
};

/**
 * POST /projects/:projectId/terraform/init
 * Creates a new DeploymentLog document
 */


export const terraformInit = async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;
    const { spaceName, deploymentId } = req.body;

    if (!spaceName) {
      return res.status(400).json({ error: "spaceName is required" });
    }

    const project = await Project.findOne({ projectId });
    if (!project) {
      return res.status(404).json({ error: "Project not found" });
    }

    const image_name = process.env.DOCKER_IMAGE_NAME;
    if (!image_name) {
      return res.status(500).json({ error: 'DOCKER_IMAGE_NAME environment variable is not set' });
    }
    const ids = getContainerIdsByImage(image_name);
    if (ids.length === 0) {
      return res.status(500).json({ error: 'No containers found for the image' });
    }
    const containerId = ids[0];

    const workspacePath = `/workspace/${project.projectName}/${spaceName}`;
    const result = await runCommands(containerId, workspacePath, [
      "terraform init -input=false -no-color",
    ]);

    let finalDeploymentId = deploymentId;
    let deploymentName = "";

    if (deploymentId) {
      // Update existing deployment: add or update init step
      const existing = await Deployment.findOne({ deploymentId });
      if (!existing) {
        return res.status(404).json({ error: "Deployment not found" });
      }
      deploymentName = existing.deploymentName;
      // Remove any previous init step, then push new one
      await Deployment.updateOne(
        { deploymentId },
        { $pull: { steps: { step: "init" } } }
      );
      await Deployment.updateOne(
        { deploymentId },
        {
          $push: {
            steps: {
              step: "init",
              stepStatus: result.exitCode === 0 ? "successful" : "failed",
              message: result.combined || result.stdout || result.stderr,
            },
          },
        }
      );
    } else {
      // Create new deployment
      const identifiers = await generateDeploymentIdentifiers(
        project.projectName,
        spaceName
      );
      finalDeploymentId = identifiers.deploymentId;
      deploymentName = identifiers.deploymentName;
      await Deployment.create({
        deploymentId: finalDeploymentId,
        projectId,
        spaceId: spaceName,
        deploymentName,
        steps: [
          {
            step: "init",
            stepStatus: result.exitCode === 0 ? "successful" : "failed",
            message: result.combined || result.stdout || result.stderr,
          },
        ],
        startedAt: new Date(),
      });
    }

    res.json({
      command: "terraform init",
      deploymentId: finalDeploymentId,
      deploymentName,
      ...result,
    });
  } catch (err: any) {
    console.error("Terraform init error:", err);
    res.status(500).json({ error: err.message });
  }
};

/**
 * POST /projects/:projectId/terraform/plan
 * Appends a "plan" step log to an existing deployment
 */
export const terraformPlan = async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;
    const { spaceName, deploymentId } = req.body;

    if (!spaceName) return res.status(400).json({ error: "spaceName is required" });
    if (!deploymentId) return res.status(400).json({ error: "deploymentId is required" });

    const project = await Project.findOne({ projectId });
    if (!project) return res.status(404).json({ error: "Project not found" });

    const image_name = process.env.DOCKER_IMAGE_NAME;
    if (!image_name) {
      return res.status(500).json({ error: 'DOCKER_IMAGE_NAME environment variable is not set' });
    }
    const ids = getContainerIdsByImage(image_name);
    if (ids.length === 0) {
      return res.status(500).json({ error: 'No containers found for the image' });
    }
    const containerId = ids[0];

    const workspacePath = `/workspace/${project.projectName}/${spaceName}`;

    const humanReadablePlan = await runCommands(containerId, workspacePath, [
      "terraform plan -input=false -no-color",
    ]);

    const structuredPlan = await runCommands(containerId, workspacePath, [
      "terraform plan -input=false -no-color -out=tfplan",
      "terraform show -json tfplan",
    ]);

    let planJson: any = null;
    try {
      planJson = JSON.parse(structuredPlan.stdout);
    } catch (e) {
      console.error("Failed to parse terraform show -json:", e);
    }

    // Append plan step with structuredData
    await DeploymentRepository.addDeploymentStep({
      deploymentId,
      step: "plan",
      stepStatus: humanReadablePlan.exitCode === 0 ? "successful" : "failed",
  message: humanReadablePlan.combined || humanReadablePlan.stdout || humanReadablePlan.stderr,
      structuredData: planJson,
    });

    res.json({
      stepName: "Plan",
      rawFormat: humanReadablePlan.stdout,
      data: planJson,
      exitCode: humanReadablePlan.exitCode,
      stderr: humanReadablePlan.stderr,
    });
  } catch (err: any) {
    console.error("Terraform plan error:", err);
    res.status(500).json({ error: err.message });
  }
};

/**
 * POST /projects/:projectId/terraform/apply
 * Appends an "apply" step log
 */
export const terraformApply = async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;
    const { spaceName, deploymentId } = req.body;

    if (!spaceName) return res.status(400).json({ error: "spaceName is required" });
    if (!deploymentId) return res.status(400).json({ error: "deploymentId is required" });

    const project = await Project.findOne({ projectId });
    if (!project) return res.status(404).json({ error: "Project not found" });

    const image_name = process.env.DOCKER_IMAGE_NAME;
    if (!image_name) {
      return res.status(500).json({ error: 'DOCKER_IMAGE_NAME environment variable is not set' });
    }
    const ids = getContainerIdsByImage(image_name);
    if (ids.length === 0) {
      return res.status(500).json({ error: 'No containers found for the image' });
    }
    const containerId = ids[0];

    const workspacePath = `/workspace/${project.projectName}/${spaceName}`;

    const result = await runCommands(containerId, workspacePath, [
      "terraform apply -auto-approve -input=false -no-color",
    ]);

    await DeploymentRepository.addDeploymentStep({
      deploymentId,
      step: "apply",
      stepStatus: result.exitCode === 0 ? "successful" : "failed",
      message: result.stdout || result.stderr,
    });

  res.json({ command: "terraform apply", deploymentId, ...result });
  } catch (err: any) {
    console.error("Terraform apply error:", err);
    res.status(500).json({ error: err.message });
  }
};

/**
 * POST /projects/:projectId/terraform/destroy
 * Appends a "destroy" step log
 */
export const terraformDestroy = async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;
    const { spaceName, deploymentId } = req.body;

    if (!spaceName) return res.status(400).json({ error: "spaceName is required" });
    if (!deploymentId) return res.status(400).json({ error: "deploymentId is required" });

    const project = await Project.findOne({ projectId });
    if (!project) return res.status(404).json({ error: "Project not found" });

    const image_name = process.env.DOCKER_IMAGE_NAME;
    if (!image_name) {
      return res.status(500).json({ error: 'DOCKER_IMAGE_NAME environment variable is not set' });
    }
    const ids = getContainerIdsByImage(image_name);
    if (ids.length === 0) {
      return res.status(500).json({ error: 'No containers found for the image' });
    }
    const containerId = ids[0];

    const workspacePath = `/workspace/${project.projectName}/${spaceName}`;

    const result = await runCommands(containerId, workspacePath, [
      "terraform destroy -auto-approve -input=false -no-color",
    ]);

    await DeploymentRepository.addDeploymentStep({
      deploymentId,
      step: "destroy",
      stepStatus: result.exitCode === 0 ? "successful" : "failed",
      message: result.combined || result.stdout || result.stderr,
    });

  res.json({ command: "terraform destroy", deploymentId, ...result });
  } catch (err: any) {
    console.error("Terraform destroy error:", err);
    res.status(500).json({ error: err.message });
  }
};

/**
 * POST /projects/:projectId/terraform/plan/cancel
 * Marks the 'plan' step for a deployment as cancelled
 */
export const terraformPlanDeny = async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;
    const { deploymentId } = req.body;

    if (!deploymentId) return res.status(400).json({ error: 'deploymentId is required' });

    // Ensure project exists
    const project = await Project.findOne({ projectId });
    if (!project) return res.status(404).json({ error: 'Project not found' });

    // Update existing 'plan' step's status to 'cancelled'
    const updateResult = await Deployment.updateOne(
      { deploymentId, 'steps.step': 'plan' },
      {
        $set: {
          'steps.$.stepStatus': 'cancelled',
          'steps.$.timestamp': new Date(),
        },
      }
    );

    if (updateResult.matchedCount === 0) {
      // No existing plan step found
      return res.status(404).json({ error: 'Plan step not found for deployment' });
    }

    res.json({ success: true, message: 'Plan Step Cancelled by User', deploymentId });
  } catch (err: any) {
    console.error('Terraform plan cancel error:', err);
    res.status(500).json({ error: err.message });
  }
};
