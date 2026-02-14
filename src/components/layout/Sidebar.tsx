"use client";

import { useMemo, useRef, useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useAuth, Profile } from "@/contexts/AuthContext";
import { Lightbulb } from "lucide-react";

interface NavItem {
    label: string;
    href: string;
    icon: React.ReactNode;
    badge?: number;
    section?: string;
    // Access control
    roles?: string[];           // Allowed roles (empty = all)
    jobTypes?: string[];        // Allowed job_types
    requireOfficeManager?: boolean;
    excludeIntern?: boolean;    // Hide from interns
    excludeRoles?: string[];    // Roles to exclude from seeing this item
}

const navItems: NavItem[] = [
    // Main Menu - All Users
    {
        label: "Home",
        href: "/dashboard",
        icon: (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 24 24" fill="currentColor">
                <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />
            </svg>
        ),
    },

    {
        label: "My Request",
        href: "/dashboard/my-request",
        icon: (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19 3h-4.18C14.4 1.84 13.3 1 12 1c-1.3 0-2.4.84-2.82 2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 0c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zm2 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z" />
            </svg>
        ),
        excludeRoles: ['ceo', 'hr'], // Hide from CEO and HR
    },
    // Resources - Moved here
    {
        label: "Knowledge Hub",
        href: "/dashboard/knowledge",
        icon: <Lightbulb className="h-6 w-6" />,
        section: "Resources",
    },
    // Business Development Menu
    {
        label: "BusDev Dashboard",
        href: "/dashboard/bisdev",
        icon: (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 24 24" fill="currentColor">
                <path d="M16 6l2.29 2.29-4.88 4.88-4-4L2 16.59 3.41 18l6-6 4 4 6.3-6.29L22 12V6z" />
            </svg>
        ),
        section: "Business Development",
        roles: ["owner", "bisdev", "super_admin", "ceo"],
    },
    {
        label: "CRM Database",
        href: "/dashboard/bisdev/crm",
        icon: (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 24 24" fill="currentColor">
                <path d="M20 6h-8l-2-2H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm0 12H4V8h16v10z" />
            </svg>
        ),
        section: "Business Development",
        roles: ["owner", "bisdev", "super_admin", "ceo"],
    },
    // Human Resource Menu




    // Operasional - Office Manager, CEO, Super Admin
    {
        label: "Operasional",
        href: "/dashboard/operational",
        icon: (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 24 24" fill="currentColor">
                <path d="M11.8 10.9c-2.27-.59-3-1.2-3-2.15 0-1.09 1.01-1.85 2.7-1.85 1.78 0 2.44.85 2.5 2.1h2.21c-.07-1.72-1.12-3.3-3.21-3.81V3h-3v2.16c-1.94.42-3.5 1.68-3.5 3.61 0 2.31 1.91 3.46 4.7 4.13 2.5.6 3 1.48 3 2.41 0 .69-.49 1.79-2.7 1.79-2.06 0-2.87-.92-2.98-2.1h-2.2c.12 2.19 1.76 3.42 3.68 3.83V21h3v-2.15c1.95-.37 3.5-1.5 3.5-3.55 0-2.84-2.43-3.81-4.7-4.4z" />
            </svg>
        ),
        section: "Operasional",
        requireOfficeManager: true,
    },

    // Sustainability - Everyone except intern
    {
        label: "Sustainability",
        href: "/dashboard/sustainability",
        icon: (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z" />
            </svg>
        ),
        section: "Sustainability",
        excludeIntern: true,
    },

    // Talent Pool - HR/Admin only
    {
        label: "Talent Pool",
        href: "/dashboard/talent-pool",
        icon: (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 24 24" fill="currentColor">
                <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z" />
            </svg>
        ),
        section: "Human Resource",
        roles: ["owner", "ceo", "super_admin", "hr"],
    },

    // Human Resource Menu
    {
        label: "Human Resources",
        href: "/dashboard/hr",
        icon: (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
            </svg>
        ),
        section: "Human Resource",
        roles: ["owner", "ceo", "super_admin", "hr"],
    },
    {
        label: "Command Center",
        href: "/dashboard/command-center",
        icon: (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 24 24" fill="currentColor">
                <path d="M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z" />
            </svg>
        ),
        section: "Human Resource",
        roles: ["owner", "ceo", "super_admin"], // Note: HR cannot access Command Center
    },


];

interface SidebarProps {
    collapsed?: boolean;
}

export default function Sidebar({ collapsed = false }: SidebarProps) {
    const pathname = usePathname();
    const router = useRouter();
    const supabase = createClient();
    const { profile, isLoading } = useAuth();

    // Cache the last known profile to maintain sidebar state during logout
    const cachedProfileRef = useRef<Profile | null>(null);
    if (profile) {
        cachedProfileRef.current = profile;
    }

    // Use cached profile or current profile for filtering
    const effectiveProfile = profile || cachedProfileRef.current;

    // Pending requests state
    const [pendingCount, setPendingCount] = useState(0);

    useEffect(() => {
        if (!effectiveProfile) return;

        // Only check for admins/executives who can approve
        const canApprove = ["owner", "ceo", "super_admin", "hr"].includes(effectiveProfile.role) || effectiveProfile.is_hr;

        if (canApprove) {
            const fetchPending = async () => {
                const { count: leaveCount } = await supabase
                    .from('leave_requests')
                    .select('*', { count: 'exact', head: true })
                    .eq('status', 'pending');

                const { count: otherCount } = await supabase
                    .from('other_requests')
                    .select('*', { count: 'exact', head: true })
                    .eq('status', 'pending');

                setPendingCount((leaveCount || 0) + (otherCount || 0));
            };

            fetchPending();

            // Realtime subscription for LEAVE REQUESTS
            const channel1 = supabase
                .channel('sidebar_pending_leaves')
                .on(
                    'postgres_changes',
                    { event: '*', schema: 'public', table: 'leave_requests' },
                    () => fetchPending()
                )
                .subscribe();

            // Realtime subscription for OTHER REQUESTS
            const channel2 = supabase
                .channel('sidebar_pending_others')
                .on(
                    'postgres_changes',
                    { event: '*', schema: 'public', table: 'other_requests' },
                    () => fetchPending()
                )
                .subscribe();

            return () => {
                supabase.removeChannel(channel1);
                supabase.removeChannel(channel2);
            };
        }
    }, [effectiveProfile]);




    // Filter nav items based on user role
    const filteredNavItems = useMemo(() => {
        // When no effective profile: show only basic public menus
        if (!effectiveProfile) {
            const basicMenus = ["/dashboard", "/dashboard/my-request", "/dashboard/knowledge"];
            return navItems.filter(item => basicMenus.includes(item.href));
        }

        console.log("Sidebar: Profile loaded", effectiveProfile.role, effectiveProfile.job_type);

        const items = navItems.filter(item => {
            // Check role restrictions
            if (item.roles && item.roles.length > 0) {
                if (!item.roles.includes(effectiveProfile.role)) {
                    // Check flags extensions
                    if (item.roles.includes("bisdev") && (effectiveProfile.is_busdev || effectiveProfile.job_type === "bisdev")) {
                        // Allow access
                    } else if (item.roles.includes("hr") && effectiveProfile.is_hr) {
                        // Allow access
                    } else if (item.jobTypes && effectiveProfile.job_type && item.jobTypes.includes(effectiveProfile.job_type)) {
                        // OK, allowed via job_type
                    } else {
                        return false;
                    }
                }
            }

            // Check office manager requirement
            if (item.requireOfficeManager) {
                if (!effectiveProfile.is_office_manager && !["owner", "ceo", "super_admin"].includes(effectiveProfile.role)) {
                    return false;
                }
            }

            // Check intern exclusion
            if (item.excludeIntern && effectiveProfile.job_type === "intern") {
                return false;
            }

            // Check role exclusion
            if (item.excludeRoles && item.excludeRoles.includes(effectiveProfile.role)) {
                return false;
            }

            return true;
        });

        return items.map(item => {
            // Inject dynamic badge for Command Center
            if (item.label === "Command Center" && pendingCount > 0) {
                return { ...item, badge: pendingCount };
            }
            return item;
        });
    }, [effectiveProfile, pendingCount]);

    const handleLogout = async () => {
        console.log("Logout clicked");

        // Set a timeout to force redirect if signOut hangs
        const forceRedirectTimeout = setTimeout(() => {
            console.log("Logout timed out, forcing redirect");
            window.location.href = "/login";
        }, 2000);

        try {
            await supabase.auth.signOut();
            clearTimeout(forceRedirectTimeout);
            router.push("/login");
            router.refresh();
        } catch (error) {
            console.error("Logout error:", error);
            clearTimeout(forceRedirectTimeout);
            // Force redirect even if signOut fails
            window.location.href = "/login";
        }
    };



    const NavLink = ({ item }: { item: NavItem }) => {
        const isActive = pathname === item.href;

        return (
            <Link
                href={item.href}
                className={`flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200 group ${isActive
                    ? "bg-white/10 dark:bg-primary/10 border border-white/20 dark:border-primary/20"
                    : "hover:bg-white/10 dark:hover:bg-white/5 border border-transparent"
                    }`}
            >
                <span
                    className={`transition-colors ${isActive ? "text-primary" : "group-hover:opacity-100"}`}
                    style={{ color: isActive ? 'var(--sidebar-text-hover)' : 'var(--sidebar-text)' }}
                >
                    {item.icon}
                </span>
                <p
                    className={`text-sm font-medium leading-normal transition-colors ${isActive ? "font-semibold" : ""}`}
                    style={{ color: isActive ? 'var(--sidebar-text-hover)' : 'var(--sidebar-text)' }}
                >
                    {item.label}
                </p>
                {item.badge && (
                    <span className="ml-auto bg-[#e8c559] text-[#171611] text-xs font-bold px-2 py-0.5 rounded-full">
                        {item.badge}
                    </span>
                )}
            </Link>
        );
    };



    return (
        <aside className={`w-64 h-full bg-[var(--sidebar-bg)] border-r border-[var(--glass-border)] flex flex-col p-4 flex-shrink-0 z-20 transition-all duration-300 ${collapsed ? '-ml-64' : 'ml-0'}`}>
            {/* Logo Area - Fixed at top */}
            <div className="flex items-center px-2 py-2 flex-shrink-0">
                <img
                    src="/logo_fix.svg"
                    alt="Company Logo"
                    className="h-[70px] w-auto object-contain transition-all duration-300"
                    style={{ filter: 'var(--logo-filter)' }}
                />
            </div>

            {/* Navigation - Scrollable */}
            <nav className="flex-1 overflow-y-auto mt-6 pr-1 scrollbar-thin">
                <div className="flex flex-col gap-1">
                    {filteredNavItems.map((item) => (
                        <NavLink key={item.href} item={item} />
                    ))}
                </div>
            </nav>

            {/* Settings + Logout - Fixed at bottom */}
            <div className="flex flex-col gap-1 pt-2 border-t border-[var(--glass-border)]">


                {/* Logout Button */}
                <button
                    onClick={handleLogout}
                    className="flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-white/10 transition-all duration-200 hover:text-red-400 group"
                    style={{ color: 'var(--sidebar-text)' }}
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z" />
                    </svg>
                    <p className="text-sm font-medium leading-normal">Log Out</p>
                </button>
            </div>
        </aside>
    );
}
