import { Request, Response } from "express";
import { spawn, execSync } from "child_process";
import dotenv from "dotenv";
import { v4 as uuidv4 } from "uuid";

import Project from "../../models/project.schema"; 
import { getContainerIdsByImage } from "../../utils/dockerUtils";

dotenv.config();

/**
 * POST /projects/:projectId/inject-to-container
 * Clones the repo inside container and creates spaces for each root-level folder
 * Returns logs and result in JSON response
 */
export const cloneRepoAndCreateSpaces = async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;
    const user = (req as any).user;

    if (!user || !user.userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    // Get project info
    const project = await Project.findOne({ projectId });
    if (!project) {
      return res.status(404).json({ error: "Project not found" });
    }

    if (!project.repoUrl || !project.projectName) {
      return res.status(400).json({ error: "Project repoUrl or name missing" });
    }

    // Build authenticated repo URL if PAT present (do not log the PAT)
    const originalRepoUrl = project.repoUrl;
    let repoUrlForClone = originalRepoUrl;
    if (user.githubPAT) {
      // Use 'git' as the username and PAT as password (recommended for PAT-based HTTPS cloning)
      // Example: https://git:<PAT>@github.com/owner/repo.git
      repoUrlForClone = originalRepoUrl.replace(
        /^https:\/\/github.com\//,
        `https://git:${user.githubPAT}@github.com/`
      );
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

    const workspacePath = `/workspace/${project.projectName}`;

    let logs = "";

    const appendLog = (msg: string) => {
      logs += msg + "\n";
    };

    // Step 1: Create folder & clone repo
    // Log sanitized repo URL (without credentials)
    appendLog(`Cloning repo ${originalRepoUrl} into ${workspacePath}...`);

    const runClone = (cmd: string) => {
      return new Promise<number>((resolve, reject) => {
        const proc = spawn("docker", ["exec", containerId, "sh", "-c", cmd]);
        proc.stdout.on("data", (data) => appendLog(data.toString()));
        proc.stderr.on("data", (data) => appendLog("[ERROR] " + data.toString()));
        proc.on("close", (code) => resolve(code ?? 1));
        proc.on("error", (err) => reject(err));
      });
    };

    // Ensure clean workspace, then attempt clone with branch; on failure code 128, retry without -b
    const cloneWithBranchCmd = `rm -rf "${workspacePath}" && mkdir -p "${workspacePath}" && git clone -b "${project.branch || "main"}" "${repoUrlForClone}" "${workspacePath}" 2>&1`;
    const cloneDefaultCmd = `rm -rf "${workspacePath}" && mkdir -p "${workspacePath}" && git clone "${repoUrlForClone}" "${workspacePath}" 2>&1`;

    let cloneExit = await runClone(cloneWithBranchCmd);
    if (cloneExit !== 0) {
      appendLog(`Clone with branch '${project.branch || "main"}' failed with exit code ${cloneExit}. Retrying without specifying branch...`);
      cloneExit = await runClone(cloneDefaultCmd);
    }
    if (cloneExit !== 0) {
      throw new Error(`Clone failed with exit code ${cloneExit}`);
    }
    appendLog("✅ Clone completed. Reading root folders...");

    // Step 2: List root-level folders
    const listProcess = spawn("docker", [
      "exec",
      containerId,
      "sh",
      "-c",
      `cd "${workspacePath}" && ls -d */ || true`
    ]);

    let folderBuffer = "";
    listProcess.stdout.on("data", (data) => {
      folderBuffer += data.toString();
      appendLog(data.toString());
    });

    listProcess.stderr.on("data", (data) => {
      appendLog("[ERROR] " + data.toString());
    });

    await new Promise<void>((resolve, reject) => {
      listProcess.on("close", (code) => {
        if (code !== 0) {
          appendLog(`List folders failed with exit code ${code}`);
          reject(new Error(`List folders failed with exit code ${code}`));
        } else {
          resolve();
        }
      });
    });

    const folderNames = folderBuffer
      .split("\n")
      .map((f) => f.replace("/", "").trim())
      .filter((f) => f.length > 0);

    const newSpaces = folderNames.map((folder) => ({
      spaceId: uuidv4(),
      spaceName: folder,
      spaceDescription: "",
    }));

    // Push into project.spaces[]
    project.spaces = [...project.spaces, ...newSpaces];
    await project.save();

    for (const space of newSpaces) {
      appendLog(`📂 Space created: ${space.spaceName} (${space.spaceId})`);
    }

    appendLog("🎉 All spaces created successfully!");

    res.json({
      success: true,
      spaces: newSpaces,
      logs: logs.trim(),
    });
  } catch (err: any) {
    console.error("Clone error:", err);
    res.status(500).json({
      success: false,
      error: err.message,
      logs: (err as any).logs || "",
    });
  }
};