"use client";

import { useState } from "react";
import Link from "next/link";

// Asset categories
const ASSET_CATEGORIES = [
    { id: "laptop", label: "Laptop/PC", icon: "💻" },
    { id: "monitor", label: "Monitor", icon: "🖥️" },
    { id: "peripheral", label: "Peripheral", icon: "⌨️" },
    { id: "furniture", label: "Furniture", icon: "🪑" },
    { id: "software", label: "Software/License", icon: "📀" },
    { id: "other", label: "Lainnya", icon: "📦" },
];

// Request status
const STATUS_CONFIG = {
    pending: { label: "Pending Review", color: "bg-amber-500", textColor: "text-amber-500" },
    approved: { label: "Approved", color: "bg-emerald-500", textColor: "text-emerald-500" },
    rejected: { label: "Rejected", color: "bg-rose-500", textColor: "text-rose-500" },
    processing: { label: "Processing", color: "bg-blue-500", textColor: "text-blue-500" },
    completed: { label: "Completed", color: "bg-gray-500", textColor: "text-gray-500" },
};

interface AssetRequest {
    id: string;
    date: string;
    category: string;
    itemName: string;
    reason: string;
    estimatedCost: number;
    status: keyof typeof STATUS_CONFIG;
    staff: string;
    approver?: string;
    approvalDate?: string;
    notes?: string;
}

// Mock requests
const mockRequests: AssetRequest[] = [
    {
        id: "AR-001",
        date: "2024-12-18",
        category: "laptop",
        itemName: "MacBook Pro 14\" M3",
        reason: "Laptop lama sudah slow, butuh upgrade untuk video editing",
        estimatedCost: 35000000,
        status: "pending",
        staff: "Andi Pratama",
    },
    {
        id: "AR-002",
        date: "2024-12-15",
        category: "monitor",
        itemName: "Dell UltraSharp 27\" 4K",
        reason: "Monitor tambahan untuk dual screen setup",
        estimatedCost: 8500000,
        status: "approved",
        staff: "Citra Lestari",
        approver: "Owner",
        approvalDate: "2024-12-16",
    },
    {
        id: "AR-003",
        date: "2024-12-10",
        category: "software",
        itemName: "Adobe Creative Cloud 1 Year",
        reason: "Lisensi untuk design work",
        estimatedCost: 4200000,
        status: "processing",
        staff: "Eva Wijaya",
        approver: "Owner",
        approvalDate: "2024-12-11",
    },
    {
        id: "AR-004",
        date: "2024-12-05",
        category: "peripheral",
        itemName: "Logitech MX Master 3S + MX Keys",
        reason: "Mouse & keyboard ergonomis untuk WFH",
        estimatedCost: 3500000,
        status: "completed",
        staff: "Budi Santoso",
        approver: "Owner",
        approvalDate: "2024-12-06",
    },
    {
        id: "AR-005",
        date: "2024-12-01",
        category: "furniture",
        itemName: "Standing Desk Electric",
        reason: "Meja kerja adjustable untuk kesehatan postur",
        estimatedCost: 5000000,
        status: "rejected",
        staff: "David Chen",
        approver: "Owner",
        approvalDate: "2024-12-02",
        notes: "Budget terbatas, coba ajukan quarter depan",
    },
];

// Format currency
const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
        minimumFractionDigits: 0,
    }).format(amount);
};

export default function AssetRequestPage() {
    const [showAddModal, setShowAddModal] = useState(false);
    const [selectedStatus, setSelectedStatus] = useState("all");
    const [newRequest, setNewRequest] = useState({
        category: "laptop",
        itemName: "",
        reason: "",
        estimatedCost: "",
        link: "",
    });

    // Filter requests
    const filteredRequests = selectedStatus === "all"
        ? mockRequests
        : mockRequests.filter(r => r.status === selectedStatus);

    // Stats
    const pendingCount = mockRequests.filter(r => r.status === "pending").length;
    const approvedCount = mockRequests.filter(r => r.status === "approved" || r.status === "processing").length;
    const totalEstimated = mockRequests.filter(r => r.status === "pending").reduce((sum, r) => sum + r.estimatedCost, 0);

    const handleSubmit = () => {
        // In real app, save to database
        setShowAddModal(false);
        setNewRequest({ category: "laptop", itemName: "", reason: "", estimatedCost: "", link: "" });
    };

    return (
        <div className="flex flex-col h-full overflow-auto">
            {/* Page Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                <div>
                    <div className="flex items-center gap-2 text-sm text-[var(--text-muted)] mb-1">
                        <Link href="/dashboard/operational" className="hover:text-[#e8c559]">Operasional</Link>
                        <span>/</span>
                        <span className="text-[var(--text-primary)]">Asset Request</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <span className="text-3xl">💻</span>
                        <h2 className="text-3xl font-bold tracking-tight text-[var(--text-primary)]">Asset Request</h2>
                    </div>
                    <p className="text-[var(--text-secondary)] text-sm mt-1">Ajukan permintaan peralatan kerja (laptop, monitor, dll).</p>
                </div>
                <button
                    onClick={() => setShowAddModal(true)}
                    className="h-10 px-5 rounded-lg bg-[#e8c559] hover:bg-[#dcb33e] text-[#171611] text-sm font-bold transition-colors flex items-center gap-2"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />
                    </svg>
                    Ajukan Request
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
                        <span className="text-2xl">✅</span>
                        <span className="text-xs text-[var(--text-muted)]">Approved/Processing</span>
                    </div>
                    <p className="text-3xl font-bold text-emerald-500">{approvedCount}</p>
                </div>
                <div className="glass-panel p-5 rounded-xl">
                    <div className="flex items-center gap-3 mb-2">
                        <span className="text-2xl">💰</span>
                        <span className="text-xs text-[var(--text-muted)]">Total Est. (Pending)</span>
                    </div>
                    <p className="text-2xl font-bold text-[var(--text-primary)]">{formatCurrency(totalEstimated)}</p>
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
                    const category = ASSET_CATEGORIES.find(c => c.id === request.category);
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
                                            <h3 className="font-semibold text-[var(--text-primary)]">{request.itemName}</h3>
                                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${status.color} text-white`}>
                                                {status.label}
                                            </span>
                                        </div>
                                        <p className="text-sm text-[var(--text-secondary)] mb-2">{request.reason}</p>
                                        <div className="flex flex-wrap gap-4 text-xs text-[var(--text-muted)]">
                                            <span>📅 {new Date(request.date).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}</span>
                                            <span>👤 {request.staff}</span>
                                            <span>🏷️ {category?.label}</span>
                                            <span className="font-medium text-[var(--text-primary)]">{formatCurrency(request.estimatedCost)}</span>
                                        </div>
                                        {request.approver && (
                                            <p className="text-xs text-[var(--text-muted)] mt-2">
                                                {request.status === "rejected" ? "❌" : "✅"} By {request.approver} on {new Date(request.approvalDate!).toLocaleDateString("id-ID")}
                                            </p>
                                        )}
                                        {request.notes && (
                                            <p className="text-xs text-rose-500 mt-1 italic">Note: {request.notes}</p>
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

            {/* Add Request Modal */}
            {showAddModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="glass-panel w-full max-w-lg rounded-2xl p-6 max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-bold text-[var(--text-primary)]">Ajukan Asset Request</h2>
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
                                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">Kategori</label>
                                <div className="grid grid-cols-3 gap-2">
                                    {ASSET_CATEGORIES.map((cat) => (
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
                                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Nama Item</label>
                                <input
                                    type="text"
                                    value={newRequest.itemName}
                                    onChange={(e) => setNewRequest({ ...newRequest, itemName: e.target.value })}
                                    className="w-full p-3 rounded-lg border border-[var(--glass-border)] bg-[var(--card-bg)] text-[var(--text-primary)]"
                                    placeholder="MacBook Pro 14&quot; M3 Pro"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Alasan Pengajuan</label>
                                <textarea
                                    value={newRequest.reason}
                                    onChange={(e) => setNewRequest({ ...newRequest, reason: e.target.value })}
                                    className="w-full p-3 rounded-lg border border-[var(--glass-border)] bg-[var(--card-bg)] text-[var(--text-primary)] resize-none"
                                    rows={3}
                                    placeholder="Jelaskan mengapa Anda membutuhkan item ini..."
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Estimasi Harga (Rp)</label>
                                    <input
                                        type="number"
                                        value={newRequest.estimatedCost}
                                        onChange={(e) => setNewRequest({ ...newRequest, estimatedCost: e.target.value })}
                                        className="w-full p-3 rounded-lg border border-[var(--glass-border)] bg-[var(--card-bg)] text-[var(--text-primary)]"
                                        placeholder="35000000"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Link Referensi</label>
                                    <input
                                        type="url"
                                        value={newRequest.link}
                                        onChange={(e) => setNewRequest({ ...newRequest, link: e.target.value })}
                                        className="w-full p-3 rounded-lg border border-[var(--glass-border)] bg-[var(--card-bg)] text-[var(--text-primary)]"
                                        placeholder="https://tokopedia.com/..."
                                    />
                                </div>
                            </div>

                            <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/20">
                                <p className="text-sm text-amber-600 dark:text-amber-400">
                                    ⚠️ Request akan direview oleh Owner/HR. Mohon sertakan alasan yang jelas.
                                </p>
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
