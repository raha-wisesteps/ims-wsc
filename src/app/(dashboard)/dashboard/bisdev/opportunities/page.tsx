"use client";

import OpportunityBoard from "@/components/bisdev/OpportunityBoard";
import { ChevronLeft, LayoutGrid, TrendingUp } from "lucide-react";
import Link from "next/link";

export default function OpportunitiesPage() {
    return (
        <div className="flex flex-col h-[calc(100vh-80px)] overflow-hidden bg-gray-50/50 dark:bg-[#121212]">
            {/* Header */}
            <div className="flex-none p-6 pb-0">
                <div className="flex items-center gap-4 mb-6">
                    <Link
                        href="/dashboard/bisdev/crm"
                        className="p-2 rounded-xl bg-white dark:bg-[#1c2120] border border-[var(--glass-border)] hover:bg-gray-50 dark:hover:bg-white/5 transition-colors group"
                    >
                        <ChevronLeft className="h-5 w-5 text-gray-500 group-hover:text-amber-500 transition-colors" />
                    </Link>

                    <div className="flex items-center gap-4">
                        <div className="p-3 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 shadow-lg shadow-amber-400/20 text-white">
                            <TrendingUp className="h-6 w-6" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)] mb-1">
                                <Link href="/dashboard" className="hover:text-[var(--text-primary)] transition-colors">Dashboard</Link>
                                <span>&gt;</span>
                                <Link href="/dashboard/bisdev" className="hover:text-[var(--text-primary)] transition-colors">Business Development</Link>
                                <span>&gt;</span>
                                <span className="text-[var(--text-primary)] font-medium">Opportunities</span>
                            </div>
                            <h1 className="text-2xl font-bold text-[var(--text-primary)] tracking-tight">
                                Opportunity Board
                            </h1>
                            <p className="text-sm text-[var(--text-secondary)]">
                                Manage and track your sales pipeline
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex-1 overflow-hidden px-6 pb-6">
                <OpportunityBoard />
            </div>
        </div>
    );
}
