import { useState, useMemo, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  useReactTable,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  flexRender,
} from "@tanstack/react-table";
import {
  ArrowLeft,
  Store,
  AlertCircle,
  Tag,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import { StoreDetailsSkeleton } from "../components/SkeletonLoader";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

const Store_Details = ({ selectedApp = "All Apps" }) => {
  const { domain } = useParams();
  const navigate = useNavigate();

  const [storeData, setStoreData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let isMounted = true;
    async function fetchStoreDetails() {
      setLoading(true);
      setError("");
      try {
        const response = await fetch(
          `${API_BASE_URL}/api/events/${encodeURIComponent(selectedApp)}`,
        );
        if (!response.ok) {
          throw new Error(
            `Failed to load store details: ${response.statusText}`,
          );
        }
        const json = await response.json();
        if (!isMounted) return;

        if (json.success && json.data) {
          const storesList = json.data.stores || [];
          const match = storesList.find(
            (s) => s.storeDomain.toLowerCase() === (domain || "").toLowerCase(),
          );
          if (match) {
            setStoreData(match);
          } else {
            setStoreData((prev) => prev || null);
          }
        }
      } catch (err) {
        console.error("Error fetching live store details:", err);
        if (isMounted) setError(err.message);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    if (domain) {
      fetchStoreDetails();
    }

    return () => {
      isMounted = false;
    };
  }, [domain, selectedApp]);

  // Pagination for Activity Timeline
  const [timelinePage, setTimelinePage] = useState(1);
  const timelineLimit = 5;

  // Extract raw events from pastEvents array or object safely, including current state as top event
  const pastEventsList = useMemo(() => {
    let events = [];
    if (storeData?.pastEvents) {
      if (Array.isArray(storeData.pastEvents)) {
        events = [...storeData.pastEvents];
      } else if (typeof storeData.pastEvents === "object") {
        events = [storeData.pastEvents];
      }
    }

    // Include Current Event based on current store status / updatedAt if available
    if (storeData) {
      const currentStatusLabel = storeData.isStoreClosed
        ? "Store Closed"
        : storeData.isActive === false
          ? "Uninstalled"
          : "Installed";

      const currentTimestamp =
        storeData.updatedAt || storeData.createdAt || new Date().toISOString();

      // Check if top event already matches this current status & time to avoid duplicate
      const alreadyHasCurrent = events.some((ev) => {
        const title = (
          typeof ev === "string"
            ? ev
            : ev?.eventName ||
              ev?.title ||
              ev?.name ||
              ev?.status ||
              ev?.event ||
              ev?.type ||
              ""
        ).toLowerCase();
        return title === currentStatusLabel.toLowerCase();
      });

      if (!alreadyHasCurrent) {
        events.unshift({
          eventName: currentStatusLabel,
          timestamp: currentTimestamp,
          isCurrentEvent: true,
        });
      }
    }

    return events.sort((a, b) => {
      const timeA =
        typeof a === "string"
          ? new Date(a).getTime()
          : new Date(a?.timestamp || a?.createdAt || a?.date || 0).getTime();
      const timeB =
        typeof b === "string"
          ? new Date(b).getTime()
          : new Date(b?.timestamp || b?.createdAt || b?.date || 0).getTime();
      return timeB - timeA;
    });
  }, [storeData]);

  // Paginated Activity Timeline events
  const totalTimelineRecords = pastEventsList.length;
  const totalTimelinePages =
    Math.ceil(totalTimelineRecords / timelineLimit) || 1;

  const paginatedTimelineEvents = useMemo(() => {
    const start = (timelinePage - 1) * timelineLimit;
    return pastEventsList.slice(start, start + timelineLimit);
  }, [pastEventsList, timelinePage, timelineLimit]);

  const formatDateTime = (dateStr) => {
    if (!dateStr) return { dateStr: "N/A", yearStr: "", timeStr: "N/A" };
    const dateObj = new Date(dateStr);
    if (isNaN(dateObj.getTime()))
      return { dateStr: "N/A", yearStr: "", timeStr: "N/A" };

    const monthStr = dateObj.toLocaleString("en-US", { month: "short" });
    const dayStr = String(dateObj.getDate()).padStart(2, "0");
    const yearStr = String(dateObj.getFullYear());
    const timeStr = dateObj.toLocaleString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });

    return {
      dateStr: `${dayStr}-${monthStr}`,
      yearStr,
      timeStr,
    };
  };

  const discountsList = useMemo(
    () => (Array.isArray(storeData?.discounts) ? storeData.discounts : []),
    [storeData],
  );

  // TanStack Table columns definition
  const discountColumns = useMemo(
    () => [
      {
        accessorKey: "title",
        accessorFn: (row) => row.title || row.code || row.name || "",
        header: "Discount Name",
        cell: ({ row, getValue }) => {
          const name = getValue() || `Discount #${row.index + 1}`;
          return (
            <span className="font-semibold text-slate-900 text-sm">{name}</span>
          );
        },
      },
      {
        accessorKey: "discountType",
        accessorFn: (row) => row.discountType || row.type || "Percentage",
        header: "Discount Type",
        cell: ({ getValue }) => (
          <span className="text-xs text-slate-600 font-medium">
            {getValue()}
          </span>
        ),
      },
      {
        accessorKey: "usage",
        accessorFn: (row) => {
          const val =
            row.usage ?? row.usageCount ?? row.timesUsed ?? row.totalUsage ?? 0;
          return typeof val === "number" ? val : parseFloat(val) || 0;
        },
        header: "Usage",
        cell: ({ getValue }) => (
          <span className="text-xs font-semibold text-slate-800">
            {getValue()}
          </span>
        ),
      },
      {
        accessorKey: "totalOrderAmount",
        accessorFn: (row) => {
          const val =
            row.totalOrderAmount ??
            row.orderAmount ??
            row.totalOrdersValue ??
            row.totalSales ??
            row.totalOrdersAmount ??
            row.orderTotal ??
            row.sales ??
            0;
          return typeof val === "number" ? val : parseFloat(val) || 0;
        },
        header: "Total Order Amount",
        cell: ({ getValue }) => {
          const num = getValue();
          return (
            <span className="text-xs font-semibold text-slate-900">
              $
              {num.toLocaleString("en-US", {
                minimumFractionDigits: 0,
                maximumFractionDigits: 2,
              })}
            </span>
          );
        },
      },
      {
        accessorKey: "totalSavingGiven",
        accessorFn: (row) => {
          const val =
            row.totalSavingGiven ??
            row.totalSavingsAmount ??
            row.totalSavingsGiven ??
            row.totalSavings ??
            row.savings ??
            row.totalDiscountValue ??
            row.discountAmount ??
            0;
          return typeof val === "number" ? val : parseFloat(val) || 0;
        },
        header: "Total Saving Given",
        cell: ({ getValue }) => {
          const num = getValue();
          return (
            <span className="text-xs font-semibold text-slate-900">
              $
              {num.toLocaleString("en-US", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </span>
          );
        },
      },
      {
        accessorKey: "status",
        accessorFn: (row) =>
          (
            row.status ??
            row.discountStatus ??
            (row.isActive !== false ? "active" : "inactive")
          )
            .toString()
            .toLowerCase(),
        header: "Discount Status",
        cell: ({ getValue }) => {
          const statusStr = getValue();
          const isDiscActive = statusStr === "active";
          const label = statusStr.charAt(0).toUpperCase() + statusStr.slice(1);

          return (
            <span
              className={`inline-flex items-center px-2.5 py-0.5 rounded text-xs font-semibold border ${
                isDiscActive
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                  : "bg-slate-100 text-slate-600 border-slate-200"
              }`}
            >
              {label}
            </span>
          );
        },
      },
    ],
    [],
  );

  // eslint-disable-next-line react-hooks/incompatible-library
  const discountTable = useReactTable({
    data: discountsList,
    columns: discountColumns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    initialState: {
      pagination: {
        pageSize: 10,
      },
    },
  });

  if (loading) {
    return (
      <div className="py-6 px-4 md:px-8 bg-slate-50 min-h-[calc(100vh-64px)] w-full">
        <StoreDetailsSkeleton />
      </div>
    );
  }

  if (error || !storeData) {
    return (
      <div className="py-6 px-4 md:px-8 bg-slate-50 min-h-[calc(100vh-64px)] w-full">
        <button
          onClick={() => navigate("/")}
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600 hover:text-slate-900 mb-6 bg-white border border-slate-200 px-3 py-1.5 rounded-xl shadow-2xs transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Stores
        </button>
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
          <div>{error || "Store details unavailable."}</div>
        </div>
      </div>
    );
  }

  const ownerName = storeData.ownerName || "N/A";
  const ownerEmail = storeData.ownerEmail || storeData.storeEmail || "N/A";
  const phone = storeData.phone || storeData.phoneNumber || "N/A";
  const region =
    storeData.region || storeData.country || storeData.countryName || "N/A";

  return (
    <div className="py-6 px-4 md:px-8 bg-slate-50 min-h-[calc(100vh-64px)] w-full">
      {/* Grid Layout: Left Details Card & Right Timeline Card */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        {/* Left Column: Store Meta Card */}
        <div className="md:col-span-4 space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
            <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-100">
              <Store className="w-4 h-4 text-slate-400" />
              <h2 className="font-bold text-slate-900 text-sm uppercase tracking-wider">
                Store Metadata
              </h2>
            </div>

            <div className="space-y-4">
              <div>
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                  Owner Name
                </span>
                <p className="font-semibold text-slate-900 text-sm mt-0.5">
                  {ownerName}
                </p>
              </div>

              <div>
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                  Email
                </span>
                <p className="font-semibold text-slate-900 text-sm mt-0.5">
                  {ownerEmail}
                </p>
              </div>

              <div>
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                  Phone
                </span>
                <p className="font-semibold text-slate-900 text-sm mt-0.5">
                  {phone}
                </p>
              </div>

              <div>
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                  Region
                </span>
                <p className="font-semibold text-slate-900 text-sm mt-0.5">
                  {region}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Activity Timeline */}
        <div className="md:col-span-8 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex justify-between items-center mb-5 pb-3 border-b border-slate-100">
            <h2 className="font-bold text-slate-900 text-sm uppercase tracking-wider">
              Activity Timeline
            </h2>
            <span className="text-xs font-semibold text-slate-400">
              {totalTimelineRecords} total events
            </span>
          </div>

          <div className="space-y-6 pt-1">
            {totalTimelineRecords > 0 ? (
              paginatedTimelineEvents.map((eventItem, idx) => {
                const rawDateStr =
                  typeof eventItem === "string"
                    ? eventItem
                    : eventItem?.date ||
                      eventItem?.timestamp ||
                      eventItem?.createdAt;
                const parsed = formatDateTime(rawDateStr);

                const eventObj =
                  typeof eventItem === "object" && eventItem !== null
                    ? eventItem
                    : {};
                let eventTitle =
                  eventObj.eventName ||
                  eventObj.title ||
                  eventObj.name ||
                  eventObj.status ||
                  eventObj.event ||
                  eventObj.type;

                if (!eventTitle) {
                  if (typeof eventItem === "string") {
                    eventTitle = "Store Activity Event";
                  } else {
                    eventTitle = "Store Event";
                  }
                }

                const dateStr = parsed.dateStr;
                const yearStr = parsed.yearStr;
                const timeStr = parsed.timeStr;
                const isLastInPage = idx === paginatedTimelineEvents.length - 1;

                return (
                  <div key={idx} className="flex gap-4 items-center">
                    {/* Left Date Stack */}
                    <div className="min-w-16.25 text-right">
                      <p className="font-bold text-slate-900 text-xs leading-tight">
                        {dateStr}
                      </p>
                      <span className="text-[11px] text-slate-400 font-semibold block mt-0.5">
                        {yearStr}
                      </span>
                    </div>

                    {/* Timeline Node & Line */}
                    <div className="flex flex-col items-center relative self-stretch justify-center">
                      <div className="w-3.5 h-3.5 rounded-full border-2 border-slate-900 bg-white z-10 my-auto" />
                      {!isLastInPage && (
                        <div className="w-px bg-slate-200 absolute top-1/2 bottom-0 left-1/2 -translate-x-1/2" />
                      )}
                    </div>

                    {/* Right Event Card */}
                    <div
                      className={`flex-1 p-3 px-4 rounded-xl border ${eventObj.isCurrentEvent ? "border-indigo-200 bg-indigo-50/50" : "border-slate-100 bg-slate-50"}`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-bold text-slate-900 text-sm">
                          {eventTitle}
                        </p>
                        {(() => {
                          const lower = (eventTitle || "").toLowerCase();
                          let badgeClass =
                            "bg-slate-100 text-slate-700 border-slate-200";
                          let badgeText = eventTitle;

                          if (
                            lower.includes("reopen") ||
                            lower.includes("reopened")
                          ) {
                            badgeClass =
                              "bg-sky-50 text-sky-700 border-sky-200";
                            badgeText = "Reopened";
                          } else if (
                            lower.includes("close") ||
                            lower.includes("closed")
                          ) {
                            badgeClass =
                              "bg-amber-50 text-amber-700 border-amber-200";
                            badgeText = "Closed";
                          } else if (
                            lower.includes("uninstall") ||
                            lower.includes("uninstalled")
                          ) {
                            badgeClass =
                              "bg-rose-50 text-rose-700 border-rose-200";
                            badgeText = "Uninstalled";
                          } else if (
                            lower.includes("install") ||
                            lower.includes("installed")
                          ) {
                            badgeClass =
                              "bg-emerald-50 text-emerald-700 border-emerald-200";
                            badgeText = "Installed";
                          }

                          return (
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold border ${badgeClass}`}
                            >
                              {badgeText}
                            </span>
                          );
                        })()}
                      </div>
                      <span className="text-xs text-slate-400 block mt-1">
                        {timeStr}
                      </span>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="py-8 text-center text-xs text-slate-400 font-medium">
                No activity events recorded for this store.
              </div>
            )}
          </div>

          {/* Timeline Pagination Controls */}
          {totalTimelinePages > 1 && (
            <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <span>
                Showing{" "}
                <span className="font-semibold text-slate-900">
                  {(timelinePage - 1) * timelineLimit + 1}
                </span>{" "}
                to{" "}
                <span className="font-semibold text-slate-900">
                  {Math.min(timelinePage * timelineLimit, totalTimelineRecords)}
                </span>{" "}
                of{" "}
                <span className="font-semibold text-slate-900">
                  {totalTimelineRecords}
                </span>{" "}
                events
              </span>
              <div className="flex items-center gap-2">
                <span className="font-medium text-slate-600 mr-1">
                  Page {timelinePage} of {totalTimelinePages}
                </span>
                <button
                  type="button"
                  disabled={timelinePage <= 1}
                  onClick={() =>
                    setTimelinePage((prev) => Math.max(prev - 1, 1))
                  }
                  className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                  title="Previous Page"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  disabled={timelinePage >= totalTimelinePages}
                  onClick={() =>
                    setTimelinePage((prev) =>
                      Math.min(prev + 1, totalTimelinePages),
                    )
                  }
                  className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                  title="Next Page"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Full-Width Card: Discounts List */}
      <div className="mt-6 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Tag className="w-4 h-4 text-slate-400" />
            <h2 className="font-bold text-slate-900 text-sm uppercase tracking-wider">
              Discounts Configured ({discountsList.length})
            </h2>
          </div>
        </div>

        {discountsList.length > 0 ? (
          <div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  {discountTable.getHeaderGroups().map((headerGroup) => (
                    <tr
                      key={headerGroup.id}
                      className="border-b border-slate-200 bg-slate-50/80"
                    >
                      {headerGroup.headers.map((header) => (
                        <th
                          key={header.id}
                          className="px-4 py-3 text-xs font-bold text-slate-600 uppercase tracking-wider select-none cursor-pointer hover:bg-slate-100/80 transition-colors"
                          onClick={header.column.getToggleSortingHandler()}
                        >
                          <div className="flex items-center gap-1.5">
                            {flexRender(
                              header.column.columnDef.header,
                              header.getContext(),
                            )}
                            {header.column.getIsSorted() === "asc" ? (
                              <ArrowUp className="w-3.5 h-3.5 text-indigo-600" />
                            ) : header.column.getIsSorted() === "desc" ? (
                              <ArrowDown className="w-3.5 h-3.5 text-indigo-600" />
                            ) : (
                              <ArrowUpDown className="w-3.5 h-3.5 text-slate-300 opacity-0 group-hover:opacity-100" />
                            )}
                          </div>
                        </th>
                      ))}
                    </tr>
                  ))}
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {discountTable.getRowModel().rows.map((row) => (
                    <tr
                      key={row.id}
                      className="hover:bg-slate-50/60 transition-colors"
                    >
                      {row.getVisibleCells().map((cell) => (
                        <td key={cell.id} className="px-4 py-3 text-sm">
                          {flexRender(
                            cell.column.columnDef.cell,
                            cell.getContext(),
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* TanStack Table Pagination */}
            {discountTable.getPageCount() > 1 && (
              <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <span>
                  Showing{" "}
                  <span className="font-semibold text-slate-900">
                    {discountTable.getState().pagination.pageIndex *
                      discountTable.getState().pagination.pageSize +
                      1}
                  </span>{" "}
                  to{" "}
                  <span className="font-semibold text-slate-900">
                    {Math.min(
                      (discountTable.getState().pagination.pageIndex + 1) *
                        discountTable.getState().pagination.pageSize,
                      discountsList.length,
                    )}
                  </span>{" "}
                  of{" "}
                  <span className="font-semibold text-slate-900">
                    {discountsList.length}
                  </span>{" "}
                  discounts
                </span>
                <div className="flex items-center gap-2">
                  <span className="font-medium text-slate-600 mr-1">
                    Page {discountTable.getState().pagination.pageIndex + 1} of{" "}
                    {discountTable.getPageCount()}
                  </span>
                  <button
                    type="button"
                    disabled={!discountTable.getCanPreviousPage()}
                    onClick={() => discountTable.previousPage()}
                    className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    disabled={!discountTable.getCanNextPage()}
                    onClick={() => discountTable.nextPage()}
                    className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                  >
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <p className="text-xs text-slate-500 py-4">
            No discounts configured for this store.
          </p>
        )}
      </div>
    </div>
  );
};

export default Store_Details;
