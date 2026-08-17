import { useState, useMemo, useRef, useEffect } from 'react';
import {
    useReactTable,
    getCoreRowModel,
    getPaginationRowModel,
    getSortedRowModel,
    getFilteredRowModel,
    flexRender,
} from '@tanstack/react-table';
import { useNavigate } from 'react-router-dom';
import {
    Search,
    X,
    Eye,
    ChevronLeft,
    ChevronRight,
    ArrowUpDown,
    ArrowUp,
    ArrowDown,
    ListFilter,
    GripVertical,
} from 'lucide-react';

const Main_Table = ({
    discounts = [],
    allDiscounts = [],
    totalCount,
    page = 1,
    limit = 10,
    search = '',
    statusFilter = [],
    planFilter = [],
    sortField = 'updatedAt',
    sortOrder = 'desc',
    loading = false,
    onSearchChange,
    onStatusFilterChange,
    onSortChange,
    onPageChange,
    onLimitChange,
    onRowClick,
    onPlanFilterChange,
    activeFiltersText = '',
    onResetFilters,
}) => {
    'use no memo';
    const navigate = useNavigate();
    const isServerSide = totalCount !== undefined;

    // Popover state for Status Column
    const [isStatusPopupOpen, setIsStatusPopupOpen] = useState(false);
    const statusPopupRef = useRef(null);

    // Popover state for Plan Column
    const [isPlanPopupOpen, setIsPlanPopupOpen] = useState(false);
    const planPopupRef = useRef(null);

    // Column Drag & Drop Reordering state
    const [columnOrder, setColumnOrder] = useState([
        'storeDomain',
        'storeEmail',
        'onboardingStatus',
        'isActive',
        'plan',
        'createdOn',
        'updatedAt',
        'actions',
    ]);
    const [draggedColumnId, setDraggedColumnId] = useState(null);

    // Close popup when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (statusPopupRef.current && !statusPopupRef.current.contains(event.target)) {
                setIsStatusPopupOpen(false);
            }
            if (planPopupRef.current && !planPopupRef.current.contains(event.target)) {
                setIsPlanPopupOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    // Helper to calculate status info
    const getStatusInfo = (rowData) => {
        const rawEvents = Array.isArray(rowData?.pastEvents)
            ? rowData.pastEvents
            : rowData?.pastEvents && typeof rowData.pastEvents === 'object'
                ? [rowData.pastEvents]
                : [];

        let latestEventName = '';
        if (rawEvents.length > 0) {
            const sorted = [...rawEvents].sort((a, b) => {
                const timeA = typeof a === 'string' ? new Date(a).getTime() : new Date(a?.timestamp || a?.createdAt || a?.date || 0).getTime();
                const timeB = typeof b === 'string' ? new Date(b).getTime() : new Date(b?.timestamp || b?.createdAt || b?.date || 0).getTime();
                return timeB - timeA;
            });
            const latest = sorted[0];
            if (typeof latest === 'string') {
                latestEventName = latest;
            } else if (typeof latest === 'object' && latest !== null) {
                latestEventName = latest.eventName || latest.title || latest.name || latest.status || latest.event || latest.type || '';
            }
        }

        const lowerEvent = latestEventName.toLowerCase();
        if (lowerEvent.includes('reopen') || lowerEvent.includes('reopened')) {
            return {
                label: 'Store Reopened',
                badgeClass: 'bg-sky-50 text-sky-700 border-sky-200',
            };
        } else if (lowerEvent.includes('close') || lowerEvent.includes('closed') || rowData?.isStoreClosed) {
            return {
                label: 'Store Closed',
                badgeClass: 'bg-amber-50 text-amber-700 border-amber-200',
            };
        } else if (lowerEvent.includes('uninstall') || lowerEvent.includes('uninstalled') || rowData?.isActive === false) {
            return {
                label: 'Uninstalled',
                badgeClass: 'bg-rose-50 text-rose-700 border-rose-200',
            };
        } else {
            return {
                label: 'Installed',
                badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
            };
        }
    };

    const statusOptions = useMemo(() => {
        const counts = {
            installed: 0,
            uninstalled: 0,
            closed: 0,
            reopened: 0
        };
        allDiscounts.forEach(d => {
            const rawEvents = Array.isArray(d?.pastEvents) ? d.pastEvents : [];
            let latestEventName = '';
            if (rawEvents.length > 0) {
                const sorted = [...rawEvents].sort((a, b) => new Date(b.timestamp || 0) - new Date(a.timestamp || 0));
                latestEventName = sorted[0]?.eventName || sorted[0]?.type || '';
            }
            const lowerEvent = latestEventName.toLowerCase();
            const isClosed = lowerEvent.includes('close') || lowerEvent.includes('closed') || d?.isStoreClosed;
            const isUninstall = lowerEvent.includes('uninstall') || lowerEvent.includes('uninstalled') || d?.isActive === false;
            const isReopened = lowerEvent.includes('reopen') || lowerEvent.includes('reopened');

            if (isClosed) counts.closed++;
            else if (isUninstall) counts.uninstalled++;
            else if (isReopened) counts.reopened++;
            else counts.installed++;
        });

        return [
            { label: 'Installed', value: 'installed', count: counts.installed },
            { label: 'Uninstalled', value: 'uninstalled', count: counts.uninstalled },
            { label: 'Closed', value: 'closed', count: counts.closed },
            { label: 'Store Re-Opened', value: 'reopened', count: counts.reopened }
        ];
    }, [allDiscounts]);

    const planOptions = useMemo(() => {
        const counts = {};
        allDiscounts.forEach(d => {
            const plan = d.plan || 'No Plan';
            counts[plan] = (counts[plan] || 0) + 1;
        });
        const uniquePlans = Array.from(new Set([
            ...Object.keys(counts),
            ...planFilter
        ]));
        uniquePlans.sort((a, b) => {
            if (a === 'No Plan') return -1;
            if (b === 'No Plan') return 1;
            if (a === 'Trial') return -1;
            if (b === 'Trial') return 1;
            return a.localeCompare(b);
        });
        return uniquePlans.map(plan => ({
            label: plan,
            value: plan,
            count: counts[plan] || 0
        }));
    }, [allDiscounts, planFilter]);

    const columns = useMemo(
        () => [
            {
                accessorKey: 'storeDomain',
                header: 'Store Domain',
                enableSorting: true,
                cell: ({ getValue }) => (
                    <span className="font-semibold text-slate-900 font-sans text-sm">
                        {getValue() || 'N/A'}
                    </span>
                ),
            },
            {
                id: 'storeEmail',
                accessorFn: (row) => row?.storeEmail || row?.email || row?.ownerEmail || '',
                header: 'Shop Email',
                enableSorting: true,
                cell: ({ getValue }) => (
                    <span className="font-semibold text-slate-900 font-sans text-sm">
                        {getValue() || 'N/A'}
                    </span>
                ),
            },
            {
                accessorKey: 'onboardingStatus',
                header: 'Onboarding Status',
                enableSorting: true,
                cell: ({ row }) => {
                    const rowData = row.original || {};
                    const val = rowData.onboardingStatus ?? rowData.isOnboardingCompleted ?? rowData.isOnboardingComplete ?? rowData.isOnboarded ?? rowData.onboarding;

                    const isCompleted = typeof val === 'boolean'
                        ? val
                        : typeof val === 'string'
                            ? (val.toLowerCase().includes('complete') || val.toLowerCase().includes('done') || val.toLowerCase() === 'true' || val.toLowerCase() === 'yes')
                            : typeof val === 'number'
                                ? val === 1
                                : Boolean(Array.isArray(rowData.discounts) && rowData.discounts.length > 0);

                    return (
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-semibold border ${isCompleted
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-amber-50 text-amber-700 border-amber-200'
                            }`}>
                            {isCompleted ? 'Completed' : 'Not Completed'}
                        </span>
                    );
                },
            },
            {
                accessorKey: 'isActive',
                header: 'Status',
                enableSorting: false,
                cell: ({ row }) => {
                    const status = getStatusInfo(row.original);
                    return (
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-semibold border ${status.badgeClass}`}>
                            {status.label}
                        </span>
                    );
                },
            },
            {
                accessorKey: 'plan',
                header: 'Plan',
                enableSorting: false,
                cell: ({ getValue }) => {
                    const val = getValue() || 'N/A';
                    if (val === 'Trial') {
                        return (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold border bg-orange-100/70 text-orange-700 border-orange-200 uppercase tracking-wider">
                                TRIAL
                            </span>
                        );
                    }
                    if (val.endsWith(' Trial')) {
                        const cleanPlan = val.replace(' Trial', '');
                        return (
                            <div className="flex items-center gap-1.5">
                                <span className="font-semibold text-slate-700 font-sans text-sm">
                                    {cleanPlan}
                                </span>
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold border bg-orange-100/70 text-orange-700 border-orange-200 uppercase tracking-wider">
                                    TRIAL
                                </span>
                            </div>
                        );
                    }
                    return (
                        <span className="font-semibold text-slate-700 font-sans text-sm">
                            {val}
                        </span>
                    );
                },
            },
            {
                id: 'createdOn',
                accessorFn: (row) => {
                    const rawEvents = Array.isArray(row?.pastEvents)
                        ? row.pastEvents
                        : row?.pastEvents && typeof row.pastEvents === 'object'
                            ? [row.pastEvents]
                            : [];
                    if (rawEvents.length > 0) {
                        const sorted = [...rawEvents].sort((a, b) => {
                            const timeA = typeof a === 'string' ? new Date(a).getTime() : new Date(a?.timestamp || a?.createdAt || a?.date || 0).getTime();
                            const timeB = typeof b === 'string' ? new Date(b).getTime() : new Date(b?.timestamp || b?.createdAt || b?.date || 0).getTime();
                            return timeA - timeB;
                        });
                        const earliest = sorted[0];
                        const rawDate = typeof earliest === 'string' ? earliest : (earliest?.timestamp || earliest?.createdAt || earliest?.date);
                        if (rawDate) return rawDate;
                    }
                    return row?.createdAt || row?.createdOn || row?.installedAt || null;
                },
                header: 'Created On',
                enableSorting: true,
                cell: ({ getValue }) => {
                    const val = getValue();
                    return (
                        <span className="text-slate-500 font-medium text-xs">
                            {val ? new Date(val).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : 'N/A'}
                        </span>
                    );
                },
            },
            {
                accessorKey: 'updatedAt',
                header: 'Updated',
                enableSorting: true,
                cell: ({ getValue }) => {
                    const val = getValue();
                    return (
                        <span className="text-slate-500 font-medium text-xs">
                            {val ? new Date(val).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : 'N/A'}
                        </span>
                    );
                },
            },
            {
                id: 'actions',
                header: 'Action',
                enableSorting: false,
                cell: ({ row }) => (
                    <button
                        type="button"
                        onClick={(e) => {
                            e.stopPropagation();
                            if (onRowClick) {
                                onRowClick(row.original.storeDomain);
                            } else {
                                navigate(`/store/${encodeURIComponent(row.original.storeDomain)}`);
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
        [navigate, onRowClick]
    );

    const sortingState = useMemo(
        () => (sortField ? [{ id: sortField, desc: sortOrder === 'desc' }] : []),
        [sortField, sortOrder]
    );

    const paginationState = useMemo(
        () => ({
            pageIndex: Math.max(0, page - 1),
            pageSize: limit,
        }),
        [page, limit]
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
        },
        onColumnOrderChange: setColumnOrder,
        onSortingChange: (updater) => {
            if (!onSortChange) return;
            const nextSorting = typeof updater === 'function' ? updater(sortingState) : updater;
            if (nextSorting.length > 0) {
                onSortChange(nextSorting[0].id, nextSorting[0].desc ? 'desc' : 'asc');
            } else {
                onSortChange('updatedAt', 'desc');
            }
        },
        onPaginationChange: (updater) => {
            const nextPagination = typeof updater === 'function' ? updater(paginationState) : updater;
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

    const getSortBadgeText = (columnId, isSorted) => {
        if (!isSorted) return null;
        if (columnId === 'storeDomain' || columnId === 'storeEmail') {
            return isSorted === 'asc' ? 'A-Z' : 'Z-A';
        }
        if (columnId === 'createdOn' || columnId === 'updatedAt') {
            return isSorted === 'asc' ? 'Oldest' : 'Newest';
        }
        return isSorted === 'asc' ? 'ASC' : 'DESC';
    };

    // Drag and Drop handlers
    const handleDragStart = (e, columnId) => {
        setDraggedColumnId(columnId);
        e.dataTransfer.setData('text/plain', columnId);
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
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

    return (
        <div className="w-full bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
            {/* Toolbar: Dynamic left aligned title and right aligned static search */}
            <div className="p-5 border-b border-slate-100 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <h2 className="text-base font-bold text-slate-800 tracking-tight">
                    Installation Database
                </h2>
                <div className="flex items-center gap-3">
                    <div className="relative flex items-center">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                            <Search className="w-4 h-4" />
                        </div>
                        <input
                            type="text"
                            value={search}
                            onChange={(e) => onSearchChange && onSearchChange(e.target.value)}
                            placeholder="Search domain, name or email..."
                            className="w-64 sm:w-80 pl-9 pr-8 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all placeholder:text-slate-400 text-slate-900 font-semibold"
                        />
                        {search && (
                            <button
                                type="button"
                                onClick={() => onSearchChange && onSearchChange('')}
                                className="absolute right-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                                title="Clear Search"
                            >
                                <X className="w-3.5 h-3.5" />
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Filter banner placed inside card directly below toolbar */}
            {activeFiltersText && (
                <div className="mx-5 mt-4 p-3 rounded-xl bg-slate-100/80 border border-slate-200 text-xs text-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3 font-semibold animate-in fade-in duration-150">
                    <div className="flex items-center gap-1.5 flex-wrap">
                        <span>Filtering merchants by clicked chart/metric criteria:</span>
                        <span className="font-mono bg-white border border-slate-200 rounded px-1.5 py-0.5 text-slate-800 font-bold shadow-2xs">
                            {activeFiltersText}
                        </span>
                    </div>
                    <button
                        onClick={onResetFilters}
                        className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-800 px-3 py-1 rounded-lg shadow-2xs font-bold transition-all cursor-pointer whitespace-nowrap"
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
                            <tr key={headerGroup.id} className="border-b border-slate-200 bg-slate-50/80">
                                {headerGroup.headers.map((header, headerIndex) => {
                                    const canSort = header.column.getCanSort();
                                    const isSorted = header.column.getIsSorted();
                                    const badgeText = getSortBadgeText(header.id, isSorted);
                                    const isStatusColumn = header.id === 'isActive';
                                    const isFirstColumn = headerIndex === 0;

                                    return (
                                        <th
                                            key={header.id}
                                            draggable={true}
                                            onDragStart={(e) => handleDragStart(e, header.id)}
                                            onDragOver={handleDragOver}
                                            onDrop={(e) => handleDrop(e, header.id)}
                                            className={`whitespace-nowrap px-5 py-3.5 text-xs font-bold text-slate-600 uppercase tracking-wider relative transition-colors ${isFirstColumn
                                                ? 'sticky left-0 z-30 bg-slate-50 border-r border-slate-200 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.06)]'
                                                : ''
                                                } ${draggedColumnId === header.id ? 'opacity-40 bg-slate-200' : ''} ${canSort ? 'cursor-pointer select-none hover:text-slate-900' : ''
                                                }`}
                                            onClick={canSort ? header.column.getToggleSortingHandler() : undefined}
                                        >
                                            <div className="flex items-center gap-2">
                                                {/* Drag Handle */}
                                                <span className="cursor-grab active:cursor-grabbing text-slate-300 hover:text-slate-500">
                                                    <GripVertical className="w-3.5 h-3.5" />
                                                </span>

                                                <span>
                                                    {flexRender(
                                                        header.column.columnDef.header,
                                                        header.getContext()
                                                    )}
                                                </span>

                                                {/* Status Column Filter Popup Trigger */}
                                                {isStatusColumn && (
                                                    <div className="relative inline-block text-left" ref={statusPopupRef}>
                                                        <button
                                                            type="button"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setIsStatusPopupOpen((prev) => !prev);
                                                            }}
                                                            className="p-1 rounded-md border border-slate-200 bg-white text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition-all flex items-center gap-1 cursor-pointer"
                                                            title="Filter Status Popup"
                                                        >
                                                            <ListFilter className="w-3.5 h-3.5" />
                                                        </button>

                                                        {/* Status Filter Floating Popup Menu */}
                                                        {isStatusPopupOpen && (
                                                            <div
                                                                className="absolute left-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-slate-200 z-50 p-3 text-xs normal-case font-normal animate-in fade-in slide-in-from-top-2 duration-150"
                                                                onClick={(e) => e.stopPropagation()}
                                                            >
                                                                <div className="px-1 py-1.5 font-bold text-slate-400 uppercase tracking-wider text-[10px] border-b border-slate-100 mb-2 flex items-center justify-between">
                                                                    <span>FILTER</span>
                                                                    {statusFilter.length > 0 && (
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => {
                                                                                if (onStatusFilterChange) onStatusFilterChange([]);
                                                                                setIsStatusPopupOpen(false);
                                                                            }}
                                                                            className="text-rose-600 hover:underline text-[10px] normal-case font-bold cursor-pointer"
                                                                        >
                                                                            Clear
                                                                        </button>
                                                                    )}
                                                                </div>

                                                                <div className="space-y-2">
                                                                    {statusOptions.map((option) => {
                                                                        const isChecked = statusFilter.includes(option.value);
                                                                        return (
                                                                            <label
                                                                                key={option.value}
                                                                                className="flex items-center justify-between px-2 py-1 hover:bg-slate-50 rounded-lg cursor-pointer transition-colors"
                                                                            >
                                                                                <span className="flex items-center gap-2 text-slate-700 font-semibold">
                                                                                    <input
                                                                                        type="checkbox"
                                                                                        checked={isChecked}
                                                                                        onChange={() => {
                                                                                            if (!onStatusFilterChange) return;
                                                                                            const nextFilter = isChecked
                                                                                                ? statusFilter.filter(v => v !== option.value)
                                                                                                : [...statusFilter, option.value];
                                                                                            onStatusFilterChange(nextFilter);
                                                                                        }}
                                                                                        className="rounded border-slate-300 text-slate-900 focus:ring-slate-900/10 cursor-pointer w-3.5 h-3.5"
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
                                                            </div>
                                                        )}
                                                    </div>
                                                )}

                                                {/* Directional Sort Icon / Badge */}
                                                {canSort && (
                                                    <div className="flex items-center gap-1">
                                                        {isSorted === 'asc' ? (
                                                            <ArrowUp className="w-3.5 h-3.5 text-slate-900" />
                                                        ) : isSorted === 'desc' ? (
                                                            <ArrowDown className="w-3.5 h-3.5 text-slate-900" />
                                                        ) : (
                                                            <ArrowUpDown className="w-3.5 h-3.5 text-slate-400 opacity-50 hover:opacity-100" />
                                                        )}

                                                        {badgeText && (
                                                            <span className="px-1.5 py-0.5 text-[10px] font-bold tracking-tight rounded bg-slate-900 text-white capitalize shadow-2xs">
                                                                {badgeText}
                                                            </span>
                                                        )}
                                                    </div>
                                                )}

                                                {/* Plan Column Filter Popup Trigger */}
                                                {header.id === 'plan' && (
                                                    <div className="relative inline-block text-left font-normal normal-case" ref={planPopupRef}>
                                                        <button
                                                            type="button"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setIsPlanPopupOpen((prev) => !prev);
                                                            }}
                                                            className="p-1 rounded-md border border-slate-200 bg-white text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition-all flex items-center gap-1 cursor-pointer"
                                                            title="Filter Plan Popup"
                                                        >
                                                            <ListFilter className="w-3.5 h-3.5" />
                                                        </button>

                                                        {isPlanPopupOpen && (
                                                            <div
                                                                className="absolute left-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-slate-200 z-50 p-3 text-xs normal-case font-normal animate-in fade-in slide-in-from-top-2 duration-150"
                                                                onClick={(e) => e.stopPropagation()}
                                                            >
                                                                {/* SORT SECTION */}
                                                                <div className="px-1 py-1 font-bold text-slate-400 uppercase tracking-wider text-[10px] border-b border-slate-100 mb-2">
                                                                    SORT
                                                                </div>
                                                                <div className="space-y-1 mb-3">
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => {
                                                                            if (onSortChange) onSortChange('plan', 'asc');
                                                                            setIsPlanPopupOpen(false);
                                                                        }}
                                                                        className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors text-left cursor-pointer"
                                                                    >
                                                                        ↑ Sort Ascending
                                                                    </button>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => {
                                                                            if (onSortChange) onSortChange('plan', 'desc');
                                                                            setIsPlanPopupOpen(false);
                                                                        }}
                                                                        className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors text-left cursor-pointer"
                                                                    >
                                                                        ↓ Sort Descending
                                                                    </button>
                                                                </div>

                                                                {/* FILTER SECTION */}
                                                                <div className="px-1 py-1.5 font-bold text-slate-400 uppercase tracking-wider text-[10px] border-b border-slate-100 mb-2 flex items-center justify-between">
                                                                    <span>FILTER</span>
                                                                    {planFilter.length > 0 && (
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => {
                                                                                if (onPlanFilterChange) onPlanFilterChange([]);
                                                                                setIsPlanPopupOpen(false);
                                                                            }}
                                                                            className="text-rose-600 hover:underline text-[10px] normal-case font-bold cursor-pointer"
                                                                        >
                                                                            Clear
                                                                        </button>
                                                                    )}
                                                                </div>

                                                                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                                                                    {planOptions.map((option) => {
                                                                        const isChecked = planFilter.includes(option.value);
                                                                        return (
                                                                            <label
                                                                                key={option.value}
                                                                                className="flex items-center justify-between px-2 py-1 hover:bg-slate-50 rounded-lg cursor-pointer transition-colors"
                                                                            >
                                                                                <span className="flex items-center gap-2 text-slate-700 font-semibold">
                                                                                    <input
                                                                                        type="checkbox"
                                                                                        checked={isChecked}
                                                                                        onChange={() => {
                                                                                            if (!onPlanFilterChange) return;
                                                                                            const nextFilter = isChecked
                                                                                                ? planFilter.filter(v => v !== option.value)
                                                                                                : [...planFilter, option.value];
                                                                                            onPlanFilterChange(nextFilter);
                                                                                        }}
                                                                                        className="rounded border-slate-300 text-slate-900 focus:ring-slate-900/10 cursor-pointer w-3.5 h-3.5"
                                                                                    />
                                                                                    {option.label.endsWith(' Trial') ? (
                                                                                        <span className="inline-flex items-center gap-1">
                                                                                            <span>{option.label.replace(' Trial', '')}</span>
                                                                                            <span className="inline-flex items-center px-1 py-0.2 rounded-[3px] text-[8px] font-bold border bg-orange-100/70 text-orange-700 border-orange-200 uppercase tracking-wider scale-90">TRIAL</span>
                                                                                        </span>
                                                                                    ) : option.label === 'Trial' ? (
                                                                                        <span className="inline-flex items-center px-1 py-0.2 rounded-[3px] text-[8px] font-bold border bg-orange-100/70 text-orange-700 border-orange-200 uppercase tracking-wider scale-90">TRIAL</span>
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
                                <td colSpan={columns.length} className="px-5 py-12 text-center text-slate-500 text-sm">
                                    Loading stores...
                                </td>
                            </tr>
                        ) : table.getRowModel().rows.length === 0 ? (
                            <tr>
                                <td colSpan={columns.length} className="px-5 py-12 text-center text-slate-500 text-sm">
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
                                            navigate(`/store/${encodeURIComponent(row.original.storeDomain)}`);
                                        }
                                    }}
                                    className="hover:bg-slate-50/80 transition-colors cursor-pointer group"
                                >
                                    {row.getVisibleCells().map((cell, cellIndex) => {
                                        const isFirstColumn = cellIndex === 0;

                                        return (
                                            <td
                                                key={cell.id}
                                                className={`whitespace-nowrap px-5 py-3.5 align-middle ${isFirstColumn
                                                    ? 'sticky left-0 z-10 bg-white group-hover:bg-slate-50 border-r border-slate-200 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.06)]'
                                                    : ''
                                                    }`}
                                            >
                                                {flexRender(
                                                    cell.column.columnDef.cell,
                                                    cell.getContext()
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
            <div className="px-5 py-3.5 border-t border-slate-100 bg-white flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600">
                <div className="flex items-center gap-2">
                    <span>
                        Showing <span className="font-semibold text-slate-900">{startRecord}</span> to{' '}
                        <span className="font-semibold text-slate-900">{endRecord}</span> of{' '}
                        <span className="font-semibold text-slate-900">{totalRecords}</span> stores
                    </span>
                    <span className="mx-1 text-slate-300">|</span>
                    <label className="flex items-center gap-1.5">
                        <span>Per page:</span>
                        <select
                            value={limit}
                            onChange={(e) => onLimitChange && onLimitChange(Number(e.target.value))}
                            className="px-2 py-1 bg-slate-50 border border-slate-200 rounded-md font-medium text-slate-700 focus:outline-none focus:ring-1 focus:ring-slate-900 cursor-pointer"
                        >
                            <option value={10}>10</option>
                            <option value={25}>25</option>
                            <option value={50}>50</option>
                            <option value={100}>100</option>
                        </select>
                    </label>
                </div>

                <div className="flex items-center gap-2">
                    <span className="font-medium text-slate-600 mr-2">
                        Page {page} of {totalPages}
                    </span>
                    <button
                        type="button"
                        disabled={page <= 1}
                        onClick={() => onPageChange && onPageChange(page - 1)}
                        className="inline-flex items-center justify-center p-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                        title="Previous Page"
                    >
                        <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button
                        type="button"
                        disabled={page >= totalPages}
                        onClick={() => onPageChange && onPageChange(page + 1)}
                        className="inline-flex items-center justify-center p-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                        title="Next Page"
                    >
                        <ChevronRight className="w-4 h-4" />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Main_Table;