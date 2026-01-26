"use client";

import { useTheme } from "@/contexts/ThemeContext";
import { useAuth } from "@/contexts/AuthContext";
import { useState, useEffect } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

interface HeaderProps {
    onSidebarToggle?: () => void;
    sidebarCollapsed?: boolean;
}

export default function Header({
    onSidebarToggle,
    sidebarCollapsed = false
}: HeaderProps) {
    const { theme, toggleTheme } = useTheme();
    const { profile, isLoading } = useAuth();
    const [showNotifications, setShowNotifications] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);
    const [recentNotifs, setRecentNotifs] = useState<any[]>([]);
    const supabase = createClient();
    const { user } = useAuth(); // getting user object for ID

    // Fetch notifications
    useEffect(() => {
        if (!user) return;

        const fetchNotifs = async () => {
            // Get unread count
            const { count } = await supabase
                .from('notifications')
                .select('*', { count: 'exact', head: true })
                .eq('profile_id', user.id)
                .eq('is_read', false);

            setUnreadCount(count || 0);

            // Get recent 5
            const { data } = await supabase
                .from('notifications')
                .select('*')
                .eq('profile_id', user.id)
                .order('created_at', { ascending: false })
                .limit(5);

            setRecentNotifs(data || []);
        };

        fetchNotifs();

        // Subscribe
        const channel = supabase
            .channel('header_notifs')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'notifications',
                    filter: `profile_id=eq.${user.id}`
                },
                () => {
                    fetchNotifs();
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [user]);

    // Format relative time helper
    const getTimeAgo = (dateStr: string) => {
        const diff = (new Date().getTime() - new Date(dateStr).getTime()) / 1000;
        if (diff < 60) return `${Math.floor(diff)}s ago`;
        if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
        if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
        return `${Math.floor(diff / 86400)}d ago`;
    };

    // Get icon based on type
    const getIcon = (type: string) => {
        switch (type) {
            case 'success': return '✅';
            case 'request_new': return '📩';
            case 'rejected': return '❌';
            case 'warning': return '⏰';
            default: return '💬';
        }
    };

    // Get user display info from profile or fallback
    const userName = profile?.full_name || "Loading...";
    const userRole = profile?.job_title || "Employee";
    const userAvatar = profile?.avatar_url || undefined;

    const today = new Date();
    const formattedDate = today.toLocaleDateString("id-ID", {
        weekday: "long",
        day: "numeric",
        month: "short",
        year: "numeric",
    });

    const handleNotificationClick = async (notif: any) => {
        // Mark as read if not already
        if (!notif.read) {
            const { error } = await supabase
                .from('notifications')
                .update({ is_read: true })
                .eq('id', notif.id);

            if (!error) {
                // Optimistic update
                setRecentNotifs(prev => prev.map(n => n.id === notif.id ? { ...n, is_read: true } : n));
                setUnreadCount(prev => Math.max(0, prev - 1));
            }
        }

        // Navigate based on type
        // 'request_new' -> Admin Approval
        // 'success'/'rejected' -> My Request
        if (notif.type === 'request_new') {
            window.location.href = '/dashboard/command-center/request-approval';
        } else if (['success', 'rejected'].includes(notif.type)) {
            window.location.href = '/dashboard/my-request';
        }
    };

    return (
        <header className="flex flex-wrap justify-between items-center gap-4 p-8 pb-6">
            <div className="flex items-center gap-4">
                {/* Sidebar Toggle Button */}
                <button
                    onClick={onSidebarToggle}
                    className="p-2 rounded-lg bg-[var(--glass-bg)] border border-[var(--glass-border)] hover:bg-[var(--glass-border-hover)] transition-colors flex items-center justify-center"
                    title={sidebarCollapsed ? "Buka Sidebar" : "Tutup Sidebar"}
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-[var(--text-secondary)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        {sidebarCollapsed ? (
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                        ) : (
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h7" />
                        )}
                    </svg>
                </button>

                {/* Date Display */}
                <div className="flex items-center gap-2 text-[var(--text-secondary)]">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM9 10H7v2h2v-2zm4 0h-2v2h2v-2zm4 0h-2v2h2v-2zm-8 4H7v2h2v-2zm4 0h-2v2h2v-2zm4 0h-2v2h2v-2z" />
                    </svg>
                    <p className="text-sm font-normal leading-normal">{formattedDate}</p>
                </div>
            </div>

            <div className="flex items-center gap-4">
                {/* Notification Bell */}
                <div className="relative">
                    <button
                        onClick={() => setShowNotifications(!showNotifications)}
                        className="bg-[var(--glass-bg)] hover:bg-[var(--glass-border-hover)] p-2 rounded-full relative transition-colors border border-[var(--glass-border)]"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-[var(--text-secondary)]" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6v-5c0-3.07-1.63-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.64 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2zm-2 1H8v-6c0-2.48 1.51-4.5 4-4.5s4 2.02 4 4.5v6z" />
                        </svg>
                        {unreadCount > 0 && (
                            <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                        )}
                    </button>

                    {showNotifications && (
                        <div className="absolute right-0 top-12 w-80 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-2xl overflow-hidden z-[300]">
                            <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 flex justify-between items-center bg-gray-50/50 dark:bg-zinc-900/50">
                                <h3 className="font-bold text-gray-900 dark:text-gray-100">Notifications</h3>
                                <Link href="/dashboard/notifications" className="text-[10px] text-[var(--primary)] hover:underline">View All</Link>
                            </div>
                            <div className="max-h-[300px] overflow-y-auto bg-white dark:bg-zinc-900">
                                {recentNotifs.length === 0 ? (
                                    <div className="p-4 text-center text-gray-500 text-sm">No notifications</div>
                                ) : (
                                    recentNotifs.map(notif => (
                                        <div
                                            key={notif.id}
                                            onClick={() => handleNotificationClick(notif)}
                                            className={`p-3 border-b border-zinc-100 dark:border-zinc-800 hover:bg-gray-50 dark:hover:bg-zinc-800/50 transition-colors flex gap-3 cursor-pointer ${!notif.is_read ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''}`}
                                        >
                                            <div className="h-8 w-8 rounded-full bg-gray-100 dark:bg-zinc-800 flex items-center justify-center text-sm shrink-0">
                                                {getIcon(notif.type)}
                                            </div>
                                            <div>
                                                <p className="text-xs text-gray-800 dark:text-gray-200 font-medium leading-tight">{notif.title}</p>
                                                <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-1">{getTimeAgo(notif.created_at)}</p>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                            <div className="p-2 text-center bg-gray-50 dark:bg-zinc-900 border-t border-zinc-200 dark:border-zinc-800">
                                <Link href="/dashboard/notifications" className="text-xs text-gray-500 hover:text-[var(--primary)] transition-colors">View All History</Link>
                            </div>
                        </div>
                    )}
                </div>

                {/* Theme Toggle */}
                <button
                    onClick={toggleTheme}
                    className="bg-[var(--glass-bg)] hover:bg-[var(--glass-border-hover)] p-2 rounded-full transition-colors border border-[var(--glass-border)] group"
                    title={theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}
                >
                    {theme === "dark" ? (
                        // Sun icon for dark mode (click to go light)
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-[var(--primary)] group-hover:rotate-45 transition-transform" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M6.76 4.84l-1.8-1.79-1.41 1.41 1.79 1.79 1.42-1.41zM4 10.5H1v2h3v-2zm9-9.95h-2V3.5h2V.55zm7.45 3.91l-1.41-1.41-1.79 1.79 1.41 1.41 1.79-1.79zm-3.21 13.7l1.79 1.8 1.41-1.41-1.8-1.79-1.4 1.4zM20 10.5v2h3v-2h-3zm-8-5c-3.31 0-6 2.69-6 6s2.69 6 6 6 6-2.69 6-6-2.69-6-6-6zm-1 16.95h2V19.5h-2v2.95zm-7.45-3.91l1.41 1.41 1.79-1.8-1.41-1.41-1.79 1.8z" />
                        </svg>
                    ) : (
                        // Moon icon for light mode (click to go dark)
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-[var(--primary)] group-hover:scale-110 transition-transform" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M9.37,5.51C9.19,6.15,9.1,6.82,9.1,7.5c0,4.08,3.32,7.4,7.4,7.4c0.68,0,1.35-0.09,1.99-0.27C17.45,17.19,14.93,19,12,19 c-3.86,0-7-3.14-7-7C5,9.07,6.81,6.55,9.37,5.51z M12,3c-4.97,0-9,4.03-9,9s4.03,9,9,9s9-4.03,9-9c0-0.46-0.04-0.92-0.1-1.36 c-0.98,1.37-2.58,2.26-4.4,2.26c-2.98,0-5.4-2.42-5.4-5.4c0-1.81,0.89-3.42,2.26-4.4C12.92,3.04,12.46,3,12,3L12,3z" />
                        </svg>
                    )}
                </button>

                {/* User Profile */}
                <Link
                    href="/dashboard/profile"
                    className="flex items-center gap-3 pl-4 border-l border-[var(--glass-border)] cursor-pointer group"
                >
                    <div className="text-right hidden sm:block">
                        <p className="text-sm font-bold text-[var(--text-primary)] group-hover:text-[var(--primary)] transition-colors">{userName}</p>
                        <p className="text-xs text-[var(--primary)]">{userRole}</p>
                    </div>
                    <div
                        className="h-10 w-10 rounded-full bg-cover bg-center overflow-hidden group-hover:brightness-110 transition-all"
                        style={{
                            backgroundColor: "var(--primary)",
                            ...(userAvatar ? { backgroundImage: `url('${userAvatar}')`, backgroundSize: 'cover', backgroundPosition: 'center' } : {})
                        }}
                    >
                        {!userAvatar && (
                            <div
                                className="w-full h-full flex items-center justify-center font-bold text-sm text-[var(--primary-foreground)]"
                            >
                                {userName.split(" ").map(n => n[0]).join("").slice(0, 2)}
                            </div>
                        )}
                    </div>
                </Link>
            </div>
        </header>
    );
}
