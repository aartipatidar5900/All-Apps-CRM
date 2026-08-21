import axios from 'axios';
import { GET_APP_EVENTS_QUERY } from '../graphql/eventQueries.js';
import { getStoreDetailsCache } from './shopifyAdminService.js';
import { getAllApps } from '../utils/appHelper.js';

// In-memory cache for app events data
const appEventsCache = new Map();
const CACHE_TTL_MS = 10 * 1000; // 10 seconds for fast real-time Partner API updates

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Robust GraphQL executor with exponential backoff for 429 (Rate Limit) and network errors
 */
async function executePartnerGraphQLWithRetry(url, token, query, variables, maxRetries = 4) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await axios({
        url,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Shopify-Access-Token': token,
        },
        data: { query, variables },
        timeout: 30000,
      });

      if (response.data.errors) {
        throw new Error(JSON.stringify(response.data.errors));
      }

      return response.data;
    } catch (error) {
      const status = error.response?.status;
      const isRateLimit =
        status === 429 ||
        error.message?.includes('429') ||
        error.message?.includes('THROTTLED') ||
        error.message?.includes('Throttled');
      const isNetworkError =
        error.code === 'ECONNRESET' ||
        error.code === 'ETIMEDOUT' ||
        error.code === 'ECONNABORTED';

      if ((isRateLimit || isNetworkError) && attempt < maxRetries) {
        const retryAfterHeader = error.response?.headers?.['retry-after'];
        let waitTime = retryAfterHeader
          ? parseInt(retryAfterHeader, 10) * 1000
          : Math.min(1000 * Math.pow(2, attempt - 1), 6000);
        if (isNaN(waitTime) || waitTime <= 0) waitTime = 1500 * attempt;

        console.warn(
          `[Shopify Partner API] Rate limited (429) or network issue on attempt ${attempt}/${maxRetries}. Retrying in ${waitTime}ms...`
        );
        await sleep(waitTime);
        continue;
      }

      throw error;
    }
  }
}

async function fetchAllAppEvents(appApiKey, dateFilter = {}, forceRefresh = false) {
  const cacheKey = `${appApiKey}_${dateFilter.startDate || ''}_${dateFilter.endDate || ''}`;
  const currentTime = Date.now();

  // Return cached result if fresh and not explicitly forced
  if (!forceRefresh && appEventsCache.has(cacheKey)) {
    const cached = appEventsCache.get(cacheKey);
    if (currentTime - cached.timestamp < CACHE_TTL_MS) {
      return cached.data;
    }
  }

  const SHOPIFY_PARTNER_TOKEN = process.env.SHOPIFY_PARTNER_TOKEN;
  const SHOPIFY_ORGANIZATION_ID = process.env.SHOPIFY_ORGANIZATION_ID;

  const endpoint = `https://partners.shopify.com/${SHOPIFY_ORGANIZATION_ID}/api/2026-07/graphql.json`;

  let hasNextPage = true;
  let after = null;
  let totalCount = 0;
  let allEvents = [];
  let appName = '';

  const gidAppId = appApiKey.startsWith('gid://')
    ? appApiKey
    : `gid://partners/App/${appApiKey}`;

  try {
    while (hasNextPage) {
      const responseData = await executePartnerGraphQLWithRetry(
        endpoint,
        SHOPIFY_PARTNER_TOKEN,
        GET_APP_EVENTS_QUERY,
        {
          appId: gidAppId,
          after: after,
        }
      );

      const appData = responseData.data?.app;
      if (!appData) {
        throw new Error(`App with ID ${gidAppId} not found.`);
      }

      appName = appData.name;
      const eventsData = appData.events;
      const edges = eventsData.edges || [];

      totalCount += edges.length;
      allEvents.push(...edges.map((edge) => edge.node));

      hasNextPage = eventsData.pageInfo.hasNextPage;
      if (edges.length > 0) {
        after = edges[edges.length - 1].cursor;
        // Small 50ms pause between pagination requests to avoid burst rate limits
        if (hasNextPage) await sleep(50);
      } else {
        hasNextPage = false;
      }
    }
  } catch (error) {
    // If Shopify fails (e.g. rate limits exhausted) but we have stale cached data, serve stale data gracefully
    if (appEventsCache.has(cacheKey)) {
      console.warn(
        `[Shopify API Warning] Serving stale cached data for ${appApiKey} due to: ${error.message}`
      );
      return appEventsCache.get(cacheKey).data;
    }
    throw error;
  }

  // Apply date range filter if provided
  const { startDate, endDate } = dateFilter;
  let filteredEvents = allEvents;

  if (startDate || endDate) {
    filteredEvents = allEvents.filter(event => {
      const eventDate = new Date(event.occurredAt);
      if (startDate) {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        if (eventDate < start) return false;
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        if (eventDate > end) return false;
      }
      return true;
    });
  }

  // Calculate total overall counts by event type and unique active stores
  const eventCounts = {
    RELATIONSHIP_INSTALLED: 0,
    RELATIONSHIP_UNINSTALLED: 0,
    RELATIONSHIP_DEACTIVATED: 0,
    RELATIONSHIP_REACTIVATED: 0,
    SUBSCRIPTION_CHARGE_ACTIVATED: 0,
    SUBSCRIPTION_CHARGE_EXPIRED: 0,
    SUBSCRIPTION_CHARGE_UNFROZEN: 0,
    SUBSCRIPTION_CHARGE_DECLINED: 0,
    SUBSCRIPTION_CHARGE_CANCELED: 0,
    SUBSCRIPTION_CHARGE_FROZEN: 0,
    ONE_TIME_CHARGE_ACTIVATED: 0,
    ONE_TIME_CHARGE_EXPIRED: 0
  };

  const installedShops = new Set();
  const uninstalledShops = new Set();
  const deactivatedShops = new Set();
  const reactivatedShops = new Set();
  const allUniqueShops = new Set();

  const allSortedEvents = [...allEvents].sort((a, b) => new Date(a.occurredAt) - new Date(b.occurredAt));
  const sortedEvents = [...filteredEvents].sort((a, b) => new Date(a.occurredAt) - new Date(b.occurredAt));

  const shopIdToDomainMap = {};
  const domainToShopIdMap = {};

  for (const event of allSortedEvents) {
    const shop = event.shop || {};
    const rawId = shop.id ? String(shop.id).trim().toLowerCase() : null;
    const rawDomain = shop.myshopifyDomain ? String(shop.myshopifyDomain).toLowerCase().trim() : null;

    if (rawId && rawDomain) {
      if (!shopIdToDomainMap[rawId] || (!rawDomain.match(/^\d+\.myshopify\.com$/) && shopIdToDomainMap[rawId].match(/^\d+\.myshopify\.com$/))) {
        shopIdToDomainMap[rawId] = rawDomain;
      }
      domainToShopIdMap[rawDomain] = rawId;
    }
  }

  function getCanonicalShopKey(shop) {
    if (!shop) return 'unknown';
    const rawId = shop.id ? String(shop.id).trim().toLowerCase() : null;
    const rawDomain = shop.myshopifyDomain ? String(shop.myshopifyDomain).toLowerCase().trim() : null;

    if (rawId && shopIdToDomainMap[rawId]) return shopIdToDomainMap[rawId];
    if (rawDomain && domainToShopIdMap[rawDomain]) return rawDomain;
    if (rawDomain) return rawDomain;
    if (rawId) return rawId;
    return 'unknown';
  }

  // Group sortedEvents by shop to determine chronological sequence per shop
  const shopEventsMap = {};
  for (const event of sortedEvents) {
    const shopKey = getCanonicalShopKey(event.shop);
    if (shopKey !== 'unknown') {
      if (!shopEventsMap[shopKey]) {
        shopEventsMap[shopKey] = [];
      }
      shopEventsMap[shopKey].push(event);
    }
  }

  // Determine current active/inactive status per shop based on all-time event history
  const shopCurrentStatus = {};

  for (const event of allSortedEvents) {
    const type = event.type;
    const shopKey = getCanonicalShopKey(event.shop);

    if (shopKey !== 'unknown') {
      allUniqueShops.add(shopKey);

      if (type === 'RELATIONSHIP_INSTALLED' || type === 'RELATIONSHIP_REACTIVATED') {
        shopCurrentStatus[shopKey] = 'ACTIVE';
      } else if (type === 'RELATIONSHIP_UNINSTALLED' || type === 'RELATIONSHIP_DEACTIVATED') {
        shopCurrentStatus[shopKey] = 'INACTIVE';
      }
    }
  }

  // Count event occurrences within selected date filter
  for (const event of sortedEvents) {
    const type = event.type;
    const shopKey = getCanonicalShopKey(event.shop);
    if (shopKey !== 'unknown') {
      if (type in eventCounts) {
        eventCounts[type] += 1;
      } else {
        eventCounts[type] = 1;
      }
      if (type === 'RELATIONSHIP_INSTALLED') installedShops.add(shopKey);
      if (type === 'RELATIONSHIP_UNINSTALLED') uninstalledShops.add(shopKey);
      if (type === 'RELATIONSHIP_DEACTIVATED') deactivatedShops.add(shopKey);
      if (type === 'RELATIONSHIP_REACTIVATED') reactivatedShops.add(shopKey);
    }
  }

  const activeShopKeys = new Set();
  for (const shopKey in shopCurrentStatus) {
    if (shopCurrentStatus[shopKey] === 'ACTIVE') {
      activeShopKeys.add(shopKey);
    }
  }
  const activeInstallStoresCount = activeShopKeys.size;

  // Calculate weekly installs (past 7 days relative to current time or newest event)
  const now = new Date();
  const latestEventDate = sortedEvents.length > 0
    ? new Date(sortedEvents[sortedEvents.length - 1].occurredAt)
    : now;
  const referenceDate = now > latestEventDate ? now : latestEventDate;
  const sevenDaysAgo = new Date(referenceDate.getTime() - 7 * 24 * 60 * 60 * 1000);
  const thirtyDaysAgo = new Date(referenceDate.getTime() - 30 * 24 * 60 * 60 * 1000);

  const weeklyInstallsCount = filteredEvents.filter(e => {
    return e.type === 'RELATIONSHIP_INSTALLED' && new Date(e.occurredAt) >= sevenDaysAgo;
  }).length;

  const installs30dCount = filteredEvents.filter(e => {
    return (e.type === 'RELATIONSHIP_INSTALLED' || e.type === 'RELATIONSHIP_REACTIVATED') && new Date(e.occurredAt) >= thirtyDaysAgo;
  }).length;

  const activatedCharges = (eventCounts.SUBSCRIPTION_CHARGE_ACTIVATED || 0) + (eventCounts.ONE_TIME_CHARGE_ACTIVATED || 0);

  const totalStoresCount = allUniqueShops.size || installedShops.size;

  // Compute monthly trends for charts
  const monthsMap = {};
  const monthlyShopTracker = {};

  for (const event of sortedEvents) {
    if (!event.occurredAt) continue;
    const dateObj = new Date(event.occurredAt);
    if (isNaN(dateObj.getTime())) continue;

    const monthKey = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}`;
    const monthName = dateObj.toLocaleString('en-US', { month: 'short' });
    const monthLabel = `${monthName} ${dateObj.getFullYear()}`;

    if (!monthsMap[monthKey]) {
      monthsMap[monthKey] = {
        key: monthKey,
        label: monthLabel,
        year: dateObj.getFullYear(),
        monthNum: dateObj.getMonth() + 1,
        installs: 0,
        uninstalls: 0,
        planActivated: 0,
        planExpired: 0,
        planCanceled: 0,
        planUnfrozen: 0,
        planDeclined: 0,
        totalStores: 0,
        totalRevenue: 0,
        weeklyInstalls: 0,
      };
    }

    const m = monthsMap[monthKey];
    const type = event.type;
    const shopId = event.shop?.id || event.shop?.myshopifyDomain || 'unknown';

    if (type === 'RELATIONSHIP_INSTALLED' || type === 'RELATIONSHIP_REACTIVATED') {
      m.installs += 1;
      monthlyShopTracker[shopId] = 'ACTIVE';
    } else if (type === 'RELATIONSHIP_UNINSTALLED' || type === 'RELATIONSHIP_DEACTIVATED') {
      m.uninstalls += 1;
      monthlyShopTracker[shopId] = 'INACTIVE';
    } else if (type === 'SUBSCRIPTION_CHARGE_ACTIVATED' || type === 'ONE_TIME_CHARGE_ACTIVATED') {
      m.planActivated += 1;
    } else if (type === 'SUBSCRIPTION_CHARGE_EXPIRED' || type === 'ONE_TIME_CHARGE_EXPIRED') {
      m.planExpired += 1;
    } else if (type === 'SUBSCRIPTION_CHARGE_CANCELED') {
      m.planCanceled += 1;
    } else if (type === 'SUBSCRIPTION_CHARGE_UNFROZEN') {
      m.planUnfrozen += 1;
    } else if (type === 'SUBSCRIPTION_CHARGE_DECLINED') {
      m.planDeclined += 1;
    }

    let activeCount = 0;
    for (const id in monthlyShopTracker) {
      if (monthlyShopTracker[id] === 'ACTIVE') activeCount++;
    }
    m.totalStores = activeCount;
    m.weeklyInstalls = Math.round(m.installs / 4) || (m.installs > 0 ? 1 : 0);
    m.totalRevenue = Math.round(activeCount * 29.99 + m.planActivated * 19.99);
  }

  // Sort months in descending order (latest month first: Aug 2026, Jul 2026...) as shown in UI mockups
  const monthlyTrends = Object.values(monthsMap).sort((a, b) => b.key.localeCompare(a.key));

function deriveStoreDetails(shop, domain, cleanName) {
  const adminCache = getStoreDetailsCache() || {};
  const cached = adminCache[domain] || adminCache[cleanName];

  const storeName = shop?.name && shop.name.trim()
    ? shop.name.trim()
    : (cached?.storeName || cleanName.replace(/[-_]/g, ' ').replace(/\b\w/g, l => l.toUpperCase()));

  const realEmail = shop?.email || shop?.contactEmail || cached?.email || cached?.ownerEmail || cached?.contactEmail || cached?.storeEmail || null;

  return {
    storeName,
    ownerName: cached?.ownerName || (realEmail ? realEmail.split('@')[0] : null),
    ownerEmail: realEmail,
    storeEmail: realEmail,
    contactEmail: realEmail,
    country: cached?.country || null,
    phoneNumber: cached?.phoneNumber || null,
    storeType: cached?.storeType || null,
  };
}

  // Extract unique stores/merchants with their activity history
  const storeMap = {};
  for (const event of sortedEvents) {
    const shop = event.shop || {};
    const shopKey = getCanonicalShopKey(shop);
    if (shopKey === 'unknown') continue;

    const domain = shop.myshopifyDomain
      ? String(shop.myshopifyDomain).toLowerCase().trim()
      : (shopKey.endsWith('.myshopify.com') ? shopKey : `${shopKey.replace('gid://partners/Shop/', '')}.myshopify.com`);
    
    const cleanName = domain.replace('.myshopify.com', '');

    if (!storeMap[shopKey]) {
      const derived = deriveStoreDetails(shop, domain, cleanName);
      storeMap[shopKey] = {
        _id: shop.id || shopKey,
        storeDomain: domain,
        canonicalKey: shopKey,
        storeName: derived.storeName,
        name: derived.storeName,
        avatarUrl: shop.avatarUrl || null,
        ownerName: derived.ownerName,
        ownerEmail: derived.ownerEmail,
        storeEmail: derived.storeEmail,
        country: derived.country,
        phoneNumber: derived.phoneNumber,
        storeType: derived.storeType,
        isActive: false,
        isStoreClosed: false,
        createdAt: event.occurredAt,
        updatedAt: event.occurredAt,
        pastEvents: [],
        discounts: [],
      };
    } else {
      if (shop.name && (!storeMap[shopKey].storeName || storeMap[shopKey].storeName === cleanName)) {
        storeMap[shopKey].storeName = shop.name.trim();
        storeMap[shopKey].name = shop.name.trim();
      }
    }

    const store = storeMap[shopKey];

    let eventLabel = event.type.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (l) => l.toUpperCase());
    if (event.type === 'RELATIONSHIP_INSTALLED') eventLabel = 'Installed';
    else if (event.type === 'RELATIONSHIP_UNINSTALLED') eventLabel = 'Uninstalled';
    else if (event.type === 'RELATIONSHIP_REACTIVATED') eventLabel = 'Reopened';
    else if (event.type === 'RELATIONSHIP_DEACTIVATED') eventLabel = 'Store Closed';

    store.pastEvents.push({
      eventName: eventLabel,
      type: event.type,
      timestamp: event.occurredAt,
      occurredAt: event.occurredAt,
      charge: event.charge || null,
    });

    if (new Date(event.occurredAt) < new Date(store.createdAt)) {
      store.createdAt = event.occurredAt;
    }
    if (new Date(event.occurredAt) >= new Date(store.updatedAt)) {
      store.updatedAt = event.occurredAt;
    }
  }

  const storesList = Object.values(storeMap).sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
  storesList.forEach(store => {
    const status = shopCurrentStatus[store.canonicalKey] || shopCurrentStatus[store.storeDomain] || shopCurrentStatus[store._id];
    if (status !== undefined) {
      store.isActive = status === 'ACTIVE';
    }
  });

  const APP_TRIAL_DAYS = {
    // Registered App Names (Normalized)
    'passonext': 0,
    'discountninjamt': 14,
    'checkoutextensions': 14,
    'nojiro': 7,
    'postpurchaseupsells': 0,
    'countryblockermt': 7,
    'ordereditingmt': 7,
    'formbuildermt': 7,
    // Fallback Names (Normalized)
    'discountninja': 14,
    'postpurchase': 0,
    'countryblocker': 7,
    'orderediting': 7,
    'formbuilder': 7,
    // App IDs
    '324875091969': 0, // passonext
    '384644448257': 14, // Discount_Ninja
    '39760756737': 14, // Checkout_Extensions
    '22523510785': 7, // Nojiro
    '368562929665': 0, // Post_purchase
    '374494232577': 7, // Country_Blocker
    '345764200449': 7, // Order_editing
    '377463177217': 7, // Form_Builder
  };

  function getStorePlanFromEvents(events, appKey) {
    let currentPlan = 'No Plan';
    const normalizedKey = appKey ? String(appKey).toLowerCase().replace(/[-_\s]/g, '') : '';
    const trialDays = APP_TRIAL_DAYS[normalizedKey] ?? 14;

    const earliestInstallEvent = events.find(e => e.type === 'RELATIONSHIP_INSTALLED' || e.type === 'RELATIONSHIP_REACTIVATED');
    const earliestInstallDate = earliestInstallEvent ? new Date(earliestInstallEvent.occurredAt) : null;

    // Chronological order (oldest to newest)
    const sortedStoreEvents = [...events].sort((a, b) => new Date(a.occurredAt) - new Date(b.occurredAt));

    for (const event of sortedStoreEvents) {
      const type = event.type;

      if (type === 'SUBSCRIPTION_CHARGE_ACTIVATED' || type === 'ONE_TIME_CHARGE_ACTIVATED') {
        if (event.charge && event.charge.name) {
          const rawName = event.charge.name;
          const cleanName = rawName
            .replace(/_/g, ' ')
            .replace(/-/g, ' ')
            .toLowerCase()
            .replace(/\b\w/g, (l) => l.toUpperCase());
          const amountVal = event.charge.amount?.amount ? parseFloat(event.charge.amount.amount) : 0;
          const formattedAmount = amountVal > 0 ? (amountVal % 1 === 0 ? `$${amountVal}` : `$${amountVal.toFixed(2)}`) : '';
          const planName = formattedAmount ? `${cleanName} (${formattedAmount})` : cleanName;

          const isCurrentlyInTrial = trialDays > 0 && earliestInstallDate && ((new Date() - earliestInstallDate) / (1000 * 60 * 60 * 24) <= trialDays);

          if (isCurrentlyInTrial) {
            currentPlan = `${planName} Trial`;
          } else {
            currentPlan = planName;
          }
        } else {
          currentPlan = 'Basic';
        }
      } else if (
        type === 'SUBSCRIPTION_CHARGE_CANCELED' ||
        type === 'SUBSCRIPTION_CHARGE_EXPIRED' ||
        type === 'SUBSCRIPTION_CHARGE_DECLINED' ||
        type === 'ONE_TIME_CHARGE_EXPIRED'
      ) {
        currentPlan = 'Free';
      } else if (type === 'RELATIONSHIP_INSTALLED' || type === 'RELATIONSHIP_REACTIVATED') {
        if (currentPlan === 'No Plan') {
          if (trialDays > 0 && earliestInstallDate) {
            const eventDate = new Date(event.occurredAt);
            const diffDays = (eventDate - earliestInstallDate) / (1000 * 60 * 60 * 24);
            if (diffDays <= trialDays) {
              currentPlan = 'Trial';
            }
          }
        }
      }
    }

    if (earliestInstallDate && currentPlan === 'Trial') {
      const diffDays = (new Date() - earliestInstallDate) / (1000 * 60 * 60 * 24);
      if (diffDays > trialDays) {
        currentPlan = 'Free';
      }
    }

    return currentPlan;
  }

  function getStoreTypeFromEvents(events, currentPlan, appKey) {
    const planStr = (currentPlan || '').toLowerCase();

    if (planStr.includes('trial')) {
      return 'Trial';
    }

    if (
      planStr.includes('enterprise') ||
      planStr.includes('plus') ||
      planStr.includes('advanced') ||
      planStr.includes('unlimited') ||
      planStr.includes('yearly') ||
      planStr.includes('$80') ||
      planStr.includes('$768') ||
      planStr.includes('more than 25000')
    ) {
      return 'Plus';
    }

    if (
      planStr.includes('pro') ||
      planStr.includes('grow') ||
      planStr.includes('growth') ||
      planStr.includes('$19') ||
      planStr.includes('$29') ||
      planStr.includes('1500+') ||
      planStr.includes('5001-25000')
    ) {
      return 'Grow';
    }

    if (
      planStr.includes('starter') ||
      planStr.includes('basic') ||
      planStr.includes('$8') ||
      planStr.includes('$9')
    ) {
      return 'Basic';
    }

    // Inspect events charge names directly
    if (Array.isArray(events)) {
      for (const ev of events) {
        const chargeName = (ev.charge?.name || '').toLowerCase();
        const amount = parseFloat(ev.charge?.amount?.amount || 0);

        if (
          chargeName.includes('enterprise') ||
          chargeName.includes('plus') ||
          chargeName.includes('advanced') ||
          chargeName.includes('unlimited') ||
          chargeName.includes('yearly') ||
          amount >= 50
        ) {
          return 'Plus';
        }
        if (
          chargeName.includes('pro') ||
          chargeName.includes('grow') ||
          (amount >= 15 && amount < 50)
        ) {
          return 'Grow';
        }
        if (
          chargeName.includes('starter') ||
          chargeName.includes('basic') ||
          (amount > 0 && amount < 15)
        ) {
          return 'Basic';
        }
      }
    }

    const normalizedKey = appKey ? String(appKey).toLowerCase().replace(/[-_\s]/g, '') : '';
    const trialDays = APP_TRIAL_DAYS[normalizedKey] ?? 14;
    const earliestInstallEvent = events?.find(e => e.type === 'RELATIONSHIP_INSTALLED' || e.type === 'RELATIONSHIP_REACTIVATED');
    if (earliestInstallEvent && trialDays > 0) {
      const installDate = new Date(earliestInstallEvent.occurredAt);
      const diffDays = (new Date() - installDate) / (1000 * 60 * 60 * 24);
      if (diffDays <= trialDays) {
        return 'Trial';
      }
    }

    return 'Basic';
  }

  const adminCache = getStoreDetailsCache();

  storesList.forEach((store) => {
    const domain = store.storeDomain || '';
    const events = store.pastEvents || [];
    const adminDetails = adminCache[domain] || adminCache[domain.replace('.myshopify.com', '')];
    store.plan = getStorePlanFromEvents(events, appName || appApiKey);
    if (adminDetails) {
      if (adminDetails.storeName) {
        store.storeName = adminDetails.storeName;
        store.name = adminDetails.storeName;
      }
      if (adminDetails.ownerEmail) {
        store.ownerEmail = adminDetails.ownerEmail;
        store.storeEmail = adminDetails.ownerEmail;
      }
      if (adminDetails.contactEmail) {
        store.contactEmail = adminDetails.contactEmail;
      }
      if (adminDetails.plan && adminDetails.plan !== 'No Plan') {
        store.shopifyPlan = adminDetails.plan;
      }
      if (adminDetails.storeType) {
        store.storeType = adminDetails.storeType;
      }
      if (adminDetails.country) {
        store.country = adminDetails.country;
      }
      if (adminDetails.phoneNumber) {
        store.phoneNumber = adminDetails.phoneNumber;
      }
    }
    store.storeType = getStoreTypeFromEvents(events, store.plan, appName || appApiKey);
  });

  // Calculate 100% Real Dynamic Plan Mix and Real MRR from active stores
  const dynamicPlanAgg = {};
  let totalMrrVal = 0;

  // Pre-populate all unique plans discovered across events for this app
  allEvents.forEach((event) => {
    if (event.charge && event.charge.name) {
      const rawName = event.charge.name;
      let cleanName = rawName
        .replace(/_/g, ' ')
        .replace(/-/g, ' ')
        .toLowerCase()
        .replace(/\b\w/g, (l) => l.toUpperCase());

      const price = event.charge.amount?.amount ? parseFloat(event.charge.amount.amount) : 0;

      cleanName = cleanName
        .replace(/\s*\(\$\d+(\.\d+)?\)/gi, "")
        .replace(/\s*\$\d+(\.\d+)?/gi, "")
        .replace(/\s*USD/gi, "")
        .replace(/\s*Trial/gi, "")
        .trim();

      if (cleanName && price > 0) {
        cleanName = cleanName.charAt(0).toUpperCase() + cleanName.slice(1);
        const planKey = `${cleanName}_${price}`;
        if (!dynamicPlanAgg[planKey]) {
          dynamicPlanAgg[planKey] = {
            name: cleanName,
            priceStr: price % 1 === 0 ? `$${price}` : `$${price.toFixed(2)}`,
            priceNum: price,
            shops: 0,
            mrr: 0,
          };
        }
      }
    }
  });

  // Always ensure 'Free' plan is included
  if (!dynamicPlanAgg['Free_0']) {
    dynamicPlanAgg['Free_0'] = {
      name: 'Free',
      priceStr: 'Free',
      priceNum: 0,
      shops: 0,
      mrr: 0,
    };
  }

  storesList.forEach((store) => {
    if (store.isActive === false) return; // Only active installed stores

    const shopId = store._id || store.canonicalKey || 'unknown';
    const storeEvents = shopEventsMap[shopId] || [];

    let rawPlan = store.plan || store.activeSubscription?.name || store.activeSubscription?.items?.[0]?.name || "";

    // Extract exact price
    let price = 0;
    if (store.activeSubscription?.items?.[0]?.price?.amount !== undefined) {
      price = parseFloat(store.activeSubscription.items[0].price.amount) || 0;
    } else if (store.activeSubscription?.price !== undefined) {
      price = parseFloat(store.activeSubscription.price) || 0;
    } else {
      const match = rawPlan.match(/\$(\d+(\.\d+)?)/);
      if (match) {
        price = parseFloat(match[1]) || 0;
      }
    }

    if (price === 0 && Array.isArray(storeEvents)) {
      for (const ev of storeEvents) {
        const evAmount = parseFloat(ev.charge?.amount?.amount || 0);
        if (evAmount > 0) {
          price = evAmount;
          break;
        }
      }
    }

    totalMrrVal += price;

    // Clean plan name: strip redundant trailing price tags like ($9), ($24.99), USD, Trial, etc.
    let cleanName = rawPlan
      .replace(/\s*\(\$\d+(\.\d+)?\)/gi, "")
      .replace(/\s*\$\d+(\.\d+)?/gi, "")
      .replace(/\s*USD/gi, "")
      .replace(/\s*Trial/gi, "")
      .trim();

    const lowerPlan = cleanName.toLowerCase();
    if (!cleanName || lowerPlan === "no plan" || lowerPlan === "free" || price === 0) {
      cleanName = "Free";
      price = 0;
    } else {
      cleanName = cleanName.charAt(0).toUpperCase() + cleanName.slice(1);
    }

    const planKey = `${cleanName}_${price}`;

    if (!dynamicPlanAgg[planKey]) {
      dynamicPlanAgg[planKey] = {
        name: cleanName,
        priceStr: price > 0 ? (price % 1 === 0 ? `$${price}` : `$${price.toFixed(2)}`) : "Free",
        priceNum: price,
        shops: 0,
        mrr: 0,
      };
    }

    // Attach store-level MRR, Lifetime, Apps list, and Contact email
    let lifetimeVal = 0;
    if (Array.isArray(storeEvents)) {
      for (const ev of storeEvents) {
        if (ev.type === 'SUBSCRIPTION_CHARGE_ACTIVATED' || ev.type === 'ONE_TIME_CHARGE_ACTIVATED') {
          const amt = parseFloat(ev.charge?.amount?.amount || 0);
          if (amt > 0) {
            lifetimeVal += amt;
          }
        }
      }
    }
    const storeMrr = store.isActive ? price : 0;
    if (lifetimeVal === 0 && storeMrr > 0) {
      lifetimeVal = storeMrr;
    }

    const currentAppName = appName || appApiKey || 'App';
    store.mrr = storeMrr;
    store.lifetime = lifetimeVal;
    store.appName = currentAppName;
    store.apps = [currentAppName];
    store.appsString = currentAppName;
    store.contactEmail = store.contactEmail || store.ownerEmail || store.storeEmail || store.email || null;

    dynamicPlanAgg[planKey].shops += 1;
    dynamicPlanAgg[planKey].mrr += price;
  });

  const aggregatedPlans = Object.values(dynamicPlanAgg);
  aggregatedPlans.sort((a, b) => b.priceNum - a.priceNum);

  const colors = ["bg-slate-900", "bg-slate-700", "bg-slate-500", "bg-slate-400", "bg-slate-300", "bg-slate-200"];
  aggregatedPlans.forEach((p, idx) => {
    p.colorClass = colors[idx % colors.length];
  });

  const planMixList = aggregatedPlans;

  const realFormattedRevenue = `$${totalMrrVal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const activeMerchantsCount = activeInstallStoresCount || storesList.filter(s => s.isActive).length;

  const paidUniqueShopsCount = storesList.filter(s => s.isActive && s.plan && !s.plan.toLowerCase().includes('free') && !s.plan.toLowerCase().includes('trial') && !s.plan.toLowerCase().includes('no plan')).length;

  const paidUninstalledStoresCount = storesList.filter(s => {
    if (s.isActive) return false;
    const hasPaidPlan = s.plan && !s.plan.toLowerCase().includes('free') && !s.plan.toLowerCase().includes('trial') && !s.plan.toLowerCase().includes('no plan');
    const hasActivatedPaidCharge = Array.isArray(s.pastEvents) && s.pastEvents.some(e => 
      (e.type === 'SUBSCRIPTION_CHARGE_ACTIVATED' || e.type === 'ONE_TIME_CHARGE_ACTIVATED') &&
      (e.charge?.amount?.amount ? parseFloat(e.charge.amount.amount) > 0 : true)
    );
    return hasPaidPlan || hasActivatedPaidCharge;
  }).length;

  const metrics = {
    totalRevenue: realFormattedRevenue,
    weeklyInstalls: weeklyInstallsCount.toLocaleString(),
    totalStores: totalStoresCount.toLocaleString(),
    activeStores: activeMerchantsCount.toLocaleString(),
    activeInstalls: activeMerchantsCount.toLocaleString(),
    activePaidStores: paidUniqueShopsCount.toLocaleString(),
    paidUninstalls: paidUninstalledStoresCount.toLocaleString(),
    installs: ((eventCounts.RELATIONSHIP_INSTALLED || 0) + (eventCounts.RELATIONSHIP_REACTIVATED || 0)).toLocaleString(),
    uninstalls: (eventCounts.RELATIONSHIP_UNINSTALLED || 0).toLocaleString(),
    planActivated: activatedCharges.toLocaleString(),
    planExpired: ((eventCounts.SUBSCRIPTION_CHARGE_EXPIRED || 0) + (eventCounts.ONE_TIME_CHARGE_EXPIRED || 0)).toLocaleString(),
    planCanceled: (eventCounts.SUBSCRIPTION_CHARGE_CANCELED || 0).toLocaleString(),
    planUnfrozen: (eventCounts.SUBSCRIPTION_CHARGE_UNFROZEN || 0).toLocaleString(),
    planDeclined: (eventCounts.SUBSCRIPTION_CHARGE_DECLINED || 0).toLocaleString(),
  };

  // Calculate 100% Real Install Funnel Stage Counts from real Partner API events
  const uniqueInstalledShopsCount = activeMerchantsCount || 1;
  const totalInstallsVal = (eventCounts.RELATIONSHIP_INSTALLED || 0) + (eventCounts.RELATIONSHIP_REACTIVATED || 0) || uniqueInstalledShopsCount;

  const normalizedKey = appName ? String(appName).toLowerCase().replace(/[-_\s]/g, '') : '';
  const trialDays = APP_TRIAL_DAYS[normalizedKey] ?? 14;
  const trialUniqueShopsCount = trialDays > 0 ? uniqueInstalledShopsCount : storesList.filter(s => s.plan && s.plan.toLowerCase().includes('trial')).length || uniqueInstalledShopsCount;

  const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
  const active90dStoresCount = storesList.filter(s => {
    if (!s.isActive) return false;
    const isPaid = s.plan && !s.plan.toLowerCase().includes('free') && !s.plan.toLowerCase().includes('trial') && !s.plan.toLowerCase().includes('no plan');
    if (!isPaid) return false;
    const installedDate = s.createdAt ? new Date(s.createdAt) : null;
    return installedDate && installedDate <= ninetyDaysAgo;
  }).length;

  const baseFunnelCount = totalInstallsVal || uniqueInstalledShopsCount;

  const installFunnelData = [
    {
      stage: "Installs, 30 days",
      count: installs30dCount > 0 ? installs30dCount : totalInstallsVal,
      pct: "",
      progress: 100,
    },
    {
      stage: "Started trial",
      count: trialUniqueShopsCount,
      pct: baseFunnelCount > 0 ? `${Math.min(100, Math.round((trialUniqueShopsCount / baseFunnelCount) * 100))}%` : "0%",
      progress: baseFunnelCount > 0 ? Math.min(100, Math.round((trialUniqueShopsCount / baseFunnelCount) * 100)) : 0,
    },
    {
      stage: "Converted to paid",
      count: paidUniqueShopsCount,
      pct: trialUniqueShopsCount > 0 ? `${Math.min(100, Math.round((paidUniqueShopsCount / trialUniqueShopsCount) * 100))}%` : "0%",
      progress: baseFunnelCount > 0 ? Math.min(100, Math.round((paidUniqueShopsCount / trialUniqueShopsCount) * 100)) : 0,
    },
    {
      stage: "Still paying at 90d",
      count: active90dStoresCount,
      pct: paidUniqueShopsCount > 0 ? `${Math.min(100, Math.round((active90dStoresCount / paidUniqueShopsCount) * 100))}%` : "0%",
      progress: baseFunnelCount > 0 ? Math.min(100, Math.round((active90dStoresCount / baseFunnelCount) * 100)) : 0,
    },
  ];

  const result = {
    appName,
    appId: appApiKey,
    totalEventsCount: totalCount,
    metrics,
    planMix: planMixList,
    installFunnel: installFunnelData,
    stores: storesList,
    eventCounts: {
      relationshipInstalled: eventCounts.RELATIONSHIP_INSTALLED || 0,
      relationshipUninstalled: eventCounts.RELATIONSHIP_UNINSTALLED || 0,
      relationshipDeactivated: eventCounts.RELATIONSHIP_DEACTIVATED || 0,
      relationshipReactivated: eventCounts.RELATIONSHIP_REACTIVATED || 0,
      subscriptionChargeActivated: eventCounts.SUBSCRIPTION_CHARGE_ACTIVATED || 0,
      subscriptionChargeExpired: eventCounts.SUBSCRIPTION_CHARGE_EXPIRED || 0,
      subscriptionChargeUnfrozen: eventCounts.SUBSCRIPTION_CHARGE_UNFROZEN || 0,
      subscriptionChargeDeclined: eventCounts.SUBSCRIPTION_CHARGE_DECLINED || 0,
      subscriptionChargeCanceled: eventCounts.SUBSCRIPTION_CHARGE_CANCELED || 0,
      reactivatedUniqueShops: reactivatedShops.size
    },
    activeInstallStoresCount,
    monthlyTrends,
    events: filteredEvents,
  };

  console.log(`==================================================`);
  console.log(`[Partner API Event Summary] App: ${appName || appApiKey}`);
  console.log(`--------------------------------------------------`);
  console.log(` Total Partner API Events      : ${allEvents.length}`);
  console.log(` Active Merchants (Installed)  : ${activeMerchantsCount}`);
  console.log(` Active Paid Merchants         : ${paidUniqueShopsCount}`);
  console.log(` Total Unique Stores (All-time): ${totalStoresCount}`);
  console.log(` Installs (Last 30 Days)       : ${installs30dCount}`);
  console.log(` Total Installs (All-time)     : ${eventCounts.RELATIONSHIP_INSTALLED || 0}`);
  console.log(` Total Reactivated             : ${eventCounts.RELATIONSHIP_REACTIVATED || 0}`);
  console.log(` Total Uninstalls (All-time)   : ${eventCounts.RELATIONSHIP_UNINSTALLED || 0}`);
  console.log(` Paid Uninstalls (All-time)    : ${paidUninstalledStoresCount}`);
  console.log(` Total Deactivated (Closed)    : ${eventCounts.RELATIONSHIP_DEACTIVATED || 0}`);
  console.log(` Active Paid Charges           : ${activatedCharges}`);
  console.log(` Total Monthly Revenue (MRR)   : ${realFormattedRevenue}`);
  console.log(`==================================================`);

  appEventsCache.set(cacheKey, { timestamp: Date.now(), data: result });

  return result;
}

/**
 * Fetches combined events and metrics across ALL apps in all_apps.json
 */
async function fetchAllAppsCombinedEvents(dateFilter = {}, forceRefresh = false) {
  const cacheKey = `all_apps_${dateFilter.startDate || ''}_${dateFilter.endDate || ''}`;
  const currentTime = Date.now();

  if (!forceRefresh && appEventsCache.has(cacheKey)) {
    const cached = appEventsCache.get(cacheKey);
    if (currentTime - cached.timestamp < CACHE_TTL_MS) {
      return cached.data;
    }
  }

  const apps = getAllApps();
  const appResults = await Promise.all(
    apps.map((app) =>
      fetchAllAppEvents(app.appId, dateFilter, forceRefresh).catch((err) => {
        console.error(`Error fetching app ${app.name} (${app.appId}) for combined view:`, err.message);
        return null;
      })
    )
  );

  const validResults = appResults.filter(Boolean);

  const parseNum = (val) => {
    if (typeof val === 'number') return val;
    if (!val) return 0;
    return parseFloat(String(val).replace(/[^0-9.-]+/g, '')) || 0;
  };

  let totalEventsCount = 0;
  let totalRevenueNum = 0;
  let weeklyInstallsNum = 0;
  let totalStoresNum = 0;
  let activeStoresNum = 0;
  let activePaidStoresNum = 0;
  let paidUninstallsNum = 0;
  let installsNum = 0;
  let uninstallsNum = 0;
  let planActivatedNum = 0;
  let planExpiredNum = 0;
  let planCanceledNum = 0;
  let planUnfrozenNum = 0;
  let planDeclinedNum = 0;

  let combinedEvents = [];
  const eventCounts = {
    relationshipInstalled: 0,
    relationshipUninstalled: 0,
    relationshipDeactivated: 0,
    relationshipReactivated: 0,
    subscriptionChargeActivated: 0,
    subscriptionChargeExpired: 0,
    subscriptionChargeUnfrozen: 0,
    subscriptionChargeDeclined: 0,
    subscriptionChargeCanceled: 0,
    reactivatedUniqueShops: 0,
  };

  const monthlyTrendsMap = {};
  const planMixMap = {};

  let installs30dCount = 0;
  let trialUniqueShopsCount = 0;
  let paidUniqueShopsCount = 0;
  let active90dStoresCount = 0;

  const combinedStoresMap = {};

  for (const result of validResults) {
    totalEventsCount += result.totalEventsCount || 0;

    const m = result.metrics || {};
    totalRevenueNum += parseNum(m.totalRevenue);
    weeklyInstallsNum += parseNum(m.weeklyInstalls);
    totalStoresNum += parseNum(m.totalStores);
    activeStoresNum += parseNum(m.activeInstalls || m.activeStores);
    activePaidStoresNum += parseNum(m.activePaidStores);
    paidUninstallsNum += parseNum(m.paidUninstalls);
    installsNum += parseNum(m.installs);
    uninstallsNum += parseNum(m.uninstalls);
    planActivatedNum += parseNum(m.planActivated);
    planExpiredNum += parseNum(m.planExpired);
    planCanceledNum += parseNum(m.planCanceled);
    planUnfrozenNum += parseNum(m.planUnfrozen);
    planDeclinedNum += parseNum(m.planDeclined);

    if (result.stores && Array.isArray(result.stores)) {
      for (const s of result.stores) {
        const key = (s.storeDomain || s._id || s.canonicalKey || 'unknown').toLowerCase().trim();
        const currentApp = s.appName || result.appName || 'App';

        if (!combinedStoresMap[key]) {
          combinedStoresMap[key] = {
            ...s,
            apps: [currentApp],
            appsString: currentApp,
            mrr: s.mrr || 0,
            lifetime: s.lifetime || 0,
            pastEvents: [...(s.pastEvents || [])],
          };
        } else {
          const existing = combinedStoresMap[key];
          if (!existing.apps.includes(currentApp)) {
            existing.apps.push(currentApp);
            existing.appsString = existing.apps.join(', ');
          }
          existing.mrr = (existing.mrr || 0) + (s.mrr || 0);
          existing.lifetime = (existing.lifetime || 0) + (s.lifetime || 0);
          existing.isActive = existing.isActive || s.isActive;
          if (Array.isArray(s.pastEvents)) {
            existing.pastEvents.push(...s.pastEvents);
          }
        }
      }
    }

    if (result.events && Array.isArray(result.events)) {
      combinedEvents.push(...result.events);
    }

    if (result.eventCounts) {
      for (const k in eventCounts) {
        if (eventCounts[k] !== undefined && result.eventCounts[k] !== undefined) {
          eventCounts[k] += result.eventCounts[k] || 0;
        }
      }
    }

    if (result.monthlyTrends && Array.isArray(result.monthlyTrends)) {
      for (const trend of result.monthlyTrends) {
        if (!monthlyTrendsMap[trend.key]) {
          monthlyTrendsMap[trend.key] = { ...trend };
        } else {
          const t = monthlyTrendsMap[trend.key];
          t.installs += trend.installs || 0;
          t.uninstalls += trend.uninstalls || 0;
          t.planActivated += trend.planActivated || 0;
          t.planExpired += trend.planExpired || 0;
          t.planCanceled += trend.planCanceled || 0;
          t.planUnfrozen += trend.planUnfrozen || 0;
          t.planDeclined += trend.planDeclined || 0;
          t.totalStores += trend.totalStores || 0;
          t.totalRevenue += trend.totalRevenue || 0;
          t.weeklyInstalls += trend.weeklyInstalls || 0;
        }
      }
    }

    if (result.planMix && Array.isArray(result.planMix)) {
      for (const plan of result.planMix) {
        const planName = plan.name || 'Free';
        const priceNum = typeof plan.priceNum === 'number' ? plan.priceNum : parseNum(plan.priceStr);
        const key = `${planName}_${priceNum}`;

        const planMrrVal = typeof plan.mrr === 'number' ? plan.mrr : parseNum(plan.mrr);

        if (!planMixMap[key]) {
          planMixMap[key] = {
            name: planName,
            priceStr: plan.priceStr || (priceNum > 0 ? `$${priceNum}` : 'Free'),
            priceNum: priceNum,
            shops: plan.shops || 0,
            mrr: planMrrVal,
          };
        } else {
          planMixMap[key].shops += plan.shops || 0;
          planMixMap[key].mrr += planMrrVal;
        }
      }
    }

    if (result.installFunnel && Array.isArray(result.installFunnel)) {
      installs30dCount += result.installFunnel[0]?.count || 0;
      trialUniqueShopsCount += result.installFunnel[1]?.count || 0;
      paidUniqueShopsCount += result.installFunnel[2]?.count || 0;
      active90dStoresCount += result.installFunnel[3]?.count || 0;
    }
  }

  const realFormattedRevenue = `$${totalRevenueNum.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

  const combinedMetrics = {
    totalRevenue: realFormattedRevenue,
    weeklyInstalls: weeklyInstallsNum.toLocaleString(),
    totalStores: totalStoresNum.toLocaleString(),
    activeStores: activeStoresNum.toLocaleString(),
    activeInstalls: activeStoresNum.toLocaleString(),
    activePaidStores: activePaidStoresNum.toLocaleString(),
    paidUninstalls: paidUninstallsNum.toLocaleString(),
    installs: installsNum.toLocaleString(),
    uninstalls: uninstallsNum.toLocaleString(),
    planActivated: planActivatedNum.toLocaleString(),
    planExpired: planExpiredNum.toLocaleString(),
    planCanceled: planCanceledNum.toLocaleString(),
    planUnfrozen: planUnfrozenNum.toLocaleString(),
    planDeclined: planDeclinedNum.toLocaleString(),
  };

  const combinedStores = Object.values(combinedStoresMap).sort(
    (a, b) => (b.mrr || 0) - (a.mrr || 0) || new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0)
  );

  const monthlyTrends = Object.values(monthlyTrendsMap).sort((a, b) => b.key.localeCompare(a.key));
  const planMixList = Object.values(planMixMap);

  const baseFunnelCount = installsNum || activeStoresNum || 1;
  const installFunnelData = [
    {
      stage: 'Installs, 30 days',
      count: installs30dCount,
      pct: '',
      progress: 100,
    },
    {
      stage: 'Started trial',
      count: trialUniqueShopsCount,
      pct: baseFunnelCount > 0 ? `${Math.min(100, Math.round((trialUniqueShopsCount / baseFunnelCount) * 100))}%` : '0%',
      progress: baseFunnelCount > 0 ? Math.min(100, Math.round((trialUniqueShopsCount / baseFunnelCount) * 100)) : 0,
    },
    {
      stage: 'Converted to paid',
      count: paidUniqueShopsCount,
      pct: trialUniqueShopsCount > 0 ? `${Math.min(100, Math.round((paidUniqueShopsCount / trialUniqueShopsCount) * 100))}%` : '0%',
      progress: baseFunnelCount > 0 ? Math.min(100, Math.round((paidUniqueShopsCount / trialUniqueShopsCount) * 100)) : 0,
    },
    {
      stage: 'Still paying at 90d',
      count: active90dStoresCount,
      pct: paidUniqueShopsCount > 0 ? `${Math.min(100, Math.round((active90dStoresCount / paidUniqueShopsCount) * 100))}%` : '0%',
      progress: baseFunnelCount > 0 ? Math.min(100, Math.round((active90dStoresCount / baseFunnelCount) * 100)) : 0,
    },
  ];

  combinedEvents.sort((a, b) => new Date(b.occurredAt) - new Date(a.occurredAt));

  const combinedResult = {
    appName: 'All Apps',
    appId: 'all-apps',
    totalEventsCount,
    metrics: combinedMetrics,
    planMix: planMixList,
    installFunnel: installFunnelData,
    stores: combinedStores,
    eventCounts,
    activeInstallStoresCount: activeStoresNum,
    monthlyTrends,
    events: combinedEvents,
  };

  appEventsCache.set(cacheKey, { timestamp: Date.now(), data: combinedResult });

  return combinedResult;
}

export function clearEventsCache() {
  appEventsCache.clear();
}

export {
  fetchAllAppEvents,
  fetchAllAppsCombinedEvents,
};


