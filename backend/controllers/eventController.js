import { getAppIdByName } from '../utils/appHelper.js';
import { fetchAllAppEvents, fetchAllAppsCombinedEvents } from '../services/shopifyService.js';
import { connectDB } from '../config/db.js';

// Helper generator to handle app requests (single or combined)
async function handleSingleAppEvents(appName, req, res) {
  try {
    // Dynamically connect database(s) based on selected app / All Apps
    await connectDB(appName);

    const { startDate, endDate, forceRefresh } = req.query;
    const isForce = forceRefresh === 'true' || forceRefresh === true;
    const norm = (appName || '').toLowerCase().replace(/[-_\s]/g, '');

    if (norm === 'all' || norm === 'allapps') {
      const result = await fetchAllAppsCombinedEvents({ startDate, endDate }, isForce);
      return res.json({
        success: true,
        data: result,
      });
    }

    const appId = getAppIdByName(appName);
    if (!appId) {
      return res.status(404).json({ error: `App '${appName}' not found in configuration file.` });
    }

    const result = await fetchAllAppEvents(
      appId,
      { startDate, endDate },
      isForce
    );
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error(`Error fetching events for ${appName}:`, error.message);
    const statusCode = error.response?.status === 429 ? 429 : 500;
    res.status(statusCode).json({
      success: false,
      error: error.message
    });
  }
}

// 0. All Apps Combined
async function getAllAppsEvents(req, res) {
  await handleSingleAppEvents('All Apps', req, res);
}

// 1. Passonext
async function getPassonextEvents(req, res) {
  await handleSingleAppEvents('passonext', req, res);
}

// 2. Discount Ninja
async function getDiscountNinjaEvents(req, res) {
  await handleSingleAppEvents('Discount_Ninja', req, res);
}

// 3. Checkout Extensions
async function getCheckoutExtensionsEvents(req, res) {
  await handleSingleAppEvents('Checkout_Extensions', req, res);
}

// 4. Nojiro
async function getNojiroEvents(req, res) {
  await handleSingleAppEvents('Nojiro', req, res);
}

// 5. Post Purchase
async function getPostPurchaseEvents(req, res) {
  await handleSingleAppEvents('Post_purchase', req, res);
}

// 6. Country Blocker
async function getCountryBlockerEvents(req, res) {
  await handleSingleAppEvents('Country_Blocker', req, res);
}

// 7. Order Editing
async function getOrderEditingEvents(req, res) {
  await handleSingleAppEvents('Order_editing', req, res);
}

// 8. Form Builder
async function getFormBuilderEvents(req, res) {
  await handleSingleAppEvents('Form_Builder', req, res);
}

// Generic dynamic app handler
async function getAppEventsByName(req, res) {
  const { appName } = req.params;
  await handleSingleAppEvents(appName, req, res);
}

export {
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
};


