const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

/**
 * Fetches events and metrics for a specific app by name or all apps combined.
 * @param {string} appName - e.g. "All Apps", "Passonext", "Discount_Ninja"
 * @param {object} options - { startDate, endDate, forceRefresh }
 */
export async function fetchAppEvents(appName = "All Apps", { startDate = "", endDate = "", forceRefresh = false } = {}) {
  const params = new URLSearchParams();
  if (startDate) params.append("startDate", startDate);
  if (endDate) params.append("endDate", endDate);
  if (forceRefresh) params.append("forceRefresh", "true");

  const queryString = params.toString();
  const url = `${API_BASE_URL}/api/events/${encodeURIComponent(appName)}${queryString ? `?${queryString}` : ""}`;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch events for ${appName}: ${response.statusText}`);
  }

  const json = await response.json();
  if (!json.success) {
    throw new Error(json.error || "Error fetching app data");
  }

  return json.data;
}

/**
 * Fetches store details directory.
 */
export async function fetchStoreDetails(domain) {
  const url = `${API_BASE_URL}/api/stores/${encodeURIComponent(domain)}`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch store details: ${response.statusText}`);
  }
  const json = await response.json();
  return json;
}

export default {
  fetchAppEvents,
  fetchStoreDetails,
};
