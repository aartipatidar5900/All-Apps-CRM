import { DollarSign, Store, TrendingUp, UserMinus } from "lucide-react";

export default function AppMetricsOverview({
  metrics = {},
  isRefreshing = false,
  isLoading = false,
}) {
  const showSkeleton = isLoading || isRefreshing;
  const mrr = metrics.totalRevenue || "$0.00";
  const activeInstalls =
    metrics.activeInstalls ?? metrics.activeStores ?? metrics.totalStores ?? "0";
  const uninstalls = metrics.uninstalls || "0";

  // Calculate ARPU (Average Revenue Per User)
  const numRevenue = parseFloat(String(mrr).replace(/[^0-9.-]+/g, "")) || 0;
  const numActive = parseInt(String(activeInstalls).replace(/,/g, ""), 10) || 0;
  const arpu =
    numActive > 0 ? `$${(numRevenue / numActive).toFixed(2)}` : "$0.00";

  // Calculate paid & total churn rate estimates
  const paidUninstalls = metrics.paidUninstalls || "0";
  const numPaidUninstalls = parseInt(String(paidUninstalls).replace(/,/g, ""), 10) || 0;
  const numUninstalls = parseInt(String(uninstalls).replace(/,/g, ""), 10) || 0;
  const numActivePaid = parseInt(String(metrics.activePaidStores || 0).replace(/,/g, ""), 10) || 0;

  const totalPaidHistorical = numActivePaid + numPaidUninstalls;
  const totalHistorical = numActive + numUninstalls;

  const churnRate =
    totalPaidHistorical > 0
      ? `${((numPaidUninstalls / totalPaidHistorical) * 100).toFixed(1)}%`
      : (totalHistorical > 0
          ? `${((numUninstalls / totalHistorical) * 100).toFixed(1)}%`
          : "0.0%");

  const churnSubtitle =
    numPaidUninstalls > 0
      ? `${numPaidUninstalls} paid uninstalls (${uninstalls} total)`
      : `${uninstalls} uninstalls total`;

  const cards = [
    {
      title: "MRR",
      value: mrr,
      subtitle: `${metrics.weeklyInstalls || 0} installs this week`,
      icon: DollarSign,
      color: "text-emerald-600 bg-emerald-50",
    },
    {
      title: "ACTIVE INSTALLS",
      value: activeInstalls,
      subtitle: `${metrics.activePaidStores ?? 0} paying`,
      icon: Store,
      color: "text-blue-600 bg-blue-50",
    },
    {
      title: "ARPU",
      value: arpu,
      subtitle: "Blended, incl. free",
      icon: TrendingUp,
      color: "text-indigo-600 bg-indigo-50",
    },
    {
      title: "CHURN, 30 DAYS",
      value: churnRate,
      subtitle: churnSubtitle,
      icon: UserMinus,
      color: "text-rose-600 bg-rose-50",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card, idx) => (
        <div
          key={idx}
          className="p-5 bg-white rounded-2xl border border-slate-200 shadow-2xs space-y-3 relative overflow-hidden transition-all"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold tracking-wider text-slate-400 uppercase">
              {card.title}
            </span>
            <div className={`p-2 rounded-xl ${card.color}`}>
              <card.icon className="w-4 h-4" />
            </div>
          </div>

          <div>
            {showSkeleton ? (
              <div className="space-y-2 py-0.5">
                <div className="h-7 w-28 bg-slate-200 animate-pulse rounded-lg" />
                <div className="h-3.5 w-36 bg-slate-100 animate-pulse rounded-md" />
              </div>
            ) : (
              <>
                <div className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                  <span>{card.value}</span>
                </div>
                <p className="text-xs text-slate-500 mt-1 font-medium">
                  {card.subtitle}
                </p>
              </>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
