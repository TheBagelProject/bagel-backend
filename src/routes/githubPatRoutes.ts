// routes/githubPatRoutes.ts
import { Router } from "express";
import {
  savePAT,
  getRepos,
  getRepoContents, getFileContent,
  getRepoTree,
  updatePAT
} from "../controllers/github/githubPatController";
import { authenticateToken } from "../middleware/tokenManagement";

const router = Router();

router.post("/save-pat", authenticateToken, savePAT);
router.put("/update-pat", authenticateToken, updatePAT);
router.get("/list-repos", authenticateToken, getRepos);

//API to get the content of a specific file in a repo
router.get('/repos/:email/:owner/:repo/file/*/:filename', getFileContent);

router.get("/repos/:email/:owner/:repo/contents/*", getRepoContents);
router.get("/repos/:owner/:repo/:pat/tree", getRepoTree);

export default router;
