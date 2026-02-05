"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
    LayoutDashboard,
    FileText,
    TrendingUp,
    Target,
    ArrowRight,
    Bell,
    ShieldAlert,
    Users,
    Calendar,
    ChevronRight,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { createClient } from "@/lib/supabase/client";

const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(value);
};

export default function BisDevDashboardPage() {
    const { canAccessBisdev, isLoading } = useAuth();
    const supabase = createClient();

    const [stats, setStats] = useState({
        totalRevenue: 0,
        proposalsSent: 0,
        hotLeads: 0,
        activeProspects: 0,
    });
    const [recentActivity, setRecentActivity] = useState<Array<{ type: string; title: string; company: string; date: string }>>([]);
    const [isLoadingData, setIsLoadingData] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            if (!canAccessBisdev) return;

            try {
                // Fetch sales total (running/partial status)
                const { data: salesData } = await supabase
                    .from('bisdev_sales')
                    .select('contract_value, status')
                    .in('status', ['running', 'paid', 'partial']);

                const totalRevenue = salesData?.reduce((acc, item) => acc + (item.contract_value || 0), 0) || 0;

                // Fetch proposals count (sent/negotiation)
                const { count: proposalCount } = await supabase
                    .from('bisdev_proposals')
                    .select('*', { count: 'exact', head: true })
                    .in('status', ['sent', 'negotiation']);

                // Fetch hot leads count
                const { count: hotLeadsCount } = await supabase
                    .from('bisdev_leads')
                    .select('*', { count: 'exact', head: true })
                    .eq('status', 'hot');

                // Fetch active prospects
                const { count: prospectsCount } = await supabase
                    .from('bisdev_prospects')
                    .select('*', { count: 'exact', head: true })
                    .neq('status', 'not_interested');

                setStats({
                    totalRevenue,
                    proposalsSent: proposalCount || 0,
                    hotLeads: hotLeadsCount || 0,
                    activeProspects: prospectsCount || 0,
                });

                // Fetch recent activity (latest items from all tables)
                const [latestSales, latestLeads, latestProposals] = await Promise.all([
                    supabase.from('bisdev_sales').select('project_name, company_name, created_at').order('created_at', { ascending: false }).limit(2),
                    supabase.from('bisdev_leads').select('company_name, created_at').order('created_at', { ascending: false }).limit(2),
                    supabase.from('bisdev_proposals').select('proposal_title, company_name, created_at').order('created_at', { ascending: false }).limit(2),
                ]);

                const activities: Array<{ type: string; title: string; company: string; date: string }> = [];
                latestSales.data?.forEach(s => activities.push({ type: 'sales', title: s.project_name, company: s.company_name, date: s.created_at }));
                latestLeads.data?.forEach(l => activities.push({ type: 'lead', title: 'New Lead', company: l.company_name, date: l.created_at }));
                latestProposals.data?.forEach(p => activities.push({ type: 'proposal', title: p.proposal_title, company: p.company_name, date: p.created_at }));

                // Sort by date and take top 5
                activities.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
                setRecentActivity(activities.slice(0, 5));

            } catch (error) {
                console.error('Error fetching stats:', error);
            } finally {
                setIsLoadingData(false);
            }
        };

        fetchStats();
    }, [canAccessBisdev]);

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

    const formatTimeAgo = (dateStr: string) => {
        const date = new Date(dateStr);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

        if (diffHours < 1) return 'Just now';
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays === 1) return 'Yesterday';
        return `${diffDays} days ago`;
    };

    return (
        <div className="space-y-8 pb-20">
            {/* Header */}
            <header className="flex flex-col gap-4 md:flex-row md:items-center justify-between">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#e8c559] to-[#d4b44a] flex items-center justify-center shadow-lg shadow-[#e8c559]/20">
                        <TrendingUp className="w-6 h-6 text-[#171611]" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2 mb-1 text-sm text-[var(--text-secondary)]">
                            <Link href="/dashboard" className="hover:text-[var(--text-primary)] transition-colors">Dashboard</Link>
                            <ChevronRight className="h-4 w-4" />
                            <span className="text-[var(--text-primary)]">Bisdev</span>
                        </div>
                        <h1 className="text-2xl font-bold text-[var(--text-primary)]">Business Development</h1>
                        <p className="text-sm text-[var(--text-secondary)]">Growth, Sales Pipeline & Revenue</p>
                    </div>
                </div>
                {/* Timeline Quick Action */}
                <Link
                    href="/dashboard/bisdev/timeline"
                    className="flex items-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-[#e8c559] to-[#d4b44a] text-[#171611] font-bold shadow-lg shadow-[#e8c559]/20 hover:shadow-xl hover:shadow-[#e8c559]/30 transition-all"
                >
                    <Calendar className="w-5 h-5" />
                    <span>View Timeline</span>
                    <ArrowRight className="w-4 h-4" />
                </Link>
            </header>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Total Revenue */}
                <div className="p-5 rounded-2xl bg-white dark:bg-[#1c2120] border border-[var(--glass-border)] border-l-4 border-l-emerald-500">
                    <div className="flex justify-between items-start mb-2">
                        <p className="text-xs text-[var(--text-muted)] uppercase tracking-wider">Total Revenue</p>
                        <TrendingUp className="w-4 h-4 text-emerald-500" />
                    </div>
                    <p className="text-2xl font-black text-[var(--text-primary)]">
                        {isLoadingData ? '...' : formatCurrency(stats.totalRevenue)}
                    </p>
                    <p className="text-xs text-[var(--text-muted)] mt-1">From active contracts</p>
                </div>

                {/* Proposals */}
                <div className="p-5 rounded-2xl bg-white dark:bg-[#1c2120] border border-[var(--glass-border)] border-l-4 border-l-blue-500">
                    <div className="flex justify-between items-start mb-2">
                        <p className="text-xs text-[var(--text-muted)] uppercase tracking-wider">Active Proposals</p>
                        <FileText className="w-4 h-4 text-blue-500" />
                    </div>
                    <p className="text-2xl font-black text-[var(--text-primary)]">
                        {isLoadingData ? '...' : stats.proposalsSent}
                    </p>
                    <p className="text-xs text-[var(--text-muted)] mt-1">Sent & in negotiation</p>
                </div>

                {/* Hot Leads */}
                <div className="p-5 rounded-2xl bg-white dark:bg-[#1c2120] border border-[var(--glass-border)] border-l-4 border-l-rose-500">
                    <div className="flex justify-between items-start mb-2">
                        <p className="text-xs text-[var(--text-muted)] uppercase tracking-wider">Hot Leads</p>
                        <Bell className="w-4 h-4 text-rose-500" />
                    </div>
                    <p className="text-2xl font-black text-[var(--text-primary)]">
                        {isLoadingData ? '...' : stats.hotLeads}
                    </p>
                    <p className="text-xs text-rose-500 mt-1">Require immediate action</p>
                </div>

                {/* Active Prospects */}
                <div className="p-5 rounded-2xl bg-white dark:bg-[#1c2120] border border-[var(--glass-border)] border-l-4 border-l-cyan-500">
                    <div className="flex justify-between items-start mb-2">
                        <p className="text-xs text-[var(--text-muted)] uppercase tracking-wider">Prospects</p>
                        <Target className="w-4 h-4 text-cyan-500" />
                    </div>
                    <p className="text-2xl font-black text-[var(--text-primary)]">
                        {isLoadingData ? '...' : stats.activeProspects}
                    </p>
                    <p className="text-xs text-[var(--text-muted)] mt-1">Active potential clients</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Main Content */}
                <div className="lg:col-span-2 space-y-6">
                    <h2 className="text-xl font-bold text-[var(--text-primary)] flex items-center gap-2">
                        <LayoutDashboard className="w-5 h-5 text-blue-500" /> Quick Actions
                    </h2>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Link
                            href="/dashboard/bisdev/sales"
                            className="p-6 rounded-2xl bg-white dark:bg-[#1c2120] border border-[var(--glass-border)] hover:border-emerald-500 group transition-all"
                        >
                            <div className="flex items-center gap-4 mb-4">
                                <div className="p-3 rounded-full bg-emerald-500/20 text-emerald-500">
                                    <TrendingUp className="w-6 h-6" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-lg text-[var(--text-primary)] group-hover:text-emerald-500 transition-colors">Sales</h3>
                                    <p className="text-sm text-[var(--text-secondary)]">Track contracts</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-emerald-500 font-medium">
                                View Sales <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                            </div>
                        </Link>

                        <Link
                            href="/dashboard/bisdev/leads"
                            className="p-6 rounded-2xl bg-white dark:bg-[#1c2120] border border-[var(--glass-border)] hover:border-blue-500 group transition-all"
                        >
                            <div className="flex items-center gap-4 mb-4">
                                <div className="p-3 rounded-full bg-blue-500/20 text-blue-500">
                                    <Users className="w-6 h-6" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-lg text-[var(--text-primary)] group-hover:text-blue-500 transition-colors">Leads</h3>
                                    <p className="text-sm text-[var(--text-secondary)]">Manage prospects</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-blue-500 font-medium">
                                View Leads <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                            </div>
                        </Link>

                        <Link
                            href="/dashboard/bisdev/proposals"
                            className="p-6 rounded-2xl bg-white dark:bg-[#1c2120] border border-[var(--glass-border)] hover:border-purple-500 group transition-all"
                        >
                            <div className="flex items-center gap-4 mb-4">
                                <div className="p-3 rounded-full bg-purple-500/20 text-purple-500">
                                    <FileText className="w-6 h-6" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-lg text-[var(--text-primary)] group-hover:text-purple-500 transition-colors">Proposals</h3>
                                    <p className="text-sm text-[var(--text-secondary)]">Drafts & contracts</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-purple-500 font-medium">
                                View Proposals <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                            </div>
                        </Link>

                        <Link
                            href="/dashboard/bisdev/prospects"
                            className="p-6 rounded-2xl bg-white dark:bg-[#1c2120] border border-[var(--glass-border)] hover:border-cyan-500 group transition-all"
                        >
                            <div className="flex items-center gap-4 mb-4">
                                <div className="p-3 rounded-full bg-cyan-500/20 text-cyan-500">
                                    <Target className="w-6 h-6" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-lg text-[var(--text-primary)] group-hover:text-cyan-500 transition-colors">Prospects</h3>
                                    <p className="text-sm text-[var(--text-secondary)]">Market research</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-cyan-500 font-medium">
                                View Prospects <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                            </div>
                        </Link>
                    </div>
                </div>

                {/* Right Sidebar */}
                <div className="space-y-6">
                    <h2 className="text-xl font-bold text-[var(--text-primary)] flex items-center gap-2">
                        <Bell className="w-5 h-5 text-[#e8c559]" /> Recent Activity
                    </h2>

                    <div className="p-6 rounded-2xl bg-white dark:bg-[#1c2120] border border-[var(--glass-border)]">
                        <div className="space-y-4">
                            {isLoadingData ? (
                                <div className="text-center text-[var(--text-muted)]">Loading...</div>
                            ) : recentActivity.length === 0 ? (
                                <div className="text-center text-[var(--text-muted)]">No recent activity</div>
                            ) : (
                                recentActivity.map((activity, idx) => (
                                    <div key={idx} className="relative pl-6 border-l-2 border-[var(--glass-border)]">
                                        <div className={`absolute -left-[5px] top-1 w-2 h-2 rounded-full ${activity.type === 'sales' ? 'bg-emerald-500' :
                                                activity.type === 'lead' ? 'bg-blue-500' :
                                                    'bg-purple-500'
                                            }`}></div>
                                        <p className="text-xs text-[var(--text-muted)] mb-0.5">{formatTimeAgo(activity.date)}</p>
                                        <p className="text-sm text-[var(--text-primary)] font-medium">{activity.title}</p>
                                        <p className="text-xs text-[var(--text-secondary)]">{activity.company}</p>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    {/* Timeline CTA */}
                    <Link
                        href="/dashboard/bisdev/timeline"
                        className="block p-6 rounded-2xl bg-gradient-to-br from-[#e8c559]/20 to-[#e8c559]/5 border border-[#e8c559]/30 hover:border-[#e8c559] transition-all group"
                    >
                        <div className="flex items-center gap-3 mb-3">
                            <Calendar className="w-6 h-6 text-[#e8c559]" />
                            <h3 className="font-bold text-[var(--text-primary)]">Business Timeline</h3>
                        </div>
                        <p className="text-sm text-[var(--text-secondary)] mb-3">View all activities in a Gantt chart</p>
                        <div className="flex items-center gap-2 text-sm text-[#e8c559] font-medium">
                            Open Timeline <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                        </div>
                    </Link>
                </div>
            </div>
        </div>
    );
}
