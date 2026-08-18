import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const STORE_TOKENS_PATH = path.join(__dirname, '..', 'config', 'store_tokens.json');
const STORE_DETAILS_CACHE_PATH = path.join(__dirname, '..', 'config', 'store_details_cache.json');

export const GET_SHOP_ADMIN_DETAILS_QUERY = `
  query {
    shop {
      name
      myshopifyDomain
      email
      contactEmail
      plan {
        publicDisplayName
        partnerDevelopment
        shopifyPlus
      }
    }
  }
`;

/**
 * Load store access tokens mapping if available
 */
export function getStoreTokens() {
  try {
    if (fs.existsSync(STORE_TOKENS_PATH)) {
      return JSON.parse(fs.readFileSync(STORE_TOKENS_PATH, 'utf-8'));
    }
  } catch (e) {
    console.error('Error loading store_tokens.json:', e.message);
  }
  return {};
}

/**
 * Load cached store details from Admin GraphQL API
 */
export function getStoreDetailsCache() {
  try {
    if (fs.existsSync(STORE_DETAILS_CACHE_PATH)) {
      return JSON.parse(fs.readFileSync(STORE_DETAILS_CACHE_PATH, 'utf-8'));
    }
  } catch (e) {
    console.error('Error loading store_details_cache.json:', e.message);
  }
  return {};
}

/**
 * Save store details to cache
 */
export function saveStoreDetailsCache(cache) {
  try {
    fs.writeFileSync(STORE_DETAILS_CACHE_PATH, JSON.stringify(cache, null, 2), 'utf-8');
  } catch (e) {
    console.error('Error writing store_details_cache.json:', e.message);
  }
}

/**
 * Fetch real Shopify store details using the Admin GraphQL API
 * @param {string} storeDomain 
 * @param {string} [accessToken] 
 */
export async function fetchShopAdminDetails(storeDomain, accessToken) {
  if (!storeDomain) return null;
  const cleanDomain = storeDomain.replace(/^https?:\/\//, '').replace(/\/$/, '');

  const tokens = getStoreTokens();
  const token = accessToken || tokens[cleanDomain] || tokens[cleanDomain.replace('.myshopify.com', '')];

  if (!token) {
    // Check if we have cached details from Admin API
    const cache = getStoreDetailsCache();
    if (cache[cleanDomain]) {
      return cache[cleanDomain];
    }
    return null;
  }

  try {
    const response = await axios({
      url: `https://${cleanDomain}/admin/api/2026-07/graphql.json`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': token,
      },
      data: { query: GET_SHOP_ADMIN_DETAILS_QUERY },
      timeout: 8000,
    });

    const shop = response.data?.data?.shop;
    if (!shop) return null;

    // Apply exact user mapping:
    // ownerEmail: shop.email
    // contactEmail: shop.contactEmail
    // plan: shop.plan.publicDisplayName
    // storeType: shop.plan.partnerDevelopment ? "Development" : (shop.plan.shopifyPlus ? "Plus" : shop.plan.publicDisplayName)
    const storeType = shop.plan?.partnerDevelopment
      ? 'Development'
      : (shop.plan?.shopifyPlus ? 'Plus' : (shop.plan?.publicDisplayName || 'Basic'));

    const details = {
      storeName: shop.name,
      storeDomain: shop.myshopifyDomain || cleanDomain,
      ownerEmail: shop.email,
      contactEmail: shop.contactEmail,
      storeEmail: shop.email || shop.contactEmail,
      plan: shop.plan?.publicDisplayName || 'No Plan',
      storeType: storeType,
      partnerDevelopment: shop.plan?.partnerDevelopment || false,
      shopifyPlus: shop.plan?.shopifyPlus || false,
      updatedAt: new Date().toISOString(),
    };

    // Update cache
    const cache = getStoreDetailsCache();
    cache[cleanDomain] = details;
    saveStoreDetailsCache(cache);

    return details;
  } catch (error) {
    console.error(`Error querying Admin API for ${cleanDomain}:`, error.response?.data || error.message);
    const cache = getStoreDetailsCache();
    return cache[cleanDomain] || null;
  }
}
