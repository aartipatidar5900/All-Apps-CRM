import appData from "../../backend/config/all_apps.json";

/**
 * Formats app keys like "Discount_Ninja" to "Discount Ninja"
 */
export const formatAppName = (key = "") => {
  if (!key) return "All Apps";
  const norm = key.toLowerCase().replace(/[-_\s]/g, "");
  if (norm === "all" || norm === "allapps") return "All Apps";
  return key.replace(/_/g, " ");
};

/**
 * Returns formatted app list from all_apps.json including All Apps option
 */
export const getAppsList = () => {
  const list = appData.map((item) => {
    const [name, id] = Object.entries(item)[0];
    return {
      name,
      formattedName: formatAppName(name),
      id,
      gid: id.startsWith("gid://") ? id : `gid://partners/App/${id}`,
    };
  });
  return [
    {
      name: "All Apps",
      formattedName: "All Apps",
      id: "all-apps",
      gid: "gid://partners/App/all-apps",
    },
    ...list,
  ];
};

/**
 * Format currency values ($14,320)
 */
export const formatCurrency = (amount) => {
  if (amount === undefined || amount === null) return "$0.00";
  if (typeof amount === "string" && amount.startsWith("$")) return amount;
  const num = typeof amount === "string" ? parseFloat(amount.replace(/[^0-9.-]+/g, "")) : amount;
  if (isNaN(num)) return "$0.00";
  return `$${num.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

/**
 * Format raw numbers with commas
 */
export const formatNumber = (val) => {
  if (val === undefined || val === null) return "0";
  const num = typeof val === "string" ? parseInt(val.replace(/,/g, ""), 10) : val;
  if (isNaN(num)) return String(val);
  return num.toLocaleString("en-US");
};
