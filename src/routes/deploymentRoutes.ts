import { Router } from "express";
import { getDeployments, getDeploymentSummary, deleteDeploymentById } from "../controllers/deployment/deploymentController";
import { authenticateToken } from "../middleware/tokenManagement";

const router = Router();



router.get("/", getDeployments);
router.delete("/:deploymentId/delete", deleteDeploymentById);
// Protected route to delete a deployment by ID
router.delete("/:deploymentId", authenticateToken, deleteDeploymentById);

export default router;