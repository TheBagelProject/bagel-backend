import { Request, Response } from "express";
import * as SpacesRepository from "../../repositories/spaces.repository";
import Deployment from "../../models/deployment.schema";
import * as UserRepository from "../../repositories/user.repository";
import Project from "../../models/project.schema";

/**
 * GET /projects/:projectId/spaces
 * Get all spaces for a specific project with deployment status and user info
 */
export const getSpacesByProjectId = async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;

    // Get project to find ownerId
    const project = await Project.findOne({ projectId }).select('ownerId');
    if (!project || !project.ownerId) {
      return res
        .status(404)
        .json({ success: false, error: "Project not found or has no owner" });
    }

    // Get user info
    const user = await UserRepository.getUserById(project.ownerId);
    if (!user) {
      return res
        .status(404)
        .json({ success: false, error: "User not found" });
    }

    const spaces = await SpacesRepository.getSpacesByProjectId(projectId);

    if (!spaces) {
      return res
        .status(404)
        .json({ success: false, error: "Spaces not found" });
    }

    // Get deployment info for each space
    const spacesWithStatus = await Promise.all(
      spaces.map(async (space) => {
        const lastDeployment = await Deployment.findOne({ spaceId: space.spaceId })
          .sort({ finishedAt: -1, startedAt: -1 })
          .select('finishedAt startedAt')
          .limit(1);

        let status = "not yet deployed";
        let lastRun: Date | null = null;

        if (lastDeployment) {
          lastRun = lastDeployment.finishedAt || lastDeployment.startedAt;
          status = "deployed";
        }

        return {
          spaceId: space.spaceId,
          spaceName: space.spaceName,
          status,
          lastRun,
          userId: user.userId,
          userName: user.name
        };
      })
    );

    res.json({ success: true, spaces: spacesWithStatus });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
};