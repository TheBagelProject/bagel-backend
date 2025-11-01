// controllers/Docker/tofuInjector.ts
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
  logFileContent?: string;
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
 * Parse OpenTofu output into structured summary (init, apply, destroy only)
 */
const parseTofuSummary = (stdout: string): CommandResult["summary"] => {
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
 * Parse plan summary from human-readable text output
 */
const parsePlanSummaryFromText = (planText: string) => {
  const summary: any = {};
  
  // Extract plan statistics
  const planMatch = planText.match(/Plan:\s+(\d+)\s+to add,\s+(\d+)\s+to change,\s+(\d+)\s+to destroy/);
  if (planMatch) {
    summary.changes = {
      add: parseInt(planMatch[1], 10),
      change: parseInt(planMatch[2], 10),
      destroy: parseInt(planMatch[3], 10)
    };
  }
  
  // Extract resource changes
  const resourceChanges = [];
  const lines = planText.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Look for resource change indicators
    if (line.match(/^[+~-]\s+resource\s+/)) {
      const action = line.startsWith('+') ? 'create' : 
                    line.startsWith('~') ? 'update' : 'delete';
      const resourceMatch = line.match(/resource\s+"([^"]+)"\s+"([^"]+)"/);
      if (resourceMatch) {
        resourceChanges.push({
          action,
          type: resourceMatch[1],
          name: resourceMatch[2]
        });
      }
    }
  }
  
  if (resourceChanges.length > 0) {
    summary.resource_changes = resourceChanges;
  }
  
  // Check for no changes
  if (planText.includes('No changes')) {
    summary.no_changes = true;
  }
  
  return summary;
};

/**
 * Utility: run commands inside a container workspace and collect output
 */
const runCommands = (
  containerId: string,
  workspacePath: string,
  commands: string[],
  enableLogging: boolean = true
): Promise<CommandResult> => {
  return new Promise((resolve, reject) => {
    const safePath = workspacePath.replace(/(["\s'$`\\])/g, "\\$1");
    
    const fullCmd = commands.join(" && ");
    // Redirect stderr to stdout to preserve output order as seen in the terminal
    const wrappedCmd = `cd ${safePath} && ${fullCmd} 2>&1`;

    const dockerArgs = [
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
    ];

    // Only add logging if explicitly enabled and path doesn't have problematic characters
    let logFilePath = "";
    if (enableLogging && !workspacePath.includes(" ")) {
      const timestamp = new Date().toISOString().replace(/[-:T.]/g, '').slice(0, 14);
      const logFileName = `tofu_${timestamp}.log`;
      logFilePath = `${workspacePath}/${logFileName}`;
      
      dockerArgs.splice(-3, 0, "-e", "TF_LOG=INFO", "-e", `TF_LOG_PATH=${logFilePath}`);
    }

    const proc = spawn("docker", dockerArgs);

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

    proc.on("close", async (code) => {
      // Combine buffers to avoid losing logs that OpenTofu prints to stderr
      const combined = `${stdoutBuffer}${stderrBuffer}`;
      
      // Try to read the log file content only if logging was enabled
      let logFileContent = "";
      if (enableLogging && logFilePath) {
        try {
          const escapedLogPath = logFilePath.replace(/(["\s'$`\\])/g, "\\$1");
          const logReadProc = spawn("docker", [
            "exec",
            "-i",
            containerId,
            "cat",
            escapedLogPath,
          ]);

          let logBuffer = "";
          logReadProc.stdout.setEncoding("utf8");
          logReadProc.stdout.on("data", (data) => {
            logBuffer += data.toString();
          });

          // Add timeout to prevent hanging
          const timeoutId = setTimeout(() => {
            logReadProc.kill();
          }, 3000); // 3 second timeout

          await new Promise<void>((resolveLog) => {
            logReadProc.on("close", () => {
              clearTimeout(timeoutId);
              logFileContent = logBuffer;
              resolveLog();
            });
            logReadProc.on("error", () => {
              clearTimeout(timeoutId);
              resolveLog();
            });
          });
        } catch (err) {
          console.warn("Could not read OpenTofu log file:", err);
        }
      }

      resolve({
        exitCode: code,
        stdout: stdoutBuffer,
        stderr: stderrBuffer,
        combined,
        logFileContent,
        summary: parseTofuSummary(stdoutBuffer),
      });
    });

    proc.on("error", (err) => {
      reject(err);
    });
  });
};

/**
 * POST /projects/:projectId/tofu/init
 * Creates a new DeploymentLog document
 */


export const tofuInit = async (req: Request, res: Response) => {
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
      "tofu init -input=false -no-color",
    ], false); // Disable logging for now to improve performance

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
              logFileContent: result.logFileContent,
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
            logFileContent: result.logFileContent,
          },
        ],
        startedAt: new Date(),
      });
    }

    res.json({
      command: "tofu init",
      deploymentId: finalDeploymentId,
      deploymentName,
      logFileContent: result.logFileContent,
      ...result,
    });
  } catch (err: any) {
    console.error("OpenTofu init error:", err);
    res.status(500).json({ error: err.message });
  }
};

/**
 * POST /projects/:projectId/tofu/plan
 * Appends a "plan" step log to an existing deployment
 */
export const tofuPlan = async (req: Request, res: Response) => {
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
      "tofu plan -input=false -no-color",
    ], false); // Disable logging for performance

    // Append plan step with human-readable output only
    await DeploymentRepository.addDeploymentStep({
      deploymentId,
      step: "plan",
      stepStatus: humanReadablePlan.exitCode === 0 ? "successful" : "failed",
      message: humanReadablePlan.combined || humanReadablePlan.stdout || humanReadablePlan.stderr,
      logFileContent: humanReadablePlan.logFileContent,
    });

    res.json({
      stepName: "Plan",
      humanReadable: {
        raw: humanReadablePlan.stdout,
        summary: parseTofuSummary(humanReadablePlan.stdout)
      },
      exitCode: humanReadablePlan.exitCode,
      stderr: humanReadablePlan.stderr,
      logFileContent: humanReadablePlan.logFileContent,
      // Legacy fields for backward compatibility
      rawFormat: humanReadablePlan.stdout,
    });
  } catch (err: any) {
    console.error("OpenTofu plan error:", err);
    res.status(500).json({ error: err.message });
  }
};

/**
 * POST /projects/:projectId/tofu/apply
 * Appends an "apply" step log
 */
export const tofuApply = async (req: Request, res: Response) => {
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
      "tofu apply -auto-approve -input=false -no-color",
    ], false); // Disable logging for performance

    await DeploymentRepository.addDeploymentStep({
      deploymentId,
      step: "apply",
      stepStatus: result.exitCode === 0 ? "successful" : "failed",
      message: result.stdout || result.stderr,
      logFileContent: result.logFileContent,
    });

  res.json({ 
    command: "tofu apply", 
    deploymentId, 
    logFileContent: result.logFileContent,
    ...result 
  });
  } catch (err: any) {
    console.error("OpenTofu apply error:", err);
    res.status(500).json({ error: err.message });
  }
};

/**
 * POST /projects/:projectId/tofu/destroy
 * Appends a "destroy" step log
 */
export const tofuDestroy = async (req: Request, res: Response) => {
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
      "tofu destroy -auto-approve -input=false -no-color",
    ], false); // Disable logging for performance

    await DeploymentRepository.addDeploymentStep({
      deploymentId,
      step: "destroy",
      stepStatus: result.exitCode === 0 ? "successful" : "failed",
      message: result.combined || result.stdout || result.stderr,
      logFileContent: result.logFileContent,
    });

  res.json({ 
    command: "tofu destroy", 
    deploymentId, 
    logFileContent: result.logFileContent,
    ...result 
  });
  } catch (err: any) {
    console.error("OpenTofu destroy error:", err);
    res.status(500).json({ error: err.message });
  }
};

/**
 * POST /projects/:projectId/tofu/plan/cancel
 * Marks the 'plan' step for a deployment as cancelled
 */
export const tofuPlanDeny = async (req: Request, res: Response) => {
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
    console.error('OpenTofu plan cancel error:', err);
    res.status(500).json({ error: err.message });
  }
};
