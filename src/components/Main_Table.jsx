import { useState, useMemo, useRef, useEffect } from "react";
import {
  useReactTable,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  flexRender,
} from "@tanstack/react-table";
import { useNavigate } from "react-router-dom";
import {
  Search,
  X,
  Eye,
  ChevronDown,
  ArrowUp,
  ArrowDown,
  GripVertical,
  ExternalLink,
  Check,
  Download,
  ListFilter,
  SlidersHorizontal,
} from "lucide-react";

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

const CustomCheckbox = ({
  checked = false,
  indeterminate = false,
  onChange,
  onClick,
  className = "",
  size = "md",
}) => {
  const sizeClasses = size === "sm" ? "w-3.5 h-3.5 rounded" : "w-4 h-4 rounded";

  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      onClick={(e) => {
        if (onClick) onClick(e);
        if (onChange) onChange(e);
      }}
      className={`inline-flex items-center justify-center shrink-0 border transition-all cursor-pointer select-none ${sizeClasses} ${
        checked || indeterminate
          ? "bg-black border-black text-white shadow-2xs"
          : "bg-white border-slate-300 hover:border-slate-400 text-transparent"
      } ${className}`}
    >
      {checked ? (
        <Check className="w-3 h-3 text-white stroke-[3]" />
      ) : indeterminate ? (
        <span className="w-2 h-0.5 bg-white rounded-full" />
      ) : null}
    </button>
  );
};

const Main_Table = ({
  discounts = [],
  allDiscounts = [],
  totalCount,
  page = 1,
  limit = 10,
  search = "",
  statusFilter = [],
  planFilter = [],
  sortField = "updatedAt",
  sortOrder = "desc",
  loading = false,
  onSearchChange,
  onStatusFilterChange,
  onSortChange,
  onPageChange,
  onLimitChange,
  onRowClick,
  onPlanFilterChange,
  activeFiltersText = "",
  onResetFilters,
}) => {
  "use no memo";
  const navigate = useNavigate();
  const isServerSide = totalCount !== undefined;

  // Active popover column ID
  const [activeDropdown, setActiveDropdown] = useState(null);
  const activeDropdownRef = useRef(null);

  // Selected row keys
  const [selectedRowIds, setSelectedRowIds] = useState(new Set());

  const [columnOrder, setColumnOrder] = useState([
    "selection",
    "storeName",
    "storeDomain",
    "apps",
    "contact",
    "mrr",
    "lifetime",
    "totalDays",
    "isActive",
    "plan",
    "createdOn",
    "updatedAt",
    "actions",
  ]);
  const [draggedColumnId, setDraggedColumnId] = useState(null);
  const [columnVisibility, setColumnVisibility] = useState({});

  const getColumnLabel = (column) => {
    if (typeof column.columnDef.header === "string") {
      return column.columnDef.header;
    }
    const labels = {
      storeName: "Store Name",
      storeDomain: "Shop Domain",
      apps: "Apps",
      contact: "Contact",
      mrr: "MRR",
      lifetime: "Lifetime",
      totalDays: "Total Days",
      isActive: "Event",
      plan: "Plan",
      createdOn: "Created On",
      updatedAt: "Updated On",
      actions: "Action",
    };
    return labels[column.id] || column.id;
  };

  // Close popup when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        activeDropdownRef.current &&
        !activeDropdownRef.current.contains(event.target)
      ) {
        setActiveDropdown(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Helper to calculate status info
  const getStatusInfo = (rowData) => {
    const rawEvents = Array.isArray(rowData?.pastEvents)
      ? rowData.pastEvents
      : rowData?.pastEvents && typeof rowData.pastEvents === "object"
        ? [rowData.pastEvents]
        : [];

    let latestEventName = "";
    if (rawEvents.length > 0) {
      const sorted = [...rawEvents].sort((a, b) => {
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
      const latest = sorted[0];
      if (typeof latest === "string") {
        latestEventName = latest;
      } else if (typeof latest === "object" && latest !== null) {
        latestEventName =
          latest.eventName ||
          latest.title ||
          latest.name ||
          latest.status ||
          latest.event ||
          latest.type ||
          "";
      }
    }

    const lowerEvent = latestEventName.toLowerCase();
    if (lowerEvent.includes("reopen") || lowerEvent.includes("reopened")) {
      return {
        label: "Store Reopened",
        badgeClass: "bg-sky-50 text-sky-700 border-sky-200",
      };
    } else if (
      lowerEvent.includes("close") ||
      lowerEvent.includes("closed") ||
      rowData?.isStoreClosed
    ) {
      return {
        label: "Store Closed",
        badgeClass: "bg-amber-50 text-amber-700 border-amber-200",
      };
    } else if (
      lowerEvent.includes("uninstall") ||
      lowerEvent.includes("uninstalled") ||
      rowData?.isActive === false
    ) {
      return {
        label: "Uninstalled",
        badgeClass: "bg-rose-50 text-rose-700 border-rose-200",
      };
    } else {
      return {
        label: "Installed",
        badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200",
      };
    }
  };

  const statusOptions = useMemo(() => {
    const counts = {
      installed: 0,
      uninstalled: 0,
      closed: 0,
      reopened: 0,
    };
    allDiscounts.forEach((d) => {
      const rawEvents = Array.isArray(d?.pastEvents) ? d.pastEvents : [];
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
        d?.isStoreClosed;
      const isUninstall =
        lowerEvent.includes("uninstall") ||
        lowerEvent.includes("uninstalled") ||
        d?.isActive === false;
      const isReopened =
        lowerEvent.includes("reopen") || lowerEvent.includes("reopened");

      if (isClosed) counts.closed++;
      else if (isUninstall) counts.uninstalled++;
      else if (isReopened) counts.reopened++;
      else counts.installed++;
    });

    return [
      { label: "Installed", value: "installed", count: counts.installed },
      { label: "Uninstalled", value: "uninstalled", count: counts.uninstalled },
      { label: "Closed", value: "closed", count: counts.closed },
      { label: "Store Re-Opened", value: "reopened", count: counts.reopened },
    ];
  }, [allDiscounts]);

  const planOptions = useMemo(() => {
    const counts = {};
    allDiscounts.forEach((d) => {
      const plan = d.plan || "No Plan";
      counts[plan] = (counts[plan] || 0) + 1;
    });
    const uniquePlans = Array.from(
      new Set([...Object.keys(counts), ...planFilter]),
    );
    uniquePlans.sort((a, b) => {
      if (a === "No Plan") return -1;
      if (b === "No Plan") return 1;
      if (a === "Trial") return -1;
      if (b === "Trial") return 1;
      return a.localeCompare(b);
    });
    return uniquePlans.map((plan) => ({
      label: plan,
      value: plan,
      count: counts[plan] || 0,
    }));
  }, [allDiscounts, planFilter]);

  const columns = useMemo(
    () => [
      {
        id: "selection",
        header: ({ table }) => {
          const rows = table.getRowModel().rows;
          const isAllSelected =
            rows.length > 0 &&
            rows.every((r) =>
              selectedRowIds.has(
                r.original.storeDomain || r.original._id || r.id,
              ),
            );
          const isSomeSelected =
            rows.some((r) =>
              selectedRowIds.has(
                r.original.storeDomain || r.original._id || r.id,
              ),
            ) && !isAllSelected;

          return (
            <CustomCheckbox
              checked={isAllSelected}
              indeterminate={isSomeSelected}
              onChange={() => {
                setSelectedRowIds((prev) => {
                  const next = new Set(prev);
                  if (isAllSelected) {
                    rows.forEach((r) =>
                      next.delete(
                        r.original.storeDomain || r.original._id || r.id,
                      ),
                    );
                  } else {
                    rows.forEach((r) =>
                      next.add(
                        r.original.storeDomain || r.original._id || r.id,
                      ),
                    );
                  }
                  return next;
                });
              }}
              onClick={(e) => e.stopPropagation()}
            />
          );
        },
        enableSorting: false,
        cell: ({ row }) => {
          const rowKey = row.original.storeDomain || row.original._id || row.id;
          const isChecked = selectedRowIds.has(rowKey);
          return (
            <CustomCheckbox
              checked={isChecked}
              onChange={() => {
                setSelectedRowIds((prev) => {
                  const next = new Set(prev);
                  if (next.has(rowKey)) {
                    next.delete(rowKey);
                  } else {
                    next.add(rowKey);
                  }
                  return next;
                });
              }}
              onClick={(e) => e.stopPropagation()}
            />
          );
        },
      },
      {
        id: "storeName",
        accessorFn: (row) =>
          row?.storeName ||
          row?.name ||
          (row?.storeDomain
            ? row.storeDomain
                .replace(".myshopify.com", "")
                .replace(/[-_]/g, " ")
                .replace(/\b\w/g, (l) => l.toUpperCase())
            : "Store"),
        header: "Store Name",
        enableSorting: true,
        cell: ({ getValue }) => {
          const name = getValue() || "N/A";
          return (
            <span className="font-semibold text-slate-900 text-xs whitespace-nowrap">
              {name}
            </span>
          );
        },
      },
      {
        accessorKey: "storeDomain",
        header: "Domain",
        enableSorting: true,
        cell: ({ getValue }) => {
          const domain = getValue() || "N/A";
          return (
            <a
              href={`https://${domain}`}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="inline-flex items-center gap-1.5 font-medium text-slate-700 hover:text-indigo-600 transition-colors text-xs group whitespace-nowrap"
            >
              <span>{domain}</span>
              <ExternalLink className="w-3.5 h-3.5 opacity-40 group-hover:opacity-100 transition-opacity" />
            </a>
          );
        },
      },
      {
        id: "apps",
        accessorFn: (row) => row.appsString || row.appName || "App",
        header: "Apps",
        enableSorting: true,
        cell: ({ row }) => {
          const appsList = Array.isArray(row.original.apps) && row.original.apps.length > 0
            ? row.original.apps
            : [row.original.appsString || row.original.appName || "App"];

          const appChunks = [];
          for (let i = 0; i < appsList.length; i += 2) {
            const isLastChunk = i + 2 >= appsList.length;
            const chunkStr = appsList.slice(i, i + 2).join(", ");
            appChunks.push(isLastChunk ? chunkStr : `${chunkStr},`);
          }

          return (
            <div className="flex flex-col text-slate-700 font-medium text-xs py-0.5 leading-snug">
              {appChunks.map((lineText, idx) => (
                <span key={idx} className="whitespace-nowrap">
                  {lineText}
                </span>
              ))}
            </div>
          );
        },
      },
      {
        id: "contact",
        accessorFn: (row) =>
          row.contactEmail ||
          row.ownerEmail ||
          row.storeEmail ||
          row.email ||
          null,
        header: "Contact",
        enableSorting: true,
        cell: ({ getValue }) => {
          const email = getValue();
          if (!email) {
            return <span className="text-slate-300 font-normal text-xs">-</span>;
          }
          return (
            <a
              href={`mailto:${email}`}
              onClick={(e) => e.stopPropagation()}
              className="font-medium text-slate-700 hover:text-indigo-600 transition-colors text-xs whitespace-nowrap"
            >
              {email}
            </a>
          );
        },
      },
      {
        id: "mrr",
        accessorFn: (row) => row.mrr || 0,
        header: "MRR",
        enableSorting: true,
        cell: ({ getValue }) => {
          const val = getValue() || 0;
          return (
            <span className="font-semibold text-slate-900 text-xs whitespace-nowrap">
              {val > 0 ? `$${val.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : <span className="text-slate-300 font-normal">-</span>}
            </span>
          );
        },
      },
      {
        id: "lifetime",
        accessorFn: (row) => row.lifetime || 0,
        header: "Lifetime",
        enableSorting: true,
        cell: ({ getValue }) => {
          const val = getValue() || 0;
          return (
            <span className="font-semibold text-slate-900 text-xs whitespace-nowrap">
              {val > 0 ? `$${val.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}` : <span className="text-slate-300 font-normal">$0</span>}
            </span>
          );
        },
      },
      {
        id: "totalDays",
        accessorFn: (row) => getTotalDays(row),
        header: "Total Days",
        enableSorting: true,
        cell: ({ getValue }) => {
          const days = getValue();
          return (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200 whitespace-nowrap shadow-2xs">
              {days} {days === 1 ? "day" : "days"}
            </span>
          );
        },
      },
      {
        accessorKey: "isActive",
        header: "Status",
        enableSorting: true,
        cell: ({ row }) => {
          const status = getStatusInfo(row.original);
          return (
            <span
              className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-semibold border whitespace-nowrap ${status.badgeClass}`}
            >
              {status.label}
            </span>
          );
        },
      },
      {
        accessorKey: "plan",
        header: "Plan",
        enableSorting: true,
        cell: ({ getValue }) => {
          const val = getValue() || "N/A";
          if (val === "Trial") {
            return (
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold border bg-orange-100/70 text-orange-700 border-orange-200 uppercase tracking-wider whitespace-nowrap">
                TRIAL
              </span>
            );
          }
          if (val.endsWith(" Trial")) {
            const cleanPlan = val.replace(" Trial", "");
            return (
              <div className="flex items-center gap-1.5 whitespace-nowrap">
                <span className="font-semibold text-slate-700 text-xs">
                  {cleanPlan}
                </span>
                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-semibold border bg-orange-100/70 text-orange-700 border-orange-200 uppercase tracking-wider">
                  TRIAL
                </span>
              </div>
            );
          }
          return (
            <span className="font-semibold text-slate-700 text-xs whitespace-nowrap">
              {val}
            </span>
          );
        },
      },
      {
        id: "createdOn",
        accessorFn: (row) => {
          const rawEvents = Array.isArray(row?.pastEvents)
            ? row.pastEvents
            : row?.pastEvents && typeof row.pastEvents === "object"
              ? [row.pastEvents]
              : [];
          if (rawEvents.length > 0) {
            const sorted = [...rawEvents].sort((a, b) => {
              const timeA =
                typeof a === "string"
                  ? new Date(a).getTime()
                  : new Date(
                      a?.timestamp || a?.createdAt || a?.date || 0,
                    ).getTime();
              const timeB =
                typeof b === "string"
                  ? new Date(b).getTime()
                  : new Date(
                      b?.timestamp || b?.createdAt || b?.date || 0,
                    ).getTime();
              return timeA - timeB;
            });
            const earliest = sorted[0];
            const rawDate =
              typeof earliest === "string"
                ? earliest
                : earliest?.timestamp || earliest?.createdAt || earliest?.date;
            if (rawDate) return rawDate;
          }
          return row?.createdAt || row?.createdOn || row?.installedAt || null;
        },
        header: "Created On",
        enableSorting: true,
        cell: ({ getValue }) => {
          const val = getValue();
          return (
            <span className="text-slate-500 font-medium text-xs whitespace-nowrap">
              {val
                ? new Date(val).toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })
                : "N/A"}
            </span>
          );
        },
      },
      {
        accessorKey: "updatedAt",
        header: "Updated",
        enableSorting: true,
        cell: ({ getValue }) => {
          const val = getValue();
          return (
            <span className="text-slate-500 font-medium text-xs whitespace-nowrap">
              {val
                ? new Date(val).toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })
                : "N/A"}
            </span>
          );
        },
      },
      {
        id: "actions",
        header: "Action",
        enableSorting: false,
        cell: ({ row }) => (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              if (onRowClick) {
                onRowClick(row.original.storeDomain);
              } else {
                navigate(
                  `/store/${encodeURIComponent(row.original.storeDomain)}`,
                );
              }
            }}
            className="inline-flex items-center justify-center p-1.5 text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-100 hover:text-slate-900 transition-colors shadow-xs cursor-pointer"
            title="View Store Details"
          >
            <Eye className="w-4 h-4" />
          </button>
        ),
      },
    ],
    [navigate, onRowClick, selectedRowIds],
  );

  const sortingState = useMemo(
    () => (sortField ? [{ id: sortField, desc: sortOrder === "desc" }] : []),
    [sortField, sortOrder],
  );

  const paginationState = useMemo(
    () => ({
      pageIndex: Math.max(0, page - 1),
      pageSize: limit,
    }),
    [page, limit],
  );

  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data: discounts,
    columns,
    pageCount: isServerSide ? Math.ceil((totalCount || 0) / limit) : undefined,
    manualPagination: isServerSide,
    manualSorting: isServerSide,
    manualFiltering: isServerSide,
    state: {
      sorting: sortingState,
      pagination: paginationState,
      columnOrder,
      columnVisibility,
    },
    onColumnOrderChange: setColumnOrder,
    onColumnVisibilityChange: setColumnVisibility,
    onSortingChange: (updater) => {
      if (!onSortChange) return;
      const nextSorting =
        typeof updater === "function" ? updater(sortingState) : updater;
      if (nextSorting.length > 0) {
        onSortChange(nextSorting[0].id, nextSorting[0].desc ? "desc" : "asc");
      } else {
        onSortChange("updatedAt", "desc");
      }
    },
    onPaginationChange: (updater) => {
      const nextPagination =
        typeof updater === "function" ? updater(paginationState) : updater;
      if (onPageChange && nextPagination.pageIndex + 1 !== page) {
        onPageChange(nextPagination.pageIndex + 1);
      }
      if (onLimitChange && nextPagination.pageSize !== limit) {
        onLimitChange(nextPagination.pageSize);
      }
    },
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  const totalRecords = totalCount !== undefined ? totalCount : discounts.length;
  const totalPages = Math.ceil(totalRecords / limit) || 1;
  const startRecord = totalRecords === 0 ? 0 : (page - 1) * limit + 1;
  const endRecord = Math.min(page * limit, totalRecords);

  // Drag and Drop handlers
  const handleDragStart = (e, columnId) => {
    setDraggedColumnId(columnId);
    e.dataTransfer.setData("text/plain", columnId);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = (e, targetColumnId) => {
    e.preventDefault();
    if (!draggedColumnId || draggedColumnId === targetColumnId) return;

    setColumnOrder((prevOrder) => {
      const currentOrder = [...prevOrder];
      const fromIndex = currentOrder.indexOf(draggedColumnId);
      const toIndex = currentOrder.indexOf(targetColumnId);
      if (fromIndex !== -1 && toIndex !== -1) {
        currentOrder.splice(fromIndex, 1);
        currentOrder.splice(toIndex, 0, draggedColumnId);
      }
      return currentOrder;
    });
    setDraggedColumnId(null);
  };

  const handleExport = () => {
    let listToExport = allDiscounts.length > 0 ? allDiscounts : discounts;
    if (selectedRowIds.size > 0) {
      listToExport = listToExport.filter((d) =>
        selectedRowIds.has(d.storeDomain || d._id || d.id),
      );
    }
    if (listToExport.length === 0) return;

    const exportRows = listToExport.map((d) => {
      const status = getStatusInfo(d);
      return {
        "Store Name": d.storeName || d.name || d.storeDomain || "",
        Domain: d.storeDomain || "",
        "Total Days": getTotalDays(d),
        Status: status.label,
        Plan: d.plan || "No Plan",
        "Created On": d.createdAt || d.createdOn || "",
        Updated: d.updatedAt || "",
      };
    });

    const headers = Object.keys(exportRows[0]);
    const csvContent = [
      headers.join(","),
      ...exportRows.map((row) =>
        headers
          .map((header) => {
            const val = `${row[header] || ""}`.replace(/"/g, '""');
            return `"${val}"`;
          })
          .join(","),
      ),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `merchants_export_${new Date().toISOString().slice(0, 10)}.csv`,
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="w-full bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
      {/* Toolbar: Dynamic left aligned title and right aligned static search */}
      <div className="p-5 border-b border-slate-100 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h2 className="text-base font-bold text-slate-800 tracking-tight">
          Installation Database
        </h2>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex items-center">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <Search className="w-4 h-4" />
            </div>
            <input
              type="text"
              value={search}
              onChange={(e) => onSearchChange && onSearchChange(e.target.value)}
              placeholder="Search domain, name or email..."
              className="w-60 sm:w-72 h-10 pl-9 pr-8 py-2.5 text-xs bg-white border border-slate-200/90 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all placeholder:text-slate-400 text-slate-900 font-semibold box-border"
            />
            {search && (
              <button
                type="button"
                onClick={() => onSearchChange && onSearchChange("")}
                className="absolute right-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                title="Clear Search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          <select
            value={limit}
            onChange={(e) =>
              onLimitChange && onLimitChange(Number(e.target.value))
            }
            className="h-10 px-3.5 py-2.5 bg-white border border-slate-200/90 rounded-lg font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 cursor-pointer text-xs transition-all box-border"
          >
            <option value={10}>10 per page</option>
            <option value={25}>25 per page</option>
            <option value={50}>50 per page</option>
            <option value={100}>100 per page</option>
          </select>

          <button
            type="button"
            onClick={handleExport}
            className="h-10 inline-flex items-center gap-1.5 px-3.5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-semibold text-xs transition-colors shadow-2xs cursor-pointer box-border"
            title="Export merchant records"
          >
            <Download className="w-3.5 h-3.5" />
            <span>
              Export (
              {selectedRowIds.size > 0
                ? selectedRowIds.size.toLocaleString()
                : totalRecords.toLocaleString()}
              )
            </span>
          </button>

          {/* Column Visibility Toggle Button & Popover */}
          <div
            className="relative inline-block"
            ref={
              activeDropdown === "columnVisibility" ? activeDropdownRef : null
            }
          >
            <button
              type="button"
              onClick={() =>
                setActiveDropdown((prev) =>
                  prev === "columnVisibility" ? null : "columnVisibility",
                )
              }
              className={`h-10 inline-flex items-center gap-2 px-3.5 py-2.5 rounded-lg font-semibold text-xs transition-all shadow-2xs cursor-pointer border box-border ${
                activeDropdown === "columnVisibility"
                  ? "bg-slate-900 text-white border-slate-900 hover:bg-slate-800"
                  : "bg-white text-slate-800 border-slate-200/90 hover:bg-slate-50 hover:border-slate-300"
              }`}
              title="Hide/Show Columns"
            >
              <SlidersHorizontal
                className={`w-3.5 h-3.5 transition-colors ${
                  activeDropdown === "columnVisibility"
                    ? "text-white"
                    : "text-slate-700"
                }`}
              />
              <span
                className={`rounded px-1.5 py-0.5 text-[10px] font-bold min-w-[18px] text-center leading-none transition-colors ${
                  activeDropdown === "columnVisibility"
                    ? "bg-slate-700 text-white"
                    : "bg-slate-900 text-white"
                }`}
              >
                {
                  table
                    .getAllLeafColumns()
                    .filter(
                      (col) => col.id !== "selection" && col.getIsVisible(),
                    ).length
                }
              </span>
            </button>

            {activeDropdown === "columnVisibility" && (
              <div
                className="absolute right-0 top-full mt-2 w-56 bg-white border border-slate-200 rounded-xl shadow-xl z-50 p-4 text-xs animate-in fade-in slide-in-from-top-1 duration-150"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">
                  VISIBLE COLUMNS
                </div>
                <div className="max-h-64 overflow-y-auto space-y-1 pr-0.5">
                  {table
                    .getAllLeafColumns()
                    .filter((col) => col.id !== "selection")
                    .map((col) => {
                      const isVisible = col.getIsVisible();
                      return (
                        <label
                          key={col.id}
                          className="flex items-center justify-between px-2.5 py-1.5 hover:bg-slate-50 rounded-lg cursor-pointer transition-colors select-none"
                        >
                          <span
                            className={`text-xs transition-colors ${
                              isVisible
                                ? "font-semibold text-slate-800"
                                : "font-normal text-slate-400"
                            }`}
                          >
                            {getColumnLabel(col)}
                          </span>
                          <CustomCheckbox
                            size="sm"
                            checked={isVisible}
                            onChange={col.getToggleVisibilityHandler()}
                            onClick={(e) => e.stopPropagation()}
                          />
                        </label>
                      );
                    })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Filter banner placed inside card directly below toolbar */}
      {activeFiltersText && (
        <div className="mx-5 my-4 p-3.5 sm:px-4 rounded-xl bg-[#f3f4f6] border border-slate-300 text-xs text-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3 font-normal animate-in fade-in duration-150">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-slate-600 font-normal">
              Filtering merchants by clicked chart/metric criteria:
            </span>
            <span className="font-mono bg-[#e5e7eb] border border-slate-300 rounded px-2 py-0.5 text-slate-900 font-bold text-xs">
              {activeFiltersText}
            </span>
          </div>
          <button
            onClick={onResetFilters}
            className="bg-white border border-slate-300 hover:bg-slate-100 text-slate-900 px-3.5 py-1 rounded text-xs font-bold transition-all cursor-pointer whitespace-nowrap shadow-2xs"
          >
            Reset Filters
          </button>
        </div>
      )}

      {/* Table Container */}
      <div className="overflow-x-auto relative">
        <table className="w-full text-left border-collapse">
          <thead>
            {table.getHeaderGroups().map((headerGroup) => (
              <tr
                key={headerGroup.id}
                className="border-b border-slate-200 bg-slate-50/80"
              >
                {headerGroup.headers.map((header, headerIndex) => {
                  if (header.id === "selection") {
                    return (
                      <th
                        key={header.id}
                        className="w-10 px-4 py-3.5 text-center text-xs font-bold text-slate-600 sticky left-0 z-30 bg-slate-50 border-r border-slate-200 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.06)]"
                      >
                        {flexRender(
                          header.column.columnDef.header,
                          header.getContext(),
                        )}
                      </th>
                    );
                  }

                  const canSort = header.column.getCanSort();
                  const isSorted = sortField === header.id ? sortOrder : null;
                  const isStatusColumn = header.id === "isActive";
                  const isPlanColumn = header.id === "plan";
                  const hasFilterOrSort =
                    canSort || isStatusColumn || isPlanColumn;
                  const isDropdownOpen = activeDropdown === header.id;
                  const isFirstDataColumn = headerIndex === 1;

                  return (
                    <th
                      key={header.id}
                      draggable={true}
                      onDragStart={(e) => handleDragStart(e, header.id)}
                      onDragOver={handleDragOver}
                      onDrop={(e) => handleDrop(e, header.id)}
                      className={`whitespace-nowrap px-4 py-3.5 text-xs font-bold text-slate-600 uppercase tracking-wider relative transition-colors ${
                        isFirstDataColumn
                          ? "sticky left-10 z-20 bg-slate-50 border-r border-slate-200 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.06)]"
                          : ""
                      } ${draggedColumnId === header.id ? "opacity-40 bg-slate-200" : ""}`}
                    >
                      <div className="flex items-center gap-2">
                        {/* Drag Handle */}
                        <span className="cursor-grab active:cursor-grabbing text-slate-300 hover:text-slate-500">
                          <GripVertical className="w-3.5 h-3.5" />
                        </span>

                        {/* Column Title */}
                        <span>
                          {flexRender(
                            header.column.columnDef.header,
                            header.getContext(),
                          )}
                        </span>

                        {/* Active Directional Sort Icon (if sorted) */}
                        {isSorted && (
                          <span className="inline-flex items-center text-slate-900">
                            {isSorted === "asc" ? (
                              <ArrowUp className="w-3 h-3 text-slate-900" />
                            ) : (
                              <ArrowDown className="w-3 h-3 text-slate-900" />
                            )}
                          </span>
                        )}

                        {/* Dropdown Sort & Filter Trigger & Popover */}
                        {hasFilterOrSort && (
                          <div
                            className="relative inline-flex items-center"
                            ref={isDropdownOpen ? activeDropdownRef : null}
                          >
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveDropdown((prev) =>
                                  prev === header.id ? null : header.id,
                                );
                              }}
                              className={`p-1 rounded-md transition-all flex items-center justify-center cursor-pointer ${
                                isDropdownOpen ||
                                isSorted ||
                                (isStatusColumn && statusFilter.length > 0) ||
                                (isPlanColumn && planFilter.length > 0)
                                  ? "border border-slate-300 bg-white shadow-2xs text-slate-800"
                                  : "text-slate-400 hover:text-slate-700 hover:bg-slate-200/60"
                              }`}
                              title={`Sort & Filter ${typeof header.column.columnDef.header === "string" ? header.column.columnDef.header : header.id}`}
                            >
                              {isStatusColumn || isPlanColumn ? (
                                <ListFilter
                                  className={`w-3.5 h-3.5 ${
                                    (isStatusColumn &&
                                      statusFilter.length > 0) ||
                                    (isPlanColumn && planFilter.length > 0)
                                      ? "text-indigo-600"
                                      : isDropdownOpen
                                        ? "text-slate-900"
                                        : "text-slate-500"
                                  }`}
                                />
                              ) : (
                                <ChevronDown
                                  className={`w-3 h-3 transition-transform ${
                                    isDropdownOpen
                                      ? "rotate-180 text-slate-900"
                                      : ""
                                  }`}
                                />
                              )}
                            </button>

                            {/* Popover Dropdown Menu */}
                            {isDropdownOpen && (
                              <div
                                className="absolute left-0 top-full mt-1.5 min-w-[170px] bg-white rounded-xl shadow-xl border border-slate-200 z-50 p-2 text-xs normal-case font-normal animate-in fade-in slide-in-from-top-1 duration-150"
                                onClick={(e) => e.stopPropagation()}
                              >
                                {/* SORT SECTION */}
                                {canSort && (
                                  <>
                                    <div className="px-2 py-1 font-bold text-slate-400 uppercase tracking-wider text-[10px]">
                                      SORT
                                    </div>
                                    <div className="space-y-0.5 mb-1">
                                      <button
                                        type="button"
                                        onClick={() => {
                                          if (onSortChange)
                                            onSortChange(header.id, "asc");
                                          setActiveDropdown(null);
                                        }}
                                        className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors text-left cursor-pointer ${
                                          isSorted === "asc"
                                            ? "bg-slate-100 text-slate-900 font-semibold"
                                            : "text-slate-700 hover:bg-slate-50 hover:text-slate-900"
                                        }`}
                                      >
                                        <span className="flex items-center gap-2">
                                          <ArrowUp className="w-3.5 h-3.5 text-slate-500" />
                                          <span>Sort Ascending</span>
                                        </span>
                                        {isSorted === "asc" && (
                                          <Check className="w-3.5 h-3.5 text-indigo-600" />
                                        )}
                                      </button>

                                      <button
                                        type="button"
                                        onClick={() => {
                                          if (onSortChange)
                                            onSortChange(header.id, "desc");
                                          setActiveDropdown(null);
                                        }}
                                        className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors text-left cursor-pointer ${
                                          isSorted === "desc"
                                            ? "bg-slate-100 text-slate-900 font-semibold"
                                            : "text-slate-700 hover:bg-slate-50 hover:text-slate-900"
                                        }`}
                                      >
                                        <span className="flex items-center gap-2">
                                          <ArrowDown className="w-3.5 h-3.5 text-slate-500" />
                                          <span>Sort Descending</span>
                                        </span>
                                        {isSorted === "desc" && (
                                          <Check className="w-3.5 h-3.5 text-indigo-600" />
                                        )}
                                      </button>
                                    </div>
                                  </>
                                )}

                                {/* STATUS FILTER SECTION */}
                                {isStatusColumn && (
                                  <>
                                    {canSort && (
                                      <div className="my-1.5 border-t border-slate-100" />
                                    )}
                                    <div className="px-2 py-1 font-bold text-slate-400 uppercase tracking-wider text-[10px] flex items-center justify-between">
                                      <span>FILTER</span>
                                      {statusFilter.length > 0 && (
                                        <button
                                          type="button"
                                          onClick={() => {
                                            if (onStatusFilterChange)
                                              onStatusFilterChange([]);
                                            setActiveDropdown(null);
                                          }}
                                          className="text-rose-600 hover:underline text-[10px] normal-case font-bold cursor-pointer"
                                        >
                                          Clear
                                        </button>
                                      )}
                                    </div>

                                    <div className="space-y-1 mt-1 max-h-48 overflow-y-auto">
                                      {statusOptions.map((option) => {
                                        const isChecked = statusFilter.includes(
                                          option.value,
                                        );
                                        return (
                                          <label
                                            key={option.value}
                                            className="flex items-center justify-between px-2 py-1 hover:bg-slate-50 rounded-lg cursor-pointer transition-colors"
                                          >
                                            <span className="flex items-center gap-2 text-slate-700 font-medium">
                                              <CustomCheckbox
                                                size="sm"
                                                checked={isChecked}
                                                onChange={() => {
                                                  if (!onStatusFilterChange)
                                                    return;
                                                  const nextFilter = isChecked
                                                    ? statusFilter.filter(
                                                        (v) =>
                                                          v !== option.value,
                                                      )
                                                    : [
                                                        ...statusFilter,
                                                        option.value,
                                                      ];
                                                  onStatusFilterChange(
                                                    nextFilter,
                                                  );
                                                }}
                                              />
                                              {option.label}
                                            </span>
                                            <span className="text-[10px] font-bold text-slate-400 bg-slate-50 border border-slate-100 px-1.5 py-0.5 rounded-md">
                                              {option.count}
                                            </span>
                                          </label>
                                        );
                                      })}
                                    </div>
                                  </>
                                )}

                                {/* PLAN FILTER SECTION */}
                                {isPlanColumn && (
                                  <>
                                    {canSort && (
                                      <div className="my-1.5 border-t border-slate-100" />
                                    )}
                                    <div className="px-2 py-1 font-bold text-slate-400 uppercase tracking-wider text-[10px] flex items-center justify-between">
                                      <span>FILTER</span>
                                      {planFilter.length > 0 && (
                                        <button
                                          type="button"
                                          onClick={() => {
                                            if (onPlanFilterChange)
                                              onPlanFilterChange([]);
                                            setActiveDropdown(null);
                                          }}
                                          className="text-rose-600 hover:underline text-[10px] normal-case font-bold cursor-pointer"
                                        >
                                          Clear
                                        </button>
                                      )}
                                    </div>

                                    <div className="space-y-1 mt-1 max-h-48 overflow-y-auto pr-1">
                                      {planOptions.map((option) => {
                                        const isChecked = planFilter.includes(
                                          option.value,
                                        );
                                        return (
                                          <label
                                            key={option.value}
                                            className="flex items-center justify-between px-2 py-1 hover:bg-slate-50 rounded-lg cursor-pointer transition-colors"
                                          >
                                            <span className="flex items-center gap-2 text-slate-700 font-medium">
                                              <CustomCheckbox
                                                size="sm"
                                                checked={isChecked}
                                                onChange={() => {
                                                  if (!onPlanFilterChange)
                                                    return;
                                                  const nextFilter = isChecked
                                                    ? planFilter.filter(
                                                        (v) =>
                                                          v !== option.value,
                                                      )
                                                    : [
                                                        ...planFilter,
                                                        option.value,
                                                      ];
                                                  onPlanFilterChange(
                                                    nextFilter,
                                                  );
                                                }}
                                              />
                                              {option.label.endsWith(
                                                " Trial",
                                              ) ? (
                                                <span className="inline-flex items-center gap-1">
                                                  <span>
                                                    {option.label.replace(
                                                      " Trial",
                                                      "",
                                                    )}
                                                  </span>
                                                  <span className="inline-flex items-center px-1 py-0.2 rounded-[3px] text-[8px] font-bold border bg-orange-100/70 text-orange-700 border-orange-200 uppercase tracking-wider scale-90">
                                                    TRIAL
                                                  </span>
                                                </span>
                                              ) : option.label === "Trial" ? (
                                                <span className="inline-flex items-center px-1 py-0.2 rounded-[3px] text-[8px] font-bold border bg-orange-100/70 text-orange-700 border-orange-200 uppercase tracking-wider scale-90">
                                                  TRIAL
                                                </span>
                                              ) : (
                                                option.label
                                              )}
                                            </span>
                                            <span className="text-[10px] font-bold text-slate-400 bg-slate-50 border border-slate-100 px-1.5 py-0.5 rounded-md">
                                              {option.count}
                                            </span>
                                          </label>
                                        );
                                      })}
                                    </div>
                                  </>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </th>
                  );
                })}
              </tr>
            ))}
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {loading && discounts.length === 0 ? (
              <tr>
                <td
                  colSpan={table.getVisibleFlatColumns().length}
                  className="px-5 py-12 text-center text-slate-500 text-sm"
                >
                  Loading stores...
                </td>
              </tr>
            ) : table.getRowModel().rows.length === 0 ? (
              <tr>
                <td
                  colSpan={table.getVisibleFlatColumns().length}
                  className="px-5 py-12 text-center text-slate-500 text-sm"
                >
                  No stores found matching your criteria.
                </td>
              </tr>
            ) : (
              table.getRowModel().rows.map((row) => (
                <tr
                  key={row.id}
                  onClick={() => {
                    if (onRowClick) {
                      onRowClick(row.original.storeDomain);
                    } else {
                      navigate(
                        `/store/${encodeURIComponent(row.original.storeDomain)}`,
                      );
                    }
                  }}
                  className="hover:bg-slate-50/80 transition-colors cursor-pointer group"
                >
                  {row.getVisibleCells().map((cell, cellIndex) => {
                    const isSelectionColumn = cell.column.id === "selection";
                    const isFirstDataColumn = cellIndex === 1;

                    return (
                      <td
                        key={cell.id}
                        className={`whitespace-nowrap px-4 py-3.5 align-middle ${
                          isSelectionColumn
                            ? "w-10 text-center sticky left-0 z-10 bg-white group-hover:bg-slate-50 border-r border-slate-200 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.06)]"
                            : isFirstDataColumn
                              ? "sticky left-10 z-10 bg-white group-hover:bg-slate-50 border-r border-slate-200 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.06)]"
                              : ""
                        }`}
                      >
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext(),
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="px-5 py-3.5 border-t border-slate-100 bg-white flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600">
          <div>
            Showing Page{" "}
            <span className="font-bold text-slate-900">{page}</span> of{" "}
            <span className="font-bold text-slate-900">{totalPages}</span>{" "}
            <span className="text-slate-400 font-normal">
              ({startRecord.toLocaleString()}-{endRecord.toLocaleString()} of{" "}
              {totalRecords.toLocaleString()} total entries)
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => onPageChange && onPageChange(page - 1)}
              className="px-3.5 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:bg-slate-50/80 disabled:text-slate-300 disabled:border-slate-100 disabled:cursor-not-allowed font-semibold transition-colors cursor-pointer text-xs shadow-2xs"
            >
              Previous
            </button>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => onPageChange && onPageChange(page + 1)}
              className="px-3.5 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:bg-slate-50/80 disabled:text-slate-300 disabled:border-slate-100 disabled:cursor-not-allowed font-semibold transition-colors cursor-pointer text-xs shadow-2xs"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Main_Table;
