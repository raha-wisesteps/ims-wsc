"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { mockTalents, RATING_CONFIG, TalentRating } from "./data";

export default function TalentPoolPage() {
    const router = useRouter();
    const [searchQuery, setSearchQuery] = useState("");
    const [filterRating, setFilterRating] = useState<"all" | TalentRating>("all");
    const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

    const filteredTalents = mockTalents.filter((talent) => {
        const matchesSearch = talent.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            talent.role.toLowerCase().includes(searchQuery.toLowerCase()) ||
            talent.expertise.some(e => e.toLowerCase().includes(searchQuery.toLowerCase()));
        const matchesFilter = filterRating === "all" || talent.rating === filterRating;
        return matchesSearch && matchesFilter;
    });

    const handleTalentClick = (id: string) => {
        router.push(`/dashboard/talent-pool/${id}`);
    };

    // Stats
    const totalTalents = mockTalents.length;
    const recommendedTalents = mockTalents.filter(c => c.rating === "recommended").length;
    const potentialTalents = mockTalents.filter(c => c.rating === "potential").length;

    return (
        <div className="flex flex-col gap-8 pb-10">
            {/* Page Header */}
            <header className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#3f545f] to-[#5f788e] dark:from-blue-500 dark:to-cyan-500 flex items-center justify-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z" />
                        </svg>
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-[var(--text-primary)]">Talent Pool</h1>
                        <p className="text-sm text-[var(--text-secondary)]">Directory of consultants, history, and performance ratings</p>
                    </div>
                </div>
                <button
                    className="group relative flex items-center justify-center gap-2 rounded-xl bg-blue-500 px-6 py-3 text-sm font-bold text-white shadow-[0_0_20px_rgba(59,130,246,0.3)] transition-all hover:bg-blue-600 hover:shadow-[0_0_30px_rgba(59,130,246,0.5)] active:scale-95"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />
                    </svg>
                    Add Talent
                </button>
            </header>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="glass-panel p-5 rounded-2xl border border-border bg-card shadow-sm">
                    <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Total Talents</p>
                    <p className="text-2xl font-bold text-foreground">{totalTalents}</p>
                </div>
                <div className="glass-panel p-5 rounded-2xl border border-border bg-card shadow-sm">
                    <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Highly Recommended</p>
                    <p className="text-2xl font-bold text-emerald-500">{recommendedTalents}</p>
                </div>
                <div className="glass-panel p-5 rounded-2xl border border-border bg-card shadow-sm">
                    <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Potential Candidates</p>
                    <p className="text-2xl font-bold text-blue-500">{potentialTalents}</p>
                </div>
            </div>

            {/* Controls */}
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                {/* Search & Filter */}
                <div className="flex flex-1 items-center gap-3 w-full">
                    <div className="relative flex-1 min-w-[200px]">
                        <svg xmlns="http://www.w3.org/2000/svg" className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" />
                        </svg>
                        <input
                            type="text"
                            placeholder="Search by name, role, or skill..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="h-11 w-full rounded-xl border border-border bg-card/50 pl-10 pr-4 text-sm focus:ring-2 focus:ring-blue-500/50 outline-none transition-all"
                        />
                    </div>
                    <div className="flex items-center gap-1 bg-card/50 border border-border rounded-xl p-1">
                        {(["all", "recommended", "potential", "avoid"] as const).map((rating) => (
                            <button
                                key={rating}
                                onClick={() => setFilterRating(rating)}
                                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all capitalize ${filterRating === rating
                                    ? "bg-blue-500 text-white shadow-sm"
                                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                                    }`}
                            >
                                {rating === "all" ? "All" : rating.replace("avoid", "Avoid")}
                            </button>
                        ))}
                    </div>
                </div>

                {/* View Toggle */}
                <div className="flex items-center gap-1 bg-card/50 border border-border rounded-xl p-1 shrink-0">
                    <button
                        onClick={() => setViewMode("grid")}
                        className={`p-2 rounded-lg transition-all ${viewMode === "grid" ? "bg-muted text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                            }`}
                        title="Grid View"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M4 11h5V5H4v6zm0 7h5v-6H4v6zm6 0h5v-6h-5v6zm6 0h5v-6h-5v6zm-6-7h5V5h-5v6zm6-6v6h5V5h-5z" />
                        </svg>
                    </button>
                    <button
                        onClick={() => setViewMode("list")}
                        className={`p-2 rounded-lg transition-all ${viewMode === "list" ? "bg-muted text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                            }`}
                        title="List View"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M3 13h2v-2H3v2zm0 4h2v-2H3v2zm0-8h2V7H3v2zm4 4h14v-2H7v2zm0 4h14v-2H7v2zM7 7v2h14V7H7z" />
                        </svg>
                    </button>
                </div>
            </div>

            {/* Content */}
            {viewMode === "list" ? (
                <div className="glass-panel rounded-2xl overflow-hidden border border-border bg-card shadow-sm">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-muted/50 border-b border-white/5">
                                <tr className="text-xs text-muted-foreground uppercase tracking-wider">
                                    <th className="p-4 font-semibold">Talent</th>
                                    <th className="p-4 font-semibold">Role & Expertise</th>
                                    <th className="p-4 font-semibold">Rating</th>
                                    <th className="p-4 font-semibold">Previous Projects</th>
                                    <th className="p-4 font-semibold">Notes</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {filteredTalents.map((talent) => (
                                    <tr
                                        key={talent.id}
                                        className="hover:bg-muted/50 transition-colors cursor-pointer group"
                                        onClick={() => handleTalentClick(talent.id)}
                                    >
                                        <td className="p-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-blue-500/20 text-blue-500 flex items-center justify-center text-xs font-bold">
                                                    {talent.avatarInitials}
                                                </div>
                                                <div>
                                                    <div className="font-bold text-foreground group-hover:text-blue-500 transition-colors">{talent.name}</div>
                                                    <div className="text-xs text-muted-foreground">{talent.email}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <div className="text-sm font-medium text-foreground">{talent.role}</div>
                                            <div className="flex flex-wrap gap-1 mt-1">
                                                {talent.expertise.map((skill, i) => (
                                                    <span key={i} className="text-[10px] bg-white/10 px-1.5 py-0.5 rounded text-muted-foreground">
                                                        {skill}
                                                    </span>
                                                ))}
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold border ${RATING_CONFIG[talent.rating].bgClass} ${RATING_CONFIG[talent.rating].textClass} ${RATING_CONFIG[talent.rating].borderClass}`}>
                                                {RATING_CONFIG[talent.rating].label}
                                            </span>
                                        </td>
                                        <td className="p-4 text-xs text-muted-foreground max-w-xs">
                                            {talent.projects.join(", ")}
                                        </td>
                                        <td className="p-4 text-xs italic text-muted-foreground max-w-xs">
                                            "{talent.notes}"
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredTalents.map((talent) => (
                        <div
                            key={talent.id}
                            onClick={() => handleTalentClick(talent.id)}
                            className="group relative bg-card hover:bg-muted/30 border border-border hover:border-blue-500/50 rounded-2xl p-6 transition-all cursor-pointer shadow-sm hover:shadow-lg hover:-translate-y-1 block"
                        >
                            <div className="flex justify-between items-start mb-4">
                                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border border-blue-500/30 flex items-center justify-center text-xl font-bold text-foreground group-hover:text-blue-500 transition-colors">
                                    {talent.avatarInitials}
                                </div>
                                <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold border ${RATING_CONFIG[talent.rating].bgClass} ${RATING_CONFIG[talent.rating].textClass} ${RATING_CONFIG[talent.rating].borderClass}`}>
                                    {RATING_CONFIG[talent.rating].label}
                                </span>
                            </div>

                            <h3 className="text-lg font-bold text-foreground mb-1 group-hover:text-blue-500 transition-colors line-clamp-1">{talent.name}</h3>
                            <p className="text-sm text-muted-foreground mb-4 font-medium">{talent.role}</p>

                            <div className="space-y-4">
                                {/* Skills */}
                                <div className="flex flex-wrap gap-1.5">
                                    {talent.expertise.slice(0, 3).map((skill, i) => (
                                        <span key={i} className="text-xs px-2 py-1 rounded-md bg-muted/50 text-muted-foreground border border-border">
                                            {skill}
                                        </span>
                                    ))}
                                    {talent.expertise.length > 3 && (
                                        <span className="text-xs px-2 py-1 rounded-md bg-muted/50 text-muted-foreground border border-border">
                                            +{talent.expertise.length - 3}
                                        </span>
                                    )}
                                </div>

                                {/* Contact Info */}
                                <div className="flex items-center gap-3 text-sm p-3 rounded-lg bg-black/5 dark:bg-white/5 border border-transparent group-hover:border-blue-500/20 transition-all">
                                    <span className="text-lg">📧</span>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-medium text-foreground truncate">{talent.email}</p>
                                        <p className="text-xs text-muted-foreground truncate">{talent.projects.length} Projects Completed</p>
                                    </div>
                                </div>

                                {/* Notes Preview */}
                                <div className="text-xs text-muted-foreground italic border-t border-border pt-3 mt-2 line-clamp-2">
                                    "{talent.notes}"
                                </div>
                            </div>

                            <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                                <div className="p-2 rounded-full bg-blue-500 text-white">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M5 12h14"></path>
                                        <path d="M12 5l7 7-7 7"></path>
                                    </svg>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
