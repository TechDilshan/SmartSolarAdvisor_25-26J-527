import { Router } from 'express';

import { getSummary, getDailyTotal, getMonthlyTotal, getAll, getLatest, getByRange, getMonthlyBreakdown } from '../controllers/prediction.controller.js';
import { verifyToken } from '../middleware/auth.middleware.js';

const router = Router();

// Get prediction summary (daily + monthly + latest)
router.get('/:customerName/:siteId/summary', verifyToken, getSummary);

// Get daily total
router.get('/:customerName/:siteId/daily', verifyToken, getDailyTotal);

// Get monthly total
router.get('/:customerName/:siteId/monthly', verifyToken, getMonthlyTotal);

// Get last 12 months breakdown (for seasonal trends)
router.get('/:customerName/:siteId/monthly-breakdown', verifyToken, getMonthlyBreakdown);

// Get all predictions for a site
router.get('/:customerName/:siteId', verifyToken, getAll);

// Get latest prediction
router.get('/:customerName/:siteId/latest', verifyToken, getLatest);

// Get predictions by date range
router.get('/:customerName/:siteId/range', verifyToken, getByRange);

export default router;     
