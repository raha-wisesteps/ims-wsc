"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Thermometer, ArrowLeft, Calendar, Send, Loader2, AlertCircle, FileText, CheckCircle, XCircle, ChevronRight } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { sendEmailNotification } from "@/lib/email-notification";

export default function SakitPage() {
    const router = useRouter();
    const { user, profile } = useAuth();
    const supabase = createClient();

    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [isPastDate, setIsPastDate] = useState(false);
    const [symptoms, setSymptoms] = useState("");
    const [hasDoctorNote, setHasDoctorNote] = useState(false);
    const [attachmentUrl, setAttachmentUrl] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [history, setHistory] = useState<any[]>([]);
    const [isLoadingHistory, setIsLoadingHistory] = useState(true);

    // Fetch history
    useEffect(() => {
        const fetchHistory = async () => {
            if (!user) return;
            const { data } = await supabase
                .from("leave_requests")
                .select("id, leave_type, start_date, end_date, reason, status, created_at")
                .eq("profile_id", user.id)
                .eq("leave_type", "sick_leave")
                .order("created_at", { ascending: false })
                .limit(5);
            setHistory(data || []);
            setIsLoadingHistory(false);
        };
        fetchHistory();
    }, [user]);

    // Check if selected date is in the past
    const checkPastDate = (dateStr: string) => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const selectedDate = new Date(dateStr);
        return selectedDate < today;
    };

    const handleStartDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const date = e.target.value;
        setStartDate(date);
        setIsPastDate(checkPastDate(date));
    };

    // Calculate days
    const calculateDays = () => {
        if (!startDate) return 0;
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

        if (!symptoms.trim()) {
            setError("Keluhan/gejala harus diisi");
            return;
        }

        // For past dates, require confirmation
        if (isPastDate && requestedDays > 2 && !hasDoctorNote) {
            setError("Untuk sakit lebih dari 2 hari, surat dokter diperlukan");
            return;
        }

        setIsSubmitting(true);
        setError(null);

        try {
            const { error: insertError } = await supabase
                .from("leave_requests")
                .insert({
                    profile_id: user.id,
                    leave_type: "sick_leave",
                    start_date: startDate,
                    end_date: endDate || startDate,
                    reason: `${isPastDate ? "[LAPORAN TERLAMBAT] " : ""}${symptoms.trim()}${hasDoctorNote ? "\n\n✓ Surat dokter akan diserahkan" : ""}`,
                    attachment_url: attachmentUrl.trim() || null,
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
                leave_type: "sick_leave",
                requester_name: profile.full_name || "Karyawan",
                start_date: startDate,
                end_date: endDate || startDate,
                reason: symptoms.trim(),
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
                        <span className="text-[var(--text-primary)]">Sakit</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-rose-500 flex items-center justify-center shadow-lg">
                            <Thermometer className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h2 className="text-3xl font-bold tracking-tight text-[var(--text-primary)]">Laporan Sakit</h2>
                            <p className="text-[var(--text-secondary)] text-sm">Sick Leave Report</p>
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

            {/* Info Banner */}
            <div className="glass-panel rounded-xl p-4 mb-6 flex items-start gap-3 border-l-4 border-rose-500">
                <AlertCircle className="w-5 h-5 text-rose-500 flex-shrink-0 mt-0.5" />
                <div className="text-sm">
                    <p className="font-medium text-[var(--text-primary)]">Laporan Sakit</p>
                    <p className="text-[var(--text-muted)]">
                        Anda dapat melaporkan sakit untuk hari ini atau hari yang sudah lewat.
                        Untuk sakit lebih dari 2 hari, surat dokter diperlukan.
                    </p>
                </div>
            </div>

            {/* Form */}
            <div className="glass-panel rounded-xl p-6 flex-1">
                <form onSubmit={handleSubmit} className="space-y-6">
                    {error && (
                        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-red-500 dark:text-red-400 text-sm">
                            {error}
                        </div>
                    )}

                    {/* Date Range */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                                <Calendar className="w-4 h-4 inline mr-2" />
                                Tanggal Mulai Sakit
                            </label>
                            <input
                                type="date"
                                value={startDate}
                                onChange={handleStartDateChange}
                                className="w-full px-4 py-3 rounded-lg bg-[var(--surface-color)] border border-[var(--glass-border)] text-[var(--text-primary)] focus:outline-none focus:border-rose-500 transition-colors"
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
                                min={startDate}
                                className="w-full px-4 py-3 rounded-lg bg-[var(--surface-color)] border border-[var(--glass-border)] text-[var(--text-primary)] focus:outline-none focus:border-rose-500 transition-colors"
                            />
                            <p className="text-xs text-[var(--text-muted)] mt-1">Kosongkan jika hanya 1 hari</p>
                        </div>
                    </div>

                    {isPastDate && (
                        <div className="text-center py-2 px-4 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 text-sm font-medium flex items-center justify-center gap-2">
                            <AlertCircle className="w-4 h-4" />
                            Laporan untuk tanggal yang sudah lewat
                        </div>
                    )}

                    {requestedDays > 0 && (
                        <div className="text-center py-2 px-4 rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400 text-sm font-medium">
                            🤒 Total: {requestedDays} hari sakit
                        </div>
                    )}

                    {/* Symptoms */}
                    <div>
                        <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                            <Thermometer className="w-4 h-4 inline mr-2" />
                            Keluhan / Gejala
                        </label>
                        <textarea
                            value={symptoms}
                            onChange={(e) => setSymptoms(e.target.value)}
                            placeholder="Contoh: Demam, batuk, pilek..."
                            rows={3}
                            className="w-full px-4 py-3 rounded-lg bg-[var(--surface-color)] border border-[var(--glass-border)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-rose-500 transition-colors resize-none"
                            required
                        />
                    </div>

                    {/* Doctor's Note */}
                    {requestedDays > 2 && (
                        <div
                            onClick={() => setHasDoctorNote(!hasDoctorNote)}
                            className={`p-4 rounded-xl border cursor-pointer transition-all ${hasDoctorNote
                                ? "border-rose-500 bg-rose-500/10"
                                : "border-[var(--glass-border)] bg-[var(--surface-color)]"
                                }`}
                        >
                            <div className="flex items-center gap-3">
                                <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${hasDoctorNote ? "border-rose-500 bg-rose-500" : "border-[var(--glass-border)]"}`}>
                                    {hasDoctorNote && <span className="text-white text-xs">✓</span>}
                                </div>
                                <div className="flex items-center gap-2">
                                    <FileText className="w-4 h-4 text-[var(--text-muted)]" />
                                    <span className="text-[var(--text-primary)]">Saya akan menyerahkan surat dokter</span>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Attachment URL */}
                    <div>
                        <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                            <FileText className="w-4 h-4 inline mr-2" />
                            Link Bukti Sakit (Opsional)
                        </label>
                        <input
                            type="url"
                            value={attachmentUrl}
                            onChange={(e) => setAttachmentUrl(e.target.value)}
                            placeholder="Link Google Drive atau URL foto surat dokter..."
                            className="w-full px-4 py-3 rounded-lg bg-[var(--surface-color)] border border-[var(--glass-border)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-rose-500 transition-colors"
                        />
                        <p className="text-xs text-[var(--text-muted)] mt-1">Contoh: https://drive.google.com/...</p>
                    </div>

                    {/* Submit */}
                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full py-3 rounded-lg bg-rose-500 hover:bg-rose-600 !text-white font-semibold transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                        {isSubmitting ? (
                            <>
                                <Loader2 className="w-5 h-5 animate-spin !text-white" />
                                Mengirim...
                            </>
                        ) : (
                            <>
                                <Send className="w-5 h-5 !text-white" />
                                Kirim Laporan Sakit
                            </>
                        )}
                    </button>
                </form>
            </div>

            {/* History Section */}
            <div className="glass-panel rounded-xl p-6 mt-6">
                <h3 className="font-semibold text-lg text-[var(--text-primary)] mb-4 flex items-center gap-2">
                    📜 Riwayat Laporan Sakit
                </h3>
                {isLoadingHistory ? (
                    <div className="flex items-center justify-center py-6 text-[var(--text-muted)]">
                        <Loader2 className="w-6 h-6 animate-spin" />
                    </div>
                ) : history.length === 0 ? (
                    <p className="text-center py-6 text-[var(--text-muted)]">Belum ada riwayat laporan sakit</p>
                ) : (
                    <div className="space-y-3">
                        {history.map((h) => (
                            <div key={h.id} className="p-3 rounded-lg bg-[var(--surface-color)] border border-[var(--glass-border)] flex items-center gap-3">
                                <div className="w-10 h-10 rounded-lg bg-rose-500 flex items-center justify-center">
                                    <Thermometer className="w-5 h-5 text-white" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <span className="font-medium text-[var(--text-primary)]">Sakit</span>
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
