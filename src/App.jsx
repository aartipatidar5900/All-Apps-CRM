import { useState } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useLocation,
  useNavigate,
} from "react-router-dom";
import All_Stores from "./pages/All_Stores";
import Store_Details from "./pages/Store_Details";
import Overview from "./pages/Overview";
import Apps from "./pages/Apps";
import Sidebar from "./components/Sidebar";
import DateFilter from "./components/DateFilter";
import AppDropdown from "./components/app_dropdown";
import { ArrowLeft, Copy, Check, RefreshCw } from "lucide-react";
import { formatAppName, getAppsList } from "./utils/formatters";

function NavigationBar({
  totalCount = 0,
  selectedApp = "All Apps",
  onSelectApp,
  datePreset = "all",
  startDate = "",
  endDate = "",
  onDateFilterChange,
  onForceResync,
  isRefreshing = false,
}) {
  const location = useLocation();
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);
  const isStoreDetail = location.pathname.startsWith("/store/");
  const storeDomain = isStoreDetail
    ? decodeURIComponent(location.pathname.replace("/store/", ""))
    : "";
  const storeName = storeDomain ? storeDomain.split(".")[0] : "";

  const handleCopyDomain = () => {
    if (storeDomain) {
      navigator.clipboard.writeText(storeDomain);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const getPageTitle = () => {
    if (location.pathname === "/" || location.pathname === "/overview")
      return "Overview";
    if (location.pathname === "/apps") {
      return selectedApp ? formatAppName(selectedApp) : "Apps";
    }
    if (location.pathname === "/all_stores") return "Merchants";
    if (location.pathname === "/analytics") return "Analytics";
    if (location.pathname === "/promotions") return "Promotions";
    if (location.pathname === "/dashboard") return "Dashboard";
    const formatted = location.pathname.replace("/", "");
    return formatted.charAt(0).toUpperCase() + formatted.slice(1);
  };

  const isMerchantsPage =
    location.pathname === "/all_stores" || location.pathname === "/";
  const isAppsPage = location.pathname === "/apps";

  const appsList = getAppsList();
  const currentAppObj = appsList.find((a) => a.name === selectedApp) || appsList[0];
  const partnerGid = currentAppObj?.gid || `gid://partners/App/${selectedApp}`;

  return (
    <header className="sticky top-0 z-30 w-full bg-white/95 backdrop-blur-md border-b border-slate-200">
      <div className="w-full px-4 md:px-8 py-3 flex items-center justify-between min-h-16">
        {isStoreDetail ? (
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate("/all_stores")}
              className="p-2 border border-slate-200 rounded-xl bg-white hover:bg-slate-50 transition-colors text-slate-700 shadow-xs cursor-pointer"
              title="Back to Directory"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <h1 className="font-bold text-slate-900 text-lg leading-tight capitalize">
                {storeName}
              </h1>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="text-xs font-medium text-slate-500">
                  {storeDomain}
                </span>
                <button
                  type="button"
                  onClick={handleCopyDomain}
                  className="p-1 text-slate-400 hover:text-slate-700 transition-colors rounded-md cursor-pointer"
                  title={copied ? "Copied!" : "Copy Domain"}
                >
                  {copied ? (
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between w-full">
            <div>
              <h1 className="font-bold text-slate-900 text-xl tracking-tight">
                {getPageTitle()}
              </h1>
              {isAppsPage && partnerGid && partnerGid !== "gid://partners/App/all-apps" && (
                <p className="text-xs font-mono text-slate-400 mt-0.5">
                  {partnerGid}
                </p>
              )}
              {isMerchantsPage && (
                <span className="text-xs font-medium text-slate-500 block mt-0.5">
                  Total stores: {totalCount}
                </span>
              )}
            </div>

            {/* Date Filter & App Dropdown components placed in header */}
            <div className="flex items-center justify-between gap-3">
              {onDateFilterChange && (
                <DateFilter
                  selectedPreset={datePreset}
                  startDate={startDate}
                  endDate={endDate}
                  onDateFilterChange={onDateFilterChange}
                  onClear={() =>
                    onDateFilterChange({
                      preset: "all",
                      startDate: "",
                      endDate: "",
                    })
                  }
                />
              )}

              <AppDropdown
                selectedApp={selectedApp}
                onSelectApp={onSelectApp}
              />

              {isAppsPage && (
                <button
                  type="button"
                  onClick={onForceResync}
                  disabled={isRefreshing}
                  className="px-3 py-2 bg-slate-900 text-white hover:bg-slate-800 font-semibold text-xs rounded-xl transition-all flex items-center gap-1.5 shadow-2xs cursor-pointer disabled:opacity-50"
                  title="Force Resync App Data"
                >
                  <RefreshCw
                    className={`w-3.5 h-3.5 ${
                      isRefreshing ? "animate-spin" : ""
                    }`}
                  />
                  <span>Force resync</span>
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </header>
  );
}

function App() {
  const [totalStoresCount, setTotalStoresCount] = useState(0);
  const [selectedApp, setSelectedApp] = useState(() => {
    return localStorage.getItem("selected_crm_app") || "All Apps";
  });
  const [datePreset, setDatePreset] = useState("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const [forceResyncTrigger, setForceResyncTrigger] = useState(0);
  const [isAppsRefreshing, setIsAppsRefreshing] = useState(false);

  const handleSelectApp = (app) => {
    setSelectedApp(app);
    localStorage.setItem("selected_crm_app", app);
    setDatePreset("all");
    setStartDate("");
    setEndDate("");
  };

  const handleDateFilterChange = ({
    preset,
    startDate: start,
    endDate: end,
  }) => {
    setDatePreset(preset);
    setStartDate(start || "");
    setEndDate(end || "");
  };

  const handleTriggerResync = () => {
    setForceResyncTrigger((prev) => prev + 1);
  };

  return (
    <Router>
      <div className="flex min-h-screen bg-slate-50 text-slate-900 font-sans">
        <Sidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <NavigationBar
            totalCount={totalStoresCount}
            selectedApp={selectedApp}
            onSelectApp={handleSelectApp}
            datePreset={datePreset}
            startDate={startDate}
            endDate={endDate}
            onDateFilterChange={handleDateFilterChange}
            onForceResync={handleTriggerResync}
            isRefreshing={isAppsRefreshing}
          />
          <main className="flex-1">
            <Routes>
              <Route path="/" element={<Navigate to="/overview" replace />} />
              <Route
                path="/overview"
                element={
                  <Overview
                    selectedApp={selectedApp}
                    startDate={startDate}
                    endDate={endDate}
                  />
                }
              />
              <Route
                path="/apps"
                element={
                  <Apps
                    selectedApp={selectedApp}
                    onSelectApp={handleSelectApp}
                    startDate={startDate}
                    endDate={endDate}
                    forceResyncTrigger={forceResyncTrigger}
                    onRefreshingChange={setIsAppsRefreshing}
                  />
                }
              />
              <Route
                path="/all_stores"
                element={
                  <All_Stores
                    selectedApp={selectedApp}
                    onTotalCountChange={setTotalStoresCount}
                    datePreset={datePreset}
                    startDate={startDate}
                    endDate={endDate}
                    onDateFilterChange={handleDateFilterChange}
                  />
                }
              />
              <Route
                path="/settings"
                element={
                  <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-4">
                    <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
                    <p className="text-sm text-slate-500">
                      Manage your Shopify Partner API tokens, organization IDs, and app synchronization settings.
                    </p>
                  </div>
                }
              />
              <Route
                path="/store/:domain"
                element={<Store_Details selectedApp={selectedApp} />}
              />
              <Route path="*" element={<Navigate to="/overview" replace />} />
            </Routes>
          </main>
        </div>
      </div>
    </Router>
  );
}

export default App;
