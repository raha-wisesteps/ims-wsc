"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Plus, Clock, CheckCircle, XCircle, AlertCircle, ChevronRight, Calendar, Home, Thermometer, GraduationCap, DollarSign, Users, Package, Loader2, RefreshCw, Briefcase, ClipboardList } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

// Request type definitions with icons and colors
const REQUEST_TYPES = [
    // Top Row
    { id: "flexible-work", label: "WFH/WFA", icon: Home, color: "bg-gradient-to-br from-purple-500 to-violet-500", href: "/dashboard/my-request/flexible-work", row: 1 },
    { id: "leave", label: "Izin/Cuti", icon: Calendar, color: "bg-emerald-500", href: "/dashboard/my-request/leave", row: 1 },
    { id: "overtime", label: "Lembur", icon: Clock, color: "bg-orange-500", href: "/dashboard/my-request/overtime", row: 1 },
    // Bottom Row
    { id: "training", label: "Training", icon: GraduationCap, color: "bg-indigo-500", href: "/dashboard/my-request/training", row: 2 },
    { id: "reimburse", label: "Reimburse", icon: DollarSign, color: "bg-teal-500", href: "/dashboard/my-request/reimburse", row: 2 },
    { id: "asset", label: "Asset", icon: Package, color: "bg-blue-500", href: "/dashboard/my-request/asset", row: 2 },
    { id: "one-on-one", label: "1-on-1", icon: Users, color: "bg-pink-500", href: "/dashboard/my-request/one-on-one", row: 2 },
];

// Leave type config for display
// Colors are aligned with their dedicated submission pages for visual consistency
const LEAVE_TYPE_CONFIG: Record<string, { label: string; icon: string; color: string }> = {
    // Flexible Work - matches /flexible-work page
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

    // Sick Leave - matches /sakit page (bg-rose-500)
    sick_leave: { label: "Sakit", icon: "🤒", color: "bg-rose-500" },

    // Business Trip - matches /business-trip page (bg-amber-500)
    business_trip: { label: "Dinas", icon: "💼", color: "bg-amber-500" },

    // Overtime - matches /overtime page (bg-orange-500)
    overtime: { label: "Lembur", icon: "⏰", color: "bg-orange-500" },

    // Training - matches /training page (bg-indigo-500)
    training: { label: "Training", icon: "🎓", color: "bg-indigo-500" },

    // Asset - matches /asset page (bg-blue-500)
    asset: { label: "Asset", icon: "💻", color: "bg-blue-500" },

    // Reimburse - matches /reimburse page (bg-teal-500)
    reimburse: { label: "Reimburse", icon: "💰", color: "bg-teal-500" },

    // 1-on-1 - matches /one-on-one page (bg-pink-500)
    meeting: { label: "1-on-1", icon: "🗣️", color: "bg-pink-500" },
    "1-on-1": { label: "1-on-1", icon: "🗣️", color: "bg-pink-500" },
    one_on_one: { label: "1-on-1", icon: "🗣️", color: "bg-pink-500" }, // DB format
};

// Status configuration
const STATUS_CONFIG = {
    pending: { label: "Pending", icon: AlertCircle, color: "text-amber-500", bg: "bg-amber-500/10" },
    approved: { label: "Approved", icon: CheckCircle, color: "text-emerald-500", bg: "bg-emerald-500/10" },
    rejected: { label: "Rejected", icon: XCircle, color: "text-rose-500", bg: "bg-rose-500/10" },
};

// Category mapping for filtering
const CATEGORY_MAP: Record<string, string[]> = {
    "izin_absensi": ["wfh", "wfa", "annual_leave", "sick_leave", "menstrual_leave", "maternity", "miscarriage", "self_marriage", "child_marriage", "paternity", "wife_miscarriage", "child_event", "family_death", "household_death", "sibling_death", "hajj", "government", "disaster", "other_permission"],
    "tugas_lembur": ["overtime", "business_trip"],
    "fasilitas_pengembangan": ["training", "reimburse", "asset", "meeting", "one_on_one"],
};

interface LeaveRequest {
    id: string;
    leave_type: string;
    start_date: string;
    end_date: string;
    reason: string;
    status: string;
    created_at: string;
    total_hours?: number;
    amount?: number; // For reimburse requests
    source_table?: string; // To track which table the request came from
}

export default function MyRequestPage() {
    const { user, profile, leaveQuota } = useAuth();
    const supabase = createClient();
    const isIntern = profile?.job_type === 'intern';

    const [requests, setRequests] = useState<LeaveRequest[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>("all");
    const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>("all");
    const [activeSlide, setActiveSlide] = useState(0);

    // Fetch user's requests from both tables
    const fetchRequests = async () => {
        if (!user) return;

        setIsLoading(true);
        try {
            // Fetch from leave_requests table
            const { data: leaveData, error: leaveError } = await supabase
                .from("leave_requests")
                .select("id, leave_type, start_date, end_date, reason, status, created_at, total_hours")
                .eq("profile_id", user.id)
                .order("created_at", { ascending: false });

            if (leaveError) {
                console.error("Fetch leave_requests error:", leaveError);
            }

            // Fetch from other_requests table
            const { data: otherData, error: otherError } = await supabase
                .from("other_requests")
                .select("id, request_type, request_date, reason, status, created_at, amount")
                .eq("profile_id", user.id)
                .order("created_at", { ascending: false });

            if (otherError) {
                console.error("Fetch other_requests error:", otherError);
            }

            // Transform other_requests to match LeaveRequest interface
            interface OtherRequestItem {
                id: string;
                request_type: string;
                request_date: string;
                reason: string | null;
                status: string;
                created_at: string;
                amount: number | null;
            }
            const transformedOtherData: LeaveRequest[] = (otherData || []).map((item: OtherRequestItem) => ({
                id: item.id,
                leave_type: item.request_type,
                start_date: item.request_date,
                end_date: item.request_date, // Single date requests
                reason: item.reason || "",
                status: item.status,
                created_at: item.created_at,
                amount: item.amount ?? undefined,
                source_table: "other_requests"
            }));

            // Combine and sort by created_at
            const combined = [
                ...(leaveData || []).map((item: LeaveRequest & { source_table?: string }) => ({ ...item, source_table: "leave_requests" as const })),
                ...transformedOtherData
            ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

            setRequests(combined);
        } catch (err) {
            console.error("Error:", err);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (user) {
            fetchRequests();
        }
    }, [user]);

    // Filter requests by both category and status
    const filteredRequests = requests.filter(r => {
        // Category filter
        const categoryMatch = selectedCategoryFilter === "all" ||
            (CATEGORY_MAP[selectedCategoryFilter]?.includes(r.leave_type) ?? false);

        // Status filter
        const statusMatch = selectedStatusFilter === "all" || r.status === selectedStatusFilter;

        return categoryMatch && statusMatch;
    });

    // Stats (calculate from all requests, not filtered)
    const stats = {
        pending: requests.filter(r => r.status === "pending").length,
        approved: requests.filter(r => r.status === "approved").length,
        rejected: requests.filter(r => r.status === "rejected").length,
    };

    // Category stats
    const categoryStats = {
        izin_absensi: requests.filter(r => CATEGORY_MAP.izin_absensi.includes(r.leave_type)).length,
        tugas_lembur: requests.filter(r => CATEGORY_MAP.tugas_lembur.includes(r.leave_type)).length,
        fasilitas_pengembangan: requests.filter(r => CATEGORY_MAP.fasilitas_pengembangan.includes(r.leave_type)).length,
    };

    // Helper: Format date
    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString("id-ID", { day: "numeric", month: "short" });
    };

    // Helper: Get dedicated page URL from leave_type
    const getRequestPageUrl = (leaveType: string): string => {
        // Flexible work types
        if (["wfh", "wfa"].includes(leaveType)) {
            return "/dashboard/my-request/flexible-work";
        }
        // Leave/permission types
        if ([
            "annual_leave", "menstrual_leave", "maternity", "miscarriage",
            "self_marriage", "child_marriage", "paternity", "wife_miscarriage",
            "child_event", "family_death", "household_death", "sibling_death",
            "hajj", "government", "disaster", "other_permission", "extra_leave"
        ].includes(leaveType)) {
            return "/dashboard/my-request/leave";
        }
        // Sick leave
        if (leaveType === "sick_leave") {
            return "/dashboard/my-request/sakit";
        }
        // Business trip
        if (leaveType === "business_trip") {
            return "/dashboard/my-request/business-trip";
        }
        // Overtime
        if (leaveType === "overtime") {
            return "/dashboard/my-request/overtime";
        }
        // Training
        if (leaveType === "training") {
            return "/dashboard/my-request/training";
        }
        // Reimburse
        if (leaveType === "reimburse") {
            return "/dashboard/my-request/reimburse";
        }
        // Asset
        if (leaveType === "asset") {
            return "/dashboard/my-request/asset";
        }
        // 1-on-1 / Meeting
        if (["meeting", "one_on_one", "1-on-1"].includes(leaveType)) {
            return "/dashboard/my-request/one-on-one";
        }
        // Default fallback
        return "/dashboard/my-request";
    };

    return (
        <div className="flex flex-col h-full overflow-auto">
            {/* Page Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                <div>
                    <div className="flex items-center gap-2 text-sm text-[var(--text-muted)] mb-1">
                        <Link href="/dashboard" className="hover:text-[#3f545f] dark:hover:text-[#e8c559]">Dashboard</Link>
                        <ChevronRight className="w-4 h-4 text-[var(--text-muted)]" />
                        <span className="text-[var(--text-primary)]">My Request</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
                            <ClipboardList className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h2 className="text-3xl font-bold tracking-tight text-[var(--text-primary)]">My Request</h2>
                            <p className="text-[var(--text-secondary)] text-sm">Kelola semua pengajuan Anda</p>
                        </div>
                    </div>
                </div>
                <button
                    onClick={fetchRequests}
                    disabled={isLoading}
                    className="px-4 py-2 rounded-lg bg-[var(--glass-bg)] hover:bg-[var(--glass-border)] border border-[var(--glass-border)] text-[var(--text-secondary)] transition-colors flex items-center gap-2"
                >
                    <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                    Refresh
                </button>
            </div>

            {/* Quota Summary Cards */}
            <div className="glass-panel rounded-xl p-5 mb-6">
                <h3 className="font-semibold text-[var(--text-primary)] mb-4 flex items-center gap-2">
                    📊 Ringkasan Kuota
                </h3>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* WFH Weekly */}
                    <div className="p-4 rounded-xl bg-purple-500/10 border border-purple-500/20">
                        <p className="text-xs text-[var(--text-muted)] mb-1">WFH Minggu Ini</p>
                        <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                            {leaveQuota?.wfh_weekly_used || 0} / {leaveQuota?.wfh_weekly_limit || 1}
                        </p>
                        <p className="text-xs text-[var(--text-muted)] mt-1">
                            Sisa: {(leaveQuota?.wfh_weekly_limit || 1) - (leaveQuota?.wfh_weekly_used || 0)}
                        </p>
                    </div>

                    {/* WFA Annual - Hide for interns */}
                    {!isIntern && (
                        <div className="p-4 rounded-xl bg-sky-500/10 border border-sky-500/20">
                            <p className="text-xs text-[var(--text-muted)] mb-1">WFA Tahun Ini</p>
                            <p className="text-2xl font-bold text-sky-600 dark:text-sky-400">
                                {leaveQuota?.wfa_used || 0} / {leaveQuota?.wfa_total || 30}
                            </p>
                            <p className="text-xs text-[var(--text-muted)] mt-1">
                                Sisa: {(leaveQuota?.wfa_total || 30) - (leaveQuota?.wfa_used || 0)} hari
                            </p>
                        </div>
                    )}

                    {/* Cuti Tahunan - Hide for interns */}
                    {!isIntern && (
                        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                            <p className="text-xs text-[var(--text-muted)] mb-1">Cuti Tahunan</p>
                            <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                                {leaveQuota?.annual_leave_used || 0} / {leaveQuota?.annual_leave_total || 18}
                            </p>
                            <p className="text-xs text-[var(--text-muted)] mt-1">
                                Sisa: {(leaveQuota?.annual_leave_total || 18) - (leaveQuota?.annual_leave_used || 0)} hari
                            </p>
                        </div>
                    )}

                    {/* Request Stats */}
                    <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20">
                        <p className="text-xs text-[var(--text-muted)] mb-1">Pending Approval</p>
                        <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                            {stats.pending}
                        </p>
                        <p className="text-xs text-[var(--text-muted)] mt-1">
                            Total: {requests.length} request
                        </p>
                    </div>
                </div>
            </div>

            {/* Request Categories Carousel */}
            <div className="glass-panel rounded-xl p-5 mb-6">
                <h3 className="font-semibold text-[var(--text-primary)] mb-4 flex items-center gap-2">
                    <Plus className="w-5 h-5" />
                    Buat Pengajuan Baru
                </h3>

                {/* Carousel Navigation */}
                <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
                    <button
                        onClick={() => setActiveSlide(0)}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${activeSlide === 0
                            ? "bg-purple-500 text-white"
                            : "bg-[var(--glass-bg)] text-[var(--text-secondary)] hover:bg-[var(--glass-border)]"
                            }`}
                    >
                        📋 Izin & Absensi
                    </button>
                    <button
                        onClick={() => setActiveSlide(1)}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${activeSlide === 1
                            ? "bg-amber-500 text-white"
                            : "bg-[var(--glass-bg)] text-[var(--text-secondary)] hover:bg-[var(--glass-border)]"
                            }`}
                    >
                        🚀 Tugas & Lembur
                    </button>
                    <button
                        onClick={() => setActiveSlide(2)}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${activeSlide === 2
                            ? "bg-blue-500 text-white"
                            : "bg-[var(--glass-bg)] text-[var(--text-secondary)] hover:bg-[var(--glass-border)]"
                            }`}
                    >
                        📁 Fasilitas & Pengembangan
                    </button>
                </div>

                {/* Slide Content */}
                <div className="relative overflow-hidden min-h-[200px]">
                    {/* Slide 1: Izin & Absensi */}
                    {activeSlide === 0 && (
                        <div className="animate-fadeIn">
                            <div className="grid grid-cols-3 gap-4">
                                <Link href="/dashboard/my-request/flexible-work">
                                    <div className="flex flex-col items-center justify-center gap-3 p-6 h-full rounded-xl bg-[var(--surface-color)] hover:bg-[var(--glass-border)] border border-[var(--glass-border)] hover:border-purple-500/50 transition-all cursor-pointer group">
                                        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500 to-violet-500 flex items-center justify-center text-white shadow-lg shadow-purple-500/20 group-hover:scale-110 transition-transform">
                                            <Home className="w-8 h-8 text-white stroke-white stroke-[1.5]" style={{ color: 'white' }} />
                                        </div>
                                        <span className="text-base font-semibold text-[var(--text-primary)]">
                                            {isIntern ? "WFH" : "WFH/WFA"}
                                        </span>
                                    </div>
                                </Link>
                                <Link href="/dashboard/my-request/leave">
                                    <div className="flex flex-col items-center justify-center gap-3 p-6 h-full rounded-xl bg-[var(--surface-color)] hover:bg-[var(--glass-border)] border border-[var(--glass-border)] hover:border-emerald-500/50 transition-all cursor-pointer group">
                                        <div className="w-16 h-16 rounded-2xl bg-emerald-500 flex items-center justify-center text-white group-hover:scale-110 transition-transform shadow-lg shadow-emerald-500/20">
                                            <Calendar className="w-8 h-8 text-white stroke-[1.5]" />
                                        </div>
                                        <span className="text-base font-semibold text-[var(--text-primary)]">
                                            {isIntern ? "Izin" : "Izin/Cuti"}
                                        </span>
                                    </div>
                                </Link>
                                <Link href="/dashboard/my-request/sakit">
                                    <div className="flex flex-col items-center justify-center gap-3 p-6 h-full rounded-xl bg-[var(--surface-color)] hover:bg-[var(--glass-border)] border border-[var(--glass-border)] hover:border-rose-500/50 transition-all cursor-pointer group">
                                        <div className="w-16 h-16 rounded-2xl bg-rose-500 flex items-center justify-center text-white group-hover:scale-110 transition-transform shadow-lg shadow-rose-500/20">
                                            <Thermometer className="w-8 h-8 text-white stroke-[1.5]" />
                                        </div>
                                        <span className="text-base font-semibold text-[var(--text-primary)]">Lapor Sakit</span>
                                    </div>
                                </Link>
                            </div>
                        </div>
                    )}

                    {/* Slide 2: Tugas & Lembur */}
                    {activeSlide === 1 && (
                        <div className="animate-fadeIn">
                            <div className="grid grid-cols-2 gap-4">
                                <Link href="/dashboard/my-request/overtime">
                                    <div className="flex flex-col items-center justify-center gap-3 p-6 h-full rounded-xl bg-[var(--surface-color)] hover:bg-[var(--glass-border)] border border-[var(--glass-border)] hover:border-orange-500/50 transition-all cursor-pointer group">
                                        <div className="w-16 h-16 rounded-2xl bg-orange-500 flex items-center justify-center text-white group-hover:scale-110 transition-transform shadow-lg shadow-orange-500/20">
                                            <Clock className="w-8 h-8 text-white stroke-[1.5]" />
                                        </div>
                                        <div className="text-center">
                                            <span className="block text-base font-semibold text-[var(--text-primary)]">Lembur</span>
                                            <span className="text-sm text-[var(--text-muted)]">Per jam</span>
                                        </div>
                                    </div>
                                </Link>
                                <Link href="/dashboard/my-request/business-trip">
                                    <div className="flex flex-col items-center justify-center gap-3 p-6 h-full rounded-xl bg-[var(--surface-color)] hover:bg-[var(--glass-border)] border border-[var(--glass-border)] hover:border-amber-500/50 transition-all cursor-pointer group">
                                        <div className="w-16 h-16 rounded-2xl bg-amber-500 flex items-center justify-center text-white group-hover:scale-110 transition-transform shadow-lg shadow-amber-500/20">
                                            <Briefcase className="w-8 h-8 text-white stroke-[1.5]" />
                                        </div>
                                        <div className="text-center">
                                            <span className="block text-base font-semibold text-[var(--text-primary)]">Perjalanan Dinas</span>
                                            <span className="text-sm text-[var(--text-muted)]">Per hari</span>
                                        </div>
                                    </div>
                                </Link>
                            </div>
                        </div>
                    )}

                    {/* Slide 3: Fasilitas & Pengembangan */}
                    {activeSlide === 2 && (
                        <div className="animate-fadeIn">
                            <div className="grid grid-cols-4 gap-4">
                                <Link href="/dashboard/my-request/training">
                                    <div className="flex flex-col items-center justify-center gap-3 p-6 h-full rounded-xl bg-[var(--surface-color)] hover:bg-[var(--glass-border)] border border-[var(--glass-border)] hover:border-indigo-500/50 transition-all cursor-pointer group">
                                        <div className="w-16 h-16 rounded-2xl bg-indigo-500 flex items-center justify-center text-white group-hover:scale-110 transition-transform shadow-lg shadow-indigo-500/20">
                                            <GraduationCap className="w-8 h-8 text-white stroke-[1.5]" />
                                        </div>
                                        <span className="text-base font-semibold text-[var(--text-primary)]">Training</span>
                                    </div>
                                </Link>
                                <Link href="/dashboard/my-request/reimburse">
                                    <div className="flex flex-col items-center justify-center gap-3 p-6 h-full rounded-xl bg-[var(--surface-color)] hover:bg-[var(--glass-border)] border border-[var(--glass-border)] hover:border-teal-500/50 transition-all cursor-pointer group">
                                        <div className="w-16 h-16 rounded-2xl bg-teal-500 flex items-center justify-center text-white group-hover:scale-110 transition-transform shadow-lg shadow-teal-500/20">
                                            <DollarSign className="w-8 h-8 text-white stroke-[1.5]" />
                                        </div>
                                        <span className="text-base font-semibold text-[var(--text-primary)]">Reimburse</span>
                                    </div>
                                </Link>
                                <Link href="/dashboard/my-request/asset">
                                    <div className="flex flex-col items-center justify-center gap-3 p-6 h-full rounded-xl bg-[var(--surface-color)] hover:bg-[var(--glass-border)] border border-[var(--glass-border)] hover:border-blue-500/50 transition-all cursor-pointer group">
                                        <div className="w-16 h-16 rounded-2xl bg-blue-500 flex items-center justify-center text-white group-hover:scale-110 transition-transform shadow-lg shadow-blue-500/20">
                                            <Package className="w-8 h-8 text-white stroke-[1.5]" />
                                        </div>
                                        <span className="text-base font-semibold text-[var(--text-primary)]">Asset</span>
                                    </div>
                                </Link>
                                <Link href="/dashboard/my-request/one-on-one">
                                    <div className="flex flex-col items-center justify-center gap-3 p-6 h-full rounded-xl bg-[var(--surface-color)] hover:bg-[var(--glass-border)] border border-[var(--glass-border)] hover:border-pink-500/50 transition-all cursor-pointer group">
                                        <div className="w-16 h-16 rounded-2xl bg-pink-500 flex items-center justify-center text-white group-hover:scale-110 transition-transform shadow-lg shadow-pink-500/20">
                                            <Users className="w-8 h-8 text-white stroke-[1.5]" />
                                        </div>
                                        <span className="text-base font-semibold text-[var(--text-primary)]">1-on-1</span>
                                    </div>
                                </Link>
                            </div>
                        </div>
                    )}
                </div>

                {/* Carousel Dots */}
                <div className="flex justify-center gap-2 mt-4">
                    {[0, 1, 2].map((i) => (
                        <button
                            key={i}
                            onClick={() => setActiveSlide(i)}
                            className={`w-2 h-2 rounded-full transition-all ${activeSlide === i
                                ? "bg-[#e8c559] w-6"
                                : "bg-gray-400/30 hover:bg-gray-400/50"
                                }`}
                        />
                    ))}
                </div>
            </div>

            {/* Category Filter Tabs */}
            <div className="mb-3">
                <p className="text-xs text-[var(--text-muted)] mb-2 font-medium">Filter Kategori</p>
                <div className="flex gap-2 overflow-x-auto pb-2">
                    <button
                        onClick={() => setSelectedCategoryFilter("all")}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${selectedCategoryFilter === "all"
                            ? "bg-[#3f545f] dark:bg-[#e8c559] text-white dark:text-[#171611]"
                            : "bg-[var(--glass-bg)] text-[var(--text-secondary)] hover:bg-[var(--glass-border)]"
                            }`}
                    >
                        📋 Semua ({requests.length})
                    </button>
                    <button
                        onClick={() => setSelectedCategoryFilter("izin_absensi")}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${selectedCategoryFilter === "izin_absensi"
                            ? "bg-purple-500 text-white"
                            : "bg-[var(--glass-bg)] text-[var(--text-secondary)] hover:bg-[var(--glass-border)]"
                            }`}
                    >
                        🏠 Izin & Absensi ({categoryStats.izin_absensi})
                    </button>
                    <button
                        onClick={() => setSelectedCategoryFilter("tugas_lembur")}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${selectedCategoryFilter === "tugas_lembur"
                            ? "bg-amber-500 text-white"
                            : "bg-[var(--glass-bg)] text-[var(--text-secondary)] hover:bg-[var(--glass-border)]"
                            }`}
                    >
                        🚀 Tugas & Lembur ({categoryStats.tugas_lembur})
                    </button>
                    <button
                        onClick={() => setSelectedCategoryFilter("fasilitas_pengembangan")}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${selectedCategoryFilter === "fasilitas_pengembangan"
                            ? "bg-blue-500 text-white"
                            : "bg-[var(--glass-bg)] text-[var(--text-secondary)] hover:bg-[var(--glass-border)]"
                            }`}
                    >
                        📁 Fasilitas & Pengembangan ({categoryStats.fasilitas_pengembangan})
                    </button>
                </div>
            </div>

            {/* Status Filter Tabs */}
            <div className="mb-4">
                <p className="text-xs text-[var(--text-muted)] mb-2 font-medium">Filter Status</p>
                <div className="flex gap-2 overflow-x-auto pb-2">
                    <button
                        onClick={() => setSelectedStatusFilter("all")}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${selectedStatusFilter === "all"
                            ? "bg-[#3f545f] dark:bg-[#e8c559] text-white dark:text-[#171611]"
                            : "bg-[var(--glass-bg)] text-[var(--text-secondary)] hover:bg-[var(--glass-border)]"
                            }`}
                    >
                        Semua Status
                    </button>
                    <button
                        onClick={() => setSelectedStatusFilter("pending")}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap flex items-center gap-2 ${selectedStatusFilter === "pending"
                            ? "bg-amber-500 text-white"
                            : "bg-[var(--glass-bg)] text-[var(--text-secondary)] hover:bg-[var(--glass-border)]"
                            }`}
                    >
                        <AlertCircle className="w-4 h-4" />
                        Pending ({stats.pending})
                    </button>
                    <button
                        onClick={() => setSelectedStatusFilter("approved")}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap flex items-center gap-2 ${selectedStatusFilter === "approved"
                            ? "bg-emerald-500 text-white"
                            : "bg-[var(--glass-bg)] text-[var(--text-secondary)] hover:bg-[var(--glass-border)]"
                            }`}
                    >
                        <CheckCircle className="w-4 h-4" />
                        Approved ({stats.approved})
                    </button>
                    <button
                        onClick={() => setSelectedStatusFilter("rejected")}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap flex items-center gap-2 ${selectedStatusFilter === "rejected"
                            ? "bg-rose-500 text-white"
                            : "bg-[var(--glass-bg)] text-[var(--text-secondary)] hover:bg-[var(--glass-border)]"
                            }`}
                    >
                        <XCircle className="w-4 h-4" />
                        Rejected ({stats.rejected})
                    </button>
                </div>
            </div>

            {/* Request History List */}
            <div className="glass-panel rounded-xl overflow-hidden flex-1">
                <div className="p-4 border-b border-[var(--glass-border)] flex items-center justify-between">
                    <h3 className="font-semibold text-[var(--text-primary)]">
                        📜 Riwayat Pengajuan ({filteredRequests.length})
                    </h3>
                </div>

                <div className="divide-y divide-[var(--glass-border)] max-h-[500px] overflow-y-auto">
                    {isLoading ? (
                        <div className="p-8 text-center text-[var(--text-muted)]">
                            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2" />
                            <p>Memuat data...</p>
                        </div>
                    ) : filteredRequests.length === 0 ? (
                        <div className="p-8 text-center text-[var(--text-muted)]">
                            <p className="text-4xl mb-2">📭</p>
                            <p>Tidak ada pengajuan</p>
                        </div>
                    ) : (
                        filteredRequests.map((request) => {
                            const typeConfig = LEAVE_TYPE_CONFIG[request.leave_type] || { label: request.leave_type, icon: "📋", color: "bg-gray-500" };
                            const statusConfig = STATUS_CONFIG[request.status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.pending;
                            const StatusIcon = statusConfig.icon;

                            return (
                                <div
                                    key={request.id}
                                    className="p-4 hover:bg-black/5 dark:hover:bg-white/5 transition-colors flex items-center gap-4"
                                >
                                    {/* Type Icon */}
                                    <div className={`w-12 h-12 rounded-xl ${typeConfig.color} flex items-center justify-center text-xl text-white flex-shrink-0`}>
                                        {typeConfig.icon}
                                    </div>

                                    {/* Content */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                            <p className="font-medium text-[var(--text-primary)]">{typeConfig.label}</p>
                                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusConfig.bg} ${statusConfig.color} flex items-center gap-1`}>
                                                <StatusIcon className="w-3 h-3" />
                                                {statusConfig.label}
                                            </span>
                                        </div>
                                        <p className="text-sm text-[var(--text-secondary)] truncate">{request.reason}</p>
                                        <div className="flex items-center gap-3 text-xs text-[var(--text-muted)] mt-1">
                                            <span>📅 {formatDate(request.start_date)}{request.start_date !== request.end_date && ` - ${formatDate(request.end_date)}`}</span>
                                            {request.total_hours && <span>⏰ {request.total_hours} jam</span>}
                                            <span className="opacity-60">• Diajukan {formatDate(request.created_at)}</span>
                                        </div>
                                    </div>

                                    {/* Arrow - Navigate to dedicated page */}
                                    <Link
                                        href={getRequestPageUrl(request.leave_type)}
                                        className="p-2 rounded-lg hover:bg-[var(--glass-border)] transition-colors flex-shrink-0"
                                        title="Lihat detail"
                                    >
                                        <ChevronRight className="w-5 h-5 text-[var(--text-muted)]" />
                                    </Link>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>
        </div>
    );
}
