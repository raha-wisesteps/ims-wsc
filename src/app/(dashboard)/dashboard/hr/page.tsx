"use client";

import { useState, useEffect } from "react";
import { Users, UploadCloud, MessageSquare, LayoutDashboard, ArrowRight, Clock, ShieldAlert, Thermometer, History, Loader2, Calendar, MapPin, ChevronRight } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { createClient } from "@/lib/supabase/client";

export default function HRDashboardPage() {
    const { profile, isLoading } = useAuth();

    // RBAC: Check access levels
    const isFullHR = profile?.role === 'hr' || profile?.role === 'ceo' || profile?.role === 'super_admin' || profile?.role === 'owner';
    const isLimitedHR = profile?.is_hr === true;
    const hasAccess = isFullHR || isLimitedHR;

    const [stats, setStats] = useState({
        totalEmployees: 0,
        presentToday: 0,
        onLeave: 0,
        lateToday: 0,
        attendanceRate: 0,
        onOfficeCount: 0,
        latePercentage: 0
    });
    const [isLoadingStats, setIsLoadingStats] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            if (!isFullHR) return;

            try {
                const supabase = createClient();
                const today = new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD

                // 1. Get inactive/active employees count
                const { count: totalEmployees } = await supabase
                    .from('profiles')
                    .select('*', { count: 'exact', head: true })
                    .eq('is_active', true);

                // 2. Get "On Office" Count (Status = Office)
                const { count: onOfficeCount } = await supabase
                    .from('profiles')
                    .select('*', { count: 'exact', head: true })
                    .eq('is_active', true)
                    .ilike('status', 'office');

                // 3. Get Late Percentage for Current Month (Excluding Executives)
                const startOfMonth = new Date(today.substring(0, 7) + '-01').toISOString().split('T')[0];
                const endOfMonth = new Date(new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0)).toISOString().split('T')[0];

                const { data: monthCheckins } = await supabase
                    .from('daily_checkins')
                    .select('is_late, profiles!inner(role)')
                    .gte('checkin_date', startOfMonth)
                    .lte('checkin_date', endOfMonth)
                    .not('profiles.role', 'in', '("ceo","hr","owner")'); // Exclude executives

                let latePercentage = 0;
                if (monthCheckins && monthCheckins.length > 0) {
                    const totalCheckins = monthCheckins.length;
                    const lateCheckins = monthCheckins.filter((c: any) => c.is_late).length;
                    latePercentage = Math.round((lateCheckins / totalCheckins) * 100);
                }

                // 4. Get today's checkins (Keep for 'Present Today' and 'On Leave' stats)
                const { data: checkins } = await supabase
                    .from('daily_checkins')
                    .select('status, is_late')
                    .eq('checkin_date', today);

                const typedCheckins = checkins as { status: string | null; is_late: boolean | null }[] | null;

                if (typedCheckins) {
                    // Calculate stats
                    const present = typedCheckins.filter(c =>
                        ['office', 'wfh', 'wfa', 'dinas', 'remote', 'lembur'].includes(c.status?.toLowerCase() || '')
                    ).length;

                    const onLeave = typedCheckins.filter(c =>
                        ['sakit', 'sick', 'cuti', 'leave', 'izin'].includes(c.status?.toLowerCase() || '')
                    ).length;

                    const late = typedCheckins.filter(c => c.is_late).length;

                    setStats({
                        totalEmployees: totalEmployees || 0,
                        presentToday: present,
                        onLeave,
                        lateToday: late,
                        attendanceRate: totalEmployees ? Math.round((present / totalEmployees) * 100) : 0,
                        onOfficeCount: onOfficeCount || 0,
                        latePercentage
                    });
                }
            } catch (error) {
                console.error("Error fetching HR stats:", error);
            } finally {
                setIsLoadingStats(false);
            }
        };

        fetchStats();
    }, [isFullHR]);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[50vh]">
                <div className="w-8 h-8 border-4 border-[var(--primary)] border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    if (!hasAccess) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
                <div className="p-4 rounded-full bg-rose-500/10">
                    <ShieldAlert className="w-12 h-12 text-rose-500" />
                </div>
                <h2 className="text-xl font-bold text-[var(--text-primary)]">Access Denied</h2>
                <p className="text-[var(--text-secondary)] text-center max-w-md">
                    Anda tidak memiliki akses ke halaman HR. Hubungi Admin untuk mendapatkan akses.
                </p>
                <Link href="/dashboard" className="px-4 py-2 bg-[#e8c559] text-black rounded-lg font-bold hover:bg-[#d6b54e] transition-colors">
                    Kembali ke Dashboard
                </Link>
            </div>
        );
    }

    // Limited access Quick Actions (for is_hr flag users)
    const limitedQuickActions = [
        { href: "/dashboard/hr/attendance-upload", icon: UploadCloud, title: "Attendance Upload", desc: "Import Absensi Mesin", color: "emerald", action: "Upload Excel/CSV" },
        { href: "/dashboard/hr/attendance-history", icon: Clock, title: "Attendance History", desc: "Riwayat Absensi Karyawan", color: "indigo", action: "View Records" },
        { href: "/dashboard/hr/sick-reports", icon: Thermometer, title: "Laporan Sakit", desc: "Kelola Sick Reports", color: "rose", action: "View Reports" },
        { href: "/dashboard/hr/messages", icon: MessageSquare, title: "Message Center", desc: "Broadcast & Private Msg", color: "purple", action: "Send Updates" },
    ];

    if (isFullHR) {
        limitedQuickActions.push(
            { href: "/dashboard/hr/wfh-wfa-report", icon: MapPin, title: "Laporan WFH/WFA/Dinas", desc: "Kelola laporan WFH/WFA/Dinas", color: "violet", action: "Buat Request" },
            { href: "/dashboard/hr/request-history", icon: History, title: "Request History", desc: "Riwayat Request Karyawan", color: "blue", action: "View History" }
        );
    }

    return (
        <div className="space-y-8 pb-20">
            {/* Header */}
            <header className="flex flex-col gap-4 md:flex-row md:items-end justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center shadow-lg shadow-blue-900/20">
                        {/* Sidebar Icon match */}
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                        </svg>
                    </div>
                    <div>
                        <div className="flex items-center gap-2 mb-1 text-sm text-[var(--text-secondary)]">
                            <Link href="/dashboard" className="hover:text-[var(--text-primary)] transition-colors">Dashboard</Link>
                            <ChevronRight className="h-4 w-4" />
                            <span className="text-[var(--text-primary)]">Human Resource</span>
                        </div>
                        <h1 className="text-2xl font-bold text-[var(--text-primary)]">Human Resource</h1>
                        <p className="text-sm text-[var(--text-secondary)]">
                            {isFullHR ? "Employee & Operations Management" : "Limited Access Mode"}
                        </p>
                    </div>
                </div>
                {isLimitedHR && !isFullHR && (
                    <span className="px-3 py-1 bg-amber-500/10 text-amber-500 text-xs font-bold rounded-full border border-amber-500/20">
                        Limited Access
                    </span>
                )}
            </header>

            {/* Overview Stats - Only for full HR */}
            {isFullHR && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="glass-panel p-5 rounded-xl border-l-4 border-blue-500">
                        <div className="flex justify-between items-start mb-2">
                            <p className="text-xs text-gray-500 uppercase tracking-wider">Total Employees</p>
                            <Users className="w-4 h-4 text-blue-500" />
                        </div>
                        {isLoadingStats ? (
                            <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
                        ) : (
                            <p className="text-3xl font-black text-[var(--text-primary)]">{stats.totalEmployees}</p>
                        )}
                        <p className="text-xs text-gray-400 mt-1">Active Staff</p>
                    </div>

                    <div className="glass-panel p-5 rounded-xl border-l-4 border-emerald-500">
                        <div className="flex justify-between items-start mb-2">
                            <p className="text-xs text-gray-500 uppercase tracking-wider">Staff On Office</p>
                            <div className="w-4 h-4 text-emerald-500">
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" /></svg>
                            </div>
                        </div>
                        {isLoadingStats ? (
                            <Loader2 className="w-6 h-6 animate-spin text-emerald-500" />
                        ) : (
                            <p className="text-3xl font-black text-[var(--text-primary)]">{stats.onOfficeCount}</p>
                        )}
                        <p className="text-xs text-gray-400 mt-1">Currently in office</p>
                    </div>

                    <div className="glass-panel p-5 rounded-xl border-l-4 border-orange-500">
                        <div className="flex justify-between items-start mb-2">
                            <p className="text-xs text-gray-500 uppercase tracking-wider">On Leave</p>
                            <div className="w-4 h-4 text-orange-500">
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4"><path d="M17 12h-5v5h5v-5zM16 1v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2h-1V1h-2zm3 18H5V8h14v11z" /></svg>
                            </div>
                        </div>
                        {isLoadingStats ? (
                            <Loader2 className="w-6 h-6 animate-spin text-orange-500" />
                        ) : (
                            <p className="text-3xl font-black text-[var(--text-primary)]">{stats.onLeave}</p>
                        )}
                        <p className="text-xs text-gray-400 mt-1">Approved/Pending</p>
                    </div>

                    <div className="glass-panel p-5 rounded-xl border-l-4 border-rose-500">
                        <div className="flex justify-between items-start mb-2">
                            <p className="text-xs text-gray-500 uppercase tracking-wider">Late Percentage (Month)</p>
                            <div className="w-4 h-4 text-rose-500">
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4"><path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z" /></svg>
                            </div>
                        </div>
                        {isLoadingStats ? (
                            <Loader2 className="w-6 h-6 animate-spin text-rose-500" />
                        ) : (
                            <p className="text-3xl font-black text-[var(--text-primary)]">{stats.latePercentage}%</p>
                        )}
                        <p className="text-xs text-gray-400 mt-1">Accumulated this month</p>
                    </div>
                </div>
            )}

            {/* Quick Actions Header */}
            <div className="space-y-4">
                <h2 className="text-xl font-bold text-[var(--text-primary)] flex items-center gap-2">
                    <LayoutDashboard className="w-5 h-5 text-blue-500" /> Quick Actions
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {/* User Management - Full HR only */}
                    {isFullHR && (
                        <>
                            <Link
                                href="/dashboard/hr/users"
                                className="glass-panel p-6 rounded-xl border border-white/10 hover:border-blue-500 group transition-all"
                            >
                                <div className="flex items-center gap-4 mb-4">
                                    <div className="p-3 rounded-full bg-blue-500/20 text-blue-500">
                                        <Users className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-lg text-[var(--text-primary)] group-hover:text-blue-500 transition-colors">User Management</h3>
                                        <p className="text-sm text-gray-400">Add or Edit Employees</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 text-sm text-blue-500 font-medium">
                                    Manage Users <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                                </div>
                            </Link>

                            <Link
                                href="/dashboard/hr/leave-management"
                                className="glass-panel p-6 rounded-xl border border-white/10 hover:border-orange-500 group transition-all"
                            >
                                <div className="flex items-center gap-4 mb-4">
                                    <div className="p-3 rounded-full bg-orange-500/20 text-orange-500">
                                        <Calendar className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-lg text-[var(--text-primary)] group-hover:text-orange-500 transition-colors">Leave Management</h3>
                                        <p className="text-sm text-gray-400">View Employee Quotas</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 text-sm text-orange-500 font-medium">
                                    Check Quotas <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                                </div>
                            </Link>
                        </>
                    )}

                    {/* Limited Actions - Available for both full and limited HR */}
                    {limitedQuickActions.map((action) => (
                        <Link
                            key={action.href}
                            href={action.href}
                            className={`glass-panel p-6 rounded-xl border border-white/10 hover:border-${action.color}-500 group transition-all`}
                        >
                            <div className="flex items-center gap-4 mb-4">
                                <div className={`p-3 rounded-full bg-${action.color}-500/20 text-${action.color}-500`}>
                                    <action.icon className="w-6 h-6" />
                                </div>
                                <div>
                                    <h3 className={`font-bold text-lg text-[var(--text-primary)] group-hover:text-${action.color}-500 transition-colors`}>{action.title}</h3>
                                    <p className="text-sm text-gray-400">{action.desc}</p>
                                </div>
                            </div>
                            <div className={`flex items-center gap-2 text-sm text-${action.color}-500 font-medium`}>
                                {action.action} <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                            </div>
                        </Link>
                    ))}
                </div>
            </div>
        </div>
    );
}
