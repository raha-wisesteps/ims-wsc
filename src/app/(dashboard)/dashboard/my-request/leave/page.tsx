"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Calendar, ArrowLeft, Send, Loader2, ChevronDown, CheckCircle, XCircle, AlertCircle, Download, ChevronRight } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { sendEmailNotification } from "@/lib/email-notification";

// Type definitions
interface LeaveTypeItem {
    id: string;
    label: string;
    emoji: string;
    days: number | null;
    description: string;
    gender?: 'male' | 'female';
}

interface LeaveCategory {
    category: string;
    items: LeaveTypeItem[];
}

// Leave & Permission types grouped
const LEAVE_CATEGORIES: LeaveCategory[] = [
    {
        category: "Cuti",
        items: [
            { id: "annual_leave", label: "Cuti Tahunan", emoji: "🌴", days: null, description: "18 hari/tahun (fulltime)" },
            { id: "other_permission", label: "Izin Lainnya", emoji: "📋", days: null, description: "Mengambil jatah cuti tahunan" },
        ]
    },
    {
        category: "Cuti Khusus Wanita",
        items: [
            { id: "menstrual_leave", label: "Cuti Haid", emoji: "🩸", days: null, description: "Max 2 hari/bulan", gender: "female" },
            { id: "maternity", label: "Cuti Melahirkan", emoji: "🤰", days: 90, description: "3 bulan", gender: "female" },
            { id: "miscarriage", label: "Cuti Keguguran", emoji: "🚑", days: 45, description: "1.5 bulan", gender: "female" },
        ]
    },
    {
        category: "Izin Pernikahan",
        items: [
            { id: "self_marriage", label: "Pernikahan Sendiri", emoji: "💍", days: 3, description: "3 hari" },
            { id: "child_marriage", label: "Pernikahan Anak", emoji: "👰", days: 2, description: "2 hari" },
        ]
    },
    {
        category: "Izin Kelahiran & Musibah Istri",
        items: [
            { id: "paternity", label: "Istri Melahirkan", emoji: "👶", days: 10, description: "10 hari", gender: "male" },
            { id: "wife_miscarriage", label: "Istri Keguguran", emoji: "💔", days: 3, description: "3 hari", gender: "male" },
            { id: "child_event", label: "Khitanan/Baptis Anak", emoji: "✨", days: 2, description: "2 hari" },
        ]
    },
    {
        category: "Izin Duka",
        items: [
            { id: "family_death", label: "Keluarga Inti Meninggal", emoji: "🕯️", days: 2, description: "Suami/istri, orang tua, anak - 2 hari" },
            { id: "household_death", label: "Anggota Serumah Meninggal", emoji: "🕯️", days: 1, description: "1 hari" },
            { id: "sibling_death", label: "Saudara Kandung Meninggal", emoji: "🕯️", days: 1, description: "1 hari" },
        ]
    },
    {
        category: "Izin Lainnya",
        items: [
            { id: "hajj", label: "Ibadah Haji", emoji: "🕋", days: null, description: "Sesuai jadwal Depag (pertama kali)" },
            { id: "government", label: "Panggilan Pemerintah", emoji: "🏛️", days: null, description: "Sesuai surat panggilan" },
            { id: "disaster", label: "Musibah", emoji: "🌊", days: null, description: "Banjir, kebakaran, dll" },
        ]
    },
];

// Flatten for easier lookup
const ALL_LEAVE_TYPES: LeaveTypeItem[] = LEAVE_CATEGORIES.flatMap(c => c.items);

export default function IzinCutiPage() {
    const router = useRouter();
    const { user, profile, leaveQuota, extraLeave } = useAuth();
    const supabase = createClient();

    // Calculate total extra leave remaining
    const totalExtraLeaveRemaining = extraLeave?.reduce((sum, grant) => sum + grant.days_remaining, 0) || 0;

    const isIntern = profile?.job_type === "intern";

    // Initial state setup - Interns default to sick_leave if annual_leave is hidden
    const [leaveType, setLeaveType] = useState(isIntern ? "sick_leave" : "annual_leave");

    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [reason, setReason] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [history, setHistory] = useState<any[]>([]);
    const [isLoadingHistory, setIsLoadingHistory] = useState(true);
    const [downloadingId, setDownloadingId] = useState<string | null>(null);

    // Fetch history
    useEffect(() => {
        const fetchHistory = async () => {
            if (!user) return;
            const leaveTypes = ALL_LEAVE_TYPES.map(t => t.id);
            const { data } = await supabase
                .from("leave_requests")
                .select("id, leave_type, start_date, end_date, reason, status, created_at")
                .eq("profile_id", user.id)
                .in("leave_type", leaveTypes)
                .order("created_at", { ascending: false })
                .limit(5);
            setHistory(data || []);
            setIsLoadingHistory(false);
        };
        fetchHistory();
    }, [user]);

    // Annual leave quota
    const annualUsed = leaveQuota?.annual_leave_used || 0;
    const annualTotal = leaveQuota?.annual_leave_total || 18;
    const annualRemaining = annualTotal - annualUsed;

    // Get selected type info
    const selectedType = ALL_LEAVE_TYPES.find(t => t.id === leaveType);

    // Filtering categories based on gender and role (Interns cannot see Annual Leave)
    const filteredCategories = LEAVE_CATEGORIES.map(cat => ({
        ...cat,
        items: cat.items.filter(item => {
            // Intern restriction: Hide Annual Leave & Other Permission
            if (isIntern && (item.id === 'annual_leave' || item.id === 'other_permission')) return false;

            // Gender restriction
            if (item.gender === 'female') return profile?.is_female === true;
            if (item.gender === 'male') return !profile?.is_female;
            return true;
        })
    })).filter(cat => cat.items.length > 0);

    // Effect to update leave type if user role loads late
    useEffect(() => {
        if (isIntern && (leaveType === 'annual_leave' || leaveType === 'other_permission')) {
            setLeaveType('sick_leave');
        }
    }, [isIntern, leaveType]);

    // Add Cuti Khusus category if user has extra leave quota
    const categoriesWithExtraLeave = totalExtraLeaveRemaining > 0 ? [
        {
            category: "🎁 Cuti Khusus (Bonus)",
            items: [{
                id: "extra_leave",
                label: "Gunakan Cuti Khusus",
                emoji: "🎁",
                days: null,
                description: `${totalExtraLeaveRemaining} hari tersedia`,
            }]
        },
        ...filteredCategories
    ] : filteredCategories;

    // Calculate days
    const calculateDays = () => {
        if (!startDate) return 0;
        if (!endDate || endDate === startDate) return 1;
        const start = new Date(startDate);
        const end = new Date(endDate);
        return Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    };

    const requestedDays = calculateDays();

    // Handle Excel download
    const handleDownloadExcel = async (leaveRequestId: string) => {
        try {
            setDownloadingId(leaveRequestId);
            const response = await fetch(`/api/generate-leave-excel?id=${leaveRequestId}`);

            if (!response.ok) {
                throw new Error("Failed to generate Excel");
            }

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;

            // Get filename from Content-Disposition header or use default
            const contentDisposition = response.headers.get("Content-Disposition");
            const filenameMatch = contentDisposition?.match(/filename="(.+)"/);
            a.download = filenameMatch ? filenameMatch[1] : "form_cuti.xlsx";

            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        } catch (err) {
            console.error("Download error:", err);
            setError("Gagal mengunduh file Excel");
        } finally {
            setDownloadingId(null);
        }
    };

    // Auto-set end date for fixed-duration leaves
    const handleTypeChange = (typeId: string) => {
        setLeaveType(typeId);
        const type = ALL_LEAVE_TYPES.find(t => t.id === typeId);
        if (type?.days && startDate) {
            const start = new Date(startDate);
            start.setDate(start.getDate() + type.days - 1);
            setEndDate(start.toISOString().split('T')[0]);
        }
    };

    const handleStartDateChange = (dateStr: string) => {
        setStartDate(dateStr);
        if (selectedType?.days) {
            const start = new Date(dateStr);
            start.setDate(start.getDate() + selectedType.days - 1);
            setEndDate(start.toISOString().split('T')[0]);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!user || !profile) {
            setError("Anda harus login");
            return;
        }

        if (!startDate) {
            setError("Tanggal harus diisi");
            return;
        }

        if (!reason.trim()) {
            setError("Alasan harus diisi");
            return;
        }

        // Check annual leave quota (annual_leave and other_permission both deduct from annual quota)
        if ((leaveType === "annual_leave" || leaveType === "other_permission") && requestedDays > annualRemaining) {
            setError(`Sisa cuti tahunan tidak cukup. Sisa: ${annualRemaining} hari`);
            return;
        }

        // Check extra leave quota
        if (leaveType === "extra_leave" && requestedDays > totalExtraLeaveRemaining) {
            setError(`Sisa cuti khusus tidak cukup. Sisa: ${totalExtraLeaveRemaining} hari`);
            return;
        }

        setIsSubmitting(true);
        setError(null);

        try {
            const { error: insertError } = await supabase
                .from("leave_requests")
                .insert({
                    profile_id: user.id,
                    leave_type: leaveType,
                    start_date: startDate,
                    end_date: endDate || startDate,
                    reason: reason.trim(),
                    status: "pending",
                });

            if (insertError) {
                setError("Gagal mengajukan: " + insertError.message);
                return;
            }

            // Send email notification to CEO (await to prevent abort on redirect)
            await sendEmailNotification({
                type: "new_request",
                request_id: "",
                profile_id: user.id,
                leave_type: leaveType,
                requester_name: profile.full_name || "Karyawan",
                start_date: startDate,
                end_date: endDate || startDate,
                reason: reason.trim(),
            });

            router.push("/dashboard/my-request");
        } catch (err) {
            setError("Terjadi kesalahan");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="flex flex-col h-full overflow-auto">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                <div>
                    <div className="flex items-center gap-2 text-sm text-[var(--text-muted)] mb-1">
                        <Link href="/dashboard" className="hover:text-[#3f545f] dark:hover:text-[#e8c559]">Dashboard</Link>
                        <ChevronRight className="w-4 h-4 text-[var(--text-muted)]" />
                        <Link href="/dashboard/my-request" className="hover:text-[#3f545f] dark:hover:text-[#e8c559]">My Request</Link>
                        <ChevronRight className="w-4 h-4 text-[var(--text-muted)]" />
                        <span className="text-[var(--text-primary)]">Izin & Cuti</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-emerald-500 flex items-center justify-center shadow-lg">
                            <Calendar className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h2 className="text-3xl font-bold tracking-tight text-[var(--text-primary)]">Pengajuan Izin & Cuti</h2>
                            <p className="text-[var(--text-secondary)] text-sm">Leave & Permission Request</p>
                        </div>
                    </div>
                </div>
                <Link
                    href="/dashboard/my-request"
                    className="px-4 py-2 rounded-lg bg-[var(--glass-bg)] hover:bg-[var(--glass-border)] text-[var(--text-secondary)] font-medium transition-colors flex items-center gap-2"
                >
                    <ArrowLeft className="w-4 h-4" />
                    Kembali
                </Link>
            </div>

            {/* Annual Leave Quota (show for both annual_leave and other_permission) */}
            {(leaveType === "annual_leave" || leaveType === "other_permission") && (
                <div className="glass-panel rounded-xl p-4 mb-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-[var(--text-muted)]">Sisa Cuti Tahunan</p>
                            <p className="text-2xl font-bold text-[var(--text-primary)]">
                                {annualRemaining} <span className="text-base font-normal text-[var(--text-muted)]">/ {annualTotal} hari</span>
                            </p>
                        </div>
                        <div className={`w-16 h-16 rounded-full flex items-center justify-center text-white font-bold text-xl ${annualRemaining > 0 ? 'bg-emerald-500' : 'bg-rose-500'}`}>
                            {annualRemaining}
                        </div>
                    </div>
                </div>
            )}

            {/* Extra Leave Quota (show for extra_leave) */}
            {leaveType === "extra_leave" && (
                <div className="glass-panel rounded-xl p-4 mb-6 border-2 border-amber-500/50">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-[var(--text-muted)]">🎁 Sisa Cuti Khusus (Bonus)</p>
                            <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                                {totalExtraLeaveRemaining} <span className="text-base font-normal text-[var(--text-muted)]">hari tersedia</span>
                            </p>
                            {extraLeave && extraLeave.length > 0 && (
                                <p className="text-xs text-[var(--text-muted)] mt-1">
                                    Berlaku hingga: {new Date(extraLeave[0].expires_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                                </p>
                            )}
                        </div>
                        <div className="w-16 h-16 rounded-full flex items-center justify-center text-white font-bold text-xl bg-gradient-to-br from-amber-400 to-amber-600">
                            🎁
                        </div>
                    </div>
                </div>
            )}

            {/* Form */}
            <div className="glass-panel rounded-xl p-6 flex-1">
                <form onSubmit={handleSubmit} className="space-y-6">
                    {error && (
                        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-red-500 dark:text-red-400 text-sm">
                            {error}
                        </div>
                    )}

                    {/* Leave Type Selector */}
                    <div>
                        <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">Jenis Izin/Cuti</label>
                        <div className="space-y-4">
                            {categoriesWithExtraLeave.map((category) => (
                                <div key={category.category}>
                                    <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-2">{category.category}</p>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                        {category.items.map((item) => (
                                            <button
                                                key={item.id}
                                                type="button"
                                                onClick={() => handleTypeChange(item.id)}
                                                className={`p-3 rounded-lg border text-left transition-all ${leaveType === item.id
                                                    ? "border-emerald-500 bg-emerald-500/10"
                                                    : "border-[var(--glass-border)] bg-[var(--surface-color)] hover:border-[var(--glass-border-hover)]"
                                                    }`}
                                            >
                                                <div className="flex items-center gap-2">
                                                    <span className="text-lg">{item.emoji}</span>
                                                    <div className="flex-1 min-w-0">
                                                        <p className={`font-medium text-sm ${leaveType === item.id ? "text-emerald-600 dark:text-emerald-400" : "text-[var(--text-primary)]"}`}>
                                                            {item.label}
                                                        </p>
                                                        <p className="text-xs text-[var(--text-muted)] truncate">{item.description}</p>
                                                    </div>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Date Range */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                                <Calendar className="w-4 h-4 inline mr-2" />
                                Tanggal Mulai
                            </label>
                            <input
                                type="date"
                                value={startDate}
                                onChange={(e) => handleStartDateChange(e.target.value)}
                                min={new Date().toISOString().split('T')[0]}
                                className="w-full px-4 py-3 rounded-lg bg-[var(--surface-color)] border border-[var(--glass-border)] text-[var(--text-primary)] focus:outline-none focus:border-emerald-500 transition-colors"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                                <Calendar className="w-4 h-4 inline mr-2" />
                                Tanggal Selesai
                            </label>
                            <input
                                type="date"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                min={startDate || new Date().toISOString().split('T')[0]}
                                className="w-full px-4 py-3 rounded-lg bg-[var(--surface-color)] border border-[var(--glass-border)] text-[var(--text-primary)] focus:outline-none focus:border-emerald-500 transition-colors"
                                disabled={!!selectedType?.days}
                            />
                            {selectedType?.days && (
                                <p className="text-xs text-[var(--text-muted)] mt-1">Otomatis {selectedType.days} hari</p>
                            )}
                        </div>
                    </div>

                    {requestedDays > 0 && (
                        <div className="text-center py-2 px-4 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-sm font-medium">
                            Jumlah Hari Cuti: {requestedDays} hari
                        </div>
                    )}

                    {/* Reason */}
                    <div>
                        <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">Alasan</label>
                        <textarea
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            placeholder="Jelaskan alasan pengajuan..."
                            rows={3}
                            className="w-full px-4 py-3 rounded-lg bg-[var(--surface-color)] border border-[var(--glass-border)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-emerald-500 transition-colors resize-none"
                            required
                        />
                    </div>

                    {/* Submit */}
                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full py-3 rounded-lg bg-emerald-500 hover:bg-emerald-600 !text-white font-semibold transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                        {isSubmitting ? (
                            <>
                                <Loader2 className="w-5 h-5 animate-spin !text-white" />
                                Mengajukan...
                            </>
                        ) : (
                            <>
                                <Send className="w-5 h-5 !text-white" />
                                Ajukan {selectedType?.label || "Izin/Cuti"}
                            </>
                        )}
                    </button>
                </form>
            </div>

            {/* History Section */}
            <div className="glass-panel rounded-xl p-6 mt-6">
                <h3 className="font-semibold text-lg text-[var(--text-primary)] mb-4 flex items-center gap-2">
                    📜 Riwayat Pengajuan Izin/Cuti
                </h3>
                {isLoadingHistory ? (
                    <div className="flex items-center justify-center py-6 text-[var(--text-muted)]">
                        <Loader2 className="w-6 h-6 animate-spin" />
                    </div>
                ) : history.length === 0 ? (
                    <p className="text-center py-6 text-[var(--text-muted)]">Belum ada riwayat pengajuan</p>
                ) : (
                    <div className="space-y-3">
                        {history.map((h) => {
                            const typeInfo = ALL_LEAVE_TYPES.find(t => t.id === h.leave_type);
                            return (
                                <div key={h.id} className="p-3 rounded-lg bg-[var(--surface-color)] border border-[var(--glass-border)] flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-lg bg-emerald-500 flex items-center justify-center text-lg">
                                        {typeInfo?.emoji || '📋'}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <span className="font-medium text-[var(--text-primary)]">{typeInfo?.label || h.leave_type}</span>
                                            <span className={`text-xs px-2 py-0.5 rounded-full flex items-center gap-1 ${h.status === 'approved' ? 'bg-emerald-500/10 text-emerald-500' :
                                                h.status === 'rejected' ? 'bg-rose-500/10 text-rose-500' :
                                                    'bg-amber-500/10 text-amber-500'
                                                }`}>
                                                {h.status === 'approved' ? <CheckCircle className="w-3 h-3" /> :
                                                    h.status === 'rejected' ? <XCircle className="w-3 h-3" /> :
                                                        <AlertCircle className="w-3 h-3" />}
                                                {h.status.charAt(0).toUpperCase() + h.status.slice(1)}
                                            </span>
                                        </div>
                                        <p className="text-xs text-[var(--text-muted)] truncate">
                                            {new Date(h.start_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                                            {h.start_date !== h.end_date && ` - ${new Date(h.end_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}`}
                                            {' • '}{h.reason}
                                        </p>
                                    </div>
                                    {/* Download Button - only show for approved requests */}
                                    {h.status === 'approved' && (
                                        <button
                                            onClick={() => handleDownloadExcel(h.id)}
                                            disabled={downloadingId === h.id}
                                            className="p-2 rounded-lg bg-[var(--glass-bg)] hover:bg-emerald-500/20 text-[var(--text-secondary)] hover:text-emerald-500 transition-colors disabled:opacity-50"
                                            title="Download Form Cuti"
                                        >
                                            {downloadingId === h.id ? (
                                                <Loader2 className="w-5 h-5 animate-spin" />
                                            ) : (
                                                <Download className="w-5 h-5" />
                                            )}
                                        </button>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
