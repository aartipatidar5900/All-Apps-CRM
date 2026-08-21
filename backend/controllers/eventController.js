import { getAppIdByName } from '../utils/appHelper.js';
import { fetchAllAppEvents, fetchAllAppsCombinedEvents } from '../services/shopifyService.js';
// import { connectDB} from '../config/db.js';
import {  getConnection, getAllConnections } from '../config/db.js';

/**
 * Batch-fetch store_details from MongoDB collection(s) and merge into storesList
 */
async function enrichStoresWithMongoDetails(storesList, appName) {
  if (!Array.isArray(storesList) || storesList.length === 0) return storesList;

  const domains = storesList
    .map((s) => (s.storeDomain || s.canonicalKey || s._id || '').toLowerCase().trim())
    .filter(Boolean);

  if (domains.length === 0) return storesList;

  const norm = (appName || '').toLowerCase().replace(/[-_\s]/g, '');
  const detailsMap = new Map();

  try {
    if (norm === 'all' || norm === 'allapps') {
      const conns = getAllConnections();
      for (const conn of conns.values()) {
        if (conn && conn.readyState === 1) {
          const docs = await conn
            .collection('store_details')
            .find({ shop: { $in: domains } })
            .toArray();
          docs.forEach((doc) => {
            if (doc.shop) {
              const shopKey = doc.shop.toLowerCase().trim();
              if (!detailsMap.has(shopKey)) {
                detailsMap.set(shopKey, doc);
              }
            }
          });
        }
      }
    } else {
      const conn = getConnection(appName);
      if (conn && conn.readyState === 1) {
        const docs = await conn
          .collection('store_details')
          .find({ shop: { $in: domains } })
          .toArray();
        docs.forEach((doc) => {
          if (doc.shop) {
            detailsMap.set(doc.shop.toLowerCase().trim(), doc);
          }
        });
      }

      // Fallback across all active DB connections if empty for specific app
      if (detailsMap.size === 0) {
        const conns = getAllConnections();
        for (const conn of conns.values()) {
          if (conn && conn.readyState === 1) {
            const docs = await conn
              .collection('store_details')
              .find({ shop: { $in: domains } })
              .toArray();
            docs.forEach((doc) => {
              if (doc.shop) {
                const shopKey = doc.shop.toLowerCase().trim();
                if (!detailsMap.has(shopKey)) {
                  detailsMap.set(shopKey, doc);
                }
              }
            });
          }
        }
      }
    }

    // Merge metadata into store objects
    storesList.forEach((s) => {
      const key = (s.storeDomain || s.canonicalKey || s._id || '').toLowerCase().trim();
      const details = detailsMap.get(key);
      if (details) {
        s.country = details.country || s.country || null;
        s.appPlan = details.app_plan || details.appPlan || s.appPlan || null;
        s.storePlan = details.shopify_plan || details.store_plan || details.storePlan || s.storePlan || null;
        s.contactEmail = details.email || s.contactEmail || s.ownerEmail || s.storeEmail || null;
        s.ownerEmail = details.email || s.ownerEmail || null;
        s.email = details.email || s.contactEmail || s.ownerEmail || s.storeEmail || null;
        s.phoneNumber = details.phone || s.phoneNumber || s.phone || null;
        s.phone = details.phone || s.phoneNumber || s.phone || null;
        s.ownerName = details.shop_owner_name || s.ownerName || null;
        s.customersCount = typeof details.customers_count === 'number' ? details.customers_count : (s.customersCount ?? null);
        
        let lastStep = null;
        if (Array.isArray(details.onboarding_completed_steps) && details.onboarding_completed_steps.length > 0) {
          const rawStep = details.onboarding_completed_steps[details.onboarding_completed_steps.length - 1];
          if (rawStep && typeof rawStep === 'string') {
            lastStep = rawStep
              .replace(/[-_]/g, ' ')
              .replace(/\b\w/g, (char) => char.toUpperCase());
          }
        }
        s.onboardingStep = lastStep || s.onboardingStep || null;
        s.onboarding_completed_steps = details.onboarding_completed_steps || s.onboarding_completed_steps || [];
      }
    });
  } catch (err) {
    console.warn(`[MongoDB Enrichment Warning] ${err.message}`);
  }

  return storesList;
}

/**
 * Core handler to process requests for a single app or All Apps combined
 */
async function handleSingleAppEvents(appName, req, res) {
  try {
    // Dynamically connect database(s) based on selected app / All Apps
    // await connectDB(appName);

    const { startDate, endDate, forceRefresh } = req.query;
    const isForce = forceRefresh === 'true' || forceRefresh === true;
    const norm = (appName || '').toLowerCase().replace(/[-_\s]/g, '');

    if (norm === 'all' || norm === 'allapps') {
      const result = await fetchAllAppsCombinedEvents({ startDate, endDate }, isForce);
      if (result && Array.isArray(result.stores)) {
        await enrichStoresWithMongoDetails(result.stores, 'All Apps');
      }
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

    if (result && Array.isArray(result.stores)) {
      await enrichStoresWithMongoDetails(result.stores, appName);
    }

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error(`Error fetching events for ${appName}:`, error.message);
    const statusCode = error.response?.status === 429 ? 429 : 500;
    res.status(statusCode).json({
      success: false,
      error: error.message,
    });
  }
}

/**
 * Controller endpoint for All Apps combined data
 */
async function getAllAppsEvents(req, res) {
  await handleSingleAppEvents('All Apps', req, res);
}

/**
 * Controller endpoint for dynamic app resolution by name parameter
 */
async function getAppEventsByName(req, res) {
  const appName = req.params.appName || 'All Apps';
  await handleSingleAppEvents(appName, req, res);
}

export {
  getAppEventsByName,
  getAllAppsEvents,
};
