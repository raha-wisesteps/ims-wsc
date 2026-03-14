"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft, FileSpreadsheet, Download, Calendar, Loader2, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import * as XLSX from "xlsx";
import { toast } from "sonner";

// Types
interface WeeklyReport {
    id: string;
    week_start: string;
    week_end: string;
    submitted_at: string;
    total_green_weight: number;
    total_yellow_weight: number;
    total_carbon: number;
    // Configs
    bin_capacity: number;
    green_density: number;
    yellow_density: number;
    green_emission_factor: number;
    yellow_emission_factor: number;
}

interface WasteLog {
    date: string;
    green_status: string;
    green_note: string | null;
    yellow_status: string;
    yellow_note: string | null;
}

// Default Configuration (Fallback)
const DEFAULT_CONFIG = {
    binCapacity: 10,
    greenDensity: 0.03,
    yellowDensity: 0.05,
    greenEmissionFactor: 0.5,
    yellowEmissionFactor: 2.0
};

export default function WasteHistoryPage() {
    const supabase = createClient();
    const [reports, setReports] = useState<WeeklyReport[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isExporting, setIsExporting] = useState(false);

    useEffect(() => {
        fetchReports();
    }, []);

    const fetchReports = async () => {
        try {
            const { data, error } = await supabase
                .from('waste_weekly_reports')
                .select('*')
                .not('submitted_at', 'is', null)
                .order('week_start', { ascending: false });

            if (error) throw error;
            setReports((data as any[]) || []);
        } catch (error) {
            console.error("Error fetching reports:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const calculateDailyStats = (log: WasteLog, config: typeof DEFAULT_CONFIG, prevLog?: WasteLog | null) => {
        const getFillMultiplier = (status: string) => {
            if (status === 'full') return 1.0;
            if (status === 'half') return 0.5;
            return 0;
        };

        const calculateBin = (status: string, note: string | null, density: number, emissionFactor: number, type: 'green' | 'yellow') => {
            // Holiday → always skip
            if (note === 'holiday') return { volume: 0, weight: 0, carbon: 0 };

            // Empty status — waste was collected/angkut
            if (status === 'empty') {
                if (note === 'new') {
                    // empty + new = sampah baru masuk dan langsung diangkut
                    const volume = config.binCapacity * 1.0;
                    const weight = volume * density;
                    const carbon = weight * emissionFactor;
                    return { volume, weight, carbon };
                }
                // empty + null/leftover = lihat status hari sebelumnya
                const prevStatus = prevLog
                    ? (type === 'green' ? prevLog.green_status : prevLog.yellow_status)
                    : 'empty';
                const volume = config.binCapacity * getFillMultiplier(prevStatus);
                const weight = volume * density;
                const carbon = weight * emissionFactor;
                return { volume, weight, carbon };
            }

            // Leftover on non-empty → skip (don't double count)
            if (note === 'leftover') return { volume: 0, weight: 0, carbon: 0 };

            // Half or Full (note is 'new' or null) → calculate current fill level
            const volume = config.binCapacity * getFillMultiplier(status);
            const weight = volume * density;
            const carbon = weight * emissionFactor;
            return { volume, weight, carbon };
        };

        const green = calculateBin(log.green_status, log.green_note, config.greenDensity, config.greenEmissionFactor, 'green');
        const yellow = calculateBin(log.yellow_status, log.yellow_note, config.yellowDensity, config.yellowEmissionFactor, 'yellow');

        return {
            greenVolume: green.volume,
            greenWeight: green.weight,
            greenCarbon: green.carbon,
            yellowVolume: yellow.volume,
            yellowWeight: yellow.weight,
            yellowCarbon: yellow.carbon,
            totalCarbon: green.carbon + yellow.carbon
        };
    };

    const handleDownloadExcel = async () => {
        setIsExporting(true);
        try {
            // 1. Fetch ALL logs
            const { data: logs, error } = await supabase
                .from('waste_logs')
                .select('*')
                .order('date', { ascending: false });

            if (error) throw error;

            if (!logs || logs.length === 0) {
                alert("No data available to export.");
                return;
            }

            // 2. Prepare Data for Excel (sort ascending for prev-day logic)
            const sortedLogs = (logs as WasteLog[]).sort((a, b) => a.date.localeCompare(b.date));

            const excelData = sortedLogs.map((log, index) => {
                // Find matching report to get the config used for that week
                const logDate = new Date(log.date);
                const matchingReport = reports.find(r => {
                    const start = new Date(r.week_start);
                    const end = new Date(r.week_end);
                    start.setHours(0, 0, 0, 0);
                    end.setHours(23, 59, 59, 999);
                    logDate.setHours(12, 0, 0, 0);
                    return logDate >= start && logDate <= end;
                });

                // Use Report Config or Defaults
                const config = matchingReport ? {
                    binCapacity: matchingReport.bin_capacity ?? DEFAULT_CONFIG.binCapacity,
                    greenDensity: matchingReport.green_density ?? DEFAULT_CONFIG.greenDensity,
                    yellowDensity: matchingReport.yellow_density ?? DEFAULT_CONFIG.yellowDensity,
                    greenEmissionFactor: matchingReport.green_emission_factor ?? DEFAULT_CONFIG.greenEmissionFactor,
                    yellowEmissionFactor: matchingReport.yellow_emission_factor ?? DEFAULT_CONFIG.yellowEmissionFactor
                } : DEFAULT_CONFIG;

                // Get previous day's log for empty calculation
                const prevLog = index > 0 ? sortedLogs[index - 1] : null;
                const stats = calculateDailyStats(log, config, prevLog);

                return {
                    "Date": log.date,
                    "Green Status": log.green_status,
                    "Green Note": log.green_note || "-",
                    "Green Volume (L)": stats.greenVolume.toFixed(2),
                    "Green Weight (kg)": stats.greenWeight.toFixed(2),
                    "Green Emission (kgCO2e)": stats.greenCarbon.toFixed(2),

                    "Yellow Status": log.yellow_status,
                    "Yellow Note": log.yellow_note || "-",
                    "Yellow Volume (L)": stats.yellowVolume.toFixed(2),
                    "Yellow Weight (kg)": stats.yellowWeight.toFixed(2),
                    "Yellow Emission (kgCO2e)": stats.yellowCarbon.toFixed(2),

                    "Total Emission (kgCO2e)": stats.totalCarbon.toFixed(2),
                    "Config Used": matchingReport ? "Custom/Week" : "Default"
                };
            });

            // 3. Generate Worksheet
            const ws = XLSX.utils.json_to_sheet(excelData);

            // Auto-width columns roughly
            const wscols = Object.keys(excelData[0]).map(() => ({ wch: 20 }));
            ws['!cols'] = wscols;

            // 4. Generate Workbook
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "Waste Logs");

            // 5. Download File
            XLSX.writeFile(wb, `waste-report-full-${new Date().toISOString().split('T')[0]}.xlsx`);

        } catch (error) {
            console.error("Error exporting excel:", error);
            alert("Failed to export Excel.");
        } finally {
            setIsExporting(false);
        }
    };

    const router = useRouter();

    const handleDelete = async (id: string, weekStart: string, weekEnd: string) => {
        if (!confirm("Are you sure you want to delete this report? This will also remove the daily logs for this period.")) return;

        try {
            // 1. Delete Daily Logs for this week
            const { error: logsError } = await supabase
                .from('waste_logs')
                .delete()
                .gte('date', weekStart)
                .lte('date', weekEnd);

            if (logsError) {
                console.error("Error deleting logs:", logsError);
                toast.error("Failed to delete some daily logs.");
            }

            // 2. Delete Weekly Report
            const { error } = await supabase
                .from('waste_weekly_reports')
                .delete()
                .eq('id', id);

            if (error) throw error;

            toast.success("Report and logs deleted");
            setReports(reports.filter(r => r.id !== id));
            router.refresh();
        } catch (error) {
            console.error("Error deleting report:", error);
            toast.error("Failed to delete report. You may not have permission.");
        }
    };

    return (
        <div className="space-y-8 pb-20 p-6 md:p-8 max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex flex-col gap-4 md:flex-row md:items-end justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
                        <FileSpreadsheet className="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2 mb-1 text-sm text-gray-500 dark:text-gray-400">
                            <Link href="/dashboard" className="hover:text-gray-900 dark:hover:text-white transition-colors">Dashboard</Link>
                            <ChevronLeft className="h-4 w-4 rotate-180" />
                            <Link href="/dashboard/sustainability" className="hover:text-gray-900 dark:hover:text-white transition-colors">Sustainability</Link>
                            <ChevronLeft className="h-4 w-4 rotate-180" />
                            <Link href="/dashboard/sustainability/waste" className="hover:text-gray-900 dark:hover:text-white transition-colors">Waste</Link>
                            <ChevronLeft className="h-4 w-4 rotate-180" />
                            <span className="text-gray-900 dark:text-white font-medium">History</span>
                        </div>
                        <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">Waste Report History</h1>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Archive of submitted weekly waste management reports.</p>
                    </div>
                </div>

                <button
                    onClick={handleDownloadExcel}
                    disabled={isExporting}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white dark:bg-[#1c2120] border border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:border-emerald-500 transition-colors shadow-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                    {isExporting ? "Exporting..." : "Export"}
                </button>
            </div>

            {/* List */}
            <div className="bg-white dark:bg-transparent rounded-xl border border-gray-200 dark:border-white/10 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left text-gray-600 dark:text-gray-400">
                        <thead className="text-xs text-gray-500 uppercase bg-gray-50 dark:bg-white/5">
                            <tr>
                                <th scope="col" className="px-6 py-4">Week Range</th>
                                <th scope="col" className="px-6 py-4">Submitted At</th>
                                <th scope="col" className="px-6 py-4 text-center">Total Green (kg)</th>
                                <th scope="col" className="px-6 py-4 text-center">Total Yellow (kg)</th>
                                <th scope="col" className="px-6 py-4 text-right">Total Carbon (kgCO2e)</th>
                                <th scope="col" className="px-6 py-4 text-center">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                            {isLoading ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                                        <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
                                        Loading history...
                                    </td>
                                </tr>
                            ) : reports.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-8 text-center text-gray-500 italic">
                                        No submitted reports found.
                                    </td>
                                </tr>
                            ) : (
                                reports.map((report) => (
                                    <tr key={report.id} className="bg-transparent hover:bg-gray-50 dark:hover:bg-white/[0.02] transition-colors">
                                        <td className="px-6 py-4 font-medium text-gray-900 dark:text-white flex items-center gap-2">
                                            <Calendar className="w-4 h-4 text-emerald-500" />
                                            {new Date(report.week_start).toLocaleDateString()} - {new Date(report.week_end).toLocaleDateString()}
                                        </td>
                                        <td className="px-6 py-4">
                                            {new Date(report.submitted_at).toLocaleString()}
                                        </td>
                                        <td className="px-6 py-4 text-center text-emerald-600 dark:text-emerald-400 font-bold">
                                            {report.total_green_weight.toFixed(2)}
                                        </td>
                                        <td className="px-6 py-4 text-center text-yellow-600 dark:text-yellow-400 font-bold">
                                            {report.total_yellow_weight.toFixed(2)}
                                        </td>
                                        <td className="px-6 py-4 text-right text-gray-900 dark:text-white font-bold text-base">
                                            {report.total_carbon.toFixed(3)}
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <button
                                                onClick={() => handleDelete(report.id, report.week_start, report.week_end)}
                                                className="p-2 rounded-lg text-gray-500 hover:text-red-500 hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
                                                title="Delete Report"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
