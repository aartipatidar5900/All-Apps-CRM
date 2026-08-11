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
    Filter,
    Check,
    GripVertical,
} from 'lucide-react';

const Main_Table = ({
    discounts = [],
    totalCount,
    page = 1,
    limit = 10,
    search = '',
    statusFilter = 'all',
    sortField = 'updatedAt',
    sortOrder = 'desc',
    loading = false,
    onSearchChange,
    onStatusFilterChange,
    onSortChange,
    onPageChange,
    onLimitChange,
    onRowClick,
}) => {
    'use no memo';
    const navigate = useNavigate();
    const isServerSide = totalCount !== undefined;

    // Popover state for Status Column
    const [isStatusPopupOpen, setIsStatusPopupOpen] = useState(false);
    const statusPopupRef = useRef(null);

    // Expandable Search state
    const [isSearchOpen, setIsSearchOpen] = useState(Boolean(search));
    const searchInputRef = useRef(null);

    // Column Drag & Drop Reordering state
    const [columnOrder, setColumnOrder] = useState([
        'storeDomain',
        'storeEmail',
        'onboardingStatus',
        'isActive',
        'discounts',
        'createdOn',
        'updatedAt',
        'actions',
    ]);
    const [draggedColumnId, setDraggedColumnId] = useState(null);

    // Auto-focus search input when opened
    useEffect(() => {
        if (isSearchOpen && searchInputRef.current) {
            searchInputRef.current.focus();
        }
    }, [isSearchOpen]);

    // Close popup when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (statusPopupRef.current && !statusPopupRef.current.contains(event.target)) {
                setIsStatusPopupOpen(false);
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

    const statusOptions = [
        { label: 'All Statuses', value: 'all', badgeClass: 'bg-slate-100 text-slate-700 border-slate-200' },
        { label: 'Installed', value: 'installed', badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
        { label: 'Uninstalled', value: 'uninstalled', badgeClass: 'bg-rose-50 text-rose-700 border-rose-200' },
        { label: 'Store Closed', value: 'closed', badgeClass: 'bg-amber-50 text-amber-700 border-amber-200' },
        { label: 'Store Reopened', value: 'reopened', badgeClass: 'bg-sky-50 text-sky-700 border-sky-200' },
    ];

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
                accessorKey: 'discounts',
                header: 'Discounts',
                enableSorting: true,
                cell: ({ getValue }) => {
                    const val = getValue();
                    const count = Array.isArray(val) ? val.length : val ? 1 : 0;
                    return <span className="text-slate-700 font-semibold text-sm">{count}</span>;
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
                        className="inline-flex items-center justify-center p-1.5 text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-100 hover:text-slate-900 transition-colors shadow-xs"
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
        if (columnId === 'discounts') {
            return isSorted === 'asc' ? 'Low → High' : 'High → Low';
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
            {/* Toolbar: Expandable Search placed at the end */}
            <div className="p-4 border-b border-slate-100 bg-white flex items-center justify-end">
                <div className="flex items-center gap-3">
                    {isSearchOpen || search ? (
                        <div className="relative flex items-center animate-in fade-in zoom-in-95 duration-150">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                                <Search className="w-4 h-4" />
                            </div>
                            <input
                                ref={searchInputRef}
                                type="text"
                                value={search}
                                onChange={(e) => onSearchChange && onSearchChange(e.target.value)}
                                placeholder="Search stores..."
                                className="w-64 sm:w-80 pl-9 pr-8 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all placeholder:text-slate-400 text-slate-900 font-medium"
                            />
                            <button
                                type="button"
                                onClick={() => {
                                    if (onSearchChange) onSearchChange('');
                                    setIsSearchOpen(false);
                                }}
                                className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-slate-400 hover:text-slate-700 transition-colors"
                                title="Close Search"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    ) : (
                        <button
                            type="button"
                            onClick={() => setIsSearchOpen(true)}
                            className="p-2 text-slate-600 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl transition-all flex items-center gap-2 text-xs font-semibold shadow-2xs"
                            title="Open Search"
                        >
                            <Search className="w-4 h-4 text-slate-500" />
                            <span className="hidden sm:inline">Search</span>
                        </button>
                    )}
                </div>
            </div>

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
                                                            className={`p-1 rounded-md border transition-all flex items-center gap-1 ${statusFilter !== 'all'
                                                                ? 'bg-slate-900 text-white border-slate-900 shadow-2xs'
                                                                : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-100 hover:text-slate-900'
                                                                }`}
                                                            title="Filter Status Popup"
                                                        >
                                                            <Filter className="w-3 h-3" />
                                                        </button>

                                                        {/* Status Filter Floating Popup Menu */}
                                                        {isStatusPopupOpen && (
                                                            <div
                                                                className="absolute left-0 mt-2 w-52 bg-white rounded-2xl shadow-xl border border-slate-200 z-50 p-2 text-xs normal-case font-normal animate-in fade-in slide-in-from-top-2 duration-150"
                                                                onClick={(e) => e.stopPropagation()}
                                                            >
                                                                <div className="px-3 py-1.5 font-bold text-slate-400 uppercase tracking-wider text-[10px] border-b border-slate-100 mb-1 flex items-center justify-between">
                                                                    <span>Filter Status</span>
                                                                    {statusFilter !== 'all' && (
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => {
                                                                                if (onStatusFilterChange) onStatusFilterChange('all');
                                                                                setIsStatusPopupOpen(false);
                                                                            }}
                                                                            className="text-rose-600 hover:underline text-[10px]"
                                                                        >
                                                                            Clear
                                                                        </button>
                                                                    )}
                                                                </div>

                                                                <div className="space-y-1">
                                                                    {statusOptions.map((option) => {
                                                                        const isSelected = statusFilter === option.value;
                                                                        return (
                                                                            <button
                                                                                key={option.value}
                                                                                type="button"
                                                                                onClick={() => {
                                                                                    if (onStatusFilterChange) onStatusFilterChange(option.value);
                                                                                    setIsStatusPopupOpen(false);
                                                                                }}
                                                                                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-colors ${isSelected
                                                                                    ? 'bg-slate-100 text-slate-900 font-bold'
                                                                                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                                                                                    }`}
                                                                            >
                                                                                <span className="flex items-center gap-2">
                                                                                    <span className={`inline-block w-2 h-2 rounded-full ${option.value === 'installed' ? 'bg-emerald-500' :
                                                                                        option.value === 'uninstalled' ? 'bg-rose-500' :
                                                                                            option.value === 'closed' ? 'bg-amber-500' :
                                                                                                option.value === 'reopened' ? 'bg-sky-500' : 'bg-slate-400'
                                                                                        }`} />
                                                                                    {option.label}
                                                                                </span>
                                                                                {isSelected && <Check className="w-3.5 h-3.5 text-slate-900" />}
                                                                            </button>
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
                        className="inline-flex items-center justify-center p-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                        title="Previous Page"
                    >
                        <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button
                        type="button"
                        disabled={page >= totalPages}
                        onClick={() => onPageChange && onPageChange(page + 1)}
                        className="inline-flex items-center justify-center p-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
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