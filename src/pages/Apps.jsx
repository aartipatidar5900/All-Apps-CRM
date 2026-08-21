import { useState, useEffect, useRef } from "react";
import AppMetricsOverview from "../components/Apps/AppMetricsOverview";
import AppPlanFunnelTable from "../components/Apps/AppPlanFunnelTable";
import { fetchAppEvents } from "../services/api";

export default function Apps({
  selectedApp: propSelectedApp = "All Apps",
  startDate = "",
  endDate = "",
  forceResyncTrigger = 0,
  onRefreshingChange,
}) {
  const activeApp = propSelectedApp || "All Apps";

  const [appData, setAppData] = useState({
    metrics: {},
    monthlyTrends: [],
    events: [],
    appId: "",
  });
  const [loading, setLoading] = useState(true);
  const [isResyncing, setIsResyncing] = useState(false);
  const [error, setError] = useState(null);

  // Notify parent component of refreshing state
  useEffect(() => {
    if (onRefreshingChange) {
      onRefreshingChange(isResyncing);
    }
  }, [isResyncing, onRefreshingChange]);

  // Fetch real app data from Partner API when activeApp or date range changes
  useEffect(() => {
    let isMounted = true;

    async function loadAppData() {
      setLoading(true);
      setError(null);
      setAppData({
        metrics: {},
        monthlyTrends: [],
        events: [],
        appId: "",
      });

      try {
        const data = await fetchAppEvents(activeApp, {
          startDate,
          endDate,
          forceRefresh: false,
        });

        if (!isMounted) return;

        console.log(`==================================================`);
        console.log(`[Browser Console] App Data Loaded: ${activeApp}`);
        console.log(`--------------------------------------------------`);
        console.log(` Active Merchants (Installed)  :`, data.metrics?.activeInstalls);
        console.log(` Installs (Last 30 Days)       :`, data.installFunnel?.[0]?.count);
        console.log(` Total Stores (All-time)       :`, data.metrics?.totalStores);
        console.log(` Total MRR                     :`, data.metrics?.totalRevenue);
        console.log(` Full Partner API Event Counts :`, data.eventCounts);
        console.log(`==================================================`);

        setAppData(data);
      } catch (err) {
        console.error(`Error loading app ${activeApp}:`, err);
        if (isMounted) setError(err.message);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    if (activeApp) {
      loadAppData();
    }

    return () => {
      isMounted = false;
    };
  }, [activeApp, startDate, endDate]);

  const handleForceResync = () => {
    setIsResyncing(true);
    fetchAppEvents(activeApp, { startDate, endDate, forceRefresh: true })
      .then((data) => {
        setAppData(data);
      })
      .catch((err) => {
        console.error("Force resync error:", err);
      })
      .finally(() => {
        setIsResyncing(false);
      });
  };

  // Trigger force resync when header button is clicked
  const isFirstRender = useRef(true);
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    if (forceResyncTrigger > 0) {
      const timer = setTimeout(() => {
        handleForceResync();
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [forceResyncTrigger]);

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto bg-slate-50 min-h-[calc(100vh-64px)]">
      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm">
          <span className="font-semibold">Failed to fetch app details: </span>
          {error}
        </div>
      )}

      {/* Real KPI Metrics Summary Grid */}
      <AppMetricsOverview
        metrics={appData.metrics}
        isLoading={loading}
        isRefreshing={isResyncing}
      />

      {/* Real Partner API Plan Breakdown & Install Funnel Tables */}
      <AppPlanFunnelTable
        planMix={appData.planMix}
        installFunnel={appData.installFunnel}
        metrics={appData.metrics}
        stores={appData.stores}
        events={appData.events}
        startDate={startDate}
        endDate={endDate}
        isLoading={loading}
        isRefreshing={isResyncing}
      />
    </div>
  );
}
