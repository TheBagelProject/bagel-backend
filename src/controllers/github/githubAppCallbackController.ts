import { Request, Response } from 'express';
import axios from 'axios';

// Handles GitHub App installation redirect
export const githubAppCallback = async (req: Request, res: Response) => {
  // GitHub redirects with installation_id and setup_action in query
  const { installation_id, setup_action } = req.query;

  if (!installation_id) {
    return res.status(400).json({ error: 'Missing installation_id in callback' });
  }


  res.json({ installationId: installation_id, setupAction: setup_action });
};
