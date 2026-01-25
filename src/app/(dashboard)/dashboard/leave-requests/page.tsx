"use client";

import { useState } from "react";
import Link from "next/link";

// Request types
const REQUEST_TYPES = {
    wfh: { label: "Work From Home", icon: "🏠", color: "bg-purple-500", singleDay: true, leadTime: "1 hari" },
    leave: { label: "Cuti", icon: "🌴", color: "bg-emerald-500", singleDay: false, leadTime: "3 hari" },
    sick: { label: "Sakit", icon: "🤒", color: "bg-rose-500", singleDay: false, leadTime: "1 jam" },
    emergency: { label: "Izin", icon: "🚨", color: "bg-orange-500", singleDay: false, leadTime: "1 jam" },
};

type RequestType = keyof typeof REQUEST_TYPES;

// Status configurations
const STATUS_CONFIG = {
    pending: { label: "Pending", color: "bg-amber-500", textColor: "text-amber-500" },
    approved: { label: "Approved", color: "bg-emerald-500", textColor: "text-emerald-500" },
    rejected: { label: "Rejected", color: "bg-rose-500", textColor: "text-rose-500" },
};

interface LeaveRequest {
    id: string;
    type: RequestType;
    startDate: string;
    endDate: string;
    reason: string;
    status: keyof typeof STATUS_CONFIG;
    createdAt: string;
    staff: string;
    staffRole: string;
    approver?: string;
    approvalDate?: string;
    rejectionNote?: string;
}

// Mock data
const mockMyRequests: LeaveRequest[] = [
    {
        id: "LR-001",
        type: "wfh",
        startDate: "2024-12-27",
        endDate: "2024-12-27",
        reason: "Perlu fokus untuk menyelesaikan report tanpa gangguan",
        status: "pending",
        createdAt: "2024-12-26",
        staff: "Current User",
        staffRole: "Analyst",
    },
    {
        id: "LR-002",
        type: "leave",
        startDate: "2024-12-30",
        endDate: "2025-01-01",
        reason: "Liburan akhir tahun",
        status: "approved",
        createdAt: "2024-12-20",
        staff: "Current User",
        staffRole: "Analyst",
        approver: "Owner",
        approvalDate: "2024-12-21",
    },
];

export default function LeaveRequestsPage() {
    const [showRequestModal, setShowRequestModal] = useState(false);
    const [selectedType, setSelectedType] = useState<RequestType>("wfh");
    const [myRequests, setMyRequests] = useState(mockMyRequests);
    const [newRequest, setNewRequest] = useState({
        startDate: "",
        endDate: "",
        reason: "",
    });

    const handleSubmitRequest = () => {
        // In real app, save to database
        const newReq: LeaveRequest = {
            id: `LR-${Date.now()}`,
            type: selectedType,
            startDate: newRequest.startDate,
            endDate: newRequest.endDate,
            reason: newRequest.reason,
            status: "pending",
            createdAt: new Date().toISOString().split('T')[0],
            staff: "Current User",
            staffRole: "Staff",
        };
        setMyRequests(prev => [newReq, ...prev]);
        setShowRequestModal(false);
        setNewRequest({ startDate: "", endDate: "", reason: "" });
    };

    return (
        <div className="flex flex-col h-full overflow-auto">
            {/* Page Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                <div>
                    <div className="flex items-center gap-2 text-sm text-[var(--text-muted)] mb-1">
                        <Link href="/dashboard/checkin" className="hover:text-[#e8c559]">Check-in</Link>
                        <span>/</span>
                        <span className="text-[var(--text-primary)]">Leave Requests</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <span className="text-3xl">📋</span>
                        <h2 className="text-3xl font-bold tracking-tight text-[var(--text-primary)]">Leave Requests</h2>
                    </div>
                    <p className="text-[var(--text-secondary)] text-sm mt-1">Ajukan dan kelola permintaan izin/cuti.</p>
                </div>
                <button
                    onClick={() => setShowRequestModal(true)}
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
                        <span className="text-xs text-[var(--text-muted)]">Pending</span>
                    </div>
                    <p className="text-3xl font-bold text-amber-500">
                        {myRequests.filter(r => r.status === "pending").length}
                    </p>
                </div>
                <div className="glass-panel p-5 rounded-xl">
                    <div className="flex items-center gap-3 mb-2">
                        <span className="text-2xl">✅</span>
                        <span className="text-xs text-[var(--text-muted)]">Approved</span>
                    </div>
                    <p className="text-3xl font-bold text-emerald-500">
                        {myRequests.filter(r => r.status === "approved").length}
                    </p>
                </div>
                <div className="glass-panel p-5 rounded-xl">
                    <div className="flex items-center gap-3 mb-2">
                        <span className="text-2xl">❌</span>
                        <span className="text-xs text-[var(--text-muted)]">Rejected</span>
                    </div>
                    <p className="text-3xl font-bold text-rose-500">
                        {myRequests.filter(r => r.status === "rejected").length}
                    </p>
                </div>
            </div>
            {/* Request List */}
            <div className="space-y-4 flex-1">
                {myRequests.length === 0 ? (
                    <div className="glass-panel p-8 rounded-xl text-center">
                        <span className="text-5xl mb-4 block">📭</span>
                        <p className="text-[var(--text-muted)]">Belum ada request</p>
                    </div>
                ) : (
                    myRequests.map((request) => {
                        const typeConfig = REQUEST_TYPES[request.type];
                        const statusConfig = STATUS_CONFIG[request.status];
                        const isMultiDay = request.startDate !== request.endDate;

                        return (
                            <div key={request.id} className="glass-panel p-5 rounded-xl">
                                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                                    <div className="flex gap-4">
                                        <div className={`w-12 h-12 rounded-xl ${typeConfig.color} flex items-center justify-center text-2xl flex-shrink-0`}>
                                            {typeConfig.icon}
                                        </div>
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                                                <h3 className="font-semibold text-[var(--text-primary)]">{typeConfig.label}</h3>
                                                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusConfig.color} text-white`}>
                                                    {statusConfig.label}
                                                </span>
                                            </div>

                                            <p className="text-sm text-[var(--text-secondary)] mb-2">{request.reason}</p>

                                            <div className="flex flex-wrap gap-4 text-xs text-[var(--text-muted)]">
                                                <span>
                                                    📅 {new Date(request.startDate).toLocaleDateString("id-ID", { day: "numeric", month: "short" })}
                                                    {isMultiDay && ` - ${new Date(request.endDate).toLocaleDateString("id-ID", { day: "numeric", month: "short" })}`}
                                                </span>
                                                <span>📝 Diajukan: {new Date(request.createdAt).toLocaleDateString("id-ID")}</span>
                                            </div>

                                            {request.approver && (
                                                <p className="text-xs text-emerald-500 mt-2">
                                                    ✅ Approved by {request.approver} • {new Date(request.approvalDate!).toLocaleDateString("id-ID")}
                                                </p>
                                            )}

                                            {request.rejectionNote && (
                                                <p className="text-xs text-rose-500 mt-2">
                                                    ❌ Note: {request.rejectionNote}
                                                </p>
                                            )}
                                        </div>
                                    </div>

                                    <span className="text-xs text-[var(--text-muted)]">{request.id}</span>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>

            {/* Request Modal */}
            {showRequestModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="glass-panel w-full max-w-lg rounded-2xl p-6 max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-bold text-[var(--text-primary)]">Ajukan Request</h2>
                            <button
                                onClick={() => setShowRequestModal(false)}
                                className="p-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 text-[var(--text-muted)]"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
                                </svg>
                            </button>
                        </div>

                        <div className="space-y-4">
                            {/* Request Type Selection */}
                            <div>
                                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">Jenis Request</label>
                                <div className="grid grid-cols-2 gap-3">
                                    {(Object.entries(REQUEST_TYPES) as [RequestType, typeof REQUEST_TYPES[RequestType]][]).map(([key, config]) => (
                                        <button
                                            key={key}
                                            onClick={() => setSelectedType(key)}
                                            className={`p-4 rounded-xl border-2 text-center transition-all ${selectedType === key
                                                ? "border-[#e8c559] bg-[#e8c559]/10"
                                                : "border-[var(--glass-border)] hover:border-[#e8c559]/50"
                                                }`}
                                        >
                                            <span className="text-2xl block mb-1">{config.icon}</span>
                                            <span className="text-sm font-medium text-[var(--text-primary)]">{config.label}</span>
                                            {config.singleDay && (
                                                <span className="block text-xs text-[var(--text-muted)]">1 hari/minggu</span>
                                            )}
                                        </button>
                                    ))}
                                </div>
                            </div>


                            {/* Date Selection - Single for WFH, Range for others */}
                            {REQUEST_TYPES[selectedType].singleDay ? (
                                <div>
                                    <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Tanggal WFH</label>
                                    <input
                                        type="date"
                                        value={newRequest.startDate}
                                        onChange={(e) => setNewRequest({ ...newRequest, startDate: e.target.value, endDate: e.target.value })}
                                        className="w-full p-3 rounded-lg border border-[var(--glass-border)] bg-[var(--card-bg)] text-[var(--text-primary)]"
                                    />
                                    <p className="text-xs text-[var(--text-muted)] mt-1">🏠 WFH hanya dapat diambil 1 hari per minggu</p>
                                </div>
                            ) : (
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
                                            min={newRequest.startDate}
                                            onChange={(e) => setNewRequest({ ...newRequest, endDate: e.target.value })}
                                            className="w-full p-3 rounded-lg border border-[var(--glass-border)] bg-[var(--card-bg)] text-[var(--text-primary)]"
                                        />
                                    </div>
                                </div>
                            )}

                            {/* Reason */}
                            <div>
                                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Alasan</label>
                                <textarea
                                    value={newRequest.reason}
                                    onChange={(e) => setNewRequest({ ...newRequest, reason: e.target.value })}
                                    className="w-full p-3 rounded-lg border border-[var(--glass-border)] bg-[var(--card-bg)] text-[var(--text-primary)] resize-none"
                                    rows={3}
                                    placeholder="Jelaskan alasan pengajuan..."
                                />
                            </div>

                            {/* Info Box */}
                            <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/20">
                                <p className="text-sm text-amber-600 dark:text-amber-400">
                                    ⚠️ Request {REQUEST_TYPES[selectedType].label} harus diajukan minimal {REQUEST_TYPES[selectedType].leadTime} sebelum tanggal berlaku.
                                </p>
                            </div>

                            {/* Action Buttons */}
                            <div className="flex gap-3 mt-6">
                                <button
                                    onClick={() => setShowRequestModal(false)}
                                    className="flex-1 px-4 py-3 rounded-lg border border-[var(--glass-border)] text-[var(--text-secondary)] font-medium"
                                >
                                    Batal
                                </button>
                                <button
                                    onClick={handleSubmitRequest}
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
