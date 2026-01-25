"use client";

import { useState } from "react";
import Link from "next/link";
import {
    LayoutDashboard,
    Briefcase,
    FileText,
    Users,
    TrendingUp,
    Target,
    ArrowRight,
    Search,
    Bell,
    ShieldAlert
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

// Mock Data for Summary
const summaryStats = {
    revenue: 450000000,
    proposalsSent: 12,
    conversionRate: 68,
    hotLeads: 8,
};

const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(value);
};

// Mock Data for Revenue Chart
const revenueData = [
    { month: "Jul", amount: 320000000 },
    { month: "Aug", amount: 350000000 },
    { month: "Sep", amount: 280000000 },
    { month: "Oct", amount: 420000000 },
    { month: "Nov", amount: 380000000 },
    { month: "Dec", amount: 450000000 },
];

export default function BisDevDashboardPage() {
    const { canAccessBisdev, isLoading } = useAuth();
    const [selectedPeriod, setSelectedPeriod] = useState("year");

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[50vh]">
                <div className="w-8 h-8 border-4 border-[var(--primary)] border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    if (!canAccessBisdev) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
                <div className="p-4 rounded-full bg-rose-500/10">
                    <ShieldAlert className="w-12 h-12 text-rose-500" />
                </div>
                <h2 className="text-xl font-bold text-[var(--text-primary)]">Access Denied</h2>
                <p className="text-[var(--text-secondary)] text-center max-w-md">
                    Anda tidak memiliki akses ke halaman Business Development. Hubungi Admin untuk mendapatkan akses.
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
                        <TrendingUp className="w-6 h-6 text-white dark:text-[#171611]" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-[var(--text-primary)]">Business Dev</h1>
                        <p className="text-sm text-[var(--text-secondary)]">Growth, Sales Pipeline & Revenue</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <select
                        value={selectedPeriod}
                        onChange={(e) => setSelectedPeriod(e.target.value)}
                        className="px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:border-blue-500 outline-none"
                    >
                        <option value="month">This Month</option>
                        <option value="quarter">This Quarter</option>
                        <option value="year">This Year</option>
                    </select>
                </div>
            </header>

            {/* Overview Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Total Revenue */}
                <div className="glass-panel p-5 rounded-xl border-l-4 border-emerald-500">
                    <div className="flex justify-between items-start mb-2">
                        <p className="text-xs text-gray-500 uppercase tracking-wider">Total Revenue</p>
                        <TrendingUp className="w-4 h-4 text-emerald-500" />
                    </div>
                    <p className="text-3xl font-black text-white">{formatCurrency(summaryStats.revenue)}</p>
                    <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                        <span className="text-emerald-400 font-bold">+12%</span> vs last month
                    </p>
                </div>

                {/* Proposals Sent */}
                <div className="glass-panel p-5 rounded-xl border-l-4 border-blue-500">
                    <div className="flex justify-between items-start mb-2">
                        <p className="text-xs text-gray-500 uppercase tracking-wider">Proposals</p>
                        <FileText className="w-4 h-4 text-blue-500" />
                    </div>
                    <p className="text-3xl font-black text-white">{summaryStats.proposalsSent}</p>
                    <p className="text-xs text-gray-400 mt-1">Sent this month</p>
                </div>

                {/* Conversion Rate */}
                <div className="glass-panel p-5 rounded-xl border-l-4 border-[#e8c559]">
                    <div className="flex justify-between items-start mb-2">
                        <p className="text-xs text-gray-500 uppercase tracking-wider">Win Rate</p>
                        <Target className="w-4 h-4 text-[#e8c559]" />
                    </div>
                    <p className="text-3xl font-black text-white">{summaryStats.conversionRate}%</p>
                    <p className="text-xs text-emerald-400 mt-1 flex items-center gap-1">
                        <span className="text-emerald-400 font-bold">+5%</span> vs last quarter
                    </p>
                </div>

                {/* Hot Leads */}
                <div className="glass-panel p-5 rounded-xl border-l-4 border-rose-500">
                    <div className="flex justify-between items-start mb-2">
                        <p className="text-xs text-gray-500 uppercase tracking-wider">Hot Leads</p>
                        <Bell className="w-4 h-4 text-rose-500" />
                    </div>
                    <p className="text-3xl font-black text-white">{summaryStats.hotLeads}</p>
                    <p className="text-xs text-rose-400 mt-1">Require immediate follow-up</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Main Content: Quick Actions & Charts */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Quick Actions Group */}
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <LayoutDashboard className="w-5 h-5 text-blue-500" /> Quick Actions
                    </h2>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Link
                            href="/dashboard/bisdev/sales"
                            className="glass-panel p-6 rounded-xl border border-white/10 hover:border-emerald-500 group transition-all"
                        >
                            <div className="flex items-center gap-4 mb-4">
                                <div className="p-3 rounded-full bg-emerald-500/20 text-emerald-500">
                                    <TrendingUp className="w-6 h-6" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-lg text-white group-hover:text-emerald-500 transition-colors">Sales Pipeline</h3>
                                    <p className="text-sm text-gray-400">Track Active Contracts</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-emerald-500 font-medium">
                                View Sales <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                            </div>
                        </Link>

                        <Link
                            href="/dashboard/bisdev/leads"
                            className="glass-panel p-6 rounded-xl border border-white/10 hover:border-rose-500 group transition-all"
                        >
                            <div className="flex items-center gap-4 mb-4">
                                <div className="p-3 rounded-full bg-rose-500/20 text-rose-500">
                                    <Target className="w-6 h-6" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-lg text-white group-hover:text-rose-500 transition-colors">Lead Management</h3>
                                    <p className="text-sm text-gray-400">Manage Prospects</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-rose-500 font-medium">
                                View Leads <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                            </div>
                        </Link>

                        <Link
                            href="/dashboard/bisdev/proposals"
                            className="glass-panel p-6 rounded-xl border border-white/10 hover:border-amber-500 group transition-all"
                        >
                            <div className="flex items-center gap-4 mb-4">
                                <div className="p-3 rounded-full bg-amber-500/20 text-amber-500">
                                    <FileText className="w-6 h-6" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-lg text-white group-hover:text-amber-500 transition-colors">Proposals</h3>
                                    <p className="text-sm text-gray-400">Drafts & Contracts</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-amber-500 font-medium">
                                Create Proposal <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                            </div>
                        </Link>

                        <Link
                            href="/dashboard/bisdev/prospects"
                            className="glass-panel p-6 rounded-xl border border-white/10 hover:border-purple-500 group transition-all"
                        >
                            <div className="flex items-center gap-4 mb-4">
                                <div className="p-3 rounded-full bg-purple-500/20 text-purple-500">
                                    <Search className="w-6 h-6" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-lg text-white group-hover:text-purple-500 transition-colors">Market Research</h3>
                                    <p className="text-sm text-gray-400">Analyze Prospects</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-purple-500 font-medium">
                                Find Prospects <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                            </div>
                        </Link>
                    </div>

                    {/* Revenue Trend Chart */}
                    <div className="glass-panel p-6 rounded-xl border border-white/10">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="font-bold text-white">Revenue Trend</h3>
                            <Link href="/dashboard/bisdev/sales" className="text-xs text-blue-500 hover:underline">
                                Detailed Report →
                            </Link>
                        </div>
                        <div className="h-48 flex items-end justify-between gap-4">
                            {revenueData.map((item, idx) => (
                                <div key={idx} className="flex-1 flex flex-col items-center gap-2 group">
                                    <div className="w-full bg-white/5 rounded-t-lg relative h-40 overflow-hidden flex items-end">
                                        <div
                                            className="w-full bg-gradient-to-t from-blue-600 to-blue-400 opacity-80 group-hover:opacity-100 transition-opacity"
                                            style={{ height: `${(item.amount / 500000000) * 100}%` }}
                                        ></div>
                                    </div>
                                    <span className="text-xs text-gray-500">{item.month}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Right Sidebar */}
                <div className="space-y-6">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <Bell className="w-5 h-5 text-[#e8c559]" /> Recent Activity
                    </h2>

                    <div className="glass-panel p-6 rounded-xl border border-white/10">
                        <div className="space-y-6">
                            <div className="relative pl-6 border-l-2 border-white/10">
                                <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-emerald-500 animate-pulse"></div>
                                <p className="text-xs text-gray-400 mb-1">Today, 10:30 AM</p>
                                <p className="text-sm text-white font-medium">Proposal Signed</p>
                                <p className="text-xs text-gray-500">PT Maju Mundur approved the "Digital Transformation" proposal.</p>
                            </div>
                            <div className="relative pl-6 border-l-2 border-white/10">
                                <div className="absolute -left-[5px] top-0 w-2 h-2 rounded-full bg-blue-500"></div>
                                <p className="text-xs text-gray-400 mb-1">Yesterday, 14:00 PM</p>
                                <p className="text-sm text-white font-medium">New Lead Added</p>
                                <p className="text-xs text-gray-500">Contacted by CV Sejahtera regarding HR Audit.</p>
                            </div>
                            <div className="relative pl-6 border-l-2 border-white/10">
                                <div className="absolute -left-[5px] top-0 w-2 h-2 rounded-full bg-[#e8c559]"></div>
                                <p className="text-xs text-gray-400 mb-1">2 days ago</p>
                                <p className="text-sm text-white font-medium">Meeting Schedule</p>
                                <p className="text-xs text-gray-500">Lunch meeting with Pak Budi (Dinas Pariwisata).</p>
                            </div>
                        </div>
                    </div>

                    <div className="glass-panel p-6 rounded-xl bg-gradient-to-b from-rose-500/10 to-transparent border border-rose-500/20">
                        <h3 className="font-bold text-rose-500 mb-4">🔥 Hot Leads</h3>
                        <div className="space-y-3">
                            {[1, 2, 3].map((_, i) => (
                                <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-white/5 hover:bg-white/10 cursor-pointer">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-rose-500/20 flex items-center justify-center text-xs font-bold text-rose-500">
                                            HL
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-white">Client #{i + 140}</p>
                                            <p className="text-xs text-gray-400">Tourism Project</p>
                                        </div>
                                    </div>
                                    <ArrowRight className="w-4 h-4 text-gray-500" />
                                </div>
                            ))}
                            <Link href="/dashboard/bisdev/leads" className="block text-center text-xs text-rose-400 mt-2 hover:underline">
                                View all Leads →
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
