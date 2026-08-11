import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Main_Table from '../components/Main_Table';
import { TableSkeleton } from '../components/SkeletonLoader';
import { AlertCircle } from 'lucide-react';
import { mockDiscounts } from '../data/mockData';

const All_Stores = ({
    onTotalCountChange,
    datePreset: propDatePreset = 'all',
    startDate: propStartDate = '',
    endDate: propEndDate = '',
    onDateFilterChange: propOnDateFilterChange,
}) => {
    const [discounts] = useState(mockDiscounts);
    const [loading] = useState(false);
    const [error] = useState('');

    // Global & status filter states
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');

    // Local fallback Date range filter states
    const [localDatePreset, setLocalDatePreset] = useState('all');
    const [localStartDate, setLocalStartDate] = useState('');
    const [localEndDate, setLocalEndDate] = useState('');

    const datePreset = propOnDateFilterChange ? propDatePreset : localDatePreset;
    const startDate = propOnDateFilterChange ? propStartDate : localStartDate;
    const endDate = propOnDateFilterChange ? propEndDate : localEndDate;

    // Sorting & Pagination
    const [sortField, setSortField] = useState('updatedAt');
    const [sortOrder, setSortOrder] = useState('desc');
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(10);
    const [totalCount] = useState(mockDiscounts.length);

    const navigate = useNavigate();

    useEffect(() => {
        if (onTotalCountChange) {
            onTotalCountChange(mockDiscounts.length);
        }
    }, [onTotalCountChange]);

    const handleDateFilterChange = (range) => {
        if (propOnDateFilterChange) {
            propOnDateFilterChange(range);
        } else {
            setLocalDatePreset(range.preset);
            setLocalStartDate(range.startDate || '');
            setLocalEndDate(range.endDate || '');
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

            {/* Main Content Area */}
            {loading && discounts.length === 0 ? (
                <TableSkeleton />
            ) : (


                <Main_Table
                    discounts={discounts}
                    totalCount={totalCount}
                    page={page}
                    limit={limit}
                    search={search}
                    statusFilter={statusFilter}
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
                    onRowClick={handleRowClick}
                />
            )}
        </div>
    );
};

export default All_Stores;
