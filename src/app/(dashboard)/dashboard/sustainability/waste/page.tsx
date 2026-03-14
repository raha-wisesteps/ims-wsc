"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
    ChevronLeft,
    Check,
    Calendar,
    RotateCcw,
    FileText,
    ChevronRight,
    History,
    Leaf,
    Trash2,
    Save,
    BadgeCheck,
    Settings,
    X,
    Recycle,
    Cloud
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// Types
type WasteStatus = "empty" | "half" | "full";
type WasteNote = "new" | "leftover" | "holiday" | null;

interface DailyLog {
    id?: string;
    day: string;
    date: string;
    fullDate: string; // YYYY-MM-DD
    green: WasteStatus;
    greenNote: WasteNote;
    yellow: WasteStatus;
    yellowNote: WasteNote;
}

interface WeeklyReport {
    id: string;
    weekRange: string;
    submittedAt: string;
    totalGreenWeight: number;
    totalYellowWeight: number;
    totalCarbon: number;
}

interface WasteConfig {
    binCapacity: number;
    greenDensity: number;
    yellowDensity: number;
    greenEmissionFactor: number;
    yellowEmissionFactor: number;
}

// Default Configuration
const DEFAULT_CONFIG: WasteConfig = {
    binCapacity: 10,
    greenDensity: 0.03,
    yellowDensity: 0.05,
    greenEmissionFactor: 0.5,
    yellowEmissionFactor: 2.0
};

// Database Interfaces
interface WeeklyReportDB {
    id: string;
    week_start: string;
    week_end: string;
    submitted_at: string | null;
    total_green_weight: number;
    total_yellow_weight: number;
    total_carbon: number;
    bin_capacity: number;
    green_density: number;
    yellow_density: number;
    green_emission_factor: number;
    yellow_emission_factor: number;
}

interface WasteLogDB {
    id: string;
    date: string;
    green_status: string;
    green_note: string;
    yellow_status: string;
    yellow_note: string;
}

export default function WasteReportPage() {
    const supabase = createClient();

    // State
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [weekLogs, setWeekLogs] = useState<DailyLog[]>([]);
    const [recentHistory, setRecentHistory] = useState<WeeklyReport[]>([]);
    const [isSubmitted, setIsSubmitted] = useState(false);
    const [isDirty, setIsDirty] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    // Configuration State
    const [config, setConfig] = useState<WasteConfig>(DEFAULT_CONFIG);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [isConfirmOpen, setIsConfirmOpen] = useState(false);
    const [tempConfig, setTempConfig] = useState<WasteConfig>(DEFAULT_CONFIG);
    const [prevFridayLog, setPrevFridayLog] = useState<DailyLog | null>(null);

    // Initial Fetch (History)
    useEffect(() => {
        fetchRecentHistory();
    }, []);

    // Fetch Week Data when date changes
    useEffect(() => {
        fetchWeekData(selectedDate);
    }, [selectedDate]);

    // --- Data Fetching ---

    const fetchRecentHistory = async () => {
        const { data, error } = await supabase
            .from('waste_weekly_reports')
            .select('*')
            .not('submitted_at', 'is', null) // Only show submitted reports
            .order('submitted_at', { ascending: false })
            .limit(5);

        if (error) {
            console.error('Error fetching history:', error);
            return;
        }

        const formattedHistory: WeeklyReport[] = (data as WeeklyReportDB[]).map(report => ({
            id: report.id,
            weekRange: `${new Date(report.week_start).toLocaleDateString('en-US', { day: '2-digit', month: 'short' })} - ${new Date(report.week_end).toLocaleDateString('en-US', { day: '2-digit', month: 'short' })} ${new Date(report.week_start).getFullYear()}`,
            submittedAt: report.submitted_at ? new Date(report.submitted_at).toLocaleString() : "-",
            totalGreenWeight: report.total_green_weight,
            totalYellowWeight: report.total_yellow_weight,
            totalCarbon: report.total_carbon
        }));

        setRecentHistory(formattedHistory);
    };

    const fetchWeekData = async (baseDate: Date) => {
        setIsSaving(true);
        try {
            // 1. Calculate Week Range (Monday - Friday)
            const day = baseDate.getDay();
            const diff = baseDate.getDate() - day + (day === 0 ? -6 : 1);
            const monday = new Date(new Date(baseDate).setDate(diff));
            const friday = new Date(new Date(monday).setDate(monday.getDate() + 4));

            const mondayStr = monday.toISOString().split('T')[0];
            const fridayStr = friday.toISOString().split('T')[0];

            // 2. Fetch Logs from DB
            const { data: logsData, error: logsError } = await supabase
                .from('waste_logs')
                .select('*')
                .gte('date', mondayStr)
                .lte('date', fridayStr);

            if (logsError) throw logsError;

            // 2b. Fetch previous Friday's log (for Monday calculation)
            const prevFriday = new Date(monday);
            prevFriday.setDate(monday.getDate() - 3);
            const prevFridayStr = prevFriday.toISOString().split('T')[0];

            const { data: prevFridayData } = await supabase
                .from('waste_logs')
                .select('*')
                .eq('date', prevFridayStr)
                .single();

            if (prevFridayData) {
                const pf = prevFridayData as WasteLogDB;
                setPrevFridayLog({
                    day: 'Fri',
                    date: '',
                    fullDate: prevFridayStr,
                    green: (pf.green_status as WasteStatus) || 'empty',
                    greenNote: (pf.green_note as WasteNote) || null,
                    yellow: (pf.yellow_status as WasteStatus) || 'empty',
                    yellowNote: (pf.yellow_note as WasteNote) || null,
                });
            } else {
                setPrevFridayLog(null);
            }

            // 3. Fetch Weekly Report Status & Config
            const { data: reportData, error: reportError } = await supabase
                .from('waste_weekly_reports')
                .select('*')
                .eq('week_start', mondayStr)
                .single();

            // Handle Report Existence
            if (reportData) {
                const report = reportData as WeeklyReportDB;
                setIsSubmitted(!!report.submitted_at);

                // Load saved config for this week
                const loadedConfig = {
                    binCapacity: report.bin_capacity ?? DEFAULT_CONFIG.binCapacity,
                    greenDensity: report.green_density ?? DEFAULT_CONFIG.greenDensity,
                    yellowDensity: report.yellow_density ?? DEFAULT_CONFIG.yellowDensity,
                    greenEmissionFactor: report.green_emission_factor ?? DEFAULT_CONFIG.greenEmissionFactor,
                    yellowEmissionFactor: report.yellow_emission_factor ?? DEFAULT_CONFIG.yellowEmissionFactor
                };
                setConfig(loadedConfig);
                setTempConfig(loadedConfig);
            } else {
                setIsSubmitted(false);
                setConfig(DEFAULT_CONFIG);
                setTempConfig(DEFAULT_CONFIG);
            }

            // 4. Merge DB Data with Default Week Structure
            const newLogs: DailyLog[] = [];
            for (let i = 0; i < 5; i++) {
                const currentDate = new Date(monday);
                currentDate.setDate(monday.getDate() + i);
                const dateStr = currentDate.toISOString().split('T')[0];

                // Find existing log
                const dbLog = (logsData as WasteLogDB[])?.find(l => l.date === dateStr);

                newLogs.push({
                    id: dbLog?.id,
                    day: currentDate.toLocaleDateString('en-US', { weekday: 'short' }),
                    date: currentDate.toLocaleDateString('en-US', { day: '2-digit', month: 'short' }),
                    fullDate: dateStr,
                    green: (dbLog?.green_status as WasteStatus) || "empty",
                    greenNote: (dbLog?.green_note as WasteNote) || null,
                    yellow: (dbLog?.yellow_status as WasteStatus) || "empty",
                    yellowNote: (dbLog?.yellow_note as WasteNote) || null,
                });
            }
            setWeekLogs(newLogs);
            setIsDirty(false);

        } catch (error) {
            console.error("Error fetching week data:", error);
        } finally {
            setIsSaving(false);
        }
    };

    // --- Logic ---

    const handleWeekChange = (direction: 'prev' | 'next') => {
        const newDate = new Date(selectedDate);
        newDate.setDate(selectedDate.getDate() + (direction === 'next' ? 7 : -7));
        setSelectedDate(newDate);
    };

    const handleStatusChange = (index: number, type: 'green' | 'yellow') => {
        const currentStatus = weekLogs[index][type];
        const nextStatus: WasteStatus =
            currentStatus === 'empty' ? 'half' :
                currentStatus === 'half' ? 'full' : 'empty';

        const updatedLogs = [...weekLogs];
        updatedLogs[index] = { ...updatedLogs[index], [type]: nextStatus };

        const noteKey = type === 'green' ? 'greenNote' : 'yellowNote';
        if (nextStatus !== 'empty' && updatedLogs[index][noteKey] === null) {
            // Auto-set note to 'new' for half/full
            updatedLogs[index] = { ...updatedLogs[index], [noteKey]: 'new' };
        }

        setWeekLogs(updatedLogs);
        setIsDirty(true);
    };

    const handleNoteChange = (index: number, type: 'green' | 'yellow') => {
        const noteKey = type === 'green' ? 'greenNote' : 'yellowNote';
        const currentNote = weekLogs[index][noteKey];
        let nextNote: WasteNote;

        if (currentNote === null) nextNote = 'new';
        else if (currentNote === 'new') nextNote = 'leftover';
        else if (currentNote === 'leftover') nextNote = 'holiday';
        else nextNote = null;

        const updatedLogs = [...weekLogs];
        updatedLogs[index] = { ...updatedLogs[index], [noteKey]: nextNote };
        setWeekLogs(updatedLogs);
        setIsDirty(true);
    };

    const calculateStats = (logs: DailyLog[]) => {
        let totalGreenWeight = 0;
        let totalYellowWeight = 0;
        let totalCarbon = 0;

        const getFillMultiplier = (status: WasteStatus) => {
            if (status === 'full') return 1.0;
            if (status === 'half') return 0.5;
            return 0;
        };

        const getPrevStatus = (index: number, type: 'green' | 'yellow'): WasteStatus => {
            if (index === 0) {
                // Monday → look at previous Friday
                if (prevFridayLog) {
                    return type === 'green' ? prevFridayLog.green : prevFridayLog.yellow;
                }
                return 'empty';
            }
            return type === 'green' ? logs[index - 1].green : logs[index - 1].yellow;
        };

        logs.forEach((log, index) => {
            const calculateBin = (status: WasteStatus, note: WasteNote, density: number, emissionFactor: number, type: 'green' | 'yellow') => {
                // Holiday → always skip regardless of status
                if (note === 'holiday') return { weight: 0, carbon: 0 };

                // Empty status — waste was collected/angkut
                if (status === 'empty') {
                    if (note === 'new') {
                        // empty + new = sampah baru masuk dan langsung diangkut hari itu
                        // Dihitung sebagai full bin (1 siklus penuh)
                        const volume = config.binCapacity * 1.0;
                        const weight = volume * density;
                        const carbon = weight * emissionFactor;
                        return { weight, carbon };
                    }
                    // empty + null/leftover = lihat status hari sebelumnya
                    const prevStatus = getPrevStatus(index, type);
                    const volume = config.binCapacity * getFillMultiplier(prevStatus);
                    const weight = volume * density;
                    const carbon = weight * emissionFactor;
                    return { weight, carbon };
                }

                // Leftover on non-empty → skip (don't double count accumulating waste)
                if (note === 'leftover') return { weight: 0, carbon: 0 };

                // Half or Full (note is 'new' or null) → calculate current fill level
                const volume = config.binCapacity * getFillMultiplier(status);
                const weight = volume * density;
                const carbon = weight * emissionFactor;
                return { weight, carbon };
            };

            const greenStats = calculateBin(log.green, log.greenNote, config.greenDensity, config.greenEmissionFactor, 'green');
            const yellowStats = calculateBin(log.yellow, log.yellowNote, config.yellowDensity, config.yellowEmissionFactor, 'yellow');

            totalGreenWeight += greenStats.weight;
            totalCarbon += greenStats.carbon;

            totalYellowWeight += yellowStats.weight;
            totalCarbon += yellowStats.carbon;
        });

        return { totalGreenWeight, totalYellowWeight, totalCarbon };
    };

    const currentStats = calculateStats(weekLogs);

    // --- Settings Logic ---
    const handleSaveSettings = async () => {
        setIsSaving(true);
        try {
            // Save settings to DB logic
            // We need to upsert this to waste_weekly_reports
            const monday = weekLogs[0].fullDate;
            const friday = weekLogs[4].fullDate;

            // Recalculate with new config
            // Note: We are saving settings, but we might also want to update the stats in the report if it exists?
            // Yes, if we change factors, the totals change.

            // We need to be careful: if we just save config, the 'totals' in the DB might be stale until next 'Submit'?
            // Let's attempt to update the report row fully.

            // Re-calc using TEMP config (which is being saved)
            // But wait, calculateStats uses state 'config'. We should update state 'config' first?
            // Not yet, we update state after successful save.

            // Actually, let's just save the config columns for now. 
            // The 'handleSubmit' logic will re-calculate totals using the current config.

            const { error } = await supabase
                .from('waste_weekly_reports')
                .upsert({
                    week_start: monday,
                    week_end: friday,
                    // We don't want to overwrite totals with 0 if we aren't submitting
                    // But if we use upsert, we need to provide all non-nulls or use explicit update?
                    // Better to just update the CONFIG columns if record exists, or insert if not.

                    bin_capacity: tempConfig.binCapacity,
                    green_density: tempConfig.greenDensity,
                    yellow_density: tempConfig.yellowDensity,
                    green_emission_factor: tempConfig.greenEmissionFactor,
                    yellow_emission_factor: tempConfig.yellowEmissionFactor,

                    // If it's a new record, we need totals? Defaults are 0?
                    // Let's try to upsert with totals=0 if new.
                }, { onConflict: 'week_start' })
                .select(); // to see what happened?

            // Actually, simpler:
            // update state Config. The 'Submit' action is what finalizes the report.
            // But user might want to save these settings persistently for the week?
            // Yes, requirement says "di settingnya di report per minggu".

            // Let's do a more robust upsert that preserves existing data if any.
            // Check if exists
            const { data: existing } = await supabase.from('waste_weekly_reports').select('id').eq('week_start', monday).single();

            if (existing) {
                await supabase.from('waste_weekly_reports').update({
                    bin_capacity: tempConfig.binCapacity,
                    green_density: tempConfig.greenDensity,
                    yellow_density: tempConfig.yellowDensity,
                    green_emission_factor: tempConfig.greenEmissionFactor,
                    yellow_emission_factor: tempConfig.yellowEmissionFactor
                }).eq('id', existing.id);
            } else {
                // Insert new draft report
                await supabase.from('waste_weekly_reports').insert({
                    week_start: monday,
                    week_end: friday,
                    bin_capacity: tempConfig.binCapacity,
                    green_density: tempConfig.greenDensity,
                    yellow_density: tempConfig.yellowDensity,
                    green_emission_factor: tempConfig.greenEmissionFactor,
                    yellow_emission_factor: tempConfig.yellowEmissionFactor,
                    total_green_weight: 0,
                    total_yellow_weight: 0,
                    total_carbon: 0,
                    submitted_at: null // Draft
                });
            }

            setConfig(tempConfig);
            setIsSettingsOpen(false);
            alert("Settings updated for this week.");
        } catch (e) {
            console.error(e);
            alert("Failed to save settings.");
        } finally {
            setIsSaving(false);
        }
    };

    // --- Actions ---

    // --- Actions ---

    // 1. Save Changes Only (Upsert Logs + Report)
    const handleSave = async () => {
        setIsSaving(true);
        try {
            const allUpsertData = weekLogs.map(log => ({
                date: log.fullDate,
                green_status: log.green,
                green_note: log.greenNote,
                yellow_status: log.yellow,
                yellow_note: log.yellowNote
            }));

            const { error: logsError } = await supabase
                .from('waste_logs')
                .upsert(allUpsertData, { onConflict: 'date' });

            if (logsError) throw logsError;

            // Upsert Weekly Report (Auto-update)
            const stats = calculateStats(weekLogs); // Uses current 'config' state
            const monday = weekLogs[0].fullDate;
            const friday = weekLogs[4].fullDate;

            // Fetch user for created_by
            const { data: { user } } = await supabase.auth.getUser();



            const reportData = {
                week_start: monday,
                week_end: friday,
                total_green_weight: stats.totalGreenWeight,
                total_yellow_weight: stats.totalYellowWeight,
                total_carbon: stats.totalCarbon,
                bin_capacity: config.binCapacity,
                green_density: config.greenDensity,
                yellow_density: config.yellowDensity,
                green_emission_factor: config.greenEmissionFactor,
                yellow_emission_factor: config.yellowEmissionFactor,
                // Draft save — no submitted_at, won't appear in history
            };

            const { error: reportError } = await supabase
                .from('waste_weekly_reports')
                .upsert(reportData, { onConflict: 'week_start' });

            if (reportError) throw reportError;

            setIsDirty(false);
            toast.success("Draft saved.");
            fetchWeekData(selectedDate);

        } catch (error) {
            console.error("Error saving data:", error);
            toast.error("Failed to save changes.");
        } finally {
            setIsSaving(false);
        }
    };

    // 2. Submit Report (Finalize — saves + marks as submitted for history)
    const handleSubmit = async () => {
        setIsSaving(true);
        try {
            // Save all logs first
            const allUpsertData = weekLogs.map(log => ({
                date: log.fullDate,
                green_status: log.green,
                green_note: log.greenNote,
                yellow_status: log.yellow,
                yellow_note: log.yellowNote
            }));

            const { error: logsError } = await supabase
                .from('waste_logs')
                .upsert(allUpsertData, { onConflict: 'date' });

            if (logsError) throw logsError;

            // Calculate final stats
            const stats = calculateStats(weekLogs);
            const monday = weekLogs[0].fullDate;
            const friday = weekLogs[4].fullDate;

            const reportData = {
                week_start: monday,
                week_end: friday,
                total_green_weight: stats.totalGreenWeight,
                total_yellow_weight: stats.totalYellowWeight,
                total_carbon: stats.totalCarbon,
                bin_capacity: config.binCapacity,
                green_density: config.greenDensity,
                yellow_density: config.yellowDensity,
                green_emission_factor: config.greenEmissionFactor,
                yellow_emission_factor: config.yellowEmissionFactor,
                submitted_at: new Date().toISOString(),
            };

            const { error: reportError } = await supabase
                .from('waste_weekly_reports')
                .upsert(reportData, { onConflict: 'week_start' });

            if (reportError) throw reportError;

            setIsDirty(false);
            setIsSubmitted(true);
            setIsConfirmOpen(false);
            toast.success("Report submitted! Data masuk ke history.");
            fetchWeekData(selectedDate);
            fetchRecentHistory();

        } catch (error) {
            console.error("Error submitting report:", error);
            toast.error("Failed to submit report.");
        } finally {
            setIsSaving(false);
        }
    };

    // Style Helpers
    const getStatusColor = (status: WasteStatus, type: "green" | "yellow") => {
        if (status === "empty") return "bg-gray-100 dark:bg-white/5 text-gray-500 border-gray-200 dark:border-white/10";
        if (status === "half") return type === "green"
            ? "bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-300 dark:border-emerald-500/30"
            : "bg-yellow-100 dark:bg-yellow-500/20 text-yellow-600 dark:text-yellow-500 border-yellow-300 dark:border-yellow-500/30";
        if (status === "full") return "bg-rose-100 dark:bg-rose-500/20 text-rose-600 dark:text-rose-500 border-rose-300 dark:border-rose-500/30";
        return "bg-gray-100 dark:bg-white/5";
    };

    const getStatusLabel = (status: WasteStatus) => {
        switch (status) {
            case "empty": return "Empty";
            case "half": return "Half";
            case "full": return "Full";
            default: return "-";
        }
    };

    const isToday = (dateStr: string) => {
        const today = new Date().toISOString().split('T')[0];
        return dateStr === today;
    };

    return (
        <div className="space-y-8 pb-20 relative">
            {/* Header */}
            <div className="flex flex-col gap-4 md:flex-row md:items-end justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-green-600 dark:from-emerald-500 dark:to-green-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
                        <Recycle className="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2 mb-1 text-sm text-gray-500 dark:text-gray-400">
                            <Link href="/dashboard" className="hover:text-gray-900 dark:hover:text-white transition-colors">Dashboard</Link>
                            <ChevronRight className="h-4 w-4" />
                            <Link href="/dashboard/sustainability" className="hover:text-gray-900 dark:hover:text-white transition-colors">Sustainability</Link>
                            <ChevronRight className="h-4 w-4" />
                            <span className="text-gray-900 dark:text-white">Waste Management</span>
                        </div>
                        <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">Weekly Waste Log</h1>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Monitor Office Bin Capacity (Mon - Fri)</p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    {/* Settings Trigger */}
                    <button
                        onClick={() => setIsSettingsOpen(true)}
                        className="p-3 rounded-xl bg-white dark:bg-[#1c2120] border border-gray-200 dark:border-white/10 text-gray-500 hover:text-gray-900 dark:hover:text-white hover:border-[#e8c559] transition-colors shadow-sm"
                        title="Week Settings"
                    >
                        <Settings className="w-5 h-5" />
                    </button>

                    {/* Submit Button */}
                    <button
                        onClick={() => setIsConfirmOpen(true)}
                        disabled={isSaving || isDirty}
                        className={cn(
                            "flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all border",
                            !isDirty && !isSaving
                                ? "bg-[#e8c559] text-[#171611] hover:bg-[#d4b44e] shadow-lg hover:shadow-[#e8c559]/20 border-transparent"
                                : "bg-gray-100 dark:bg-white/5 text-gray-400 dark:text-gray-500 border-transparent dark:border-white/10 opacity-50 cursor-not-allowed"
                        )}
                        title={isDirty ? "Save draft terlebih dahulu sebelum submit" : "Submit report ke history"}
                    >
                        <BadgeCheck className="w-5 h-5" />
                        {isSubmitted ? "Re-Submit" : "Submit"}
                    </button>
                </div>
            </div>

            {/* Settings Modal */}
            {
                isSettingsOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                        <div className="bg-white dark:bg-[#1a1c23] border border-gray-200 dark:border-white/10 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden transition-colors">
                            <div className="p-4 border-b border-gray-200 dark:border-white/10 flex items-center justify-between bg-gray-50 dark:bg-white/5">
                                <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                    <Settings className="w-4 h-4 text-blue-500 dark:text-blue-400" />
                                    Weekly Settings
                                </h3>
                                <button onClick={() => setIsSettingsOpen(false)} className="text-gray-400 hover:text-gray-900 dark:hover:text-white">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                            <div className="p-6 space-y-6">
                                {/* Bin Capacity */}
                                <div className="space-y-2">
                                    <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Bin Capacity (Liter)</label>
                                    <input
                                        type="number"
                                        value={tempConfig.binCapacity}
                                        onChange={(e) => setTempConfig({ ...tempConfig, binCapacity: parseFloat(e.target.value) })}
                                        className="w-full bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-lg px-4 py-2 text-gray-900 dark:text-white focus:outline-none focus:border-blue-500 transition-colors"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    {/* Green Settings */}
                                    <div className="space-y-3">
                                        <h4 className="text-sm font-bold text-emerald-600 dark:text-emerald-400 border-b border-emerald-500/20 pb-1">Green Waste</h4>
                                        <div>
                                            <label className="text-[10px] text-gray-500 block mb-1">Density (kg/L)</label>
                                            <input
                                                type="number"
                                                step="0.01"
                                                value={tempConfig.greenDensity}
                                                onChange={(e) => setTempConfig({ ...tempConfig, greenDensity: parseFloat(e.target.value) })}
                                                className="w-full bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-lg px-3 py-1.5 text-sm text-gray-900 dark:text-white focus:outline-none focus:border-emerald-500 transition-colors"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-[10px] text-gray-500 block mb-1">Emission (kgCO2e/kg)</label>
                                            <input
                                                type="number"
                                                step="0.01"
                                                value={tempConfig.greenEmissionFactor}
                                                onChange={(e) => setTempConfig({ ...tempConfig, greenEmissionFactor: parseFloat(e.target.value) })}
                                                className="w-full bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-lg px-3 py-1.5 text-sm text-gray-900 dark:text-white focus:outline-none focus:border-emerald-500 transition-colors"
                                            />
                                        </div>
                                    </div>

                                    {/* Yellow Settings */}
                                    <div className="space-y-3">
                                        <h4 className="text-sm font-bold text-yellow-600 dark:text-yellow-400 border-b border-yellow-500/20 pb-1">Yellow Waste</h4>
                                        <div>
                                            <label className="text-[10px] text-gray-500 block mb-1">Density (kg/L)</label>
                                            <input
                                                type="number"
                                                step="0.01"
                                                value={tempConfig.yellowDensity}
                                                onChange={(e) => setTempConfig({ ...tempConfig, yellowDensity: parseFloat(e.target.value) })}
                                                className="w-full bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-lg px-3 py-1.5 text-sm text-gray-900 dark:text-white focus:outline-none focus:border-yellow-500 transition-colors"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-[10px] text-gray-500 block mb-1">Emission (kgCO2e/kg)</label>
                                            <input
                                                type="number"
                                                step="0.01"
                                                value={tempConfig.yellowEmissionFactor}
                                                onChange={(e) => setTempConfig({ ...tempConfig, yellowEmissionFactor: parseFloat(e.target.value) })}
                                                className="w-full bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-lg px-3 py-1.5 text-sm text-gray-900 dark:text-white focus:outline-none focus:border-yellow-500 transition-colors"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <button
                                    onClick={handleSaveSettings}
                                    disabled={isSaving}
                                    className="w-full py-3 bg-yellow-400 hover:bg-yellow-500 text-black rounded-xl font-bold transition-all shadow-lg hover:shadow-yellow-400/20"
                                >
                                    {isSaving ? "Saving..." : "Apply Settings"}
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Confirmation Modal */}
            {
                isConfirmOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                        <div className="bg-white dark:bg-[#1a1c23] border border-gray-200 dark:border-white/10 rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden transition-colors">
                            <div className="p-6 text-center space-y-4">
                                <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-500/20 flex items-center justify-center mx-auto text-blue-600 dark:text-blue-400">
                                    <FileText className="w-6 h-6" />
                                </div>
                                <div className="space-y-2">
                                    <h3 className="font-bold text-xl text-gray-900 dark:text-white">Submit Weekly Report?</h3>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">
                                        Data emisi akan masuk ke history. <br />
                                        Anda tetap bisa re-submit jika ada perubahan.
                                    </p>
                                    <div className="text-left bg-gray-50 dark:bg-white/5 rounded-lg p-3 text-xs space-y-1">
                                        <p className="text-emerald-500">Organik: {currentStats.totalGreenWeight.toFixed(2)} kg</p>
                                        <p className="text-yellow-500">Anorganik: {currentStats.totalYellowWeight.toFixed(2)} kg</p>
                                        <p className="text-gray-400">Total Emisi: {currentStats.totalCarbon.toFixed(3)} kgCO2e</p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-3 pt-2">
                                    <button
                                        onClick={() => setIsConfirmOpen(false)}
                                        className="py-2.5 rounded-lg font-semibold text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleSubmit}
                                        disabled={isSaving}
                                        className="py-2.5 rounded-lg font-semibold bg-blue-600 hover:bg-blue-500 text-white transition-colors shadow-lg hover:shadow-blue-500/20 disabled:opacity-50"
                                    >
                                        {isSaving ? "Submitting..." : "Confirm Submit"}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )
            }

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Main Content: Weekly Table & History */}
                <div className="lg:col-span-2 space-y-8">
                    {/* Active Week Card */}
                    <div className="bg-white dark:bg-[#1a1c23] p-6 rounded-xl border border-gray-200 dark:border-white/10 shadow-sm">
                        {/* Week Navigation */}
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-4">
                                <div className="flex items-center bg-gray-100 dark:bg-white/5 rounded-lg border border-gray-200 dark:border-white/10 p-1">
                                    <button
                                        onClick={() => handleWeekChange('prev')}
                                        className="p-1 hover:bg-gray-200 dark:hover:bg-white/10 rounded-md transition-colors text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                                    >
                                        <ChevronLeft className="w-5 h-5" />
                                    </button>
                                    <div className="px-3 py-1 flex items-center gap-2 text-sm font-medium text-gray-900 dark:text-white border-l border-r border-gray-200 dark:border-white/10 mx-1">
                                        <Calendar className="w-4 h-4 text-blue-500" />
                                        <span>
                                            {weekLogs.length > 0 ? `${weekLogs[0].date} - ${weekLogs[4].date}` : "Loading..."}
                                        </span>
                                    </div>
                                    <button
                                        onClick={() => handleWeekChange('next')}
                                        className="p-1 hover:bg-gray-200 dark:hover:bg-white/10 rounded-md transition-colors text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                                    >
                                        <ChevronRight className="w-5 h-5" />
                                    </button>
                                </div>

                                {/* Draft/Submitted Badge */}
                                <div className={cn(
                                    "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium",
                                    isSubmitted
                                        ? "bg-emerald-100 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                                        : "bg-amber-100 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400"
                                )}>
                                    {isSubmitted ? <BadgeCheck className="w-3.5 h-3.5" /> : <Save className="w-3.5 h-3.5" />}
                                    {isSubmitted ? "Submitted" : "Draft"}
                                </div>
                            </div>

                            {/* Save Draft Button — inside weekly card */}
                            <button
                                onClick={handleSave}
                                disabled={!isDirty || isSaving}
                                className={cn(
                                    "flex items-center gap-2 px-4 py-2 rounded-lg font-semibold text-sm transition-all border",
                                    isDirty
                                        ? "bg-[#e8c559] text-[#171611] hover:bg-[#d4b44e] shadow-sm border-transparent"
                                        : "bg-gray-100 dark:bg-white/5 text-gray-400 dark:text-gray-500 border-gray-200 dark:border-white/10 opacity-50 cursor-not-allowed"
                                )}
                            >
                                <Save className="w-4 h-4" />
                                Save Draft
                            </button>
                        </div>

                        {/* Weekly Summary — per-page totals */}
                        <div className="grid grid-cols-3 gap-3 mb-6">
                            <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-500/5 border border-emerald-200 dark:border-emerald-500/20">
                                <p className="text-emerald-600 dark:text-emerald-400 text-[10px] font-bold uppercase tracking-wider mb-1">Organik</p>
                                <div className="flex items-baseline gap-1">
                                    <span className="text-xl font-black text-gray-900 dark:text-white">{currentStats.totalGreenWeight.toFixed(2)}</span>
                                    <span className="text-[10px] text-gray-500 dark:text-gray-400">kg</span>
                                </div>
                            </div>
                            <div className="p-3 rounded-xl bg-yellow-50 dark:bg-yellow-500/5 border border-yellow-200 dark:border-yellow-500/20">
                                <p className="text-yellow-600 dark:text-yellow-400 text-[10px] font-bold uppercase tracking-wider mb-1">Anorganik</p>
                                <div className="flex items-baseline gap-1">
                                    <span className="text-xl font-black text-gray-900 dark:text-white">{currentStats.totalYellowWeight.toFixed(2)}</span>
                                    <span className="text-[10px] text-gray-500 dark:text-gray-400">kg</span>
                                </div>
                            </div>
                            <div className="p-3 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10">
                                <p className="text-gray-600 dark:text-gray-400 text-[10px] font-bold uppercase tracking-wider mb-1">Jejak Karbon</p>
                                <div className="flex items-baseline gap-1">
                                    <span className="text-xl font-black text-gray-900 dark:text-white">{currentStats.totalCarbon.toFixed(3)}</span>
                                    <span className="text-[10px] text-gray-500 dark:text-gray-400">kgCO2e</span>
                                </div>
                            </div>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="text-left text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-white/5">
                                        <th className="pb-4 font-medium pl-2 w-24">Day</th>
                                        <th className="pb-4 font-medium text-center">Green ({config.binCapacity}L)</th>
                                        <th className="pb-4 font-medium text-center">Yellow ({config.binCapacity}L)</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                                    {weekLogs.map((log, idx) => (
                                        <tr key={log.day} className={`group hover:bg-gray-50 dark:hover:bg-white/[0.02] transition-colors ${isToday(log.fullDate) ? 'bg-blue-50 dark:bg-white/5' : ''}`}>
                                            <td className="py-4 pl-2 align-top">
                                                <div className="flex flex-col mt-2">
                                                    <span className={`font-bold ${isToday(log.fullDate) ? 'text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400'}`}>
                                                        {log.day} {isToday(log.fullDate) && <span className="ml-2 text-[10px] bg-blue-500 text-white px-1.5 py-0.5 rounded">TODAY</span>}
                                                    </span>
                                                    <span className="text-xs text-gray-500">{log.date}</span>
                                                </div>
                                            </td>

                                            {/* Green Bin Column */}
                                            <td className="py-4 px-2">
                                                <div className="flex flex-col gap-2">
                                                    {/* Status Toggle */}
                                                    <button
                                                        onClick={() => handleStatusChange(idx, 'green')}
                                                        className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-medium transition-all hover:brightness-110 active:scale-95 justify-center ${getStatusColor(log.green, 'green')}`}
                                                    >
                                                        <div className={`w-2 h-2 rounded-full ${log.green === 'full' ? 'bg-rose-500' : 'bg-emerald-500'}`}></div>
                                                        {getStatusLabel(log.green)}
                                                    </button>

                                                    {/* Note Toggle */}
                                                    <button
                                                        onClick={() => handleNoteChange(idx, 'green')}
                                                        className={`w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg border text-[10px] font-medium transition-all hover:brightness-110 active:scale-95
                                                            ${log.greenNote === 'new' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                                                                log.greenNote === 'leftover' ? 'bg-orange-500/10 text-orange-400 border-orange-500/20' :
                                                                    log.greenNote === 'holiday' ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' :
                                                                        'bg-gray-100 dark:bg-white/5 text-gray-500 border-transparent hover:border-gray-300 dark:hover:border-white/10'}`}
                                                    >
                                                        {log.greenNote === 'new' && <span>✨ Baru</span>}
                                                        {log.greenNote === 'leftover' && <span>🕰️ Sisa</span>}
                                                        {log.greenNote === 'holiday' && <span>🌴 Libur</span>}
                                                        {log.greenNote === null && <span>Note...</span>}
                                                    </button>
                                                </div>
                                            </td>

                                            {/* Yellow Bin Column */}
                                            <td className="py-4 px-2">
                                                <div className="flex flex-col gap-2">
                                                    {/* Status Toggle */}
                                                    <button
                                                        onClick={() => handleStatusChange(idx, 'yellow')}
                                                        className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-medium transition-all hover:brightness-110 active:scale-95 justify-center ${getStatusColor(log.yellow, 'yellow')}`}
                                                    >
                                                        <div className={`w-2 h-2 rounded-full ${log.yellow === 'full' ? 'bg-rose-500' : 'bg-yellow-500'}`}></div>
                                                        {getStatusLabel(log.yellow)}
                                                    </button>

                                                    {/* Note Toggle */}
                                                    <button
                                                        onClick={() => handleNoteChange(idx, 'yellow')}
                                                        className={`w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg border text-[10px] font-medium transition-all hover:brightness-110 active:scale-95
                                                            ${log.yellowNote === 'new' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                                                                log.yellowNote === 'leftover' ? 'bg-orange-500/10 text-orange-400 border-orange-500/20' :
                                                                    log.yellowNote === 'holiday' ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' :
                                                                        'bg-gray-100 dark:bg-white/5 text-gray-500 border-transparent hover:border-gray-300 dark:hover:border-white/10'}`}
                                                    >
                                                        {log.yellowNote === 'new' && <span>✨ Baru</span>}
                                                        {log.yellowNote === 'leftover' && <span>🕰️ Sisa</span>}
                                                        {log.yellowNote === 'holiday' && <span>🌴 Libur</span>}
                                                        {log.yellowNote === null && <span>Note...</span>}
                                                    </button>
                                                </div>
                                            </td>
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
                            <Link href="/dashboard/sustainability/waste/history" className="text-xs text-blue-400 hover:text-blue-300 transition-colors">
                                View Full History &rarr;
                            </Link>
                        </div>

                        {recentHistory.length === 0 && (
                            <div className="py-8 text-center text-gray-500 text-sm italic">
                                No reports submitted yet.
                            </div>
                        )}

                        {recentHistory.map((report) => (
                            <div key={report.id} className="rounded-xl border border-gray-200 dark:border-white/5 overflow-hidden bg-white dark:bg-transparent">
                                <div className="p-4 bg-gray-50 dark:bg-white/5 border-b border-gray-200 dark:border-white/5 flex items-center justify-between">
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
                                        <p className="text-xs font-bold text-gray-900 dark:text-white">{report.totalCarbon.toFixed(2)} <span className="text-gray-500 font-normal">kgCO2e</span></p>
                                        <p className="text-[10px] text-gray-500 dark:text-gray-400">
                                            <span className="text-emerald-600 dark:text-emerald-400">{report.totalGreenWeight.toFixed(1)}kg</span> /
                                            <span className="text-yellow-600 dark:text-yellow-400 ml-1">{report.totalYellowWeight.toFixed(1)}kg</span>
                                        </p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Right Sidebar: Guidelines */}
                <div className="space-y-6">
                    <div className="bg-white dark:bg-transparent p-6 rounded-xl border border-gray-200 dark:border-white/10">
                        <h3 className="font-bold text-gray-900 dark:text-white mb-4">Waste Separation Guide</h3>

                        <div className="space-y-6">
                            <div className="relative pl-4 border-l-2 border-emerald-500">
                                <h4 className="text-emerald-600 dark:text-emerald-500 font-bold text-sm mb-2">🟢 Green Bin (Organik) - {config.binCapacity}L</h4>
                                <ul className="text-xs text-gray-600 dark:text-gray-400 space-y-1 list-disc list-inside">
                                    <li>Sisa Makanan, Buah, Sayur</li>
                                    <li>Ampas Kopi</li>
                                    <li>Daun dan Ranting</li>
                                    <li>Kertas/Tisu (Basah/Terurai)</li>
                                </ul>
                                <p className="text-[10px] text-emerald-500/60 mt-2 font-mono">
                                    Density: {config.greenDensity} kg/L | Emission: {config.greenEmissionFactor}
                                </p>
                            </div>

                            <div className="relative pl-4 border-l-2 border-yellow-500">
                                <h4 className="text-yellow-600 dark:text-yellow-500 font-bold text-sm mb-2">🟡 Yellow Bin (Anorganik) - {config.binCapacity}L</h4>
                                <ul className="text-xs text-gray-600 dark:text-gray-400 space-y-1 list-disc list-inside">
                                    <li>Plastik, Kemasan</li>
                                    <li>Logam, Aluminium Foil</li>
                                    <li>Styrofoam, Karet</li>
                                    <li>Tisu Basah</li>
                                </ul>
                                <p className="text-[10px] text-yellow-500/60 mt-2 font-mono">
                                    Density: {config.yellowDensity} kg/L | Emission: {config.yellowEmissionFactor}
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-transparent p-6 rounded-xl bg-gradient-to-b from-blue-50 dark:from-blue-500/10 to-transparent border border-blue-200 dark:border-blue-500/20">
                        <h3 className="font-bold text-blue-600 dark:text-blue-400 mb-2">💡 Operational Note</h3>
                        <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
                            Pastikan update status bin setiap <strong>pulang kerja (17:00)</strong>.
                            <br /><br />
                            <strong>✨ Baru:</strong> Sampah baru (dihitung).
                            <br />
                            <strong>🕰️ Sisa:</strong> Sisa kemarin (tidak dihitung).
                            <br />
                            <strong>🌴 Libur:</strong> Tidak ada sampah (0 kg).
                            <br />
                            <strong>🗑️ Empty:</strong> Sampah sudah diangkut (dihitung dari status hari sebelumnya).
                            <br /><br />
                            <strong>Save Draft:</strong> Simpan data sementara.
                            <br />
                            <strong>Submit:</strong> Finalisasi & masuk ke history.
                        </p>
                    </div>
                </div>
            </div>
        </div >
    );
}
