"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
    ChevronRight,
    Zap,
    Plus,
    Settings,
    Download,
    Trash2,
    FileText,
    Calendar,
    X,
    Save,
    AlertCircle,
    Link as LinkIcon,
    Edit2,
    Leaf
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import * as XLSX from 'xlsx';

// Types
interface ElectricityLog {
    id: string;
    period_start: string; // YYYY-MM-DD
    period_end: string;   // YYYY-MM-DD
    building_consumption_kwh: number;
    allocation_percentage: number;
    company_consumption_kwh: number;
    emission_factor: number;
    carbon_emission: number;
    evidence_link: string | null;
    notes: string | null;
    created_at: string;
}

interface ElectricityConfig {
    id: string;
    allocation_percentage: number;
    emission_factor: number;
}

export default function ElectricityReportPage() {
    const supabase = createClient();

    // State
    const [logs, setLogs] = useState<ElectricityLog[]>([]);
    const [config, setConfig] = useState<ElectricityConfig>({
        id: "",
        allocation_percentage: 100,
        emission_factor: 0.8
    });

    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    // Modals
    const [isAddOpen, setIsAddOpen] = useState(false);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);

    // Edit State
    const [editingId, setEditingId] = useState<string | null>(null);

    // Form Stats
    const [newLog, setNewLog] = useState({
        periodStart: "",
        periodEnd: "",
        buildingKwh: "",
        notes: "",
        evidenceLink: ""
    });

    const [tempConfig, setTempConfig] = useState({
        allocationPercentage: 100,
        emissionFactor: 0.8
    });

    // Initial Fetch
    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setIsLoading(true);
        try {
            // Fetch Config
            const { data: configData, error: configError } = await supabase
                .from('electricity_config')
                .select('*')
                .single();

            if (configData) {
                setConfig(configData);
                setTempConfig({
                    allocationPercentage: configData.allocation_percentage,
                    emissionFactor: configData.emission_factor
                });
            } else if (!configError) {
                // If no config exists, maybe create one or use defaults
                // For now, defaults are already in state
            }

            // Fetch Logs
            const { data: logsData, error: logsError } = await supabase
                .from('electricity_logs')
                .select('*')
                .order('period_end', { ascending: false });

            if (logsError) throw logsError;
            setLogs(logsData || []);

        } catch (error) {
            console.error("Error fetching data:", error);
            toast.error("Failed to load electricity data");
        } finally {
            setIsLoading(false);
        }
    };

    // --- Actions ---

    const handleEdit = (log: ElectricityLog) => {
        setEditingId(log.id);
        setNewLog({
            periodStart: log.period_start,
            periodEnd: log.period_end,
            buildingKwh: log.building_consumption_kwh.toString(),
            notes: log.notes || "",
            evidenceLink: log.evidence_link || ""
        });
        setIsAddOpen(true);
    };

    const handleCloseModal = () => {
        setIsAddOpen(false);
        setEditingId(null);
        setNewLog({
            periodStart: "",
            periodEnd: "",
            buildingKwh: "",
            notes: "",
            evidenceLink: ""
        });
    };

    const handleSaveReport = async () => {
        if (!newLog.periodStart || !newLog.periodEnd || !newLog.buildingKwh) {
            toast.error("Please fill in all required fields");
            return;
        }

        setIsSaving(true);
        try {
            const buildingKwh = parseFloat(newLog.buildingKwh);
            const allocation = config.allocation_percentage;
            const companyKwh = buildingKwh * (allocation / 100);
            const factor = config.emission_factor;
            const emission = companyKwh * factor;

            const payload = {
                period_start: newLog.periodStart,
                period_end: newLog.periodEnd,
                building_consumption_kwh: buildingKwh,
                allocation_percentage: allocation,
                company_consumption_kwh: companyKwh,
                emission_factor: factor,
                carbon_emission: emission,
                evidence_link: newLog.evidenceLink || null,
                notes: newLog.notes || null,
            };

            if (editingId) {
                // Update existing
                const { error } = await supabase
                    .from('electricity_logs')
                    .update({
                        ...payload,
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', editingId);

                if (error) throw error;
                toast.success("Report updated successfully");
            } else {
                // Insert new
                const { error } = await supabase
                    .from('electricity_logs')
                    .insert({
                        ...payload,
                        created_by: (await supabase.auth.getUser()).data.user?.id
                    });

                if (error) throw error;
                toast.success("Report added successfully");
            }

            handleCloseModal();
            fetchData();

        } catch (error) {
            console.error(error);
            toast.error(editingId ? "Failed to update report" : "Failed to add report");
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure you want to delete this report?")) return;

        try {
            const { error } = await supabase
                .from('electricity_logs')
                .delete()
                .eq('id', id);

            if (error) throw error;
            toast.success("Report deleted");
            setLogs(logs.filter(l => l.id !== id));
        } catch (error) {
            console.error(error);
            toast.error("Failed to delete report");
        }
    };

    const handleSaveSettings = async () => {
        setIsSaving(true);
        try {
            // Check if config exists
            if (config.id) {
                const { error } = await supabase
                    .from('electricity_config')
                    .update({
                        allocation_percentage: tempConfig.allocationPercentage,
                        emission_factor: tempConfig.emissionFactor,
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', config.id);
                if (error) throw error;
            } else {
                // Insert if not exists (rare case)
                const { error } = await supabase
                    .from('electricity_config')
                    .insert({
                        allocation_percentage: tempConfig.allocationPercentage,
                        emission_factor: tempConfig.emissionFactor
                    });
                if (error) throw error;
            }

            setConfig({
                ...config,
                allocation_percentage: tempConfig.allocationPercentage,
                emission_factor: tempConfig.emissionFactor
            });
            toast.success("Settings saved");
            setIsSettingsOpen(false);
        } catch (error) {
            console.error(error);
            toast.error("Failed to save settings");
        } finally {
            setIsSaving(false);
        }
    };

    const handleExport = () => {
        try {
            const dataToExport = logs.map(log => ({
                'Period Start': log.period_start,
                'Period End': log.period_end,
                'Building Consumption (kWh)': log.building_consumption_kwh,
                'Allocation (%)': log.allocation_percentage,
                'Company Consumption (kWh)': log.company_consumption_kwh,
                'Emission Factor (kgCO2e/kWh)': log.emission_factor,
                'Carbon Emission (kgCO2e)': log.carbon_emission,
                'Notes': log.notes || '-',
                'Evidence': log.evidence_link || '-'
            }));

            const ws = XLSX.utils.json_to_sheet(dataToExport);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "Electricity Logs");
            XLSX.writeFile(wb, `Electricity_Report_${new Date().toISOString().split('T')[0]}.xlsx`);
            toast.success("Export downloaded");
        } catch (error) {
            console.error(error);
            toast.error("Failed to export data");
        }
    };

    // --- Calculations ---
    const totalCompanyKwh = logs.reduce((sum, log) => sum + log.company_consumption_kwh, 0);
    const totalCarbon = logs.reduce((sum, log) => sum + log.carbon_emission, 0);
    const lastMonthConsumption = logs.length > 0 ? logs[0].company_consumption_kwh : 0;

    // Derived values for Add Modal
    const previewCompanyKwh = newLog.buildingKwh ? parseFloat(newLog.buildingKwh) * (config.allocation_percentage / 100) : 0;
    const previewEmission = newLog.buildingKwh ? previewCompanyKwh * config.emission_factor : 0;

    return (
        <div className="space-y-8 pb-20 relative">
            {/* Header */}
            <div className="flex flex-col gap-4 md:flex-row md:items-end justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-yellow-500 to-orange-500 flex items-center justify-center shadow-lg shadow-orange-500/20">
                        <Zap className="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2 mb-1 text-sm text-[var(--text-secondary)]">
                            <Link href="/dashboard" className="hover:text-[var(--text-primary)] transition-colors">Dashboard</Link>
                            <ChevronRight className="h-4 w-4" />
                            <Link href="/dashboard/sustainability" className="hover:text-[var(--text-primary)] transition-colors">Sustainability</Link>
                            <ChevronRight className="h-4 w-4" />
                            <span className="text-[var(--text-primary)]">Electricity</span>
                        </div>
                        <h1 className="text-2xl font-bold tracking-tight text-[var(--text-primary)]">Electricity Consumption</h1>
                        <p className="text-sm text-[var(--text-secondary)]">Monitor and track company electricity usage and carbon footprint</p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setIsSettingsOpen(true)}
                        className="p-2 rounded-xl bg-white dark:bg-[#1c2120] border border-[var(--glass-border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-blue-500 transition-colors shadow-sm"
                        title="Configuration"
                    >
                        <Settings className="w-5 h-5" />
                    </button>

                    <button
                        onClick={handleExport}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white dark:bg-[#1c2120] border border-[var(--glass-border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-yellow-500 transition-colors shadow-sm font-medium"
                    >
                        <Download className="w-4 h-4" />
                        Export
                    </button>

                    <button
                        onClick={() => { setIsAddOpen(true); setEditingId(null); }}
                        className="flex items-center gap-2 px-6 py-2 rounded-xl bg-yellow-500 hover:bg-yellow-400 text-black font-bold shadow-lg shadow-yellow-500/20 transition-all"
                    >
                        <Plus className="w-5 h-5" />
                        Add Report
                    </button>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Total Company Consumption */}
                <div className="glass-panel p-6 rounded-2xl border border-yellow-500/20 bg-yellow-500/5 relative overflow-hidden shadow-sm">
                    <div className="absolute top-0 right-0 p-4 opacity-10">
                        <Zap className="w-24 h-24 text-yellow-500" />
                    </div>
                    <div className="relative z-10">
                        <p className="text-yellow-600 dark:text-yellow-400 text-sm font-bold uppercase tracking-wider mb-2">Konsumsi Listrik</p>
                        <div className="flex items-baseline gap-2">
                            <span className="text-4xl font-black text-[var(--text-primary)]">{totalCompanyKwh.toLocaleString(undefined, { maximumFractionDigits: 1 })}</span>
                            <span className="text-sm text-[var(--text-secondary)] font-medium">kWh</span>
                        </div>
                        <p className="text-xs text-[var(--text-secondary)] mt-2">Total Accumulated</p>
                    </div>
                </div>

                {/* Total Carbon Emission */}
                <div className="glass-panel p-6 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 relative overflow-hidden shadow-sm">
                    <div className="absolute top-0 right-0 p-4 opacity-10">
                        <Leaf className="w-24 h-24 text-emerald-500" />
                    </div>
                    <div className="relative z-10">
                        <p className="text-emerald-600 dark:text-emerald-400 text-sm font-bold uppercase tracking-wider mb-2">Total Jejak Karbon</p>
                        <div className="flex items-baseline gap-2">
                            <span className="text-4xl font-black text-[var(--text-primary)]">{totalCarbon.toLocaleString(undefined, { maximumFractionDigits: 1 })}</span>
                            <span className="text-sm text-[var(--text-secondary)] font-medium">kgCO2e</span>
                        </div>
                        <p className="text-xs text-[var(--text-secondary)] mt-2">Factor: {config.emission_factor} kgCO2e/kWh</p>
                    </div>
                </div>

                {/* Last Month Consumption */}
                <div className="glass-panel p-6 rounded-2xl border border-blue-500/20 bg-blue-500/5 relative overflow-hidden shadow-sm">
                    <div className="absolute top-0 right-0 p-4 opacity-10">
                        <Calendar className="w-24 h-24 text-blue-500" />
                    </div>
                    <div className="relative z-10">
                        <p className="text-blue-600 dark:text-blue-400 text-sm font-bold uppercase tracking-wider mb-2">Last Month</p>
                        <div className="flex items-baseline gap-2">
                            <span className="text-4xl font-black text-[var(--text-primary)]">{lastMonthConsumption.toLocaleString(undefined, { maximumFractionDigits: 1 })}</span>
                            <span className="text-sm text-[var(--text-secondary)] font-medium">kWh</span>
                        </div>
                        <p className="text-xs text-[var(--text-secondary)] mt-2">
                            {logs.length > 0 ? `Period: ${logs[0].period_end}` : "No data recorded"}
                        </p>
                    </div>
                </div>
            </div>

            {/* Logs Table */}
            <div className="glass-panel rounded-xl border border-[var(--glass-border)] overflow-hidden">
                <div className="p-6 border-b border-[var(--glass-border)] flex items-center justify-between">
                    <h2 className="font-bold text-[var(--text-primary)] flex items-center gap-2">
                        <FileText className="w-5 h-5 text-yellow-500" />
                        Electricity Logs
                    </h2>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-black/5 dark:bg-white/5 text-[var(--text-secondary)]">
                            <tr>
                                <th className="px-6 py-4 text-left font-medium">Period</th>
                                <th className="px-6 py-4 text-right font-medium">Building Consumption</th>
                                <th className="px-6 py-4 text-right font-medium">Allocation (%)</th>
                                <th className="px-6 py-4 text-right font-medium">Company Consumption</th>
                                <th className="px-6 py-4 text-right font-medium">Emission (kgCO2e)</th>
                                <th className="px-6 py-4 text-left font-medium">Evidence</th>
                                <th className="px-6 py-4 text-right font-medium">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[var(--glass-border)]">
                            {isLoading ? (
                                <tr><td colSpan={7} className="px-6 py-8 text-center text-[var(--text-secondary)]">Loading data...</td></tr>
                            ) : logs.length === 0 ? (
                                <tr><td colSpan={7} className="px-6 py-8 text-center text-[var(--text-secondary)]">No electricity logs found. Add your first report!</td></tr>
                            ) : (
                                logs.map((log) => (
                                    <tr key={log.id} className="hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                                        <td className="px-6 py-4 text-[var(--text-primary)] whitespace-nowrap">
                                            <div className="flex flex-col">
                                                <span className="font-medium">{new Date(log.period_start).toLocaleDateString()} - {new Date(log.period_end).toLocaleDateString()}</span>
                                                {log.notes && <span className="text-xs text-[var(--text-secondary)] truncate max-w-[150px]">{log.notes}</span>}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right text-[var(--text-secondary)] font-mono">
                                            {log.building_consumption_kwh.toLocaleString()} kWh
                                        </td>
                                        <td className="px-6 py-4 text-right text-[var(--text-secondary)] font-mono">
                                            {log.allocation_percentage}%
                                        </td>
                                        <td className="px-6 py-4 text-right text-[var(--text-primary)] font-bold font-mono">
                                            {log.company_consumption_kwh.toLocaleString(undefined, { maximumFractionDigits: 1 })} kWh
                                        </td>
                                        <td className="px-6 py-4 text-right text-orange-500 font-bold font-mono">
                                            {log.carbon_emission.toLocaleString(undefined, { maximumFractionDigits: 1 })}
                                        </td>
                                        <td className="px-6 py-4 text-[var(--text-secondary)]">
                                            {log.evidence_link ? (
                                                <a href={log.evidence_link} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 hover:text-blue-500 transition-colors">
                                                    <LinkIcon className="w-3 h-3" /> Link
                                                </a>
                                            ) : (
                                                <span className="text-xs opacity-50">-</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <button
                                                    onClick={() => handleEdit(log)}
                                                    className="p-2 hover:bg-yellow-500/10 text-[var(--text-secondary)] hover:text-yellow-500 rounded-lg transition-colors"
                                                    title="Edit Log"
                                                >
                                                    <Edit2 className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(log.id)}
                                                    className="p-2 hover:bg-red-500/10 text-[var(--text-secondary)] hover:text-red-500 rounded-lg transition-colors"
                                                    title="Delete Log"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Add/Edit Report Modal */}
            {isAddOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-[#171611] border border-gray-200 dark:border-[var(--glass-border)] rounded-2xl w-full max-w-lg flex flex-col max-h-[90vh] shadow-2xl overflow-hidden">

                        {/* Modal Header */}
                        <div className="p-6 border-b border-gray-200 dark:border-[var(--glass-border)] flex justify-between items-center bg-gray-50 dark:bg-[#171611] shrink-0">
                            <h3 className="text-xl font-bold text-[var(--text-primary)]">
                                {editingId ? "Edit Electricity Report" : "Add Electricity Report"}
                            </h3>
                            <button
                                onClick={() => setIsAddOpen(false)}
                                className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-white/10 transition-colors"
                            >
                                <X className="w-5 h-5 text-[var(--text-secondary)]" />
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div className="p-6 space-y-4 overflow-y-auto custom-scrollbar flex-1">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-[var(--text-secondary)]">Period Start</label>
                                    <div className="relative">
                                        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
                                        <input
                                            type="date"
                                            className="w-full pl-10 pr-4 py-2 rounded-lg bg-[var(--card-bg)] border border-[var(--glass-border)] text-sm focus:border-[#e8c559] outline-none"
                                            value={newLog.periodStart}
                                            onChange={(e) => setNewLog({ ...newLog, periodStart: e.target.value })}
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-[var(--text-secondary)]">Period End</label>
                                    <div className="relative">
                                        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
                                        <input
                                            type="date"
                                            className="w-full pl-10 pr-4 py-2 rounded-lg bg-[var(--card-bg)] border border-[var(--glass-border)] text-sm focus:border-[#e8c559] outline-none"
                                            value={newLog.periodEnd}
                                            onChange={(e) => setNewLog({ ...newLog, periodEnd: e.target.value })}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium text-[var(--text-secondary)]">
                                    Building Consumption (kWh)
                                </label>
                                <div className="relative">
                                    <Zap className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
                                    <input
                                        type="number"
                                        placeholder="e.g. 5000"
                                        className="w-full pl-10 pr-4 py-2 rounded-lg bg-[var(--card-bg)] border border-[var(--glass-border)] text-sm focus:border-[#e8c559] outline-none"
                                        value={newLog.buildingKwh}
                                        onChange={(e) => setNewLog({ ...newLog, buildingKwh: e.target.value })}
                                    />
                                </div>
                            </div>

                            {/* Preview Calculation */}
                            <div className="p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/20 space-y-2">
                                <div className="flex justify-between text-sm">
                                    <span className="text-[var(--text-secondary)]">Allocated ({config.allocation_percentage}%):</span>
                                    <span className="font-medium text-[var(--text-primary)]">
                                        {(newLog.buildingKwh ? parseFloat(newLog.buildingKwh) * (config.allocation_percentage / 100) : 0).toLocaleString(undefined, { maximumFractionDigits: 1 })} kWh
                                    </span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-[var(--text-secondary)]">Est. Emission:</span>
                                    <span className="font-medium text-[var(--text-primary)]">
                                        {(newLog.buildingKwh ? (parseFloat(newLog.buildingKwh) * (config.allocation_percentage / 100) * config.emission_factor) : 0).toLocaleString(undefined, { maximumFractionDigits: 1 })} kgCO2e
                                    </span>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium text-[var(--text-secondary)]">Evidence Link (Optional)</label>
                                <input
                                    type="url"
                                    placeholder="https://drive.google.com/..."
                                    className="w-full px-4 py-2 rounded-lg bg-[var(--card-bg)] border border-[var(--glass-border)] text-sm focus:border-[#e8c559] outline-none"
                                    value={newLog.evidenceLink}
                                    onChange={(e) => setNewLog({ ...newLog, evidenceLink: e.target.value })}
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium text-[var(--text-secondary)]">Notes (Optional)</label>
                                <textarea
                                    rows={3}
                                    className="w-full px-4 py-2 rounded-lg bg-[var(--card-bg)] border border-[var(--glass-border)] text-sm focus:border-[#e8c559] outline-none resize-none"
                                    value={newLog.notes}
                                    onChange={(e) => setNewLog({ ...newLog, notes: e.target.value })}
                                />
                            </div>
                        </div>

                        {/* Modal Footer */}
                        <div className="p-6 border-t border-gray-200 dark:border-[var(--glass-border)] flex justify-end gap-3 bg-gray-50 dark:bg-[#171611] shrink-0">
                            <button
                                onClick={() => setIsAddOpen(false)}
                                className="px-4 py-2 rounded-lg text-sm font-medium text-[var(--text-secondary)] hover:bg-gray-200 dark:hover:bg-white/5 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSaveReport}
                                disabled={isSaving || !newLog.buildingKwh || !newLog.periodStart}
                                className="px-4 py-2 rounded-lg bg-[#e8c559] hover:bg-[#dcb33e] text-[#171611] text-sm font-bold shadow-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isSaving ? "Saving..." : (editingId ? "Update Report" : "Submit Report")}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Settings Modal */}
            {isSettingsOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-[#171611] border border-gray-200 dark:border-[var(--glass-border)] rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
                        <div className="p-6 border-b border-gray-200 dark:border-[var(--glass-border)] flex items-center justify-between bg-gray-50 dark:bg-[#171611]">
                            <h3 className="text-xl font-bold text-[var(--text-primary)] flex items-center gap-2">
                                <Settings className="w-5 h-5 text-[var(--text-secondary)]" /> Configuration
                            </h3>
                            <button
                                onClick={() => setIsSettingsOpen(false)}
                                className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-white/10 transition-colors"
                            >
                                <X className="w-5 h-5 text-[var(--text-secondary)]" />
                            </button>
                        </div>

                        <div className="p-6 space-y-6">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-[var(--text-secondary)]">Allocation Percentage (%)</label>
                                <input
                                    type="number"
                                    min="0"
                                    max="100"
                                    value={tempConfig.allocationPercentage}
                                    onChange={(e) => setTempConfig({ ...tempConfig, allocationPercentage: parseFloat(e.target.value) })}
                                    className="w-full px-4 py-2 rounded-lg bg-[var(--card-bg)] border border-[var(--glass-border)] text-sm focus:border-[#e8c559] outline-none transition-colors"
                                />
                                <p className="text-xs text-[var(--text-secondary)]">Percentage of building electricity attributed to company.</p>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium text-[var(--text-secondary)]">Emission Factor (kgCO2e/kWh)</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    value={tempConfig.emissionFactor}
                                    onChange={(e) => setTempConfig({ ...tempConfig, emissionFactor: parseFloat(e.target.value) })}
                                    className="w-full px-4 py-2 rounded-lg bg-[var(--card-bg)] border border-[var(--glass-border)] text-sm focus:border-[#e8c559] outline-none transition-colors"
                                />
                                <p className="text-xs text-[var(--text-secondary)]">Grid emission factor.</p>
                            </div>

                            <button
                                onClick={handleSaveSettings}
                                disabled={isSaving}
                                className="w-full py-2.5 rounded-lg bg-[#e8c559] hover:bg-[#dcb33e] text-[#171611] font-bold shadow-lg transition-all disabled:opacity-50"
                            >
                                {isSaving ? "Saving..." : "Save Configuration"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
