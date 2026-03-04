"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Briefcase, ChevronRight, Search } from "lucide-react";

// Status configuration matching the main Projects page
const STATUS_CONFIG = {
    active: { label: "Active", bgClass: "bg-emerald-500/10", textClass: "text-emerald-600 dark:text-emerald-400", borderClass: "border-emerald-500/20", dotClass: "bg-emerald-500", animate: true },
    review: { label: "In Review", bgClass: "bg-amber-500/10", textClass: "text-amber-600 dark:text-amber-400", borderClass: "border-amber-500/20", dotClass: "bg-amber-500", animate: false },
    planning: { label: "Planning", bgClass: "bg-blue-500/10", textClass: "text-blue-600 dark:text-blue-400", borderClass: "border-blue-500/20", dotClass: "bg-blue-500", animate: false },
    completed: { label: "Completed", bgClass: "bg-gray-500/10", textClass: "text-gray-600 dark:text-gray-400", borderClass: "border-gray-500/20", dotClass: "bg-gray-500", animate: false },
    onhold: { label: "On Hold", bgClass: "bg-rose-500/10", textClass: "text-rose-600 dark:text-rose-400", borderClass: "border-rose-500/20", dotClass: "bg-rose-500", animate: false },
};

type ProjectRole = "pm" | "member" | "helper";

interface UserHistoryProject {
    id: string;
    name: string;
    status: keyof typeof STATUS_CONFIG;
    category: string;
    role: ProjectRole;
    startDate: string;
    dueDate: string;
}

export default function AssignmentHistoryPage() {
    const supabase = createClient();
    const [userId, setUserId] = useState<string | null>(null);
    const [historyData, setHistoryData] = useState<UserHistoryProject[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");

    const [stats, setStats] = useState({
        totalProjects: 0,
        totalProposals: 0,
        asPM: 0,
        asMember: 0,
        asHelper: 0,
        totalActive: 0
    });

    useEffect(() => {
        const fetchHistory = async () => {
            try {
                setIsLoading(true);
                // Get current user
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) return;
                setUserId(user.id);

                // Fetch projects where user is lead
                const { data: leadProjects, error: leadError } = await supabase
                    .from('projects')
                    .select('id, name, status, category, start_date, due_date')
                    .eq('lead_id', user.id)
                    .eq('is_archived', false);

                if (leadError) throw leadError;

                // Fetch projects where user is member
                const { data: memberData, error: memberError } = await supabase
                    .from('project_members')
                    .select(`
                        project:projects(id, name, status, category, start_date, due_date)
                    `)
                    .eq('profile_id', user.id);

                if (memberError) throw memberError;

                // Fetch projects where user is helper
                const { data: helperData, error: helperError } = await supabase
                    .from('project_helpers')
                    .select(`
                        project:projects(id, name, status, category, start_date, due_date)
                    `)
                    .eq('profile_id', user.id);

                if (helperError) throw helperError;

                // Process and combine data
                const combinedMap = new Map<string, UserHistoryProject>();

                // Add Leads (Highest priority)
                leadProjects?.forEach((p: any) => {
                    combinedMap.set(p.id, {
                        id: p.id,
                        name: p.name,
                        status: p.status as keyof typeof STATUS_CONFIG,
                        category: p.category,
                        role: "pm",
                        startDate: p.start_date,
                        dueDate: p.due_date
                    });
                });

                // Add Members (If not already lead)
                memberData?.forEach((m: any) => {
                    const p = m.project as any;
                    if (p && !combinedMap.has(p.id)) {
                        combinedMap.set(p.id, {
                            id: p.id,
                            name: p.name,
                            status: p.status as keyof typeof STATUS_CONFIG,
                            category: p.category,
                            role: "member",
                            startDate: p.start_date,
                            dueDate: p.due_date
                        });
                    }
                });

                // Add Helpers (If not already lead or member)
                helperData?.forEach((h: any) => {
                    const p = h.project as any;
                    if (p && !combinedMap.has(p.id)) {
                        combinedMap.set(p.id, {
                            id: p.id,
                            name: p.name,
                            status: p.status as keyof typeof STATUS_CONFIG,
                            category: p.category,
                            role: "helper",
                            startDate: p.start_date,
                            dueDate: p.due_date
                        });
                    }
                });

                const finalData = Array.from(combinedMap.values()).sort((a, b) => {
                    return new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime();
                });

                setHistoryData(finalData);

                // Calculate Stats
                setStats({
                    totalProjects: finalData.filter(d => d.category.toLowerCase() === 'project').length,
                    totalProposals: finalData.filter(d => d.category.toLowerCase() === 'proposal').length,
                    asPM: finalData.filter(d => d.role === 'pm').length,
                    asMember: finalData.filter(d => d.role === 'member').length,
                    asHelper: finalData.filter(d => d.role === 'helper').length,
                    totalActive: finalData.filter(d => d.status === 'active').length
                });

            } catch (err) {
                console.error("Error fetching assignment history:", err);
            } finally {
                setIsLoading(false);
            }
        };

        fetchHistory();
    }, [supabase]);

    const filteredData = historyData.filter(item =>
        item.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const getRoleStying = (role: string) => {
        switch (role) {
            case "pm": return "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30";
            case "member": return "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30";
            case "helper": return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30";
            default: return "bg-gray-500/10 text-gray-500 border-gray-500/30";
        }
    };

    const getRoleLabel = (role: string) => {
        switch (role) {
            case "pm": return "Project Manager";
            case "member": return "Team Member";
            case "helper": return "Helper";
            default: return role;
        }
    };

    return (
        <div className="flex flex-col">
            {/* Page Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
                        <Briefcase className="h-6 w-6 text-white" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2 mb-1 text-sm text-[var(--text-secondary)]">
                            <Link href="/dashboard" className="hover:text-[var(--text-primary)] transition-colors">Dashboard</Link>
                            <ChevronRight className="h-4 w-4" />
                            <span>Assignment History</span>
                        </div>
                        <h2 className="text-2xl font-bold text-[var(--text-primary)]">Assignment History</h2>
                        <p className="text-sm text-[var(--text-secondary)]">Your complete history and contribution across projects and proposals.</p>
                    </div>
                </div>
            </div>

            {/* Quick Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-8">
                <div className="rounded-xl border border-[var(--glass-border)] bg-[var(--card-bg)] p-4 flex flex-col justify-center shadow-sm relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                        <Briefcase className="w-12 h-12" />
                    </div>
                    <span className="text-xs text-[var(--text-secondary)] font-bold uppercase tracking-wider mb-1">Projects</span>
                    <span className="text-2xl font-black text-[var(--text-primary)]">{stats.totalProjects}</span>
                </div>
                <div className="rounded-xl border border-[var(--glass-border)] bg-[var(--card-bg)] p-4 flex flex-col justify-center shadow-sm relative overflow-hidden group">
                    <span className="text-xs text-[var(--text-secondary)] font-bold uppercase tracking-wider mb-1">Proposals</span>
                    <span className="text-2xl font-black text-[var(--text-primary)]">{stats.totalProposals}</span>
                </div>
                <div className="rounded-xl border border-[var(--glass-border)] bg-[var(--card-bg)] p-4 flex flex-col justify-center shadow-sm relative overflow-hidden group">
                    <span className="text-xs text-[var(--text-secondary)] font-bold uppercase tracking-wider mb-1 px-1">Currently Active</span>
                    <span className="text-2xl font-black text-emerald-500">{stats.totalActive}</span>
                </div>
                <div className="rounded-xl border border-purple-500/20 bg-purple-500/5 p-4 flex flex-col justify-center shadow-sm">
                    <span className="text-xs text-purple-600 dark:text-purple-400 font-bold uppercase tracking-wider mb-1">As PM</span>
                    <span className="text-2xl font-black text-[var(--text-primary)]">{stats.asPM}</span>
                </div>
                <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-4 flex flex-col justify-center shadow-sm">
                    <span className="text-xs text-blue-600 dark:text-blue-400 font-bold uppercase tracking-wider mb-1">As Member</span>
                    <span className="text-2xl font-black text-[var(--text-primary)]">{stats.asMember}</span>
                </div>
                <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 flex flex-col justify-center shadow-sm">
                    <span className="text-xs text-emerald-600 dark:text-emerald-400 font-bold uppercase tracking-wider mb-1">As Helper</span>
                    <span className="text-2xl font-black text-[var(--text-primary)]">{stats.asHelper}</span>
                </div>
            </div>

            {/* List / Table View */}
            <div className="rounded-2xl border border-[var(--glass-border)] bg-[var(--card-bg)] shadow-md overflow-hidden flex flex-col">
                <div className="p-4 border-b border-[var(--glass-border)] bg-black/5 dark:bg-white/5 flex flex-col sm:flex-row justify-between gap-4">
                    <h3 className="font-bold text-[var(--text-primary)] flex items-center gap-2">
                        <Briefcase className="w-5 h-5 text-[#e8c559]" />
                        Your Assignments Directory
                    </h3>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
                        <input
                            type="text"
                            placeholder="Search assignments..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="h-10 rounded-lg border border-[var(--glass-border)] bg-[var(--card-bg)] pl-9 pr-4 text-sm text-[var(--text-primary)] focus:border-[#e8c559] focus:ring-1 focus:ring-[#e8c559] transition-all w-full sm:w-64"
                        />
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left min-w-[800px]">
                        <thead>
                            <tr className="border-b border-[var(--glass-border)] bg-black/5 dark:bg-black/20 text-xs uppercase tracking-wider text-[var(--text-secondary)]">
                                <th className="p-4 font-bold">Assignment Name</th>
                                <th className="p-4 font-bold">Category</th>
                                <th className="p-4 font-bold">Role</th>
                                <th className="p-4 font-bold">Status</th>
                                <th className="p-4 font-bold">Timeline</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[var(--glass-border)]">
                            {isLoading ? (
                                <tr>
                                    <td colSpan={5} className="p-8 text-center text-[var(--text-muted)]">
                                        <div className="animate-pulse flex items-center justify-center gap-2">
                                            <div className="h-4 w-4 rounded-full bg-[#e8c559] animate-bounce" />
                                            Loading history...
                                        </div>
                                    </td>
                                </tr>
                            ) : filteredData.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="p-8 text-center text-[var(--text-muted)]">
                                        No assignments found.
                                    </td>
                                </tr>
                            ) : (
                                filteredData.map(item => {
                                    const statusConfig = STATUS_CONFIG[item.status] || STATUS_CONFIG.planning;
                                    return (
                                        <tr key={item.id} className="hover:bg-black/5 dark:hover:bg-white/5 transition-colors group">
                                            <td className="p-4">
                                                <div className="font-bold text-[var(--text-primary)]">{item.name}</div>
                                            </td>
                                            <td className="p-4">
                                                <span className="inline-flex px-2.5 py-1 text-xs font-bold bg-gray-500/10 text-gray-500 border border-gray-500/20 rounded-md uppercase tracking-wider">
                                                    {item.category}
                                                </span>
                                            </td>
                                            <td className="p-4">
                                                <span className={`inline-flex px-2.5 py-1 rounded-md text-xs font-bold border ${getRoleStying(item.role)}`}>
                                                    {getRoleLabel(item.role)}
                                                </span>
                                            </td>
                                            <td className="p-4">
                                                <span className={`inline-flex items-center gap-1.5 rounded-full ${statusConfig.bgClass} px-2.5 py-1 text-xs font-bold ${statusConfig.textClass} border ${statusConfig.borderClass}`}>
                                                    <span className={`h-1.5 w-1.5 rounded-full ${statusConfig.dotClass}`} />
                                                    {statusConfig.label}
                                                </span>
                                            </td>
                                            <td className="p-4 text-sm text-[var(--text-secondary)] whitespace-nowrap">
                                                <div>
                                                    <span className="font-medium">Start:</span> {item.startDate ? new Date(item.startDate).toLocaleDateString('id-ID') : '-'}
                                                </div>
                                                <div>
                                                    <span className="font-medium">Due:</span> {item.dueDate ? new Date(item.dueDate).toLocaleDateString('id-ID') : '-'}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
