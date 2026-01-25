"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Home, MapPin, ArrowLeft, Calendar, Send, Loader2, CheckCircle, XCircle, AlertCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

// Work type options
const WORK_TYPES = [
    { id: "wfh", label: "Work From Home", icon: "🏠", description: "Bekerja dari rumah" },
    { id: "wfa", label: "Work From Anywhere", icon: "📍", description: "Bekerja dari lokasi lain (travel)" },
];

export default function FlexibleWorkPage() {
    const router = useRouter();
    const { user, profile, leaveQuota } = useAuth();
    const supabase = createClient();
    const isIntern = profile?.job_type === 'intern';

    const [workType, setWorkType] = useState<"wfh" | "wfa">("wfh");
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [reason, setReason] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [history, setHistory] = useState<any[]>([]);
    const [isLoadingHistory, setIsLoadingHistory] = useState(true);

    // Filter available work types
    const availableWorkTypes = isIntern
        ? WORK_TYPES.filter(t => t.id === 'wfh')
        : WORK_TYPES;

    // Fetch history
    useEffect(() => {
        const fetchHistory = async () => {
            if (!user) return;
            const { data } = await supabase
                .from("leave_requests")
                .select("id, leave_type, start_date, end_date, reason, status, created_at")
                .eq("profile_id", user.id)
                .in("leave_type", ["wfh", "wfa"])
                .order("created_at", { ascending: false })
                .limit(5);
            setHistory(data || []);
            setIsLoadingHistory(false);
        };
        fetchHistory();
    }, [user]);

    // Quotas
    const wfhUsed = leaveQuota?.wfh_weekly_used || 0;
    const wfhLimit = leaveQuota?.wfh_weekly_limit || 1;
    const wfhRemaining = wfhLimit - wfhUsed;

    const wfaUsed = leaveQuota?.wfa_used || 0;
    const wfaTotal = leaveQuota?.wfa_total || 30;
    const wfaRemaining = wfaTotal - wfaUsed;

    // Calculate days
    const calculateDays = () => {
        if (!startDate) return 1;
        if (!endDate || endDate === startDate) return 1;
        const start = new Date(startDate);
        const end = new Date(endDate);
        return Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    };

    const requestedDays = calculateDays();

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



        // Check quota
        if (workType === "wfh" && requestedDays > wfhRemaining) {
            setError(`Jatah WFH minggu ini tidak mencukupi. Sisa: ${wfhRemaining}`);
            return;
        }
        if (workType === "wfa") {
            if (isIntern) {
                setError("Akses ditolak: Intern tidak diizinkan mengambil WFA.");
                return;
            }
            if (requestedDays > wfaRemaining) {
                setError(`Jatah WFA tidak mencukupi. Sisa: ${wfaRemaining} hari`);
                return;
            }
        }

        setIsSubmitting(true);
        setError(null);

        try {
            const { error: insertError } = await supabase
                .from("leave_requests")
                .insert({
                    profile_id: user.id,
                    leave_type: workType,
                    start_date: startDate,
                    end_date: endDate || startDate,
                    reason: reason.trim(),
                    status: "pending",
                });

            if (insertError) {
                setError("Gagal mengajukan: " + insertError.message);
                return;
            }

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
                        <span>/</span>
                        <Link href="/dashboard/my-request" className="hover:text-[#3f545f] dark:hover:text-[#e8c559]">My Request</Link>
                        <span>/</span>
                        <span className="text-[var(--text-primary)]">{isIntern ? "WFH" : "WFH/WFA"}</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-violet-500 flex items-center justify-center text-2xl text-white shadow-lg">
                            {workType === "wfh" ? "🏠" : "📍"}
                        </div>
                        <div>
                            <h2 className="text-3xl font-bold tracking-tight text-[var(--text-primary)]">
                                {isIntern ? "Pengajuan WFH" : "Pengajuan Kerja Fleksibel"}
                            </h2>
                            <p className="text-[var(--text-secondary)] text-sm">
                                {isIntern ? "Work From Home Request" : "Work From Home / Work From Anywhere"}
                            </p>
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

            {/* Quota Cards */}
            <div className={`grid gap-4 mb-6 ${isIntern ? 'grid-cols-1' : 'grid-cols-2'}`}>
                <div className="glass-panel rounded-xl p-4">
                    <p className="text-sm text-[var(--text-muted)]">Sisa WFH Minggu Ini</p>
                    <p className="text-2xl font-bold text-[var(--text-primary)]">
                        {wfhRemaining} <span className="text-base font-normal text-[var(--text-muted)]">/ {wfhLimit}</span>
                    </p>
                </div>
                {!isIntern && (
                    <div className="glass-panel rounded-xl p-4">
                        <p className="text-sm text-[var(--text-muted)]">Sisa WFA Tahun Ini</p>
                        <p className="text-2xl font-bold text-[var(--text-primary)]">
                            {wfaRemaining} <span className="text-base font-normal text-[var(--text-muted)]">/ {wfaTotal}</span>
                        </p>
                    </div>
                )}
            </div>

            {/* Form */}
            <div className="glass-panel rounded-xl p-6 flex-1">
                <form onSubmit={handleSubmit} className="space-y-6">
                    {error && (
                        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-red-500 dark:text-red-400 text-sm">
                            {error}
                        </div>
                    )}

                    {/* Work Type Toggle */}
                    {/* Only show toggle if not intern, otherwise static or hidden single options */}
                    {!isIntern ? (
                        <div>
                            <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">Jenis Kerja</label>
                            <div className="grid grid-cols-2 gap-3">
                                {WORK_TYPES.map((type) => (
                                    <button
                                        key={type.id}
                                        type="button"
                                        onClick={() => setWorkType(type.id as "wfh" | "wfa")}
                                        className={`p-4 rounded-xl border transition-all text-left ${workType === type.id
                                            ? "border-purple-500 bg-purple-500/10"
                                            : "border-[var(--glass-border)] bg-[var(--surface-color)] hover:border-[var(--glass-border-hover)]"
                                            }`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <span className="text-2xl">{type.icon}</span>
                                            <div>
                                                <p className={`font-semibold ${workType === type.id ? "text-purple-600 dark:text-purple-400" : "text-[var(--text-primary)]"}`}>
                                                    {type.label}
                                                </p>
                                                <p className="text-xs text-[var(--text-muted)]">{type.description}</p>
                                            </div>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    ) : (
                        // For intern, implied WFH, maybe show a static indicator or nothing
                        <div className="p-4 rounded-xl border border-purple-500 bg-purple-500/10 flex items-center gap-3">
                            <span className="text-2xl">🏠</span>
                            <div>
                                <p className="font-semibold text-purple-600 dark:text-purple-400">Work From Home</p>
                                <p className="text-xs text-[var(--text-muted)]">Bekerja dari rumah</p>
                            </div>
                        </div>
                    )}

                    {/* Date(s) */}
                    <div className={workType === "wfa" ? "grid grid-cols-2 gap-4" : ""}>
                        <div>
                            <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                                <Calendar className="w-4 h-4 inline mr-2" />
                                {workType === "wfa" ? "Tanggal Mulai" : "Tanggal"}
                            </label>
                            <input
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                min={new Date().toISOString().split('T')[0]}
                                className="w-full px-4 py-3 rounded-lg bg-[var(--surface-color)] border border-[var(--glass-border)] text-[var(--text-primary)] focus:outline-none focus:border-purple-500 transition-colors"
                                required
                            />
                        </div>
                        {workType === "wfa" && (
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
                                    className="w-full px-4 py-3 rounded-lg bg-[var(--surface-color)] border border-[var(--glass-border)] text-[var(--text-primary)] focus:outline-none focus:border-purple-500 transition-colors"
                                />
                            </div>
                        )}
                    </div>

                    {workType === "wfa" && requestedDays > 1 && (
                        <div className="text-center py-2 px-4 rounded-lg bg-violet-500/10 text-violet-600 dark:text-violet-400 text-sm font-medium">
                            Total: {requestedDays} hari
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
                            className="w-full px-4 py-3 rounded-lg bg-[var(--surface-color)] border border-[var(--glass-border)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-purple-500 transition-colors resize-none"
                            required
                        />
                    </div>

                    {/* Submit */}
                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full py-3 rounded-lg bg-gradient-to-r from-purple-500 to-violet-500 hover:from-purple-600 hover:to-violet-600 !text-white font-semibold transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                        {isSubmitting ? (
                            <>
                                <Loader2 className="w-5 h-5 animate-spin !text-white" />
                                Mengajukan...
                            </>
                        ) : (
                            <>
                                <Send className="w-5 h-5 !text-white" />
                                Ajukan {workType === "wfh" ? "WFH" : "WFA"}
                            </>
                        )}
                    </button>
                </form>
            </div>

            {/* History Section */}
            <div className="glass-panel rounded-xl p-6 mt-6">
                <h3 className="font-semibold text-lg text-[var(--text-primary)] mb-4 flex items-center gap-2">
                    📜 {isIntern ? "Riwayat Pengajuan WFH" : "Riwayat Pengajuan WFH/WFA"}
                </h3>
                {isLoadingHistory ? (
                    <div className="flex items-center justify-center py-6 text-[var(--text-muted)]">
                        <Loader2 className="w-6 h-6 animate-spin" />
                    </div>
                ) : history.length === 0 ? (
                    <p className="text-center py-6 text-[var(--text-muted)]">Belum ada riwayat pengajuan</p>
                ) : (
                    <div className="space-y-3">
                        {history.map((h) => (
                            <div key={h.id} className="p-3 rounded-lg bg-[var(--surface-color)] border border-[var(--glass-border)] flex items-center gap-3">
                                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${h.leave_type === 'wfh' ? 'bg-purple-500' : 'bg-violet-500'}`}>
                                    {h.leave_type === 'wfh' ? <Home className="w-5 h-5 text-white" /> : <MapPin className="w-5 h-5 text-white" />}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <span className="font-medium text-[var(--text-primary)]">{h.leave_type.toUpperCase()}</span>
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
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
