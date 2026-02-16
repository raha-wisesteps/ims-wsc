"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { 
    AlertCircle, 
    MessageSquare, 
    CheckCircle, 
    Clock, 
    Shield, 
    User, 
    FileText, 
    ChevronRight, 
    Send,
    History,
    X
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { createClient } from "@/lib/supabase/client";

// Report Types and Categories
const REPORT_TYPES = [
    { id: 'system', label: 'System IMS Report', icon: Shield, description: 'Bug, issue, problem, suggestion, criticism related to the system.' },
    { id: 'operational', label: 'Operational Kantor', icon: AlertCircle, description: 'Whistleblower system, illegal actions, fraud, corruption, office suggestions.' },
];

const CATEGORIES = {
    system: [
        'Bug / Error Aplikasi',
        'Masalah Akses / Login',
        'Saran Fitur',
        'Kritik Membangun',
        'Lainnya'
    ],
    operational: [
        'Saran / Kritik Operasional',
        'Indikasi Kecurangan (Fraud)',
        'Tindakan Ilegal',
        'Korupsi / Gratifikasi',
        'Pelecehan / Harassment',
        'Lainnya'
    ]
};

export default function ReportPage() {
    const { profile, user } = useAuth(); // Removed 'session' as it was unused
    const supabase = createClient();
    const router = useRouter();

    const [activeTab, setActiveTab] = useState<'submit' | 'history'>('submit');
    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    // Form State
    const [formData, setFormData] = useState({
        type: 'system',
        category: '',
        description: '',
        isAnonymous: false
    });

    // History State
    const [reports, setReports] = useState<any[]>([]);
    const [selectedReport, setSelectedReport] = useState<any>(null); // For Detail Modal

    // Fetch History
    useEffect(() => {
        if (activeTab === 'history') {
            fetchReports();
        }
    }, [activeTab]);

    const fetchReports = async () => {
        setIsLoading(true);
        try {
            const { data, error } = await supabase
                .from('user_reports')
                .select('*')
                .order('created_at', { ascending: false });
            
            if (error) throw error;
            setReports(data || []);
        } catch (error) {
            console.error("Error fetching reports:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.category || !formData.description) {
            setMessage({ type: 'error', text: 'Mohon lengkapi semua field.' });
            return;
        }

        setIsLoading(true);
        setMessage(null);

        try {
            const { error } = await supabase.from('user_reports').insert({
                user_id: user?.id,
                type: formData.type,
                category: formData.category,
                description: formData.description,
                is_anonymous: formData.isAnonymous,
            });

            if (error) throw error;

            setMessage({ type: 'success', text: 'Laporan berhasil dikirim.' });
            setFormData({
                type: 'system',
                category: '',
                description: '',
                isAnonymous: false
            });
            
            // Switch to history after 1.5s
            setTimeout(() => {
                setActiveTab('history');
                setMessage(null);
            }, 1500);

        } catch (error) {
            console.error("Error submitting report:", error);
            setMessage({ type: 'error', text: 'Gagal mengirim laporan. Silakan coba lagi.' });
        } finally {
            setIsLoading(false);
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'pending':
                return <span className="px-2 py-1 rounded-full text-xs font-bold bg-yellow-500/10 text-yellow-500 border border-yellow-500/20">Pending</span>;
            case 'reviewed':
                return <span className="px-2 py-1 rounded-full text-xs font-bold bg-blue-500/10 text-blue-500 border border-blue-500/20">Reviewed</span>;
            case 'resolved':
                return <span className="px-2 py-1 rounded-full text-xs font-bold bg-green-500/10 text-green-500 border border-green-500/20">Resolved</span>;
            case 'rejected':
                return <span className="px-2 py-1 rounded-full text-xs font-bold bg-red-500/10 text-red-500 border border-red-500/20">Rejected</span>;
            default:
                return <span className="px-2 py-1 rounded-full text-xs font-bold bg-gray-500/10 text-gray-500 border border-gray-500/20">{status}</span>;
        }
    };

    return (
        <div className="space-y-8 pb-20 fade-in">
             {/* Header */}
             <div className="flex flex-col gap-4">
                <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                    <Link href="/dashboard" className="hover:text-[var(--text-primary)] transition-colors">Dashboard</Link>
                    <ChevronRight className="h-4 w-4" />
                    <Link href="/dashboard/profile" className="hover:text-[var(--text-primary)] transition-colors">Profile</Link>
                    <ChevronRight className="h-4 w-4" />
                    <span className="text-[var(--text-primary)]">Layanan Pengaduan</span>
                </div>
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-black text-[var(--text-primary)] tracking-tight">Layanan Pengaduan</h1>
                        <p className="text-[var(--text-secondary)] mt-1">Sampaikan keluhan, kritik, saran, atau laporan pelanggaran.</p>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex p-1 bg-[var(--glass-bg)] border border-[var(--glass-border)] rounded-xl w-fit">
                <button
                    onClick={() => setActiveTab('submit')}
                    className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${
                        activeTab === 'submit' 
                        ? 'bg-[#e8c559] text-black shadow-md' 
                        : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                    }`}
                >
                    <Send className="w-4 h-4" />
                    Buat Laporan
                </button>
                <button
                    onClick={() => setActiveTab('history')}
                    className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${
                        activeTab === 'history' 
                        ? 'bg-[#e8c559] text-black shadow-md' 
                        : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                    }`}
                >
                    <History className="w-4 h-4" />
                    Riwayat Laporan
                </button>
            </div>

            {/* Content */}
            <div className="glass-panel p-6 md:p-8 rounded-2xl border border-[var(--glass-border)] min-h-[500px]">
                {activeTab === 'submit' ? (
                    <form onSubmit={handleSubmit} className="max-w-2xl mx-auto space-y-6">
                        
                        {/* Type Selection */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {REPORT_TYPES.map((type) => {
                                const Icon = type.icon;
                                const isSelected = formData.type === type.id;
                                return (
                                    <div 
                                        key={type.id}
                                        onClick={() => setFormData({ ...formData, type: type.id, category: '' })} // Reset category on type change
                                        className={`cursor-pointer p-4 rounded-xl border transition-all ${
                                            isSelected 
                                            ? 'border-[#e8c559] bg-[#e8c559]/5' 
                                            : 'border-[var(--glass-border)] hover:border-[#e8c559]/50'
                                        }`}
                                    >
                                        <div className="flex items-center gap-3 mb-2">
                                            <div className={`p-2 rounded-lg ${isSelected ? 'bg-[#e8c559] text-black' : 'bg-[var(--glass-border)] text-[var(--text-secondary)]'}`}>
                                                <Icon className="w-5 h-5" />
                                            </div>
                                            <h3 className={`font-bold ${isSelected ? 'text-[#e8c559]' : 'text-[var(--text-primary)]'}`}>{type.label}</h3>
                                        </div>
                                        <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                                            {type.description}
                                        </p>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Category & Description */}
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-[var(--text-primary)]">Kategori Laporan</label>
                                <select
                                    value={formData.category}
                                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                    className="w-full bg-[var(--glass-bg)] border border-[var(--glass-border)] rounded-xl px-4 py-3 text-[var(--text-primary)] focus:outline-none focus:border-[#e8c559] transition-colors appearance-none"
                                >
                                    <option value="">Pilih Kategori...</option>
                                    {(CATEGORIES as any)[formData.type].map((cat: string) => (
                                        <option key={cat} value={cat}>{cat}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-bold text-[var(--text-primary)]">Deskripsi Laporan</label>
                                <textarea
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    placeholder="Jelaskan detail laporan Anda secara rinci..."
                                    rows={6}
                                    className="w-full bg-[var(--glass-bg)] border border-[var(--glass-border)] rounded-xl px-4 py-3 text-[var(--text-primary)] focus:outline-none focus:border-[#e8c559] transition-colors placeholder:text-[var(--text-muted)] resize-none"
                                />
                            </div>

                            {/* Anonymous Toggle */}
                            <div className="flex items-center justify-between p-4 rounded-xl bg-gray-50 dark:bg-white/5 border border-[var(--glass-border)]">
                                <div className="space-y-1">
                                    <h4 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2">
                                        <User className="w-4 h-4" />
                                        Laporkan Secara Anonim
                                    </h4>
                                    <p className="text-xs text-[var(--text-secondary)]">
                                        Identitas Anda (Nama & Foto) tidak akan terlihat oleh admin.
                                    </p>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input 
                                        type="checkbox" 
                                        checked={formData.isAnonymous}
                                        onChange={(e) => setFormData({ ...formData, isAnonymous: e.target.checked })}
                                        className="sr-only peer" 
                                    />
                                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-yellow-300 dark:peer-focus:ring-yellow-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-[#e8c559]"></div>
                                </label>
                            </div>
                        </div>

                        {message && (
                            <div className={`p-4 rounded-xl text-sm font-medium ${message.type === 'success' ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : 'bg-red-500/10 text-red-500 border border-red-500/20'}`}>
                                {message.text}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full py-4 rounded-xl bg-[#e8c559] text-black font-bold hover:bg-[#d6b54e] shadow-lg shadow-[#e8c559]/20 flex items-center justify-center gap-2 transition-all disabled:opacity-70 disabled:cursor-not-allowed"
                        >
                            {isLoading ? (
                                <>
                                    <div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                                    Mengirim...
                                </>
                            ) : (
                                <>
                                    <Send className="w-5 h-5" />
                                    Kirim Laporan
                                </>
                            )}
                        </button>

                    </form>
                ) : (
                    <div className="space-y-4">
                        {isLoading ? (
                            <div className="flex justify-center py-20">
                                <div className="w-8 h-8 border-4 border-[#e8c559] border-t-transparent rounded-full animate-spin" />
                            </div>
                        ) : reports.length === 0 ? (
                            <div className="text-center py-20 text-[var(--text-muted)]">
                                <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                                <p>Belum ada laporan yang dikirim.</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 gap-4">
                                {reports.map((report) => (
                                    <div 
                                        key={report.id}
                                        onClick={() => setSelectedReport(report)}
                                        className="p-5 rounded-xl border border-[var(--glass-border)] bg-[var(--glass-bg)] hover:border-[#e8c559]/50 transition-all cursor-pointer group"
                                    >
                                        <div className="flex justify-between items-start mb-3">
                                            <div className="flex items-center gap-3">
                                                <div className={`p-2 rounded-lg ${report.type === 'system' ? 'bg-blue-500/10 text-blue-500' : 'bg-orange-500/10 text-orange-500'}`}>
                                                    {report.type === 'system' ? <Shield className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
                                                </div>
                                                <div>
                                                    <h3 className="font-bold text-[var(--text-primary)]">{report.category}</h3>
                                                    <p className="text-xs text-[var(--text-secondary)] flex items-center gap-1">
                                                        <Clock className="w-3 h-3" />
                                                        {new Date(report.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                                    </p>
                                                </div>
                                            </div>
                                            {getStatusBadge(report.status)}
                                        </div>
                                        <p className="text-sm text-[var(--text-secondary)] line-clamp-2 mb-3">
                                            {report.description}
                                        </p>
                                        {report.admin_response && (
                                            <div className="mt-3 pt-3 border-t border-[var(--glass-border)] text-xs text-[var(--text-secondary)] flex items-start gap-2">
                                                <MessageSquare className="w-4 h-4 text-emerald-500 mt-0.5" />
                                                <span>
                                                    <strong className="text-emerald-500">Admin Response:</strong> {report.admin_response}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Detail Modal */}
            {selectedReport && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={() => setSelectedReport(null)}>
                    <div className="w-full max-w-2xl bg-white dark:bg-[#1c2120] rounded-2xl shadow-2xl border border-[var(--glass-border)] flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between p-5 border-b border-[var(--glass-border)]">
                            <h2 className="text-lg font-bold text-[var(--text-primary)]">Detail Laporan</h2>
                            <button onClick={() => setSelectedReport(null)} className="p-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                                <X className="w-5 h-5 text-[var(--text-secondary)]" />
                            </button>
                        </div>
                        <div className="p-6 overflow-y-auto space-y-6">
                            
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className={`p-2 rounded-lg ${selectedReport.type === 'system' ? 'bg-blue-500/10 text-blue-500' : 'bg-orange-500/10 text-orange-500'}`}>
                                        {selectedReport.type === 'system' ? <Shield className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
                                    </div>
                                    <div>
                                        <p className="text-xs text-[var(--text-secondary)] uppercase tracking-wider font-bold">{selectedReport.type === 'system' ? 'System Report' : 'Operational / Whistleblower'}</p>
                                        <h3 className="text-lg font-bold text-[var(--text-primary)]">{selectedReport.category}</h3>
                                    </div>
                                </div>
                                {getStatusBadge(selectedReport.status)}
                            </div>

                            <div className="p-4 rounded-xl bg-gray-50 dark:bg-white/5 border border-[var(--glass-border)]">
                                <h4 className="text-sm font-bold text-[var(--text-primary)] mb-2">Deskripsi</h4>
                                <p className="text-sm text-[var(--text-secondary)] whitespace-pre-wrap leading-relaxed">
                                    {selectedReport.description}
                                </p>
                            </div>

                            <div className="flex items-center gap-4 text-xs text-[var(--text-secondary)] border-t border-[var(--glass-border)] pt-4">
                                <div className="flex items-center gap-1">
                                    <Clock className="w-3 h-3" />
                                    Dikirim: {new Date(selectedReport.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                </div>
                                <div className="flex items-center gap-1">
                                    <User className="w-3 h-3" />
                                    {selectedReport.is_anonymous ? 'Anonim' : profile?.full_name || 'User'}
                                </div>
                            </div>

                            {/* Admin Response Section */}
                            {selectedReport.admin_response && (
                                <div className="p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/20">
                                    <div className="flex items-center gap-2 mb-2">
                                        <MessageSquare className="w-4 h-4 text-emerald-500" />
                                        <h4 className="text-sm font-bold text-emerald-500">Tanggapan Admin</h4>
                                    </div>
                                    <p className="text-sm text-[var(--text-primary)] whitespace-pre-wrap leading-relaxed">
                                        {selectedReport.admin_response}
                                    </p>
                                    <p className="text-[10px] text-[var(--text-secondary)] mt-2">
                                        Dibalas pada: {new Date(selectedReport.responded_at || selectedReport.updated_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                                    </p>
                                </div>
                            )}

                        </div>
                    </div>
                </div>
            )}

        </div>
    );
}
