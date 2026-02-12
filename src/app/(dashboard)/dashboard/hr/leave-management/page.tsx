"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2, ArrowLeft, Search, ShieldAlert, User, MoreVertical, Pencil, X, Save } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";



interface LeaveQuota {
    id: string;
    profile_id: string;
    annual_leave_used: number;
    annual_leave_total: number;
    wfh_weekly_used: number;
    wfh_weekly_limit: number;
    wfa_used: number;
    wfa_total: number;
    extra_leave_used: number;
    extra_leave_total: number; // Note: In DB this might be 0, extra leave usually has its own table, but schema says column exists
    profiles: {
        full_name: string;
        role: string;
        avatar_url: string | null;
        job_title: string | null;
    };
}

export default function LeaveManagementPage() {
    const { profile, isLoading: isAuthLoading } = useAuth();
    const [quotas, setQuotas] = useState<LeaveQuota[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");

    // RBAC
    const isFullHR = profile?.role === 'hr' || profile?.role === 'ceo' || profile?.role === 'super_admin' || profile?.role === 'owner';

    useEffect(() => {
        const fetchQuotas = async () => {
            if (!isFullHR) return;

            try {
                const supabase = createClient();

                // Fetch leave quotas with profile details
                // We use !inner on profiles to ensure we only get rows that have a matching profile
                // but for filtering roles we might need to do it in JS if postgrest join filtering is tricky without exact relationships setup
                // Trying direct filtering in query first.
                const { data, error } = await supabase
                    .from('leave_quotas')
                    .select(`
                        *,
                        profiles!inner (
                            full_name,
                            role,
                            avatar_url,
                            job_title
                        )
                    `);

                if (error) throw error;

                if (data) {
                    // Filter out excluded roles (CEO, HR, Owner, Super Admin)
                    const filtered = (data as unknown as LeaveQuota[]).filter(item => {
                        const role = item.profiles.role.toLowerCase();
                        return !['ceo', 'hr', 'owner', 'super_admin'].includes(role);
                    });

                    // Sort by name
                    filtered.sort((a, b) => a.profiles.full_name.localeCompare(b.profiles.full_name));

                    setQuotas(filtered);
                }
            } catch (error) {
                console.error("Error fetching leave quotas:", error);
            } finally {
                setIsLoading(false);
            }
        };

        if (!isAuthLoading && isFullHR) {
            fetchQuotas();
        } else if (!isAuthLoading && !isFullHR) {
            setIsLoading(false); // Stop loading if no access, so we show access denied
        }
    }, [isFullHR, isAuthLoading]);

    const [editingQuota, setEditingQuota] = useState<LeaveQuota | null>(null);
    const [formData, setFormData] = useState({
        annual_used: 0,
        annual_total: 0,
        wfh_used: 0,
        wfh_limit: 0,
        wfa_used: 0,
        wfa_total: 0
    });
    const [isSaving, setIsSaving] = useState(false);

    // Initial load handled by useEffect above...

    const handleEdit = (quota: LeaveQuota) => {
        setEditingQuota(quota);
        setFormData({
            annual_used: quota.annual_leave_used,
            annual_total: quota.annual_leave_total,
            wfh_used: quota.wfh_weekly_used,
            wfh_limit: quota.wfh_weekly_limit,
            wfa_used: quota.wfa_used,
            wfa_total: quota.wfa_total
        });
    };

    const handleSave = async () => {
        if (!editingQuota) return;
        setIsSaving(true);
        try {
            const supabase = createClient();
            const { error } = await supabase
                .from('leave_quotas')
                .update({
                    annual_leave_used: formData.annual_used,
                    annual_leave_total: formData.annual_total,
                    wfh_weekly_used: formData.wfh_used,
                    wfh_weekly_limit: formData.wfh_limit,
                    wfa_used: formData.wfa_used,
                    wfa_total: formData.wfa_total,
                    updated_at: new Date().toISOString()
                })
                .eq('id', editingQuota.id);

            if (error) throw error;

            // Update local state
            setQuotas(quotas.map(q => q.id === editingQuota.id ? {
                ...q,
                annual_leave_used: formData.annual_used,
                annual_leave_total: formData.annual_total,
                wfh_weekly_used: formData.wfh_used,
                wfh_weekly_limit: formData.wfh_limit,
                wfa_used: formData.wfa_used,
                wfa_total: formData.wfa_total
            } : q));

            setEditingQuota(null);
        } catch (error) {
            console.error("Error updating quota:", error);
            alert("Failed to update quota. Please try again.");
        } finally {
            setIsSaving(false);
        }
    };

    // Derived state for filtering
    const filteredQuotas = quotas.filter(q =>
        q.profiles.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        q.profiles.job_title?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (isAuthLoading || (isLoading && isFullHR)) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            </div>
        );
    }

    if (!isFullHR) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
                <div className="p-4 rounded-full bg-rose-500/10">
                    <ShieldAlert className="w-12 h-12 text-rose-500" />
                </div>
                <h2 className="text-xl font-bold text-[var(--text-primary)]">Access Denied</h2>
                <Link href="/dashboard" className="px-4 py-2 bg-[#e8c559] text-black rounded-lg font-bold">
                    Back to Dashboard
                </Link>
            </div>
        );
    }

    return (
        <div className="space-y-6 pb-10">
            {/* Header */}
            <div className="flex flex-col gap-4">
                <Link href="/dashboard/hr" className="flex items-center gap-2 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors w-fit">
                    <ArrowLeft className="w-4 h-4" /> Back to HR Dashboard
                </Link>

                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-[var(--text-primary)]">Leave Management</h1>
                        <p className="text-sm text-[var(--text-secondary)]">Overview of employee leave quotas and usage</p>
                    </div>

                    <div className="relative w-full md:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            placeholder="Search employee..."
                            className="w-full pl-9 h-10 rounded-md bg-white/5 border border-white/10 focus:outline-none focus:ring-1 focus:ring-[#e8c559] text-sm"
                            value={searchQuery}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>
            </div>

            {/* Quota Table/Cards */}
            <Card className="bg-card border-border shadow-sm">
                <CardHeader className="pb-4 border-b border-border">
                    <CardTitle className="text-lg">Employee Quotas</CardTitle>
                    <CardDescription>Only showing active employees with standard roles</CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-[var(--glass-bg)] bg-black/5 dark:bg-white/5">
                                <tr>
                                    <th className="text-left py-4 px-6 text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider">Employee</th>
                                    <th className="text-left py-4 px-6 text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider">Annual Leave</th>
                                    <th className="text-left py-4 px-6 text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider">WFH (Weekly)</th>
                                    <th className="text-left py-4 px-6 text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider">WFA (Annual)</th>
                                    <th className="text-right py-4 px-6 text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[var(--glass-border)]">
                                {filteredQuotas.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="py-8 text-center text-[var(--text-secondary)]">
                                            No employees found matching criteria
                                        </td>
                                    </tr>
                                ) : (
                                    filteredQuotas.map((quota) => (
                                        <tr key={quota.id} className="hover:bg-black/5 dark:hover:bg-white/5 transition-colors group">
                                            <td className="py-4 px-6">
                                                <div className="flex items-center gap-3">
                                                    <div className="h-10 w-10 shrink-0 overflow-hidden rounded-full border border-white/10">
                                                        {quota.profiles.avatar_url ? (
                                                            <Image
                                                                src={quota.profiles.avatar_url}
                                                                alt={quota.profiles.full_name}
                                                                width={40}
                                                                height={40}
                                                                className="h-full w-full object-cover"
                                                            />
                                                        ) : (
                                                            <div className="flex h-full w-full items-center justify-center bg-gray-500/20 text-xs font-bold text-gray-500">
                                                                {quota.profiles.full_name?.charAt(0) || 'U'}
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-sm text-[var(--text-primary)]">{quota.profiles.full_name}</p>
                                                        <p className="text-xs text-[var(--text-secondary)]">{quota.profiles.job_title || 'No Title'}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="py-4 px-6">
                                                <div className="flex flex-col gap-1">
                                                    <div className="flex items-baseline gap-1">
                                                        <span className="font-bold text-amber-500">{quota.annual_leave_total - quota.annual_leave_used}</span>
                                                        <span className="text-xs text-[var(--text-secondary)]">remaining</span>
                                                    </div>
                                                    <div className="w-24 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                                                        <div
                                                            className="h-full bg-amber-500 rounded-full"
                                                            style={{ width: `${(quota.annual_leave_used / (quota.annual_leave_total || 1)) * 100}%` }}
                                                        />
                                                    </div>
                                                    <span className="text-[10px] text-[var(--text-muted)]">
                                                        Used: {quota.annual_leave_used} / {quota.annual_leave_total}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="py-4 px-6">
                                                <div className="flex flex-col gap-1">
                                                    <div className="flex items-baseline gap-1">
                                                        <span className={`font-bold ${quota.wfh_weekly_used >= quota.wfh_weekly_limit ? 'text-rose-500' : 'text-blue-500'}`}>
                                                            {quota.wfh_weekly_used}
                                                        </span>
                                                        <span className="text-xs text-[var(--text-secondary)]">/ {quota.wfh_weekly_limit} used</span>
                                                    </div>
                                                    <div className="w-24 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                                                        <div
                                                            className={`h-full rounded-full ${quota.wfh_weekly_used >= quota.wfh_weekly_limit ? 'bg-rose-500' : 'bg-blue-500'}`}
                                                            style={{ width: `${(quota.wfh_weekly_used / (quota.wfh_weekly_limit || 1)) * 100}%` }}
                                                        />
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="py-4 px-6">
                                                <div className="flex flex-col gap-1">
                                                    <div className="flex items-baseline gap-1">
                                                        <span className="font-bold text-emerald-500">{quota.wfa_total - quota.wfa_used}</span>
                                                        <span className="text-xs text-[var(--text-secondary)]">remaining</span>
                                                    </div>
                                                    <div className="w-24 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                                                        <div
                                                            className="h-full bg-emerald-500 rounded-full"
                                                            style={{ width: `${(quota.wfa_used / (quota.wfa_total || 1)) * 100}%` }}
                                                        />
                                                    </div>
                                                    <span className="text-[10px] text-[var(--text-muted)]">
                                                        Used: {quota.wfa_used} / {quota.wfa_total}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="py-4 px-6 text-right">
                                                <button
                                                    onClick={() => handleEdit(quota)}
                                                    className="p-2 rounded-lg hover:bg-black/10 dark:hover:bg-white/10 text-gray-400 hover:text-[var(--text-primary)] transition-colors opacity-0 group-hover:opacity-100"
                                                    title="Edit Quota"
                                                >
                                                    <Pencil className="w-4 h-4" />
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>

            {/* Edit Modal */}
            {editingQuota && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                    <Card className="w-full max-w-lg bg-card border-border shadow-xl">
                        <CardHeader className="flex flex-row items-center justify-between">
                            <div>
                                <CardTitle>Edit Quota</CardTitle>
                                <CardDescription>{editingQuota.profiles.full_name}</CardDescription>
                            </div>
                            <button onClick={() => setEditingQuota(null)} className="text-gray-400 hover:text-white">
                                <X className="w-5 h-5" />
                            </button>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-2 gap-6">
                                {/* Annual Leave */}
                                <div className="space-y-4">
                                    <h3 className="font-semibold text-amber-500 flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full bg-amber-500" />
                                        Annual Leave
                                    </h3>
                                    <div className="space-y-2">
                                        <label className="text-xs text-gray-500">Used Days</label>
                                        <input
                                            type="number"
                                            className="w-full h-9 rounded-md bg-white/5 border border-white/10 focus:outline-none focus:border-amber-500 px-3 text-sm"
                                            value={formData.annual_used}
                                            onChange={(e) => setFormData({ ...formData, annual_used: parseInt(e.target.value) || 0 })}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs text-gray-500">Total Quota</label>
                                        <input
                                            type="number"
                                            className="w-full h-9 rounded-md bg-white/5 border border-white/10 focus:outline-none focus:border-amber-500 px-3 text-sm"
                                            value={formData.annual_total}
                                            onChange={(e) => setFormData({ ...formData, annual_total: parseInt(e.target.value) || 0 })}
                                        />
                                    </div>
                                </div>

                                {/* WFH & WFA */}
                                <div className="space-y-6">
                                    {/* WFH */}
                                    <div className="space-y-4">
                                        <h3 className="font-semibold text-blue-500 flex items-center gap-2">
                                            <div className="w-2 h-2 rounded-full bg-blue-500" />
                                            WFH (Weekly)
                                        </h3>
                                        <div className="grid grid-cols-2 gap-2">
                                            <div className="space-y-2">
                                                <label className="text-xs text-gray-500">Used</label>
                                                <input
                                                    type="number"
                                                    className="w-full h-9 rounded-md bg-white/5 border border-white/10 focus:outline-none focus:border-blue-500 px-3 text-sm"
                                                    value={formData.wfh_used}
                                                    onChange={(e) => setFormData({ ...formData, wfh_used: parseInt(e.target.value) || 0 })}
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-xs text-gray-500">Limit</label>
                                                <input
                                                    type="number"
                                                    className="w-full h-9 rounded-md bg-white/5 border border-white/10 focus:outline-none focus:border-blue-500 px-3 text-sm"
                                                    value={formData.wfh_limit}
                                                    onChange={(e) => setFormData({ ...formData, wfh_limit: parseInt(e.target.value) || 0 })}
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* WFA */}
                                    <div className="space-y-4">
                                        <h3 className="font-semibold text-emerald-500 flex items-center gap-2">
                                            <div className="w-2 h-2 rounded-full bg-emerald-500" />
                                            WFA (Annual)
                                        </h3>
                                        <div className="grid grid-cols-2 gap-2">
                                            <div className="space-y-2">
                                                <label className="text-xs text-gray-500">Used</label>
                                                <input
                                                    type="number"
                                                    className="w-full h-9 rounded-md bg-white/5 border border-white/10 focus:outline-none focus:border-emerald-500 px-3 text-sm"
                                                    value={formData.wfa_used}
                                                    onChange={(e) => setFormData({ ...formData, wfa_used: parseInt(e.target.value) || 0 })}
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-xs text-gray-500">Total</label>
                                                <input
                                                    type="number"
                                                    className="w-full h-9 rounded-md bg-white/5 border border-white/10 focus:outline-none focus:border-emerald-500 px-3 text-sm"
                                                    value={formData.wfa_total}
                                                    onChange={(e) => setFormData({ ...formData, wfa_total: parseInt(e.target.value) || 0 })}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="flex justify-end gap-3 mt-8">
                                <button
                                    onClick={() => setEditingQuota(null)}
                                    className="px-4 py-2 rounded-lg text-sm font-medium hover:bg-white/5 text-gray-400 hover:text-white transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleSave}
                                    disabled={isSaving}
                                    className="px-4 py-2 rounded-lg bg-[#e8c559] text-black text-sm font-bold hover:bg-[#d6b54e] transition-colors flex items-center gap-2 disabled:opacity-50"
                                >
                                    {isSaving ? (
                                        <>
                                            <Loader2 className="w-4 h-4 animate-spin" /> Saving...
                                        </>
                                    ) : (
                                        <>
                                            <Save className="w-4 h-4" /> Save Changes
                                        </>
                                    )}
                                </button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}
        </div>
    );
}
