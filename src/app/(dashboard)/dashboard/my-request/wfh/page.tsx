"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Home, ArrowLeft, Calendar, Send, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export default function WFHRequestPage() {
    const router = useRouter();
    const { user, profile, leaveQuota } = useAuth();
    const supabase = createClient();

    const [date, setDate] = useState("");
    const [reason, setReason] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Calculate remaining WFH quota
    const wfhUsed = leaveQuota?.wfh_weekly_used || 0;
    const wfhLimit = leaveQuota?.wfh_weekly_limit || 1;
    const wfhRemaining = wfhLimit - wfhUsed;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!user || !profile) {
            setError("Anda harus login untuk mengajukan WFH");
            return;
        }

        if (!date) {
            setError("Tanggal harus diisi");
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
                    leave_type: "wfh",
                    start_date: date,
                    end_date: date,
                    reason: reason.trim(),
                    status: "pending",
                });

            if (insertError) {
                console.error("Insert error:", insertError);
                setError("Gagal mengajukan WFH: " + insertError.message);
                return;
            }

            // Success - redirect back to my-request
            router.push("/dashboard/my-request");
        } catch (err) {
            console.error("Submit error:", err);
            setError("Terjadi kesalahan saat mengajukan WFH");
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
                        <span>/</span>
                        <Link href="/dashboard/my-request" className="hover:text-[#3f545f] dark:hover:text-[#e8c559]">My Request</Link>
                        <span>/</span>
                        <span className="text-[var(--text-primary)]">WFH</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-purple-500 flex items-center justify-center text-white shadow-lg">
                            <Home className="w-6 h-6" />
                        </div>
                        <div>
                            <h2 className="text-3xl font-bold tracking-tight text-[var(--text-primary)]">Pengajuan WFH</h2>
                            <p className="text-[var(--text-secondary)] text-sm">Work From Home Request</p>
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

            {/* Quota Info */}
            <div className="glass-panel rounded-xl p-4 mb-6">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-sm text-[var(--text-muted)]">Sisa Jatah WFH Minggu Ini</p>
                        <p className="text-2xl font-bold text-[var(--text-primary)]">
                            {wfhRemaining} <span className="text-base font-normal text-[var(--text-muted)]">/ {wfhLimit} hari</span>
                        </p>
                    </div>
                    <div className={`w-16 h-16 rounded-full flex items-center justify-center text-white font-bold text-xl ${wfhRemaining > 0 ? 'bg-emerald-500' : 'bg-rose-500'}`}>
                        {wfhRemaining}
                    </div>
                </div>
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

                    {/* Date Picker */}
                    <div>
                        <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                            <Calendar className="w-4 h-4 inline mr-2" />
                            Tanggal WFH
                        </label>
                        <input
                            type="date"
                            value={date}
                            onChange={(e) => setDate(e.target.value)}
                            min={new Date().toISOString().split('T')[0]}
                            className="w-full px-4 py-3 rounded-lg bg-[var(--surface-color)] border border-[var(--glass-border)] text-[var(--text-primary)] focus:outline-none focus:border-purple-500 transition-colors"
                            required
                        />
                    </div>

                    {/* Reason */}
                    <div>
                        <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                            Alasan WFH
                        </label>
                        <textarea
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            placeholder="Jelaskan alasan Anda mengajukan WFH..."
                            rows={4}
                            className="w-full px-4 py-3 rounded-lg bg-[var(--surface-color)] border border-[var(--glass-border)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-purple-500 transition-colors resize-none"
                            required
                        />
                    </div>

                    {/* Submit Button */}
                    <button
                        type="submit"
                        disabled={isSubmitting || wfhRemaining <= 0}
                        className="w-full py-3 rounded-lg bg-purple-500 hover:bg-purple-600 !text-white font-semibold transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isSubmitting ? (
                            <>
                                <Loader2 className="w-5 h-5 animate-spin !text-white" />
                                Mengajukan...
                            </>
                        ) : (
                            <>
                                <Send className="w-5 h-5 !text-white" />
                                Ajukan WFH
                            </>
                        )}
                    </button>

                    {wfhRemaining <= 0 && (
                        <p className="text-center text-sm text-rose-500">
                            Jatah WFH minggu ini sudah habis
                        </p>
                    )}
                </form>
            </div>
        </div>
    );
}
