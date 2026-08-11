import { useState, useEffect } from "react";
import { DollarSign, Calendar } from "lucide-react";
import Metric_Card from "../components/matric_card";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

export function Overview({ selectedApp = "Passonext" }) {
  const [metrics, setMetrics] = useState({
    totalRevenue: "$0.00",
    weeklyInstalls: "0",
    totalStores: "0",
    installs: "0",
    uninstalls: "0",
    planActivated: "0",
    planExpired: "0",
    planUnfrozen: "0",
    planDeclined: "0",
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let isMounted = true;
    async function fetchMetrics() {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(
          `${API_BASE_URL}/api/events/${encodeURIComponent(selectedApp)}`
        );
        if (!response.ok) {
          throw new Error(`Failed to fetch app data: ${response.statusText}`);
        }
        const json = await response.json();
        if (json.success && json.data && json.data.metrics) {
          if (isMounted) {
            setMetrics(json.data.metrics);
          }
        } else {
          throw new Error(json.error || "Failed to load metrics.");
        }
      } catch (err) {
        console.error(`Error fetching metrics for ${selectedApp}:`, err);
        if (isMounted) {
          setError(err.message);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    if (selectedApp) {
      fetchMetrics();
    }

    return () => {
      isMounted = false;
    };
  }, [selectedApp]);

  const cards = [
    {
      title: "Total Revenue",
      value: metrics.totalRevenue,
      icon: DollarSign,
    },
    {
      title: "Weekly Installs",
      value: metrics.weeklyInstalls,
      icon: Calendar,
    },
    {
      title: "Total Stores",
      value: metrics.totalStores,
    },
    {
      title: "Installs",
      value: metrics.installs,
    },
    {
      title: "Uninstalls",
      value: metrics.uninstalls,
    },
    {
      title: "Plan Activated",
      value: metrics.planActivated,
    },
    {
      title: "Plan Expired",
      value: metrics.planExpired,
    },
    {
      title: "Plan Unfrozen",
      value: metrics.planUnfrozen,
    },
    {
      title: "Plan Declined",
      value: metrics.planDeclined,
    },
  ];

  return (
    <div className="p-6 md:p-8 space-y-8 max-w-7xl mx-auto">
      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm">
          <span className="font-semibold">Failed to load live metrics: </span>
          {error}
        </div>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((card, index) => (
          <Metric_Card
            key={index}
            title={card.title}
            value={card.value}
            icon={card.icon}
            isLoading={loading}
          />
        ))}
      </div>
    </div>
  );
}

export default Overview;
