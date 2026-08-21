import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Calendar } from "lucide-react";
import Metric_Card from "../components/matric_card";
import OverviewTrendChart from "../components/Charts/OverviewTrendChart";
import { fetchAppEvents } from "../services/api";

export default function Overview({
  selectedApp = "All Apps",
  startDate = "",
  endDate = "",
}) {
  const navigate = useNavigate();
  const [metrics, setMetrics] = useState({
    totalRevenue: "$0.00",
    weeklyInstalls: "0",
    totalStores: "0",
    installs: "0",
    uninstalls: "0",
    planActivated: "0",
    planExpired: "0",
    planCanceled: "0",
    planUnfrozen: "0",
    planDeclined: "0",
  });
  const [monthlyTrends, setMonthlyTrends] = useState([]);
  const [selectedMetric, setSelectedMetric] = useState(null); // null = "Installs V/S Uninstalls" dual view
  const [loading, setLoading] = useState(true);
  const [chartLoading, setChartLoading] = useState(false);
  const [error, setError] = useState(null);
  const [chartRefreshKey, setChartRefreshKey] = useState(0);

  // Full data fetch (metrics + trends) on app/date change
  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      const activeAppName = selectedApp || "All Apps";
      setLoading(true);
      setMonthlyTrends([]);
      setError(null);
      try {
        const data = await fetchAppEvents(activeAppName, { startDate, endDate });
        if (!isMounted) return;

        if (data && data.metrics) {
          setMetrics({ ...data.metrics });
        }
        if (data && data.monthlyTrends && Array.isArray(data.monthlyTrends)) {
          setMonthlyTrends(data.monthlyTrends);
        }
      } catch (err) {
        console.error(`Error fetching metrics for ${activeAppName}:`, err);
        if (isMounted) setError(err.message);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadData();

    return () => {
      isMounted = false;
    };
  }, [selectedApp, startDate, endDate]);

  // Chart-only refresh (re-fetches data but only updates trends, not metric cards)
  useEffect(() => {
    if (chartRefreshKey === 0) return; // skip initial mount
    let isMounted = true;

    async function refreshChart() {
      setChartLoading(true);
      try {
        const data = await fetchAppEvents(selectedApp, { startDate, endDate, forceRefresh: true });
        if (!isMounted) return;
        if (data && data.monthlyTrends) {
          setMonthlyTrends(data.monthlyTrends);
        }

      } catch (err) {
        console.error("Chart refresh error:", err);
      } finally {
        if (isMounted) setChartLoading(false);
      }
    }

    refreshChart();
    return () => {
      isMounted = false;
    };
  }, [chartRefreshKey, selectedApp, startDate, endDate]);

  const handleChartRefresh = () => {
    setChartRefreshKey((k) => k + 1);
  };

  const handleCardClick = (cardId) => {
    if (cardId === "weeklyInstalls") {
      handleNavigateToMerchants("weeklyInstalls");
      return;
    }
    if (selectedMetric === cardId) {
      setSelectedMetric(null); // Toggle back to dual installs/uninstalls view
    } else {
      setSelectedMetric(cardId);
    }
  };

  const handleNavigateToMerchants = (cardId) => {
    let state;
    if (cardId === "weeklyInstalls") {
      state = { initialStatusFilter: ["weekly"] };
    } else if (cardId === "installs") {
      state = { initialStatusFilter: ["installed", "reopened"] };
    } else if (cardId === "uninstalls") {
      state = { eventFilter: "uninstalled" };
    } else if (cardId === "planExpired") {
      state = { eventFilter: "charge_expired" };
    } else if (cardId === "totalStores") {
      state = {};
    } else if (cardId === "planCanceled") {
      state = { eventFilter: "charge_canceled" };
    } else if (cardId === "planActivated") {
      state = { activeSubscribers: true };
    } else if (cardId === "planUnfrozen") {
      state = { eventFilter: "charge_unfrozen" };
    } else if (cardId === "planDeclined") {
      state = { eventFilter: "charge_declined" };
    } else {
      state = { initialStatusFilter: ["installed", "reopened"] };
    }
    navigate("/all_stores", { state });
  };

  const cards = [
    {
      id: "weeklyInstalls",
      title: "Weekly Installs",
      value: metrics.weeklyInstalls,
      icon: Calendar,
      clickable: true,
    },
    {
      id: "totalStores",
      title: "Total Stores",
      value: metrics.totalStores,
      clickable: true,
    },
    {
      id: "installs",
      title: "Installs",
      value: metrics.installs,
      clickable: true,
    },
    {
      id: "uninstalls",
      title: "Uninstalls",
      value: metrics.uninstalls,
      clickable: true,
    },
    {
      id: "planActivated",
      title: "Plan Activated",
      value: metrics.planActivated,
      clickable: true,
    },
    {
      id: "planExpired",
      title: "Plan Expired",
      value: metrics.planExpired,
      clickable: true,
    },
    {
      id: "planUnfrozen",
      title: "Plan Unfrozen",
      value: metrics.planUnfrozen,
      clickable: true,
    },
    {
      id: "planDeclined",
      title: "Plan Declined",
      value: metrics.planDeclined,
      clickable: true,
    },
    {
      id: "planCanceled",
      title: "Plan Canceled",
      value: metrics.planCanceled,
      clickable: true,
    },
  ];

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto">
      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm">
          <span className="font-semibold">Failed to load live metrics: </span>
          {error}
        </div>
      )}

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((card) => (
          <Metric_Card
            key={card.id}
            title={card.title}
            value={card.value}
            icon={card.icon}
            isLoading={loading}
            isActive={
              card.clickable && card.id !== "weeklyInstalls"
                ? selectedMetric === card.id
                : false
            }
            onClick={
              card.clickable ? () => handleCardClick(card.id) : undefined
            }
            onValueClick={
              card.clickable
                ? () => handleNavigateToMerchants(card.id)
                : undefined
            }
          />
        ))}
      </div>

      {/* Dynamic Trend Chart below Cards */}
      <OverviewTrendChart
        data={monthlyTrends}
        selectedMetric={selectedMetric}
        loading={loading || chartLoading}
        error={error}
        onRefresh={handleChartRefresh}
      />
    </div>
  );
}
