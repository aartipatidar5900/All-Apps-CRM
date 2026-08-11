import { useState, useRef, useEffect } from 'react';
import { Calendar as CalendarIcon, ChevronDown, ChevronLeft, ChevronRight, Check } from 'lucide-react';

const PRESETS = [
    { label: 'All Time', value: 'all' },
    { label: 'Today', value: 'today' },
    { label: 'Yesterday', value: 'yesterday' },
    { label: 'Last 7 Days', value: '7days' },
    { label: 'Last 30 Days', value: '30days' },
    { label: 'This Month', value: 'this_month' },
    { label: 'Last Month', value: 'last_month' },
    { label: 'Custom Range', value: 'custom' },
];

const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

// Timezone-safe local YYYY-MM-DD formatter
const formatLocalYYYYMMDD = (d) => {
    if (!d || isNaN(d.getTime())) return '';
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
};

const DateFilter = ({
    selectedPreset = 'all',
    startDate = '',
    endDate = '',
    onDateFilterChange,
    onClear,
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [tempPreset, setTempPreset] = useState(selectedPreset);
    const [tempStartDate, setTempStartDate] = useState(startDate);
    const [tempEndDate, setTempEndDate] = useState(endDate);
    const containerRef = useRef(null);

    // Calendar view month state
    const [viewDate, setViewDate] = useState(() => {
        if (startDate) {
            const d = new Date(startDate);
            if (!isNaN(d.getTime())) return d;
        }
        return new Date();
    });

    const [selectingMode, setSelectingMode] = useState('start');

    const handleToggleOpen = () => {
        if (!isOpen) {
            setTempPreset(selectedPreset);
            setTempStartDate(startDate);
            setTempEndDate(endDate);
            if (startDate) {
                const d = new Date(startDate);
                if (!isNaN(d.getTime())) setViewDate(d);
            }
        }
        setIsOpen((prev) => !prev);
    };

    // Close popover when clicking outside
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (containerRef.current && !containerRef.current.contains(e.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Calculate start & end date strings based on preset using timezone-safe formatting
    const calculatePresetDates = (presetValue) => {
        const today = new Date();

        if (presetValue === 'all') {
            return { start: '', end: '' };
        }
        if (presetValue === 'today') {
            const dateStr = formatLocalYYYYMMDD(today);
            return { start: dateStr, end: dateStr };
        }
        if (presetValue === 'yesterday') {
            const yest = new Date(today);
            yest.setDate(yest.getDate() - 1);
            const dateStr = formatLocalYYYYMMDD(yest);
            return { start: dateStr, end: dateStr };
        }
        if (presetValue === '7days') {
            const past7 = new Date(today);
            past7.setDate(past7.getDate() - 6);
            return { start: formatLocalYYYYMMDD(past7), end: formatLocalYYYYMMDD(today) };
        }
        if (presetValue === '30days') {
            const past30 = new Date(today);
            past30.setDate(past30.getDate() - 29);
            return { start: formatLocalYYYYMMDD(past30), end: formatLocalYYYYMMDD(today) };
        }
        if (presetValue === 'this_month') {
            const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
            return { start: formatLocalYYYYMMDD(firstDay), end: formatLocalYYYYMMDD(today) };
        }
        if (presetValue === 'last_month') {
            const firstDay = new Date(today.getFullYear(), today.getMonth() - 1, 1);
            const lastDay = new Date(today.getFullYear(), today.getMonth(), 0);
            return { start: formatLocalYYYYMMDD(firstDay), end: formatLocalYYYYMMDD(lastDay) };
        }
        return { start: tempStartDate, end: tempEndDate };
    };

    const handleSelectPreset = (presetValue) => {
        setTempPreset(presetValue);

        if (presetValue === 'custom') {
            setSelectingMode('start');
            return;
        }

        const { start, end } = calculatePresetDates(presetValue);
        setTempStartDate(start);
        setTempEndDate(end);

        if (start) {
            const startDateObj = new Date(start);
            if (!isNaN(startDateObj.getTime())) {
                setViewDate(startDateObj);
            }
        }
    };

    // Calendar grid calculations
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const firstDayOfWeek = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const handlePrevMonth = () => {
        setViewDate(new Date(year, month - 1, 1));
    };

    const handleNextMonth = () => {
        setViewDate(new Date(year, month + 1, 1));
    };

    const formatDateString = (y, m, d) => {
        const mm = String(m + 1).padStart(2, '0');
        const dd = String(d).padStart(2, '0');
        return `${y}-${mm}-${dd}`;
    };

    const handleDayClick = (dayNumber) => {
        const clickedStr = formatDateString(year, month, dayNumber);
        setTempPreset('custom');

        if (!tempStartDate || (tempStartDate && tempEndDate) || selectingMode === 'start') {
            setTempStartDate(clickedStr);
            setTempEndDate('');
            setSelectingMode('end');
        } else if (selectingMode === 'end') {
            if (new Date(clickedStr) < new Date(tempStartDate)) {
                setTempStartDate(clickedStr);
                setTempEndDate('');
                setSelectingMode('end');
            } else {
                setTempEndDate(clickedStr);
                setSelectingMode(null);
            }
        }
    };

    const handleApply = () => {
        onDateFilterChange({
            preset: tempPreset,
            startDate: tempStartDate,
            endDate: tempEndDate || tempStartDate,
        });
        setIsOpen(false);
    };

    const handleClearAll = () => {
        setTempPreset('all');
        setTempStartDate('');
        setTempEndDate('');
        if (onClear) {
            onClear();
        } else {
            onDateFilterChange({ preset: 'all', startDate: '', endDate: '' });
        }
        setIsOpen(false);
    };

    const getTriggerLabel = () => {
        if (selectedPreset && selectedPreset !== 'all' && selectedPreset !== 'custom') {
            const match = PRESETS.find((p) => p.value === selectedPreset);
            if (match) return match.label;
        }
        if (startDate || endDate) {
            if (startDate && endDate) {
                return `${startDate} → ${endDate}`;
            }
            if (startDate) return `From ${startDate}`;
            if (endDate) return `Until ${endDate}`;
        }
        return 'Date Range';
    };

    const isActive = Boolean((selectedPreset && selectedPreset !== 'all') || startDate || endDate);

    // Helpers to style calendar days
    const isDaySelectedStart = (y, m, d) => tempStartDate === formatDateString(y, m, d);
    const isDaySelectedEnd = (y, m, d) => tempEndDate === formatDateString(y, m, d);
    const isDayInRange = (y, m, d) => {
        if (!tempStartDate || !tempEndDate) return false;
        const current = new Date(formatDateString(y, m, d));
        return current > new Date(tempStartDate) && current < new Date(tempEndDate);
    };

    const monthName = viewDate.toLocaleString('en-US', { month: 'long', year: 'numeric' });

    return (
        <div className="relative inline-block text-left" ref={containerRef}>
            {/* Filter Trigger Button */}
            <button
                type="button"
                onClick={handleToggleOpen}
                className={`px-3 py-2 text-xs font-semibold rounded-xl border transition-all flex items-center gap-2 shadow-2xs ${isActive
                    ? 'bg-slate-900 text-white border-slate-900'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100 hover:text-slate-900'
                    }`}
                title="Date Filter"
            >
                <CalendarIcon className={`w-3.5 h-3.5 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                <span>{getTriggerLabel()}</span>
                <ChevronDown className="w-3.5 h-3.5 opacity-60" />
            </button>

            {/* Side-by-Side Floating Popover Card */}
            {isOpen && (
                <div className="absolute right-0 mt-2 bg-white rounded-2xl shadow-xl border border-slate-200 z-50 p-4 text-xs animate-in fade-in zoom-in-95 duration-150 w-135 sm:w-145 flex flex-col sm:flex-row gap-4">
                    {/* Left Panel: Preset Filters List */}
                    <div className="w-full sm:w-44 shrink-0 flex flex-col justify-between border-b sm:border-b-0 sm:border-r border-slate-100 pb-3 sm:pb-0 sm:pr-3">
                        <div>
                            <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100 font-bold text-slate-400 uppercase tracking-wider text-[10px]">
                                <span>Presets</span>
                                {isActive && (
                                    <button
                                        type="button"
                                        onClick={handleClearAll}
                                        className="text-rose-600 hover:underline normal-case font-semibold text-[10px]"
                                    >
                                        Clear
                                    </button>
                                )}
                            </div>
                            <div className="space-y-1">
                                {PRESETS.map((preset) => {
                                    const isSelected = tempPreset === preset.value;
                                    return (
                                        <button
                                            key={preset.value}
                                            type="button"
                                            onClick={() => handleSelectPreset(preset.value)}
                                            className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl font-semibold text-xs transition-colors ${isSelected
                                                ? 'bg-slate-900 text-white font-bold'
                                                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                                                }`}
                                        >
                                            <span>{preset.label}</span>
                                            {isSelected && <Check className="w-3.5 h-3.5" />}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Apply Button */}
                        <div className="pt-3 mt-3 border-t border-slate-100">
                            <button
                                type="button"
                                onClick={handleApply}
                                className="w-full py-2 bg-slate-900 text-white font-bold text-xs rounded-xl hover:bg-slate-800 transition-colors shadow-2xs"
                            >
                                Apply Filter
                            </button>
                        </div>
                    </div>

                    {/* Right Panel: Interactive Visual Calendar Grid */}
                    <div className="flex-1">
                        {/* Selected Dates Display Header */}
                        <div className="flex items-center justify-between bg-slate-50 p-2.5 rounded-xl border border-slate-200 mb-3 text-xs">
                            <div>
                                <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Start Date</span>
                                <span className="font-semibold text-slate-900">{tempStartDate || 'Select date'}</span>
                            </div>
                            <span className="text-slate-300 font-bold">→</span>
                            <div>
                                <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">End Date</span>
                                <span className="font-semibold text-slate-900">{tempEndDate || 'Select date'}</span>
                            </div>
                        </div>

                        {/* Month Navigation */}
                        <div className="flex items-center justify-between mb-2 px-1">
                            <button
                                type="button"
                                onClick={handlePrevMonth}
                                className="p-1 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
                                title="Previous Month"
                            >
                                <ChevronLeft className="w-4 h-4" />
                            </button>
                            <span className="font-bold text-slate-900 text-xs">
                                {monthName}
                            </span>
                            <button
                                type="button"
                                onClick={handleNextMonth}
                                className="p-1 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
                                title="Next Month"
                            >
                                <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>

                        {/* Weekday Header Labels */}
                        <div className="grid grid-cols-7 text-center mb-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                            {WEEKDAYS.map((wd) => (
                                <div key={wd} className="py-1">{wd}</div>
                            ))}
                        </div>

                        {/* Calendar Days Grid */}
                        <div className="grid grid-cols-7 text-center gap-y-1 text-xs font-semibold">
                            {/* Empty offset slots */}
                            {Array.from({ length: firstDayOfWeek }).map((_, idx) => (
                                <div key={`empty-${idx}`} className="h-8" />
                            ))}

                            {/* Active Month Days */}
                            {Array.from({ length: daysInMonth }).map((_, idx) => {
                                const dayNum = idx + 1;
                                const isStart = isDaySelectedStart(year, month, dayNum);
                                const isEnd = isDaySelectedEnd(year, month, dayNum);
                                const inRange = isDayInRange(year, month, dayNum);

                                return (
                                    <button
                                        key={dayNum}
                                        type="button"
                                        onClick={() => handleDayClick(dayNum)}
                                        className={`h-8 w-full flex items-center justify-center text-xs transition-colors rounded-lg ${isStart || isEnd
                                            ? 'bg-slate-900 text-white font-bold shadow-xs'
                                            : inRange
                                                ? 'bg-slate-100 text-slate-900 font-semibold'
                                                : 'text-slate-700 hover:bg-slate-100'
                                            }`}
                                    >
                                        {dayNum}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DateFilter;
