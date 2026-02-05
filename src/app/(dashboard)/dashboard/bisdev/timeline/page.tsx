"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Calendar, ChevronRight, ChevronLeft, TrendingUp, Users, FileText, Target } from "lucide-react";

// Category definitions
const CATEGORY_CONFIG = {
    sales: { label: "Sales", color: "from-emerald-500 to-emerald-600", barClass: "bg-emerald-500", Icon: TrendingUp },
    leads: { label: "Leads", color: "from-blue-500 to-blue-600", barClass: "bg-blue-500", Icon: Users },
    proposals: { label: "Proposals", color: "from-purple-500 to-purple-600", barClass: "bg-purple-500", Icon: FileText },
    prospects: { label: "Prospects", color: "from-cyan-500 to-cyan-600", barClass: "bg-cyan-500", Icon: Target },
};

type Category = keyof typeof CATEGORY_CONFIG;

interface TimelineItem {
    id: string;
    name: string;
    company: string;
    category: Category;
    start_date: string;
    end_date: string;
    progress: number;
}

const parseDate = (dateStr: string): Date => new Date(dateStr);
const formatDate = (date: Date): string => date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
const getDaysBetween = (start: Date, end: Date): number => Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
const addDays = (date: Date, days: number): Date => { const r = new Date(date); r.setDate(r.getDate() + days); return r; };

export default function CombinedTimelinePage() {
    const supabase = createClient();
    const { canAccessBisdev, isLoading: authLoading } = useAuth();
    const [timelineData, setTimelineData] = useState<TimelineItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [viewMode, setViewMode] = useState<"monthly" | "quarterly">("monthly");
    const [filterCategory, setFilterCategory] = useState<Category | "all">("all");
    const [selectedItem, setSelectedItem] = useState<TimelineItem | null>(null);

    useEffect(() => {
        const fetchData = async () => {
            if (!canAccessBisdev) return;
            try {
                // Fetch from all 4 tables
                const [salesRes, leadsRes, proposalsRes, prospectsRes] = await Promise.all([
                    supabase.from('bisdev_sales').select('id, project_name, company_name, start_date, end_date, progress').not('start_date', 'is', null).not('end_date', 'is', null),
                    supabase.from('bisdev_leads').select('id, company_name, start_date, end_date, progress').not('start_date', 'is', null).not('end_date', 'is', null),
                    supabase.from('bisdev_proposals').select('id, proposal_title, company_name, start_date, end_date, progress').not('start_date', 'is', null).not('end_date', 'is', null),
                    supabase.from('bisdev_prospects').select('id, company_name, start_date, end_date, progress').not('start_date', 'is', null).not('end_date', 'is', null),
                ]);

                const combined: TimelineItem[] = [];

                salesRes.data?.forEach((item: { id: string; project_name: string; company_name: string; start_date: string; end_date: string; progress: number }) => combined.push({
                    id: `sales-${item.id}`, name: item.project_name, company: item.company_name,
                    category: 'sales', start_date: item.start_date, end_date: item.end_date, progress: item.progress
                }));
                leadsRes.data?.forEach((item: { id: string; company_name: string; start_date: string; end_date: string; progress: number }) => combined.push({
                    id: `leads-${item.id}`, name: item.company_name, company: item.company_name,
                    category: 'leads', start_date: item.start_date, end_date: item.end_date, progress: item.progress
                }));
                proposalsRes.data?.forEach((item: { id: string; proposal_title: string; company_name: string; start_date: string; end_date: string; progress: number }) => combined.push({
                    id: `proposals-${item.id}`, name: item.proposal_title, company: item.company_name,
                    category: 'proposals', start_date: item.start_date, end_date: item.end_date, progress: item.progress
                }));
                prospectsRes.data?.forEach((item: { id: string; company_name: string; start_date: string; end_date: string; progress: number }) => combined.push({
                    id: `prospects-${item.id}`, name: item.company_name, company: item.company_name,
                    category: 'prospects', start_date: item.start_date, end_date: item.end_date, progress: item.progress
                }));

                // Sort by start date
                combined.sort((a, b) => parseDate(a.start_date).getTime() - parseDate(b.start_date).getTime());
                setTimelineData(combined);
            } catch (error) {
                console.error('Error:', error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchData();
    }, [canAccessBisdev]);

    // Filtered data
    const filteredData = useMemo(() => {
        if (filterCategory === "all") return timelineData;
        return timelineData.filter(item => item.category === filterCategory);
    }, [timelineData, filterCategory]);

    const { timelineStart, timelineEnd, totalDays, markers } = useMemo(() => {
        if (filteredData.length === 0) {
            const today = new Date();
            const start = new Date(today.getFullYear(), today.getMonth(), 1);
            const end = new Date(today.getFullYear(), today.getMonth() + 6, 0);
            return { timelineStart: start, timelineEnd: end, totalDays: getDaysBetween(start, end), markers: [] };
        }
        let minDate = parseDate(filteredData[0].start_date);
        let maxDate = parseDate(filteredData[0].end_date);
        filteredData.forEach(item => {
            const s = parseDate(item.start_date), e = parseDate(item.end_date);
            if (s < minDate) minDate = s;
            if (e > maxDate) maxDate = e;
        });
        const paddedStart = addDays(minDate, -15), paddedEnd = addDays(maxDate, 15);
        const total = getDaysBetween(paddedStart, paddedEnd);
        const markerList: { date: Date; label: string; position: number }[] = [];
        const current = new Date(paddedStart.getFullYear(), paddedStart.getMonth(), 1);
        while (current <= paddedEnd) {
            const pos = (getDaysBetween(paddedStart, current) / total) * 100;
            const label = viewMode === "monthly" ? current.toLocaleDateString('id-ID', { month: 'short', year: '2-digit' }) : `Q${Math.ceil((current.getMonth() + 1) / 3)} ${current.getFullYear()}`;
            markerList.push({ date: new Date(current), label, position: pos });
            current.setMonth(current.getMonth() + (viewMode === "monthly" ? 1 : 3));
        }
        return { timelineStart: paddedStart, timelineEnd: paddedEnd, totalDays: total, markers: markerList };
    }, [filteredData, viewMode]);

    const getBarStyle = (item: TimelineItem) => {
        const start = parseDate(item.start_date), end = parseDate(item.end_date);
        const startOffset = getDaysBetween(timelineStart, start), duration = getDaysBetween(start, end);
        return { left: `${Math.max((startOffset / totalDays) * 100, 0)}%`, width: `${Math.max((duration / totalDays) * 100, 2)}%` };
    };

    if (authLoading || isLoading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#e8c559]"></div></div>;
    if (!canAccessBisdev) return <div className="flex flex-col items-center justify-center h-64 text-center"><div className="text-6xl mb-4">🔒</div><h2 className="text-2xl font-bold text-[var(--text-primary)] mb-2">Access Denied</h2></div>;

    return (
        <div className="flex flex-col h-full">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                <div className="flex items-center gap-4">
                    <Link href="/dashboard/bisdev" className="p-2 rounded-lg border border-[var(--glass-border)] hover:bg-[var(--glass-bg-hover)]"><ChevronLeft className="h-5 w-5 text-[var(--text-secondary)]" /></Link>
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#e8c559] to-[#d4b44a] flex items-center justify-center shadow-lg shadow-[#e8c559]/20"><Calendar className="h-6 w-6 text-[#171611]" /></div>
                    <div>
                        <div className="flex items-center gap-2 mb-1 text-sm text-[var(--text-secondary)]">
                            <Link href="/dashboard" className="hover:text-[var(--text-primary)]">Dashboard</Link><ChevronRight className="h-4 w-4" />
                            <Link href="/dashboard/bisdev" className="hover:text-[var(--text-primary)]">Bisdev</Link><ChevronRight className="h-4 w-4" />
                            <span className="text-[var(--text-primary)]">Timeline</span>
                        </div>
                        <h1 className="text-2xl font-bold text-[var(--text-primary)]">Business Timeline</h1>
                        <p className="text-sm text-[var(--text-secondary)]">Combined Gantt chart for all categories</p>
                    </div>
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                    {/* Category Filter */}
                    <select
                        value={filterCategory}
                        onChange={(e) => setFilterCategory(e.target.value as Category | "all")}
                        className="px-4 py-2 rounded-lg border border-[var(--glass-border)] bg-[var(--glass-bg)] text-[var(--text-primary)] text-sm"
                    >
                        <option value="all">All Categories</option>
                        {(Object.keys(CATEGORY_CONFIG) as Category[]).map(cat => (
                            <option key={cat} value={cat}>{CATEGORY_CONFIG[cat].label}</option>
                        ))}
                    </select>
                    {/* View Toggle */}
                    <div className="flex rounded-lg bg-[var(--glass-bg)] p-1 border border-[var(--glass-border)]">
                        <button onClick={() => setViewMode("monthly")} className={`px-4 py-2 rounded-md text-sm font-medium ${viewMode === "monthly" ? "bg-[#e8c559] text-[#171611]" : "text-[var(--text-secondary)]"}`}>Monthly</button>
                        <button onClick={() => setViewMode("quarterly")} className={`px-4 py-2 rounded-md text-sm font-medium ${viewMode === "quarterly" ? "bg-[#e8c559] text-[#171611]" : "text-[var(--text-secondary)]"}`}>Quarterly</button>
                    </div>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                {(Object.keys(CATEGORY_CONFIG) as Category[]).map(cat => {
                    const config = CATEGORY_CONFIG[cat];
                    const count = timelineData.filter(i => i.category === cat).length;
                    return (
                        <div key={cat} className={`p-4 rounded-xl bg-gradient-to-br ${config.color} text-white`}>
                            <div className="flex items-center justify-between">
                                <span className="text-sm font-medium opacity-90">{config.label}</span>
                                <config.Icon className="h-5 w-5 opacity-70" />
                            </div>
                            <p className="text-2xl font-bold mt-1">{count}</p>
                        </div>
                    );
                })}
            </div>

            <div className="flex-1 rounded-2xl border border-[var(--glass-border)] bg-white dark:bg-[#1c2120] overflow-hidden">
                {filteredData.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-64"><Calendar className="h-12 w-12 text-[var(--text-muted)] mb-4" /><p className="text-[var(--text-secondary)]">No data with dates available</p></div>
                ) : (
                    <div className="overflow-x-auto">
                        <div className="sticky top-0 z-10 bg-white dark:bg-[#1c2120] border-b border-[var(--glass-border)]">
                            <div className="flex">
                                <div className="w-72 min-w-72 p-4 border-r border-[var(--glass-border)] bg-black/5 dark:bg-white/5"><span className="text-xs font-bold text-[var(--text-muted)] uppercase">Item</span></div>
                                <div className="flex-1 relative h-12 bg-black/5 dark:bg-white/5">
                                    {markers.map((m, i) => <div key={i} className="absolute top-0 h-full flex items-center border-l border-[var(--glass-border)]" style={{ left: `${m.position}%` }}><span className="text-xs text-[var(--text-muted)] px-2 whitespace-nowrap">{m.label}</span></div>)}
                                </div>
                            </div>
                        </div>
                        <div className="min-w-[900px]">
                            {filteredData.map((item) => {
                                const config = CATEGORY_CONFIG[item.category];
                                return (
                                    <div key={item.id} className="flex border-b border-[var(--glass-border)] hover:bg-black/5 dark:hover:bg-white/5">
                                        <div className="w-72 min-w-72 p-4 border-r border-[var(--glass-border)]">
                                            <div className="flex items-center gap-2">
                                                <div className={`w-2 h-2 rounded-full ${config.barClass}`}></div>
                                                <span className="text-[10px] font-bold uppercase text-[var(--text-muted)]">{config.label}</span>
                                            </div>
                                            <h4 className="font-bold text-sm text-[var(--text-primary)] truncate">{item.name}</h4>
                                            <p className="text-xs text-[var(--text-secondary)] truncate">{item.company}</p>
                                        </div>
                                        <div className="flex-1 relative h-20 flex items-center">
                                            {markers.map((m, i) => <div key={i} className="absolute top-0 h-full border-l border-[var(--glass-border)] opacity-50" style={{ left: `${m.position}%` }} />)}
                                            <div className={`absolute h-8 rounded-lg ${config.barClass} shadow-md cursor-pointer hover:scale-[1.02]`} style={getBarStyle(item)} onClick={() => setSelectedItem(selectedItem?.id === item.id ? null : item)}>
                                                <div className="h-full px-2 flex items-center overflow-hidden"><span className="text-[10px] font-bold text-white truncate">{item.progress}%</span></div>
                                                <div className="absolute top-0 left-0 h-full bg-white/20 rounded-l-lg" style={{ width: `${item.progress}%` }} />
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>

            {selectedItem && (
                <div className="mt-4 p-4 rounded-2xl border border-[var(--glass-border)] bg-white dark:bg-[#1c2120]">
                    <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                            <div className={`w-3 h-3 rounded-full ${CATEGORY_CONFIG[selectedItem.category].barClass}`}></div>
                            <div><h3 className="font-bold text-lg text-[var(--text-primary)]">{selectedItem.name}</h3><p className="text-sm text-[var(--text-secondary)]">{selectedItem.company} · {CATEGORY_CONFIG[selectedItem.category].label}</p></div>
                        </div>
                        <button onClick={() => setSelectedItem(null)} className="p-2 rounded-lg hover:bg-black/10">×</button>
                    </div>
                    <div className="grid grid-cols-3 gap-4 mt-4">
                        <div><span className="text-xs text-[var(--text-muted)]">Start Date</span><p className="text-sm font-medium text-[var(--text-primary)]">{formatDate(parseDate(selectedItem.start_date))}</p></div>
                        <div><span className="text-xs text-[var(--text-muted)]">End Date</span><p className="text-sm font-medium text-[var(--text-primary)]">{formatDate(parseDate(selectedItem.end_date))}</p></div>
                        <div><span className="text-xs text-[var(--text-muted)]">Progress</span><div className="flex items-center gap-2"><div className="flex-1 h-2 bg-black/10 rounded-full overflow-hidden"><div className={`h-full ${CATEGORY_CONFIG[selectedItem.category].barClass}`} style={{ width: `${selectedItem.progress}%` }}></div></div><span className="text-sm font-bold">{selectedItem.progress}%</span></div></div>
                    </div>
                </div>
            )}

            {/* Legend */}
            <div className="mt-4 flex flex-wrap gap-4">{(Object.keys(CATEGORY_CONFIG) as Category[]).map((cat) => <div key={cat} className="flex items-center gap-2"><div className={`w-4 h-4 rounded ${CATEGORY_CONFIG[cat].barClass}`}></div><span className="text-xs text-[var(--text-secondary)]">{CATEGORY_CONFIG[cat].label}</span></div>)}</div>
        </div>
    );
}
