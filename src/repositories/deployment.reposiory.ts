
import Deployment from "../models/deployment.schema";



export const createDeployment = async ({
  deploymentId,
  projectId,
  spaceId,
  deploymentName,
  step,
  stepStatus,
  message,
}: any) => {
  // Only create if not exists
  return Deployment.findOneAndUpdate(
    { deploymentId },
    {
      $setOnInsert: {
        deploymentId,
        projectId,
        spaceId,
        deploymentName,
        steps: [{ step, stepStatus, message, timestamp: new Date() }],
        startedAt: new Date(),
      }
    },
    { upsert: true, new: true }
  );
};



export const addDeploymentStep = async ({ deploymentId, step, stepStatus, message, structuredData }: any) => {
  // Remove any previous step for this type, then push the new one
  await Deployment.updateOne(
    { deploymentId },
    { $pull: { steps: { step } } }
  );
  return Deployment.findOneAndUpdate(
    { deploymentId },
    {
      $push: {
        steps: { step, stepStatus, message, timestamp: new Date(), ...(structuredData ? { structuredData } : {}) }
      }
    },
    { new: true }
  );
};
