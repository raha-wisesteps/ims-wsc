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
    History
} from "lucide-react";

// Types
type WasteStatus = "empty" | "half" | "full";
type WasteNote = "new" | "leftover" | "holiday" | null; // Added 'holiday'

interface DailyLog {
    day: string;
    date: string;
    fullDate: string; // YYYY-MM-DD for comparison
    green: WasteStatus;
    yellow: WasteStatus;
    note: WasteNote;
}

interface WeeklyReport {
    id: number;
    weekRange: string;
    submittedAt: string;
    logs: DailyLog[];
}

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
            logs: [
                { day: "Mon", date: "01 Jan", fullDate: "2024-01-01", green: "empty", yellow: "empty", note: "holiday" },
                { day: "Tue", date: "02 Jan", fullDate: "2024-01-02", green: "half", yellow: "half", note: "new" },
                { day: "Wed", date: "03 Jan", fullDate: "2024-01-03", green: "full", yellow: "full", note: "leftover" },
                { day: "Thu", date: "04 Jan", fullDate: "2024-01-04", green: "empty", yellow: "empty", note: null },
                { day: "Fri", date: "05 Jan", fullDate: "2024-01-05", green: "half", yellow: "full", note: "new" },
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
                yellow: "empty",
                note: null
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

    const handleStatusChange = (index: number, type: 'green' | 'yellow') => {
        const currentStatus = weekLogs[index][type];
        const nextStatus: WasteStatus =
            currentStatus === 'empty' ? 'half' :
                currentStatus === 'half' ? 'full' : 'empty';

        const updatedLogs = [...weekLogs];
        updatedLogs[index] = { ...updatedLogs[index], [type]: nextStatus };
        setWeekLogs(updatedLogs);
        setIsDirty(true);
    };

    const handleNoteChange = (index: number) => {
        const currentNote = weekLogs[index].note;
        let nextNote: WasteNote;

        // Cycle: null -> new -> leftover -> holiday -> null
        if (currentNote === null) nextNote = 'new';
        else if (currentNote === 'new') nextNote = 'leftover';
        else if (currentNote === 'leftover') nextNote = 'holiday';
        else nextNote = null;

        const updatedLogs = [...weekLogs];
        updatedLogs[index] = { ...updatedLogs[index], note: nextNote };
        setWeekLogs(updatedLogs);
        setIsDirty(true);
    };

    const handleSubmit = () => {
        setIsSaving(true);
        setTimeout(() => {
            const startDate = weekLogs[0].date;
            const endDate = weekLogs[4].date;
            const year = selectedDate.getFullYear();

            const newReport: WeeklyReport = {
                id: Date.now(),
                weekRange: `${startDate} - ${endDate} ${year}`,
                submittedAt: new Date().toLocaleString(),
                logs: [...weekLogs]
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
                            <div className="flex gap-4 text-xs text-gray-400">
                                <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-white/10 border border-white/20"></div> Click to toggle</div>
                            </div>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="text-left text-gray-500 border-b border-white/5">
                                        <th className="pb-4 font-medium pl-2 w-32">Day</th>
                                        <th className="pb-4 font-medium text-center">Green (Organic)</th>
                                        <th className="pb-4 font-medium text-center">Yellow (Anorganic)</th>
                                        <th className="pb-4 font-medium text-center w-40">Info Label</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {weekLogs.map((log, idx) => (
                                        <tr key={log.day} className={`group hover:bg-white/[0.02] transition-colors ${isToday(log.fullDate) ? 'bg-white/5' : ''}`}>
                                            <td className="py-4 pl-2">
                                                <div className="flex flex-col">
                                                    <span className={`font-bold ${isToday(log.fullDate) ? 'text-white' : 'text-gray-400'}`}>
                                                        {log.day} {isToday(log.fullDate) && <span className="ml-2 text-[10px] bg-blue-500 text-white px-1.5 py-0.5 rounded">TODAY</span>}
                                                    </span>
                                                    <span className="text-xs text-gray-500">{log.date}</span>
                                                </div>
                                            </td>

                                            {/* Green Bin Status Toggle */}
                                            <td className="py-4 text-center">
                                                <button
                                                    onClick={() => handleStatusChange(idx, 'green')}
                                                    className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all hover:scale-105 active:scale-95 w-28 justify-center ${getStatusColor(log.green, 'green')}`}
                                                >
                                                    <div className={`w-2 h-2 rounded-full ${log.green === 'full' ? 'bg-rose-500' : 'bg-emerald-500'}`}></div>
                                                    {getStatusLabel(log.green)}
                                                </button>
                                            </td>

                                            {/* Yellow Bin Status Toggle */}
                                            <td className="py-4 text-center">
                                                <button
                                                    onClick={() => handleStatusChange(idx, 'yellow')}
                                                    className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all hover:scale-105 active:scale-95 w-28 justify-center ${getStatusColor(log.yellow, 'yellow')}`}
                                                >
                                                    <div className={`w-2 h-2 rounded-full ${log.yellow === 'full' ? 'bg-rose-500' : 'bg-yellow-500'}`}></div>
                                                    {getStatusLabel(log.yellow)}
                                                </button>
                                            </td>

                                            {/* Note / Label Toggle */}
                                            <td className="py-4 text-center">
                                                <button
                                                    onClick={() => handleNoteChange(idx)}
                                                    className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all hover:scale-105 active:scale-95 w-full justify-center
                                                        ${log.note === 'new' ? 'bg-blue-500/20 text-blue-400 border-blue-500/30' :
                                                            log.note === 'leftover' ? 'bg-orange-500/20 text-orange-400 border-orange-500/30' :
                                                                log.note === 'holiday' ? 'bg-purple-500/20 text-purple-400 border-purple-500/30' :
                                                                    'bg-white/5 text-gray-500 border-transparent hover:border-white/20'}`}
                                                >
                                                    {log.note === 'new' && <span className="flex items-center gap-1">✨ Sampah Baru</span>}
                                                    {log.note === 'leftover' && <span className="flex items-center gap-1">🕰️ Sisa Kemarin</span>}
                                                    {log.note === 'holiday' && <span className="flex items-center gap-1">🌴 Libur</span>}
                                                    {log.note === null && <span>-</span>}
                                                </button>
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
                                            <p className="text-[10px] text-gray-400">Submitted: {report.submittedAt}</p>
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
                                                <th className="text-center pb-2">Label</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-white/5">
                                            {report.logs.map((log, i) => (
                                                <tr key={i} className="text-gray-300">
                                                    <td className="py-2 font-medium">{log.day}</td>
                                                    <td className="py-2 text-center">
                                                        <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] capitalize
                                                            ${log.green === 'full' ? 'bg-rose-500/20 text-rose-400' :
                                                                log.green === 'half' ? 'bg-emerald-500/20 text-emerald-400' :
                                                                    'bg-white/5 text-gray-500'}`}>
                                                            {log.green}
                                                        </span>
                                                    </td>
                                                    <td className="py-2 text-center">
                                                        <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] capitalize
                                                            ${log.yellow === 'full' ? 'bg-rose-500/20 text-rose-400' :
                                                                log.yellow === 'half' ? 'bg-yellow-500/20 text-yellow-500' :
                                                                    'bg-white/5 text-gray-500'}`}>
                                                            {log.yellow}
                                                        </span>
                                                    </td>
                                                    <td className="py-2 text-center">
                                                        {log.note ? (
                                                            <span className={`inline-block px-2 py-0.5 rounded-full text-[10px]
                                                                ${log.note === 'new' ? 'bg-blue-500/10 text-blue-400' :
                                                                    log.note === 'leftover' ? 'bg-orange-500/10 text-orange-400' :
                                                                        'bg-purple-500/10 text-purple-400'}`}>
                                                                {log.note === 'new' ? '✨ Baru' :
                                                                    log.note === 'leftover' ? '🕰️ Sisa' : '🌴 Libur'}
                                                            </span>
                                                        ) : (
                                                            <span className="text-gray-600">-</span>
                                                        )}
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
                                <h4 className="text-emerald-500 font-bold text-sm mb-2">🟢 Green Bin (Organic)</h4>
                                <ul className="text-xs text-gray-400 space-y-1 list-disc list-inside">
                                    <li>Sisa Makanan</li>
                                    <li>Kulit buah/sayur</li>
                                    <li>Daun/Tanaman</li>
                                    <li>Kertas pembungkus makanan (basah)</li>
                                </ul>
                            </div>

                            <div className="relative pl-4 border-l-2 border-yellow-500">
                                <h4 className="text-yellow-500 font-bold text-sm mb-2">🟡 Yellow Bin (Anorganic)</h4>
                                <ul className="text-xs text-gray-400 space-y-1 list-disc list-inside">
                                    <li>Plastik kemasan</li>
                                    <li>Botol minuman</li>
                                    <li>Kaleng/Logam</li>
                                    <li>Kertas/Kardus (kering)</li>
                                    <li>Styrofoam</li>
                                </ul>
                            </div>
                        </div>
                    </div>

                    <div className="glass-panel p-6 rounded-xl bg-gradient-to-b from-blue-500/10 to-transparent border border-blue-500/20">
                        <h3 className="font-bold text-blue-400 mb-2">💡 Operational Note</h3>
                        <p className="text-sm text-gray-300 leading-relaxed">
                            Pastikan update status bin setiap <strong>pulang kerja (17:00)</strong>.
                            <br /><br />
                            Lakukan <strong>Submit Weekly Report</strong> setiap hari Jumat sore untuk pengarsipan data mingguan.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
