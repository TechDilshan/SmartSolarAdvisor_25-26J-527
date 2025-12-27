import { Router } from 'express';

import { login, getProfile, verifyAdmin } from '../controllers/auth.controller.js';
import { verifyToken, requireAdmin } from '../middleware/auth.middleware.js';

const router = Router();

// Login endpoint (no auth required)
router.post('/login', login);

// Get current user profile
router.get('/profile', verifyToken, getProfile);

// Verify admin status
router.get('/verify-admin', verifyToken, verifyAdmin);

export default router;
