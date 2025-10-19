import { Router } from "express";
import { terraformInit, terraformPlan, terraformApply, terraformDestroy } from "../controllers/terrafrom/terraformInjector";
import { getDeploymentSummary } from "../controllers/deployment/deploymentController";
import { authenticateToken } from "../middleware/tokenManagement";

const router = Router();

// Get deployment summary
router.get(
  "/:deploymentId/summary",
  authenticateToken,
  getDeploymentSummary
);

// Run terraform init only
router.post(
  "/:projectId/init",
  authenticateToken,
  terraformInit
);

// Run terraform plan only
router.post(
  "/:projectId/plan",
  authenticateToken,
  terraformPlan
);

// Run terraform apply --auto-approve
router.post(
  "/:projectId/apply",
  authenticateToken,
  terraformApply
);

// Run terraform destroy --auto-approve
router.post(
  "/:projectId/destroy",
  authenticateToken,
  terraformDestroy
);

export default router;
