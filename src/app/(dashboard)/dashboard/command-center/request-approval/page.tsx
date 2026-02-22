"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { CheckCircle, XCircle, Loader2, RefreshCw, ClipboardCheck, ChevronRight } from "lucide-react";
import { sendEmailNotification } from "@/lib/email-notification";

// Request type config for display - aligned with my-request page
const REQUEST_TYPE_CONFIG: Record<string, { label: string; icon: string; color: string }> = {
    // Flexible Work
    wfh: { label: "WFH", icon: "🏠", color: "bg-purple-500" },
    wfa: { label: "WFA", icon: "📍", color: "bg-violet-500" },

    // Leave types - all match /leave page (bg-emerald-500)
    annual_leave: { label: "Cuti Tahunan", icon: "🌴", color: "bg-emerald-500" },
    menstrual_leave: { label: "Cuti Haid", icon: "🩸", color: "bg-emerald-500" },
    maternity: { label: "Cuti Melahirkan", icon: "🤰", color: "bg-emerald-500" },
    miscarriage: { label: "Cuti Keguguran", icon: "🚑", color: "bg-emerald-500" },
    self_marriage: { label: "Pernikahan Sendiri", icon: "💍", color: "bg-emerald-500" },
    child_marriage: { label: "Pernikahan Anak", icon: "💒", color: "bg-emerald-500" },
    paternity: { label: "Istri Melahirkan", icon: "👶", color: "bg-emerald-500" },
    wife_miscarriage: { label: "Istri Keguguran", icon: "💔", color: "bg-emerald-500" },
    child_event: { label: "Khitanan/Baptis", icon: "✨", color: "bg-emerald-500" },
    family_death: { label: "Keluarga Inti Meninggal", icon: "👪", color: "bg-emerald-500" },
    household_death: { label: "Serumah Meninggal", icon: "🏠", color: "bg-emerald-500" },
    sibling_death: { label: "Saudara Meninggal", icon: "🕯️", color: "bg-emerald-500" },
    hajj: { label: "Ibadah Haji", icon: "🕋", color: "bg-emerald-500" },
    government: { label: "Panggilan Pemerintah", icon: "🏛️", color: "bg-emerald-500" },
    disaster: { label: "Bencana", icon: "🌊", color: "bg-emerald-500" },
    other_permission: { label: "Izin Lainnya", icon: "📋", color: "bg-emerald-500" },

    // Sick Leave
    sick_leave: { label: "Sakit", icon: "🤒", color: "bg-rose-500" },

    // Business Trip
    business_trip: { label: "Perjalanan Dinas", icon: "✈️", color: "bg-amber-500" },

    // Overtime
    overtime: { label: "Lembur", icon: "⏰", color: "bg-orange-500" },

    // Training
    training: { label: "Training", icon: "🎓", color: "bg-indigo-500" },

    // Asset
    asset: { label: "Asset", icon: "💻", color: "bg-blue-500" },

    // Reimburse
    reimburse: { label: "Reimburse", icon: "💰", color: "bg-teal-500" },

    // 1-on-1
    meeting: { label: "1-on-1", icon: "🗣️", color: "bg-pink-500" },
    one_on_one: { label: "1-on-1", icon: "🗣️", color: "bg-pink-500" },
};

// Category mapping for filtering
const CATEGORY_MAP: Record<string, string[]> = {
    izin_absensi: ["wfh", "wfa", "annual_leave", "sick_leave", "menstrual_leave", "maternity", "miscarriage", "self_marriage", "child_marriage", "paternity", "wife_miscarriage", "child_event", "family_death", "household_death", "sibling_death", "hajj", "government", "disaster", "other_permission"],
    tugas_lembur: ["overtime", "business_trip"],
    fasilitas_pengembangan: ["training", "reimburse", "asset", "meeting", "one_on_one"],
};

interface PendingRequest {
    id: string;
    leave_type: string;
    start_date: string;
    end_date: string;
    reason: string;
    status: string;
    created_at: string;
    total_hours?: number;
    compensation_type?: string;
    start_time?: string;
    end_time?: string;
    destination?: string; // For business trips
    source_table?: 'leave_requests' | 'business_trips'; // Track origin
    profile: {
        id: string;
        full_name: string;
        job_type: string;
        avatar_url: string | null;
    };
}

export default function RequestApprovalPage() {
    const { user, profile, canAccessCommandCenter } = useAuth();
    const supabase = createClient();

    const [requests, setRequests] = useState<PendingRequest[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [processingId, setProcessingId] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [filterCategory, setFilterCategory] = useState<string>("all");
    const [filterType, setFilterType] = useState<string>("all");
    const [filterUser, setFilterUser] = useState<string>("all");

    // Get unique users and types for filters
    const uniqueUsers = [...new Map(requests.map(r => [r.profile?.id, r.profile])).values()].filter(Boolean);
    const uniqueTypes = [...new Set(requests.map(r => r.leave_type))];

    // Category stats
    const categoryStats = {
        izin_absensi: requests.filter(r => CATEGORY_MAP.izin_absensi.includes(r.leave_type)).length,
        tugas_lembur: requests.filter(r => CATEGORY_MAP.tugas_lembur.includes(r.leave_type)).length,
        fasilitas_pengembangan: requests.filter(r => CATEGORY_MAP.fasilitas_pengembangan.includes(r.leave_type)).length,
    };

    // Filtered requests
    const filteredRequests = requests
        .filter(r => filterCategory === "all" || (CATEGORY_MAP[filterCategory]?.includes(r.leave_type) ?? false))
        .filter(r => filterType === "all" || r.leave_type === filterType)
        .filter(r => filterUser === "all" || r.profile?.id === filterUser);

    // Fetch pending requests
    const fetchRequests = async () => {
        setIsLoading(true);
        setError(null);

        try {
            // Fetch pending leave requests
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
                    total_hours,
                    compensation_type,
                    start_time,
                    end_time,
                    profile:profiles!profile_id (
                        id,
                        full_name,
                        job_type,
                        avatar_url
                    )
                `)
                .eq("status", "pending")
                .order("created_at", { ascending: false });

            if (leaveError) throw leaveError;

            // Fetch pending OTHER requests (training, reimburse, etc.)
            const { data: otherData, error: otherError } = await supabase
                .from("other_requests")
                .select(`
                    id,
                    request_type,
                    request_date,
                    reason,
                    status,
                    created_at,
                    amount,
                    attachment_url,
                    profile:profiles!profile_id (
                        id,
                        full_name,
                        job_type,
                        avatar_url
                    )
                `)
                .eq("status", "pending")
                .order("created_at", { ascending: false });

            if (otherError) throw otherError;

            // Transform leave requests
            const transformedLeaves: PendingRequest[] = (leaveData || []).map((req: any) => ({
                ...req,
                source_table: 'leave_requests'
            }));

            // Transform other requests
            // Map 'request_type' to 'leave_type', 'request_date' to 'start_date', 'reason' to 'reason'
            const transformedOthers: PendingRequest[] = (otherData || []).map((req: any) => ({
                id: req.id,
                leave_type: req.request_type,
                start_date: req.request_date,
                end_date: req.request_date,
                reason: req.reason + (req.amount ? ` (Rp ${req.amount.toLocaleString('id-ID')})` : ''),
                status: req.status,
                created_at: req.created_at,
                source_table: 'other_requests',
                profile: req.profile
            }));

            // Combine and sort by created_at DESC
            const allRequests = [...transformedLeaves, ...transformedOthers].sort(
                (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
            );

            setRequests(allRequests);
        } catch (err) {
            console.error("Error:", err);
            setError("Terjadi kesalahan saat memuat data");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (canAccessCommandCenter) {
            fetchRequests();
        }
    }, [canAccessCommandCenter]);

    // Handle approve
    const handleApprove = async (requestId: string) => {
        if (!user) return;

        setProcessingId(requestId);

        // Find the request being approved
        const request = requests.find(r => r.id === requestId);
        if (!request) {
            setError("Request tidak ditemukan");
            setProcessingId(null);
            return;
        }

        try {
            // Determine which table to update based on source_table
            // Default to leave_requests if not specified (legacy safety)
            const tableName = request.source_table || 'leave_requests';

            // 1. Update request status to approved
            const { error: updateError } = await supabase
                // @ts-ignore - Dynamic table name
                .from(tableName)
                .update({
                    status: "approved",
                    manager_id: user.id,
                    updated_at: new Date().toISOString(),
                })
                .eq("id", requestId);

            if (updateError) {
                console.error("Approve error:", updateError);
                setError("Gagal menyetujui: " + updateError.message);
                return;
            }

            // Client-side daily_checkins generation REMOVED.
            // It is now handled by the database trigger `handle_leave_approval_final`.

            // Special handling for OVERTIME - update profile status immediately for UI feedback
            if (request.leave_type === 'overtime') {
                const today = new Date().toISOString().split('T')[0];
                const startDate = new Date(request.start_date).toISOString().split('T')[0];
                const endDate = new Date(request.end_date).toISOString().split('T')[0];

                // Check if today is within the overtime period
                if (today >= startDate && today <= endDate) {
                    const { error: profileError } = await supabase
                        .from('profiles')
                        .update({ status: 'lembur' })
                        .eq('id', request.profile.id);

                    if (profileError) {
                        console.error('Error updating profile status to Lembur:', JSON.stringify(profileError));
                    } else {
                        console.log(`Updated profile status to Lembur for profile ${request.profile.id}`);
                    }
                }
            }

            // Create notification for the user
            await supabase
                .from('notifications')
                .insert({
                    profile_id: request.profile.id,
                    type: 'success', // Standard type for approved
                    title: 'Permintaan Disetujui',
                    message: `Permintaan ${REQUEST_TYPE_CONFIG[request.leave_type]?.label || request.leave_type} Anda telah disetujui.`,
                    related_request_id: request.id,
                    related_request_type: request.leave_type,
                });

            // Send approval confirmation email to the requester (all request types)
            await sendEmailNotification({
                type: "request_approved_user",
                request_id: request.id,
                profile_id: request.profile.id,
                leave_type: request.leave_type,
                requester_name: request.profile.full_name || "Karyawan",
                start_date: request.start_date,
                end_date: request.end_date,
                reason: request.reason || "",
            });

            // Send email notification to HR for izin/sakit types
            const HR_NOTIFY_TYPES = [
                "sick_leave", "self_marriage", "child_marriage", "paternity",
                "wife_miscarriage", "child_event", "family_death", "household_death",
                "sibling_death", "hajj", "government", "disaster", "other_permission",
                "menstrual_leave", "maternity", "miscarriage", "overtime",
            ];
            if (HR_NOTIFY_TYPES.includes(request.leave_type)) {
                sendEmailNotification({
                    type: "approved_leave",
                    request_id: request.id,
                    profile_id: request.profile.id,
                    leave_type: request.leave_type,
                    requester_name: request.profile.full_name || "Karyawan",
                    start_date: request.start_date,
                    end_date: request.end_date,
                    reason: request.reason || "",
                });
            }

            // Remove from list
            setRequests(prev => prev.filter(r => r.id !== requestId));

        } catch (err) {
            console.error("Error:", err);
            setError("Terjadi kesalahan");
        } finally {
            setProcessingId(null);
        }
    };



    // Handle reject
    const handleReject = async (requestId: string) => {
        if (!user) return;

        // Find the request being rejected
        const request = requests.find(r => r.id === requestId);
        if (!request) {
            setError("Request tidak ditemukan");
            return;
        }

        const note = prompt("Alasan penolakan (opsional):");

        setProcessingId(requestId);

        try {
            // Determine which table to update based on source_table
            const tableName = request.source_table || 'leave_requests';

            const { error: updateError } = await supabase
                .from(tableName)
                .update({
                    status: "rejected",
                    manager_id: user.id,
                    manager_note: note || null,
                    updated_at: new Date().toISOString(),
                })
                .eq("id", requestId);

            if (updateError) {
                console.error("Reject error:", updateError);
                setError("Gagal menolak: " + updateError.message);
                setProcessingId(null);
                return;
            }

            // Create rejection notification for the user
            await supabase
                .from('notifications')
                .insert({
                    profile_id: request.profile.id,
                    type: 'request_rejected',
                    title: 'Permintaan Ditolak',
                    message: request.leave_type === 'business_trip'
                        ? `Perjalanan dinas Anda ditolak.${note ? ' Alasan: ' + note : ''}`
                        : `Permintaan ${REQUEST_TYPE_CONFIG[request.leave_type]?.label || request.leave_type} ditolak.${note ? ' Alasan: ' + note : ''}`,
                    related_request_id: request.id,
                    related_request_type: request.leave_type,
                });

            // Send rejection email to the requester
            await sendEmailNotification({
                type: "request_rejected_user",
                request_id: request.id,
                profile_id: request.profile.id,
                leave_type: request.leave_type,
                requester_name: request.profile.full_name || "Karyawan",
                start_date: request.start_date,
                end_date: request.end_date,
                reason: request.reason || "",
                reject_reason: note || "",
            });

            // Remove from list
            setRequests(prev => prev.filter(r => r.id !== requestId));
        } catch (err) {
            console.error("Error:", err);
            setError("Terjadi kesalahan");
        } finally {
            setProcessingId(null);
        }
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

    // Helper: Get initials
    const getInitials = (name: string) => {
        return name?.split(" ").map(n => n[0]).join("").substring(0, 2).toUpperCase() || "??";
    };

    // Helper: Format date
    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
    };

    // Helper: Calculate days
    const calculateDays = (start: string, end: string) => {
        const s = new Date(start);
        const e = new Date(end);
        return Math.ceil((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    };

    return (
        <div className="flex flex-col h-full overflow-hidden">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                        <ClipboardCheck className="w-6 h-6 text-emerald-500" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2 mb-1 text-sm text-[var(--text-secondary)]">
                            <Link href="/dashboard" className="hover:text-[var(--text-primary)] transition-colors">Dashboard</Link>
                            <ChevronRight className="h-4 w-4" />
                            <Link href="/dashboard/command-center" className="hover:text-[var(--text-primary)] transition-colors">Command Center</Link>
                            <ChevronRight className="h-4 w-4" />
                            <span>Request Approval</span>
                        </div>
                        <h1 className="text-2xl font-bold text-[var(--text-primary)]">Request Approval</h1>
                        <p className="text-sm text-[var(--text-secondary)]">Review dan setujui permintaan staff</p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={fetchRequests}
                        disabled={isLoading}
                        className="px-4 py-2 rounded-lg bg-[var(--glass-bg)] hover:bg-[var(--glass-border)] border border-[var(--glass-border)] text-[var(--text-secondary)] transition-colors flex items-center gap-2"
                    >
                        <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                        Refresh
                    </button>
                    <Link
                        href="/dashboard/command-center/request-approval/history-approval"
                        className="px-4 py-2 rounded-lg bg-[var(--glass-bg)] hover:bg-[var(--glass-border)] border border-[var(--glass-border)] text-[var(--text-secondary)] transition-colors flex items-center gap-2"
                    >
                        <span>📜</span> History
                    </Link>
                </div>
            </div>

            {/* Error Display */}
            {error && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-red-500 dark:text-red-400 text-sm mb-4">
                    {error}
                </div>
            )}

            {/* Category Filter */}
            <div className="mb-3">
                <p className="text-xs text-[var(--text-muted)] mb-2 font-medium">Filter Kategori</p>
                <div className="flex gap-2 overflow-x-auto pb-2">
                    <button
                        onClick={() => setFilterCategory("all")}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${filterCategory === "all"
                            ? "bg-[#3f545f] dark:bg-[#e8c559] text-white dark:text-[#171611]"
                            : "bg-[var(--glass-bg)] text-[var(--text-secondary)] hover:bg-[var(--glass-border)]"
                            }`}
                    >
                        📋 Semua ({requests.length})
                    </button>
                    <button
                        onClick={() => setFilterCategory("izin_absensi")}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${filterCategory === "izin_absensi"
                            ? "bg-purple-500 text-white"
                            : "bg-[var(--glass-bg)] text-[var(--text-secondary)] hover:bg-[var(--glass-border)]"
                            }`}
                    >
                        🏠 Izin & Absensi ({categoryStats.izin_absensi})
                    </button>
                    <button
                        onClick={() => setFilterCategory("tugas_lembur")}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${filterCategory === "tugas_lembur"
                            ? "bg-amber-500 text-white"
                            : "bg-[var(--glass-bg)] text-[var(--text-secondary)] hover:bg-[var(--glass-border)]"
                            }`}
                    >
                        🚀 Tugas & Lembur ({categoryStats.tugas_lembur})
                    </button>
                    <button
                        onClick={() => setFilterCategory("fasilitas_pengembangan")}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${filterCategory === "fasilitas_pengembangan"
                            ? "bg-blue-500 text-white"
                            : "bg-[var(--glass-bg)] text-[var(--text-secondary)] hover:bg-[var(--glass-border)]"
                            }`}
                    >
                        📁 Fasilitas & Pengembangan ({categoryStats.fasilitas_pengembangan})
                    </button>
                </div>
            </div>

            {/* Additional Filters */}
            <div className="flex flex-wrap gap-4 mb-4">
                <select
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value)}
                    className="px-4 py-2 rounded-lg bg-[var(--glass-bg)] border border-[var(--glass-border)] text-[var(--text-secondary)] text-sm"
                >
                    <option value="all">Semua Tipe</option>
                    {uniqueTypes.map(type => (
                        <option key={type} value={type}>
                            {REQUEST_TYPE_CONFIG[type]?.label || type}
                        </option>
                    ))}
                </select>
                <select
                    value={filterUser}
                    onChange={(e) => setFilterUser(e.target.value)}
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

            {/* Content */}
            <div className="glass-panel p-6 rounded-xl flex-1 overflow-auto">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-lg text-[var(--text-primary)]">
                        Pending Requests ({filteredRequests.length})
                    </h3>
                </div>

                {isLoading ? (
                    <div className="flex flex-col items-center justify-center py-12 text-[var(--text-muted)]">
                        <Loader2 className="w-8 h-8 animate-spin mb-2" />
                        <p>Memuat data...</p>
                    </div>
                ) : filteredRequests.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-[var(--text-muted)]">
                        <p className="text-4xl mb-2">✨</p>
                        <p>Tidak ada request pending</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {filteredRequests.map(req => {
                            const typeConfig = REQUEST_TYPE_CONFIG[req.leave_type] || { label: req.leave_type, icon: "📋", color: "bg-gray-500" };
                            const days = calculateDays(req.start_date, req.end_date);
                            const isProcessing = processingId === req.id;

                            return (
                                <div key={req.id} className="p-4 rounded-lg bg-[var(--surface-color)] border border-[var(--glass-border)] flex flex-col md:flex-row items-start justify-between gap-4">
                                    <div className="flex gap-4 flex-1">
                                        {/* Avatar */}
                                        <div className="w-12 h-12 rounded-full bg-[var(--primary)] flex items-center justify-center text-[var(--primary-foreground)] font-bold text-sm flex-shrink-0">
                                            {getInitials(req.profile?.full_name || "??")}
                                        </div>

                                        {/* Type Badge */}
                                        <div className={`w-12 h-12 rounded-xl ${typeConfig.color} flex items-center justify-center text-xl text-white flex-shrink-0`}>
                                            {typeConfig.icon}
                                        </div>

                                        {/* Content */}
                                        <div className="flex-1 min-w-0">
                                            <p className="font-semibold text-[var(--text-primary)]">
                                                {req.profile?.full_name || "Unknown"}
                                                <span className="text-xs font-normal text-[var(--text-muted)] ml-2">• {req.profile?.job_type || "Staff"}</span>
                                            </p>
                                            <p className="font-medium mt-1 text-[var(--text-primary)]">
                                                {typeConfig.label}
                                                <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-600 dark:text-amber-400 ml-2">
                                                    {days > 1 ? `${days} hari` : "1 hari"}
                                                </span>
                                                {req.total_hours && (
                                                    <span className="text-xs px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-600 dark:text-orange-400 ml-2">
                                                        {req.total_hours} jam
                                                    </span>
                                                )}
                                            </p>
                                            <p className="text-sm text-[var(--text-secondary)] mt-1 line-clamp-2">{req.reason}</p>
                                            <p className="text-xs text-[var(--text-muted)] mt-2">
                                                📅 {formatDate(req.start_date)} {req.start_date !== req.end_date && `- ${formatDate(req.end_date)}`}
                                                <span className="ml-3">• Diajukan {formatDate(req.created_at)}</span>
                                            </p>
                                        </div>
                                    </div>

                                    {/* Actions */}
                                    <div className="flex gap-2 flex-shrink-0">
                                        <button
                                            onClick={() => handleApprove(req.id)}
                                            disabled={isProcessing}
                                            className="px-4 py-2 rounded-lg bg-green-500 hover:bg-green-600 text-white text-sm font-medium transition-colors flex items-center gap-2 disabled:opacity-50"
                                        >
                                            {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                                            Approve
                                        </button>
                                        <button
                                            onClick={() => handleReject(req.id)}
                                            disabled={isProcessing}
                                            className="px-4 py-2 rounded-lg bg-red-500 hover:bg-red-600 text-white text-sm font-medium transition-colors flex items-center gap-2 disabled:opacity-50"
                                        >
                                            {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                                            Reject
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
