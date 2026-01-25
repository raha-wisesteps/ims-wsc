"use client";

import { useState } from "react";
import Link from "next/link";
import {
    Wallet,
    Wrench,
    TrendingUp,
    PieChart,
    AlertCircle,
    ArrowRight,
    LayoutDashboard,
    DollarSign,
    CreditCard,
    Box,
    ShieldAlert
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

// Expense categories
const EXPENSE_CATEGORIES = [
    { id: "supplies", label: "ATK & Supplies", icon: "📎", color: "text-blue-500", bg: "bg-blue-500" },
    { id: "transport", label: "Transport", icon: "🚗", color: "text-amber-500", bg: "bg-amber-500" },
    { id: "meals", label: "Konsumsi", icon: "🍽️", color: "text-emerald-500", bg: "bg-emerald-500" },
    { id: "utilities", label: "Utilitas", icon: "💡", color: "text-purple-500", bg: "bg-purple-500" },
    { id: "maintenance", label: "Maintenance", icon: "🔧", color: "text-rose-500", bg: "bg-rose-500" },
    { id: "other", label: "Lainnya", icon: "📦", color: "text-gray-500", bg: "bg-gray-500" },
];

// Mock data
const mockStats = {
    currentBalance: 3250000,
    initialBalance: 5000000,
    totalSpent: 1750000,
    monthlyBudget: 5000000,
    lastTopUp: "2024-12-01",
    monthlyExpenses: [
        { month: "Jul", amount: 1850000 },
        { month: "Aug", amount: 2100000 },
        { month: "Sep", amount: 1450000 },
        { month: "Oct", amount: 2300000 },
        { month: "Nov", amount: 1980000 },
        { month: "Dec", amount: 1750000 },
    ],
    expensesByCategory: [
        { category: "supplies", amount: 450000, percentage: 26 },
        { category: "transport", amount: 380000, percentage: 22 },
        { category: "meals", amount: 520000, percentage: 30 },
        { category: "utilities", amount: 200000, percentage: 11 },
        { category: "maintenance", amount: 150000, percentage: 9 },
        { category: "other", amount: 50000, percentage: 2 },
    ],
    recentTransactions: [
        { id: "1", date: "2024-12-20", description: "Beli ATK - Kertas A4 & Pulpen", category: "supplies", amount: 125000, staff: "Eva Wijaya" },
        { id: "2", date: "2024-12-19", description: "Grab ke Bank BCA", category: "transport", amount: 45000, staff: "Budi Santoso" },
        { id: "3", date: "2024-12-18", description: "Lunch Meeting - Client PT ABC", category: "meals", amount: 350000, staff: "Andi Pratama" },
        { id: "4", date: "2024-12-17", description: "Service AC Ruang Meeting", category: "maintenance", amount: 150000, staff: "David Chen" },
        { id: "5", date: "2024-12-15", description: "Beli Tinta Printer", category: "supplies", amount: 180000, staff: "Citra Lestari" },
    ],
};

// Format currency
const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
        minimumFractionDigits: 0,
    }).format(amount);
};

export default function OperationalDashboard() {
    const { canAccessOperational, isLoading } = useAuth();
    const [selectedPeriod, setSelectedPeriod] = useState("dec-2024");

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[50vh]">
                <div className="w-8 h-8 border-4 border-[var(--primary)] border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    if (!canAccessOperational) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
                <div className="p-4 rounded-full bg-rose-500/10">
                    <ShieldAlert className="w-12 h-12 text-rose-500" />
                </div>
                <h2 className="text-xl font-bold text-[var(--text-primary)]">Access Denied</h2>
                <p className="text-[var(--text-secondary)] text-center max-w-md">
                    Anda tidak memiliki akses ke halaman Operational. Hubungi Admin untuk mendapatkan akses Office Manager.
                </p>
                <Link href="/dashboard" className="px-4 py-2 bg-[#e8c559] text-black rounded-lg font-bold hover:bg-[#d6b54e] transition-colors">
                    Kembali ke Dashboard
                </Link>
            </div>
        );
    }

    const spentPercentage = (mockStats.totalSpent / mockStats.initialBalance) * 100;
    const getCategoryConfig = (id: string) => EXPENSE_CATEGORIES.find(c => c.id === id);

    return (
        <div className="space-y-8 pb-20">
            {/* Header */}
            <header className="flex flex-col gap-4 md:flex-row md:items-end justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#3f545f] to-[#5f788e] dark:from-[#e8c559] dark:to-[#dcb33e] flex items-center justify-center">
                        <Wallet className="w-6 h-6 text-white dark:text-[#171611]" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-[var(--text-primary)]">Operational</h1>
                        <p className="text-sm text-[var(--text-secondary)]">Petty Cash & Office Management</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <select
                        value={selectedPeriod}
                        onChange={(e) => setSelectedPeriod(e.target.value)}
                        className="px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:border-[#e8c559] outline-none"
                    >
                        <option value="dec-2024">December 2024</option>
                        <option value="nov-2024">November 2024</option>
                        <option value="oct-2024">October 2024</option>
                    </select>
                </div>
            </header>

            {/* Overview Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Current Balance */}
                <div className="glass-panel p-5 rounded-xl border-l-4 border-[#e8c559]">
                    <div className="flex justify-between items-start mb-2">
                        <p className="text-xs text-gray-500 uppercase tracking-wider">Current Balance</p>
                        <Wallet className="w-4 h-4 text-[#e8c559]" />
                    </div>
                    <p className="text-3xl font-black text-white">{formatCurrency(mockStats.currentBalance)}</p>
                    <div className="mt-3">
                        <div className="flex justify-between text-xs mb-1">
                            <span className="text-gray-400">Used</span>
                            <span className="text-white font-bold">{spentPercentage.toFixed(0)}%</span>
                        </div>
                        <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
                            <div
                                className="h-full rounded-full bg-gradient-to-r from-[#e8c559] to-[#b89530]"
                                style={{ width: `${spentPercentage}%` }}
                            />
                        </div>
                    </div>
                </div>

                {/* Total Spent */}
                <div className="glass-panel p-5 rounded-xl border-l-4 border-rose-500">
                    <div className="flex justify-between items-start mb-2">
                        <p className="text-xs text-gray-500 uppercase tracking-wider">Total Spent</p>
                        <CreditCard className="w-4 h-4 text-rose-500" />
                    </div>
                    <p className="text-3xl font-black text-white">{formatCurrency(mockStats.totalSpent)}</p>
                    <p className="text-xs text-gray-400 mt-1">From initial {formatCurrency(mockStats.initialBalance)}</p>
                </div>

                {/* Monthly Budget */}
                <div className="glass-panel p-5 rounded-xl border-l-4 border-emerald-500">
                    <div className="flex justify-between items-start mb-2">
                        <p className="text-xs text-gray-500 uppercase tracking-wider">Monthly Budget</p>
                        <DollarSign className="w-4 h-4 text-emerald-500" />
                    </div>
                    <p className="text-3xl font-black text-white">{formatCurrency(mockStats.monthlyBudget)}</p>
                    <p className="text-xs text-emerald-400 mt-1 flex items-center gap-1">
                        ✓ Within Budget
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Main Content: Quick Actions & Charts */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Quick Actions Group */}
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <LayoutDashboard className="w-5 h-5 text-[#e8c559]" /> Quick Actions
                    </h2>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        <Link
                            href="/dashboard/operational/petty-cash"
                            className="glass-panel p-6 rounded-xl border border-white/10 hover:border-[#e8c559] group transition-all"
                        >
                            <div className="flex items-center gap-4 mb-4">
                                <div className="p-3 rounded-full bg-[#e8c559]/20 text-[#e8c559]">
                                    <Wallet className="w-6 h-6" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-lg text-white group-hover:text-[#e8c559] transition-colors">Petty Cash</h3>
                                    <p className="text-sm text-gray-400">Manage Expenses</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-[#e8c559] font-medium">
                                Input Transaction <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                            </div>
                        </Link>

                        <Link
                            href="/dashboard/operational/maintenance"
                            className="glass-panel p-6 rounded-xl border border-white/10 hover:border-blue-500 group transition-all"
                        >
                            <div className="flex items-center gap-4 mb-4">
                                <div className="p-3 rounded-full bg-blue-500/20 text-blue-500">
                                    <Wrench className="w-6 h-6" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-lg text-white group-hover:text-blue-500 transition-colors">Maintenance</h3>
                                    <p className="text-sm text-gray-400">Office Repair Log</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-blue-500 font-medium">
                                Schedule Repair <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                            </div>
                        </Link>

                        <Link
                            href="/dashboard/operational/asset-management"
                            className="glass-panel p-6 rounded-xl border border-white/10 hover:border-purple-500 group transition-all"
                        >
                            <div className="flex items-center gap-4 mb-4">
                                <div className="p-3 rounded-full bg-purple-500/20 text-purple-500">
                                    <Box className="w-6 h-6" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-lg text-white group-hover:text-purple-500 transition-colors">Assets</h3>
                                    <p className="text-sm text-gray-400">Track Inventory</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-purple-500 font-medium">
                                Manage Assets <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                            </div>
                        </Link>
                    </div>

                    {/* Detailed Analysis Section */}
                    <div className="glass-panel p-6 rounded-xl border border-white/10">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="font-bold text-white">Expense Analysis</h3>
                            <Link href="/dashboard/operational/petty-cash" className="text-xs text-[#e8c559] hover:underline">
                                Full Report →
                            </Link>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            {/* Monthly Trend */}
                            <div>
                                <h4 className="text-sm font-semibold text-gray-400 mb-4 uppercase tracking-wider flex items-center gap-2">
                                    <TrendingUp className="w-4 h-4" /> Monthly Trend
                                </h4>
                                <div className="space-y-3">
                                    {mockStats.monthlyExpenses.map((item) => (
                                        <div key={item.month} className="flex items-center gap-4">
                                            <span className="w-8 text-xs text-gray-500">{item.month}</span>
                                            <div className="flex-1 h-3 bg-white/5 rounded-full overflow-hidden relative">
                                                <div
                                                    className={`h-full rounded-full ${item.month === "Dec" ? "bg-gradient-to-r from-[#e8c559] to-[#b89530]" : "bg-gray-600"}`}
                                                    style={{ width: `${(item.amount / 2500000) * 100}%` }}
                                                />
                                            </div>
                                            <span className="text-xs text-gray-400 w-20 text-right">{formatCurrency(item.amount)}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Expense Composition */}
                            <div>
                                <h4 className="text-sm font-semibold text-gray-400 mb-4 uppercase tracking-wider flex items-center gap-2">
                                    <PieChart className="w-4 h-4" /> By Category
                                </h4>
                                <div className="space-y-3">
                                    {mockStats.expensesByCategory.map((item) => {
                                        const config = getCategoryConfig(item.category);
                                        return (
                                            <div key={item.category} className="flex items-center gap-4">
                                                <div className="flex items-center gap-2 w-28">
                                                    <span className="text-xs">{config?.icon}</span>
                                                    <span className="text-xs text-gray-300 truncate">{config?.label}</span>
                                                </div>
                                                <div className="flex-1 h-2 bg-white/5 rounded-full overflow-hidden">
                                                    <div
                                                        className={`h-full rounded-full ${config?.bg}`}
                                                        style={{ width: `${item.percentage}%` }}
                                                    />
                                                </div>
                                                <span className="text-xs text-gray-500 w-12 text-right">{item.percentage}%</span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Recent Transactions Table */}
                    <div className="glass-panel rounded-xl overflow-hidden border border-white/10">
                        <div className="p-4 border-b border-white/10 bg-white/5">
                            <h3 className="font-bold text-white">Recent Transactions</h3>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="text-left text-gray-400 border-b border-white/10">
                                        <th className="p-4 font-medium">Date</th>
                                        <th className="p-4 font-medium">Description</th>
                                        <th className="p-4 font-medium">Category</th>
                                        <th className="p-4 font-medium text-right">Amount</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {mockStats.recentTransactions.map((tx) => {
                                        const config = getCategoryConfig(tx.category);
                                        return (
                                            <tr key={tx.id} className="hover:bg-white/5 transition-colors">
                                                <td className="p-4 text-gray-400">
                                                    {new Date(tx.date).toLocaleDateString("id-ID", { day: "numeric", month: "short" })}
                                                </td>
                                                <td className="p-4 text-white">
                                                    <div className="flex flex-col">
                                                        <span>{tx.description}</span>
                                                        <span className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                                                            👤 {tx.staff}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="p-4">
                                                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-white/5 ${config?.color}`}>
                                                        {config?.icon} {config?.label}
                                                    </span>
                                                </td>
                                                <td className="p-4 text-right font-medium text-rose-400">
                                                    -{formatCurrency(tx.amount)}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                {/* Right Sidebar */}
                <div className="space-y-6">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <AlertCircle className="w-5 h-5 text-[#e8c559]" /> Guidelines
                    </h2>

                    {/* Tips Card */}
                    <div className="glass-panel p-6 rounded-xl bg-gradient-to-b from-[#e8c559]/10 to-transparent border border-[#e8c559]/20">
                        <h3 className="font-bold text-[#e8c559] mb-4">💡 Management Tips</h3>
                        <div className="space-y-4">
                            <div className="flex gap-3">
                                <div className="mt-1"><span className="text-xl">🧾</span></div>
                                <div>
                                    <p className="text-sm text-white font-bold">Always Keep Receipts</p>
                                    <p className="text-xs text-gray-400">Upload foto struk segera setelah transaksi dilakukan.</p>
                                </div>
                            </div>
                            <div className="flex gap-3">
                                <div className="mt-1"><span className="text-xl">⚠️</span></div>
                                <div>
                                    <p className="text-sm text-white font-bold">Low Balance Alert</p>
                                    <p className="text-xs text-gray-400">Segera request top-up saat saldo di bawah Rp 1.000.000.</p>
                                </div>
                            </div>
                            <div className="flex gap-3">
                                <div className="mt-1"><span className="text-xl">🔍</span></div>
                                <div>
                                    <p className="text-sm text-white font-bold">Weekly Audit</p>
                                    <p className="text-xs text-gray-400">Lakukan pengecekan saldo fisik setiap hari Jumat.</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Budget Status Mini-Card */}
                    <div className="glass-panel p-6 rounded-xl border border-white/10">
                        <h3 className="font-bold text-white mb-4">Expenses by Staff</h3>
                        <div className="space-y-3">
                            {/* Mock staff spending similar to Top Travelers */}
                            {[
                                { name: "Andi Pratama", amount: 850000 },
                                { name: "Citra Lestari", amount: 420000 },
                                { name: "David Chen", amount: 350000 }
                            ].map((s, i) => (
                                <div key={i} className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-xs font-bold text-gray-300">
                                            {s.name.split(" ").map(n => n[0]).join("")}
                                        </div>
                                        <span className="text-sm text-gray-300">{s.name}</span>
                                    </div>
                                    <span className="text-sm font-medium text-white">{formatCurrency(s.amount)}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
