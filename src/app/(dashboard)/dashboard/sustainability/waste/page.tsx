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
    Trash2
} from "lucide-react";
import { Card } from "@/components/ui/card"; // Assuming Card component exists or using div
import { cn } from "@/lib/utils"; // Assuming utils exist

// Types
type WasteStatus = "empty" | "half" | "full";
type WasteNote = "new" | "leftover" | "holiday" | null;

interface DailyLog {
    day: string;
    date: string;
    fullDate: string; // YYYY-MM-DD for comparison
    green: WasteStatus;
    greenNote: WasteNote;
    yellow: WasteStatus;
    yellowNote: WasteNote;
}

interface WeeklyReport {
    id: number;
    weekRange: string;
    submittedAt: string;
    logs: DailyLog[];
    totalGreenWeight: number;
    totalYellowWeight: number;
    totalCarbon: number;
}

// Constants
const BIN_CAPACITY = 10; // Liters
const DENSITY_GREEN = 0.03; // kg/L
const DENSITY_YELLOW = 0.05; // kg/L
const EMISSION_FACTOR_GREEN = 0.5; // kgCO2e/kg (Placeholder assumption)
const EMISSION_FACTOR_YELLOW = 2.0; // kgCO2e/kg (Placeholder assumption)

export default function WasteReportPage() {
    // State for selected date (defaults to today)
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [weekLogs, setWeekLogs] = useState<DailyLog[]>([]);

    // History State
    const [history, setHistory] = useState<WeeklyReport[]>([
        {
            id: 1,
            weekRange: "01 Jan - 05 Jan 2024",
            submittedAt: "05 Jan 2024, 17:30",
            totalGreenWeight: 1.5,
            totalYellowWeight: 2.5,
            totalCarbon: 5.75,
            logs: [
                { day: "Mon", date: "01 Jan", fullDate: "2024-01-01", green: "empty", greenNote: "holiday", yellow: "empty", yellowNote: "holiday" },
                { day: "Tue", date: "02 Jan", fullDate: "2024-01-02", green: "half", greenNote: "new", yellow: "half", yellowNote: "new" },
                { day: "Wed", date: "03 Jan", fullDate: "2024-01-03", green: "full", greenNote: "leftover", yellow: "full", yellowNote: "leftover" },
                { day: "Thu", date: "04 Jan", fullDate: "2024-01-04", green: "empty", greenNote: null, yellow: "empty", yellowNote: null },
                { day: "Fri", date: "05 Jan", fullDate: "2024-01-05", green: "half", greenNote: "new", yellow: "full", yellowNote: "new" },
            ]
        }
    ]);
    const [isDirty, setIsDirty] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    // Initialize/Update logs when selectedDate changes
    useEffect(() => {
        generateWeekLogs(selectedDate);
    }, [selectedDate]);

    const generateWeekLogs = (baseDate: Date) => {
        // Find Monday of the selected week
        const day = baseDate.getDay();
        const diff = baseDate.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
        const monday = new Date(baseDate.setDate(diff));

        const newLogs: DailyLog[] = [];
        for (let i = 0; i < 5; i++) {
            const currentDate = new Date(monday);
            currentDate.setDate(monday.getDate() + i);

            newLogs.push({
                day: currentDate.toLocaleDateString('en-US', { weekday: 'short' }),
                date: currentDate.toLocaleDateString('en-US', { day: '2-digit', month: 'short' }),
                fullDate: currentDate.toISOString().split('T')[0],
                green: "empty",
                greenNote: null,
                yellow: "empty",
                yellowNote: null,
            });
        }
        setWeekLogs(newLogs);
        setIsDirty(false); // Reset dirty state on week change
    };

    const handleWeekChange = (direction: 'prev' | 'next') => {
        const newDate = new Date(selectedDate);
        newDate.setDate(selectedDate.getDate() + (direction === 'next' ? 7 : -7));
        setSelectedDate(newDate);
    };

    // Helper to get color based on status
    const getStatusColor = (status: WasteStatus, type: "green" | "yellow") => {
        if (status === "empty") return "bg-white/5 text-gray-500 border-white/10";
        if (status === "half") return type === "green"
            ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
            : "bg-yellow-500/20 text-yellow-500 border-yellow-500/30";
        if (status === "full") return "bg-rose-500/20 text-rose-500 border-rose-500/30";
        return "bg-white/5";
    };

    const getStatusLabel = (status: WasteStatus) => {
        switch (status) {
            case "empty": return "Empty";
            case "half": return "Half";
            case "full": return "Full";
            default: return "-";
        }
    };

    // Updated Handler: Per-bin Status
    const handleStatusChange = (index: number, type: 'green' | 'yellow') => {
        const currentStatus = weekLogs[index][type];
        const nextStatus: WasteStatus =
            currentStatus === 'empty' ? 'half' :
                currentStatus === 'half' ? 'full' : 'empty';

        const updatedLogs = [...weekLogs];
        updatedLogs[index] = { ...updatedLogs[index], [type]: nextStatus };

        // Auto-set note to 'new' if status changes to non-empty and note is null
        if (nextStatus !== 'empty') {
            const noteKey = type === 'green' ? 'greenNote' : 'yellowNote';
            if (updatedLogs[index][noteKey] === null) {
                updatedLogs[index] = { ...updatedLogs[index], [noteKey]: 'new' };
            }
        }

        setWeekLogs(updatedLogs);
        setIsDirty(true);
    };

    // Updated Handler: Per-bin Note
    const handleNoteChange = (index: number, type: 'green' | 'yellow') => {
        const noteKey = type === 'green' ? 'greenNote' : 'yellowNote';
        const currentNote = weekLogs[index][noteKey];
        let nextNote: WasteNote;

        // Cycle: null -> new -> leftover -> holiday -> null
        if (currentNote === null) nextNote = 'new';
        else if (currentNote === 'new') nextNote = 'leftover';
        else if (currentNote === 'leftover') nextNote = 'holiday';
        else nextNote = null;

        const updatedLogs = [...weekLogs];
        updatedLogs[index] = { ...updatedLogs[index], [noteKey]: nextNote };
        setWeekLogs(updatedLogs);
        setIsDirty(true);
    };

    // --- Calculation Logic ---
    const calculateStats = (logs: DailyLog[]) => {
        let totalGreenWeight = 0;
        let totalYellowWeight = 0;
        let totalCarbon = 0;

        logs.forEach(log => {
            // Helper to get fill multiplier
            const getFillMultiplier = (status: WasteStatus) => {
                if (status === 'full') return 1.0;
                if (status === 'half') return 0.5;
                return 0;
            };

            // Helper to calculate mass for a bin
            const calculateBin = (status: WasteStatus, note: WasteNote, density: number, emissionFactor: number) => {
                // If Empty, leftover, or holiday -> 0 mass added for *today*
                // Wait. "Sisa Kemarin" means it's waste, but it was already counted yesterday.
                // So for TODAY's generation calculation, we ignore it.
                if (status === 'empty' || note === 'holiday' || note === 'leftover' || note === null) {
                    return { weight: 0, carbon: 0 };
                }

                // If "New" -> We calculate
                const volume = BIN_CAPACITY * getFillMultiplier(status);
                const weight = volume * density;
                const carbon = weight * emissionFactor;
                return { weight, carbon };
            };

            const greenStats = calculateBin(log.green, log.greenNote, DENSITY_GREEN, EMISSION_FACTOR_GREEN);
            const yellowStats = calculateBin(log.yellow, log.yellowNote, DENSITY_YELLOW, EMISSION_FACTOR_YELLOW);

            totalGreenWeight += greenStats.weight;
            totalCarbon += greenStats.carbon;

            totalYellowWeight += yellowStats.weight;
            totalCarbon += yellowStats.carbon;
        });

        return { totalGreenWeight, totalYellowWeight, totalCarbon };
    };

    const currentStats = calculateStats(weekLogs);

    const handleSubmit = () => {
        setIsSaving(true);
        setTimeout(() => {
            const startDate = weekLogs[0].date;
            const endDate = weekLogs[4].date;
            const year = selectedDate.getFullYear();

            const stats = calculateStats(weekLogs);

            const newReport: WeeklyReport = {
                id: Date.now(),
                weekRange: `${startDate} - ${endDate} ${year}`,
                submittedAt: new Date().toLocaleString(),
                logs: [...weekLogs],
                ...stats
            };

            setHistory([newReport, ...history]);
            setIsSaving(false);
            setIsDirty(false);

            alert("Weekly report submitted successfully!");
        }, 800);
    };

    const isToday = (dateStr: string) => {
        const today = new Date().toISOString().split('T')[0];
        return dateStr === today;
    };

    return (
        <div className="space-y-8 pb-20">
            {/* Header */}
            <div className="flex flex-col gap-4">
                <Link
                    href="/dashboard/sustainability"
                    className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors w-fit"
                >
                    <ChevronLeft className="w-4 h-4" /> Back to Sustainability
                </Link>
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-3 mb-1">
                            <span className="text-3xl">♻️</span>
                            <h1 className="text-3xl font-black tracking-tight text-white">Weekly Waste Log</h1>
                        </div>
                        <p className="text-lg text-gray-400">Monitor Office Bin Capacity (Mon - Fri)</p>
                    </div>
                    <button
                        onClick={handleSubmit}
                        className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all
                            ${isDirty
                                ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg hover:shadow-emerald-500/20'
                                : 'bg-white/5 text-gray-500 cursor-not-allowed'}`}
                    >
                        {isSaving ? (
                            <RotateCcw className="w-5 h-5 animate-spin" />
                        ) : (
                            <FileText className="w-5 h-5" />
                        )}
                        {isSaving ? "Submitting..." : "Submit Weekly Report"}
                    </button>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Green Waste Stats */}
                <div className="glass-panel p-6 rounded-xl border border-emerald-500/20 bg-emerald-500/5 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-10">
                        <Leaf className="w-24 h-24 text-emerald-500" />
                    </div>
                    <div className="relative z-10">
                        <p className="text-emerald-400 text-sm font-bold uppercase tracking-wider mb-2">Total Organik</p>
                        <div className="flex items-baseline gap-2">
                            <span className="text-4xl font-black text-white">{currentStats.totalGreenWeight.toFixed(2)}</span>
                            <span className="text-sm text-gray-400 font-medium">kg</span>
                        </div>
                        <p className="text-xs text-gray-500 mt-2">Emission Factor: ~{EMISSION_FACTOR_GREEN} kgCO2e/kg</p>
                    </div>
                </div>

                {/* Yellow Waste Stats */}
                <div className="glass-panel p-6 rounded-xl border border-yellow-500/20 bg-yellow-500/5 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-10">
                        <Trash2 className="w-24 h-24 text-yellow-500" />
                    </div>
                    <div className="relative z-10">
                        <p className="text-yellow-400 text-sm font-bold uppercase tracking-wider mb-2">Total Anorganik</p>
                        <div className="flex items-baseline gap-2">
                            <span className="text-4xl font-black text-white">{currentStats.totalYellowWeight.toFixed(2)}</span>
                            <span className="text-sm text-gray-400 font-medium">kg</span>
                        </div>
                        <p className="text-xs text-gray-500 mt-2">Emission Factor: ~{EMISSION_FACTOR_YELLOW} kgCO2e/kg</p>
                    </div>
                </div>

                {/* Carbon Emission Stats */}
                <div className="glass-panel p-6 rounded-xl border border-white/10 bg-white/5 relative overflow-hidden">
                    <div className="relative z-10">
                        <p className="text-gray-400 text-sm font-bold uppercase tracking-wider mb-2">Est. Jejak Karbon</p>
                        <div className="flex items-baseline gap-2">
                            <span className="text-4xl font-black text-white">{currentStats.totalCarbon.toFixed(2)}</span>
                            <span className="text-sm text-gray-400 font-medium">kg CO2e</span>
                        </div>
                        <p className="text-xs text-gray-500 mt-2">Total Estimated Emissions</p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Main Content: Weekly Table & History */}
                <div className="lg:col-span-2 space-y-8">
                    {/* Active Week Table */}
                    <div className="glass-panel p-6 rounded-xl border border-white/10">
                        {/* Week Navigation */}
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-4">
                                <div className="flex items-center bg-white/5 rounded-lg border border-white/10 p-1">
                                    <button
                                        onClick={() => handleWeekChange('prev')}
                                        className="p-1 hover:bg-white/10 rounded-md transition-colors text-gray-400 hover:text-white"
                                    >
                                        <ChevronLeft className="w-5 h-5" />
                                    </button>
                                    <div className="px-3 py-1 flex items-center gap-2 text-sm font-medium text-white border-l border-r border-white/10 mx-1">
                                        <Calendar className="w-4 h-4 text-blue-500" />
                                        <span>
                                            {weekLogs.length > 0 ? `${weekLogs[0].date} - ${weekLogs[4].date}` : "Loading..."}
                                        </span>
                                    </div>
                                    <button
                                        onClick={() => handleWeekChange('next')}
                                        className="p-1 hover:bg-white/10 rounded-md transition-colors text-gray-400 hover:text-white"
                                    >
                                        <ChevronRight className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="text-left text-gray-500 border-b border-white/5">
                                        <th className="pb-4 font-medium pl-2 w-24">Day</th>
                                        <th className="pb-4 font-medium text-center">Green (10L)</th>
                                        <th className="pb-4 font-medium text-center">Yellow (10L)</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {weekLogs.map((log, idx) => (
                                        <tr key={log.day} className={`group hover:bg-white/[0.02] transition-colors ${isToday(log.fullDate) ? 'bg-white/5' : ''}`}>
                                            <td className="py-4 pl-2 align-top">
                                                <div className="flex flex-col mt-2">
                                                    <span className={`font-bold ${isToday(log.fullDate) ? 'text-white' : 'text-gray-400'}`}>
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
                                                                        'bg-white/5 text-gray-500 border-transparent hover:border-white/10'}`}
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
                                                                        'bg-white/5 text-gray-500 border-transparent hover:border-white/10'}`}
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
                        <div className="flex items-center gap-3 px-2">
                            <History className="w-5 h-5 text-gray-500" />
                            <h3 className="font-bold text-white">Report History</h3>
                        </div>

                        {history.map((report) => (
                            <div key={report.id} className="glass-panel rounded-xl border border-white/5 overflow-hidden">
                                {/* History Header */}
                                <div className="p-4 bg-white/5 border-b border-white/5 flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-500">
                                            <Check className="w-4 h-4" />
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-white text-sm">{report.weekRange}</h4>
                                            <p className="text-[10px] text-gray-400">
                                                Submitted: {report.submittedAt} •
                                                <span className="text-emerald-400 ml-1">{report.totalGreenWeight.toFixed(2)}kg (G)</span> •
                                                <span className="text-yellow-400 ml-1">{report.totalYellowWeight.toFixed(2)}kg (Y)</span>
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* History Detailed View */}
                                <div className="p-4 overflow-x-auto">
                                    <table className="w-full text-xs">
                                        <thead>
                                            <tr className="text-gray-500 border-b border-white/5">
                                                <th className="text-left pb-2 w-16">Day</th>
                                                <th className="text-center pb-2">Green</th>
                                                <th className="text-center pb-2">Yellow</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-white/5">
                                            {report.logs.map((log, i) => (
                                                <tr key={i} className="text-gray-300">
                                                    <td className="py-2 font-medium">{log.day}</td>
                                                    <td className="py-2 text-center">
                                                        <div className="flex flex-col gap-1 items-center">
                                                            <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] capitalize
                                                                ${log.green === 'full' ? 'bg-rose-500/20 text-rose-400' :
                                                                    log.green === 'half' ? 'bg-emerald-500/20 text-emerald-400' :
                                                                        'bg-white/5 text-gray-500'}`}>
                                                                {log.green}
                                                            </span>
                                                            {log.greenNote && (
                                                                <span className="text-[9px] text-gray-500">({log.greenNote})</span>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className="py-2 text-center">
                                                        <div className="flex flex-col gap-1 items-center">
                                                            <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] capitalize
                                                                ${log.yellow === 'full' ? 'bg-rose-500/20 text-rose-400' :
                                                                    log.yellow === 'half' ? 'bg-yellow-500/20 text-yellow-500' :
                                                                        'bg-white/5 text-gray-500'}`}>
                                                                {log.yellow}
                                                            </span>
                                                            {log.yellowNote && (
                                                                <span className="text-[9px] text-gray-500">({log.yellowNote})</span>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Right Sidebar: Guidelines */}
                <div className="space-y-6">
                    <div className="glass-panel p-6 rounded-xl border border-white/10">
                        <h3 className="font-bold text-white mb-4">Waste Separation Guide</h3>

                        <div className="space-y-6">
                            <div className="relative pl-4 border-l-2 border-emerald-500">
                                <h4 className="text-emerald-500 font-bold text-sm mb-2">🟢 Green Bin (Organik) - 10L</h4>
                                <ul className="text-xs text-gray-400 space-y-1 list-disc list-inside">
                                    <li>Sisa Makanan, Buah, Sayur</li>
                                    <li>Ampas Kopi</li>
                                    <li>Daun dan Ranting</li>
                                    <li>Kertas/Tisu (Basah/Terurai)</li>
                                </ul>
                                <p className="text-[10px] text-emerald-500/60 mt-2 font-mono">Density: 0.03 kg/L</p>
                            </div>

                            <div className="relative pl-4 border-l-2 border-yellow-500">
                                <h4 className="text-yellow-500 font-bold text-sm mb-2">🟡 Yellow Bin (Anorganik) - 10L</h4>
                                <ul className="text-xs text-gray-400 space-y-1 list-disc list-inside">
                                    <li>Plastik, Kemasan</li>
                                    <li>Logam, Aluminium Foil</li>
                                    <li>Styrofoam, Karet</li>
                                    <li>Tisu Basah</li>
                                </ul>
                                <p className="text-[10px] text-yellow-500/60 mt-2 font-mono">Density: 0.05 kg/L</p>
                            </div>
                        </div>
                    </div>

                    <div className="glass-panel p-6 rounded-xl bg-gradient-to-b from-blue-500/10 to-transparent border border-blue-500/20">
                        <h3 className="font-bold text-blue-400 mb-2">💡 Operational Note</h3>
                        <p className="text-sm text-gray-300 leading-relaxed">
                            Pastikan update status bin setiap <strong>pulang kerja (17:00)</strong>.
                            <br /><br />
                            <strong>✨ Baru:</strong> Sampah baru (dihitung).
                            <br />
                            <strong>🕰️ Sisa:</strong> Sisa kemarin (tidak dihitung).
                            <br />
                            <strong>🌴 Libur:</strong> Tidak ada sampah (0 kg).
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
