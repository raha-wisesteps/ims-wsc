"use client";

import { useState } from "react";
import Link from "next/link";

// Expense categories
const EXPENSE_CATEGORIES = [
    { id: "supplies", label: "ATK & Supplies", icon: "📎", color: "bg-blue-500" },
    { id: "transport", label: "Transport", icon: "🚗", color: "bg-amber-500" },
    { id: "meals", label: "Konsumsi", icon: "🍽️", color: "bg-emerald-500" },
    { id: "utilities", label: "Utilitas", icon: "💡", color: "bg-purple-500" },
    { id: "maintenance", label: "Maintenance", icon: "🔧", color: "bg-rose-500" },
    { id: "other", label: "Lainnya", icon: "📦", color: "bg-gray-500" },
];

interface Transaction {
    id: string;
    date: string;
    description: string;
    category: string;
    amount: number;
    staff: string;
    receipt?: string;
    type: "expense" | "topup";
}

// Mock transactions
const mockTransactions: Transaction[] = [
    { id: "1", date: "2024-12-20", description: "Beli ATK - Kertas A4 & Pulpen", category: "supplies", amount: 125000, staff: "Eva Wijaya", type: "expense" },
    { id: "2", date: "2024-12-19", description: "Grab ke Bank BCA", category: "transport", amount: 45000, staff: "Budi Santoso", type: "expense" },
    { id: "3", date: "2024-12-18", description: "Lunch Meeting - Client PT ABC", category: "meals", amount: 350000, staff: "Andi Pratama", type: "expense" },
    { id: "4", date: "2024-12-17", description: "Service AC Ruang Meeting", category: "maintenance", amount: 150000, staff: "David Chen", type: "expense" },
    { id: "5", date: "2024-12-15", description: "Beli Tinta Printer", category: "supplies", amount: 180000, staff: "Citra Lestari", type: "expense" },
    { id: "6", date: "2024-12-15", description: "Parkir - Visit Client", category: "transport", amount: 25000, staff: "Andi Pratama", type: "expense" },
    { id: "7", date: "2024-12-14", description: "Snack Meeting Internal", category: "meals", amount: 85000, staff: "Eva Wijaya", type: "expense" },
    { id: "8", date: "2024-12-13", description: "Beli Tisu & Sabun", category: "supplies", amount: 75000, staff: "Budi Santoso", type: "expense" },
    { id: "9", date: "2024-12-12", description: "Bensin Motor Kurir", category: "transport", amount: 50000, staff: "David Chen", type: "expense" },
    { id: "10", date: "2024-12-10", description: "Service Printer", category: "maintenance", amount: 200000, staff: "Citra Lestari", type: "expense" },
    { id: "11", date: "2024-12-01", description: "Top Up Petty Cash", category: "topup", amount: 5000000, staff: "Admin", type: "topup" },
];

// Format currency
const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
        minimumFractionDigits: 0,
    }).format(amount);
};

export default function PettyCashPage() {
    const [showAddModal, setShowAddModal] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState("all");
    const [searchQuery, setSearchQuery] = useState("");
    const [newExpense, setNewExpense] = useState({
        date: "",
        description: "",
        category: "supplies",
        amount: "",
    });

    // Calculate stats
    const totalTopUp = mockTransactions.filter(t => t.type === "topup").reduce((sum, t) => sum + t.amount, 0);
    const totalExpense = mockTransactions.filter(t => t.type === "expense").reduce((sum, t) => sum + t.amount, 0);
    const currentBalance = totalTopUp - totalExpense;

    // Filter transactions
    const filteredTransactions = mockTransactions.filter((tx) => {
        const matchCategory = selectedCategory === "all" || tx.category === selectedCategory || (selectedCategory === "topup" && tx.type === "topup");
        const matchSearch = tx.description.toLowerCase().includes(searchQuery.toLowerCase()) || tx.staff.toLowerCase().includes(searchQuery.toLowerCase());
        return matchCategory && matchSearch;
    });

    const getCategoryConfig = (id: string) => EXPENSE_CATEGORIES.find(c => c.id === id);

    const handleAddExpense = () => {
        // In real app, save to database
        setShowAddModal(false);
        setNewExpense({ date: "", description: "", category: "supplies", amount: "" });
    };

    return (
        <div className="flex flex-col h-full overflow-auto">
            {/* Page Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                <div>
                    <div className="flex items-center gap-2 text-sm text-[var(--text-muted)] mb-1">
                        <Link href="/dashboard/operational" className="hover:text-[#e8c559]">Operasional</Link>
                        <span>/</span>
                        <span className="text-[var(--text-primary)]">Petty Cash</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <span className="text-3xl">💵</span>
                        <h2 className="text-3xl font-bold tracking-tight text-[var(--text-primary)]">Petty Cash</h2>
                    </div>
                    <p className="text-[var(--text-secondary)] text-sm mt-1">Kelola dan catat pengeluaran petty cash kantor.</p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setShowAddModal(true)}
                        className="h-10 px-5 rounded-lg bg-[#e8c559] hover:bg-[#dcb33e] text-[#171611] text-sm font-bold transition-colors flex items-center gap-2"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />
                        </svg>
                        Catat Pengeluaran
                    </button>
                </div>
            </div>

            {/* Balance Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="glass-panel p-5 rounded-xl bg-gradient-to-br from-[#e8c559]/10 to-[#b89530]/10 border-[#e8c559]/30">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-xs text-[var(--text-muted)]">Saldo Saat Ini</span>
                        <span className="text-lg">💰</span>
                    </div>
                    <p className="text-3xl font-bold text-[#e8c559]">{formatCurrency(currentBalance)}</p>
                    <p className="text-xs text-[var(--text-muted)] mt-2">Last top-up: 1 Dec 2024</p>
                </div>

                <div className="glass-panel p-5 rounded-xl">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-xs text-[var(--text-muted)]">Total Modal (Dec)</span>
                        <span className="text-lg">📥</span>
                    </div>
                    <p className="text-3xl font-bold text-emerald-500">{formatCurrency(totalTopUp)}</p>
                </div>

                <div className="glass-panel p-5 rounded-xl">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-xs text-[var(--text-muted)]">Total Pengeluaran (Dec)</span>
                        <span className="text-lg">📤</span>
                    </div>
                    <p className="text-3xl font-bold text-rose-500">{formatCurrency(totalExpense)}</p>
                </div>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap items-center gap-3 mb-6">
                <div className="relative flex-1 max-w-xs">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-[var(--text-muted)]" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" />
                        </svg>
                    </div>
                    <input
                        type="text"
                        placeholder="Cari transaksi..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 rounded-lg border border-[var(--glass-border)] bg-[var(--card-bg)] text-sm text-[var(--text-primary)]"
                    />
                </div>

                <div className="flex flex-wrap gap-2">
                    <button
                        onClick={() => setSelectedCategory("all")}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${selectedCategory === "all"
                                ? "bg-[#e8c559] text-[#171611]"
                                : "bg-[var(--glass-bg)] text-[var(--text-secondary)] hover:bg-[var(--glass-border)]"
                            }`}
                    >
                        Semua
                    </button>
                    <button
                        onClick={() => setSelectedCategory("topup")}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${selectedCategory === "topup"
                                ? "bg-emerald-500 text-white"
                                : "bg-[var(--glass-bg)] text-[var(--text-secondary)] hover:bg-[var(--glass-border)]"
                            }`}
                    >
                        📥 Top Up
                    </button>
                    {EXPENSE_CATEGORIES.map((cat) => (
                        <button
                            key={cat.id}
                            onClick={() => setSelectedCategory(cat.id)}
                            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${selectedCategory === cat.id
                                    ? `${cat.color} text-white`
                                    : "bg-[var(--glass-bg)] text-[var(--text-secondary)] hover:bg-[var(--glass-border)]"
                                }`}
                        >
                            {cat.icon} {cat.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Transaction List */}
            <div className="glass-panel rounded-xl overflow-hidden flex-1">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="text-left text-[var(--text-muted)] border-b border-[var(--glass-border)] bg-[var(--glass-bg)]">
                                <th className="p-4 font-medium">Tanggal</th>
                                <th className="p-4 font-medium">Deskripsi</th>
                                <th className="p-4 font-medium">Kategori</th>
                                <th className="p-4 font-medium">Staff</th>
                                <th className="p-4 font-medium text-right">Jumlah</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[var(--glass-border)]">
                            {filteredTransactions.map((tx) => {
                                const config = getCategoryConfig(tx.category);
                                const isTopUp = tx.type === "topup";
                                return (
                                    <tr key={tx.id} className="hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                                        <td className="p-4 text-[var(--text-secondary)]">
                                            {new Date(tx.date).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}
                                        </td>
                                        <td className="p-4 text-[var(--text-primary)] font-medium">{tx.description}</td>
                                        <td className="p-4">
                                            {isTopUp ? (
                                                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-emerald-500/10 text-emerald-500">
                                                    📥 Top Up
                                                </span>
                                            ) : (
                                                <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs ${config?.color}/10`}>
                                                    {config?.icon} {config?.label}
                                                </span>
                                            )}
                                        </td>
                                        <td className="p-4">
                                            <div className="flex items-center gap-2">
                                                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${isTopUp ? "bg-emerald-500/20 text-emerald-500" : "bg-[#e8c559]/20 text-[#e8c559]"}`}>
                                                    {tx.staff.split(" ").map(n => n[0]).join("")}
                                                </div>
                                                <span className="text-[var(--text-secondary)]">{tx.staff}</span>
                                            </div>
                                        </td>
                                        <td className={`p-4 text-right font-bold ${isTopUp ? "text-emerald-500" : "text-rose-500"}`}>
                                            {isTopUp ? "+" : "-"} {formatCurrency(tx.amount)}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Add Expense Modal */}
            {showAddModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="glass-panel w-full max-w-lg rounded-2xl p-6">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-bold text-[var(--text-primary)]">Catat Pengeluaran</h2>
                            <button
                                onClick={() => setShowAddModal(false)}
                                className="p-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 text-[var(--text-muted)]"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
                                </svg>
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Tanggal</label>
                                <input
                                    type="date"
                                    value={newExpense.date}
                                    onChange={(e) => setNewExpense({ ...newExpense, date: e.target.value })}
                                    className="w-full p-3 rounded-lg border border-[var(--glass-border)] bg-[var(--card-bg)] text-[var(--text-primary)]"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Deskripsi</label>
                                <input
                                    type="text"
                                    value={newExpense.description}
                                    onChange={(e) => setNewExpense({ ...newExpense, description: e.target.value })}
                                    className="w-full p-3 rounded-lg border border-[var(--glass-border)] bg-[var(--card-bg)] text-[var(--text-primary)]"
                                    placeholder="Beli ATK - Kertas A4"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Kategori</label>
                                    <select
                                        value={newExpense.category}
                                        onChange={(e) => setNewExpense({ ...newExpense, category: e.target.value })}
                                        className="w-full p-3 rounded-lg border border-[var(--glass-border)] bg-[var(--card-bg)] text-[var(--text-primary)]"
                                    >
                                        {EXPENSE_CATEGORIES.map((cat) => (
                                            <option key={cat.id} value={cat.id}>{cat.icon} {cat.label}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Jumlah (Rp)</label>
                                    <input
                                        type="number"
                                        value={newExpense.amount}
                                        onChange={(e) => setNewExpense({ ...newExpense, amount: e.target.value })}
                                        className="w-full p-3 rounded-lg border border-[var(--glass-border)] bg-[var(--card-bg)] text-[var(--text-primary)]"
                                        placeholder="125000"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Upload Bukti (Opsional)</label>
                                <div className="border-2 border-dashed border-[var(--glass-border)] rounded-lg p-4 text-center cursor-pointer hover:border-[#e8c559]/50 transition-colors">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 mx-auto text-[var(--text-muted)] mb-2" viewBox="0 0 24 24" fill="currentColor">
                                        <path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM14 13v4h-4v-4H7l5-5 5 5h-3z" />
                                    </svg>
                                    <p className="text-xs text-[var(--text-muted)]">Klik atau drag foto struk/nota</p>
                                </div>
                            </div>

                            {/* Preview */}
                            {newExpense.amount && (
                                <div className="p-4 rounded-lg bg-rose-500/10 border border-rose-500/20">
                                    <p className="text-sm text-[var(--text-secondary)]">Pengeluaran:</p>
                                    <p className="text-2xl font-bold text-rose-500">- {formatCurrency(parseFloat(newExpense.amount) || 0)}</p>
                                    <p className="text-xs text-[var(--text-muted)] mt-1">
                                        Saldo setelah transaksi: {formatCurrency(currentBalance - (parseFloat(newExpense.amount) || 0))}
                                    </p>
                                </div>
                            )}

                            <div className="flex gap-3 mt-6">
                                <button
                                    onClick={() => setShowAddModal(false)}
                                    className="flex-1 px-4 py-3 rounded-lg border border-[var(--glass-border)] text-[var(--text-secondary)] font-medium"
                                >
                                    Batal
                                </button>
                                <button
                                    onClick={handleAddExpense}
                                    className="flex-1 px-4 py-3 rounded-lg bg-[#e8c559] hover:bg-[#dcb33e] text-[#171611] font-bold"
                                >
                                    Simpan
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
