"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
    Plus,
    Search,
    FileDown,
    ChevronRight,
    Wrench,
    TrendingUp,
    CalendarClock,
    Trash2,
    Pencil,
    ExternalLink,
    Wifi,
    Zap,
    Wind,
    Droplets,
    Bug,
    Hammer,
    MoreHorizontal
} from "lucide-react";
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell,
    Legend
} from 'recharts';

// --- CONFIGURATION ---

const CATEGORY_CONFIG: Record<string, { label: string; icon: any; color: string }> = {
    ac_service: { label: "AC Service", icon: Wind, color: "#3b82f6" }, // blue-500
    internet_wifi: { label: "Internet & WiFi", icon: Wifi, color: "#8b5cf6" }, // violet-500
    cleaning_service: { label: "Cleaning Service", icon: Droplets, color: "#06b6d4" }, // cyan-500
    electrical: { label: "Electrical", icon: Zap, color: "#eab308" }, // yellow-500
    plumbing: { label: "Plumbing", icon: Droplets, color: "#3b82f6" }, // blue-500
    pest_control: { label: "Pest Control", icon: Bug, color: "#ef4444" }, // red-500
    general_repair: { label: "General Repair", icon: Hammer, color: "#f97316" }, // orange-500
    others: { label: "Others", icon: Wrench, color: "#6b7280" }, // gray-500
};

// --- TYPES ---

interface MaintenanceRecord {
    id: string;
    service_date: string;
    description: string;
    category: string;
    amount: number;
    vendor_name: string | null;
    next_service_date: string | null;
    proof_link: string | null;
    created_at: string;
    created_by: string;
}

export default function MaintenancePage() {
    const supabase = createClient();
    const { profile, isLoading: authLoading } = useAuth();

    // State
    const [records, setRecords] = useState<MaintenanceRecord[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [filterCategory, setFilterCategory] = useState<string>("");
    const [dateRange, setDateRange] = useState({
        start: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0], // Start of current month
        end: new Date().toISOString().split('T')[0] // Today
    });

    // Modal
    const [showAddModal, setShowAddModal] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [formData, setFormData] = useState({
        service_date: new Date().toISOString().split('T')[0],
        description: "",
        category: "general_repair",
        amount: 0,
        vendor_name: "",
        next_service_date: "",
        proof_link: ""
    });

    // Access Control
    const canManage = useMemo(() => {
        if (!profile) return false;
        return ['super_admin', 'ceo'].includes(profile.role) ||
            ['Office Manager', 'Head of Operations'].includes(profile.job_title || "") ||
            profile.department === 'Finance';
    }, [profile]);

    // --- FETCH DATA ---

    useEffect(() => {
        if (!authLoading) {
            fetchRecords();
        }
    }, [authLoading]);

    const fetchRecords = async () => {
        setIsLoading(true);
        try {
            const { data, error } = await supabase
                .from("maintenance_records")
                .select("*")
                .order("service_date", { ascending: false })
                .order("created_at", { ascending: false });

            if (error) throw error;
            setRecords(data || []);
        } catch (error) {
            console.error("Error fetching records:", error);
        } finally {
            setIsLoading(false);
        }
    };

    // --- HANDLERS ---

    const handleSaveRecord = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!profile) return;

        try {
            const payload = {
                service_date: formData.service_date,
                description: formData.description,
                category: formData.category,
                amount: formData.amount,
                vendor_name: formData.vendor_name || null,
                next_service_date: formData.next_service_date || null,
                proof_link: formData.proof_link || null,
            };

            if (editingId) {
                // Update
                const { error } = await supabase
                    .from("maintenance_records")
                    .update(payload)
                    .eq("id", editingId);

                if (error) throw error;
            } else {
                // Insert
                const { error } = await supabase
                    .from("maintenance_records")
                    .insert({
                        ...payload,
                        created_by: profile.id
                    });

                if (error) throw error;
            }

            closeModal();
            fetchRecords();

        } catch (error) {
            console.error("Error saving record:", error);
            alert("Failed to save record. Check your permissions.");
        }
    };

    const handleEdit = (r: MaintenanceRecord) => {
        setEditingId(r.id);
        setFormData({
            service_date: r.service_date,
            description: r.description,
            category: r.category,
            amount: r.amount,
            vendor_name: r.vendor_name || "",
            next_service_date: r.next_service_date || "",
            proof_link: r.proof_link || ""
        });
        setShowAddModal(true);
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure you want to delete this record? This action cannot be undone.")) return;

        try {
            const { error } = await supabase
                .from("maintenance_records")
                .delete()
                .eq("id", id);

            if (error) throw error;
            fetchRecords();
        } catch (error) {
            console.error("Error deleting record:", error);
            alert("Failed to delete record. You may not have permission.");
        }
    };

    const closeModal = () => {
        setShowAddModal(false);
        setEditingId(null);
        setFormData({
            service_date: new Date().toISOString().split('T')[0],
            description: "",
            category: "general_repair",
            amount: 0,
            vendor_name: "",
            next_service_date: "",
            proof_link: ""
        });
    };

    const handleExport = () => {
        const exportData = filteredRecords.map(r => ({
            "Date": r.service_date,
            "Category": CATEGORY_CONFIG[r.category]?.label || r.category,
            "Description": r.description,
            "Vendor": r.vendor_name || "-",
            "Amount": r.amount,
            "Next Service": r.next_service_date || "-",
            "Proof Link": r.proof_link || "-"
        }));

        const workbook = XLSX.utils.book_new();
        const worksheet = XLSX.utils.json_to_sheet(exportData);
        XLSX.utils.book_append_sheet(workbook, worksheet, "Maintenance_Log");
        const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
        const data = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8' });
        saveAs(data, `maintenance_log_${new Date().toISOString().split('T')[0]}.xlsx`);
    };

    // --- COMPUTED DATA ---

    const filteredRecords = useMemo(() => {
        return records.filter(r => {
            const matchSearch = r.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                r.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
                (r.vendor_name && r.vendor_name.toLowerCase().includes(searchQuery.toLowerCase()));
            const matchCategory = !filterCategory || r.category === filterCategory;

            // Date Range Filter
            const rDate = new Date(r.service_date);
            const startDate = dateRange.start ? new Date(dateRange.start) : null;
            const endDate = dateRange.end ? new Date(dateRange.end) : null;

            let matchDate = true;
            if (startDate) matchDate = matchDate && rDate >= startDate;
            if (endDate) matchDate = matchDate && rDate <= endDate;

            return matchSearch && matchCategory && matchDate;
        });
    }, [records, searchQuery, filterCategory, dateRange]);

    const stats = useMemo(() => {
        // Total Period Cost
        const totalPeriodCost = filteredRecords.reduce((sum, r) => sum + r.amount, 0);

        // YTD Cost (Year to Date)
        const currentYear = new Date().getFullYear();
        const ytdCost = records
            .filter(r => new Date(r.service_date).getFullYear() === currentYear)
            .reduce((sum, r) => sum + r.amount, 0);

        // Avg Monthly (YTD / distinct months found so far in current year or just 12? let's do simple Avg per active month)
        // A safer approach: Total YTD / (Current Month + 1)
        const currentMonthIndex = new Date().getMonth() + 1;
        const avgMonthlyCost = ytdCost / currentMonthIndex;

        return {
            totalPeriodCost,
            ytdCost,
            avgMonthlyCost
        };
    }, [records, filteredRecords]);

    const chartData = useMemo(() => {
        // Daily Cost Trend
        const dailyMap = new Map<string, number>();
        filteredRecords.forEach(r => {
            const date = r.service_date;
            dailyMap.set(date, (dailyMap.get(date) || 0) + r.amount);
        });

        // Convert to array and sort by date
        const dailyData = Array.from(dailyMap.entries())
            .map(([date, amount]) => ({ date, amount }))
            .sort((a, b) => a.date.localeCompare(b.date));

        // Category Composition
        const catMap = new Map<string, number>();
        filteredRecords.forEach(r => {
            catMap.set(r.category, (catMap.get(r.category) || 0) + r.amount);
        });

        const categoryData = Array.from(catMap.entries())
            .map(([name, value]) => ({
                name: CATEGORY_CONFIG[name]?.label || name,
                value,
                color: CATEGORY_CONFIG[name]?.color || "#6b7280"
            }));

        return { dailyData, categoryData };
    }, [filteredRecords]);

    // Formatter
    const formatCurrency = (val: number) => {
        return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(val);
    };

    if (authLoading || isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#e8c559]"></div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full space-y-6">

            {/* --- HEADER --- */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg shadow-amber-500/20">
                        <Wrench className="h-6 w-6 text-white" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2 mb-1 text-sm text-[var(--text-secondary)]">
                            <Link href="/dashboard" className="hover:text-[var(--text-primary)]">Dashboard</Link>
                            <ChevronRight className="h-4 w-4" />
                            <Link href="/dashboard/operational" className="hover:text-[var(--text-primary)]">Operational</Link>
                            <ChevronRight className="h-4 w-4" />
                            <span className="text-[var(--text-primary)]">Maintenance</span>
                        </div>
                        <h1 className="text-2xl font-bold text-[var(--text-primary)]">Maintenance Log</h1>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={handleExport}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl text-[var(--text-secondary)] hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                    >
                        <FileDown className="h-4 w-4" />
                        <span className="hidden sm:inline">Export</span>
                    </button>
                    {canManage && (
                        <button
                            onClick={() => setShowAddModal(true)}
                            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#e8c559] text-[#171611] font-bold hover:bg-[#d4b44e] transition-colors shadow-lg shadow-amber-500/20"
                        >
                            <Plus className="h-4 w-4" />
                            Add Record
                        </button>
                    )}
                </div>
            </div>

            {/* --- STATS CARDS (Silhouette Style) --- */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

                {/* Total Cost (Period) */}
                <div className="glass-panel p-6 rounded-2xl border border-rose-500/20 bg-rose-500/5 relative overflow-hidden shadow-sm">
                    <div className="absolute top-0 right-0 p-4 opacity-10">
                        <Wrench className="w-24 h-24 text-rose-500" />
                    </div>
                    <div className="relative z-10">
                        <p className="text-rose-600 dark:text-rose-400 text-sm font-bold uppercase tracking-wider mb-2">Total Cost (Period)</p>
                        <div className="flex items-baseline gap-2">
                            <span className="text-3xl font-black text-[var(--text-primary)]">{formatCurrency(stats.totalPeriodCost)}</span>
                        </div>
                        <p className="text-xs text-[var(--text-secondary)] mt-1">Based on active filters</p>
                    </div>
                </div>

                {/* YTD Cost */}
                <div className="glass-panel p-6 rounded-2xl border border-blue-500/20 bg-blue-500/5 relative overflow-hidden shadow-sm">
                    <div className="absolute top-0 right-0 p-4 opacity-10">
                        <CalendarClock className="w-24 h-24 text-blue-500" />
                    </div>
                    <div className="relative z-10">
                        <p className="text-blue-600 dark:text-blue-400 text-sm font-bold uppercase tracking-wider mb-2">YTD Cost ({new Date().getFullYear()})</p>
                        <div className="flex items-baseline gap-2">
                            <span className="text-3xl font-black text-[var(--text-primary)]">{formatCurrency(stats.ytdCost)}</span>
                        </div>
                        <p className="text-xs text-[var(--text-secondary)] mt-1">January 1st - Present</p>
                    </div>
                </div>

                {/* Avg Monthly */}
                <div className="glass-panel p-6 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 relative overflow-hidden shadow-sm">
                    <div className="absolute top-0 right-0 p-4 opacity-10">
                        <TrendingUp className="w-24 h-24 text-emerald-500" />
                    </div>
                    <div className="relative z-10">
                        <p className="text-emerald-600 dark:text-emerald-400 text-sm font-bold uppercase tracking-wider mb-2">Avg. Monthly Cost</p>
                        <div className="flex items-baseline gap-2">
                            <span className="text-3xl font-black text-[var(--text-primary)]">{formatCurrency(stats.avgMonthlyCost)}</span>
                        </div>
                        <p className="text-xs text-[var(--text-secondary)] mt-1">Based on YTD data</p>
                    </div>
                </div>

            </div>

            {/* --- CHARTS --- */}
            {filteredRecords.length > 0 && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Trend Chart */}
                    <div className="bg-white dark:bg-[#1c2120] rounded-2xl p-6 border border-[var(--glass-border)] shadow-sm">
                        <h3 className="text-lg font-bold text-[var(--text-primary)] mb-6">Cost Trend</h3>
                        <div className="h-[300px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={chartData.dailyData}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--glass-border)" />
                                    <XAxis
                                        dataKey="date"
                                        tick={{ fontSize: 12, fill: 'var(--text-secondary)' }}
                                        tickLine={false}
                                        axisLine={false}
                                        tickFormatter={(val) => new Date(val).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })}
                                    />
                                    <YAxis
                                        tick={{ fontSize: 12, fill: 'var(--text-secondary)' }}
                                        tickLine={false}
                                        axisLine={false}
                                        tickFormatter={(val) => `Rp${val / 1000}k`}
                                    />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: 'var(--glass-bg)', borderRadius: '12px', border: '1px solid var(--glass-border)', color: 'var(--text-primary)' }}
                                        formatter={(val: any) => [formatCurrency(Number(val || 0)), 'Amount'] as [string, string]}
                                        labelFormatter={(label) => new Date(label).toLocaleDateString('id-ID', { dateStyle: 'full' })}
                                    />
                                    <Bar dataKey="amount" fill="#f43f5e" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Composition Chart */}
                    <div className="bg-white dark:bg-[#1c2120] rounded-2xl p-6 border border-[var(--glass-border)] shadow-sm">
                        <h3 className="text-lg font-bold text-[var(--text-primary)] mb-6">Cost By Category</h3>
                        <div className="h-[300px] w-full flex items-center justify-center">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={chartData.categoryData}
                                        innerRadius={60}
                                        outerRadius={100}
                                        paddingAngle={5}
                                        dataKey="value"
                                    >
                                        {chartData.categoryData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                        ))}
                                    </Pie>
                                    <Tooltip
                                        contentStyle={{ backgroundColor: 'var(--glass-bg)', borderRadius: '12px', border: '1px solid var(--glass-border)', color: 'var(--text-primary)' }}
                                        formatter={(val: any) => formatCurrency(Number(val || 0))}
                                    />
                                    <Legend
                                        verticalAlign="bottom"
                                        height={36}
                                        iconType="circle"
                                        formatter={(val) => <span style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>{val}</span>}
                                    />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>
            )}


            {/* --- CONTROLS --- */}
            <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white dark:bg-[#1c2120] p-4 rounded-2xl border border-[var(--glass-border)]">
                <div className="flex flex-wrap flex-1 gap-3 w-full">
                    {/* Search */}
                    <div className="relative flex-1 min-w-[200px]">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-muted)]" />
                        <input
                            type="text"
                            placeholder="Search description, vendor..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 rounded-xl border border-[var(--glass-border)] bg-[var(--glass-bg)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[#e8c559]"
                        />
                    </div>

                    {/* Category Filter */}
                    <select
                        value={filterCategory}
                        onChange={(e) => setFilterCategory(e.target.value)}
                        className="px-4 py-2 rounded-xl border border-[var(--glass-border)] bg-[var(--glass-bg)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[#e8c559]"
                    >
                        <option value="">All Categories</option>
                        {Object.entries(CATEGORY_CONFIG).map(([key, config]) => (
                            <option key={key} value={key}>{config.label}</option>
                        ))}
                    </select>

                    {/* Date Range */}
                    <div className="flex items-center gap-2">
                        <input
                            type="date"
                            value={dateRange.start}
                            onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                            className="px-4 py-2 rounded-xl border border-[var(--glass-border)] bg-[var(--glass-bg)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[#e8c559]"
                        />
                        <span className="text-[var(--text-secondary)]">-</span>
                        <input
                            type="date"
                            value={dateRange.end}
                            onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                            className="px-4 py-2 rounded-xl border border-[var(--glass-border)] bg-[var(--glass-bg)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[#e8c559]"
                        />
                    </div>
                </div>
            </div>

            {/* --- TABLE --- */}

            <div className="bg-white dark:bg-[#1c2120] rounded-2xl border border-[var(--glass-border)] overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-[var(--glass-bg)] border-b border-[var(--glass-border)] text-[var(--text-secondary)]">
                            <tr>
                                <th className="px-6 py-4 font-semibold">Date</th>
                                <th className="px-6 py-4 font-semibold">Description</th>
                                <th className="px-6 py-4 font-semibold">Category</th>
                                <th className="px-6 py-4 font-semibold">Vendor</th>
                                <th className="px-6 py-4 font-semibold text-right">Amount</th>
                                <th className="px-6 py-4 font-semibold text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[var(--glass-border)]">
                            {filteredRecords.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-8 text-center text-[var(--text-secondary)]">
                                        No maintenance records found.
                                    </td>
                                </tr>
                            ) : (
                                filteredRecords.map(r => {
                                    const CategoryIcon = CATEGORY_CONFIG[r.category]?.icon || Wrench;
                                    return (
                                        <tr key={r.id} className="hover:bg-[var(--glass-bg)] transition-colors">
                                            <td className="px-6 py-4 text-[var(--text-secondary)] whitespace-nowrap">
                                                <div>{new Date(r.service_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</div>
                                                {r.next_service_date && (
                                                    <div className="text-xs text-[var(--text-muted)] mt-1 flex items-center gap-1">
                                                        Next: {new Date(r.next_service_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                                                    </div>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 font-medium text-[var(--text-primary)]">
                                                {r.description}
                                                {r.proof_link && (
                                                    <a
                                                        href={r.proof_link}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="block mt-1 text-xs text-blue-500 hover:underline flex items-center gap-1"
                                                    >
                                                        <ExternalLink className="h-3 w-3" /> View Proof
                                                    </a>
                                                )}
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2">
                                                    <div className="p-1.5 rounded-lg" style={{ backgroundColor: `${CATEGORY_CONFIG[r.category]?.color}20` }}>
                                                        <CategoryIcon className="h-4 w-4" style={{ color: CATEGORY_CONFIG[r.category]?.color }} />
                                                    </div>
                                                    <span>{CATEGORY_CONFIG[r.category]?.label}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-[var(--text-secondary)]">
                                                {r.vendor_name || "-"}
                                            </td>
                                            <td className="px-6 py-4 text-right font-bold text-rose-500">
                                                {formatCurrency(r.amount)}
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex items-center justify-end gap-1">
                                                    {canManage && (
                                                        <>
                                                            <button
                                                                onClick={() => handleEdit(r)}
                                                                className="text-gray-400 hover:text-[#e8c559] transition-colors p-2 rounded-lg hover:bg-[#e8c559]/10"
                                                            >
                                                                <Pencil className="h-4 w-4" />
                                                            </button>
                                                            <button
                                                                onClick={() => handleDelete(r.id)}
                                                                className="text-gray-400 hover:text-red-500 transition-colors p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/10"
                                                            >
                                                                <Trash2 className="h-4 w-4" />
                                                            </button>
                                                        </>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* --- ADD MODAL --- */}
            {showAddModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="w-full max-w-lg bg-white dark:bg-[#1c2120] rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between p-6 border-b border-[var(--glass-border)]">
                            <h2 className="text-xl font-bold text-[var(--text-primary)]">{editingId ? 'Edit Record' : 'Add Maintenance Record'}</h2>
                            <button onClick={closeModal} className="p-2 rounded-lg hover:bg-black/10 dark:hover:bg-white/10">
                                <Plus className="h-5 w-5 rotate-45" />
                            </button>
                        </div>

                        <form onSubmit={handleSaveRecord} className="p-6 space-y-4">

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-bold text-[var(--text-primary)] mb-1">Service Date *</label>
                                    <input
                                        type="date"
                                        required
                                        value={formData.service_date}
                                        onChange={e => setFormData({ ...formData, service_date: e.target.value })}
                                        className="w-full px-4 py-2 rounded-xl border border-[var(--glass-border)] bg-[var(--glass-bg)] text-[var(--text-primary)]"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-[var(--text-primary)] mb-1">Next Service (Opt)</label>
                                    <input
                                        type="date"
                                        value={formData.next_service_date}
                                        onChange={e => setFormData({ ...formData, next_service_date: e.target.value })}
                                        className="w-full px-4 py-2 rounded-xl border border-[var(--glass-border)] bg-[var(--glass-bg)] text-[var(--text-primary)]"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-[var(--text-primary)] mb-1">Category *</label>
                                <select
                                    value={formData.category}
                                    onChange={e => setFormData({ ...formData, category: e.target.value })}
                                    className="w-full px-4 py-2 rounded-xl border border-[var(--glass-border)] bg-[var(--glass-bg)] text-[var(--text-primary)]"
                                >
                                    {Object.entries(CATEGORY_CONFIG).map(([key, config]) => (
                                        <option key={key} value={key}>{config.label}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-[var(--text-primary)] mb-1">Vendor / Provider</label>
                                <input
                                    type="text"
                                    value={formData.vendor_name}
                                    onChange={e => setFormData({ ...formData, vendor_name: e.target.value })}
                                    className="w-full px-4 py-2 rounded-xl border border-[var(--glass-border)] bg-[var(--glass-bg)] text-[var(--text-primary)]"
                                    placeholder="e.g. PT. Cool Air, John Doe"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-[var(--text-primary)] mb-1">Amount (IDR) *</label>
                                <input
                                    type="number"
                                    required
                                    min="1"
                                    value={formData.amount || ""}
                                    onChange={e => setFormData({ ...formData, amount: Number(e.target.value) })}
                                    className="w-full px-4 py-2 rounded-xl border border-[var(--glass-border)] bg-[var(--glass-bg)] text-[var(--text-primary)]"
                                />
                                {formData.amount > 0 && (
                                    <p className="text-xs text-[#e8c559] mt-1 font-mono">
                                        {formatCurrency(formData.amount)}
                                    </p>
                                )}
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-[var(--text-primary)] mb-1">Description *</label>
                                <textarea
                                    required
                                    rows={3}
                                    value={formData.description}
                                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                                    className="w-full px-4 py-2 rounded-xl border border-[var(--glass-border)] bg-[var(--glass-bg)] text-[var(--text-primary)] resize-none"
                                    placeholder="e.g. Regular AC cleaning for Meeting Room"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-[var(--text-primary)] mb-1">Proof / Invoice Link</label>
                                <input
                                    type="url"
                                    value={formData.proof_link}
                                    onChange={e => setFormData({ ...formData, proof_link: e.target.value })}
                                    className="w-full px-4 py-2 rounded-xl border border-[var(--glass-border)] bg-[var(--glass-bg)] text-[var(--text-primary)]"
                                    placeholder="https://"
                                />
                            </div>

                            <div className="flex justify-end gap-3 pt-4 border-t border-[var(--glass-border)]">
                                <button
                                    type="button"
                                    onClick={closeModal}
                                    className="px-4 py-2 rounded-xl text-[var(--text-secondary)] hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-6 py-2 rounded-xl bg-[#e8c559] text-[#171611] font-bold hover:bg-[#d4b44e] transition-colors"
                                >
                                    {editingId ? 'Update Record' : 'Save Record'}
                                </button>
                            </div>

                        </form>
                    </div>
                </div>
            )}

        </div>
    );
}
