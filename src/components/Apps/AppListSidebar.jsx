import { useState } from "react";
import { Search, ChevronRight, LayoutGrid } from "lucide-react";
import { getAppsList } from "../../utils/formatters";

export default function AppListSidebar({ selectedApp, onSelectApp, appSummaryData = {} }) {
  const appsList = getAppsList();
  const [searchTerm, setSearchTerm] = useState("");

  const filteredApps = appsList.filter((app) =>
    app.formattedName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="w-64 md:w-72 shrink-0 bg-white border-r border-slate-200 flex flex-col h-full min-h-[calc(100vh-64px)] select-none">
      {/* Header */}
      <div className="p-4 border-b border-slate-100 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold tracking-wider text-slate-400 uppercase">
            {appsList.length} Apps
          </span>
          <span className="p-1 bg-slate-100 rounded-lg text-slate-500">
            <LayoutGrid className="w-3.5 h-3.5" />
          </span>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search app..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:border-slate-400 transition-all"
          />
        </div>
      </div>

      {/* App List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {filteredApps.map((app) => {
          const isSelected = selectedApp === app.name;
          const summary = appSummaryData[app.name] || {};
          const revenueDisplay = summary.totalRevenue || summary.mrr || "$0.00";

          return (
            <button
              key={app.id}
              type="button"
              onClick={() => onSelectApp(app.name)}
              className={`w-full flex items-center justify-between p-3 rounded-xl transition-all cursor-pointer text-left ${
                isSelected
                  ? "bg-slate-900 text-white shadow-xs font-semibold"
                  : "text-slate-700 hover:bg-slate-100/70"
              }`}
            >
              <div className="min-w-0 pr-2">
                <div className="font-medium text-xs leading-snug truncate">
                  {app.formattedName}
                </div>
                <div
                  className={`text-[10px] mt-0.5 font-mono ${
                    isSelected ? "text-slate-300" : "text-slate-400"
                  }`}
                >
                  ID: {app.id}
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <span
                  className={`text-xs font-semibold ${
                    isSelected ? "text-white" : "text-slate-900"
                  }`}
                >
                  {revenueDisplay}
                </span>
                <ChevronRight
                  className={`w-3.5 h-3.5 ${
                    isSelected ? "text-slate-300" : "text-slate-300 opacity-60"
                  }`}
                />
              </div>
            </button>
          );
        })}

        {filteredApps.length === 0 && (
          <div className="p-4 text-center text-xs text-slate-400">
            No matching apps found
          </div>
        )}
      </div>
    </div>
  );
}
