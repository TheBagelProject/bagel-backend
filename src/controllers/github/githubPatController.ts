'use client'
import { Request, Response } from "express";
import { Buffer } from 'buffer';
import { upsertUserPAT, getUserPATByUserId } from "../../repositories/userPAT.repository";
import {
  fetchUserRepos,
  fetchRepoContents,
  fetchRepoTree,
  getBranches,
} from "../../services/githubPatService";

export const savePAT = async (req: Request, res: Response) => {
  // userId should be set by authentication middleware (e.g., req.user.userId)
  const { pat } = req.body;
  const userId = (req as any).user?.userId;
  if (!userId || !pat)
    return res.status(400).json({ error: "userId (from token) and PAT required" });
  try {
    await upsertUserPAT(userId, pat);
    res.json({ message: "PAT saved" });
  } catch (err) {
    console.error("Error in savePAT:", err);
    res.status(500).json({
      error: "Failed to save PAT",
      details: err instanceof Error ? err.message : err,
    });
  }
};

export const updatePAT = async (req: Request, res: Response) => {
  // userId should be set by authentication middleware (e.g., req.user.userId)
  const { pat } = req.body;
  const userId = (req as any).user?.userId;
  if (!userId || !pat)
    return res.status(400).json({ error: "userId (from token) and PAT required" });
  try {
    await upsertUserPAT(userId, pat);
    res.json({ message: "PAT updated" });
  } catch (err) {
    console.error("Error in updatePAT:", err);
    res.status(500).json({
      error: "Failed to update PAT",
      details: err instanceof Error ? err.message : err,
    });
  }
};

export const getRepos = async (req: Request, res: Response) => {
  // userId should be set by authentication middleware (e.g., req.user.userId)
  const userId = (req as any).user?.userId;
  if (!userId) return res.status(401).json({ error: "Unauthorized" });
  try {
    const userPat = await getUserPATByUserId(userId);
    if (!userPat || !userPat.githubPAT) {
      return res.status(404).json({ error: "PAT not found for user" });
    }
    const repos = await fetchUserRepos(userPat.githubPAT);
    // Extract repo name and owner, and fetch branches for each
    const repoList = await Promise.all(repos.map(async (repo: any) => {
      const branches = await getBranches(repo.owner.login, repo.name, userPat.githubPAT);
      return {
        name: repo.name,
        owner: repo.owner?.login || null,
        branches: branches.map((b: any) => b.name) // Assuming branches is an array of objects with 'name'
      };
    }));
    res.json(repoList);
  } catch (err: any) {
    if (err.status === 401) {
      return res.status(401).json({ error: "Invalid or unauthorized PAT" });
    }
    res.status(500).json({ error: "Failed to fetch repos" });
  }
};



export const getRepoContents = async (req: Request, res: Response) => {
  const { userId, owner, repo } = req.params;
  const path = req.params[0] || "";
  try {
    const userPat = await getUserPATByUserId(userId);
    if (!userPat || !userPat.githubPAT)
      return res.status(404).json({ error: "PAT not found for user" });
    const contents = await fetchRepoContents(userPat.githubPAT, owner, repo, path);
    // If contents is an array, it's a directory listing
    if (Array.isArray(contents)) {
      const folders = contents.filter((item: any) => item.type === 'dir');
      const files = contents.filter((item: any) => item.type === 'file');
      return res.json({
        folders: folders.map((f: any) => ({
          name: f.name,
          path: f.path,
          url: f.url,
          sha: f.sha
        })),
        files: files.map((f: any) => ({
          name: f.name,
          path: f.path,
          url: f.url,
          sha: f.sha,
          size: f.size
        }))
      });
    }
    // If contents is a file, decode and return content
    if (contents.type === 'file') {
      let decoded = null;
      if (contents.content && contents.encoding === 'base64') {
        decoded = Buffer.from(contents.content, 'base64').toString('utf-8');
      }
      return res.json({
        name: contents.name,
        path: contents.path,
        sha: contents.sha,
        size: contents.size,
        url: contents.url,
        content: decoded,
        encoding: contents.encoding
      });
    }
    // If not recognized, just return as is
    res.json(contents);
  } catch (err: any) {
    if (err.status === 401)
      return res.status(401).json({ error: "Invalid or unauthorized PAT" });
    if (err.status === 404)
      return res.status(404).json({ error: "Repo or path not found" });
    res.status(500).json({ error: "Failed to fetch repo contents" });
  }
};

export const getRepoTree = async (req: Request, res: Response) => {
  const {owner, repo, pat } = req.params;
  const branch = (req.query.ref as string) || "main";

  try {
    // const userPat = await getUserPAT(email);
    // if (!userPat)
    //   return res.status(404).json({ error: "PAT not found for user" });

    const tree = await fetchRepoTree(pat, owner, repo, branch);
    res.json(tree);
  } catch (err: any) {
    console.error("Error fetching repo tree:", err.message);
    res.status(500).json({
      message: "Failed to fetch repo tree",
      error: err.message,
    });
  }
};


// Get decoded file content by filename (separate API)
export const getFileContent = async (req: Request, res: Response) => {
  const { userId, owner, repo, filename } = req.params;
  const path = req.params[0] ? req.params[0] + '/' + filename : filename;
  try {
    const userPat = await getUserPATByUserId(userId);
    if (!userPat || !userPat.githubPAT) return res.status(404).json({ error: 'PAT not found for user' });
    const file = await fetchRepoContents(userPat.githubPAT, owner, repo, path);
    if (!file || file.type !== 'file') {
      return res.status(404).json({ error: 'File not found' });
    }
    let decoded = null;
    if (file.content && file.encoding === 'base64') {
      decoded = Buffer.from(file.content, 'base64').toString('utf-8');
    }
    return res.json({
      name: file.name,
      path: file.path,
      sha: file.sha,
      size: file.size,
      url: file.url,
      content: decoded,
      encoding: file.encoding
    });
  } catch (err: any) {
    if (err.status === 401) return res.status(401).json({ error: 'Invalid or unauthorized PAT' });
    if (err.status === 404) return res.status(404).json({ error: 'File not found' });
    res.status(500).json({ error: 'Failed to fetch file content' });
  }
};

