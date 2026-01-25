"use client";

import { useState } from "react";
import Link from "next/link";

type AttendanceStatus = "office" | "remote" | "wfh" | "wfa" | "dinas" | "sick" | "sakit" | "leave" | "cuti" | "izin" | "lembur" | "away" | "pending";

interface TeamMember {
    id: string;
    name: string;
    status: AttendanceStatus;
    location?: string;  // For field/wfa
    checkInTime?: string;
}

// Mock data - akan diganti dengan fetch dari Supabase
const mockTodayTeam: TeamMember[] = [
    { id: "1", name: "Andi Pratama", status: "office", checkInTime: "08:15" },
    { id: "2", name: "Indra Kusuma", status: "wfh", checkInTime: "08:25" },
    { id: "3", name: "Lisa Permata", status: "dinas", location: "PT ABC Indonesia", checkInTime: "09:30" },
    { id: "4", name: "Nanda Putri", status: "sakit" },
    { id: "5", name: "Oscar Rahman", status: "cuti" },
    { id: "6", name: "Rizky Firmansyah", status: "pending" },
];

const STATUS_CONFIG = {
    office: {
        label: "Office",
        icon: "🟢",
        bgClass: "bg-emerald-500/20",
        textClass: "text-emerald-600 dark:text-emerald-400"
    },
    remote: {
        label: "Remote",
        icon: "🌍",
        bgClass: "bg-indigo-500/20",
        textClass: "text-indigo-600 dark:text-indigo-400"
    },
    wfh: {
        label: "WFH",
        icon: "🔵",
        bgClass: "bg-[#3f545f]/20 dark:bg-[#e8c559]/20",
        textClass: "text-[#3f545f] dark:text-[#e8c559]"
    },
    wfa: {
        label: "WFA",
        icon: "🌍",
        bgClass: "bg-purple-500/20",
        textClass: "text-purple-600 dark:text-purple-400"
    },
    dinas: {
        label: "Dinas",
        icon: "🚗",
        bgClass: "bg-amber-500/20",
        textClass: "text-amber-600 dark:text-amber-400"
    },
    sick: {
        label: "Sakit",
        icon: "🩷",
        bgClass: "bg-rose-500/20",
        textClass: "text-rose-600 dark:text-rose-400"
    },
    sakit: {
        label: "Sakit",
        icon: "🩷",
        bgClass: "bg-rose-500/20",
        textClass: "text-rose-600 dark:text-rose-400"
    },
    leave: {
        label: "Cuti",
        icon: "🟣",
        bgClass: "bg-violet-500/20",
        textClass: "text-violet-600 dark:text-violet-400"
    },
    cuti: {
        label: "Cuti",
        icon: "🟣",
        bgClass: "bg-violet-500/20",
        textClass: "text-violet-600 dark:text-violet-400"
    },
    izin: {
        label: "Izin",
        icon: "📋",
        bgClass: "bg-blue-500/20",
        textClass: "text-blue-600 dark:text-blue-400"
    },
    lembur: {
        label: "Lembur",
        icon: "⏰",
        bgClass: "bg-orange-500/20",
        textClass: "text-orange-600 dark:text-orange-400"
    },
    away: {
        label: "Away",
        icon: "🌙",
        bgClass: "bg-gray-500/20",
        textClass: "text-gray-500"
    },
    pending: {
        label: "Belum Check-in",
        icon: "⏳",
        bgClass: "bg-gray-500/20",
        textClass: "text-gray-500"
    },
};

export default function TodaysTeamStatus() {
    const [expandedStatus, setExpandedStatus] = useState<AttendanceStatus | null>(null);

    // Group by status
    const groupedTeam = mockTodayTeam.reduce((acc, member) => {
        const s = member.status as AttendanceStatus;
        if (!acc[s]) {
            acc[s] = [];
        }
        acc[s].push(member);
        return acc;
    }, {} as Record<string, TeamMember[]>);

    // Order of display
    const statusOrder: AttendanceStatus[] = ["office", "remote", "wfh", "wfa", "dinas", "sick", "sakit", "leave", "cuti", "izin", "lembur", "away", "pending"];

    const today = new Date().toLocaleDateString('id-ID', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric'
    });

    const toggleExpand = (status: AttendanceStatus) => {
        setExpandedStatus(expandedStatus === status ? null : status);
    };

    return (
        <div className="glass-panel rounded-2xl p-6 h-full flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-[var(--text-secondary)] uppercase tracking-wider flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-[#3f545f] dark:text-[#e8c559]" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z" />
                    </svg>
                    Today's Team
                </h3>
                <span className="text-xs text-[var(--text-muted)] bg-[var(--glass-bg)] px-2 py-1 rounded">
                    {mockTodayTeam.length} orang
                </span>
            </div>

            {/* Date */}
            <p className="text-xs text-[var(--text-muted)] mb-4">📅 {today}</p>

            {/* Status Summary */}
            <div className="flex-1 overflow-y-auto space-y-2 scrollbar-thin pr-1">
                {statusOrder.map((status) => {
                    const members = groupedTeam[status] || [];
                    if (members.length === 0) return null;

                    const config = STATUS_CONFIG[status];
                    const isExpanded = expandedStatus === status;

                    return (
                        <div key={status} className="rounded-xl overflow-hidden">
                            {/* Status Row - Clickable */}
                            <button
                                onClick={() => toggleExpand(status)}
                                className={`w-full flex items-center justify-between p-3 rounded-xl border transition-all ${isExpanded
                                    ? `${config.bgClass} border-transparent`
                                    : 'bg-black/5 dark:bg-white/5 border-[var(--glass-border)] hover:bg-black/10 dark:hover:bg-white/10'
                                    }`}
                            >
                                <div className="flex items-center gap-2">
                                    <span className="text-sm">{config.icon}</span>
                                    <span className={`text-sm font-medium ${config.textClass}`}>
                                        {config.label}
                                    </span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className={`text-sm font-bold ${config.textClass}`}>
                                        {members.length}
                                    </span>
                                    <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        className={`h-4 w-4 text-[var(--text-muted)] transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                                        viewBox="0 0 24 24"
                                        fill="currentColor"
                                    >
                                        <path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z" />
                                    </svg>
                                </div>
                            </button>

                            {/* Expanded Members List */}
                            {isExpanded && (
                                <div className="mt-2 ml-6 space-y-1">
                                    {members.map((member) => (
                                        <div
                                            key={member.id}
                                            className="flex items-center gap-2 py-1.5 text-sm"
                                        >
                                            <div className="w-6 h-6 rounded-full bg-[var(--glass-bg)] flex items-center justify-center text-[10px] font-bold text-[var(--text-secondary)]">
                                                {member.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                                            </div>
                                            <span className="text-[var(--text-primary)] flex-1">{member.name}</span>
                                            {member.checkInTime && (
                                                <span className="text-xs text-[var(--text-muted)]">
                                                    {member.checkInTime}
                                                </span>
                                            )}
                                            {member.location && (
                                                <span className="text-xs text-[var(--text-muted)] truncate max-w-[100px]" title={member.location}>
                                                    📍 {member.location}
                                                </span>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Footer Link */}
            <div className="mt-4 pt-3 border-t border-[var(--glass-border)]">
                <Link
                    href="/dashboard/board"
                    className="text-xs font-medium text-[#3f545f] dark:text-[#e8c559] hover:underline flex items-center justify-center gap-1"
                >
                    Lihat Weekly Board →
                </Link>
            </div>
        </div>
    );
}
