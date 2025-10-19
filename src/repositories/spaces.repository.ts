import Project, { IProject } from '../models/project.schema';

// Get spaces by project ID
export const getSpacesByProjectId = async (
  projectId: string
): Promise<any[] | null> => {
  const project = await Project.findOne({ projectId }).select('spaces');
  return project ? project.spaces : null;
};