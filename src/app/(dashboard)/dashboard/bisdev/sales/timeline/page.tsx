"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
    TrendingUp,
    ChevronRight,
    ChevronLeft,
    Calendar,
} from "lucide-react";

// Status configurations
const STATUS_CONFIG = {
    running: { label: "Running", barClass: "bg-blue-500" },
    partial: { label: "Partial", barClass: "bg-amber-500" },
    paid: { label: "Paid", barClass: "bg-emerald-500" },
    unpaid: { label: "Unpaid", barClass: "bg-rose-500" },
};

type SalesStatus = keyof typeof STATUS_CONFIG;

interface SalesItem {
    id: string;
    project_name: string;
    company_name: string;
    status: SalesStatus;
    start_date: string | null;
    end_date: string | null;
    progress: number;
    contract_value: number;
}

// Utility functions
const parseDate = (dateStr: string | null): Date => {
    if (!dateStr) return new Date();
    return new Date(dateStr);
};

const formatDate = (date: Date): string => {
    return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
};

const getDaysBetween = (start: Date, end: Date): number => {
    const diffTime = end.getTime() - start.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

const addDays = (date: Date, days: number): Date => {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
};

const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(value);
};

export default function SalesTimelinePage() {
    const supabase = createClient();
    const { canAccessBisdev, isLoading: authLoading } = useAuth();

    const [salesData, setSalesData] = useState<SalesItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [viewMode, setViewMode] = useState<"monthly" | "quarterly">("monthly");
    const [selectedItem, setSelectedItem] = useState<SalesItem | null>(null);

    // Fetch sales data with dates
    useEffect(() => {
        const fetchData = async () => {
            if (!canAccessBisdev) return;

            try {
                const { data, error } = await supabase
                    .from('bisdev_sales')
                    .select('id, project_name, company_name, status, start_date, end_date, progress, contract_value')
                    .not('start_date', 'is', null)
                    .not('end_date', 'is', null)
                    .order('start_date', { ascending: true });

                if (error) throw error;
                setSalesData(data || []);
            } catch (error) {
                console.error('Error fetching sales data:', error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchData();
    }, [canAccessBisdev]);

    // Calculate timeline boundaries
    const { timelineStart, timelineEnd, totalDays, markers } = useMemo(() => {
        if (salesData.length === 0) {
            const today = new Date();
            const start = new Date(today.getFullYear(), today.getMonth(), 1);
            const end = new Date(today.getFullYear(), today.getMonth() + 6, 0);
            return { timelineStart: start, timelineEnd: end, totalDays: getDaysBetween(start, end), markers: [] };
        }

        let minDate = parseDate(salesData[0].start_date);
        let maxDate = parseDate(salesData[0].end_date);

        salesData.forEach(item => {
            const start = parseDate(item.start_date);
            const end = parseDate(item.end_date);
            if (start < minDate) minDate = start;
            if (end > maxDate) maxDate = end;
        });

        // Add padding
        const paddedStart = addDays(minDate, -15);
        const paddedEnd = addDays(maxDate, 15);
        const total = getDaysBetween(paddedStart, paddedEnd);

        // Generate markers
        const markerList: { date: Date; label: string; position: number }[] = [];
        const current = new Date(paddedStart.getFullYear(), paddedStart.getMonth(), 1);

        while (current <= paddedEnd) {
            const pos = (getDaysBetween(paddedStart, current) / total) * 100;
            const label = viewMode === "monthly"
                ? current.toLocaleDateString('id-ID', { month: 'short', year: '2-digit' })
                : `Q${Math.ceil((current.getMonth() + 1) / 3)} ${current.getFullYear()}`;

            markerList.push({ date: new Date(current), label, position: pos });

            if (viewMode === "monthly") {
                current.setMonth(current.getMonth() + 1);
            } else {
                current.setMonth(current.getMonth() + 3);
            }
        }

        return { timelineStart: paddedStart, timelineEnd: paddedEnd, totalDays: total, markers: markerList };
    }, [salesData, viewMode]);

    // Get bar style
    const getBarStyle = (item: SalesItem) => {
        const start = parseDate(item.start_date);
        const end = parseDate(item.end_date);

        const startOffset = getDaysBetween(timelineStart, start);
        const duration = getDaysBetween(start, end);

        const left = (startOffset / totalDays) * 100;
        const width = (duration / totalDays) * 100;

        return { left: `${Math.max(left, 0)}%`, width: `${Math.max(width, 2)}%` };
    };

    if (authLoading || isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#e8c559]"></div>
            </div>
        );
    }

    if (!canAccessBisdev) {
        return (
            <div className="flex flex-col items-center justify-center h-64 text-center">
                <div className="text-6xl mb-4">🔒</div>
                <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-2">Access Denied</h2>
                <p className="text-[var(--text-secondary)]">Anda tidak memiliki akses ke halaman ini.</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                <div className="flex items-center gap-4">
                    {/* Back Button */}
                    <Link
                        href="/dashboard/bisdev/sales"
                        className="p-2 rounded-lg border border-[var(--glass-border)] hover:bg-[var(--glass-bg-hover)] transition-colors"
                    >
                        <ChevronLeft className="h-5 w-5 text-[var(--text-secondary)]" />
                    </Link>
                    {/* Icon Box */}
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
                        <TrendingUp className="h-6 w-6 text-white" />
                    </div>
                    <div>
                        {/* Breadcrumb */}
                        <div className="flex items-center gap-2 mb-1 text-sm text-[var(--text-secondary)]">
                            <Link href="/dashboard" className="hover:text-[var(--text-primary)] transition-colors">Dashboard</Link>
                            <ChevronRight className="h-4 w-4" />
                            <Link href="/dashboard/bisdev" className="hover:text-[var(--text-primary)] transition-colors">Bisdev</Link>
                            <ChevronRight className="h-4 w-4" />
                            <Link href="/dashboard/bisdev/sales" className="hover:text-[var(--text-primary)] transition-colors">Sales</Link>
                            <ChevronRight className="h-4 w-4" />
                            <span className="text-[var(--text-primary)]">Timeline</span>
                        </div>
                        <h1 className="text-2xl font-bold text-[var(--text-primary)]">Sales Timeline</h1>
                        <p className="text-sm text-[var(--text-secondary)]">Gantt chart visualization of sales</p>
                    </div>
                </div>

                {/* View Toggle */}
                <div className="flex items-center gap-3">
                    <div className="flex rounded-lg bg-[var(--glass-bg)] p-1 border border-[var(--glass-border)]">
                        <button
                            onClick={() => setViewMode("monthly")}
                            className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${viewMode === "monthly" ? "bg-[#e8c559] text-[#171611]" : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"}`}
                        >
                            Monthly
                        </button>
                        <button
                            onClick={() => setViewMode("quarterly")}
                            className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${viewMode === "quarterly" ? "bg-[#e8c559] text-[#171611]" : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"}`}
                        >
                            Quarterly
                        </button>
                    </div>
                </div>
            </div>

            {/* Timeline Chart */}
            <div className="flex-1 rounded-2xl border border-[var(--glass-border)] bg-white dark:bg-[#1c2120] overflow-hidden">
                {salesData.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-64 text-center">
                        <Calendar className="h-12 w-12 text-[var(--text-muted)] mb-4" />
                        <p className="text-[var(--text-secondary)]">No sales data with dates available</p>
                        <p className="text-sm text-[var(--text-muted)]">Add start and end dates to sales items to see them here</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        {/* Timeline Header */}
                        <div className="sticky top-0 z-10 bg-white dark:bg-[#1c2120] border-b border-[var(--glass-border)]">
                            <div className="flex">
                                <div className="w-64 min-w-64 p-4 border-r border-[var(--glass-border)] bg-black/5 dark:bg-white/5">
                                    <span className="text-xs font-bold text-[var(--text-muted)] uppercase">Project</span>
                                </div>
                                <div className="flex-1 relative h-12 bg-black/5 dark:bg-white/5">
                                    {markers.map((marker, idx) => (
                                        <div
                                            key={idx}
                                            className="absolute top-0 h-full flex items-center border-l border-[var(--glass-border)]"
                                            style={{ left: `${marker.position}%` }}
                                        >
                                            <span className="text-xs text-[var(--text-muted)] px-2 whitespace-nowrap">{marker.label}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Timeline Rows */}
                        <div className="min-w-[800px]">
                            {salesData.map((item) => {
                                const barStyle = getBarStyle(item);
                                const config = STATUS_CONFIG[item.status];

                                return (
                                    <div
                                        key={item.id}
                                        className="flex border-b border-[var(--glass-border)] hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                                    >
                                        {/* Project Info */}
                                        <div className="w-64 min-w-64 p-4 border-r border-[var(--glass-border)]">
                                            <h4 className="font-bold text-sm text-[var(--text-primary)] truncate">{item.project_name}</h4>
                                            <p className="text-xs text-[var(--text-secondary)] truncate">{item.company_name}</p>
                                        </div>

                                        {/* Gantt Bar */}
                                        <div className="flex-1 relative h-16 flex items-center">
                                            {/* Grid Lines */}
                                            {markers.map((marker, idx) => (
                                                <div
                                                    key={idx}
                                                    className="absolute top-0 h-full border-l border-[var(--glass-border)] opacity-50"
                                                    style={{ left: `${marker.position}%` }}
                                                />
                                            ))}

                                            {/* Bar */}
                                            <div
                                                className={`absolute h-8 rounded-lg ${config.barClass} shadow-md cursor-pointer transition-all hover:scale-[1.02] hover:shadow-lg`}
                                                style={barStyle}
                                                onClick={() => setSelectedItem(selectedItem?.id === item.id ? null : item)}
                                            >
                                                <div className="relative h-full px-2 flex items-center justify-between overflow-hidden">
                                                    <span className="text-[10px] font-bold text-white truncate">{item.progress}%</span>
                                                </div>
                                                {/* Progress overlay */}
                                                <div
                                                    className="absolute top-0 left-0 h-full bg-white/20 rounded-l-lg"
                                                    style={{ width: `${item.progress}%` }}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>

            {/* Selected Item Detail Panel */}
            {selectedItem && (
                <div className="mt-4 p-4 rounded-2xl border border-[var(--glass-border)] bg-white dark:bg-[#1c2120]">
                    <div className="flex items-start justify-between">
                        <div>
                            <h3 className="font-bold text-lg text-[var(--text-primary)]">{selectedItem.project_name}</h3>
                            <p className="text-sm text-[var(--text-secondary)]">{selectedItem.company_name}</p>
                        </div>
                        <button
                            onClick={() => setSelectedItem(null)}
                            className="p-2 rounded-lg hover:bg-black/10 dark:hover:bg-white/10"
                        >
                            ×
                        </button>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                        <div>
                            <span className="text-xs text-[var(--text-muted)]">Start Date</span>
                            <p className="text-sm font-medium text-[var(--text-primary)]">{formatDate(parseDate(selectedItem.start_date))}</p>
                        </div>
                        <div>
                            <span className="text-xs text-[var(--text-muted)]">End Date</span>
                            <p className="text-sm font-medium text-[var(--text-primary)]">{formatDate(parseDate(selectedItem.end_date))}</p>
                        </div>
                        <div>
                            <span className="text-xs text-[var(--text-muted)]">Contract Value</span>
                            <p className="text-sm font-medium text-[#e8c559]">{formatCurrency(selectedItem.contract_value)}</p>
                        </div>
                        <div>
                            <span className="text-xs text-[var(--text-muted)]">Progress</span>
                            <div className="flex items-center gap-2">
                                <div className="flex-1 h-2 bg-black/10 dark:bg-white/10 rounded-full overflow-hidden">
                                    <div className={`h-full ${STATUS_CONFIG[selectedItem.status].barClass}`} style={{ width: `${selectedItem.progress}%` }}></div>
                                </div>
                                <span className="text-sm font-bold text-[var(--text-primary)]">{selectedItem.progress}%</span>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Legend */}
            <div className="mt-4 flex flex-wrap gap-4">
                {(Object.keys(STATUS_CONFIG) as SalesStatus[]).map((status) => (
                    <div key={status} className="flex items-center gap-2">
                        <div className={`w-4 h-4 rounded ${STATUS_CONFIG[status].barClass}`}></div>
                        <span className="text-xs text-[var(--text-secondary)]">{STATUS_CONFIG[status].label}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}
