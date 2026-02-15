"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
    LayoutGrid,
    List,
    Plus,
    Search,
    Filter,
    FileDown,
    ChevronRight,
    Wallet,
    ArrowUpCircle,
    ArrowDownCircle,
    TrendingUp,
    Calendar as CalendarIcon,
    DollarSign,
    MoreHorizontal,
    Trash2,
    Briefcase,
    Coffee,
    Truck,
    Hotel,
    Paperclip,
    Box,
    ExternalLink,
    Pencil
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
    transportation: { label: "Transportation", icon: Truck, color: "#3b82f6" }, // blue-500
    fnb: { label: "Food & Beverage", icon: Coffee, color: "#f97316" }, // orange-500
    office_supplies: { label: "Office Supplies", icon: Box, color: "#a855f7" }, // purple-500
    accommodation: { label: "Accommodation", icon: Hotel, color: "#ec4899" }, // pink-500
    others: { label: "Others", icon: Briefcase, color: "#6b7280" }, // gray-500
    topup: { label: "Top Up / Income", icon: DollarSign, color: "#22c55e" }, // green-500
};

// --- TYPES ---

interface Transaction {
    id: string;
    transaction_date: string;
    description: string;
    category: string;
    amount: number;
    is_expense: boolean;
    proof_link: string | null;
    created_at: string;
    created_by: string;
}

export default function PettyCashPage() {
    const supabase = createClient();
    const { profile, isLoading: authLoading } = useAuth();

    // State
    const [transactions, setTransactions] = useState<Transaction[]>([]);
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
        transaction_date: new Date().toISOString().split('T')[0],
        description: "",
        category: "others",
        amount: 0,
        is_expense: true,
        proof_link: ""
    });

    // Access Control for Top Up
    const canTopUp = useMemo(() => {
        if (!profile) return false;
        return ['super_admin', 'ceo'].includes(profile.role) ||
            ['Office Manager', 'Head of Operations'].includes(profile.job_title || "") ||
            profile.department === 'Finance';
    }, [profile]);

    // --- FETCH DATA ---

    useEffect(() => {
        if (!authLoading) {
            fetchTransactions();
        }
    }, [authLoading]);

    const fetchTransactions = async () => {
        setIsLoading(true);
        try {
            const { data, error } = await supabase
                .from("petty_cash_transactions")
                .select("*")
                .order("transaction_date", { ascending: false })
                .order("created_at", { ascending: false });

            if (error) throw error;
            setTransactions(data || []);
        } catch (error) {
            console.error("Error fetching transactions:", error);
        } finally {
            setIsLoading(false);
        }
    };

    // --- HANDLERS ---

    const handleSaveTransaction = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!profile) return;

        try {
            // Force category to 'topup' if it's income
            const category = !formData.is_expense ? 'topup' : formData.category;

            const payload = {
                transaction_date: formData.transaction_date,
                description: formData.description,
                category: category,
                amount: formData.amount,
                is_expense: formData.is_expense,
                proof_link: formData.proof_link || null,
            };

            if (editingId) {
                // Update existing
                const { error } = await supabase
                    .from("petty_cash_transactions")
                    .update(payload)
                    .eq("id", editingId);

                if (error) throw error;
            } else {
                // Insert new
                const { error } = await supabase
                    .from("petty_cash_transactions")
                    .insert({
                        ...payload,
                        created_by: profile.id
                    });

                if (error) throw error;
            }

            closeModal();
            fetchTransactions();

        } catch (error) {
            console.error("Error saving transaction:", error);
            alert("Failed to save transaction. Check your permissions.");
        }
    };

    const handleEdit = (t: Transaction) => {
        setEditingId(t.id);
        setFormData({
            transaction_date: t.transaction_date,
            description: t.description,
            category: t.category,
            amount: t.amount,
            is_expense: t.is_expense,
            proof_link: t.proof_link || ""
        });
        setShowAddModal(true);
    };

    const closeModal = () => {
        setShowAddModal(false);
        setEditingId(null);
        setFormData({
            transaction_date: new Date().toISOString().split('T')[0],
            description: "",
            category: "others",
            amount: 0,
            is_expense: true,
            proof_link: ""
        });
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure you want to delete this transaction? This action cannot be undone.")) return;

        try {
            const { error } = await supabase
                .from("petty_cash_transactions")
                .delete()
                .eq("id", id);

            if (error) throw error;
            fetchTransactions();
        } catch (error) {
            console.error("Error deleting transaction:", error);
            alert("Failed to delete transaction. You may not have permission.");
        }
    };

    const handleExport = () => {
        const exportData = filteredTransactions.map(t => ({
            "Date": t.transaction_date,
            "Type": t.is_expense ? "Expense" : "Income",
            "Category": CATEGORY_CONFIG[t.category]?.label || t.category,
            "Description": t.description,
            "Amount": t.amount,
            "Proof Link": t.proof_link || "-"
        }));

        const workbook = XLSX.utils.book_new();
        const worksheet = XLSX.utils.json_to_sheet(exportData);
        XLSX.utils.book_append_sheet(workbook, worksheet, "Petty Cash");
        const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
        const data = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8' });
        saveAs(data, `petty_cash_${new Date().toISOString().split('T')[0]}.xlsx`);
    };

    // --- COMPUTED DATA ---

    const filteredTransactions = useMemo(() => {
        return transactions.filter(t => {
            const matchSearch = t.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                t.category.toLowerCase().includes(searchQuery.toLowerCase());
            const matchCategory = !filterCategory || t.category === filterCategory;

            // Date Range Filter
            const tDate = new Date(t.transaction_date);
            const startDate = dateRange.start ? new Date(dateRange.start) : null;
            const endDate = dateRange.end ? new Date(dateRange.end) : null;

            let matchDate = true;
            if (startDate) matchDate = matchDate && tDate >= startDate;
            if (endDate) matchDate = matchDate && tDate <= endDate;

            return matchSearch && matchCategory && matchDate;
        });
    }, [transactions, searchQuery, filterCategory, dateRange]);

    const stats = useMemo(() => {
        // Balance is calculating from ALL time, not just filtered view, to be accurate
        const totalIncome = transactions
            .filter(t => !t.is_expense)
            .reduce((sum, t) => sum + t.amount, 0);

        const totalExpense = transactions
            .filter(t => t.is_expense)
            .reduce((sum, t) => sum + t.amount, 0);

        // Filtered stats for the current view (likely current month)
        const viewIncome = filteredTransactions
            .filter(t => !t.is_expense)
            .reduce((sum, t) => sum + t.amount, 0);

        const viewExpense = filteredTransactions
            .filter(t => t.is_expense)
            .reduce((sum, t) => sum + t.amount, 0);

        return {
            balance: totalIncome - totalExpense,
            viewIncome,
            viewExpense
        };
    }, [transactions, filteredTransactions]);

    const chartData = useMemo(() => {
        // Daily Expenses
        const dailyMap = new Map<string, number>();
        filteredTransactions.filter(t => t.is_expense).forEach(t => {
            const date = t.transaction_date; // Assuming YYYY-MM-DD
            dailyMap.set(date, (dailyMap.get(date) || 0) + t.amount);
        });

        // Convert to array and sort by date
        const dailyData = Array.from(dailyMap.entries())
            .map(([date, amount]) => ({ date, amount }))
            .sort((a, b) => a.date.localeCompare(b.date));

        // Category Composition
        const catMap = new Map<string, number>();
        filteredTransactions.filter(t => t.is_expense).forEach(t => {
            catMap.set(t.category, (catMap.get(t.category) || 0) + t.amount);
        });

        const categoryData = Array.from(catMap.entries())
            .map(([name, value]) => ({
                name: CATEGORY_CONFIG[name]?.label || name,
                value,
                color: CATEGORY_CONFIG[name]?.color || "#6b7280"
            }));

        return { dailyData, categoryData };
    }, [filteredTransactions]);

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
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
                        <Wallet className="h-6 w-6 text-white" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2 mb-1 text-sm text-[var(--text-secondary)]">
                            <Link href="/dashboard" className="hover:text-[var(--text-primary)]">Dashboard</Link>
                            <ChevronRight className="h-4 w-4" />
                            <Link href="/dashboard/operational" className="hover:text-[var(--text-primary)]">Operational</Link>
                            <ChevronRight className="h-4 w-4" />
                            <span className="text-[var(--text-primary)]">Petty Cash</span>
                        </div>
                        <h1 className="text-2xl font-bold text-[var(--text-primary)]">Petty Cash Management</h1>
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
                    <button
                        onClick={() => setShowAddModal(true)}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#e8c559] text-[#171611] font-bold hover:bg-[#d4b44e] transition-colors shadow-lg shadow-amber-500/20"
                    >
                        <Plus className="h-4 w-4" />
                        Add Transaction
                    </button>
                </div>
            </div>

            {/* --- STATS CARDS --- */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Balance */}
                <div className="glass-panel p-6 rounded-2xl border border-blue-500/20 bg-blue-500/5 relative overflow-hidden shadow-sm">
                    <div className="absolute top-0 right-0 p-4 opacity-10">
                        <Wallet className="w-24 h-24 text-blue-500" />
                    </div>
                    <div className="relative z-10">
                        <p className="text-blue-600 dark:text-blue-400 text-sm font-bold uppercase tracking-wider mb-2">Current Balance</p>
                        <div className="flex items-baseline gap-2">
                            <span className="text-3xl font-black text-[var(--text-primary)]">{formatCurrency(stats.balance)}</span>
                        </div>
                        <p className="text-xs text-[var(--text-secondary)] mt-1">Lifetime calculation</p>
                    </div>
                </div>

                {/* Total Income (View) */}
                <div className="glass-panel p-6 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 relative overflow-hidden shadow-sm">
                    <div className="absolute top-0 right-0 p-4 opacity-10">
                        <ArrowDownCircle className="w-24 h-24 text-emerald-500" />
                    </div>
                    <div className="relative z-10">
                        <p className="text-emerald-600 dark:text-emerald-400 text-sm font-bold uppercase tracking-wider mb-2">Income (Period)</p>
                        <div className="flex items-baseline gap-2">
                            <span className="text-3xl font-black text-[var(--text-primary)]">{formatCurrency(stats.viewIncome)}</span>
                        </div>
                        <p className="text-xs text-[var(--text-secondary)] mt-1">Based on active filters</p>
                    </div>
                </div>

                {/* Total Expense (View) */}
                <div className="glass-panel p-6 rounded-2xl border border-rose-500/20 bg-rose-500/5 relative overflow-hidden shadow-sm">
                    <div className="absolute top-0 right-0 p-4 opacity-10">
                        <ArrowUpCircle className="w-24 h-24 text-rose-500" />
                    </div>
                    <div className="relative z-10">
                        <p className="text-rose-600 dark:text-rose-400 text-sm font-bold uppercase tracking-wider mb-2">Expense (Period)</p>
                        <div className="flex items-baseline gap-2">
                            <span className="text-3xl font-black text-[var(--text-primary)]">{formatCurrency(stats.viewExpense)}</span>
                        </div>
                        <p className="text-xs text-[var(--text-secondary)] mt-1">Based on active filters</p>
                    </div>
                </div>
            </div>

            {/* --- CHARTS --- */}
            {filteredTransactions.length > 0 && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Trend Chart */}
                    <div className="bg-white dark:bg-[#1c2120] rounded-2xl p-6 border border-[var(--glass-border)] shadow-sm">
                        <h3 className="text-lg font-bold text-[var(--text-primary)] mb-6">Expense Trend</h3>
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
                                    <Bar dataKey="amount" fill="#f97316" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Composition Chart */}
                    <div className="bg-white dark:bg-[#1c2120] rounded-2xl p-6 border border-[var(--glass-border)] shadow-sm">
                        <h3 className="text-lg font-bold text-[var(--text-primary)] mb-6">Expense By Category</h3>
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
                            placeholder="Search description..."
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
                                <th className="px-6 py-4 font-semibold">Proof</th>
                                <th className="px-6 py-4 font-semibold text-right">Amount</th>
                                <th className="px-6 py-4 font-semibold text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[var(--glass-border)]">
                            {filteredTransactions.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-8 text-center text-[var(--text-secondary)]">
                                        No transactions found.
                                    </td>
                                </tr>
                            ) : (
                                filteredTransactions.map(t => {
                                    const CategoryIcon = CATEGORY_CONFIG[t.category]?.icon || Box;
                                    return (
                                        <tr key={t.id} className="hover:bg-[var(--glass-bg)] transition-colors">
                                            <td className="px-6 py-4 text-[var(--text-secondary)] whitespace-nowrap">
                                                {new Date(t.transaction_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                                            </td>
                                            <td className="px-6 py-4 font-medium text-[var(--text-primary)]">
                                                {t.description || "-"}
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2">
                                                    <div className="p-1.5 rounded-lg" style={{ backgroundColor: `${CATEGORY_CONFIG[t.category]?.color}20` }}>
                                                        <CategoryIcon className="h-4 w-4" style={{ color: CATEGORY_CONFIG[t.category]?.color }} />
                                                    </div>
                                                    <span>{CATEGORY_CONFIG[t.category]?.label}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                {t.proof_link ? (
                                                    <a
                                                        href={t.proof_link}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="inline-flex items-center gap-1 text-blue-500 hover:text-blue-600 hover:underline"
                                                    >
                                                        Link <ExternalLink className="h-3 w-3" />
                                                    </a>
                                                ) : (
                                                    <span className="text-[var(--text-muted)]">-</span>
                                                )}
                                            </td>
                                            <td className={`px-6 py-4 text-right font-bold ${t.is_expense ? 'text-red-500' : 'text-emerald-500'}`}>
                                                {t.is_expense ? '-' : '+'}{formatCurrency(t.amount)}
                                            </td>
                                            <td className="px-6 py-4 text-right">

                                                <div className="flex items-center justify-end gap-1">
                                                    {/* Only Admin/CEO/Manager can edit/delete, OR created_by if we allowed it (but currrently RLS is restricted) */}
                                                    {canTopUp && (
                                                        <>
                                                            <button
                                                                onClick={() => handleEdit(t)}
                                                                className="text-gray-400 hover:text-[#e8c559] transition-colors p-2 rounded-lg hover:bg-[#e8c559]/10"
                                                            >
                                                                <Pencil className="h-4 w-4" />
                                                            </button>
                                                            <button
                                                                onClick={() => handleDelete(t.id)}
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
                            <h2 className="text-xl font-bold text-[var(--text-primary)]">{editingId ? 'Edit Transaction' : 'Add Transaction'}</h2>
                            <button onClick={closeModal} className="p-2 rounded-lg hover:bg-black/10 dark:hover:bg-white/10">
                                <Plus className="h-5 w-5 rotate-45" />
                            </button>
                        </div>

                        <form onSubmit={handleSaveTransaction} className="p-6 space-y-4">

                            {/* Type Toggle - Only visible if canTopUp */}
                            {canTopUp && (
                                <div className="flex p-1 bg-[var(--glass-bg)] border border-[var(--glass-border)] rounded-xl mb-4">
                                    <button
                                        type="button"
                                        onClick={() => setFormData({ ...formData, is_expense: true })}
                                        className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${formData.is_expense
                                            ? "bg-red-500 text-white shadow"
                                            : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                                            }`}
                                    >
                                        Expense
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setFormData({ ...formData, is_expense: false, category: 'topup' })}
                                        className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${!formData.is_expense
                                            ? "bg-emerald-500 text-white shadow"
                                            : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                                            }`}
                                    >
                                        Income / Top Up
                                    </button>
                                </div>
                            )}

                            <div>
                                <label className="block text-sm font-bold text-[var(--text-primary)] mb-1">Date *</label>
                                <input
                                    type="date"
                                    required
                                    value={formData.transaction_date}
                                    onChange={e => setFormData({ ...formData, transaction_date: e.target.value })}
                                    className="w-full px-4 py-2 rounded-xl border border-[var(--glass-border)] bg-[var(--glass-bg)] text-[var(--text-primary)]"
                                />
                            </div>

                            {/* Category - Hidden if Income */}
                            {formData.is_expense && (
                                <div>
                                    <label className="block text-sm font-bold text-[var(--text-primary)] mb-1">Category *</label>
                                    <select
                                        value={formData.category}
                                        onChange={e => setFormData({ ...formData, category: e.target.value })}
                                        className="w-full px-4 py-2 rounded-xl border border-[var(--glass-border)] bg-[var(--glass-bg)] text-[var(--text-primary)]"
                                    >
                                        {Object.entries(CATEGORY_CONFIG)
                                            .filter(([key]) => key !== 'topup')
                                            .map(([key, config]) => (
                                                <option key={key} value={key}>{config.label}</option>
                                            ))}
                                    </select>
                                </div>
                            )}

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
                                    placeholder={formData.is_expense ? "e.g. Taxi to Client Meeting" : "e.g. Petty Cash Top Up"}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-[var(--text-primary)] mb-1">Google Drive Proof Link</label>
                                <div className="flex items-center gap-2">
                                    <Paperclip className="h-4 w-4 text-[var(--text-secondary)]" />
                                    <input
                                        type="url"
                                        value={formData.proof_link}
                                        onChange={e => setFormData({ ...formData, proof_link: e.target.value })}
                                        className="w-full px-4 py-2 rounded-xl border border-[var(--glass-border)] bg-[var(--glass-bg)] text-[var(--text-primary)]"
                                        placeholder="https://drive.google.com/..."
                                    />
                                </div>
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
                                    Save Transaction
                                </button>
                            </div>

                        </form>
                    </div>
                </div>
            )}

        </div>
    );
}
