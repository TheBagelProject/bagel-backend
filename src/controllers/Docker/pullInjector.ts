import { Request, Response } from "express";
import { spawn, execSync } from "child_process";
import { v4 as uuidv4 } from "uuid";
import Project from "../../models/project.schema";
import { getContainerIdsByImage } from "../../utils/dockerUtils";

/**
 * PUT /projects/:projectId/reset
 * Hard resets the repo to remote main branch inside container
 * Syncs spaces with current root-level folders
 */
export const resetRepoAndSyncSpaces = async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;

    const project = await Project.findOne({ projectId });
    if (!project) {
      return res.status(404).json({ error: "Project not found" });
    }

    if (!project.repoUrl || !project.projectName) {
      return res.status(400).json({ error: "repoUrl or projectName missing" });
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

    const runCmd = (cmd: string) =>
      new Promise<string>((resolve, reject) => {
        const proc = spawn("docker", ["exec", containerId, "sh", "-c", cmd]);
        let out = "";
        let err = "";
        proc.stdout.on("data", (d) => (out += d.toString()));
        proc.stderr.on("data", (d) => (err += d.toString()));
        proc.on("close", (code) => {
          if (code === 0) resolve(out);
          else reject(new Error(err || `Command failed with code ${code}`));
        });
      });

    // Check if workspace directory exists in the container
    const checkDirCmd = `[ -d "${workspacePath}" ] && echo "exists" || echo "missing"`;
    const dirStatus = await runCmd(checkDirCmd);
    if (!dirStatus.includes("exists")) {
      return res.status(400).json({ error: `Workspace directory ${workspacePath} does not exist in container. Please clone the repo first.` });
    }

    // Step 1: Hard reset repo
    await runCmd(
      `cd ${workspacePath} && git fetch origin main && git reset --hard origin/main && git clean -fd`
    );

    // Step 2: List root-level folders
    const folderOutput = await runCmd(
      `cd ${workspacePath} && ls -d */ || true`
    );

    const folderNames = folderOutput
      .split("\n")
      .map((f) => f.replace("/", "").trim())
      .filter((f) => f.length > 0);

    // Step 3: Sync spaces
    const existingSpaces = project.spaces || [];

    // keep spaces that still exist
    const keptSpaces = existingSpaces.filter((s) =>
      folderNames.includes(s.spaceName)
    );

    // add new spaces
    const newSpaces = folderNames
      .filter((f) => !keptSpaces.find((s) => s.spaceName === f))
      .map((folder) => ({
        spaceId: uuidv4(),
        spaceName: folder,
        spaceDescription: "",
      }));

    project.spaces = [...keptSpaces, ...newSpaces];
    await project.save();

    res.json({
      success: true,
      message: `Repo reset to origin/main and spaces synced`,
      spaces: project.spaces,
      added: newSpaces.map((s) => s.spaceName),
      removed: existingSpaces
        .filter((s) => !folderNames.includes(s.spaceName))
        .map((s) => s.spaceName),
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};
