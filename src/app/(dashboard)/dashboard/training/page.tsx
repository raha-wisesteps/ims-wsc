"use client";

import { useState } from "react";
import Link from "next/link";

// Training categories
const TRAINING_CATEGORIES = [
    { id: "certification", label: "Sertifikasi", icon: "📜" },
    { id: "workshop", label: "Workshop", icon: "🎯" },
    { id: "course", label: "Online Course", icon: "💻" },
    { id: "conference", label: "Konferensi", icon: "🎤" },
    { id: "seminar", label: "Seminar", icon: "📚" },
    { id: "other", label: "Lainnya", icon: "📦" },
];

// Request status
const STATUS_CONFIG = {
    pending: { label: "Pending Review", color: "bg-amber-500", textColor: "text-amber-500" },
    approved: { label: "Approved", color: "bg-emerald-500", textColor: "text-emerald-500" },
    rejected: { label: "Rejected", color: "bg-rose-500", textColor: "text-rose-500" },
    completed: { label: "Completed", color: "bg-blue-500", textColor: "text-blue-500" },
};

interface TrainingRequest {
    id: string;
    date: string;
    category: string;
    trainingName: string;
    provider: string;
    reason: string;
    startDate: string;
    endDate: string;
    estimatedCost: number;
    status: keyof typeof STATUS_CONFIG;
    staff: string;
    approver?: string;
    approvalDate?: string;
    notes?: string;
}

// Mock requests
const mockRequests: TrainingRequest[] = [
    {
        id: "TR-001",
        date: "2024-12-18",
        category: "certification",
        trainingName: "AWS Solutions Architect Associate",
        provider: "Amazon Web Services",
        reason: "Meningkatkan skill cloud untuk project klien yang menggunakan AWS",
        startDate: "2025-01-15",
        endDate: "2025-01-15",
        estimatedCost: 2500000,
        status: "pending",
        staff: "David Chen",
    },
    {
        id: "TR-002",
        date: "2024-12-15",
        category: "workshop",
        trainingName: "Design Thinking Workshop",
        provider: "IDEO U",
        reason: "Improve problem-solving dan user research skills",
        startDate: "2025-02-01",
        endDate: "2025-02-02",
        estimatedCost: 5000000,
        status: "approved",
        staff: "Citra Lestari",
        approver: "Owner",
        approvalDate: "2024-12-16",
    },
    {
        id: "TR-003",
        date: "2024-12-10",
        category: "course",
        trainingName: "Complete Python Bootcamp",
        provider: "Udemy",
        reason: "Learning python untuk data analysis",
        startDate: "2024-12-20",
        endDate: "2025-02-20",
        estimatedCost: 250000,
        status: "completed",
        staff: "Budi Santoso",
        approver: "Owner",
        approvalDate: "2024-12-11",
    },
    {
        id: "TR-004",
        date: "2024-12-05",
        category: "conference",
        trainingName: "Tech in Asia Conference 2025",
        provider: "Tech in Asia",
        reason: "Networking dan insight industri terbaru",
        startDate: "2025-03-15",
        endDate: "2025-03-16",
        estimatedCost: 3500000,
        status: "pending",
        staff: "Andi Pratama",
    },
    {
        id: "TR-005",
        date: "2024-12-01",
        category: "certification",
        trainingName: "Google Analytics Certification",
        provider: "Google",
        reason: "Sertifikasi untuk handle client analytics",
        startDate: "2024-12-10",
        endDate: "2024-12-10",
        estimatedCost: 0,
        status: "completed",
        staff: "Eva Wijaya",
        approver: "HR",
        approvalDate: "2024-12-02",
        notes: "Free certification, disetujui untuk jam kerja",
    },
];

// Format currency
const formatCurrency = (amount: number) => {
    if (amount === 0) return "FREE";
    return new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
        minimumFractionDigits: 0,
    }).format(amount);
};

export default function TrainingRequestPage() {
    const [showAddModal, setShowAddModal] = useState(false);
    const [selectedStatus, setSelectedStatus] = useState("all");
    const [newRequest, setNewRequest] = useState({
        category: "certification",
        trainingName: "",
        provider: "",
        reason: "",
        startDate: "",
        endDate: "",
        estimatedCost: "",
        link: "",
    });

    // Filter requests
    const filteredRequests = selectedStatus === "all"
        ? mockRequests
        : mockRequests.filter(r => r.status === selectedStatus);

    // Stats
    const pendingCount = mockRequests.filter(r => r.status === "pending").length;
    const completedCount = mockRequests.filter(r => r.status === "completed").length;
    const totalInvestment = mockRequests.filter(r => r.status === "completed" || r.status === "approved").reduce((sum, r) => sum + r.estimatedCost, 0);

    const handleSubmit = () => {
        // In real app, save to database
        setShowAddModal(false);
        setNewRequest({ category: "certification", trainingName: "", provider: "", reason: "", startDate: "", endDate: "", estimatedCost: "", link: "" });
    };

    return (
        <div className="flex flex-col h-full overflow-auto">
            {/* Page Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                <div>
                    <div className="flex items-center gap-2 text-sm text-[var(--text-muted)] mb-1">
                        <Link href="/dashboard/knowledge" className="hover:text-[#e8c559]">Resources</Link>
                        <span>/</span>
                        <span className="text-[var(--text-primary)]">Training Request</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <span className="text-3xl">🎓</span>
                        <h2 className="text-3xl font-bold tracking-tight text-[var(--text-primary)]">Training Request</h2>
                    </div>
                    <p className="text-[var(--text-secondary)] text-sm mt-1">Ajukan permintaan mengikuti pelatihan untuk pengembangan diri.</p>
                </div>
                <button
                    onClick={() => setShowAddModal(true)}
                    className="h-10 px-5 rounded-lg bg-[#e8c559] hover:bg-[#dcb33e] text-[#171611] text-sm font-bold transition-colors flex items-center gap-2"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />
                    </svg>
                    Ajukan Training
                </button>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="glass-panel p-5 rounded-xl">
                    <div className="flex items-center gap-3 mb-2">
                        <span className="text-2xl">⏳</span>
                        <span className="text-xs text-[var(--text-muted)]">Pending Review</span>
                    </div>
                    <p className="text-3xl font-bold text-amber-500">{pendingCount}</p>
                </div>
                <div className="glass-panel p-5 rounded-xl">
                    <div className="flex items-center gap-3 mb-2">
                        <span className="text-2xl">🎓</span>
                        <span className="text-xs text-[var(--text-muted)]">Training Completed</span>
                    </div>
                    <p className="text-3xl font-bold text-blue-500">{completedCount}</p>
                </div>
                <div className="glass-panel p-5 rounded-xl">
                    <div className="flex items-center gap-3 mb-2">
                        <span className="text-2xl">💰</span>
                        <span className="text-xs text-[var(--text-muted)]">Total Investment</span>
                    </div>
                    <p className="text-2xl font-bold text-emerald-500">{formatCurrency(totalInvestment)}</p>
                </div>
            </div>

            {/* Filter Tabs */}
            <div className="flex flex-wrap gap-2 mb-6">
                <button
                    onClick={() => setSelectedStatus("all")}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${selectedStatus === "all"
                            ? "bg-[#e8c559] text-[#171611]"
                            : "bg-[var(--glass-bg)] text-[var(--text-secondary)] hover:bg-[var(--glass-border)]"
                        }`}
                >
                    Semua ({mockRequests.length})
                </button>
                {Object.entries(STATUS_CONFIG).map(([key, config]) => {
                    const count = mockRequests.filter(r => r.status === key).length;
                    return (
                        <button
                            key={key}
                            onClick={() => setSelectedStatus(key)}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${selectedStatus === key
                                    ? `${config.color} text-white`
                                    : "bg-[var(--glass-bg)] text-[var(--text-secondary)] hover:bg-[var(--glass-border)]"
                                }`}
                        >
                            {config.label} ({count})
                        </button>
                    );
                })}
            </div>

            {/* Request List */}
            <div className="space-y-4 flex-1">
                {filteredRequests.map((request) => {
                    const category = TRAINING_CATEGORIES.find(c => c.id === request.category);
                    const status = STATUS_CONFIG[request.status];
                    return (
                        <div key={request.id} className="glass-panel p-5 rounded-xl">
                            <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                                <div className="flex gap-4">
                                    <div className="w-12 h-12 rounded-xl bg-[var(--glass-bg)] flex items-center justify-center text-2xl">
                                        {category?.icon}
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-1">
                                            <h3 className="font-semibold text-[var(--text-primary)]">{request.trainingName}</h3>
                                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${status.color} text-white`}>
                                                {status.label}
                                            </span>
                                        </div>
                                        <p className="text-sm text-[var(--text-muted)] mb-1">by {request.provider}</p>
                                        <p className="text-sm text-[var(--text-secondary)] mb-2">{request.reason}</p>
                                        <div className="flex flex-wrap gap-4 text-xs text-[var(--text-muted)]">
                                            <span>📅 {new Date(request.startDate).toLocaleDateString("id-ID", { day: "numeric", month: "short" })}
                                                {request.startDate !== request.endDate && ` - ${new Date(request.endDate).toLocaleDateString("id-ID", { day: "numeric", month: "short" })}`}
                                            </span>
                                            <span>👤 {request.staff}</span>
                                            <span>🏷️ {category?.label}</span>
                                            <span className={`font-medium ${request.estimatedCost === 0 ? "text-emerald-500" : "text-[var(--text-primary)]"}`}>
                                                {formatCurrency(request.estimatedCost)}
                                            </span>
                                        </div>
                                        {request.approver && (
                                            <p className="text-xs text-[var(--text-muted)] mt-2">
                                                {request.status === "rejected" ? "❌" : "✅"} By {request.approver} on {new Date(request.approvalDate!).toLocaleDateString("id-ID")}
                                            </p>
                                        )}
                                        {request.notes && (
                                            <p className="text-xs text-blue-500 mt-1 italic">Note: {request.notes}</p>
                                        )}
                                    </div>
                                </div>
                                <div className="flex gap-2 md:flex-col">
                                    <span className="text-xs text-[var(--text-muted)]">{request.id}</span>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Tips */}
            <div className="glass-panel p-4 rounded-xl mt-6 bg-gradient-to-r from-blue-500/5 to-purple-500/5 border-blue-500/20">
                <h4 className="font-medium text-blue-500 mb-2">💡 Tips Pengajuan Training</h4>
                <ul className="text-sm text-[var(--text-secondary)] space-y-1">
                    <li>• Sertakan link ke program training untuk referensi</li>
                    <li>• Jelaskan bagaimana training ini membantu pekerjaan Anda</li>
                    <li>• Training gratis (Coursera, Google, dll) lebih cepat disetujui</li>
                </ul>
            </div>

            {/* Add Request Modal */}
            {showAddModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="glass-panel w-full max-w-lg rounded-2xl p-6 max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-bold text-[var(--text-primary)]">Ajukan Training</h2>
                            <button
                                onClick={() => setShowAddModal(false)}
                                className="p-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 text-[var(--text-muted)]"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
                                </svg>
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">Jenis Training</label>
                                <div className="grid grid-cols-3 gap-2">
                                    {TRAINING_CATEGORIES.map((cat) => (
                                        <button
                                            key={cat.id}
                                            onClick={() => setNewRequest({ ...newRequest, category: cat.id })}
                                            className={`p-3 rounded-lg border text-center transition-all ${newRequest.category === cat.id
                                                    ? "border-[#e8c559] bg-[#e8c559]/10"
                                                    : "border-[var(--glass-border)] hover:border-[#e8c559]/50"
                                                }`}
                                        >
                                            <span className="text-2xl block mb-1">{cat.icon}</span>
                                            <span className="text-xs text-[var(--text-secondary)]">{cat.label}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Nama Training</label>
                                <input
                                    type="text"
                                    value={newRequest.trainingName}
                                    onChange={(e) => setNewRequest({ ...newRequest, trainingName: e.target.value })}
                                    className="w-full p-3 rounded-lg border border-[var(--glass-border)] bg-[var(--card-bg)] text-[var(--text-primary)]"
                                    placeholder="AWS Solutions Architect Associate"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Provider/Penyelenggara</label>
                                <input
                                    type="text"
                                    value={newRequest.provider}
                                    onChange={(e) => setNewRequest({ ...newRequest, provider: e.target.value })}
                                    className="w-full p-3 rounded-lg border border-[var(--glass-border)] bg-[var(--card-bg)] text-[var(--text-primary)]"
                                    placeholder="Amazon Web Services / Udemy / Google"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Alasan Pengajuan</label>
                                <textarea
                                    value={newRequest.reason}
                                    onChange={(e) => setNewRequest({ ...newRequest, reason: e.target.value })}
                                    className="w-full p-3 rounded-lg border border-[var(--glass-border)] bg-[var(--card-bg)] text-[var(--text-primary)] resize-none"
                                    rows={3}
                                    placeholder="Jelaskan bagaimana training ini akan membantu pekerjaan Anda..."
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Tanggal Mulai</label>
                                    <input
                                        type="date"
                                        value={newRequest.startDate}
                                        onChange={(e) => setNewRequest({ ...newRequest, startDate: e.target.value })}
                                        className="w-full p-3 rounded-lg border border-[var(--glass-border)] bg-[var(--card-bg)] text-[var(--text-primary)]"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Tanggal Selesai</label>
                                    <input
                                        type="date"
                                        value={newRequest.endDate}
                                        onChange={(e) => setNewRequest({ ...newRequest, endDate: e.target.value })}
                                        className="w-full p-3 rounded-lg border border-[var(--glass-border)] bg-[var(--card-bg)] text-[var(--text-primary)]"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Estimasi Biaya (Rp)</label>
                                    <input
                                        type="number"
                                        value={newRequest.estimatedCost}
                                        onChange={(e) => setNewRequest({ ...newRequest, estimatedCost: e.target.value })}
                                        className="w-full p-3 rounded-lg border border-[var(--glass-border)] bg-[var(--card-bg)] text-[var(--text-primary)]"
                                        placeholder="0 jika gratis"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Link Training</label>
                                    <input
                                        type="url"
                                        value={newRequest.link}
                                        onChange={(e) => setNewRequest({ ...newRequest, link: e.target.value })}
                                        className="w-full p-3 rounded-lg border border-[var(--glass-border)] bg-[var(--card-bg)] text-[var(--text-primary)]"
                                        placeholder="https://..."
                                    />
                                </div>
                            </div>

                            <div className="flex gap-3 mt-6">
                                <button
                                    onClick={() => setShowAddModal(false)}
                                    className="flex-1 px-4 py-3 rounded-lg border border-[var(--glass-border)] text-[var(--text-secondary)] font-medium"
                                >
                                    Batal
                                </button>
                                <button
                                    onClick={handleSubmit}
                                    className="flex-1 px-4 py-3 rounded-lg bg-[#e8c559] hover:bg-[#dcb33e] text-[#171611] font-bold"
                                >
                                    Kirim Request
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
