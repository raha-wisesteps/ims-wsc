"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Users, ChevronRight, ChevronLeft, Calendar } from "lucide-react";

const STATUS_CONFIG = {
    cold: { label: "Cold", barClass: "bg-gray-500" },
    warm: { label: "Warm", barClass: "bg-amber-500" },
    hot: { label: "Hot", barClass: "bg-rose-500" },
    qualified: { label: "Qualified", barClass: "bg-emerald-500" },
};

type LeadStatus = keyof typeof STATUS_CONFIG;

interface LeadItem {
    id: string;
    company_name: string;
    pic_name: string | null;
    status: LeadStatus;
    start_date: string | null;
    end_date: string | null;
    progress: number;
}

const parseDate = (dateStr: string | null): Date => dateStr ? new Date(dateStr) : new Date();
const formatDate = (date: Date): string => date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
const getDaysBetween = (start: Date, end: Date): number => Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
const addDays = (date: Date, days: number): Date => { const r = new Date(date); r.setDate(r.getDate() + days); return r; };

export default function LeadsTimelinePage() {
    const supabase = createClient();
    const { canAccessBisdev, isLoading: authLoading } = useAuth();
    const [leadsData, setLeadsData] = useState<LeadItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [viewMode, setViewMode] = useState<"monthly" | "quarterly">("monthly");
    const [selectedItem, setSelectedItem] = useState<LeadItem | null>(null);

    useEffect(() => {
        const fetchData = async () => {
            if (!canAccessBisdev) return;
            try {
                const { data, error } = await supabase
                    .from('bisdev_leads')
                    .select('id, company_name, pic_name, status, start_date, end_date, progress')
                    .not('start_date', 'is', null)
                    .not('end_date', 'is', null)
                    .order('start_date', { ascending: true });
                if (error) throw error;
                setLeadsData(data || []);
            } catch (error) {
                console.error('Error fetching leads:', error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchData();
    }, [canAccessBisdev]);

    const { timelineStart, timelineEnd, totalDays, markers } = useMemo(() => {
        if (leadsData.length === 0) {
            const today = new Date();
            const start = new Date(today.getFullYear(), today.getMonth(), 1);
            const end = new Date(today.getFullYear(), today.getMonth() + 6, 0);
            return { timelineStart: start, timelineEnd: end, totalDays: getDaysBetween(start, end), markers: [] };
        }
        let minDate = parseDate(leadsData[0].start_date);
        let maxDate = parseDate(leadsData[0].end_date);
        leadsData.forEach(item => {
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
    }, [leadsData, viewMode]);

    const getBarStyle = (item: LeadItem) => {
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
                    <Link href="/dashboard/bisdev/leads" className="p-2 rounded-lg border border-[var(--glass-border)] hover:bg-[var(--glass-bg-hover)]"><ChevronLeft className="h-5 w-5 text-[var(--text-secondary)]" /></Link>
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/20"><Users className="h-6 w-6 text-white" /></div>
                    <div>
                        <div className="flex items-center gap-2 mb-1 text-sm text-[var(--text-secondary)]">
                            <Link href="/dashboard" className="hover:text-[var(--text-primary)]">Dashboard</Link><ChevronRight className="h-4 w-4" />
                            <Link href="/dashboard/bisdev" className="hover:text-[var(--text-primary)]">Bisdev</Link><ChevronRight className="h-4 w-4" />
                            <Link href="/dashboard/bisdev/leads" className="hover:text-[var(--text-primary)]">Leads</Link><ChevronRight className="h-4 w-4" />
                            <span className="text-[var(--text-primary)]">Timeline</span>
                        </div>
                        <h1 className="text-2xl font-bold text-[var(--text-primary)]">Leads Timeline</h1>
                        <p className="text-sm text-[var(--text-secondary)]">Gantt chart visualization of leads</p>
                    </div>
                </div>
                <div className="flex rounded-lg bg-[var(--glass-bg)] p-1 border border-[var(--glass-border)]">
                    <button onClick={() => setViewMode("monthly")} className={`px-4 py-2 rounded-md text-sm font-medium ${viewMode === "monthly" ? "bg-[#e8c559] text-[#171611]" : "text-[var(--text-secondary)]"}`}>Monthly</button>
                    <button onClick={() => setViewMode("quarterly")} className={`px-4 py-2 rounded-md text-sm font-medium ${viewMode === "quarterly" ? "bg-[#e8c559] text-[#171611]" : "text-[var(--text-secondary)]"}`}>Quarterly</button>
                </div>
            </div>
            <div className="flex-1 rounded-2xl border border-[var(--glass-border)] bg-white dark:bg-[#1c2120] overflow-hidden">
                {leadsData.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-64"><Calendar className="h-12 w-12 text-[var(--text-muted)] mb-4" /><p className="text-[var(--text-secondary)]">No leads data with dates</p></div>
                ) : (
                    <div className="overflow-x-auto">
                        <div className="sticky top-0 z-10 bg-white dark:bg-[#1c2120] border-b border-[var(--glass-border)]">
                            <div className="flex">
                                <div className="w-64 min-w-64 p-4 border-r border-[var(--glass-border)] bg-black/5 dark:bg-white/5"><span className="text-xs font-bold text-[var(--text-muted)] uppercase">Lead</span></div>
                                <div className="flex-1 relative h-12 bg-black/5 dark:bg-white/5">
                                    {markers.map((m, i) => <div key={i} className="absolute top-0 h-full flex items-center border-l border-[var(--glass-border)]" style={{ left: `${m.position}%` }}><span className="text-xs text-[var(--text-muted)] px-2 whitespace-nowrap">{m.label}</span></div>)}
                                </div>
                            </div>
                        </div>
                        <div className="min-w-[800px]">
                            {leadsData.map((item) => (
                                <div key={item.id} className="flex border-b border-[var(--glass-border)] hover:bg-black/5 dark:hover:bg-white/5">
                                    <div className="w-64 min-w-64 p-4 border-r border-[var(--glass-border)]">
                                        <h4 className="font-bold text-sm text-[var(--text-primary)] truncate">{item.company_name}</h4>
                                        <p className="text-xs text-[var(--text-secondary)] truncate">{item.pic_name || 'No PIC'}</p>
                                    </div>
                                    <div className="flex-1 relative h-16 flex items-center">
                                        {markers.map((m, i) => <div key={i} className="absolute top-0 h-full border-l border-[var(--glass-border)] opacity-50" style={{ left: `${m.position}%` }} />)}
                                        <div className={`absolute h-8 rounded-lg ${STATUS_CONFIG[item.status].barClass} shadow-md cursor-pointer hover:scale-[1.02]`} style={getBarStyle(item)} onClick={() => setSelectedItem(selectedItem?.id === item.id ? null : item)}>
                                            <div className="h-full px-2 flex items-center"><span className="text-[10px] font-bold text-white truncate">{item.progress}%</span></div>
                                            <div className="absolute top-0 left-0 h-full bg-white/20 rounded-l-lg" style={{ width: `${item.progress}%` }} />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
            {selectedItem && (
                <div className="mt-4 p-4 rounded-2xl border border-[var(--glass-border)] bg-white dark:bg-[#1c2120]">
                    <div className="flex items-start justify-between"><div><h3 className="font-bold text-lg text-[var(--text-primary)]">{selectedItem.company_name}</h3><p className="text-sm text-[var(--text-secondary)]">{selectedItem.pic_name || 'No PIC'}</p></div><button onClick={() => setSelectedItem(null)} className="p-2 rounded-lg hover:bg-black/10">×</button></div>
                    <div className="grid grid-cols-3 gap-4 mt-4">
                        <div><span className="text-xs text-[var(--text-muted)]">Start Date</span><p className="text-sm font-medium text-[var(--text-primary)]">{formatDate(parseDate(selectedItem.start_date))}</p></div>
                        <div><span className="text-xs text-[var(--text-muted)]">End Date</span><p className="text-sm font-medium text-[var(--text-primary)]">{formatDate(parseDate(selectedItem.end_date))}</p></div>
                        <div><span className="text-xs text-[var(--text-muted)]">Progress</span><div className="flex items-center gap-2"><div className="flex-1 h-2 bg-black/10 rounded-full overflow-hidden"><div className={`h-full ${STATUS_CONFIG[selectedItem.status].barClass}`} style={{ width: `${selectedItem.progress}%` }}></div></div><span className="text-sm font-bold">{selectedItem.progress}%</span></div></div>
                    </div>
                </div>
            )}
            <div className="mt-4 flex flex-wrap gap-4">{(Object.keys(STATUS_CONFIG) as LeadStatus[]).map((s) => <div key={s} className="flex items-center gap-2"><div className={`w-4 h-4 rounded ${STATUS_CONFIG[s].barClass}`}></div><span className="text-xs text-[var(--text-secondary)]">{STATUS_CONFIG[s].label}</span></div>)}</div>
        </div>
    );
}
