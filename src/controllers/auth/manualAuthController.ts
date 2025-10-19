import { Request, Response } from 'express';
import { spawn, execSync } from 'child_process';
import bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { createUser, getAllUsers, getUserById, updateUser, findByEmail, softDeleteUser, hardDeleteUser } from '../../repositories/user.repository';
import { generateToken } from '../../middleware/tokenManagement';
import { UserInput, UserRole } from '../../types/user.types';
import * as ProjectRepository from '../../repositories/project.repository';
import Project from '../../models/project.schema';
import dotenv from 'dotenv';
import { getContainerIdsByImage } from '../../utils/dockerUtils';

dotenv.config();

function generateUsername(name: string) {
  const base = name.split(' ')[0].toLowerCase();
  const rand = Math.random().toString(36).substring(2, 8);
  return `${base}_${rand}`;
}

function formatDate(date: Date): string {
  const day = date.getDate();
  const month = date.toLocaleString('default', { month: 'short' });
  const year = date.getFullYear();
  const suffix = (day % 10 === 1 && day !== 11) ? 'st' : (day % 10 === 2 && day !== 12) ? 'nd' : (day % 10 === 3 && day !== 13) ? 'rd' : 'th';
  return `${day}${suffix} ${month} ${year}`;
}

function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) return false;
  const domain = email.split('@')[1].toLowerCase();
  const forbiddenDomains = ['example.com', 'test.com'];
  if (forbiddenDomains.includes(domain)) return false;
  if (domain.includes('admin')) return false;
  return true;
}

const ManualAuthController = {
    

  
  // Signup API: Creates a new user account
  async signup(req: Request, res: Response) {
    const { name, email, password, role } = req.body as UserInput;
    if (!name || !email || !password || !role) return res.status(400).json({ error: 'Missing fields' });

    if (!isValidEmail(email)) return res.status(400).json({ error: 'Invalid email address' });

    const existing = await findByEmail(email);
    if (existing) return res.status(409).json({ error: 'User already exists' });

    const hashed = await bcrypt.hash(password, 10);
    const userId = uuidv4();
    const username = generateUsername(name);

    const user = await createUser({ userId, username, name, email, password: hashed, role });
    const token = generateToken({ userId: user.userId, username: user.username, email: user.email, role: user.role });
    res.status(201).json({
      token,
      userId: user.userId,
      username: user.username,
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.status,
      githubPAT: user.githubPAT,
      onboardingCompleted: user.onboardingCompleted
    });
  },



  // Login API: Authenticates user and returns token
  async login(req: Request, res: Response) {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Missing fields' });

    const user = await findByEmail(email);
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

    // Check if user has any projects
    const projectCount = await Project.countDocuments({ ownerId: user.userId });
    const isProjectThere = projectCount > 0 ? 'yes' : 'no';

    // Include userId, username, name in token
    const token = generateToken({ userId: user.userId, username: user.username, name: user.name, role: user.role });
    res.json({
      token,
      userId: user.userId,
      name: user.name,
      username: user.username,
      role: user.role,
      email: user.email,
      onboardingCompleted: user.onboardingCompleted,
      isProjectThere
    });
  },



  // Get All Users API: Retrieves list of all users (admin only)
  async getAllUsers(req: Request, res: Response) {
    const users = await getAllUsers();
    res.json(users.map(u => ({
      userId: u.userId,
      username: u.username,
      name: u.name,
      email: u.email,
      role: u.role,
      createdAt: u.createdAt,
      updatedAt: u.updatedAt,
    })));
  },



  // Get User By ID API: Retrieves current user's details from token
  async getUserById(req: Request, res: Response) {
    const user = (req as any).user;
    if (!user) return res.status(401).json({ error: 'Unauthorized' });
    res.json({
      userId: user.userId,
      username: user.username,
      name: user.name,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      memberSince: formatDate(user.createdAt),
      plan: 'OpenSource'
    });
  },



  // Get User By Email API: Retrieves user details by email (commented out)
  // async getUserByEmail(req: Request, res: Response) {
  //   const { email } = req.body;
  //   const user = await findByEmail(email);
  //   if (!user) return res.status(404).json({ error: 'User not found' });
  //   res.json({
  //     userId: user.userId,
  //     username: user.username,
  //     name: user.name,
  //     email: user.email,
  //     role: user.role,
  //     createdAt: user.createdAt,
  //     updatedAt: user.updatedAt,
  //   });
  // },



  // Update User API: Updates current user's profile details
  async updateUser(req: Request, res: Response) {
    const user = (req as any).user;
    if (!user) return res.status(401).json({ error: 'Unauthorized' });
    const data = req.body;
    if (data.password) delete data.password; // Don't allow password update here
    const updatedUser = await updateUser(user.userId, data);
    if (!updatedUser) return res.status(404).json({ error: 'User not found' });
    res.json({
      userId: updatedUser.userId,
      username: updatedUser.username,
      name: updatedUser.name,
      email: updatedUser.email,
      role: updatedUser.role,
      createdAt: updatedUser.createdAt,
      updatedAt: updatedUser.updatedAt,
    });
  },



  // Update Password API: Updates current user's password
  async updatePassword(req: Request, res: Response) {
    const user = (req as any).user;
    if (!user) return res.status(401).json({ error: 'Unauthorized' });
    const { oldPassword, newPassword } = req.body;
    if (!oldPassword || !newPassword) return res.status(400).json({ error: 'Old and new password required' });
    const valid = await bcrypt.compare(oldPassword, user.password);
    if (!valid) return res.status(401).json({ error: 'Invalid old password' });
    const hashed = await bcrypt.hash(newPassword, 10);
    const updatedUser = await updateUser(user.userId, { password: hashed });
    if (!updatedUser) return res.status(404).json({ error: 'User not found' });
    res.json({ message: 'Password updated successfully' });
  },



  // Soft Delete User API: Sets user status to INACTIVE
  async softDeleteUser(req: Request, res: Response) {
    const { id } = req.params;
    const user = await softDeleteUser(id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ message: 'User soft deleted', userId: user.userId, status: user.status });
  },


  
  // Hard Delete User API: Permanently deletes user and all associated data
  async hardDeleteUser(req: Request, res: Response) {
    const user = (req as any).user;
    if (!user) return res.status(401).json({ error: 'Unauthorized' });
    const image_name = process.env.DOCKER_IMAGE_NAME;
    if (!image_name) {
      return res.status(500).json({ error: 'DOCKER_IMAGE_NAME environment variable is not set' });
    }
    const ids = getContainerIdsByImage(image_name);
    if (ids.length === 0) {
      return res.status(500).json({ error: 'No containers found for the image' });
    }
    const containerId = ids[0];

    // Get all projects owned by the user
    const projects = await Project.find({ ownerId: user.userId });

    // Delete workspaces from container
    for (const project of projects) {
      const workspacePath = `/workspace/${project.projectName}`;
      try {
        await new Promise<void>((resolve, reject) => {
          const deleteProcess = spawn('docker', [
            'exec',
            containerId,
            'rm',
            '-rf',
            workspacePath
          ]);
          deleteProcess.on('close', (code) => {
            if (code === 0) {
              resolve();
            } else {
              reject(new Error(`Failed to delete workspace ${workspacePath}`));
            }
          });
          deleteProcess.on('error', reject);
        });
      } catch (err) {
        console.error(`Error deleting workspace for project ${project.projectName}:`, err);
        // Continue with other deletions
      }
    }

    // Delete all projects (and embedded spaces) from DB
    await Project.deleteMany({ ownerId: user.userId });

    // Delete the user
    await hardDeleteUser(user.userId);

    res.json({ message: 'User and all associated data hard deleted', userId: user.userId });
  },
};

export default ManualAuthController;