import { useNavigate, useLocation } from "react-router-dom";
import { Store, TrendingUp, Settings } from "lucide-react";

const Sidebar = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const menuItems = [
    {
      text: "Overview",
      icon: <Store className="w-4 h-4" />,
      path: "/overview",
    },
    {
      text: "Merchants",
      icon: <Store className="w-4 h-4" />,
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
              Discount Ninja
            </h1>
            <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
              CRM Dashboard
            </p>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="p-3">
          <span className="px-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
            Main Menu
          </span>
          <ul className="space-y-1">
            {menuItems.map((item) => {
              const isActive =
                location.pathname === item.path ||
                (item.path === "/all_stores" &&
                  location.pathname.startsWith("/store/"));

              return (
                <li key={item.text}>
                  <button
                    type="button"
                    onClick={() => navigate(item.path)}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                      isActive
                        ? "bg-slate-100 text-slate-900 font-bold"
                        : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                    }`}
                  >
                    <span
                      className={isActive ? "text-slate-900" : "text-slate-500"}
                    >
                      {item.icon}
                    </span>
                    {item.text}
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
          className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors"
        >
          <Settings className="w-4 h-4 text-slate-500" />
          Settings
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
