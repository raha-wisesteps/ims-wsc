"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Clock, ArrowLeft, Send, Loader2, Calendar, CheckCircle, XCircle, AlertCircle, ChevronRight } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { sendEmailNotification } from "@/lib/email-notification";

export default function OvertimeRequestPage() {
    const router = useRouter();
    const { user, profile } = useAuth();
    const supabase = createClient();

    const [date, setDate] = useState("");
    const [startTime, setStartTime] = useState("");
    const [endTime, setEndTime] = useState("");
    const [reason, setReason] = useState("");
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
                .select("id, leave_type, start_date, reason, status, total_hours, created_at")
                .eq("profile_id", user.id)
                .eq("leave_type", "overtime")
                .order("created_at", { ascending: false })
                .limit(5);
            setHistory(data || []);
            setIsLoadingHistory(false);
        };
        fetchHistory();
    }, [user]);

    // Calculate hours
    const calculateHours = () => {
        if (!startTime || !endTime) return 0;
        const start = new Date(`2000-01-01T${startTime}`);
        const end = new Date(`2000-01-01T${endTime}`);
        let diff = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
        if (diff < 0) diff += 24; // Handle overnight
        return Math.round(diff * 10) / 10;
    };

    const totalHours = calculateHours();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!user || !profile) {
            setError("Anda harus login untuk mengajukan lembur");
            return;
        }

        if (!date) {
            setError("Tanggal harus diisi");
            return;
        }

        if (!startTime || !endTime) {
            setError("Waktu mulai dan selesai harus diisi");
            return;
        }

        if (totalHours <= 0) {
            setError("Durasi lembur harus lebih dari 0 jam");
            return;
        }

        if (!reason.trim()) {
            setError("Alasan harus diisi");
            return;
        }

        setIsSubmitting(true);
        setError(null);

        try {
            const { error: insertError } = await supabase
                .from("leave_requests")
                .insert({
                    profile_id: user.id,
                    leave_type: "overtime",
                    start_date: date,
                    end_date: date,
                    start_time: startTime,
                    end_time: endTime,
                    total_hours: totalHours,
                    reason: reason.trim(),
                    status: "pending",
                });

            if (insertError) {
                console.error("Insert error:", insertError);
                setError("Gagal mengajukan lembur: " + insertError.message);
                return;
            }

            // Send email notification to CEO (await to prevent abort on redirect)
            await sendEmailNotification({
                type: "new_request",
                request_id: "",
                profile_id: user.id,
                leave_type: "overtime",
                requester_name: profile.full_name || "Karyawan",
                start_date: date,
                end_date: date,
                reason: reason.trim(),
            });

            // Success - redirect back to my-request
            router.push("/dashboard/my-request");
        } catch (err) {
            console.error("Submit error:", err);
            setError("Terjadi kesalahan saat mengajukan lembur");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="flex flex-col h-full overflow-auto">
            {/* Page Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                <div>
                    <div className="flex items-center gap-2 text-sm text-[var(--text-muted)] mb-1">
                        <Link href="/dashboard" className="hover:text-[#3f545f] dark:hover:text-[#e8c559]">Dashboard</Link>
                        <ChevronRight className="w-4 h-4 text-[var(--text-muted)]" />
                        <Link href="/dashboard/my-request" className="hover:text-[#3f545f] dark:hover:text-[#e8c559]">My Request</Link>
                        <ChevronRight className="w-4 h-4 text-[var(--text-muted)]" />
                        <span className="text-[var(--text-primary)]">Lembur</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-orange-500 flex items-center justify-center text-white shadow-lg">
                            <Clock className="w-6 h-6" />
                        </div>
                        <div>
                            <h2 className="text-3xl font-bold tracking-tight text-[var(--text-primary)]">Pengajuan Lembur</h2>
                            <p className="text-[var(--text-secondary)] text-sm">Overtime Request</p>
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

            {/* Form */}
            <div className="glass-panel rounded-xl p-6 flex-1">
                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Error Display */}
                    {error && (
                        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-red-500 dark:text-red-400 text-sm">
                            {error}
                        </div>
                    )}

                    {/* Date */}
                    <div>
                        <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                            <Calendar className="w-4 h-4 inline mr-2" />
                            Tanggal Lembur
                        </label>
                        <input
                            type="date"
                            value={date}
                            onChange={(e) => setDate(e.target.value)}
                            className="w-full px-4 py-3 rounded-lg bg-[var(--surface-color)] border border-[var(--glass-border)] text-[var(--text-primary)] focus:outline-none focus:border-orange-500 transition-colors"
                            required
                        />
                    </div>

                    {/* Time Range - Custom Select UI */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Start Time */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-[var(--text-primary)] flex items-center gap-2">
                                <Clock className="w-4 h-4" /> Jam Mulai
                            </label>
                            <div className="flex gap-2">
                                <select
                                    value={startTime.split(':')[0] || ""}
                                    onChange={(e) => {
                                        const min = startTime.split(':')[1] || "00";
                                        setStartTime(`${e.target.value}:${min}`);
                                    }}
                                    className="flex-1 px-4 py-3 rounded-xl bg-[var(--surface-color)] border border-[var(--glass-border)] text-[var(--text-primary)] focus:outline-none focus:border-orange-500 transition-all appearance-none cursor-pointer hover:bg-[var(--glass-bg)]"
                                    required
                                >
                                    <option value="" disabled>Jam</option>
                                    {Array.from({ length: 24 }).map((_, i) => (
                                        <option key={i} value={i.toString().padStart(2, '0')}>
                                            {i.toString().padStart(2, '0')}
                                        </option>
                                    ))}
                                </select>
                                <span className="self-center font-bold text-[var(--text-muted)]">:</span>
                                <select
                                    value={startTime.split(':')[1] || "00"}
                                    onChange={(e) => {
                                        const hour = startTime.split(':')[0] || "09"; // Default hour if not picked
                                        setStartTime(`${hour}:${e.target.value}`);
                                    }}
                                    className="w-24 px-4 py-3 rounded-xl bg-[var(--surface-color)] border border-[var(--glass-border)] text-[var(--text-primary)] focus:outline-none focus:border-orange-500 transition-all appearance-none cursor-pointer hover:bg-[var(--glass-bg)]"
                                >
                                    <option value="00">00</option>
                                    <option value="15">15</option>
                                    <option value="30">30</option>
                                    <option value="45">45</option>
                                </select>
                            </div>
                        </div>

                        {/* End Time */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-[var(--text-primary)] flex items-center gap-2">
                                <Clock className="w-4 h-4" /> Jam Selesai
                            </label>
                            <div className="flex gap-2">
                                <select
                                    value={endTime.split(':')[0] || ""}
                                    onChange={(e) => {
                                        const min = endTime.split(':')[1] || "00";
                                        setEndTime(`${e.target.value}:${min}`);
                                    }}
                                    className="flex-1 px-4 py-3 rounded-xl bg-[var(--surface-color)] border border-[var(--glass-border)] text-[var(--text-primary)] focus:outline-none focus:border-orange-500 transition-all appearance-none cursor-pointer hover:bg-[var(--glass-bg)]"
                                    required
                                >
                                    <option value="" disabled>Jam</option>
                                    {Array.from({ length: 24 }).map((_, i) => (
                                        <option key={i} value={i.toString().padStart(2, '0')}>
                                            {i.toString().padStart(2, '0')}
                                        </option>
                                    ))}
                                </select>
                                <span className="self-center font-bold text-[var(--text-muted)]">:</span>
                                <select
                                    value={endTime.split(':')[1] || "00"}
                                    onChange={(e) => {
                                        const hour = endTime.split(':')[0] || "17"; // Default hour
                                        setEndTime(`${hour}:${e.target.value}`);
                                    }}
                                    className="w-24 px-4 py-3 rounded-xl bg-[var(--surface-color)] border border-[var(--glass-border)] text-[var(--text-primary)] focus:outline-none focus:border-orange-500 transition-all appearance-none cursor-pointer hover:bg-[var(--glass-bg)]"
                                >
                                    <option value="00">00</option>
                                    <option value="15">15</option>
                                    <option value="30">30</option>
                                    <option value="45">45</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    {totalHours > 0 && (
                        <div className="text-center py-2 px-4 rounded-lg bg-orange-500/10 text-orange-600 dark:text-orange-400 text-sm font-medium">
                            ⏱️ Total: {totalHours} jam
                        </div>
                    )}


                    {/* Reason */}
                    <div>
                        <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                            Alasan Lembur
                        </label>
                        <textarea
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            placeholder="Jelaskan pekerjaan yang perlu dilembur..."
                            rows={4}
                            className="w-full px-4 py-3 rounded-lg bg-[var(--surface-color)] border border-[var(--glass-border)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-orange-500 transition-colors resize-none"
                            required
                        />
                    </div>

                    {/* Submit Button */}
                    <button
                        type="submit"
                        disabled={isSubmitting || totalHours <= 0}
                        className="w-full py-3 rounded-lg bg-orange-500 hover:bg-orange-600 !text-white font-semibold transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isSubmitting ? (
                            <>
                                <Loader2 className="w-5 h-5 animate-spin !text-white" />
                                Mengajukan...
                            </>
                        ) : (
                            <>
                                <Send className="w-5 h-5 !text-white" />
                                Ajukan Lembur
                            </>
                        )}
                    </button>
                </form>
            </div>

            {/* History Section */}
            <div className="glass-panel rounded-xl p-6 mt-6">
                <h3 className="font-semibold text-lg text-[var(--text-primary)] mb-4 flex items-center gap-2">
                    📜 Riwayat Pengajuan Lembur
                </h3>
                {isLoadingHistory ? (
                    <div className="flex items-center justify-center py-6 text-[var(--text-muted)]">
                        <Loader2 className="w-6 h-6 animate-spin" />
                    </div>
                ) : history.length === 0 ? (
                    <p className="text-center py-6 text-[var(--text-muted)]">Belum ada riwayat pengajuan lembur</p>
                ) : (
                    <div className="space-y-3">
                        {history.map((h) => (
                            <div key={h.id} className="p-3 rounded-lg bg-[var(--surface-color)] border border-[var(--glass-border)] flex items-center gap-3">
                                <div className="w-10 h-10 rounded-lg bg-orange-500 flex items-center justify-center">
                                    <Clock className="w-5 h-5 text-white" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <span className="font-medium text-[var(--text-primary)]">{h.total_hours || 0} jam</span>
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
