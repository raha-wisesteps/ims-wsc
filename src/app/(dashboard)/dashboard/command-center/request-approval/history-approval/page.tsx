"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2, RefreshCw } from "lucide-react";

// Request type config for display
const REQUEST_TYPE_CONFIG: Record<string, { label: string; icon: string; color: string }> = {
    wfh: { label: "WFH", icon: "🏠", color: "bg-purple-500" },
    wfa: { label: "WFA", icon: "📍", color: "bg-violet-500" },
    annual_leave: { label: "Cuti Tahunan", icon: "🌴", color: "bg-emerald-500" },
    sick_leave: { label: "Sakit", icon: "🤒", color: "bg-rose-500" },
    other_permission: { label: "Izin Lainnya", icon: "📋", color: "bg-gray-500" },
    self_marriage: { label: "Pernikahan", icon: "💍", color: "bg-pink-500" },
    paternity: { label: "Istri Melahirkan", icon: "👶", color: "bg-blue-400" },
    family_death: { label: "Duka", icon: "🕯️", color: "bg-gray-600" },
    overtime: { label: "Lembur", icon: "⏰", color: "bg-orange-500" },
    training: { label: "Training", icon: "🎓", color: "bg-indigo-500" },
    asset: { label: "Asset", icon: "💼", color: "bg-blue-500" },
    reimburse: { label: "Reimburse", icon: "💰", color: "bg-teal-500" },
    meeting: { label: "1-on-1", icon: "👤", color: "bg-pink-500" },
};

// Status config
const STATUS_CONFIG = {
    approved: { label: "Approved", color: "bg-emerald-500", textColor: "text-emerald-600 dark:text-emerald-400" },
    rejected: { label: "Rejected", color: "bg-rose-500", textColor: "text-rose-600 dark:text-rose-400" },
};

interface HistoryRequest {
    id: string;
    leave_type: string;
    start_date: string;
    end_date: string;
    reason: string;
    status: string;
    created_at: string;
    updated_at: string;
    total_hours?: number;
    manager_note?: string;
    profile?: {
        id: string;
        full_name: string;
        job_type: string;
        avatar_url: string;
    };
}

export default function HistoryApprovalPage() {
    const { canAccessCommandCenter } = useAuth();
    const supabase = createClient();

    const [history, setHistory] = useState<HistoryRequest[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedType, setSelectedType] = useState<string>("all");
    const [selectedStatus, setSelectedStatus] = useState<"all" | "approved" | "rejected">("all");
    const [selectedUser, setSelectedUser] = useState<string>("all");

    // Fetch history data
    const fetchHistory = async () => {
        setIsLoading(true);
        try {
            // Fetch LEAVE REQUESTS
            const { data: leaveData, error: leaveError } = await supabase
                .from("leave_requests")
                .select(`
                    id,
                    leave_type,
                    start_date,
                    end_date,
                    reason,
                    status,
                    created_at,
                    updated_at,
                    total_hours,
                    manager_note,
                    profile:profiles!profile_id (
                        id,
                        full_name,
                        job_type,
                        avatar_url
                    )
                `)
                .in("status", ["approved", "rejected"])
                .order("updated_at", { ascending: false });

            if (leaveError) throw leaveError;

            // Fetch OTHER REQUESTS (new)
            const { data: otherData, error: otherError } = await supabase
                .from("other_requests")
                .select(`
                    id,
                    request_type,
                    request_date,
                    reason,
                    status,
                    created_at,
                    updated_at,
                    amount,
                    manager_note,
                    profile:profiles!profile_id (
                        id,
                        full_name,
                        job_type,
                        avatar_url
                    )
                `)
                .in("status", ["approved", "rejected"])
                .order("updated_at", { ascending: false });

            if (otherError) throw otherError;

            // Transform and Combine
            const mappedLeaves: HistoryRequest[] = (leaveData || []).map((req: any) => ({
                id: req.id,
                leave_type: req.leave_type,
                start_date: req.start_date,
                end_date: req.end_date,
                reason: req.reason,
                status: req.status,
                created_at: req.created_at,
                updated_at: req.updated_at,
                total_hours: req.total_hours,
                manager_note: req.manager_note,
                profile: req.profile
            }));

            const mappedOthers: HistoryRequest[] = (otherData || []).map((req: any) => ({
                id: req.id,
                leave_type: req.request_type,
                start_date: req.request_date,
                end_date: req.request_date,
                reason: req.reason + (req.amount ? ` (Rp ${req.amount.toLocaleString('id-ID')})` : ''),
                status: req.status,
                created_at: req.created_at,
                updated_at: req.updated_at,
                manager_note: req.manager_note,
                profile: req.profile
            }));

            const allHistory = [...mappedLeaves, ...mappedOthers].sort(
                (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
            );

            setHistory(allHistory);
        } catch (err) {
            console.error("Error:", err);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (canAccessCommandCenter) {
            fetchHistory();
        }
    }, [canAccessCommandCenter]);

    // Get unique users for filter
    const uniqueUsers = [...new Map(history.map(h => [h.profile?.id, h.profile])).values()].filter(Boolean);

    // Get unique types for filter
    const uniqueTypes = [...new Set(history.map(h => h.leave_type))];

    // Filtered history
    const filteredHistory = history
        .filter(r => selectedType === "all" || r.leave_type === selectedType)
        .filter(r => selectedStatus === "all" || r.status === selectedStatus)
        .filter(r => selectedUser === "all" || r.profile?.id === selectedUser);

    // Stats
    const approvedCount = history.filter(r => r.status === "approved").length;
    const rejectedCount = history.filter(r => r.status === "rejected").length;

    // Helper: Get initials
    const getInitials = (name: string) => {
        return name?.split(" ").map(n => n[0]).join("").substring(0, 2).toUpperCase() || "??";
    };

    // Helper: Format date
    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
    };

    // Access check
    if (!canAccessCommandCenter) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-center p-8">
                <p className="text-4xl mb-4">🔒</p>
                <h2 className="text-2xl font-bold mb-2">Access Denied</h2>
                <p className="text-[var(--text-muted)]">Anda tidak memiliki akses ke halaman ini.</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full overflow-auto">
            {/* Page Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                <div>
                    <div className="flex items-center gap-2 text-sm text-[var(--text-muted)] mb-1">
                        <Link href="/dashboard" className="hover:text-[#3f545f] dark:hover:text-[#e8c559]">Dashboard</Link>
                        <span>/</span>
                        <Link href="/dashboard/command-center" className="hover:text-[#3f545f] dark:hover:text-[#e8c559]">Command Center</Link>
                        <span>/</span>
                        <Link href="/dashboard/command-center/request-approval" className="hover:text-[#3f545f] dark:hover:text-[#e8c559]">Request Approval</Link>
                        <span>/</span>
                        <span className="text-[var(--text-primary)]">History</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#3f545f] to-[#5f788e] dark:from-[#e8c559] dark:to-[#dcb33e] flex items-center justify-center text-2xl text-white dark:text-[#171611] shadow-lg">
                            📜
                        </div>
                        <div>
                            <h2 className="text-3xl font-bold tracking-tight text-[var(--text-primary)]">History Approval</h2>
                            <p className="text-[var(--text-secondary)] text-sm">Riwayat request yang sudah diproses</p>
                        </div>
                    </div>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={fetchHistory}
                        disabled={isLoading}
                        className="px-4 py-2 rounded-lg bg-[var(--glass-bg)] hover:bg-[var(--glass-border)] border border-[var(--glass-border)] text-[var(--text-secondary)] transition-colors flex items-center gap-2"
                    >
                        <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                        Refresh
                    </button>
                    <Link
                        href="/dashboard/command-center/request-approval"
                        className="px-4 py-2 rounded-lg bg-[var(--glass-bg)] hover:bg-[var(--glass-border)] text-[var(--text-secondary)] font-medium transition-colors flex items-center gap-2"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" />
                        </svg>
                        Kembali
                    </Link>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="glass-panel p-4 rounded-xl text-center">
                    <p className="text-2xl font-bold text-[var(--text-primary)]">{history.length}</p>
                    <p className="text-xs text-[var(--text-muted)]">Total Diproses</p>
                </div>
                <div className="glass-panel p-4 rounded-xl text-center">
                    <p className="text-2xl font-bold text-emerald-500">{approvedCount}</p>
                    <p className="text-xs text-[var(--text-muted)]">Approved</p>
                </div>
                <div className="glass-panel p-4 rounded-xl text-center">
                    <p className="text-2xl font-bold text-rose-500">{rejectedCount}</p>
                    <p className="text-xs text-[var(--text-muted)]">Rejected</p>
                </div>
            </div>

            {/* Filters */}
            <div className="flex flex-col md:flex-row gap-4 mb-6">
                {/* Status Filter */}
                <div className="flex gap-2">
                    <button
                        onClick={() => setSelectedStatus("all")}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${selectedStatus === "all"
                            ? "bg-[#3f545f] dark:bg-[#e8c559] text-white dark:text-[#171611]"
                            : "bg-[var(--glass-bg)] text-[var(--text-secondary)] hover:bg-[var(--glass-border)]"
                            }`}
                    >
                        Semua Status
                    </button>
                    <button
                        onClick={() => setSelectedStatus("approved")}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${selectedStatus === "approved"
                            ? "bg-emerald-500 text-white"
                            : "bg-[var(--glass-bg)] text-[var(--text-secondary)] hover:bg-[var(--glass-border)]"
                            }`}
                    >
                        ✅ Approved
                    </button>
                    <button
                        onClick={() => setSelectedStatus("rejected")}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${selectedStatus === "rejected"
                            ? "bg-rose-500 text-white"
                            : "bg-[var(--glass-bg)] text-[var(--text-secondary)] hover:bg-[var(--glass-border)]"
                            }`}
                    >
                        ❌ Rejected
                    </button>
                </div>

                {/* Type Filter */}
                <select
                    value={selectedType}
                    onChange={(e) => setSelectedType(e.target.value)}
                    className="px-4 py-2 rounded-lg bg-[var(--glass-bg)] border border-[var(--glass-border)] text-[var(--text-secondary)] text-sm"
                >
                    <option value="all">Semua Tipe</option>
                    {uniqueTypes.map(type => (
                        <option key={type} value={type}>
                            {REQUEST_TYPE_CONFIG[type]?.label || type}
                        </option>
                    ))}
                </select>

                {/* User Filter */}
                <select
                    value={selectedUser}
                    onChange={(e) => setSelectedUser(e.target.value)}
                    className="px-4 py-2 rounded-lg bg-[var(--glass-bg)] border border-[var(--glass-border)] text-[var(--text-secondary)] text-sm"
                >
                    <option value="all">Semua User</option>
                    {uniqueUsers.map(user => (
                        <option key={user?.id} value={user?.id}>
                            {user?.full_name}
                        </option>
                    ))}
                </select>
            </div>

            {/* History List */}
            <div className="glass-panel rounded-xl overflow-hidden flex-1">
                <div className="p-4 border-b border-[var(--glass-border)] flex items-center justify-between">
                    <h3 className="font-semibold text-[var(--text-primary)]">
                        📜 Riwayat ({filteredHistory.length})
                    </h3>
                </div>

                <div className="divide-y divide-[var(--glass-border)] max-h-[500px] overflow-y-auto">
                    {isLoading ? (
                        <div className="p-8 text-center text-[var(--text-muted)]">
                            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2" />
                            <p>Memuat data...</p>
                        </div>
                    ) : filteredHistory.length === 0 ? (
                        <div className="p-8 text-center text-[var(--text-muted)]">
                            <p className="text-4xl mb-2">📭</p>
                            <p>Tidak ada riwayat</p>
                        </div>
                    ) : (
                        filteredHistory.map((request) => {
                            const typeConfig = REQUEST_TYPE_CONFIG[request.leave_type] || { label: request.leave_type, icon: "📋", color: "bg-gray-500" };
                            const statusConfig = STATUS_CONFIG[request.status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.approved;

                            return (
                                <div
                                    key={request.id}
                                    className="p-4 hover:bg-black/5 dark:hover:bg-white/5 transition-colors flex items-start gap-4"
                                >
                                    {/* Avatar */}
                                    <div className="w-10 h-10 rounded-full bg-[var(--primary)] flex items-center justify-center text-[var(--primary-foreground)] text-sm font-bold flex-shrink-0">
                                        {getInitials(request.profile?.full_name || "??")}
                                    </div>

                                    {/* Type Icon */}
                                    <div className={`w-10 h-10 rounded-xl ${typeConfig.color} flex items-center justify-center text-lg text-white flex-shrink-0`}>
                                        {typeConfig.icon}
                                    </div>

                                    {/* Content */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                                            <p className="font-medium text-[var(--text-primary)]">{typeConfig.label}</p>
                                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${statusConfig.color} text-white`}>
                                                {statusConfig.label}
                                            </span>
                                        </div>
                                        <p className="text-sm text-[var(--text-secondary)] mb-1 truncate">{request.reason}</p>
                                        <div className="flex items-center gap-3 text-xs text-[var(--text-muted)] flex-wrap">
                                            <span>👤 {request.profile?.full_name}</span>
                                            <span className="opacity-60">• {request.profile?.job_type}</span>
                                            <span>📅 {formatDate(request.start_date)}{request.start_date !== request.end_date && ` - ${formatDate(request.end_date)}`}</span>
                                            {request.total_hours && <span>⏰ {request.total_hours} jam</span>}
                                        </div>
                                        <p className={`text-xs mt-2 ${request.status === "approved" ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
                                            {request.status === "approved" ? "✅" : "❌"} {statusConfig.label} • {formatDate(request.updated_at)}
                                        </p>
                                        {request.manager_note && (
                                            <p className="text-xs text-rose-500 mt-1 italic">📝 {request.manager_note}</p>
                                        )}
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>
        </div>
    );
}
