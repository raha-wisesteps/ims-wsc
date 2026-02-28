"use client";

import { useState, useEffect, useCallback } from "react";
import { usePathname } from "next/navigation";
import { useTheme } from "@/contexts/ThemeContext";
import Sidebar from "@/components/layout/Sidebar";
import Header from "@/components/layout/Header";
import { AuthProvider } from "@/contexts/AuthContext";

/** Breakpoint matching Tailwind's `md` (768px) */
function useIsMobile(breakpoint = 768) {
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        const mql = window.matchMedia(`(max-width: ${breakpoint - 1}px)`);
        const onChange = (e: MediaQueryListEvent | MediaQueryList) =>
            setIsMobile(e.matches);

        // Initial check
        onChange(mql);

        mql.addEventListener("change", onChange);
        return () => mql.removeEventListener("change", onChange);
    }, [breakpoint]);

    return isMobile;
}

export default function DashboardClientLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const isMobile = useIsMobile();
    const pathname = usePathname();

    // On desktop start open, on mobile start closed
    const [sidebarOpen, setSidebarOpen] = useState(true);

    // When switching between mobile/desktop, reset sidebar state
    useEffect(() => {
        setSidebarOpen(!isMobile);
    }, [isMobile]);

    // Auto-close sidebar on mobile when navigating
    useEffect(() => {
        if (isMobile) {
            setSidebarOpen(false);
        }
    }, [pathname, isMobile]);

    const handleSidebarToggle = useCallback(() => {
        setSidebarOpen((prev) => !prev);
    }, []);

    const handleSidebarClose = useCallback(() => {
        setSidebarOpen(false);
    }, []);

    const { setTheme } = useTheme();

    useEffect(() => {
        setTheme("light");
    }, [setTheme]);

    return (
        <AuthProvider>
            <div className="h-screen flex overflow-hidden bg-[var(--background)] text-[var(--foreground)] transition-colors duration-300">

                {/* ── Mobile Backdrop ── */}
                {isMobile && sidebarOpen && (
                    <div
                        className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm transition-opacity"
                        onClick={handleSidebarClose}
                        aria-label="Close sidebar"
                    />
                )}

                {/* ── Sidebar ── */}
                <Sidebar
                    collapsed={!sidebarOpen}
                    isMobile={isMobile}
                    onClose={handleSidebarClose}
                />

                {/* Main Content */}
                <main className="flex-1 h-full overflow-y-auto relative">
                    {/* Background Gradient - only visible in dark mode */}
                    <div className="fixed top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-[#e8c559]/5 via-transparent to-transparent pointer-events-none z-0 dark:opacity-100 opacity-0 transition-opacity duration-300" />

                    <div className="relative z-10 max-w-[1400px] mx-auto flex flex-col min-h-full">
                        {/* Header */}
                        <Header
                            onSidebarToggle={handleSidebarToggle}
                            sidebarCollapsed={!sidebarOpen}
                        />

                        {/* Page Content */}
                        <div className="flex-1 p-3 pt-0 sm:p-4 sm:pt-0 xl:p-8 xl:pt-0">
                            {children}
                        </div>

                        {/* Footer */}
                        <footer className="p-3 pt-0 sm:p-4 sm:pt-0 xl:p-8 xl:pt-0 text-center">
                            <p className="text-xs text-[var(--text-secondary)]">© 2026 Wise Steps Consulting Smart Tourism Team. All rights reserved.</p>
                        </footer>
                    </div>
                </main>
            </div>
        </AuthProvider>
    );
}
