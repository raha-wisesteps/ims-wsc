"use client";

import React, { memo } from "react";
import Link from "next/link";
import { Megaphone, ChevronRight } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Announcement } from "@/types/announcement";

interface CompanyNewsCardProps {
    announcements: Announcement[];
}

const CompanyNewsCard = memo(function CompanyNewsCard({ announcements }: CompanyNewsCardProps) {
    return (
        <Card className="rounded-3xl flex flex-col h-[440px] xl:h-[600px] overflow-hidden bg-card border-border backdrop-blur-md shadow-xl">
            <CardHeader className="p-5 border-b border-border flex flex-row items-center justify-between sticky top-0 bg-inherit backdrop-blur-xl z-20 space-y-0">
                <div>
                    <CardTitle className="text-lg font-bold flex items-center gap-2">
                        Company News
                        <Badge variant="secondary" className="text-xs font-normal px-2 py-0.5 rounded-full bg-primary/10 text-primary hover:bg-primary/20">
                            Latest
                        </Badge>
                    </CardTitle>
                    <CardDescription className="text-xs mt-0.5">Official updates from Management</CardDescription>
                </div>
                <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-primary ring-4 ring-primary/5">
                    <Megaphone className="h-4 w-4" />
                </div>
            </CardHeader>

            <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                {announcements.length === 0 ? (
                    <div className="text-center py-10 text-muted-foreground">
                        <p className="text-sm">No new announcements</p>
                    </div>
                ) : (
                    announcements.slice(0, 5).map((announcement) => (
                        <div key={announcement.id} className="group flex gap-3 p-3 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 transition-colors border border-transparent hover:border-border/50">
                            <div className="w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold shrink-0 shadow-sm bg-[var(--primary)] text-[var(--primary-foreground)]">
                                {announcement.author?.full_name ? announcement.author.full_name[0].toUpperCase() : "A"}
                            </div>

                            <div className="flex-1 min-w-0 space-y-1">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <h4 className="text-sm font-bold text-[var(--text-primary)] group-hover:text-primary transition-colors">{announcement.title}</h4>
                                        <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wide">{announcement.author?.role || "Management"}</p>
                                    </div>
                                    <span className="text-[10px] text-[var(--text-muted)] font-mono whitespace-nowrap ml-2 bg-secondary/50 px-1.5 py-0.5 rounded">
                                        {new Date(announcement.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                                    </span>
                                </div>
                                <p className="text-xs text-[var(--text-secondary)] leading-relaxed line-clamp-2 group-hover:line-clamp-none transition-all">
                                    {announcement.content}
                                </p>
                            </div>
                        </div>
                    ))
                )}
            </div>

            <div className="p-3 border-t border-[var(--glass-border)] bg-black/5 dark:bg-white/5 backdrop-blur-sm">
                <Link href="/dashboard/announcements" className="flex items-center justify-center gap-2 text-xs font-bold text-muted-foreground hover:text-primary transition-colors py-1.5">
                    View Announcement Archive
                    <ChevronRight className="h-3 w-3" />
                </Link>
            </div>
        </Card>
    );
});

export default CompanyNewsCard;
