import { useEffect, useRef } from "react";
import * as echarts from "echarts";
import { RefreshCw } from "lucide-react";

// Configuration for each metric card when clicked
const METRIC_CONFIGS = {
  totalStores: {
    title: "Total Stores Trend",
    subtitle: "Time series trend of total stores across all historical periods",
    color: "#6366f1", // Purple / Indigo
    dataKey: "totalStores",
    name: "Total Stores",
  },
  installs: {
    title: "Installs Trend",
    subtitle: "Time series trend of installs across all historical periods",
    color: "#22c55e", // Green
    dataKey: "installs",
    name: "Installs",
  },
  uninstalls: {
    title: "Uninstalls Trend",
    subtitle: "Time series trend of uninstalls across all historical periods",
    color: "#ef4444", // Red
    dataKey: "uninstalls",
    name: "Uninstalls",
  },
  totalRevenue: {
    title: "Total Revenue Trend",
    subtitle: "Time series trend of total revenue across all historical periods",
    color: "#4f46e5", // Indigo
    dataKey: "totalRevenue",
    name: "Total Revenue",
    isCurrency: true,
  },
  customerPortalCount: {
    title: "Customer Portal Count Trend",
    subtitle: "Time series trend of customer portal counts across all historical periods",
    color: "#8b5cf6", // Violet
    dataKey: "customerPortalCount",
    name: "Customer Portal Count",
  },
  weeklyInstalls: {
    title: "Weekly Installs Trend",
    subtitle: "Time series trend of weekly installs across historical periods",
    color: "#0ea5e9", // Sky Blue
    dataKey: "weeklyInstalls",
    name: "Weekly Installs",
  },
  planActivated: {
    title: "Plan Activated Trend",
    subtitle: "Time series trend of plan activations across all historical periods",
    color: "#3b82f6", // Blue
    dataKey: "planActivated",
    name: "Plan Activated",
  },
  planExpired: {
    title: "Plan Expired Trend",
    subtitle: "Time series trend of expired plans across all historical periods",
    color: "#f59e0b", // Amber
    dataKey: "planExpired",
    name: "Plan Expired",
  },
  planUnfrozen: {
    title: "Plan Unfrozen Trend",
    subtitle: "Time series trend of unfrozen plans across all historical periods",
    color: "#14b8a6", // Teal
    dataKey: "planUnfrozen",
    name: "Plan Unfrozen",
  },
  planDeclined: {
    title: "Plan Declined Trend",
    subtitle: "Time series trend of declined plans across all historical periods",
    color: "#f43f5e", // Rose
    dataKey: "planDeclined",
    name: "Plan Declined",
  },
};

export default function OverviewTrendChart({
  data = [],
  selectedMetric = null,
  loading = false,
  error = null,
  onRefresh,
}) {
  const chartRef = useRef(null);
  const chartInstance = useRef(null);

  // Active configuration: either a single metric config or the default dual Installs V/S Uninstalls
  const isSingleMetric = Boolean(selectedMetric && METRIC_CONFIGS[selectedMetric]);
  const activeConfig = isSingleMetric ? METRIC_CONFIGS[selectedMetric] : null;

  const chartTitle = activeConfig ? activeConfig.title : "Installs V/S Uninstalls";
  const chartSubtitle = activeConfig
    ? activeConfig.subtitle
    : "Time series trend of installations and uninstallations across all historical periods";

  useEffect(() => {
    if (loading || !chartRef.current || !data || data.length === 0) return;

    if (!chartInstance.current) {
      chartInstance.current = echarts.init(chartRef.current);
    }

    const months = data.map((d) => d.label || d.key || d.month);

    let series;
    if (isSingleMetric && activeConfig) {
      // Single Bar Trend Mode
      const singleData = data.map((d) => d[activeConfig.dataKey] ?? 0);
      series = [
        {
          name: activeConfig.name,
          type: "bar",
          barMaxWidth: 46,
          itemStyle: {
            color: activeConfig.color,
            borderRadius: [4, 4, 0, 0],
          },
          label: {
            show: true,
            position: "insideTop",
            distance: 8,
            color: "#ffffff",
            fontSize: 10,
            fontWeight: 700,
            formatter: (params) => {
              const val = params.value;
              if (!val || val === 0) return "";
              if (activeConfig.isCurrency) {
                return "$" + Number(val).toLocaleString();
              }
              return Number(val).toLocaleString();
            },
          },
          data: singleData,
        },
      ];
    } else {
      // Default Dual-Bar Mode: Installs V/S Uninstalls
      const installsData = data.map((d) => d.installs ?? 0);
      const uninstallsData = data.map((d) => d.uninstalls ?? 0);

      series = [
        {
          name: "Installs",
          type: "bar",
          barMaxWidth: 26,
          barGap: "15%",
          itemStyle: {
            color: "#22c55e", // Green
            borderRadius: [4, 4, 0, 0],
          },
          label: {
            show: true,
            position: "insideTop",
            distance: 8,
            color: "#ffffff",
            fontSize: 10,
            fontWeight: 700,
            formatter: (params) => (params.value > 0 ? params.value : ""),
          },
          data: installsData,
        },
        {
          name: "Uninstalls",
          type: "bar",
          barMaxWidth: 26,
          itemStyle: {
            color: "#ef4444", // Red
            borderRadius: [4, 4, 0, 0],
          },
          label: {
            show: true,
            position: "insideTop",
            distance: 8,
            color: "#ffffff",
            fontSize: 10,
            fontWeight: 700,
            formatter: (params) => (params.value > 0 ? params.value : ""),
          },
          data: uninstallsData,
        },
      ];
    }

    const option = {
      tooltip: {
        trigger: "axis",
        axisPointer: {
          type: "shadow",
          shadowStyle: {
            color: "rgba(241, 245, 249, 0.6)",
          },
        },
        backgroundColor: "rgba(255, 255, 255, 0.98)",
        borderColor: "#e2e8f0",
        borderWidth: 1,
        textStyle: { color: "#0f172a", fontSize: 12 },
        padding: [10, 14],
        extraCssText:
          "box-shadow: 0 10px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1); border-radius: 12px;",
        formatter: (params) => {
          if (!params || params.length === 0) return "";
          const header = `<div style="font-weight: 700; margin-bottom: 6px; color: #1e293b;">${params[0].axisValue}</div>`;
          const rows = params
            .map((item) => {
              const marker = `<span style="display:inline-block;margin-right:6px;border-radius:3px;width:10px;height:10px;background-color:${item.color};"></span>`;
              let formattedVal = item.value;
              if (activeConfig?.isCurrency) {
                formattedVal = "$" + Number(item.value).toLocaleString();
              } else if (typeof item.value === "number") {
                formattedVal = item.value.toLocaleString();
              }
              return `<div style="display: flex; justify-content: space-between; gap: 16px; margin-top: 3px; font-size: 11px;">
                <span>${marker} ${item.seriesName}</span>
                <span style="font-weight: 700; color: #0f172a;">${formattedVal}</span>
              </div>`;
            })
            .join("");
          return header + rows;
        },
      },
      grid: {
        left: "2%",
        right: "2%",
        bottom: "12%",
        top: "14%",
        containLabel: true,
      },
      xAxis: {
        type: "category",
        data: months,
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: {
          color: "#64748b",
          fontSize: 11,
          margin: 14,
        },
      },
      yAxis: {
        type: "value",
        splitLine: {
          lineStyle: {
            type: "dashed",
            color: "#f1f5f9",
          },
        },
        axisLabel: {
          color: "#94a3b8",
          fontSize: 11,
          formatter: (value) => {
            if (activeConfig?.isCurrency) {
              if (value >= 1000) return `$${(value / 1000).toFixed(0)}k`;
              return `$${value}`;
            }
            return value;
          },
        },
      },
      dataZoom: [
        {
          type: "slider",
          show: true,
          xAxisIndex: [0],
          bottom: 2,
          height: 12,
          start: 0,
          end: data.length > 8 ? 60 : 100,
          borderColor: "transparent",
          backgroundColor: "#f1f5f9",
          fillerColor: "rgba(203, 213, 225, 0.7)",
          showDetail: false,
          showDataShadow: false,
          handleSize: "100%",
          handleStyle: {
            color: "#94a3b8",
            borderColor: "#cbd5e1",
          },
          moveHandleStyle: {
            color: "#94a3b8",
          },
        },
        {
          type: "inside",
          xAxisIndex: [0],
        },
      ],
      series,
    };

    chartInstance.current.setOption(option, true);

    const handleResize = () => {
      chartInstance.current?.resize();
    };

    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, [data, selectedMetric, activeConfig, isSingleMetric, loading]);

  useEffect(() => {
    return () => {
      if (chartInstance.current) {
        chartInstance.current.dispose();
        chartInstance.current = null;
      }
    };
  }, []);

  return (
    <div className="bg-white border border-slate-200/90 rounded-2xl md:rounded-3xl p-6 md:p-8 shadow-xs relative transition-all duration-300">
      {/* Header with Title, Subtitle, and Refresh Button */}
      <div className="flex items-start justify-between mb-4">
        <div>
          {loading ? (
            <div className="space-y-2">
              <div className="h-6 w-48 bg-slate-200/80 rounded animate-pulse" />
              <div className="h-3.5 w-80 bg-slate-100 rounded animate-pulse" />
            </div>
          ) : (
            <div>
              <h2 className="text-lg md:text-xl font-bold text-slate-900 leading-tight">
                {chartTitle}
              </h2>
              <p className="text-xs md:text-sm text-slate-400 font-normal mt-1">
                {chartSubtitle}
              </p>
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={onRefresh}
          disabled={loading}
          className="p-2 rounded-xl border border-slate-200/80 text-slate-400 hover:text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs disabled:opacity-50 cursor-pointer"
          title="Refresh Chart"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-indigo-600" : ""}`} />
        </button>
      </div>

      {/* Chart Canvas or Skeleton State */}
      {loading ? (
        <div className="h-80 w-full bg-slate-50/60 rounded-2xl p-6 flex items-end justify-around gap-3 border border-slate-100">
          <div className="h-36 bg-slate-200/70 rounded-t-lg flex-1 max-w-10 animate-pulse" />
          <div className="h-24 bg-slate-200/70 rounded-t-lg flex-1 max-w-10 animate-pulse" />
          <div className="h-56 bg-slate-200/70 rounded-t-lg flex-1 max-w-10 animate-pulse" />
          <div className="h-16 bg-slate-200/70 rounded-t-lg flex-1 max-w-10 animate-pulse" />
          <div className="h-44 bg-slate-200/70 rounded-t-lg flex-1 max-w-10 animate-pulse" />
          <div className="h-52 bg-slate-200/70 rounded-t-lg flex-1 max-w-10 animate-pulse" />
          <div className="h-28 bg-slate-200/70 rounded-t-lg flex-1 max-w-10 animate-pulse" />
          <div className="h-40 bg-slate-200/70 rounded-t-lg flex-1 max-w-10 animate-pulse" />
          <div className="h-48 bg-slate-200/70 rounded-t-lg flex-1 max-w-10 animate-pulse" />
          <div className="h-20 bg-slate-200/70 rounded-t-lg flex-1 max-w-10 animate-pulse" />
          <div className="h-60 bg-slate-200/70 rounded-t-lg flex-1 max-w-10 animate-pulse" />
        </div>
      ) : error ? (
        <div className="h-80 flex items-center justify-center text-sm text-rose-600 bg-rose-50/40 rounded-2xl border border-rose-100">
          {error}
        </div>
      ) : !data || data.length === 0 ? (
        <div className="h-80 flex items-center justify-center text-sm text-slate-400 bg-slate-50/40 rounded-2xl border border-slate-100">
          No historical trend data available.
        </div>
      ) : (
        <div ref={chartRef} className="w-full h-80" />
      )}
    </div>
  );
}
