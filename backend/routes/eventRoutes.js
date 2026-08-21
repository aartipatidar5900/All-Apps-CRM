import express from 'express';
import {
  getAppEventsByName,
  getAllAppsEvents,
} from '../controllers/eventController.js';

const router = express.Router();

// Dedicated route for All Apps combined data
router.get('/all-apps', getAllAppsEvents);
router.get('/all', getAllAppsEvents);

// Dynamic app route (matches any app name e.g. /passonext, /discount-ninja, etc.)
router.get('/:appName', getAppEventsByName);

export default router;
