"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Package, ArrowLeft, Calendar, Send, Loader2, CheckCircle, XCircle, AlertCircle, DollarSign, Link2, FileText, ChevronRight } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const ASSET_TYPES = [
    { id: "laptop", label: "Laptop / Komputer", description: "Laptop, PC, Monitor" },
    { id: "peripheral", label: "Peripheral", description: "Mouse, Keyboard, Headset" },
    { id: "furniture", label: "Furniture", description: "Meja, Kursi, Storage" },
    { id: "software", label: "Software / License", description: "Software berlangganan" },
    { id: "other", label: "Lainnya", description: "Peralatan kerja lainnya" },
];

export default function AssetRequestPage() {
    const router = useRouter();
    const { user, profile } = useAuth();
    const supabase = createClient();

    const [assetType, setAssetType] = useState("laptop");
    const [itemName, setItemName] = useState("");
    const [estimatedCost, setEstimatedCost] = useState("");
    const [link, setLink] = useState("");
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
                .from("other_requests")
                .select("id, request_type, request_date, reason, status, created_at")
                .eq("profile_id", user.id)
                .eq("request_type", "asset")
                .order("created_at", { ascending: false })
                .limit(5);
            setHistory(data || []);
            setIsLoadingHistory(false);
        };
        fetchHistory();
    }, [user]);

    const formatCurrency = (value: string) => {
        const num = value.replace(/\D/g, '');
        return num ? parseInt(num).toLocaleString('id-ID') : '';
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!user || !profile) {
            setError("Anda harus login");
            return;
        }

        if (!itemName.trim()) {
            setError("Nama item harus diisi");
            return;
        }

        if (!reason.trim()) {
            setError("Alasan pengajuan harus diisi");
            return;
        }

        setIsSubmitting(true);
        setError(null);

        try {
            const typeLabel = ASSET_TYPES.find(t => t.id === assetType)?.label || assetType;
            const costNum = estimatedCost ? parseInt(estimatedCost.replace(/\D/g, '')) : 0;

            const { error: insertError } = await supabase
                .from("other_requests")
                .insert({
                    profile_id: user.id,
                    request_type: "asset",
                    request_date: new Date().toISOString().split('T')[0],
                    reason: `[${typeLabel}] ${itemName}${costNum > 0 ? ` - Est. Rp ${costNum.toLocaleString('id-ID')}` : ''}${link ? `\nLink: ${link}` : ''}\n\n${reason}`,
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
                    title: 'Pengajuan Asset Terkirim',
                    message: `Pengajuan asset "${itemName}" berhasil dikirim.`,
                    related_request_type: 'asset',
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
                        <ChevronRight className="w-4 h-4 text-[var(--text-muted)]" />
                        <Link href="/dashboard/my-request" className="hover:text-[#3f545f] dark:hover:text-[#e8c559]">My Request</Link>
                        <ChevronRight className="w-4 h-4 text-[var(--text-muted)]" />
                        <span className="text-[var(--text-primary)]">Asset</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-blue-500 flex items-center justify-center shadow-lg">
                            <Package className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h2 className="text-3xl font-bold tracking-tight text-[var(--text-primary)]">Pengajuan Asset</h2>
                            <p className="text-[var(--text-secondary)] text-sm">Ajukan peralatan atau fasilitas kerja</p>
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
            <div className="glass-panel rounded-xl p-4 mb-6 flex items-start gap-3 border-l-4 border-blue-500">
                <Package className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                <div className="text-sm">
                    <p className="font-medium text-[var(--text-primary)]">Kebijakan Asset Request</p>
                    <p className="text-[var(--text-muted)]">
                        Pengajuan asset akan direview oleh Manager dan Finance. Sertakan link referensi produk jika ada.
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

                    {/* Asset Type */}
                    <div>
                        <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">Kategori Asset</label>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                            {ASSET_TYPES.map((type) => (
                                <button
                                    key={type.id}
                                    type="button"
                                    onClick={() => setAssetType(type.id)}
                                    className={`p-3 rounded-lg border text-left transition-all ${assetType === type.id
                                        ? "border-blue-500 bg-blue-500/10"
                                        : "border-[var(--glass-border)] bg-[var(--surface-color)] hover:border-[var(--glass-border-hover)]"
                                        }`}
                                >
                                    <p className={`font-medium text-sm ${assetType === type.id ? "text-blue-600 dark:text-blue-400" : "text-[var(--text-primary)]"}`}>
                                        {type.label}
                                    </p>
                                    <p className="text-xs text-[var(--text-muted)]">{type.description}</p>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Item Name */}
                    <div>
                        <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                            <FileText className="w-4 h-4 inline mr-2" />
                            Nama Item / Spesifikasi
                        </label>
                        <input
                            type="text"
                            value={itemName}
                            onChange={(e) => setItemName(e.target.value)}
                            placeholder="Contoh: Logitech MX Master 3, Standing Desk 120cm..."
                            className="w-full px-4 py-3 rounded-lg bg-[var(--surface-color)] border border-[var(--glass-border)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-blue-500 transition-colors"
                            required
                        />
                    </div>

                    {/* Cost & Link */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                                <DollarSign className="w-4 h-4 inline mr-2" />
                                Estimasi Harga (Opsional)
                            </label>
                            <input
                                type="text"
                                value={estimatedCost}
                                onChange={(e) => setEstimatedCost(formatCurrency(e.target.value))}
                                placeholder="Rp 0"
                                className="w-full px-4 py-3 rounded-lg bg-[var(--surface-color)] border border-[var(--glass-border)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-blue-500 transition-colors"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                                <Link2 className="w-4 h-4 inline mr-2" />
                                Link Produk (Opsional)
                            </label>
                            <input
                                type="url"
                                value={link}
                                onChange={(e) => setLink(e.target.value)}
                                placeholder="https://tokopedia.link/..."
                                className="w-full px-4 py-3 rounded-lg bg-[var(--surface-color)] border border-[var(--glass-border)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-blue-500 transition-colors"
                            />
                        </div>
                    </div>

                    {/* Reason */}
                    <div>
                        <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">Alasan Pengajuan</label>
                        <textarea
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            placeholder="Jelaskan kebutuhan dan manfaat asset ini untuk pekerjaan..."
                            rows={3}
                            className="w-full px-4 py-3 rounded-lg bg-[var(--surface-color)] border border-[var(--glass-border)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-blue-500 transition-colors resize-none"
                            required
                        />
                    </div>

                    {/* Submit */}
                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full py-3 rounded-lg bg-blue-500 hover:bg-blue-600 !text-white font-semibold transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                        {isSubmitting ? (
                            <>
                                <Loader2 className="w-5 h-5 animate-spin !text-white" />
                                Mengajukan...
                            </>
                        ) : (
                            <>
                                <Send className="w-5 h-5 !text-white" />
                                Ajukan Request Asset
                            </>
                        )}
                    </button>
                </form>
            </div>

            {/* History Section */}
            <div className="glass-panel rounded-xl p-6 mt-6">
                <h3 className="font-semibold text-lg text-[var(--text-primary)] mb-4 flex items-center gap-2">
                    📜 Riwayat Pengajuan Asset
                </h3>
                {isLoadingHistory ? (
                    <div className="flex items-center justify-center py-6 text-[var(--text-muted)]">
                        <Loader2 className="w-6 h-6 animate-spin" />
                    </div>
                ) : history.length === 0 ? (
                    <p className="text-center py-6 text-[var(--text-muted)]">Belum ada riwayat pengajuan asset</p>
                ) : (
                    <div className="space-y-3">
                        {history.map((h) => (
                            <div key={h.id} className="p-3 rounded-lg bg-[var(--surface-color)] border border-[var(--glass-border)] flex items-center gap-3">
                                <div className="w-10 h-10 rounded-lg bg-blue-500 flex items-center justify-center">
                                    <Package className="w-5 h-5 text-white" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <span className="font-medium text-[var(--text-primary)]">Asset</span>
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
