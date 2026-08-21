import express from 'express';
import {
  getAppEventsByName,
  getAllAppsEvents,
  getPassonextEvents,
  getDiscountNinjaEvents,
  getCheckoutExtensionsEvents,
  getNojiroEvents,
  getPostPurchaseEvents,
  getCountryBlockerEvents,
  getOrderEditingEvents,
  getFormBuilderEvents,
} from '../controllers/eventController.js';

const router = express.Router();

// Dedicated route for All Apps combined data
router.get('/all-apps', getAllAppsEvents);
router.get('/all', getAllAppsEvents);

// Dedicated routes for each individual app in all_apps.json
router.get('/passonext', getPassonextEvents);
router.get('/discount-ninja', getDiscountNinjaEvents);
router.get('/checkout-extensions', getCheckoutExtensionsEvents);
router.get('/nojiro', getNojiroEvents);
router.get('/post-purchase', getPostPurchaseEvents);
router.get('/country-blocker', getCountryBlockerEvents);
router.get('/order-editing', getOrderEditingEvents);
router.get('/form-builder', getFormBuilderEvents);

// Generic dynamic app route
router.get('/:appName', getAppEventsByName);

export default router;

