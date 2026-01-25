"use client";

import { useState } from "react";

interface Announcement {
    id: string;
    title?: string;
    message: string;
    createdAt: string;
    createdBy: string;
    isPinned?: boolean;
}

// Mock data - akan diganti dengan fetch dari Supabase
const mockAnnouncements: Announcement[] = [
    {
        id: "1",
        title: "🔔 PENTING!",
        message: "Weekly meeting diundur ke jam 15:00 karena ada acara klien pagi ini.",
        createdAt: "2024-12-27T08:00:00",
        createdBy: "Pak Bos",
        isPinned: true,
    },
    {
        id: "2",
        message: "🏖️ Reminder: Senin 30 Des libur nasional (Cuti Bersama). Enjoy your holiday!",
        createdAt: "2024-12-26T17:00:00",
        createdBy: "Pak Bos",
    },
    {
        id: "3",
        message: "Selamat ulang tahun untuk Maya! 🎂🎉",
        createdAt: "2024-12-26T09:00:00",
        createdBy: "Pak Bos",
    },
];

interface AnnouncementCardProps {
    isOwner?: boolean;
}

export default function AnnouncementCard({ isOwner = false }: AnnouncementCardProps) {
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [newMessage, setNewMessage] = useState("");
    const [newTitle, setNewTitle] = useState("");

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

        if (diffHours < 1) return "Baru saja";
        if (diffHours < 24) return `${diffHours} jam lalu`;

        return date.toLocaleDateString('id-ID', {
            day: 'numeric',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    return (
        <div className="glass-panel rounded-2xl p-6 h-full flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-[var(--text-secondary)] uppercase tracking-wider flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-[#3f545f] dark:text-[#e8c559]" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.89 2 2 2zm6-6v-5c0-3.07-1.64-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z" />
                    </svg>
                    Announcement
                </h3>
                {isOwner && (
                    <button
                        onClick={() => setShowCreateModal(true)}
                        className="p-1.5 rounded-lg hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
                        title="Buat pengumuman"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-[var(--text-secondary)]" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />
                        </svg>
                    </button>
                )}
            </div>

            {/* Announcements List */}
            <div className="flex-1 overflow-y-auto space-y-3 scrollbar-thin pr-1">
                {mockAnnouncements.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center py-8">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-[var(--text-muted)] mb-3" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H5.17L4 17.17V4h16v12z" />
                        </svg>
                        <p className="text-sm text-[var(--text-muted)]">Belum ada pengumuman</p>
                    </div>
                ) : (
                    mockAnnouncements.map((announcement) => (
                        <div
                            key={announcement.id}
                            className={`p-3 rounded-xl border transition-colors ${announcement.isPinned
                                    ? 'bg-[#3f545f]/10 dark:bg-[#e8c559]/10 border-[#3f545f]/30 dark:border-[#e8c559]/30'
                                    : 'bg-black/5 dark:bg-white/5 border-[var(--glass-border)]'
                                }`}
                        >
                            {announcement.title && (
                                <p className="text-sm font-bold text-[var(--text-primary)] mb-1">
                                    {announcement.isPinned && <span className="text-[#e8c559] mr-1">📌</span>}
                                    {announcement.title}
                                </p>
                            )}
                            <p className="text-sm text-[var(--text-primary)] leading-relaxed">
                                {announcement.message}
                            </p>
                            <div className="flex items-center gap-2 mt-2 text-xs text-[var(--text-muted)]">
                                <span>{formatDate(announcement.createdAt)}</span>
                                <span>•</span>
                                <span>By: {announcement.createdBy}</span>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Create Modal (Owner Only) */}
            {showCreateModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="glass-panel rounded-2xl p-6 w-full max-w-md">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-xl font-bold text-[var(--text-primary)]">Buat Pengumuman</h2>
                            <button
                                onClick={() => setShowCreateModal(false)}
                                className="p-2 hover:bg-black/10 dark:hover:bg-white/10 rounded-lg"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-[var(--text-secondary)]" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
                                </svg>
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="text-sm text-[var(--text-secondary)] mb-1 block">Judul (opsional)</label>
                                <input
                                    type="text"
                                    placeholder="e.g., PENTING!, Reminder"
                                    value={newTitle}
                                    onChange={(e) => setNewTitle(e.target.value)}
                                    className="w-full p-3 rounded-lg bg-black/10 dark:bg-black/30 border border-[var(--glass-border)] text-[var(--text-primary)] focus:border-[#e8c559] focus:ring-1 focus:ring-[#e8c559] outline-none"
                                />
                            </div>
                            <div>
                                <label className="text-sm text-[var(--text-secondary)] mb-1 block">Pesan *</label>
                                <textarea
                                    placeholder="Tulis pengumuman..."
                                    value={newMessage}
                                    onChange={(e) => setNewMessage(e.target.value)}
                                    rows={4}
                                    className="w-full p-3 rounded-lg bg-black/10 dark:bg-black/30 border border-[var(--glass-border)] text-[var(--text-primary)] focus:border-[#e8c559] focus:ring-1 focus:ring-[#e8c559] outline-none resize-none"
                                />
                            </div>
                        </div>

                        <div className="flex gap-3 mt-6">
                            <button
                                onClick={() => setShowCreateModal(false)}
                                className="flex-1 py-3 rounded-lg border border-[var(--glass-border)] text-[var(--text-secondary)] hover:bg-black/5 dark:hover:bg-white/5 font-medium transition-colors"
                            >
                                Batal
                            </button>
                            <button
                                onClick={() => {
                                    // TODO: Save to Supabase
                                    setShowCreateModal(false);
                                    setNewTitle("");
                                    setNewMessage("");
                                }}
                                disabled={!newMessage.trim()}
                                className="flex-1 py-3 rounded-lg bg-[#3f545f] dark:bg-[#e8c559] text-white dark:text-[#1c2120] font-bold hover:opacity-90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Kirim
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
