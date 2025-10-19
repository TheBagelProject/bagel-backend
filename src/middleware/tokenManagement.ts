import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';
import { getUserById } from '../repositories/user.repository';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';

export const generateToken = (payload: object) => {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
};

// Middleware: verifies token, extracts userId, checks user exists
export const authenticateToken = async (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'No token provided' });

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    if (!decoded.userId) return res.status(401).json({ error: 'Invalid token payload' });
    const user = await getUserById(decoded.userId);
    if (!user) return res.status(401).json({ error: 'User not found' });
    (req as any).user = user; // Attach full user object to req
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};