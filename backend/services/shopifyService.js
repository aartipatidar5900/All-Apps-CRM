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
    RELATIONSHIP_REACTIVATED: 0
  };

  const installedShops = new Set();
  const uninstalledShops = new Set();
  const deactivatedShops = new Set();
  const reactivatedShops = new Set();

  const sortedEvents = [...allEvents].sort((a, b) => new Date(a.occurredAt) - new Date(b.occurredAt));
  const shopCurrentStatus = {};

  for (const event of sortedEvents) {
    const type = event.type;
    const shopId = event.shop?.id || event.shop?.myshopifyDomain || 'unknown';

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

  return {
    appName,
    appId: appApiKey,
    totalEventsCount: totalCount,
    eventCounts: {
      relationshipInstalled: eventCounts.RELATIONSHIP_INSTALLED || 0,
      relationshipUninstalled: eventCounts.RELATIONSHIP_UNINSTALLED || 0,
      relationshipDeactivated: eventCounts.RELATIONSHIP_DEACTIVATED || 0,
      relationshipReactivated: eventCounts.RELATIONSHIP_REACTIVATED || 0,
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

