"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
    ChevronLeft,
    ChevronRight,
    RotateCcw,
    FileText,
    Save,
    BadgeCheck,
    Settings,
    X,
    Droplets,
    History,
    Wand2,
    Calendar,
    Check,
    Leaf
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// Types
interface DailyLog {
    id?: string;
    day: string;
    date: string;       // Display: "15 Oct"
    fullDate: string;   // ISO: "2023-10-15"
    employeeCount: number;
    isHoliday: boolean;
    waterUsage: number;  // Calculated: count * (hw_vol*freq + tf_vol*freq)
    carbon: number;      // Calculated: water/1000 * factor
    notes: string;
    attendees?: any[]; // Keep reference if needed for syncing
}

interface WeeklyReport {
    id: string;
    weekRange: string;
    submittedAt: string;
    totalWater: number;
    totalCarbon: number;
}

interface WaterConfig {
    hand_wash_freq: number;
    hand_wash_vol: number;
    toilet_flush_freq: number;
    toilet_flush_vol: number;
    emission_factor: number;
}

const DEFAULT_CONFIG: WaterConfig = {
    hand_wash_freq: 4,
    hand_wash_vol: 1.5,
    toilet_flush_freq: 3,
    toilet_flush_vol: 6.0,
    emission_factor: 0.344
};

export default function WaterReportPage() {
    const supabase = createClient();

    // Stats
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [weekLogs, setWeekLogs] = useState<DailyLog[]>([]);
    const [recentHistory, setRecentHistory] = useState<WeeklyReport[]>([]);

    // Status
    const [isSubmitted, setIsSubmitted] = useState(false);
    const [isDirty, setIsDirty] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    // Config
    const [config, setConfig] = useState<WaterConfig>(DEFAULT_CONFIG);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [tempConfig, setTempConfig] = useState<WaterConfig>(DEFAULT_CONFIG);

    // Initial Load
    useEffect(() => {
        fetchWeekData(selectedDate);
        fetchRecentHistory();
    }, [selectedDate]);

    // Data Fetching
    const fetchRecentHistory = async () => {
        const { data, error } = await supabase
            .from('water_weekly_reports')
            .select('*')
            .not('submitted_at', 'is', null)
            .order('submitted_at', { ascending: false })
            .limit(5);

        if (error) {
            console.error('Error fetching history:', error);
            return;
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const formattedHistory: WeeklyReport[] = data.map((report: any) => ({
            id: report.id,
            weekRange: `${new Date(report.week_start).toLocaleDateString('en-US', { day: '2-digit', month: 'short' })} - ${new Date(report.week_end).toLocaleDateString('en-US', { day: '2-digit', month: 'short' })} ${new Date(report.week_start).getFullYear()}`,
            submittedAt: report.submitted_at ? new Date(report.submitted_at).toLocaleString() : "-",
            totalWater: report.total_water_liters,
            totalCarbon: report.total_carbon_kg
        }));

        setRecentHistory(formattedHistory);
    };

    const fetchWeekData = async (baseDate: Date) => {
        setIsLoading(true);
        try {
            // 1. Calculate Week Range (Monday - Friday)
            const day = baseDate.getDay();
            const diff = baseDate.getDate() - day + (day === 0 ? -6 : 1);
            const monday = new Date(new Date(baseDate).setDate(diff));

            const mondayStr = monday.toISOString().split('T')[0];
            const friday = new Date(monday);
            friday.setDate(monday.getDate() + 4);
            const fridayStr = friday.toISOString().split('T')[0];

            // Parallel Fetch: Logs, Report, Config
            const [logsRes, reportRes, configRes] = await Promise.all([
                supabase.from('water_logs').select('*').gte('date', mondayStr).lte('date', fridayStr),
                supabase.from('water_weekly_reports').select('*').eq('week_start', mondayStr).single(),
                supabase.from('water_config').select('*').single()
            ]);

            // Handle Config
            let currentConfig = DEFAULT_CONFIG;

            if (reportRes.data) {
                currentConfig = {
                    hand_wash_freq: reportRes.data.hand_wash_freq ?? DEFAULT_CONFIG.hand_wash_freq,
                    hand_wash_vol: reportRes.data.hand_wash_vol ?? DEFAULT_CONFIG.hand_wash_vol,
                    toilet_flush_freq: reportRes.data.toilet_flush_freq ?? DEFAULT_CONFIG.toilet_flush_freq,
                    toilet_flush_vol: reportRes.data.toilet_flush_vol ?? DEFAULT_CONFIG.toilet_flush_vol,
                    emission_factor: reportRes.data.emission_factor ?? DEFAULT_CONFIG.emission_factor,
                };
                setIsSubmitted(!!reportRes.data.submitted_at);
            } else {
                if (configRes.data) {
                    currentConfig = configRes.data;
                    currentConfig = { ...DEFAULT_CONFIG, ...currentConfig };
                }
                setIsSubmitted(false);
            }

            setConfig(currentConfig);
            setTempConfig(currentConfig);

            // Populate Week Logs
            const newLogs: DailyLog[] = [];
            for (let i = 0; i < 5; i++) {
                const currentDate = new Date(monday);
                currentDate.setDate(monday.getDate() + i);
                const dateStr = currentDate.toISOString().split('T')[0];

                const dbLog = logsRes.data?.find((l: any) => l.date === dateStr);
                const count = dbLog?.employee_count ?? 0;
                const isHoliday = dbLog?.is_holiday ?? false;
                const calculated = calculateUsage(count, isHoliday, currentConfig);

                newLogs.push({
                    id: dbLog?.id,
                    day: currentDate.toLocaleDateString('en-US', { weekday: 'short' }),
                    date: currentDate.toLocaleDateString('en-US', { day: '2-digit', month: 'short' }),
                    fullDate: dateStr,
                    employeeCount: count,
                    isHoliday: isHoliday,
                    waterUsage: calculated.water,
                    carbon: calculated.carbon,
                    notes: dbLog?.notes || "",
                    attendees: dbLog?.attendees
                });
            }
            setWeekLogs(newLogs);
            setIsDirty(false);

        } catch (error) {
            console.error("Error fetching week data:", error);
            toast.error("Failed to load weekly data");
        } finally {
            setIsLoading(false);
        }
    };

    // Calculation Logic
    const calculateUsage = (count: number, isHoliday: boolean, cfg: WaterConfig) => {
        if (isHoliday) return { water: 0, carbon: 0 };

        const handWash = count * cfg.hand_wash_freq * cfg.hand_wash_vol;
        const toiletFlush = count * cfg.toilet_flush_freq * cfg.toilet_flush_vol;
        const totalWater = handWash + toiletFlush;
        const totalCarbon = (totalWater / 1000) * cfg.emission_factor;

        return { water: totalWater, carbon: totalCarbon };
    };

    // Derived Stats for Current View
    const currentTotalWater = weekLogs.reduce((acc, log) => acc + log.waterUsage, 0);
    const currentTotalCarbon = weekLogs.reduce((acc, log) => acc + log.carbon, 0);

    // Handlers
    const handleWeekChange = (direction: 'prev' | 'next') => {
        const newDate = new Date(selectedDate);
        newDate.setDate(selectedDate.getDate() + (direction === 'next' ? 7 : -7));
        setSelectedDate(newDate);
    };

    const handleCountChange = (index: number, count: string) => {
        const val = parseInt(count) || 0;
        const logs = [...weekLogs];
        const log = logs[index];
        const stats = calculateUsage(val, log.isHoliday, config);

        logs[index] = {
            ...log,
            employeeCount: val,
            waterUsage: stats.water,
            carbon: stats.carbon
        };
        setWeekLogs(logs);
        setIsDirty(true);
    };

    const handleHolidayToggle = (index: number) => {
        const logs = [...weekLogs];
        const log = logs[index];
        const newStatus = !log.isHoliday;
        const stats = calculateUsage(log.employeeCount, newStatus, config);

        logs[index] = {
            ...log,
            isHoliday: newStatus,
            waterUsage: stats.water,
            carbon: stats.carbon
        };
        setWeekLogs(logs);
        setIsDirty(true);
    };

    const handleNoteChange = (index: number, note: string) => {
        const logs = [...weekLogs];
        logs[index].notes = note;
        setWeekLogs(logs);
        setIsDirty(true);
    };

    // Sync Attendance
    const handleSyncAttendance = async (index: number) => {
        const log = weekLogs[index];
        const date = log.fullDate;

        try {
            const { data, error } = await supabase
                .from('daily_checkins')
                .select('profile:profiles!inner(role)')
                .eq('checkin_date', date)
                // @ts-ignore
                .neq('profile.role', 'hr');

            if (error) throw error;

            const count = data?.length ?? 0;

            if (count !== log.employeeCount) {
                handleCountChange(index, count.toString());
                toast.success(`Synced: ${count} employees found.`);
            } else {
                toast.info("Count matches attendance records.");
            }

        } catch (error) {
            console.error("Sync error:", error);
            toast.error("Failed to sync attendance");
        }
    };

    // Save & Submit
    const handleSave = async () => {
        setIsSaving(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("Not authenticated");

            // 1. Upsert Daily Logs
            const updates = weekLogs.map(log => ({
                date: log.fullDate,
                employee_count: log.employeeCount,
                is_holiday: log.isHoliday,
                // notes removed
                total_water_liters: log.waterUsage,
                carbon_emission: log.carbon,
                created_by: user.id
            }));

            const { error: logsError } = await supabase.from('water_logs').upsert(updates, { onConflict: 'date' });
            if (logsError) throw logsError;

            // 2. Upsert Weekly Report (Auto-update history)
            const totalWater = weekLogs.reduce((acc, l) => acc + l.waterUsage, 0);
            const totalCarbon = weekLogs.reduce((acc, l) => acc + l.carbon, 0);
            const monday = weekLogs[0].fullDate;
            const friday = weekLogs[4].fullDate;

            const { error: reportError } = await supabase.from('water_weekly_reports').upsert({
                week_start: monday,
                week_end: friday,
                submitted_at: new Date().toISOString(), // Keep track of latest save time as "submission"
                total_water_liters: totalWater,
                total_carbon_kg: totalCarbon,
                hand_wash_freq: config.hand_wash_freq,
                hand_wash_vol: config.hand_wash_vol,
                toilet_flush_freq: config.toilet_flush_freq,
                toilet_flush_vol: config.toilet_flush_vol,
                emission_factor: config.emission_factor,
                // created_by: user.id // TODO: Uncomment after migration 127 is applied
            }, { onConflict: 'week_start' });

            if (reportError) throw reportError;

            toast.success("Progress saved & history updated");
            setIsDirty(false);
            fetchWeekData(selectedDate);
            fetchRecentHistory(); // Refresh history immediately
        } catch (error) {
            console.error("Save error full:", error);
            toast.error("Failed to save progress");
        } finally {
            setIsSaving(false);
        }
    };

    // Settings
    const handleSaveSettings = async () => {
        setIsSaving(true);
        try {
            // Update global config
            const { error } = await supabase.from('water_config').upsert({
                id: (await supabase.from('water_config').select('id').single()).data?.id,
                ...tempConfig
            });

            if (error) throw error;

            setConfig(tempConfig);
            setIsSettingsOpen(false);
            toast.success("Settings updated");

            // Re-calculate and save current week with new settings
            // This ensures if settings change, the current week's report is updated
            // We can trigger handleSave() but that uses current state which isn't updated?
            // Actually config state IS updated above.
            // But we need to recalculate Logs state first?
            // Simpler: Just refresh data. Log calculation happens on render/state.

            fetchWeekData(selectedDate);

        } catch (error) {
            console.error("Settings error:", error);
            toast.error("Failed to update settings");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="space-y-8 pb-20 relative">
            {/* Header */}
            <div className="flex flex-col gap-4 md:flex-row md:items-end justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
                        <Droplets className="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2 mb-1 text-sm text-gray-500 dark:text-gray-400">
                            <Link href="/dashboard" className="hover:text-gray-900 dark:hover:text-white transition-colors">Dashboard</Link>
                            <ChevronRight className="h-4 w-4" />
                            <Link href="/dashboard/sustainability" className="hover:text-gray-900 dark:hover:text-white transition-colors">Sustainability</Link>
                            <ChevronRight className="h-4 w-4" />
                            <span className="text-gray-900 dark:text-white">Water Management</span>
                        </div>
                        <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">Water Consumption Log</h1>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Weekly tracking based on attendance</p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    {/* Settings Button */}
                    <button
                        onClick={() => setIsSettingsOpen(true)}
                        className="p-3 rounded-xl bg-white dark:bg-[#1c2120] border border-gray-200 dark:border-white/10 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:border-[#e8c559] transition-colors shadow-sm"
                        title="Configuration"
                    >
                        <Settings className="w-5 h-5" />
                    </button>

                    <button
                        onClick={handleSave}
                        disabled={!isDirty || isSaving}
                        className={cn(
                            "flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all border",
                            isDirty
                                ? "bg-[#e8c559] text-[#171611] hover:bg-[#d4b44e] shadow-lg hover:shadow-orange-500/10 border-transparent"
                                : "bg-gray-100 dark:bg-white/5 text-gray-400 dark:text-gray-500 border-transparent dark:border-white/10 opacity-50 cursor-not-allowed"
                        )}
                    >
                        <Save className="w-5 h-5" />
                        Save Changes
                    </button>
                    {/* Submit button removed */}
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Total Water Stats */}
                <div className="glass-panel p-6 rounded-2xl border border-cyan-500/20 bg-cyan-500/5 relative overflow-hidden shadow-sm">
                    <div className="absolute top-0 right-0 p-4 opacity-10">
                        <Droplets className="w-24 h-24 text-cyan-500" />
                    </div>
                    <div className="relative z-10">
                        <p className="text-cyan-600 dark:text-cyan-400 text-sm font-bold uppercase tracking-wider mb-2">Total Water Used</p>
                        <div className="flex items-baseline gap-2">
                            <span className="text-4xl font-black text-[var(--text-primary)]">{currentTotalWater.toFixed(1)}</span>
                            <span className="text-sm text-[var(--text-secondary)] font-medium">Liters</span>
                        </div>
                        <p className="text-xs text-[var(--text-secondary)] mt-2">Based on {config.hand_wash_freq * config.hand_wash_vol + config.toilet_flush_freq * config.toilet_flush_vol}L per person/day</p>
                    </div>
                </div>

                {/* Carbon Emission Stats */}
                <div className="glass-panel p-6 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 relative overflow-hidden shadow-sm">
                    <div className="absolute top-0 right-0 p-4 opacity-10">
                        <Leaf className="w-24 h-24 text-emerald-500" />
                    </div>
                    <div className="relative z-10">
                        <p className="text-emerald-600 dark:text-emerald-400 text-sm font-bold uppercase tracking-wider mb-2">Est. Carbon Emission</p>
                        <div className="flex items-baseline gap-2">
                            <span className="text-4xl font-black text-[var(--text-primary)]">{currentTotalCarbon.toFixed(3)}</span>
                            <span className="text-sm text-[var(--text-secondary)] font-medium">kgCO2e</span>
                        </div>
                        <p className="text-xs text-[var(--text-secondary)] mt-2">Factor: {config.emission_factor} kgCO2e/m³</p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Main Content: Weekly Table & History */}
                <div className="lg:col-span-2 space-y-8">
                    {/* Active Week Table */}
                    <div className="bg-white dark:glass-panel p-6 rounded-xl border border-gray-200 dark:border-white/10 shadow-sm">
                        {/* Week Navigation */}
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-4">
                                <div className="flex items-center bg-gray-100 dark:bg-white/5 rounded-lg border border-gray-200 dark:border-white/10 p-1">
                                    <button onClick={() => handleWeekChange('prev')} className="p-1 hover:bg-gray-200 dark:hover:bg-white/10 rounded-md transition-colors text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white">
                                        <ChevronLeft className="w-5 h-5" />
                                    </button>
                                    <div className="px-3 py-1 flex items-center gap-2 text-sm font-medium text-gray-900 dark:text-white border-l border-r border-gray-200 dark:border-white/10 mx-1">
                                        <Calendar className="w-4 h-4 text-blue-500" />
                                        <span>
                                            {weekLogs.length > 0 ? `${weekLogs[0].date} - ${weekLogs[4].date}` : "Loading..."}
                                        </span>
                                    </div>
                                    <button onClick={() => handleWeekChange('next')} className="p-1 hover:bg-gray-200 dark:hover:bg-white/10 rounded-md transition-colors text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white">
                                        <ChevronRight className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-gray-50 dark:bg-white/5 text-xs text-gray-500 dark:text-gray-400 uppercase">
                                    <tr>
                                        <th className="px-4 py-3 font-semibold">Date</th>
                                        <th className="px-4 py-3 font-semibold text-center w-32">Employees</th>
                                        <th className="px-4 py-3 font-semibold text-center">Status</th>
                                        <th className="px-4 py-3 font-semibold text-right">Water (L)</th>
                                        {/* Notes column removed */}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                                    {isLoading ? (
                                        <tr><td colSpan={4} className="p-8 text-center text-gray-500">Loading week data...</td></tr>
                                    ) : weekLogs.map((log, index) => (
                                        <tr key={index} className="hover:bg-gray-50 dark:hover:bg-white/[0.02] transition-colors group">
                                            <td className="px-4 py-3">
                                                <div className="font-medium text-gray-900 dark:text-white">{log.day}</div>
                                                <div className="text-xs text-gray-500">{log.date}</div>
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex items-center justify-center gap-1">
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        value={log.employeeCount}
                                                        onChange={(e) => handleCountChange(index, e.target.value)}
                                                        disabled={log.isHoliday}
                                                        className="w-16 bg-gray-100 dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-lg px-2 py-1 text-center text-gray-900 dark:text-white focus:outline-none focus:border-blue-500 transition-colors disabled:opacity-50 text-sm"
                                                    />
                                                    <button
                                                        onClick={() => handleSyncAttendance(index)}
                                                        className="p-1.5 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-500/10 rounded-lg transition-colors"
                                                        title="Sync"
                                                    >
                                                        <Wand2 className="w-3 h-3" />
                                                    </button>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                <button
                                                    onClick={() => handleHolidayToggle(index)}
                                                    className={cn(
                                                        "px-2 py-1 rounded-full text-[10px] font-medium border transition-colors",
                                                        log.isHoliday
                                                            ? "bg-purple-50 dark:bg-purple-500/20 text-purple-600 dark:text-purple-400 border-purple-200 dark:border-purple-500/30 hover:bg-purple-100 dark:hover:bg-purple-500/30"
                                                            : "bg-emerald-50 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/30 hover:bg-emerald-100 dark:hover:bg-emerald-500/30"
                                                    )}
                                                >
                                                    {log.isHoliday ? "Holiday" : "Work Day"}
                                                </button>
                                            </td>
                                            <td className="px-4 py-3 text-right font-mono text-blue-600 dark:text-blue-400 text-sm">
                                                {log.waterUsage.toFixed(1)}
                                            </td>
                                            {/* Notes cell removed */}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Report History */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between px-2">
                            <div className="flex items-center gap-3">
                                <History className="w-5 h-5 text-gray-500" />
                                <h3 className="font-bold text-gray-900 dark:text-white">Recent History</h3>
                            </div>
                            <Link href="/dashboard/sustainability/water/history" className="text-xs text-blue-500 hover:text-blue-400 transition-colors">
                                View Full History &rarr;
                            </Link>
                        </div>

                        {recentHistory.length === 0 && (
                            <div className="py-8 text-center text-gray-500 text-sm italic">
                                No reports submitted yet.
                            </div>
                        )}

                        {recentHistory.map((report) => (
                            <div key={report.id} className="bg-white dark:glass-panel rounded-xl border border-gray-200 dark:border-white/5 overflow-hidden shadow-sm">
                                <div className="p-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-500">
                                            <Check className="w-4 h-4" />
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-gray-900 dark:text-white text-sm">{report.weekRange}</h4>
                                            <p className="text-[10px] text-gray-500 dark:text-gray-400">
                                                Submitted: {report.submittedAt}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-xs font-bold text-gray-900 dark:text-white">
                                            {report.totalCarbon.toFixed(3)} <span className="text-gray-500 font-normal">kgCO2e</span>
                                        </p>
                                        <p className="text-[10px] text-gray-500 dark:text-gray-400">
                                            <span className="text-blue-500 dark:text-blue-400">{report.totalWater.toFixed(1)} L</span>
                                        </p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Right Sidebar: Guidelines */}
                <div className="space-y-6">
                    <div className="bg-white dark:glass-panel p-6 rounded-xl border border-gray-200 dark:border-white/10 shadow-sm">
                        <h3 className="font-bold text-gray-900 dark:text-white mb-4">Calculation Guide</h3>

                        <div className="space-y-6">
                            <div className="relative pl-4 border-l-2 border-blue-500">
                                <h4 className="text-blue-500 font-bold text-sm mb-2">💧 Hand Washing</h4>
                                <ul className="text-xs text-gray-500 dark:text-gray-400 space-y-1 list-disc list-inside">
                                    <li>Freq: {config.hand_wash_freq} times/day</li>
                                    <li>Vol: {config.hand_wash_vol} L/wash</li>
                                </ul>
                            </div>

                            <div className="relative pl-4 border-l-2 border-cyan-500">
                                <h4 className="text-cyan-500 font-bold text-sm mb-2">🚽 Toilet Flush</h4>
                                <ul className="text-xs text-gray-500 dark:text-gray-400 space-y-1 list-disc list-inside">
                                    <li>Freq: {config.toilet_flush_freq} times/day</li>
                                    <li>Vol: {config.toilet_flush_vol} L/flush</li>
                                </ul>
                            </div>

                            <div className="pt-2 border-t border-gray-100 dark:border-white/10">
                                <p className="text-[10px] text-gray-400 dark:text-gray-500 font-mono">
                                    Emission Factor: {config.emission_factor} kgCO2e/m³ (1000L)
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Config Modal */}
            {isSettingsOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className="bg-white dark:bg-[#1c2120] border border-gray-200 dark:border-white/10 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
                        <div className="p-6 border-b border-gray-200 dark:border-white/10 flex justify-between items-center bg-gray-50 dark:bg-white/5">
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white">Water Configuration</h3>
                            <button onClick={() => setIsSettingsOpen(false)} className="text-gray-400 hover:text-gray-900 dark:hover:text-white">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-6 space-y-6">
                            <div className="grid grid-cols-2 gap-6">
                                <div className="space-y-4">
                                    <h4 className="text-sm font-semibold text-blue-500 dark:text-blue-400">Hand Washing</h4>
                                    <div className="space-y-2">
                                        <label className="text-xs text-gray-500 dark:text-gray-400">Frequency (times/day)</label>
                                        <input
                                            type="number"
                                            value={tempConfig.hand_wash_freq}
                                            onChange={(e) => setTempConfig({ ...tempConfig, hand_wash_freq: parseFloat(e.target.value) })}
                                            className="w-full bg-gray-100 dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-lg p-2 text-gray-900 dark:text-white"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs text-gray-500 dark:text-gray-400">Volume (Liters/wash)</label>
                                        <input
                                            type="number"
                                            step="0.1"
                                            value={tempConfig.hand_wash_vol}
                                            onChange={(e) => setTempConfig({ ...tempConfig, hand_wash_vol: parseFloat(e.target.value) })}
                                            className="w-full bg-gray-100 dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-lg p-2 text-gray-900 dark:text-white"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-4">
                                    <h4 className="text-sm font-semibold text-cyan-500 dark:text-cyan-400">Toilet Flushing</h4>
                                    <div className="space-y-2">
                                        <label className="text-xs text-gray-500 dark:text-gray-400">Frequency (times/day)</label>
                                        <input
                                            type="number"
                                            value={tempConfig.toilet_flush_freq}
                                            onChange={(e) => setTempConfig({ ...tempConfig, toilet_flush_freq: parseFloat(e.target.value) })}
                                            className="w-full bg-gray-100 dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-lg p-2 text-gray-900 dark:text-white"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs text-gray-500 dark:text-gray-400">Volume (Liters/flush)</label>
                                        <input
                                            type="number"
                                            step="0.1"
                                            value={tempConfig.toilet_flush_vol}
                                            onChange={(e) => setTempConfig({ ...tempConfig, toilet_flush_vol: parseFloat(e.target.value) })}
                                            className="w-full bg-gray-100 dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-lg p-2 text-gray-900 dark:text-white"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="pt-4 border-t border-gray-200 dark:border-white/10">
                                <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-2 block">Carbon Emission Factor (kgCO2e/m³)</label>
                                <input
                                    type="number"
                                    step="0.001"
                                    value={tempConfig.emission_factor}
                                    onChange={(e) => setTempConfig({ ...tempConfig, emission_factor: parseFloat(e.target.value) })}
                                    className="w-full bg-gray-100 dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-lg p-2 text-gray-900 dark:text-white"
                                />
                                <p className="text-[10px] text-gray-500 mt-1">Standard factor for water supply emissions.</p>
                            </div>
                        </div>
                        <div className="p-6 border-t border-gray-200 dark:border-white/10 flex justify-end gap-3 bg-gray-50 dark:bg-white/5">
                            <button onClick={() => setIsSettingsOpen(false)} className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">Cancel</button>
                            <button onClick={handleSaveSettings} className="px-4 py-2 text-sm bg-[#e8c559] hover:bg-[#d4b44e] text-[#171611] font-bold rounded-lg transition-colors">
                                Save Configuration
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
