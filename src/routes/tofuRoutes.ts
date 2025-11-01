import { Router } from "express";
import { tofuInit, tofuPlan, tofuApply, tofuDestroy, tofuPlanDeny } from "../controllers/terrafrom/tofuInjector";
import { getDeploymentSummary } from "../controllers/deployment/deploymentController";
import { authenticateToken } from "../middleware/tokenManagement";

const router = Router();

// Get deployment summary
router.get(
  "/:deploymentId/summary",
  authenticateToken,
  getDeploymentSummary
);

// Run tofu init only
router.post(
  "/:projectId/init",
  authenticateToken,
  tofuInit
);

// Run tofu plan only
router.post(
  "/:projectId/plan",
  authenticateToken,
  tofuPlan
);

// Cancel plan (mark step as cancelled)
router.post(
  "/:projectId/plan/cancel",
  authenticateToken,
  tofuPlanDeny
);

// Run tofu apply --auto-approve
router.post(
  "/:projectId/apply",
  authenticateToken,
  tofuApply
);

// Run tofu destroy --auto-approve
router.post(
  "/:projectId/destroy",
  authenticateToken,
  tofuDestroy
);

export default router;
