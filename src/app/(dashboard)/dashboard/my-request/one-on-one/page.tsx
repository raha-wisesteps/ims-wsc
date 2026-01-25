"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Users, ArrowLeft, Calendar, Send, Loader2, CheckCircle, XCircle, AlertCircle, Clock, FileText } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const MEETING_TYPES = [
    { id: "career", label: "Career Discussion", description: "Diskusi karir & pengembangan diri" },
    { id: "feedback", label: "Feedback Session", description: "Feedback performa / review" },
    { id: "concerns", label: "Personal Concerns", description: "Hal pribadi / kesejahteraan" },
    { id: "ideas", label: "Ideas & Suggestions", description: "Ide & saran improvement" },
    { id: "other", label: "Lainnya", description: "Topik lainnya" },
];

export default function OneOnOnePage() {
    const router = useRouter();
    const { user, profile } = useAuth();
    const supabase = createClient();

    const [meetingType, setMeetingType] = useState("career");
    const [preferredDate, setPreferredDate] = useState("");
    const [preferredTime, setPreferredTime] = useState("");
    const [topic, setTopic] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [history, setHistory] = useState<any[]>([]);
    const [isLoadingHistory, setIsLoadingHistory] = useState(true);

    // Fetch history
    useEffect(() => {
        const fetchHistory = async () => {
            if (!user) return;
            const { data } = await supabase
                .from("other_requests")
                .select("id, request_type, request_date, reason, status, created_at")
                .eq("profile_id", user.id)
                .eq("request_type", "one_on_one")
                .order("created_at", { ascending: false })
                .limit(5);
            setHistory(data || []);
            setIsLoadingHistory(false);
        };
        fetchHistory();
    }, [user]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!user || !profile) {
            setError("Anda harus login");
            return;
        }

        if (!preferredDate) {
            setError("Tanggal preferensi harus diisi");
            return;
        }

        if (!topic.trim()) {
            setError("Topik diskusi harus diisi");
            return;
        }

        setIsSubmitting(true);
        setError(null);

        try {
            const typeLabel = MEETING_TYPES.find(t => t.id === meetingType)?.label || meetingType;

            const { error: insertError } = await supabase
                .from("other_requests")
                .insert({
                    profile_id: user.id,
                    request_type: "one_on_one",
                    request_date: preferredDate,
                    reason: `[${typeLabel}]${preferredTime ? ` Waktu: ${preferredTime}` : ''}\n\n${topic}`,
                    status: "pending",
                });

            if (insertError) {
                setError("Gagal mengajukan: " + insertError.message);
                return;
            }

            // Create submission notification
            await supabase
                .from('notifications')
                .insert({
                    profile_id: user.id,
                    type: 'request_new',
                    title: 'Request 1-on-1 Terkirim',
                    message: `Request sesi 1-on-1 telah dikirim dan menunggu jadwal.`,
                    related_request_type: 'one_on_one',
                    is_read: false
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
                        <span>/</span>
                        <Link href="/dashboard/my-request" className="hover:text-[#3f545f] dark:hover:text-[#e8c559]">My Request</Link>
                        <span>/</span>
                        <span className="text-[var(--text-primary)]">1-on-1</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-pink-500 flex items-center justify-center shadow-lg">
                            <Users className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h2 className="text-3xl font-bold tracking-tight text-[var(--text-primary)]">Sesi 1-on-1</h2>
                            <p className="text-[var(--text-secondary)] text-sm">Ajukan sesi diskusi dengan Manager</p>
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
            <div className="glass-panel rounded-xl p-4 mb-6 flex items-start gap-3 border-l-4 border-pink-500">
                <Users className="w-5 h-5 text-pink-500 flex-shrink-0 mt-0.5" />
                <div className="text-sm">
                    <p className="font-medium text-[var(--text-primary)]">Sesi 1-on-1</p>
                    <p className="text-[var(--text-muted)]">
                        Request untuk sesi diskusi personal dengan Manager. Topik bersifat rahasia.
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

                    {/* Meeting Type */}
                    <div>
                        <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">Kategori Diskusi</label>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                            {MEETING_TYPES.map((type) => (
                                <button
                                    key={type.id}
                                    type="button"
                                    onClick={() => setMeetingType(type.id)}
                                    className={`p-3 rounded-lg border text-left transition-all ${meetingType === type.id
                                        ? "border-pink-500 bg-pink-500/10"
                                        : "border-[var(--glass-border)] bg-[var(--surface-color)] hover:border-[var(--glass-border-hover)]"
                                        }`}
                                >
                                    <p className={`font-medium text-sm ${meetingType === type.id ? "text-pink-600 dark:text-pink-400" : "text-[var(--text-primary)]"}`}>
                                        {type.label}
                                    </p>
                                    <p className="text-xs text-[var(--text-muted)]">{type.description}</p>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Date & Time */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                                <Calendar className="w-4 h-4 inline mr-2" />
                                Tanggal Preferensi
                            </label>
                            <input
                                type="date"
                                value={preferredDate}
                                onChange={(e) => setPreferredDate(e.target.value)}
                                min={new Date().toISOString().split('T')[0]}
                                className="w-full px-4 py-3 rounded-lg bg-[var(--surface-color)] border border-[var(--glass-border)] text-[var(--text-primary)] focus:outline-none focus:border-pink-500 transition-colors"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                                <Clock className="w-4 h-4 inline mr-2" />
                                Waktu Preferensi (Opsional)
                            </label>
                            <input
                                type="time"
                                value={preferredTime}
                                onChange={(e) => setPreferredTime(e.target.value)}
                                className="w-full px-4 py-3 rounded-lg bg-[var(--surface-color)] border border-[var(--glass-border)] text-[var(--text-primary)] focus:outline-none focus:border-pink-500 transition-colors"
                            />
                        </div>
                    </div>

                    {/* Topic */}
                    <div>
                        <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                            <FileText className="w-4 h-4 inline mr-2" />
                            Topik yang Ingin Didiskusikan
                        </label>
                        <textarea
                            value={topic}
                            onChange={(e) => setTopic(e.target.value)}
                            placeholder="Jelaskan secara singkat apa yang ingin didiskusikan..."
                            rows={4}
                            className="w-full px-4 py-3 rounded-lg bg-[var(--surface-color)] border border-[var(--glass-border)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-pink-500 transition-colors resize-none"
                            required
                        />
                    </div>

                    {/* Submit */}
                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full py-3 rounded-lg bg-pink-500 hover:bg-pink-600 !text-white font-semibold transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                        {isSubmitting ? (
                            <>
                                <Loader2 className="w-5 h-5 animate-spin !text-white" />
                                Mengajukan...
                            </>
                        ) : (
                            <>
                                <Send className="w-5 h-5 !text-white" />
                                Request Sesi 1-on-1
                            </>
                        )}
                    </button>
                </form>
            </div>

            {/* History Section */}
            <div className="glass-panel rounded-xl p-6 mt-6">
                <h3 className="font-semibold text-lg text-[var(--text-primary)] mb-4 flex items-center gap-2">
                    📜 Riwayat Sesi 1-on-1
                </h3>
                {isLoadingHistory ? (
                    <div className="flex items-center justify-center py-6 text-[var(--text-muted)]">
                        <Loader2 className="w-6 h-6 animate-spin" />
                    </div>
                ) : history.length === 0 ? (
                    <p className="text-center py-6 text-[var(--text-muted)]">Belum ada riwayat request 1-on-1</p>
                ) : (
                    <div className="space-y-3">
                        {history.map((h) => (
                            <div key={h.id} className="p-3 rounded-lg bg-[var(--surface-color)] border border-[var(--glass-border)] flex items-center gap-3">
                                <div className="w-10 h-10 rounded-lg bg-pink-500 flex items-center justify-center">
                                    <Users className="w-5 h-5 text-white" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <span className="font-medium text-[var(--text-primary)]">1-on-1</span>
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
                                        {new Date(h.request_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                                        {' • '}{h.reason?.split('\n')[0] || h.reason}
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
