"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
    Search,
    Megaphone,
    CalendarDays,
    ChevronRight,
    Filter,
    Loader2,
    Clock,
    User
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { announcementService } from "@/services/announcement";
import { Announcement } from "@/types/announcement";
import { ANNOUNCEMENT_CATEGORIES } from "@/lib/constants";

export default function AnnouncementsPage() {
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedCategory, setSelectedCategory] = useState("All");
    const [announcements, setAnnouncements] = useState<Announcement[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadData = async () => {
            try {
                const data = await announcementService.fetchArchive();
                setAnnouncements(data);
            } catch (error) {
                console.error("Failed to load announcements", error);
            } finally {
                setLoading(false);
            }
        };
        loadData();
    }, []);

    const filteredAnnouncements = announcements.filter(item => {
        const matchesSearch =
            item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            item.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (item.author?.full_name || "").toLowerCase().includes(searchQuery.toLowerCase());

        const matchesCategory = selectedCategory === "All" || item.category === selectedCategory;

        return matchesSearch && matchesCategory;
    });

    return (
        <div className="flex flex-col gap-8 p-6 md:p-8 max-w-7xl mx-auto w-full pb-20">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-blue-500/20">
                        <Megaphone className="h-6 w-6 text-white" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2 mb-1 text-sm text-muted-foreground">
                            <Link href="/dashboard" className="hover:text-primary transition-colors">Dashboard</Link>
                            <ChevronRight className="h-4 w-4" />
                            <span>Announcements</span>
                        </div>
                        <h1 className="text-2xl font-bold text-foreground">Company News</h1>
                        <p className="text-sm text-muted-foreground">Latest updates, policies, and events from the team.</p>
                    </div>
                </div>
            </div>

            {/* Controls Section */}
            <div className="flex flex-col space-y-4">
                {/* Search and Filter Bar */}
                <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
                    {/* Category Tabs */}
                    <div className="flex flex-wrap gap-2 w-full md:w-auto">
                        <Button
                            variant={selectedCategory === "All" ? "default" : "outline"}
                            size="sm"
                            onClick={() => setSelectedCategory("All")}
                            className="rounded-full"
                        >
                            All
                        </Button>
                        {ANNOUNCEMENT_CATEGORIES.map(cat => (
                            <Button
                                key={cat.id}
                                variant={selectedCategory === cat.id ? "default" : "outline"}
                                size="sm"
                                onClick={() => setSelectedCategory(cat.id)}
                                className={`rounded-full ${selectedCategory === cat.id ? cat.bg + " " + cat.color + " border-transparent hover:" + cat.bg : ""}`}
                            >
                                {cat.label}
                            </Button>
                        ))}
                    </div>

                    {/* Search Input */}
                    <div className="relative w-full md:w-72">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <input
                            type="text"
                            placeholder="Search news..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full h-10 pl-9 pr-4 rounded-full border border-input bg-background/50 backdrop-blur-sm text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                        />
                    </div>
                </div>
            </div>

            {/* Announcements Grid */}
            <div className="grid gap-4">
                {loading ? (
                    <div className="flex justify-center py-20">
                        <Loader2 className="w-10 h-10 animate-spin text-primary/50" />
                    </div>
                ) : filteredAnnouncements.length > 0 ? (
                    filteredAnnouncements.map((announcement) => {
                        const catParams = ANNOUNCEMENT_CATEGORIES.find(c => c.id === announcement.category) || ANNOUNCEMENT_CATEGORIES[0];
                        const CatIcon = catParams.icon;

                        return (
                            <Card key={announcement.id} className="hover:shadow-md transition-all border-l-4 border-l-primary/50 group overflow-hidden">
                                <CardContent className="p-6">
                                    <div className="flex flex-col md:flex-row gap-6 items-start">
                                        {/* Avatar / Icon */}
                                        <div className="hidden md:flex w-12 h-12 rounded-xl bg-secondary/50 items-center justify-center shrink-0 font-bold text-lg text-primary">
                                            {announcement.author?.full_name ? announcement.author.full_name[0].toUpperCase() : "A"}
                                        </div>

                                        <div className="flex-1 space-y-3 w-full">
                                            {/* Header Row */}
                                            <div className="flex flex-wrap items-center justify-between gap-y-2">
                                                <div className="flex items-center gap-2">
                                                    <Badge variant="outline" className={`${catParams.bg} ${catParams.color} ${catParams.border} gap-1.5 py-1 px-2.5`}>
                                                        <CatIcon className="w-3.5 h-3.5" />
                                                        {announcement.category || "General"}
                                                    </Badge>
                                                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                                                        <Clock className="w-3.5 h-3.5" />
                                                        {new Date(announcement.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                                    </span>
                                                </div>

                                                {announcement.audience_type === 'broadcast' && (
                                                    <Badge variant="secondary" className="text-[10px] font-mono tracking-wider opacity-70">
                                                        BROADCAST
                                                    </Badge>
                                                )}
                                            </div>

                                            {/* Content */}
                                            <div>
                                                <h3 className="text-xl font-bold text-foreground mb-2 group-hover:text-primary transition-colors">
                                                    {announcement.title}
                                                </h3>
                                                <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap">
                                                    {announcement.content}
                                                </p>
                                            </div>

                                            {/* Footer */}
                                            <div className="pt-3 border-t border-border/50 flex items-center gap-2 text-xs text-muted-foreground">
                                                <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary">
                                                    {announcement.author?.full_name ? announcement.author.full_name[0] : "A"}
                                                </div>
                                                <span>
                                                    Posted by <span className="font-semibold text-foreground">{announcement.author?.full_name || "Admin"}</span>
                                                </span>
                                                <span className="mx-1">•</span>
                                                <span className="opacity-70">{announcement.author?.role || "Management"}</span>
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })
                ) : (
                    <div className="text-center py-20 bg-muted/20 rounded-2xl border border-dashed border-muted">
                        <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4 opacity-50">
                            <Search className="w-8 h-8 text-muted-foreground" />
                        </div>
                        <h3 className="text-lg font-bold text-foreground">No announcements found</h3>
                        <p className="text-muted-foreground">Try adjusting your filters or search query.</p>
                        <Button
                            variant="link"
                            className="mt-2 text-primary"
                            onClick={() => { setSearchQuery(""); setSelectedCategory("All"); }}
                        >
                            Clear all filters
                        </Button>
                    </div>
                )}
            </div>
        </div>
    );
}
