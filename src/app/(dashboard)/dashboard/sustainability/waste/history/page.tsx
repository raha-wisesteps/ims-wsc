"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ChevronLeft, FileSpreadsheet, Download, Calendar, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import * as XLSX from "xlsx";

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

    const calculateDailyStats = (log: WasteLog, config: typeof DEFAULT_CONFIG) => {
        const getFillMultiplier = (status: string) => {
            if (status === 'full') return 1.0;
            if (status === 'half') return 0.5;
            return 0;
        };

        const calculateBin = (status: string, note: string | null, density: number, emissionFactor: number) => {
            if (status === 'empty' || note === 'holiday' || note === 'leftover' || note === null) {
                return { volume: 0, weight: 0, carbon: 0 };
            }
            const volume = config.binCapacity * getFillMultiplier(status);
            const weight = volume * density;
            const carbon = weight * emissionFactor;
            return { volume, weight, carbon };
        };

        const green = calculateBin(log.green_status, log.green_note, config.greenDensity, config.greenEmissionFactor);
        const yellow = calculateBin(log.yellow_status, log.yellow_note, config.yellowDensity, config.yellowEmissionFactor);

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

            // 2. Prepare Data for Excel
            const excelData = (logs as WasteLog[]).map(log => {
                // Find matching report to get the config used for that week
                const logDate = new Date(log.date);
                const matchingReport = reports.find(r => {
                    const start = new Date(r.week_start);
                    const end = new Date(r.week_end);
                    // Normalize times for comparison
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

                const stats = calculateDailyStats(log, config);

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

    return (
        <div className="space-y-8 pb-20 p-6 md:p-8 max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex flex-col gap-4">
                <Link
                    href="/dashboard/sustainability/waste"
                    className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors w-fit"
                >
                    <ChevronLeft className="w-4 h-4" /> Back to Log
                </Link>
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-black tracking-tight text-white flex items-center gap-3">
                            <FileSpreadsheet className="w-8 h-8 text-blue-500" />
                            Waste Report History
                        </h1>
                        <p className="text-gray-400 mt-1">Archive of all submitted weekly waste reports.</p>
                    </div>

                    <button
                        onClick={handleDownloadExcel}
                        disabled={isExporting}
                        className="flex items-center gap-2 px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition-all shadow-lg hover:shadow-emerald-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isExporting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Download className="w-5 h-5" />}
                        {isExporting ? "Exporting..." : "Download Excel Report"}
                    </button>
                </div>
            </div>

            {/* List */}
            <div className="glass-panel rounded-xl border border-white/10 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left text-gray-400">
                        <thead className="text-xs text-gray-500 uppercase bg-white/5">
                            <tr>
                                <th scope="col" className="px-6 py-4">Week Range</th>
                                <th scope="col" className="px-6 py-4">Submitted At</th>
                                <th scope="col" className="px-6 py-4 text-center">Green Waste (kg)</th>
                                <th scope="col" className="px-6 py-4 text-center">Yellow Waste (kg)</th>
                                <th scope="col" className="px-6 py-4 text-right">Total Carbon (kgCO2e)</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {isLoading ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                                        <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
                                        Loading history...
                                    </td>
                                </tr>
                            ) : reports.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-8 text-center text-gray-500 italic">
                                        No reports found.
                                    </td>
                                </tr>
                            ) : (
                                reports.map((report) => (
                                    <tr key={report.id} className="bg-transparent hover:bg-white/[0.02] transition-colors">
                                        <td className="px-6 py-4 font-medium text-white flex items-center gap-2">
                                            <Calendar className="w-4 h-4 text-blue-500" />
                                            {new Date(report.week_start).toLocaleDateString()} - {new Date(report.week_end).toLocaleDateString()}
                                        </td>
                                        <td className="px-6 py-4">
                                            {new Date(report.submitted_at).toLocaleString()}
                                        </td>
                                        <td className="px-6 py-4 text-center text-emerald-400 font-bold">
                                            {report.total_green_weight.toFixed(2)}
                                        </td>
                                        <td className="px-6 py-4 text-center text-yellow-400 font-bold">
                                            {report.total_yellow_weight.toFixed(2)}
                                        </td>
                                        <td className="px-6 py-4 text-right text-white font-bold text-base">
                                            {report.total_carbon.toFixed(2)}
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
