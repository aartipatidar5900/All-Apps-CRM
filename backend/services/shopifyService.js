import axios from 'axios';
import { GET_APP_EVENTS_QUERY } from '../graphql/eventQueries.js';


async function fetchAllAppEvents(appApiKey) {
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

  const sortedEvents = [...allEvents].sort((a, b) => new Date(a.occurredAt) - new Date(b.occurredAt));
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

  const weeklyInstallsCount = allEvents.filter(e => {
    return e.type === 'RELATIONSHIP_INSTALLED' && new Date(e.occurredAt) >= sevenDaysAgo;
  }).length;

  const activatedCharges = (eventCounts.SUBSCRIPTION_CHARGE_ACTIVATED || 0) + (eventCounts.ONE_TIME_CHARGE_ACTIVATED || 0);
  const revenueVal = (activeInstallStoresCount * 29.99 + activatedCharges * 19.99);
  const formattedRevenue = `$${revenueVal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const totalStoresCount = allUniqueShops.size || installedShops.size;

  const metrics = {
    totalRevenue: formattedRevenue,
    weeklyInstalls: weeklyInstallsCount.toLocaleString(),
    totalStores: totalStoresCount.toLocaleString(),
    installs: (eventCounts.RELATIONSHIP_INSTALLED || 0).toLocaleString(),
    uninstalls: (eventCounts.RELATIONSHIP_UNINSTALLED || 0).toLocaleString(),
    planActivated: activatedCharges.toLocaleString(),
    planExpired: ((eventCounts.SUBSCRIPTION_CHARGE_EXPIRED || 0) + (eventCounts.ONE_TIME_CHARGE_EXPIRED || 0)).toLocaleString(),
    planUnfrozen: (eventCounts.SUBSCRIPTION_CHARGE_UNFROZEN || 0).toLocaleString(),
    planDeclined: (eventCounts.SUBSCRIPTION_CHARGE_DECLINED || 0).toLocaleString(),
  };

  return {
    appName,
    appId: appApiKey,
    totalEventsCount: totalCount,
    metrics,
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
    events: allEvents,
  };
}

export {
  fetchAllAppEvents,
};

