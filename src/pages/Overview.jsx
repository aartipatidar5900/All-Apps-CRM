import { DollarSign, Calendar } from "lucide-react";
import Metric_Card from "../components/matric_card";

const getAppMetrics = (appName) => {
  const metricsData = {
    Passonext: {
      totalRevenue: "$72,944.27",
      weeklyInstalls: "62",
      totalStores: "8,582",
      installs: "7,563",
      uninstalls: "6,190",
      planActivated: "391",
      planExpired: "84",
      planUnfrozen: "21",
      planDeclined: "12",
    },
    Discount_Ninja: {
      totalRevenue: "$45,210.50",
      weeklyInstalls: "48",
      totalStores: "5,320",
      installs: "4,890",
      uninstalls: "3,410",
      planActivated: "275",
      planExpired: "52",
      planUnfrozen: "14",
      planDeclined: "8",
    },
    Checkout_Extensions: {
      totalRevenue: "$98,400.00",
      weeklyInstalls: "85",
      totalStores: "11,240",
      installs: "10,150",
      uninstalls: "7,820",
      planActivated: "512",
      planExpired: "110",
      planUnfrozen: "33",
      planDeclined: "19",
    },
    Nojiro: {
      totalRevenue: "$18,650.00",
      weeklyInstalls: "22",
      totalStores: "2,150",
      installs: "1,980",
      uninstalls: "1,420",
      planActivated: "105",
      planExpired: "28",
      planUnfrozen: "7",
      planDeclined: "4",
    },
    Post_purchase: {
      totalRevenue: "$34,120.75",
      weeklyInstalls: "39",
      totalStores: "4,210",
      installs: "3,840",
      uninstalls: "2,950",
      planActivated: "198",
      planExpired: "41",
      planUnfrozen: "11",
      planDeclined: "6",
    },
    Country_Blocker: {
      totalRevenue: "$14,890.00",
      weeklyInstalls: "18",
      totalStores: "1,890",
      installs: "1,720",
      uninstalls: "1,180",
      planActivated: "88",
      planExpired: "22",
      planUnfrozen: "5",
      planDeclined: "3",
    },
    Order_editing: {
      totalRevenue: "$52,800.00",
      weeklyInstalls: "54",
      totalStores: "6,480",
      installs: "5,820",
      uninstalls: "4,310",
      planActivated: "310",
      planExpired: "65",
      planUnfrozen: "18",
      planDeclined: "10",
    },
    Form_Builder: {
      totalRevenue: "$28,450.25",
      weeklyInstalls: "31",
      totalStores: "3,450",
      installs: "3,120",
      uninstalls: "2,280",
      planActivated: "162",
      planExpired: "35",
      planUnfrozen: "9",
      planDeclined: "5",
    },
  };

  return metricsData[appName] || metricsData.Passonext;
};

export function Overview({ selectedApp = "Passonext" }) {
  const metrics = getAppMetrics(selectedApp);

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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((card, index) => (
          <Metric_Card
            key={index}
            title={card.title}
            value={card.value}
            icon={card.icon}
          />
        ))}
      </div>
    </div>
  );
}

export default Overview;
