import { useEffect, useState, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import Main_Table from "../components/Main_Table";
import { TableSkeleton } from "../components/SkeletonLoader";
import { AlertCircle } from "lucide-react";
import { mockDiscounts } from "../data/mockData";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

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

  // Clear state in history after reading
  useEffect(() => {
    if (location.state) {
      navigate(location.pathname, { replace: true, state: null });
    }
  }, [location, navigate]);

  const activeFiltersText = useMemo(() => {
    const parts = [];
    if (search) {
      parts.push(`search: ${search}`);
    }
    if (statusFilter && statusFilter.length > 0) {
      const mapped = statusFilter.map((s) => {
        if (s === "closed") return "storeclosed";
        if (s === "reopened") return "storereopened";
        return s;
      });
      parts.push(`event: ${mapped.join(", ")}`);
    }
    if (planFilter && planFilter.length > 0) {
      parts.push(`plan: ${planFilter.join(", ")}`);
    }
    return parts.join(", ");
  }, [search, statusFilter, planFilter]);

  const handleResetFilters = () => {
    setStatusFilter([]);
    setPlanFilter([]);
    setSearch("");
    setPage(1);
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
      result = result.filter((item) => {
        const rawEvents = Array.isArray(item?.pastEvents)
          ? item.pastEvents
          : [];
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

    // 4. Sort
    if (sortField) {
      result.sort((a, b) => {
        let valA = a[sortField];
        let valB = b[sortField];

        if (sortField === "createdOn") {
          valA = a.createdAt;
          valB = b.createdAt;
        }

        if (valA === undefined || valA === null) return 1;
        if (valB === undefined || valB === null) return -1;

        if (typeof valA === "string") {
          return sortOrder === "desc"
            ? valB.localeCompare(valA)
            : valA.localeCompare(valB);
        } else {
          return sortOrder === "desc" ? valB - valA : valA - valB;
        }
      });
    }

    return result;
  }, [discounts, search, statusFilter, planFilter, sortField, sortOrder]);

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
                const storeName = ev.shop?.name || cleanName.replace(/[-_]/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
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
