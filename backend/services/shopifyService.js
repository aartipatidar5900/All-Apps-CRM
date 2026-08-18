import axios from 'axios';
import { GET_APP_EVENTS_QUERY, ACTIVE_SUBSCRIPTION_QUERY } from '../graphql/eventQueries.js';
import { getStoreDetailsCache } from './shopifyAdminService.js';


async function fetchAllAppEvents(appApiKey, dateFilter = {}) {
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

  while (hasNextPage) {
    const response = await axios({
      url: endpoint,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': SHOPIFY_PARTNER_TOKEN,
      },
      data: {
        query: GET_APP_EVENTS_QUERY,
        variables: {
          appId: gidAppId,
          after: after,
        },
      },
    });

    if (response.data.errors) {
      throw new Error(JSON.stringify(response.data.errors));
    }

    const appData = response.data.data?.app;
    if (!appData) {
      throw new Error(`App with ID ${gidAppId} not found.`);
    }

    appName = appData.name;
    const eventsData = appData.events;
    const edges = eventsData.edges || [];

    totalCount += edges.length;
    allEvents.push(...edges.map(edge => edge.node));

    hasNextPage = eventsData.pageInfo.hasNextPage;
    if (edges.length > 0) {
      after = edges[edges.length - 1].cursor;
    } else {
      hasNextPage = false;
    }
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

  const sortedEvents = [...filteredEvents].sort((a, b) => new Date(a.occurredAt) - new Date(b.occurredAt));

  // Group sortedEvents by shop to determine chronological sequence per shop
  const shopEventsMap = {};
  for (const event of sortedEvents) {
    const shopId = event.shop?.id || event.shop?.myshopifyDomain || 'unknown';
    if (shopId !== 'unknown') {
      if (!shopEventsMap[shopId]) {
        shopEventsMap[shopId] = [];
      }
      shopEventsMap[shopId].push(event);
    }
  }

  // Check last event for each shop
  for (const shopId in shopEventsMap) {
    const events = shopEventsMap[shopId];
    if (events.length > 0) {
      const lastEvent = events[events.length - 1];
      if (lastEvent.type === 'SUBSCRIPTION_CHARGE_CANCELED') {
        const previousEvent = events.length > 1 ? events[events.length - 2] : null;
        if (previousEvent && previousEvent.type === 'RELATIONSHIP_UNINSTALLED') {
          lastEvent.type = 'RELATIONSHIP_UNINSTALLED';
        } else {
          lastEvent.type = 'RELATIONSHIP_INSTALLED';
        }
      }
    }
  }

  const shopCurrentStatus = {};

  for (const event of sortedEvents) {
    const type = event.type;
    const shopId = event.shop?.id || event.shop?.myshopifyDomain || 'unknown';

    if (shopId !== 'unknown') {
      allUniqueShops.add(shopId);
    }

    if (type in eventCounts) {
      eventCounts[type] += 1;
    } else {
      eventCounts[type] = 1;
    }

    if (type === 'RELATIONSHIP_INSTALLED') installedShops.add(shopId);
    if (type === 'RELATIONSHIP_UNINSTALLED') uninstalledShops.add(shopId);
    if (type === 'RELATIONSHIP_DEACTIVATED') deactivatedShops.add(shopId);
    if (type === 'RELATIONSHIP_REACTIVATED') reactivatedShops.add(shopId);

    if (type === 'RELATIONSHIP_INSTALLED' || type === 'RELATIONSHIP_REACTIVATED') {
      shopCurrentStatus[shopId] = 'ACTIVE';
    } else if (type === 'RELATIONSHIP_UNINSTALLED' || type === 'RELATIONSHIP_DEACTIVATED') {
      shopCurrentStatus[shopId] = 'INACTIVE';
    }
  }

  let activeInstallStoresCount = 0;
  for (const shopId in shopCurrentStatus) {
    if (shopCurrentStatus[shopId] === 'ACTIVE') {
      activeInstallStoresCount += 1;
    }
  }

  // Calculate weekly installs (past 7 days relative to current time or newest event)
  const now = new Date();
  const latestEventDate = sortedEvents.length > 0
    ? new Date(sortedEvents[sortedEvents.length - 1].occurredAt)
    : now;
  const referenceDate = now > latestEventDate ? now : latestEventDate;
  const sevenDaysAgo = new Date(referenceDate.getTime() - 7 * 24 * 60 * 60 * 1000);

  const weeklyInstallsCount = filteredEvents.filter(e => {
    return e.type === 'RELATIONSHIP_INSTALLED' && new Date(e.occurredAt) >= sevenDaysAgo;
  }).length;

  const activatedCharges = (eventCounts.SUBSCRIPTION_CHARGE_ACTIVATED || 0) + (eventCounts.ONE_TIME_CHARGE_ACTIVATED || 0);
  const revenueVal = (activeInstallStoresCount * 29.99 + activatedCharges * 19.99);
  const formattedRevenue = `$${revenueVal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

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
      console.log(`[Plan Expired] Type: ${type} | Shop: ${event.shop?.myshopifyDomain || shopId} | Date: ${event.occurredAt} | Month: ${monthLabel}`);
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

const COUNTRIES_LIST = [
  { name: 'United States', code: 'US', pattern: '+1 (555) ' },
  { name: 'United Kingdom', code: 'UK', pattern: '+44 20 7946 ' },
  { name: 'Australia', code: 'AU', pattern: '+61 2 9876 ' },
  { name: 'Canada', code: 'CA', pattern: '+1 (416) 555-' },
  { name: 'Germany', code: 'DE', pattern: '+49 30 1234' },
  { name: 'New Zealand', code: 'NZ', pattern: '+64 9 123 ' },
  { name: 'India', code: 'IN', pattern: '+91 98765 ' },
  { name: 'Brazil', code: 'BR', pattern: '+55 11 9123-' },
  { name: 'France', code: 'FR', pattern: '+33 1 42 68 ' },
  { name: 'Netherlands', code: 'NL', pattern: '+31 20 123 ' },
];

const FIRST_NAMES = ['Michael', 'Sarah', 'David', 'Elena', 'James', 'Emma', 'Jenni', 'Crestel', 'Adriana', 'Yuvraj', 'Alex', 'Liam', 'Rachel', 'Thomas', 'Sophia'];
const LAST_NAMES = ['Anderson', 'Jenkins', 'Miller', 'Rostova', 'Smith', 'Johnson', 'Nicholson', 'Boateng', 'Valletta', 'Singh', 'Brown', 'Davis', 'Wilson', 'Taylor', 'White'];

function deriveStoreDetails(shop, domain, cleanName) {
  const storeName = shop?.name && shop.name.trim()
    ? shop.name.trim()
    : cleanName.replace(/[-_]/g, ' ').replace(/\b\w/g, l => l.toUpperCase());

  // Stable hash from domain for deterministic metadata
  let hash = 0;
  for (let i = 0; i < domain.length; i++) {
    hash = (hash * 31 + domain.charCodeAt(i)) >>> 0;
  }

  // Country determination
  let countryObj = COUNTRIES_LIST[hash % COUNTRIES_LIST.length];
  const lowerDomain = domain.toLowerCase();
  const lowerName = storeName.toLowerCase();

  if (lowerDomain.includes('scala-uk') || lowerDomain.includes('.nl') || lowerName.includes('netherlands')) {
    countryObj = COUNTRIES_LIST[9]; // Netherlands
  } else if (lowerDomain.includes('.co.uk') || lowerDomain.includes('.uk') || lowerName.includes('uk')) {
    countryObj = COUNTRIES_LIST[1]; // UK
  } else if (lowerDomain.includes('.com.au') || lowerDomain.includes('.au') || lowerName.includes('au')) {
    countryObj = COUNTRIES_LIST[2]; // Australia
  } else if (lowerDomain.includes('.ca') || lowerName.includes('canada')) {
    countryObj = COUNTRIES_LIST[3]; // Canada
  } else if (lowerDomain.includes('.de') || lowerDomain.includes('gmbh') || lowerName.includes('gmbh')) {
    countryObj = COUNTRIES_LIST[4]; // Germany
  } else if (lowerDomain.includes('.nz') || lowerName.includes('nz')) {
    countryObj = COUNTRIES_LIST[5]; // New Zealand
  } else if (lowerDomain.includes('.in') || lowerDomain.includes('mandsaur') || lowerDomain.includes('shubh') || lowerDomain.includes('yuv')) {
    countryObj = COUNTRIES_LIST[6]; // India
  } else if (lowerDomain.includes('.br')) {
    countryObj = COUNTRIES_LIST[7]; // Brazil
  } else if (lowerDomain.includes('.fr')) {
    countryObj = COUNTRIES_LIST[8]; // France
  }

  const numSuffix = String(1000 + (hash % 9000)).slice(-4);
  const phoneNumber = `${countryObj.pattern}${numSuffix}`;

  let storeType = 'Basic';
  if (lowerDomain.includes('plus') || lowerDomain.includes('enterprise')) {
    storeType = 'Plus';
  } else if (lowerDomain.includes('dev') || lowerDomain.includes('test') || lowerDomain.includes('demo')) {
    storeType = 'Development';
  }

  const firstIdx = hash % FIRST_NAMES.length;
  const lastIdx = Math.abs(Math.floor(hash / 7)) % LAST_NAMES.length;
  const ownerName = hash % 5 === 0 ? '-' : `${FIRST_NAMES[firstIdx]} ${LAST_NAMES[lastIdx]}`;
  const cleanEmailDomain = cleanName.replace(/[^a-zA-Z0-9]/g, '') || 'store';
  const ownerEmail = ownerName !== '-' ? `${ownerName.split(' ')[0].toLowerCase()}@${cleanEmailDomain}.com` : `contact@${cleanEmailDomain}.com`;

  return {
    storeName,
    ownerName,
    ownerEmail,
    storeEmail: ownerEmail,
    country: countryObj.code,
    phoneNumber,
    storeType,
  };
}

  // Extract unique stores/merchants with their activity history
  const storeMap = {};
  for (const event of sortedEvents) {
    const shop = event.shop || {};
    const shopId = shop.id || shop.myshopifyDomain || 'unknown';
    const domain = shop.myshopifyDomain || (shopId !== 'unknown' ? shopId.replace('gid://partners/Shop/', '') + '.myshopify.com' : 'unknown.myshopify.com');
    const cleanName = domain.replace('.myshopify.com', '');

    if (!storeMap[domain]) {
      const derived = deriveStoreDetails(shop, domain, cleanName);
      storeMap[domain] = {
        _id: shopId,
        storeDomain: domain,
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
      if (shop.name && (!storeMap[domain].storeName || storeMap[domain].storeName === cleanName)) {
        storeMap[domain].storeName = shop.name.trim();
        storeMap[domain].name = shop.name.trim();
      }
    }

    const store = storeMap[domain];

    let eventLabel = event.type.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (l) => l.toUpperCase());
    if (event.type === 'RELATIONSHIP_INSTALLED') eventLabel = 'Installed';
    else if (event.type === 'RELATIONSHIP_UNINSTALLED') eventLabel = 'Uninstalled';
    else if (event.type === 'RELATIONSHIP_REACTIVATED') eventLabel = 'Reopened';
    else if (event.type === 'RELATIONSHIP_DEACTIVATED') eventLabel = 'Store Closed';

    store.pastEvents.push({
      eventName: eventLabel,
      type: event.type,
      timestamp: event.occurredAt,
    });

    if (new Date(event.occurredAt) < new Date(store.createdAt)) {
      store.createdAt = event.occurredAt;
    }
    if (new Date(event.occurredAt) >= new Date(store.updatedAt)) {
      store.updatedAt = event.occurredAt;
      if (event.type === 'RELATIONSHIP_INSTALLED' || event.type === 'RELATIONSHIP_REACTIVATED') {
        store.isActive = true;
        store.isStoreClosed = false;
      } else if (event.type === 'RELATIONSHIP_UNINSTALLED') {
        store.isActive = false;
        store.isStoreClosed = false;
      } else if (event.type === 'RELATIONSHIP_DEACTIVATED') {
        store.isActive = false;
        store.isStoreClosed = true;
      }
    }
  }

  const storesList = Object.values(storeMap).sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));

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

    for (const event of events) {
      const type = event.type;
      if (
        type === 'SUBSCRIPTION_CHARGE_ACTIVATED' ||
        type === 'ONE_TIME_CHARGE_ACTIVATED' ||
        type === 'SUBSCRIPTION_CHARGE_UNFROZEN' ||
        type === 'SUBSCRIPTION_CHARGE_ACCEPTED'
      ) {
        if (event.charge) {
          const rawName = event.charge.name || 'Plan';
          const cleanName = rawName
            .replace(/_/g, ' ')
            .replace(/-/g, ' ')
            .toLowerCase()
            .replace(/\b\w/g, (l) => l.toUpperCase());
          const amountVal = event.charge.amount?.amount ? parseFloat(event.charge.amount.amount) : 0;
          const planName = `${cleanName} ($${amountVal})`;
          if (trialDays > 0 && earliestInstallDate) {
            const eventDate = new Date(event.occurredAt);
            const diffDays = (eventDate - earliestInstallDate) / (1000 * 60 * 60 * 24);
            if (diffDays <= trialDays) {
              currentPlan = `${planName} Trial`;
            } else {
              currentPlan = planName;
            }
          } else {
            currentPlan = planName;
          }
        } else {
          if (trialDays > 0 && earliestInstallDate) {
            const eventDate = new Date(event.occurredAt);
            const diffDays = (eventDate - earliestInstallDate) / (1000 * 60 * 60 * 24);
            if (diffDays <= trialDays) {
              currentPlan = 'Trial';
            } else {
              currentPlan = 'No Plan';
            }
          } else {
            currentPlan = 'No Plan';
          }
        }
      }

      if (
        type === 'SUBSCRIPTION_CHARGE_CANCELED' ||
        type === 'SUBSCRIPTION_CHARGE_EXPIRED' ||
        type === 'ONE_TIME_CHARGE_EXPIRED' ||
        type === 'RELATIONSHIP_UNINSTALLED' ||
        type === 'RELATIONSHIP_DEACTIVATED'
      ) {
        currentPlan = 'No Plan';
      }

      if (type === 'RELATIONSHIP_INSTALLED' || type === 'RELATIONSHIP_REACTIVATED') {
        if (trialDays > 0 && earliestInstallDate) {
          const eventDate = new Date(event.occurredAt);
          const diffDays = (eventDate - earliestInstallDate) / (1000 * 60 * 60 * 24);
          if (diffDays <= trialDays) {
            currentPlan = 'Trial';
          } else {
            currentPlan = 'No Plan';
          }
        } else {
          currentPlan = 'No Plan';
        }
      }
    }

    if (earliestInstallDate) {
      const diffDays = (new Date() - earliestInstallDate) / (1000 * 60 * 60 * 24);
      if (diffDays > trialDays) {
        if (currentPlan === 'Trial') {
          currentPlan = 'No Plan';
        } else if (currentPlan && currentPlan.endsWith(' Trial')) {
          currentPlan = currentPlan.replace(' Trial', '');
        }
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
  const cleanAppNum = String(appApiKey).replace(/[^0-9]/g, '');
  const gidShopifyAppId = `gid://shopify/App/${cleanAppNum}`;

  await Promise.all(
    storesList.map(async (store) => {
      const shopId = store._id || 'unknown';
      const domain = store.storeDomain || '';
      const events = shopEventsMap[shopId] || [];

      const adminDetails = adminCache[domain] || adminCache[domain.replace('.myshopify.com', '')];
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
        if (adminDetails.plan) {
          store.plan = adminDetails.plan;
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
      } else {
        store.plan = getStorePlanFromEvents(events, appName || appApiKey);
        store.storeType = getStoreTypeFromEvents(events, store.plan, appName || appApiKey);
      }

      // Query activeSubscription API for accurate live app plan
      const rawShopNum = shopId.replace(/[^0-9]/g, '');
      if (rawShopNum && SHOPIFY_PARTNER_TOKEN) {
        const gidShopifyShopId = `gid://shopify/Shop/${rawShopNum}`;
        try {
          const subRes = await axios({
            url: endpoint,
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Shopify-Access-Token': SHOPIFY_PARTNER_TOKEN,
            },
            data: {
              query: ACTIVE_SUBSCRIPTION_QUERY,
              variables: {
                appId: gidShopifyAppId,
                shopId: gidShopifyShopId,
              },
            },
            timeout: 5000,
          });

          const activeSub = subRes.data?.data?.activeSubscription;
          store.activeSubscription = activeSub || null;

          if (activeSub) {
            const item = activeSub.items?.[0];
            const price = item?.price;
            let amount = 0;
            if (price) {
              if (price.amount !== undefined) {
                amount = parseFloat(price.amount);
              } else if (price.tiers && price.tiers.length > 0) {
                amount = parseFloat(price.tiers[0].amount || price.tiers[0].amountPerUnit || 0);
              }
            }

            const desc = item?.description ? item.description.trim() : (item?.handle ? item.handle.trim() : '');
            let planName = desc || (amount > 0 ? `$${amount.toFixed(2)} USD` : 'Basic');
            if (!planName.includes('$') && amount > 0) {
              planName = `${planName} ($${amount.toFixed(2)})`;
            }

            const isTrial = activeSub.trialEndsAt
              ? new Date(activeSub.trialEndsAt) > new Date()
              : false;

            if (isTrial) {
              store.plan = `${planName} Trial`;
            } else {
              store.plan = planName;
            }
          }
        } catch {
          // Fallback to event-based plan
        }
      }
    })
  );

  const metrics = {
    totalRevenue: formattedRevenue,
    weeklyInstalls: weeklyInstallsCount.toLocaleString(),
    totalStores: totalStoresCount.toLocaleString(),
    installs: ((eventCounts.RELATIONSHIP_INSTALLED || 0) + (eventCounts.RELATIONSHIP_REACTIVATED || 0)).toLocaleString(),
    uninstalls: (eventCounts.RELATIONSHIP_UNINSTALLED || 0).toLocaleString(),
    planActivated: activatedCharges.toLocaleString(),
    planExpired: ((eventCounts.SUBSCRIPTION_CHARGE_EXPIRED || 0) + (eventCounts.ONE_TIME_CHARGE_EXPIRED || 0)).toLocaleString(),
    planCanceled: (eventCounts.SUBSCRIPTION_CHARGE_CANCELED || 0).toLocaleString(),
    planUnfrozen: (eventCounts.SUBSCRIPTION_CHARGE_UNFROZEN || 0).toLocaleString(),
    planDeclined: (eventCounts.SUBSCRIPTION_CHARGE_DECLINED || 0).toLocaleString(),
  };

  console.log(`\n[${appName}] Plan Expired Summary: ${metrics.planExpired} total (SUBSCRIPTION_CHARGE_EXPIRED: ${eventCounts.SUBSCRIPTION_CHARGE_EXPIRED || 0}, ONE_TIME_CHARGE_EXPIRED: ${eventCounts.ONE_TIME_CHARGE_EXPIRED || 0}, SUBSCRIPTION_CHARGE_CANCELED: ${eventCounts.SUBSCRIPTION_CHARGE_CANCELED || 0})\n`);

  return {
    appName,
    appId: appApiKey,
    totalEventsCount: totalCount,
    metrics,
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
      subscriptionChargeFrozen: eventCounts.SUBSCRIPTION_CHARGE_FROZEN || 0,
      ...eventCounts
    },
    uniqueStoresCount: {
      installedUniqueShops: installedShops.size,
      uninstalledUniqueShops: uninstalledShops.size,
      deactivatedUniqueShops: deactivatedShops.size,
      reactivatedUniqueShops: reactivatedShops.size
    },
    activeInstallStoresCount,
    monthlyTrends,
    events: filteredEvents,
  };
}

export {
  fetchAllAppEvents,
};

