"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
    Wallet,
    Wrench,
    TrendingUp,
    PieChart as PieChartIcon, // Renamed to avoid using same name as Recharts component
    AlertCircle,
    ArrowRight,
    LayoutDashboard,
    DollarSign,
    CreditCard,
    Box,
    ShieldAlert,
    ExternalLink,
    ChevronRight
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { createClient } from "@/lib/supabase/client";
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

// --- TYPES ---
interface Transaction {
    id: string;
    transaction_date: string; // date string
    description: string;
    category: string;
    amount: number;
    is_expense: boolean; // true for petty cash expense, false for income. maintenance is always expense.
    source: 'petty_cash' | 'maintenance';
}

// --- COLORS ---
const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658', '#d0ed57'];

// Format currency
const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
        minimumFractionDigits: 0,
    }).format(amount);
};

export default function OperationalDashboard() {
    const { canAccessOperational, isLoading: authLoading } = useAuth();
    const supabase = createClient();

    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
    const [isLoading, setIsLoading] = useState(true);
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [pettyCashBalance, setPettyCashBalance] = useState(0);
    const [totalAssetValue, setTotalAssetValue] = useState(0);

    useEffect(() => {
        if (!authLoading && canAccessOperational) {
            fetchDashboardData();
        }
    }, [authLoading, canAccessOperational, selectedYear]);

    const fetchDashboardData = async () => {
        setIsLoading(true);
        try {
            const startDate = `${selectedYear}-01-01`;
            const endDate = `${selectedYear}-12-31`;

            // 1. Fetch Petty Cash Transactions
            const { data: pcData, error: pcError } = await supabase
                .from("petty_cash_transactions")
                .select("*")
                .gte("transaction_date", startDate)
                .lte("transaction_date", endDate)
                .order("transaction_date", { ascending: false });

            if (pcError) throw pcError;

            // Calculate Balance (Always total lifetime balance, not just selected year)
            // But for simplicity in this view, let's just fetch all-time balance separately or sum up
            // To get true balance we need ALL transactions or stored balance.
            // Let's fetch ALL petty cash transactions for balance calculation just to be safe, 
            // or better: utilize the same logic as petty cash page.
            // Note: Optimizing to just use a separate query for balance if needed, 
            // but for now let's assume we want balance up to now.
            const { data: allPcData, error: allPcError } = await supabase
                .from("petty_cash_transactions")
                .select("amount, is_expense");

            if (allPcError) throw allPcError;

            const currentBalance = (allPcData || []).reduce((acc: number, curr: any) => {
                return curr.is_expense ? acc - curr.amount : acc + curr.amount;
            }, 0);
            setPettyCashBalance(currentBalance);


            // 2. Fetch Maintenance Records
            const { data: maintData, error: maintError } = await supabase
                .from("maintenance_records")
                .select("*")
                .gte("service_date", startDate)
                .lte("service_date", endDate)
                .order("service_date", { ascending: false });

            if (maintError) throw maintError;

            // 3. Fetch Asset Value (Total)
            const { data: assetData, error: assetError } = await supabase
                .from("operational_assets")
                .select("purchase_value")
                .neq("status", "disposed"); // Exclude disposed assets from value?

            if (assetError) throw assetError;

            const assetTotal = (assetData || []).reduce((acc: number, curr: any) => acc + (curr.purchase_value || 0), 0);
            setTotalAssetValue(assetTotal);


            // 4. Normalize and Merge Data
            const pcTransactions: Transaction[] = (pcData || []).map((t: any) => ({
                id: `pc-${t.id}`,
                transaction_date: t.transaction_date,
                description: t.description,
                category: t.category, // e.g. 'meals'
                amount: t.amount,
                is_expense: t.is_expense, // could be income or expense
                source: 'petty_cash'
            }));

            const maintTransactions: Transaction[] = (maintData || []).map((t: any) => ({
                id: `mt-${t.id}`,
                transaction_date: t.service_date,
                description: t.description,
                category: t.category, // e.g. 'ac_service'
                amount: t.amount,
                is_expense: true, // Maintenance is always expense
                source: 'maintenance'
            }));

            const allTransactions = [...pcTransactions, ...maintTransactions].sort((a, b) =>
                new Date(b.transaction_date).getTime() - new Date(a.transaction_date).getTime()
            );

            setTransactions(allTransactions);

        } catch (error) {
            console.error("Error fetching dashboard data:", error);
        } finally {
            setIsLoading(false);
        }
    };

    // --- AGGREGATION ---

    const stats = useMemo(() => {
        // Filter only expenses for charts/totals
        const expenses = transactions.filter(t => t.is_expense);

        const totalSpent = expenses.reduce((acc, curr) => acc + curr.amount, 0);

        // Monthly Trend
        const monthlyData = Array.from({ length: 12 }, (_, i) => {
            const date = new Date(Number(selectedYear), i, 1);
            const monthName = date.toLocaleDateString("id-ID", { month: "short" });

            const monthTotal = expenses
                .filter(t => new Date(t.transaction_date).getMonth() === i)
                .reduce((acc, curr) => acc + curr.amount, 0);

            return {
                name: monthName,
                amount: monthTotal
            };
        });

        // Category Composition
        const categoryMap = new Map<string, number>();
        expenses.forEach(t => {
            // Capitalize category or use simple mapping
            const cleanCat = t.category.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
            const current = categoryMap.get(cleanCat) || 0;
            categoryMap.set(cleanCat, current + t.amount);
        });

        const categoryData = Array.from(categoryMap.entries())
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value); // Sort descending

        return {
            totalSpent,
            monthlyData,
            categoryData
        };

    }, [transactions, selectedYear]);

    if (authLoading || isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[50vh]">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#e8c559]"></div>
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

    return (
        <div className="space-y-8 pb-20">
            {/* Header */}
            <header className="flex flex-col gap-4 md:flex-row md:items-end justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#3f545f] to-[#5f788e] dark:from-[#e8c559] dark:to-[#dcb33e] flex items-center justify-center">
                        {/* Sidebar Icon match */}
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white dark:text-[#171611]" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M11.8 10.9c-2.27-.59-3-1.2-3-2.15 0-1.09 1.01-1.85 2.7-1.85 1.78 0 2.44.85 2.5 2.1h2.21c-.07-1.72-1.12-3.3-3.21-3.81V3h-3v2.16c-1.94.42-3.5 1.68-3.5 3.61 0 2.31 1.91 3.46 4.7 4.13 2.5.6 3 1.48 3 2.41 0 .69-.49 1.79-2.7 1.79-2.06 0-2.87-.92-2.98-2.1h-2.2c.12 2.19 1.76 3.42 3.68 3.83V21h3v-2.15c1.95-.37 3.5-1.5 3.5-3.55 0-2.84-2.43-3.81-4.7-4.4z" />
                        </svg>
                    </div>
                    <div>
                        <div className="flex items-center gap-2 mb-1 text-sm text-[var(--text-secondary)]">
                            <Link href="/dashboard" className="hover:text-[var(--text-primary)] transition-colors">Dashboard</Link>
                            <ChevronRight className="h-4 w-4" />
                            <span className="text-[var(--text-primary)]">Operational</span>
                        </div>
                        <h1 className="text-2xl font-bold text-[var(--text-primary)]">Operational Dashboard</h1>
                        <p className="text-sm text-[var(--text-secondary)]">Overview of expenses, maintenance & assets</p>
                    </div>
                </div>
                <div className="flex items-center gap-3 bg-white dark:bg-[#1c2120] p-1.5 rounded-xl border border-[var(--glass-border)]">
                    <select
                        value={selectedYear}
                        onChange={(e) => setSelectedYear(e.target.value)}
                        className="px-4 py-2 rounded-lg bg-[var(--glass-bg)] text-[var(--text-primary)] text-sm font-bold focus:ring-2 focus:ring-[#e8c559] outline-none border-none cursor-pointer"
                    >
                        <option value="2024">2024</option>
                        <option value="2025">2025</option>
                        <option value="2026">2026</option>
                    </select>
                </div>
            </header>

            {/* Overview Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Current Balance */}
                <div className="glass-panel p-5 rounded-xl border-l-4 border-[#e8c559]">
                    <div className="flex justify-between items-start mb-2">
                        <p className="text-xs text-gray-500 uppercase tracking-wider">Petty Cash Balance</p>
                        <Wallet className="w-4 h-4 text-[#e8c559]" />
                    </div>
                    <p className="text-3xl font-black text-[var(--text-primary)]">{formatCurrency(pettyCashBalance)}</p>
                    <p className="text-xs text-gray-400 mt-1">Available Funds</p>
                </div>

                {/* Total Spent (Yearly) */}
                <div className="glass-panel p-5 rounded-xl border-l-4 border-rose-500">
                    <div className="flex justify-between items-start mb-2">
                        <p className="text-xs text-gray-500 uppercase tracking-wider">Total Expenses ({selectedYear})</p>
                        <CreditCard className="w-4 h-4 text-rose-500" />
                    </div>
                    <p className="text-3xl font-black text-[var(--text-primary)]">{formatCurrency(stats.totalSpent)}</p>
                    <p className="text-xs text-gray-400 mt-1">Maintenance & Petty Cash</p>
                </div>

                {/* Asset Value */}
                <div className="glass-panel p-5 rounded-xl border-l-4 border-emerald-500">
                    <div className="flex justify-between items-start mb-2">
                        <p className="text-xs text-gray-500 uppercase tracking-wider">Total Asset Value</p>
                        <DollarSign className="w-4 h-4 text-emerald-500" />
                    </div>
                    <p className="text-3xl font-black text-[var(--text-primary)]">{formatCurrency(totalAssetValue)}</p>
                    <p className="text-xs text-emerald-500 mt-1 flex items-center gap-1">
                        Active Inventory
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Main Content: Charts */}
                <div className="lg:col-span-2 space-y-6">

                    {/* Charts Section */}
                    <div className="grid grid-cols-1 gap-6">
                        {/* Trend Chart */}
                        <div className="bg-white dark:bg-[#1c2120] rounded-2xl p-6 border border-[var(--glass-border)] shadow-sm">
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-lg font-bold text-[var(--text-primary)] flex items-center gap-2">
                                    <TrendingUp className="w-5 h-5 text-[#e8c559]" /> Monthly Expense Trend
                                </h3>
                            </div>
                            <div className="h-[300px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={stats.monthlyData}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--glass-border)" />
                                        <XAxis
                                            dataKey="name"
                                            tick={{ fontSize: 12, fill: 'var(--text-secondary)' }}
                                            tickLine={false}
                                            axisLine={false}
                                        />
                                        <YAxis
                                            tick={{ fontSize: 12, fill: 'var(--text-secondary)' }}
                                            tickLine={false}
                                            axisLine={false}
                                            tickFormatter={(val) => `Rp${val / 1000}k`}
                                        />
                                        <Tooltip
                                            contentStyle={{ backgroundColor: 'var(--glass-bg)', borderRadius: '12px', border: '1px solid var(--glass-border)', color: 'var(--text-primary)' }}
                                            formatter={(val: any) => [formatCurrency(Number(val || 0)), 'Expense']}
                                        />
                                        <Bar dataKey="amount" fill="#3f545f" radius={[4, 4, 0, 0]} className="fill-[#3f545f] dark:fill-[#e8c559]" />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Pie Chart */}
                        <div className="bg-white dark:bg-[#1c2120] rounded-2xl p-6 border border-[var(--glass-border)] shadow-sm">
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-lg font-bold text-[var(--text-primary)] flex items-center gap-2">
                                    <PieChartIcon className="w-5 h-5 text-blue-500" /> Expense Analysis
                                </h3>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                                <div className="h-[250px] w-full flex items-center justify-center">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie
                                                data={stats.categoryData}
                                                innerRadius={60}
                                                outerRadius={80}
                                                paddingAngle={5}
                                                dataKey="value"
                                            >
                                                {stats.categoryData.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                                ))}
                                            </Pie>
                                            <Tooltip
                                                contentStyle={{ backgroundColor: 'var(--glass-bg)', borderRadius: '12px', border: '1px solid var(--glass-border)', color: 'var(--text-primary)' }}
                                                formatter={(val: any) => formatCurrency(Number(val || 0))}
                                            />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>
                                <div className="space-y-3">
                                    <h4 className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-2">Category Breakdown</h4>
                                    {stats.categoryData.slice(0, 6).map((item, index) => (
                                        <div key={index} className="flex items-center justify-between text-sm">
                                            <div className="flex items-center gap-2">
                                                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }}></div>
                                                <span className="text-[var(--text-primary)] truncate max-w-[120px]" title={item.name}>{item.name}</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className="font-bold text-[var(--text-primary)]">{formatCurrency(item.value)}</span>
                                                <span className="text-xs text-[var(--text-secondary)] w-10 text-right">
                                                    {((item.value / stats.totalSpent) * 100).toFixed(1)}%
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                    {stats.categoryData.length > 6 && (
                                        <div className="text-xs text-[var(--text-secondary)] italic pt-2 text-center">
                                            + {stats.categoryData.length - 6} other categories
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>


                    {/* Recent Transactions Table */}
                    <div className="glass-panel rounded-xl overflow-hidden border border-[var(--glass-border)] bg-white dark:bg-[#1c2120]">
                        <div className="p-4 border-b border-[var(--glass-border)] flex justify-between items-center">
                            <h3 className="font-bold text-[var(--text-primary)]">Recent Activity</h3>
                            <Link href="/dashboard/operational/petty-cash" className="text-xs text-[#e8c559] hover:underline flex items-center gap-1">
                                View All <ArrowRight className="h-3 w-3" />
                            </Link>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="text-left text-[var(--text-secondary)] border-b border-[var(--glass-border)]">
                                        <th className="p-4 font-medium">Date</th>
                                        <th className="p-4 font-medium">Description</th>
                                        <th className="p-4 font-medium">Category</th>
                                        <th className="p-4 font-medium text-right">Amount</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[var(--glass-border)]">
                                    {transactions.slice(0, 5).map((tx) => (
                                        <tr key={tx.id} className="hover:bg-[var(--glass-bg)] transition-colors">
                                            <td className="p-4 text-[var(--text-secondary)] whitespace-nowrap">
                                                {new Date(tx.transaction_date).toLocaleDateString("id-ID", { day: "numeric", month: "short" })}
                                            </td>
                                            <td className="p-4 text-[var(--text-primary)]">
                                                <div className="flex flex-col">
                                                    <span>{tx.description}</span>
                                                    <span className="text-[10px] text-[var(--text-secondary)] uppercase tracking-wider mt-0.5">
                                                        {tx.source === 'maintenance' ? 'Maintenance' : 'Petty Cash'}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="p-4">
                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-[var(--glass-border)] text-[var(--text-secondary)] capitalize">
                                                    {tx.category.replace(/_/g, ' ')}
                                                </span>
                                            </td>
                                            <td className={`p-4 text-right font-medium ${tx.is_expense ? 'text-rose-500' : 'text-emerald-500'}`}>
                                                {tx.is_expense ? '-' : '+'}{formatCurrency(tx.amount)}
                                            </td>
                                        </tr>
                                    ))}
                                    {transactions.length === 0 && (
                                        <tr>
                                            <td colSpan={4} className="p-8 text-center text-[var(--text-secondary)] italic">
                                                No activity found for {selectedYear}.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                {/* Right Sidebar */}
                <div className="space-y-6">
                    {/* Quick Access Menu */}
                    <h2 className="text-xl font-bold text-[var(--text-primary)] flex items-center gap-2">
                        <LayoutDashboard className="w-5 h-5 text-[#e8c559]" /> Quick Actions
                    </h2>
                    <div className="space-y-3">
                        <Link
                            href="/dashboard/operational/petty-cash"
                            className="glass-panel p-4 rounded-xl border border-[var(--glass-border)] hover:border-[#e8c559] group transition-all flex items-center justify-between bg-white dark:bg-[#1c2120]"
                        >
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-[#e8c559]/20 text-[#e8c559]">
                                    <Wallet className="w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-[var(--text-primary)] group-hover:text-[#e8c559] transition-colors">Petty Cash</h3>
                                </div>
                            </div>
                            <ArrowRight className="w-4 h-4 text-[var(--text-secondary)] group-hover:translate-x-1 transition-transform" />
                        </Link>

                        <Link
                            href="/dashboard/operational/maintenance"
                            className="glass-panel p-4 rounded-xl border border-[var(--glass-border)] hover:border-blue-500 group transition-all flex items-center justify-between bg-white dark:bg-[#1c2120]"
                        >
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-blue-500/20 text-blue-500">
                                    <Wrench className="w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-[var(--text-primary)] group-hover:text-blue-500 transition-colors">Maintenance</h3>
                                </div>
                            </div>
                            <ArrowRight className="w-4 h-4 text-[var(--text-secondary)] group-hover:translate-x-1 transition-transform" />
                        </Link>

                        <Link
                            href="/dashboard/operational/asset-management"
                            className="glass-panel p-4 rounded-xl border border-[var(--glass-border)] hover:border-purple-500 group transition-all flex items-center justify-between bg-white dark:bg-[#1c2120]"
                        >
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-purple-500/20 text-purple-500">
                                    <Box className="w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-[var(--text-primary)] group-hover:text-purple-500 transition-colors">Assets</h3>
                                </div>
                            </div>
                            <ArrowRight className="w-4 h-4 text-[var(--text-secondary)] group-hover:translate-x-1 transition-transform" />
                        </Link>
                    </div>

                    <h2 className="text-xl font-bold text-[var(--text-primary)] flex items-center gap-2 pt-4">
                        <AlertCircle className="w-5 h-5 text-[#e8c559]" /> Guidelines
                    </h2>

                    {/* Tips Card */}
                    <div className="glass-panel p-6 rounded-xl bg-gradient-to-b from-[#e8c559]/10 to-transparent border border-[#e8c559]/20">
                        <h3 className="font-bold text-[#e8c559] mb-4">💡 Management Tips</h3>
                        <div className="space-y-4">
                            <div className="flex gap-3">
                                <div className="mt-1"><span className="text-xl">🧾</span></div>
                                <div>
                                    <p className="text-sm text-[var(--text-primary)] font-bold">Always Keep Receipts</p>
                                    <p className="text-xs text-[var(--text-secondary)]">Upload foto struk segera setelah transaksi dilakukan.</p>
                                </div>
                            </div>
                            <div className="flex gap-3">
                                <div className="mt-1"><span className="text-xl">⚠️</span></div>
                                <div>
                                    <p className="text-sm text-[var(--text-primary)] font-bold">Low Balance Alert</p>
                                    <p className="text-xs text-[var(--text-secondary)]">Segera request top-up saat saldo di bawah Rp 1.000.000.</p>
                                </div>
                            </div>
                            <div className="flex gap-3">
                                <div className="mt-1"><span className="text-xl">🔍</span></div>
                                <div>
                                    <p className="text-sm text-[var(--text-primary)] font-bold">Weekly Audit</p>
                                    <p className="text-xs text-[var(--text-secondary)]">Lakukan pengecekan saldo fisik setiap hari Jumat.</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
