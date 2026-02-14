"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import {
    ROLE_NAMES,
    StaffRole
} from "./kpi-data";
import {
    TrendingUp,
    Users,
    ClipboardCheck,
    AlertCircle,
    ArrowRight,
    LayoutDashboard,
    FileText,
} from "lucide-react";

export default function CEODashboardPage() {
    const [selectedPeriod, setSelectedPeriod] = useState("2026-S1");
    const [pendingCount, setPendingCount] = useState(0);
    const [staffList, setStaffList] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const supabase = createClient();

    // Fetch Stats & Staff List
    useEffect(() => {
        const calculateStats = async () => {
            // 1. Fetch all profiles (employees)
            const { data: profiles } = await supabase
                .from('profiles')
                .select('id, full_name, job_title, job_level, job_type, role')
                .neq('job_type', 'intern'); // Exclude interns from KPI view

            if (!profiles) return;

            // Filter out CEO, HR, Owner (but keep Super Admin)
            const filteredProfiles = profiles.filter((p: any) =>
                !['ceo', 'hr', 'owner'].includes(p.role)
            );

            // 2. Fetch KPI Scores for Selected Period
            const { data: scores } = await supabase
                .from('kpi_scores')
                .select('profile_id, final_score')
                .eq('period', selectedPeriod);

            // 3. Merge Data
            const merged = filteredProfiles.map((p: any) => {
                const scoreRec = scores?.find((s: any) => s.profile_id === p.id);
                return {
                    ...p,
                    kpiScore: scoreRec ? scoreRec.final_score : 0,
                    hasAssessment: !!scoreRec
                };
            });

            setStaffList(merged);
            setLoading(false);
        };

        const fetchPending = async () => {
            const { count: leaveCount } = await supabase
                .from('leave_requests')
                .select('*', { count: 'exact', head: true })
                .eq('status', 'pending');

            const { count: otherCount } = await supabase
                .from('other_requests')
                .select('*', { count: 'exact', head: true })
                .eq('status', 'pending');

            setPendingCount((leaveCount || 0) + (otherCount || 0));
        };

        calculateStats();
        fetchPending();

        // Realtime
        const channel = supabase.channel('cmd_center_updates')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'leave_requests' }, fetchPending)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'other_requests' }, fetchPending)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'kpi_scores' }, calculateStats)
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [selectedPeriod, supabase]);

    // Calculate Dashboard Metrics
    const activeStaffCount = staffList.length;
    const avgScore = activeStaffCount > 0
        ? staffList.reduce((acc, s) => acc + (s.kpiScore || 0), 0) / activeStaffCount
        : 0;
    const avgPercentage = (avgScore / 5) * 100;

    const sortedStaff = [...staffList].sort((a, b) => b.kpiScore - a.kpiScore);
    const topPerformer = sortedStaff[0];
    const lowPerformers = [...staffList].filter(s => s.kpiScore > 0).sort((a, b) => a.kpiScore - b.kpiScore);
    const needsAttention = lowPerformers.length > 0 ? lowPerformers[0] : null;

    if (loading) return <div className="p-10 text-white">Loading dashboard...</div>;

    return (
        <div className="space-y-8 pb-20">
            {/* Header */}
            <header className="flex flex-col gap-4 md:flex-row md:items-end justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#3f545f] to-[#5f788e] dark:from-[#e8c559] dark:to-[#dcb33e] flex items-center justify-center">
                        <LayoutDashboard className="w-6 h-6 text-white dark:text-[#171611]" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-[var(--text-primary)]">Command Center</h1>
                        <p className="text-sm text-[var(--text-secondary)]">Executive Dashboard & Overview</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <select
                        value={selectedPeriod}
                        onChange={(e) => setSelectedPeriod(e.target.value)}
                        className="px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:border-[#e8c559] outline-none"
                    >
                        <option value="2026-S1">Semester 1 2026</option>
                        <option value="2025-S2">Semester 2 2025</option>
                    </select>
                </div>
            </header>

            {/* Overview Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Team Avg */}
                <div className="glass-panel p-5 rounded-xl border-l-4 border-[#e8c559]">
                    <div className="flex justify-between items-start mb-2">
                        <p className="text-xs text-gray-500 uppercase tracking-wider">Team Avg KPI</p>
                        <TrendingUp className="w-4 h-4 text-[#e8c559]" />
                    </div>
                    <p className="text-3xl font-black text-white">{avgPercentage.toFixed(0)}%</p>
                    <p className="text-xs text-gray-400 mt-1">Target: 80% ({avgScore.toFixed(2)}/5.0)</p>
                </div>

                {/* Total Employees */}
                <div className="glass-panel p-5 rounded-xl border-l-4 border-blue-500">
                    <div className="flex justify-between items-start mb-2">
                        <p className="text-xs text-gray-500 uppercase tracking-wider">Total Staff</p>
                        <Users className="w-4 h-4 text-blue-500" />
                    </div>
                    <p className="text-3xl font-black text-white">{activeStaffCount}</p>
                    <p className="text-xs text-gray-400 mt-1">Active Employees (Non-Intern)</p>
                </div>

                {/* Pending Approvals */}
                <Link href="/dashboard/command-center/request-approval" className="glass-panel p-5 rounded-xl border-l-4 border-orange-500 hover:bg-white/5 transition-colors group relative">
                    <div className="flex justify-between items-start mb-2">
                        <p className="text-xs text-gray-500 uppercase tracking-wider group-hover:text-orange-400 transition-colors">Pending Approvals</p>
                        <ClipboardCheck className="w-4 h-4 text-orange-500" />
                    </div>
                    <p className="text-3xl font-black text-white">{pendingCount}</p>
                    <p className="text-xs text-orange-400 mt-1 flex items-center gap-1">
                        Waiting for review <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
                    </p>
                    {pendingCount > 0 && (
                        <span className="absolute top-4 right-4 w-3 h-3 bg-red-500 rounded-full animate-pulse" />
                    )}
                </Link>

                {/* Needs Attention */}
                {needsAttention ? (
                    <Link href={`/dashboard/command-center/kpi-assessment/${needsAttention.id}`} className="glass-panel p-5 rounded-xl border-l-4 border-rose-500 hover:bg-white/5 transition-colors group">
                        <div className="flex justify-between items-start mb-2">
                            <p className="text-xs text-gray-500 uppercase tracking-wider group-hover:text-rose-400 transition-colors">Needs Attention</p>
                            <AlertCircle className="w-4 h-4 text-rose-500" />
                        </div>
                        <p className="text-lg font-bold text-white truncate">{needsAttention.full_name}</p>
                        <p className="text-xs text-rose-400 mt-1 flex items-center gap-1">
                            Score: {(needsAttention.kpiScore).toFixed(2)} <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
                        </p>
                    </Link>
                ) : (
                    <div className="glass-panel p-5 rounded-xl border-l-4 border-emerald-500">
                        <div className="flex justify-between items-start mb-2">
                            <p className="text-xs text-gray-500 uppercase tracking-wider">Status</p>
                            <ClipboardCheck className="w-4 h-4 text-emerald-500" />
                        </div>
                        <p className="text-lg font-bold text-white">All Good</p>
                        <p className="text-xs text-emerald-400 mt-1">No low performers</p>
                    </div>
                )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Main Action / Quick Links */}
                <div className="lg:col-span-2 space-y-6">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <LayoutDashboard className="w-5 h-5 text-[#e8c559]" /> Quick Actions
                    </h2>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Link
                            href="/dashboard/command-center/kpi-management"
                            className="glass-panel p-6 rounded-xl border border-white/10 hover:border-[#e8c559] group transition-all"
                        >
                            <div className="flex items-center gap-4 mb-4">
                                <div className="p-3 rounded-full bg-[#e8c559]/20 text-[#e8c559]">
                                    <FileText className="w-6 h-6" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-lg text-white group-hover:text-[#e8c559] transition-colors">Assessment Center</h3>
                                    <p className="text-sm text-gray-400">Manage & Input KPI Scores</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-[#e8c559] font-medium">
                                Go to Management <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                            </div>
                        </Link>


                        <Link
                            href="/dashboard/command-center/request-approval"
                            className="glass-panel p-6 rounded-xl border border-white/10 hover:border-orange-500 group transition-all relative"
                        >
                            {pendingCount > 0 && (
                                <div className="absolute top-4 right-4 flex items-center gap-1 bg-red-500/10 border border-red-500/20 text-red-400 px-2 py-1 rounded-full text-xs font-bold animate-pulse">
                                    <span className="w-2 h-2 bg-red-500 rounded-full" />
                                    {pendingCount} Pending
                                </div>
                            )}

                            <div className="flex items-center gap-4 mb-4">
                                <div className="p-3 rounded-full bg-orange-500/20 text-orange-500">
                                    <ClipboardCheck className="w-6 h-6" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-lg text-white group-hover:text-orange-500 transition-colors">Approval Requests</h3>
                                    <p className="text-sm text-gray-400">Review & Approve</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-orange-500 font-medium">
                                View Requests <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                            </div>
                        </Link>

                        <Link
                            href="/dashboard/command-center/overtime-conversion"
                            className="glass-panel p-6 rounded-xl border border-white/10 hover:border-blue-500 group transition-all"
                        >
                            <div className="flex items-center gap-4 mb-4">
                                <div className="p-3 rounded-full bg-blue-500/20 text-blue-500">
                                    <ClipboardCheck className="w-6 h-6" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-lg text-white group-hover:text-blue-500 transition-colors">Overtime Conversion</h3>
                                    <p className="text-sm text-gray-400">Convert Hours to Leave/Cash</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-blue-500 font-medium">
                                Manage Overtime <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                            </div>
                        </Link>

                    </div>
                </div>

                {/* Right Sidebar: Top Performer Spotlight */}
                <div className="space-y-6">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <TrendingUp className="w-5 h-5 text-emerald-500" /> Spotlight
                    </h2>

                    {topPerformer && topPerformer.kpiScore > 0 ? (
                        <div className="glass-panel p-6 rounded-xl border border-emerald-500/20 bg-gradient-to-b from-emerald-500/10 to-transparent relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-4 opacity-10">
                                <TrendingUp className="w-32 h-32 text-emerald-500" />
                            </div>

                            <div className="relative z-10">
                                <p className="text-emerald-400 text-xs font-bold uppercase tracking-wider mb-2">🏆 Top Performer of the Month</p>
                                <h3 className="text-2xl font-black text-white mb-1">{topPerformer.full_name}</h3>
                                <p className="text-gray-400 text-sm mb-4">{topPerformer.job_title}</p>

                                <div className="flex items-end gap-2 mb-6">
                                    <span className="text-4xl font-black text-white">{topPerformer.kpiScore.toFixed(2)}</span>
                                    <span className="text-sm text-gray-500 mb-1">/ 5.0</span>
                                </div>

                                <Link
                                    href={`/dashboard/command-center/kpi-assessment/${topPerformer.id}`}
                                    className="w-full py-2 rounded-lg bg-emerald-500 text-white text-sm font-bold flex items-center justify-center gap-2 hover:bg-emerald-600 transition-colors"
                                >
                                    View Assessment <ArrowRight className="w-4 h-4" />
                                </Link>
                            </div>
                        </div>
                    ) : (
                        <div className="glass-panel p-6 rounded-xl border border-white/10 text-center text-gray-500">
                            No KPI data available for this period.
                        </div>
                    )}

                    <div className="glass-panel p-6 rounded-xl border border-white/10">
                        <h3 className="font-bold text-white mb-4">Pending Approvals</h3>
                        <div className="space-y-3">
                            {pendingCount === 0 ? (
                                <p className="text-sm text-gray-500">No pending approvals</p>
                            ) : (
                                <div className="flex items-center justify-between p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors cursor-pointer">
                                    <div className="flex items-center gap-3">
                                        <div className="w-2 h-2 rounded-full bg-orange-500" />
                                        <div>
                                            <p className="text-sm text-white font-medium">Pending Requests</p>
                                            <p className="text-xs text-gray-500">{pendingCount} requests waiting</p>
                                        </div>
                                    </div>
                                    <ArrowRight className="w-4 h-4 text-gray-500" />
                                </div>
                            )}
                        </div>
                        <Link
                            href="/dashboard/command-center/request-approval"
                            className="block mt-4 text-center text-xs text-[#e8c559] hover:underline"
                        >
                            View All Approvals →
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
