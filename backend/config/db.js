import mongoose from 'mongoose';
import dns from 'dns';

try {
  dns.setServers(['8.8.8.8', '1.1.1.1', '8.8.4.4']);
} catch (e) {
  console.error('Error setting DNS servers:', e);
}

// Map normalized app names to their environment variable configuration
const APP_DB_CONFIGS = {
  postpurchase: {
    name: 'Post_purchase',
    uriEnv: 'POST_PURCHASE_URI',
    dbNameEnv: 'POST_PURCHASE_DB_NAME',
  },
  formbuilder: {
    name: 'Form_Builder',
    uriEnv: 'FORM_BUILDER_URI',
    dbNameEnv: 'FORM_BUILDER_DB_NAME',
  },
  countryblocker: {
    name: 'Country_Blocker',
    uriEnv: 'COUNTRY_BLOCKER_URI',
    dbNameEnv: 'COUNTRY_BLOCKER_DB_NAME',
  },
  passonext: {
    name: 'Passonext',
    uriEnv: 'PASSONEXT_URI',
    dbNameEnv: 'PASSONEXT_DB_NAME',
  },
  discountninja: {
    name: 'Discount_Ninja',
    uriEnv: 'DISCOUNT_NINJA_URI',
    dbNameEnv: 'DISCOUNT_NINJA_DB_NAME',
  },
  checkoutextensions: {
    name: 'Checkout_Extensions',
    uriEnv: 'CHECKOUT_EXTENSIONS_URI',
    dbNameEnv: 'CHECKOUT_EXTENSIONS_DB_NAME',
  },
  nojiro: {
    name: 'Nojiro',
    uriEnv: 'NOJIRO_URI',
    dbNameEnv: 'NOJIRO_DB_NAME',
  },
  orderediting: {
    name: 'Order_editing',
    uriEnv: 'ORDER_EDITING_URI',
    dbNameEnv: 'ORDER_EDITING_DB_NAME',
  },
};

// Map to store active connections: normKey -> mongoose.Connection
const connections = new Map();

// Helper to normalize app key string
function normalizeKey(str = '') {
  return str.toLowerCase().replace(/[-_\s]/g, '');
}

/**
 * Connect to a single app database by normalized key
 */
async function connectSingleApp(normKey) {
  const config = APP_DB_CONFIGS[normKey];
  if (!config) {
    console.warn(`[MongoDB] No DB configuration found for app key: '${normKey}'`);
    return null;
  }

  const uri = process.env[config.uriEnv];
  const dbName = process.env[config.dbNameEnv];

  if (!uri) {
    console.warn(`[MongoDB] Warning: Environment variable '${config.uriEnv}' is not set for ${config.name}`);
    return null;
  }

  // Check if connection already exists and is active
  if (connections.has(normKey)) {
    const existingConn = connections.get(normKey);
    if (existingConn.readyState === 1 || existingConn.readyState === 2) {
      // 1 = connected, 2 = connecting
      return existingConn;
    }
  }

  try {
    const connOptions = {};
    if (dbName) {
      connOptions.dbName = dbName;
    }

    console.log(`[MongoDB] Connecting to ${config.name} DB (${dbName || 'default'})...`);
    const conn = await mongoose.createConnection(uri, connOptions).asPromise();
    connections.set(normKey, conn);
    console.log(`[MongoDB] ✅ Connected successfully to ${config.name} database (${conn.name || dbName || 'OK'})`);
    return conn;
  } catch (error) {
    console.error(`[MongoDB] ❌ Connection error for ${config.name} (${dbName || ''}):`, error.message);
    return null;
  }
}

/**
 * Main DB connection function
 * @param {string} appName - Name of the selected app or "All Apps"
 */
export async function connectDB(appName = 'All Apps') {
  const norm = normalizeKey(appName);

  if (norm === 'all' || norm === 'allapps' || !appName) {
    console.log(`[MongoDB] Dropdown selected: 'All Apps'. Connecting to all configured databases...`);
    const keys = Object.keys(APP_DB_CONFIGS);
    await Promise.allSettled(keys.map((k) => connectSingleApp(k)));
    return connections;
  }

  console.log(`[MongoDB] Dropdown selected app: '${appName}'. Connecting to this database only...`);
  await connectSingleApp(norm);
  return connections.get(norm) || null;
}

/**
 * Get active Mongoose connection for a specific app
 */
export function getConnection(appName) {
  const norm = normalizeKey(appName);
  return connections.get(norm) || null;
}

/**
 * Get map of all active Mongoose connections
 */
export function getAllConnections() {
  return connections;
}

export default connectDB;
