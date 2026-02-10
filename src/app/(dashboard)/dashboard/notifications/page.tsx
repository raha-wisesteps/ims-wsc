"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2 } from "lucide-react";

type NotificationType = "success" | "info" | "warning" | "rejected" | "request_new" | "system";

interface Notification {
    id: string;
    type: NotificationType;
    title: string;
    message: string;
    created_at: string;
    read: boolean; // mapped from is_read in DB
    related_request_id?: string;
    related_request_type?: string;
}

const NOTIFICATION_TYPES: Record<string, { icon: string; bgClass: string; borderClass: string; textClass: string }> = {
    success: { icon: "✅", bgClass: "bg-emerald-500/10", borderClass: "border-emerald-500/30", textClass: "text-emerald-600 dark:text-emerald-400" },
    request_new: { icon: "📩", bgClass: "bg-blue-500/10", borderClass: "border-blue-500/30", textClass: "text-blue-600 dark:text-blue-400" },
    info: { icon: "💬", bgClass: "bg-blue-500/10", borderClass: "border-blue-500/30", textClass: "text-blue-600 dark:text-blue-400" },
    warning: { icon: "⏰", bgClass: "bg-amber-500/10", borderClass: "border-amber-500/30", textClass: "text-amber-600 dark:text-amber-400" },
    rejected: { icon: "❌", bgClass: "bg-rose-500/10", borderClass: "border-rose-500/30", textClass: "text-rose-600 dark:text-rose-400" },
    system: { icon: "⚙️", bgClass: "bg-gray-500/10", borderClass: "border-gray-500/30", textClass: "text-gray-600 dark:text-gray-400" },
};

const REQUEST_TYPES: Record<string, { label: string; color: string }> = {
    wfh: { label: "WFH", color: "bg-purple-500" },
    wfa: { label: "WFA", color: "bg-purple-500" },
    leave: { label: "Cuti", color: "bg-emerald-500" },
    annual_leave: { label: "Cuti", color: "bg-emerald-500" },
    sick_leave: { label: "Sakit", color: "bg-rose-500" },
    paternity: { label: "Cuti Khusus", color: "bg-emerald-500" },
    maternity: { label: "Cuti Khusus", color: "bg-emerald-500" },
    overtime: { label: "Lembur", color: "bg-amber-500" },
    sick: { label: "Sakit", color: "bg-rose-500" },
    asset: { label: "Asset", color: "bg-blue-500" },
    training: { label: "Training", color: "bg-sky-500" },
    reimburse: { label: "Reimburse", color: "bg-green-500" },
    business_trip: { label: "Dinas", color: "bg-indigo-500" },
};

type FilterType = "all" | "unread" | "requests" | "system";

export default function NotificationsPage() {
    const searchParams = useSearchParams();
    const initialFilter = (searchParams.get("filter") as FilterType) || "all";
    const { user } = useAuth();
    const supabase = createClient();

    const [filter, setFilter] = useState<FilterType>(initialFilter);
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (user) {
            fetchNotifications();

            // Subscribe to realtime updates
            const channel = supabase
                .channel('notifications_channel')
                .on(
                    'postgres_changes',
                    {
                        event: '*',
                        schema: 'public',
                        table: 'notifications',
                        filter: `profile_id=eq.${user.id}`
                    },
                    (payload: any) => {
                        console.log('Realtime notification:', payload);
                        fetchNotifications();
                    }
                )
                .subscribe();

            return () => {
                supabase.removeChannel(channel);
            };
        }
    }, [user]);

    const fetchNotifications = async () => {
        if (!user) return;

        const { data, error } = await supabase
            .from('notifications')
            .select('*')
            .eq('profile_id', user.id)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching notifications:', error);
        } else {
            // Map DB fields to UI interface
            const mappedData = data?.map((n: any) => ({
                id: n.id,
                type: n.type,
                title: n.title,
                message: n.message,
                created_at: n.created_at,
                read: n.is_read,
                related_request_id: n.related_request_id,
                related_request_type: n.related_request_type
            })) || [];

            setNotifications(mappedData);
        }
        setLoading(false);
    };

    const filteredNotifications = notifications.filter(notif => {
        if (filter === "all") return true;
        if (filter === "unread") return !notif.read;
        if (filter === "requests") return notif.related_request_type !== undefined && notif.related_request_type !== null;
        if (filter === "system") return notif.type === "system";
        return true;
    });

    const unreadCount = notifications.filter(n => !n.read).length;

    // Group notifications
    const groupedNotifications = filteredNotifications.reduce((acc, notification) => {
        const date = new Date(notification.created_at);
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);

        let key = "Earlier";
        if (date.toDateString() === today.toDateString()) {
            key = "Today";
        } else if (date.toDateString() === yesterday.toDateString()) {
            key = "Yesterday";
        }

        if (!acc[key]) acc[key] = [];
        acc[key].push(notification);
        return acc;
    }, {} as Record<string, Notification[]>);

    const markAllAsRead = async () => {
        if (!user) return;

        // Optimistic update
        setNotifications(notifications.map(n => ({ ...n, read: true })));

        const { error } = await supabase
            .from('notifications')
            .update({ is_read: true })
            .eq('profile_id', user.id)
            .eq('is_read', false); // Only update unread ones

        if (error) {
            console.error('Error marking all as read:', error);
            fetchNotifications(); // Revert on error
        }
    };

    const markAsRead = async (id: string, currentReadStatus: boolean) => {
        if (currentReadStatus || !user) return; // If already read, don't update DB but still allow navigation

        // Optimistic update
        setNotifications(notifications.map(n => n.id === id ? { ...n, read: true } : n));

        const { error } = await supabase
            .from('notifications')
            .update({ is_read: true })
            .eq('id', id);

        if (error) {
            console.error('Error marking as read:', error);
            fetchNotifications(); // Revert on error
        }
    };

    const handleNotificationClick = (notif: Notification) => {
        if (!notif.read) {
            markAsRead(notif.id, false);
        }

        // Navigation logic could be added here if needed, 
        // currently creating a request context might be complex so we start with read-only
        // But if we want to link:
        if (notif.related_request_type === 'business_trip') {
            // window.location.href = '/dashboard/my-request/business-trip'; // Using href to force full load or router if internal
        }
    };

    const deleteNotification = async (e: React.MouseEvent, id: string) => {
        e.stopPropagation(); // Prevent triggering the click on the notification item
        if (!user) return;

        // Optimistic update
        const previousNotifications = [...notifications];
        setNotifications(notifications.filter(n => n.id !== id));

        const { error } = await supabase
            .from('notifications')
            .delete()
            .eq('id', id);

        if (error) {
            console.error('Error deleting notification:', error);
            // Revert on error
            setNotifications(previousNotifications);
        }
    };

    const formatTime = (dateString: string) => {
        return new Date(dateString).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
    };

    const formatFullDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('id-ID', {
            day: 'numeric',
            month: 'short',
            year: 'numeric'
        });
    };

    return (
        <div className="flex flex-col gap-6 h-full overflow-hidden">
            {/* Page Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 flex-shrink-0">
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#3f545f] to-[#5f788e] dark:from-[#e8c559] dark:to-[#dcb33e] flex items-center justify-center shadow-lg">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white dark:text-[#171611]" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6v-5c0-3.07-1.63-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.64 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2zm-2 1H8v-6c0-2.48 1.51-4.5 4-4.5s4 2.02 4 4.5v6z" />
                        </svg>
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-[var(--text-primary)]">Notifications</h2>
                        <p className="text-sm text-[var(--text-secondary)]">Pusat informasi dan aktivitas Anda</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    {unreadCount > 0 && (
                        <span className="px-3 py-1.5 rounded-full bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-sm font-medium">
                            {unreadCount} Baru
                        </span>
                    )}
                    <button
                        onClick={markAllAsRead}
                        disabled={unreadCount === 0}
                        className="px-4 py-2 rounded-xl text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-black/5 dark:hover:bg-white/5 transition-colors disabled:opacity-50"
                    >
                        Tandai semua dibaca
                    </button>
                    <Link
                        href="/dashboard"
                        className="px-4 py-2 rounded-xl border border-[var(--glass-border)] text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--glass-border)] transition-colors"
                    >
                        Kembali
                    </Link>
                </div>
            </div>

            {/* Filter Tabs */}
            <div className="glass-panel rounded-2xl p-2 flex gap-2 overflow-x-auto flex-shrink-0">
                {[
                    { key: "all", label: "Semua", count: notifications.length },
                    { key: "unread", label: "Belum Dibaca", count: unreadCount },
                    { key: "requests", label: "Update Request", count: notifications.filter(n => n.related_request_id).length },
                    { key: "system", label: "Sistem", count: notifications.filter(n => n.type === "system").length },
                ].map(tab => (
                    <button
                        key={tab.key}
                        onClick={() => setFilter(tab.key as FilterType)}
                        className={`flex-1 min-w-[100px] px-4 py-2.5 rounded-xl text-sm font-medium transition-all whitespace-nowrap ${filter === tab.key
                            ? "bg-[#e8c559] text-[#171611] shadow-lg"
                            : "text-[var(--text-secondary)] hover:bg-black/5 dark:hover:bg-white/5"
                            }`}
                    >
                        {tab.label}
                        <span className={`ml-2 px-2 py-0.5 rounded-full text-xs ${filter === tab.key
                            ? "bg-[#171611]/20 text-[#171611]"
                            : "bg-black/10 dark:bg-white/10"
                            }`}>
                            {tab.count}
                        </span>
                    </button>
                ))}
            </div>

            {/* Notifications List */}
            <div className="glass-panel rounded-2xl overflow-hidden flex-1 flex flex-col min-h-0">
                {loading ? (
                    <div className="flex items-center justify-center flex-1">
                        <Loader2 className="w-8 h-8 animate-spin text-[var(--text-muted)]" />
                    </div>
                ) : filteredNotifications.length === 0 ? (
                    <div className="p-12 text-center h-full flex flex-col items-center justify-center flex-1">
                        <p className="text-5xl mb-4">🔔</p>
                        <p className="text-lg font-medium text-[var(--text-primary)] mb-1">Tidak ada notifikasi</p>
                        <p className="text-sm text-[var(--text-secondary)]">
                            {filter === "unread" ? "Anda sudah membaca semua notifikasi!" : "Tidak ada notifikasi di kategori ini."}
                        </p>
                    </div>
                ) : (
                    <div className="overflow-y-auto flex-1 p-0">
                        {["Today", "Yesterday", "Earlier"].map((group) => {
                            const groupItems = groupedNotifications[group];
                            if (!groupItems || groupItems.length === 0) return null;

                            return (
                                <div key={group} className="border-b border-[var(--glass-border)] last:border-0">
                                    <div className="bg-[var(--glass-bg)]/50 backdrop-blur-sm sticky top-0 z-10 px-6 py-2 border-b border-[var(--glass-border)]">
                                        <h4 className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">
                                            {group === "Today" ? "Hari Ini" : group === "Yesterday" ? "Kemarin" : "Lebih Lama"}
                                        </h4>
                                    </div>
                                    <div className="divide-y divide-[var(--glass-border)]">
                                        {groupItems.map(notif => {
                                            const defaultType = NOTIFICATION_TYPES.info;
                                            const typeConfig = NOTIFICATION_TYPES[notif.type] || defaultType;

                                            const requestType = notif.related_request_type
                                                ? REQUEST_TYPES[notif.related_request_type] || { label: notif.related_request_type, color: "bg-gray-500" }
                                                : null;

                                            return (
                                                <div
                                                    key={notif.id}
                                                    onClick={() => handleNotificationClick(notif)}
                                                    className={`p-5 hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer flex gap-4 group ${!notif.read ? "bg-[#e8c559]/5" : ""
                                                        }`}
                                                >
                                                    {/* Icon */}
                                                    <div className={`w-12 h-12 rounded-xl ${typeConfig.bgClass} border ${typeConfig.borderClass} flex items-center justify-center text-2xl shrink-0`}>
                                                        {typeConfig.icon}
                                                    </div>

                                                    {/* Content */}
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-start justify-between gap-3 mb-1">
                                                            <div className="flex items-center gap-2 flex-wrap">
                                                                <h4 className={`font-semibold ${!notif.read ? "text-[var(--text-primary)]" : "text-[var(--text-secondary)]"}`}>
                                                                    {notif.title}
                                                                </h4>
                                                                {!notif.read && (
                                                                    <span className="w-2 h-2 rounded-full bg-[#e8c559]" />
                                                                )}
                                                                {requestType && (
                                                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold text-white ${requestType.color}`}>
                                                                        {requestType.label}
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-xs text-[var(--text-muted)] shrink-0">
                                                                    {formatTime(notif.created_at)}
                                                                </span>
                                                                <button
                                                                    onClick={(e) => deleteNotification(e, notif.id)}
                                                                    className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-500/10 opacity-0 group-hover:opacity-100 transition-opacity"
                                                                    title="Hapus notifikasi"
                                                                >
                                                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                                        <path d="M3 6h18" />
                                                                        <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                                                                        <path d="M8 6V4c0-1 1-2 2-2h4c0 1 1 2 2 2v2" />
                                                                    </svg>
                                                                </button>
                                                            </div>
                                                        </div>
                                                        <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                                                            {notif.message}
                                                        </p>
                                                        <p className="text-xs text-[var(--text-muted)] mt-2">
                                                            {formatFullDate(notif.created_at)}
                                                        </p>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}

