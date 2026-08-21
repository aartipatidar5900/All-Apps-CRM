import { useState, useRef, useEffect } from "react";
import { LayoutGrid, ChevronDown, Check } from "lucide-react";
import { getAppsList } from "../utils/formatters";

export default function AppDropdown({
  selectedApp,
  onSelectApp,
}) {
  const appsList = getAppsList();
  const defaultApp = "All Apps";
  const activeApp = selectedApp || defaultApp;
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (appValue) => {
    if (onSelectApp) {
      onSelectApp(appValue);
    }
    setIsOpen(false);
  };

  const selectedAppObj =
    appsList.find(
      (app) =>
        app.name === activeApp ||
        app.formattedName.toLowerCase() === activeApp.toLowerCase()
    ) || appsList[0];
  const triggerLabel = selectedAppObj
    ? selectedAppObj.formattedName
    : "All Apps";

  return (
    <div className="relative inline-block text-left" ref={containerRef}>
      {/* Dropdown Trigger Button styled identically to DateFilter */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="px-3 py-2 text-xs font-semibold rounded-xl border transition-all flex items-center gap-2 shadow-2xs bg-slate-900 text-white border-slate-900 hover:bg-slate-800 cursor-pointer"
        title="App Filter"
      >
        <LayoutGrid className="w-3.5 h-3.5 text-white" />
        <span>{triggerLabel}</span>
        <ChevronDown className="w-3.5 h-3.5 opacity-60" />
      </button>

      {/* Floating Popover Options Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 bg-white rounded-2xl shadow-xl border border-slate-200 z-50 p-2 text-xs animate-in fade-in zoom-in-95 duration-150 w-52 space-y-1">
          {appsList.map((app) => {
            const isSelected =
              activeApp === app.name ||
              (activeApp.toLowerCase() === "all apps" && app.name === "All Apps");
            return (
              <button
                key={app.id}
                type="button"
                onClick={() => handleSelect(app.name)}
                className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl font-semibold text-xs transition-colors cursor-pointer ${
                  isSelected
                    ? "bg-slate-900 text-white font-bold"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                }`}
              >
                <span>{app.formattedName}</span>
                {isSelected && <Check className="w-3.5 h-3.5" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
