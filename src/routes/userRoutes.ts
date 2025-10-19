
import { Router } from "express";
import ManualAuthController from '../controllers/auth/manualAuthController';
import { authenticateToken } from '../middleware/tokenManagement';

const router = Router();

// Register a new user
router.post('/signup', ManualAuthController.signup);

// Login a user and return JWT
router.post('/login', ManualAuthController.login);


// Get all users (protected)
router.get('/users', authenticateToken, ManualAuthController.getAllUsers);

// Get user by ID (protected)
router.get('/get-user-by-id', authenticateToken, ManualAuthController.getUserById);

// Get user by Email (protected)
// router.post('/users/email', authenticateToken, ManualAuthController.getUserByEmail);

// Update user by ID (protected)
router.put('/update-user', authenticateToken, ManualAuthController.updateUser);

// Update password (protected)
router.put('/update-password', authenticateToken, ManualAuthController.updatePassword);

// Soft delete user by ID (protected)
router.delete('/users/:id/soft', authenticateToken, ManualAuthController.softDeleteUser);

// Hard delete current user (protected)
router.delete('/delete-hard', authenticateToken, ManualAuthController.hardDeleteUser);

export default router;
