import Project, { IProject } from '../models/project.schema';

// 1. Create Project (POST /projects)
export const createProject = async (
  projectName: string,
  projectDescription?: string,
  profile?: string
): Promise<IProject> => {
  return await Project.create({ projectName, projectDescription, profile });
};

// 2. Update CSP (PUT /projects/:projectId/csp)
export const updateProjectCsp = async (
  projectId: string,
  csp: "aws" | "gcp" | "azure"
): Promise<IProject | null> => {
  return await Project.findOneAndUpdate(
    { projectId },
    { csp },
    { new: true }
  );
};

// 3. Update repo details (PUT /projects/:projectId/repo)
export const updateProjectRepo = async (
  projectId: string,
  repoUrl: string,
  ownerName: string,
  branch: string
): Promise<IProject | null> => {
  // ownerName should be saved to the ownerName field, not ownerId
  return await Project.findOneAndUpdate(
    { projectId },
    { repoUrl, ownerName, branch },
    { new: true }
  );
};

// 4. Get all projects (GET /projects)
export const getAllProjects = async (): Promise<IProject[]> => {
  return await Project.find();
};

// 5. Get project by ID (GET /projects/:projectId)
export const getProjectById = async (
  projectId: string
): Promise<IProject | null> => {
  return await Project.findOne({ projectId });
};

// 6. Get projects by owner ID (GET /projects/owner)
export const getProjectsByOwnerId = async (
  ownerId: string
): Promise<IProject[]> => {
  return await Project.find({ ownerId });
};

// 7. Clone repo into workspace (POST /projects/:projectId/clone)
