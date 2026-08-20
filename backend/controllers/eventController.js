import { getAppIdByName } from '../utils/appHelper.js';
import { fetchAllAppEvents } from '../services/shopifyService.js';


// Helper generator to handle single app requests
async function handleSingleAppEvents(appName, req, res) {
  try {
    const appId = getAppIdByName(appName);
    if (!appId) {
      return res.status(404).json({ error: `App '${appName}' not found in configuration file.` });
    }

    const { startDate, endDate, forceRefresh } = req.query;
    const result = await fetchAllAppEvents(
      appId,
      { startDate, endDate },
      forceRefresh === 'true' || forceRefresh === true
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
  getPassonextEvents,
  getDiscountNinjaEvents,
  getCheckoutExtensionsEvents,
  getNojiroEvents,
  getPostPurchaseEvents,
  getCountryBlockerEvents,
  getOrderEditingEvents,
  getFormBuilderEvents,
};

