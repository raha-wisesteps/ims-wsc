"use client";

import OpportunityBoard from "@/components/bisdev/OpportunityBoard";
import { ChevronRight, TrendingUp } from "lucide-react";
import Link from "next/link";

export default function OpportunitiesPage() {
    return (
        <div className="flex flex-col h-[calc(100vh-80px)] overflow-hidden bg-gray-50/50 dark:bg-[#121212]">
            {/* Header */}
            <div className="flex-none p-6 pb-0">
                <div className="flex items-center gap-3 mb-6">
                    <div className="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center">
                        <TrendingUp className="w-6 h-6 text-amber-500" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2 mb-1 text-sm text-[var(--text-secondary)]">
                            <Link href="/dashboard" className="hover:text-[var(--text-primary)] transition-colors">Dashboard</Link>
                            <ChevronRight className="h-4 w-4" />
                            <Link href="/dashboard/bisdev" className="hover:text-[var(--text-primary)] transition-colors">Business Development</Link>
                            <ChevronRight className="h-4 w-4" />
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

            <div className="flex-1 overflow-hidden px-6 pb-6">
                <OpportunityBoard />
            </div>
        </div>
    );
}
