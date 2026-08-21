import { RefreshCw } from "lucide-react";
import { formatAppName } from "../../utils/formatters";

export default function AppDetailHeader({
  appName,
  appId,
  onForceResync,
  isRefreshing = false,
}) {
  const isAllApps = !appName || appName === "All Apps";
  const formattedTitle = isAllApps ? "All Apps Overview" : formatAppName(appName);
  const partnerGid = isAllApps
    ? "All Connected Shopify Apps"
    : appId
    ? appId.startsWith("gid://")
      ? appId
      : `gid://partners/App/${appId}`
    : `gid://partners/App/${appName}`;

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-5 border-b border-slate-200 gap-4">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
          {formattedTitle}
        </h1>
        <p className="text-xs font-mono text-slate-400 mt-0.5">{partnerGid}</p>
      </div>

      <div className="flex items-center gap-2.5">
        <button
          type="button"
          onClick={onForceResync}
          disabled={isRefreshing}
          className="px-3 py-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white text-xs font-medium rounded-xl transition-all inline-flex items-center gap-1.5 shadow-2xs cursor-pointer"
        >
          <RefreshCw
            className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin" : ""}`}
          />
          <span>{isRefreshing ? "Syncing..." : "Force resync"}</span>
        </button>
      </div>
    </div>
  );
}
