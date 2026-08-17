import { useNavigate, useLocation } from "react-router-dom";
import { Home, Users, TrendingUp, Settings, Store } from "lucide-react";

const Sidebar = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const menuItems = [
    {
      text: "Overview",
      icon: <Home className="w-4 h-4" />,
      path: "/overview",
    },
    {
      text: "Merchants",
      icon: <Users className="w-4 h-4" />,
      path: "/all_stores",
    },
    {
      text: "Analytics",
      icon: <TrendingUp className="w-4 h-4" />,
      path: "/analytics",
    },
  ];

  return (
    <aside className="w-60 shrink-0 bg-white border-r border-slate-200 h-screen sticky top-0 flex flex-col justify-between select-none z-40">
      <div>
        {/* Brand Header */}
        <div className="p-5 flex items-center gap-3 border-b border-slate-100">
          <div className="w-9 h-9 rounded-xl bg-slate-900 text-white flex items-center justify-center font-semibold shadow-xs">
            <Store className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-slate-900 text-base leading-tight">
              All Apps CRM
            </h1>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="p-3">
          <ul className="space-y-1.5">
            {menuItems.map((item) => {
              const isActive =
                location.pathname === item.path ||
                (item.path === "/overview" && location.pathname === "/") ||
                (item.path === "/all_stores" &&
                  location.pathname.startsWith("/store/"));

              return (
                <li key={item.text}>
                  <button
                    type="button"
                    onClick={() => navigate(item.path)}
                    className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-[13px] font-medium transition-all duration-150 cursor-pointer ${
                      isActive
                        ? "bg-[#111827] text-white font-semibold shadow-xs"
                        : "text-slate-600 hover:bg-slate-100/70 hover:text-slate-900"
                    }`}
                  >
                    <span
                      className={`flex items-center justify-center ${
                        isActive ? "text-white" : "text-slate-500"
                      }`}
                    >
                      {item.icon}
                    </span>
                    <span className="truncate">{item.text}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>

      {/* Footer / Settings */}
      <div className="p-3 border-t border-slate-100">
        <button
          type="button"
          onClick={() => navigate("/settings")}
          className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-[13px] font-medium transition-colors cursor-pointer ${
            location.pathname === "/settings"
              ? "bg-[#111827] text-white font-semibold shadow-xs"
              : "text-slate-600 hover:bg-slate-100/70 hover:text-slate-900"
          }`}
        >
          <Settings
            className={`w-4 h-4 ${
              location.pathname === "/settings"
                ? "text-white"
                : "text-slate-500"
            }`}
          />
          <span className="truncate">Settings</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
