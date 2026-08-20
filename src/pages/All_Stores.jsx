import { useEffect, useState, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import Main_Table from "../components/Main_Table";
import { TableSkeleton } from "../components/SkeletonLoader";
import { AlertCircle } from "lucide-react";
import { mockDiscounts } from "../data/mockData";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

const getTotalDays = (row) => {
  const rawEvents = Array.isArray(row?.pastEvents) ? row.pastEvents : [];
  let earliestDate = row?.createdAt || row?.createdOn || row?.installedAt;
  if (rawEvents.length > 0) {
    const dates = rawEvents
      .map((e) => new Date(e.timestamp || e.createdAt || e.date || 0))
      .filter((d) => !isNaN(d.getTime()));
    if (dates.length > 0) {
      dates.sort((a, b) => a - b);
      earliestDate = dates[0];
    }
  }
  const d = earliestDate ? new Date(earliestDate) : new Date();
  const diffTime = Math.abs(new Date() - (isNaN(d.getTime()) ? new Date() : d));
  return Math.max(1, Math.floor(diffTime / (1000 * 60 * 60 * 24)));
};

const getStatusLabel = (row) => {
  const rawEvents = Array.isArray(row?.pastEvents) ? row.pastEvents : [];
  let latestEventName = "";
  if (rawEvents.length > 0) {
    const sorted = [...rawEvents].sort(
      (a, b) => new Date(b.timestamp || 0) - new Date(a.timestamp || 0),
    );
    latestEventName = sorted[0]?.eventName || sorted[0]?.type || "";
  }
  const lowerEvent = latestEventName.toLowerCase();
  if (lowerEvent.includes("reopen") || lowerEvent.includes("reopened"))
    return "Store Reopened";
  if (
    lowerEvent.includes("close") ||
    lowerEvent.includes("closed") ||
    row?.isStoreClosed
  )
    return "Store Closed";
  if (
    lowerEvent.includes("uninstall") ||
    lowerEvent.includes("uninstalled") ||
    row?.isActive === false
  )
    return "Uninstalled";
  return "Installed";
};

const All_Stores = ({
  selectedApp = "Passonext",
  onTotalCountChange,
  datePreset: propDatePreset = "all",
  startDate: propStartDate = "",
  endDate: propEndDate = "",
  onDateFilterChange: propOnDateFilterChange,
}) => {
  const navigate = useNavigate();
  const location = useLocation();

  const [discounts, setDiscounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Global & status filter states
  const [search, setSearch] = useState(() => {
    if (location.state?.initialSearch !== undefined) {
      return location.state.initialSearch;
    }
    return "";
  });
  const [statusFilter, setStatusFilter] = useState(() => {
    if (
      location.state?.initialStatusFilter &&
      Array.isArray(location.state.initialStatusFilter)
    ) {
      return location.state.initialStatusFilter;
    }
    return [];
  });

  // Local fallback Date range filter states
  const [localDatePreset, setLocalDatePreset] = useState("all");
  const [localStartDate, setLocalStartDate] = useState("");
  const [localEndDate, setLocalEndDate] = useState("");

  const datePreset = propOnDateFilterChange ? propDatePreset : localDatePreset;
  const startDate = propOnDateFilterChange ? propStartDate : localStartDate;
  const endDate = propOnDateFilterChange ? propEndDate : localEndDate;

  // Sorting & Pagination
  const [sortField, setSortField] = useState("updatedAt");
  const [sortOrder, setSortOrder] = useState("desc");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  const [planFilter, setPlanFilter] = useState(() => {
    if (
      location.state?.initialPlanFilter &&
      Array.isArray(location.state.initialPlanFilter)
    ) {
      return location.state.initialPlanFilter;
    }
    return [];
  });

  const [activeSubscribers, setActiveSubscribers] = useState(() => {
    return location.state?.activeSubscribers === true;
  });

  const [eventFilter, setEventFilter] = useState(() => {
    return location.state?.eventFilter || "";
  });

  // Clear state in history after reading
  useEffect(() => {
    if (location.state) {
      navigate(location.pathname, { replace: true, state: null });
    }
  }, [location, navigate]);

  const activeFiltersText = useMemo(() => {
    const parts = [];
    if (startDate) parts.push(`startDate: ${startDate}`);
    if (endDate) parts.push(`endDate: ${endDate}`);
    if (search) {
      parts.push(`search: ${search}`);
    }
    if (statusFilter && statusFilter.length > 0) {
      parts.push(`event: ${statusFilter.join(", ")}`);
    }
    if (planFilter && planFilter.length > 0) {
      parts.push(`plan: ${planFilter.join(", ")}`);
    }
    if (activeSubscribers) {
      parts.push(`activeSubscribers: true`);
    }
    if (eventFilter) {
      const displayFilter = eventFilter
        .replace(/_/g, " ")
        .replace(/\b\w/g, (l) => l.toUpperCase());
      parts.push(`event: ${displayFilter}`);
    }
    return parts.join(", ");
  }, [
    startDate,
    endDate,
    search,
    statusFilter,
    planFilter,
    activeSubscribers,
    eventFilter,
  ]);

  const handleResetFilters = () => {
    setStatusFilter([]);
    setPlanFilter([]);
    setActiveSubscribers(false);
    setEventFilter("");
    setSearch("");
    setPage(1);
    setLocalDatePreset("all");
    setLocalStartDate("");
    setLocalEndDate("");
    if (propOnDateFilterChange) {
      propOnDateFilterChange({ preset: "all", startDate: "", endDate: "" });
    }
  };

  const filteredAndSortedDiscounts = useMemo(() => {
    let result = [...discounts];

    // 1. Search filter
    if (search) {
      const query = search.toLowerCase();
      result = result.filter(
        (item) =>
          (item.storeName || "").toLowerCase().includes(query) ||
          (item.name || "").toLowerCase().includes(query) ||
          (item.storeDomain || "").toLowerCase().includes(query) ||
          (item.plan || "").toLowerCase().includes(query),
      );
    }

    // 2. Status filter
    if (statusFilter && statusFilter.length > 0) {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      result = result.filter((item) => {
        const rawEvents = Array.isArray(item?.pastEvents)
          ? item.pastEvents
          : [];

        // Support weekly installs filter (stores installed in the past 7 days)
        if (statusFilter.includes("weekly")) {
          const hasRecentInstallEvent = rawEvents.some((ev) => {
            const evType = ev.type || ev.eventName || "";
            const isInstall =
              evType === "RELATIONSHIP_INSTALLED" ||
              evType.toLowerCase().includes("installed");
            const evDate = new Date(
              ev.timestamp || ev.occurredAt || ev.createdAt || 0,
            );
            return (
              isInstall && !isNaN(evDate.getTime()) && evDate >= sevenDaysAgo
            );
          });

          const createdDate =
            item.createdAt || item.createdOn || item.installedAt;
          const isCreatedRecent =
            createdDate &&
            !isNaN(new Date(createdDate).getTime()) &&
            new Date(createdDate) >= sevenDaysAgo;

          if (hasRecentInstallEvent || isCreatedRecent) return true;
          if (statusFilter.length === 1) return false;
        }

        let latestEventName = "";
        if (rawEvents.length > 0) {
          const sorted = [...rawEvents].sort(
            (a, b) => new Date(b.timestamp || 0) - new Date(a.timestamp || 0),
          );
          latestEventName = sorted[0]?.eventName || sorted[0]?.type || "";
        }
        const lowerEvent = latestEventName.toLowerCase();
        const isClosed =
          lowerEvent.includes("close") ||
          lowerEvent.includes("closed") ||
          item?.isStoreClosed;
        const isUninstall =
          lowerEvent.includes("uninstall") ||
          lowerEvent.includes("uninstalled") ||
          item?.isActive === false;
        const isReopened =
          lowerEvent.includes("reopen") || lowerEvent.includes("reopened");

        let itemStatus = "installed";
        if (isClosed) itemStatus = "closed";
        else if (isUninstall) itemStatus = "uninstalled";
        else if (isReopened) itemStatus = "reopened";

        return statusFilter.includes(itemStatus);
      });
    }

    // 3. Plan filter
    if (planFilter && planFilter.length > 0) {
      result = result.filter((item) =>
        planFilter.includes(item.plan || "No Plan"),
      );
    }

    // 3b. Active subscribers filter — keep only stores with an active paid plan
    if (activeSubscribers) {
      result = result.filter((item) => {
        const plan = (item.plan || "").trim();
        return plan && plan !== "No Plan";
      });
    }

    // 3c. Event-based filter — keep only stores that have a matching event in pastEvents
    if (eventFilter) {
      const normalizedFilter = eventFilter
        .toUpperCase()
        .replace(/_/g, " ")
        .replace(/LL/g, "L");
      result = result.filter((item) => {
        const rawEvents = Array.isArray(item?.pastEvents)
          ? item.pastEvents
          : [];
        return rawEvents.some((ev) => {
          const evType = (ev.type || ev.eventName || "")
            .toUpperCase()
            .replace(/_/g, " ")
            .replace(/LL/g, "L");
          return evType.includes(normalizedFilter);
        });
      });
    }

    // 4. Sort
    if (sortField) {
      result.sort((a, b) => {
        let valA, valB;

        if (sortField === "totalDays") {
          valA = getTotalDays(a);
          valB = getTotalDays(b);
        } else if (sortField === "isActive" || sortField === "status") {
          valA = getStatusLabel(a);
          valB = getStatusLabel(b);
        } else if (sortField === "createdOn") {
          const rawA = a.createdAt || a.createdOn || a.installedAt;
          const rawB = b.createdAt || b.createdOn || b.installedAt;
          valA = rawA ? new Date(rawA).getTime() : 0;
          valB = rawB ? new Date(rawB).getTime() : 0;
        } else if (sortField === "updatedAt") {
          valA = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
          valB = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
        } else if (sortField === "storeName") {
          valA = (a.storeName || a.name || a.storeDomain || "").toLowerCase();
          valB = (b.storeName || b.name || b.storeDomain || "").toLowerCase();
        } else if (sortField === "storeDomain") {
          valA = (a.storeDomain || "").toLowerCase();
          valB = (b.storeDomain || "").toLowerCase();
        } else if (sortField === "plan") {
          valA = (a.plan || "No Plan").toLowerCase();
          valB = (b.plan || "No Plan").toLowerCase();
        } else {
          valA = a[sortField];
          valB = b[sortField];
        }

        if (valA === undefined || valA === null) return 1;
        if (valB === undefined || valB === null) return -1;

        if (typeof valA === "string" && typeof valB === "string") {
          return sortOrder === "desc"
            ? valB.localeCompare(valA)
            : valA.localeCompare(valB);
        } else {
          return sortOrder === "desc" ? valB - valA : valA - valB;
        }
      });
    }

    return result;
  }, [
    discounts,
    search,
    statusFilter,
    planFilter,
    activeSubscribers,
    eventFilter,
    sortField,
    sortOrder,
  ]);

  const paginatedDiscounts = useMemo(() => {
    const startIndex = (page - 1) * limit;
    return filteredAndSortedDiscounts.slice(startIndex, startIndex + limit);
  }, [filteredAndSortedDiscounts, page, limit]);

  useEffect(() => {
    let isMounted = true;

    async function fetchStores() {
      setLoading(true);
      setDiscounts([]);
      setError("");
      try {
        const params = new URLSearchParams();
        if (startDate) params.append("startDate", startDate);
        if (endDate) params.append("endDate", endDate);
        const queryString = params.toString();
        const url = `${API_BASE_URL}/api/events/${encodeURIComponent(selectedApp)}${queryString ? `?${queryString}` : ""}`;

        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(
            `Failed to fetch merchant data: ${response.statusText}`,
          );
        }
        const json = await response.json();
        if (!isMounted) return;

        if (json.success && json.data) {
          let storesList = [];
          if (json.data.stores && Array.isArray(json.data.stores)) {
            storesList = json.data.stores;
          } else if (json.data.events && Array.isArray(json.data.events)) {
            // Fallback store extraction from events
            const storeMap = {};
            for (const ev of json.data.events) {
              const shopId =
                ev.shop?.id || ev.shop?.myshopifyDomain || "unknown";
              const domain =
                ev.shop?.myshopifyDomain ||
                (shopId !== "unknown"
                  ? shopId.replace("gid://partners/Shop/", "") +
                    ".myshopify.com"
                  : "unknown.myshopify.com");
              if (!storeMap[domain]) {
                const cleanName = domain.replace(".myshopify.com", "");
                const storeName =
                  ev.shop?.name ||
                  cleanName
                    .replace(/[-_]/g, " ")
                    .replace(/\b\w/g, (l) => l.toUpperCase());
                storeMap[domain] = {
                  _id: shopId,
                  storeName: storeName,
                  name: storeName,
                  storeDomain: domain,
                  ownerName: cleanName,
                  ownerEmail: `contact@${cleanName}.com`,
                  storeEmail: `contact@${cleanName}.com`,
                  country: "US",
                  phoneNumber: "+1 (555) 019-2834",
                  storeType: "Online Store",
                  isActive: false,
                  isStoreClosed: false,
                  createdAt: ev.occurredAt,
                  updatedAt: ev.occurredAt,
                  pastEvents: [],
                  discounts: [],
                };
              }
              const store = storeMap[domain];
              let eventLabel = ev.type
                .replace(/_/g, " ")
                .toLowerCase()
                .replace(/\b\w/g, (l) => l.toUpperCase());
              if (ev.type === "RELATIONSHIP_INSTALLED")
                eventLabel = "Installed";
              else if (ev.type === "RELATIONSHIP_UNINSTALLED")
                eventLabel = "Uninstalled";
              else if (ev.type === "RELATIONSHIP_REACTIVATED")
                eventLabel = "Reopened";
              else if (ev.type === "RELATIONSHIP_DEACTIVATED")
                eventLabel = "Store Closed";

              store.pastEvents.push({
                eventName: eventLabel,
                type: ev.type,
                timestamp: ev.occurredAt,
              });
              if (new Date(ev.occurredAt) < new Date(store.createdAt))
                store.createdAt = ev.occurredAt;
              if (new Date(ev.occurredAt) >= new Date(store.updatedAt)) {
                store.updatedAt = ev.occurredAt;
                if (
                  ev.type === "RELATIONSHIP_INSTALLED" ||
                  ev.type === "RELATIONSHIP_REACTIVATED"
                ) {
                  store.isActive = true;
                  store.isStoreClosed = false;
                } else if (ev.type === "RELATIONSHIP_UNINSTALLED") {
                  store.isActive = false;
                  store.isStoreClosed = false;
                } else if (ev.type === "RELATIONSHIP_DEACTIVATED") {
                  store.isActive = false;
                  store.isStoreClosed = true;
                }
              }
            }
            storesList = Object.values(storeMap).sort(
              (a, b) => new Date(b.updatedAt) - new Date(a.updatedAt),
            );
          } else {
            storesList = mockDiscounts;
          }

          setDiscounts(storesList);
          if (onTotalCountChange) {
            onTotalCountChange(storesList.length);
          }
        } else {
          throw new Error(json.error || "Failed to load stores.");
        }
      } catch (err) {
        console.error(`Error fetching merchants for ${selectedApp}:`, err);
        if (isMounted) {
          setError(err.message);
          // Fallback to mock data on network error so UI doesn't crash
          setDiscounts(mockDiscounts);
          if (onTotalCountChange) {
            onTotalCountChange(mockDiscounts.length);
          }
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    if (selectedApp) {
      fetchStores();
    }

    return () => {
      isMounted = false;
    };
  }, [selectedApp, startDate, endDate, onTotalCountChange]);

  const handleDateFilterChange = (range) => {
    if (propOnDateFilterChange) {
      propOnDateFilterChange(range);
    } else {
      setLocalDatePreset(range.preset);
      setLocalStartDate(range.startDate || "");
      setLocalEndDate(range.endDate || "");
    }
    setPage(1);
  };

  const handleRowClick = (storeDomain) => {
    if (storeDomain) {
      navigate(`/store/${encodeURIComponent(storeDomain)}`);
    }
  };

  return (
    <div className="py-6 px-4 md:px-8 bg-slate-50 min-h-[calc(100vh-64px)] w-full">
      {/* Error Alert */}
      {error && (
        <div className="mb-6 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
          <div>
            <span className="font-semibold">Connection Error: </span>
            {error} - Ensure the backend service is running on port 3000.
          </div>
        </div>
      )}

      {/* Main Content Area: Show TableSkeleton whenever loading */}
      {loading ? (
        <TableSkeleton />
      ) : (
        <Main_Table
          discounts={paginatedDiscounts}
          allDiscounts={discounts}
          totalCount={filteredAndSortedDiscounts.length}
          page={page}
          limit={limit}
          search={search}
          statusFilter={statusFilter}
          planFilter={planFilter}
          activeFiltersText={activeFiltersText}
          datePreset={datePreset}
          startDate={startDate}
          endDate={endDate}
          sortField={sortField}
          sortOrder={sortOrder}
          loading={loading}
          onSearchChange={(val) => {
            setSearch(val);
            setPage(1);
          }}
          onStatusFilterChange={(val) => {
            setStatusFilter(val);
            setPage(1);
          }}
          onDateFilterChange={handleDateFilterChange}
          onSortChange={(field, order) => {
            setSortField(field);
            setSortOrder(order);
            setPage(1);
          }}
          onPageChange={(newPage) => setPage(newPage)}
          onLimitChange={(newLimit) => {
            setLimit(newLimit);
            setPage(1);
          }}
          onPlanFilterChange={(selectedPlans) => {
            setPlanFilter(selectedPlans);
            setPage(1);
          }}
          onResetFilters={handleResetFilters}
          onRowClick={handleRowClick}
        />
      )}
    </div>
  );
};

export default All_Stores;
