"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft, FileSpreadsheet, Download, Calendar, Loader2, Droplets, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import * as XLSX from "xlsx";
import { toast } from "sonner";

// Types matching DB
interface WeeklyReportDB {
    id: string;
    week_start: string;
    week_end: string;
    submitted_at: string;
    total_water_liters: number;
    total_carbon_kg: number;
    // Snapshot configs
    hand_wash_freq: number;
    hand_wash_vol: number;
    toilet_flush_freq: number;
    toilet_flush_vol: number;
    emission_factor: number;
}

interface WaterLog {
    date: string;
    employee_count: number;
    is_holiday: boolean;
    total_water_liters: number;
    carbon_emission: number;
    notes: string | null;
}

export default function WaterHistoryPage() {
    const supabase = createClient();
    const [reports, setReports] = useState<WeeklyReportDB[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isExporting, setIsExporting] = useState(false);

    useEffect(() => {
        fetchReports();
    }, []);

    const fetchReports = async () => {
        try {
            const { data, error } = await supabase
                .from('water_weekly_reports')
                .select('*')
                .not('submitted_at', 'is', null) // Only submitted
                .order('submitted_at', { ascending: false });

            if (error) throw error;
            setReports((data as any[]) || []);
        } catch (error) {
            console.error("Error fetching reports:", error);
            toast.error("Failed to load history");
        } finally {
            setIsLoading(false);
        }
    };

    const handleDownloadExcel = async () => {
        setIsExporting(true);
        try {
            // 1. Fetch ALL logs
            const { data: logs, error } = await supabase
                .from('water_logs')
                .select('*')
                .order('date', { ascending: false });

            if (error) throw error;

            if (!logs || logs.length === 0) {
                toast.warning("No data available to export.");
                return;
            }

            // 2. Prepare Data
            const excelData = (logs as WaterLog[]).map(log => {
                // Find matching report config if exists
                const logDate = new Date(log.date);
                const matchingReport = reports.find(r => {
                    const start = new Date(r.week_start);
                    const end = new Date(r.week_end);
                    // Adjust time to safe overlap
                    start.setHours(0, 0, 0, 0);
                    end.setHours(23, 59, 59, 999);
                    // Check date (logDate usually T00:00:00)
                    const check = new Date(log.date);
                    return check >= start && check <= end;
                });

                // Display whether calculation was based on custom weekly snapshot or likely global/daily
                const configSource = matchingReport ? "Weekly Report Snapshot" : "Daily/Global Config";

                return {
                    "Date": log.date,
                    "Day": new Date(log.date).toLocaleDateString('en-US', { weekday: 'long' }),
                    "Employee Count": log.employee_count,
                    "Status": log.is_holiday ? "Holiday" : "Work Day",
                    "Water Usage (L)": parseFloat(log.total_water_liters?.toFixed(2) || "0"),
                    "Carbon Emission (kgCO2e)": parseFloat(log.carbon_emission?.toFixed(3) || "0"),
                    "Notes": log.notes || "-",
                    "Config Source": configSource
                };
            });

            // 3. Generate Sheet
            const ws = XLSX.utils.json_to_sheet(excelData);

            // Col Widths
            const wscols = [
                { wch: 15 }, // Date
                { wch: 10 }, // Day
                { wch: 15 }, // Count
                { wch: 12 }, // Status
                { wch: 15 }, // Water
                { wch: 20 }, // Carbon
                { wch: 30 }, // Notes
                { wch: 20 }  // Source
            ];
            ws['!cols'] = wscols;

            // 4. Generate Book
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "Water Logs");

            // 5. Save
            XLSX.writeFile(wb, `water-sustainability-history-${new Date().toISOString().split('T')[0]}.xlsx`);
            toast.success("Excel downloaded successfully");

        } catch (error) {
            console.error("Export error:", error);
            toast.error("Failed to export Excel");
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
                .from('water_logs')
                .delete()
                .gte('date', weekStart)
                .lte('date', weekEnd);

            if (logsError) {
                console.error("Error deleting logs:", logsError);
                // Continue? Or stop? If logs fail, report might differ. But usually dependent.
                // Let's warn but try to delete report.
                toast.error("Failed to delete some daily logs.");
            }

            // 2. Delete Weekly Report
            const { error } = await supabase
                .from('water_weekly_reports')
                .delete()
                .eq('id', id);

            if (error) throw error;

            toast.success("Report and logs deleted");
            setReports(reports.filter(r => r.id !== id));
            router.refresh(); // Refresh server data for other pages
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
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
                        <Droplets className="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2 mb-1 text-sm text-gray-500 dark:text-gray-400">
                            <Link href="/dashboard" className="hover:text-gray-900 dark:hover:text-white transition-colors">Dashboard</Link>
                            <ChevronLeft className="h-4 w-4 rotate-180" />
                            <Link href="/dashboard/sustainability" className="hover:text-gray-900 dark:hover:text-white transition-colors">Sustainability</Link>
                            <ChevronLeft className="h-4 w-4 rotate-180" />
                            <Link href="/dashboard/sustainability/water" className="hover:text-gray-900 dark:hover:text-white transition-colors">Water</Link>
                            <ChevronLeft className="h-4 w-4 rotate-180" />
                            <span className="text-gray-900 dark:text-white font-medium">History</span>
                        </div>
                        <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">Water Report History</h1>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Archive of submitted weekly water consumption reports.</p>
                    </div>
                </div>

                <button
                    onClick={handleDownloadExcel}
                    disabled={isExporting}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white dark:bg-[#1c2120] border border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:border-blue-500 transition-colors shadow-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                    {isExporting ? "Exporting..." : "Export"}
                </button>
            </div>

            {/* List */}
            <div className="glass-panel rounded-xl border border-white/10 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left text-gray-400">
                        <thead className="text-xs text-gray-500 uppercase bg-white/5">
                            <tr>
                                <th scope="col" className="px-6 py-4">Week Range</th>
                                <th scope="col" className="px-6 py-4">Submitted At</th>
                                <th scope="col" className="px-6 py-4 text-center">Total Water (L)</th>
                                <th scope="col" className="px-6 py-4 text-right">Total Carbon (kgCO2e)</th>
                                <th scope="col" className="px-6 py-4 text-center">Action</th>
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
                                        No submitted reports found.
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
                                        <td className="px-6 py-4 text-center text-blue-400 font-bold">
                                            {report.total_water_liters.toFixed(2)}
                                        </td>
                                        <td className="px-6 py-4 text-right text-white font-bold text-base">
                                            {report.total_carbon_kg.toFixed(3)}
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            {/* Delete Button (visible to all, but only works if permitted by RLS) */}
                                            {/* Ideally we check permission, but RLS will block it if not owners/admin */}
                                            <button
                                                onClick={() => handleDelete(report.id, report.week_start, report.week_end)}
                                                className="p-2 rounded-lg text-gray-500 hover:text-red-500 hover:bg-white/5 transition-colors"
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
