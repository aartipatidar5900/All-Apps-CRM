const Metric_Card = ({
  title,
  value,
  subtext,
  badge,
  icon: Icon,
  chartData,
  onClick,
  isActive,
  onValueClick,
  isLoading = false,
}) => {
  const loading = isLoading || value === "...";
  const handleClick = (e) => {
    if (loading) return;
    if (onClick) onClick(e);
  };
  const handleValueClick = (e) => {
    if (loading) return;
    if (onValueClick) {
      e.stopPropagation();
      onValueClick(e);
    }
  };
  return (
    <div
      onClick={handleClick}
      className={`p-5 rounded-2xl bg-white shadow-2xs transition-all duration-200 ease-in-out flex flex-col justify-between h-full ${
        loading
          ? "cursor-not-allowed select-none opacity-90"
          : onClick
            ? "cursor-pointer hover:-translate-y-0.5"
            : ""
      } ${isActive && !loading ? "border-2 border-slate-700 ring-2 ring-slate-100 shadow-md transform -translate-y-0.5" : "border border-zinc-200/80 hover:shadow-xs"}`}
    >
      <div className="flex justify-between items-start">
        <div className="w-full">
          <div className="flex items-center justify-between gap-1.5 pr-2">
            <span className="text-xs font-semibold text-zinc-500">{title}</span>
            {badge && !loading && (
              <span className="text-[10px] bg-sky-50 text-sky-700 font-semibold px-2 py-0.5 rounded-md border border-sky-200/80 shrink-0">
                {badge}
              </span>
            )}
          </div>
          {loading ? (
            <div className="h-7 w-20 bg-zinc-200 animate-pulse rounded-md mt-1.5 mb-0.5" />
          ) : (
            <div
              className={`text-2xl font-bold text-zinc-800 mt-1 w-fit ${onValueClick ? "hover:underline cursor-pointer hover:text-zinc-950" : ""}`}
              onClick={handleValueClick}
            >
              {value}
            </div>
          )}
          {subtext && (
            <p className="text-[11px] text-zinc-400 mt-1 font-medium">
              {subtext}
            </p>
          )}
        </div>
        {Icon && !chartData && !loading && (
          <div className="p-2 rounded-xl bg-zinc-50 border border-zinc-100 text-zinc-500 shrink-0">
            <Icon size={16} />
          </div>
        )}
      </div>
    </div>
  );
};
export default Metric_Card;
