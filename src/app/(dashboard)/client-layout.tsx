"use client";

import { useState, useEffect } from "react";
import { useTheme } from "@/contexts/ThemeContext";
import Sidebar from "@/components/layout/Sidebar";
import Header from "@/components/layout/Header";
import { AuthProvider } from "@/contexts/AuthContext";

export default function DashboardClientLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

    const handleSidebarToggle = () => {
        setSidebarCollapsed(!sidebarCollapsed);
    };

    const { setTheme } = useTheme();

    useEffect(() => {
        setTheme("light");
    }, [setTheme]);

    return (
        <AuthProvider>
            <div className="h-screen flex overflow-hidden bg-[var(--background)] text-[var(--foreground)] transition-colors duration-300">
                {/* Sidebar */}
                <Sidebar collapsed={sidebarCollapsed} />

                {/* Main Content */}
                <main className="flex-1 h-full overflow-y-auto relative">
                    {/* Background Gradient - only visible in dark mode */}
                    <div className="fixed top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-[#e8c559]/5 via-transparent to-transparent pointer-events-none z-0 dark:opacity-100 opacity-0 transition-opacity duration-300" />

                    <div className="relative z-10 max-w-[1400px] mx-auto flex flex-col min-h-full">
                        {/* Header */}
                        <Header
                            onSidebarToggle={handleSidebarToggle}
                            sidebarCollapsed={sidebarCollapsed}
                        />

                        {/* Page Content */}
                        <div className="flex-1 p-8 pt-0">
                            {children}
                        </div>

                        {/* Footer */}
                        <footer className="p-8 pt-0 text-center">
                            <p className="text-xs text-[var(--text-secondary)]">© 2025 Wise Steps Consulting Smart Tourism Team. All rights reserved.</p>
                        </footer>
                    </div>
                </main>
            </div>
        </AuthProvider>
    );
}
