"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Briefcase, ArrowLeft, Calendar, MapPin, Send, Loader2, FileText, CheckCircle, XCircle, AlertCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export default function BusinessTripPage() {
    const router = useRouter();
    const { user, profile } = useAuth();
    const supabase = createClient();

    const [destination, setDestination] = useState("");
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [purpose, setPurpose] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [history, setHistory] = useState<any[]>([]);
    const [isLoadingHistory, setIsLoadingHistory] = useState(true);

    // Fetch history
    // Fetch history
    useEffect(() => {
        fetchHistory();
    }, [user]);

    // Calculate days
    const calculateDays = () => {
        if (!startDate) return 0;
        if (!endDate || endDate === startDate) return 1;
        const start = new Date(startDate);
        const end = new Date(endDate);
        return Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    };

    const totalDays = calculateDays();

    const [success, setSuccess] = useState(false);

    const fetchHistory = async () => {
        if (!user) return;
        const { data } = await supabase
            .from("leave_requests")
            .select("id, start_date, end_date, reason, status, created_at")
            .eq("profile_id", user.id)
            .eq("leave_type", "business_trip")
            .order("created_at", { ascending: false })
            .limit(5);

        // Map data to match UI expectations (mapping reason back to destination/purpose if needed, or just showing reason)
        const mappedData = (data || []).map((item: any) => {
            // Simple hack: Extract destination from reason if it starts with "Destination: "
            const destMatch = item.reason?.match(/Destination: (.*?)(?:\n|$)/);
            return {
                ...item,
                destination: destMatch ? destMatch[1] : 'Business Trip',
                purpose: item.reason
            };
        });

        setHistory(mappedData);
        setIsLoadingHistory(false);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!user || !profile) {
            setError("Anda harus login");
            return;
        }

        if (!destination.trim()) {
            setError("Destinasi harus diisi");
            return;
        }

        if (!startDate) {
            setError("Tanggal mulai harus diisi");
            return;
        }

        if (!endDate) {
            setError("Tanggal selesai harus diisi");
            return;
        }

        setIsSubmitting(true);
        setError(null);
        setSuccess(false);

        try {
            const { error: insertError } = await supabase
                .from("leave_requests")
                .insert({
                    profile_id: user.id,
                    leave_type: 'business_trip',
                    start_date: startDate,
                    end_date: endDate,
                    reason: `Destination: ${destination.trim()}\n\n${purpose.trim()}`,
                    status: 'pending' // Pending approval
                });

            if (insertError) {
                setError("Gagal melaporkan: " + insertError.message);
                return;
            }

            // Success handling
            setSuccess(true);
            setDestination("");
            setStartDate("");
            setEndDate("");
            setPurpose("");
            fetchHistory(); // Refresh history list

            // Hide success message after 3 seconds
            setTimeout(() => setSuccess(false), 3000);

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
                        <span className="text-[var(--text-primary)]">Perjalanan Dinas</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-amber-500 flex items-center justify-center shadow-lg">
                            <Briefcase className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h2 className="text-3xl font-bold tracking-tight text-[var(--text-primary)]">Perjalanan Dinas</h2>
                            <p className="text-[var(--text-secondary)] text-sm">Laporkan perjalanan dinas Anda</p>
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
            <div className="glass-panel rounded-xl p-4 mb-6 flex items-start gap-3 border-l-4 border-amber-500">
                <Briefcase className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                <div className="text-sm">
                    <p className="font-medium text-[var(--text-primary)]">Pengajuan Perjalanan Dinas</p>
                    <p className="text-[var(--text-muted)]">
                        Laporan ini akan menunggu persetujuan CEO sebelum tercatat ke absensi.
                    </p>
                </div>
            </div>

            {/* Form */}
            <div className="glass-panel rounded-xl p-6 flex-1">
                <form onSubmit={handleSubmit} className="space-y-6">
                    {error && (
                        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-red-500 dark:text-red-400 text-sm flex items-center gap-2">
                            <AlertCircle className="w-4 h-4" />
                            {error}
                        </div>
                    )}

                    {success && (
                        <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 text-amber-600 dark:text-amber-400 text-sm flex items-center gap-2">
                            <AlertCircle className="w-4 h-4" />
                            Perjalanan dinas berhasil diajukan! Menunggu konfirmasi CEO.
                        </div>
                    )}

                    {/* Destination */}
                    <div>
                        <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                            <MapPin className="w-4 h-4 inline mr-2" />
                            Destinasi
                        </label>
                        <input
                            type="text"
                            value={destination}
                            onChange={(e) => setDestination(e.target.value)}
                            placeholder="Contoh: Jakarta, Surabaya, Bandung..."
                            className="w-full px-4 py-3 rounded-lg bg-[var(--surface-color)] border border-[var(--glass-border)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-amber-500 transition-colors"
                            required
                        />
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
                                onChange={(e) => setStartDate(e.target.value)}
                                className="w-full px-4 py-3 rounded-lg bg-[var(--surface-color)] border border-[var(--glass-border)] text-[var(--text-primary)] focus:outline-none focus:border-amber-500 transition-colors"
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
                                className="w-full px-4 py-3 rounded-lg bg-[var(--surface-color)] border border-[var(--glass-border)] text-[var(--text-primary)] focus:outline-none focus:border-amber-500 transition-colors"
                                required
                            />
                        </div>
                    </div>

                    {totalDays > 0 && (
                        <div className="text-center py-2 px-4 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 text-sm font-medium">
                            <Briefcase className="w-4 h-4 inline mr-2" />
                            Durasi: {totalDays} hari perjalanan dinas
                        </div>
                    )}

                    {/* Purpose */}
                    <div>
                        <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                            <FileText className="w-4 h-4 inline mr-2" />
                            Keperluan / Tujuan (Opsional)
                        </label>
                        <textarea
                            value={purpose}
                            onChange={(e) => setPurpose(e.target.value)}
                            placeholder="Deskripsi singkat keperluan perjalanan dinas..."
                            rows={3}
                            className="w-full px-4 py-3 rounded-lg bg-[var(--surface-color)] border border-[var(--glass-border)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-amber-500 transition-colors resize-none"
                        />
                    </div>

                    {/* Submit */}
                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full py-3 rounded-lg bg-amber-500 hover:bg-amber-600 !text-white font-semibold transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                        {isSubmitting ? (
                            <>
                                <Loader2 className="w-5 h-5 animate-spin !text-white" />
                                Mengirim...
                            </>
                        ) : (
                            <>
                                <Send className="w-5 h-5 !text-white" />
                                Laporkan Perjalanan Dinas
                            </>
                        )}
                    </button>
                </form>
            </div>

            {/* History Section */}
            <div className="glass-panel rounded-xl p-6 mt-6">
                <h3 className="font-semibold text-lg text-[var(--text-primary)] mb-4 flex items-center gap-2">
                    📜 Riwayat Perjalanan Dinas
                </h3>
                {isLoadingHistory ? (
                    <div className="flex items-center justify-center py-6 text-[var(--text-muted)]">
                        <Loader2 className="w-6 h-6 animate-spin" />
                    </div>
                ) : history.length === 0 ? (
                    <p className="text-center py-6 text-[var(--text-muted)]">Belum ada riwayat perjalanan dinas</p>
                ) : (
                    <div className="space-y-3">
                        {history.map((h) => (
                            <div key={h.id} className="p-3 rounded-lg bg-[var(--surface-color)] border border-[var(--glass-border)] flex items-center gap-3">
                                <div className="w-10 h-10 rounded-lg bg-amber-500 flex items-center justify-center">
                                    <Briefcase className="w-5 h-5 text-white" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <span className="font-medium text-[var(--text-primary)]">{h.destination}</span>
                                        {h.status === 'approved' ? (
                                            <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center gap-1">
                                                <CheckCircle className="w-3 h-3" />
                                                Terkonfirmasi
                                            </span>
                                        ) : h.status === 'rejected' ? (
                                            <span className="text-xs px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-500 flex items-center gap-1">
                                                <XCircle className="w-3 h-3" />
                                                Ditolak
                                            </span>
                                        ) : (
                                            <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-500 flex items-center gap-1">
                                                <AlertCircle className="w-3 h-3" />
                                                Menunggu Konfirmasi
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-xs text-[var(--text-muted)] truncate">
                                        {new Date(h.start_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                                        {h.start_date !== h.end_date && ` - ${new Date(h.end_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}`}
                                        {h.purpose && ` • ${h.purpose}`}
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
