"use client";

import { useState } from "react";
import Link from "next/link";
import { Search, Megaphone, CalendarDays, ArrowLeft } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

// Mock Data for Announcements Archive
const mockAnnouncements = [
    { id: 1, title: "Q3 Townhall Meeting", date: "Today, 14:00", text: "Join us for the quarterly update. Link in calendar.", author: "Admin", role: "Management", initial: "A", category: "Meeting" },
    { id: 2, title: "New WFH Policy", date: "Yesterday", text: "Please review the updated remote work guidelines in the portal. Effectively immediately, all WFH requests require H-1 approval.", author: "HR", role: "Human Resources", initial: "HR", category: "Policy" },
    { id: 3, title: "Office Maintenance", date: "Oct 24, 2025", text: "AC maintenance scheduled for this weekend. Please secure your belongings and clear your desks.", author: "GA", role: "General Affair", initial: "GA", category: "Maintenance" },
    { id: 4, title: "Welcome New Hires", date: "Oct 20, 2025", text: "Say hello to our 5 new team members joining the Tech and Marketing teams! Let's give them a warm welcome.", author: "HR", role: "Human Resources", initial: "HR", category: "General" },
    { id: 5, title: "Project Alpha Launch", date: "Oct 15, 2025", text: "Successfully launched Project Alpha! Kudos to the development team for their hard work.", author: "PM", role: "Project Management", initial: "PM", category: "Milestone" },
    { id: 6, title: "Health & Safety Workshop", date: "Oct 10, 2025", text: "Mandatory workshop for all employees on Friday at 1 PM.", author: "HR", role: "Human Resources", initial: "HR", category: "Training" },
];

export default function AnnouncementsPage() {
    const [searchQuery, setSearchQuery] = useState("");

    const filteredAnnouncements = mockAnnouncements.filter(item =>
        item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.text.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.role.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="flex flex-col gap-6 p-6 md:p-8 max-w-7xl mx-auto w-full">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <div className="flex items-center gap-2 text-muted-foreground mb-1">
                        <Link href="/dashboard" className="hover:text-primary transition-colors flex items-center gap-1">
                            <ArrowLeft className="w-4 h-4" /> Back to Dashboard
                        </Link>
                    </div>
                    <h1 className="text-3xl font-black tracking-tight text-foreground flex items-center gap-3">
                        <Megaphone className="w-8 h-8 text-primary" />
                        Announcements Archive
                    </h1>
                    <p className="text-muted-foreground mt-1">
                        View past and present company updates, news, and official communications.
                    </p>
                </div>

                {/* Search Bar */}
                <div className="relative w-full md:w-72">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                        type="text"
                        placeholder="Search announcements..."
                        value={searchQuery}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
                        className="w-full h-10 pl-9 pr-4 rounded-lg border border-border bg-card text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                    />
                </div>
            </div>

            {/* Announcements List */}
            <div className="grid gap-4">
                {filteredAnnouncements.length > 0 ? (
                    filteredAnnouncements.map((announcement) => (
                        <Card key={announcement.id} className="hover:shadow-md transition-shadow border-l-4 border-l-primary/50">
                            <CardContent className="p-5 flex flex-col md:flex-row gap-5 items-start">
                                {/* Auto-generated Avatar */}
                                <div className={`w-12 h-12 rounded-full flex items-center justify-center text-sm font-bold shrink-0 shadow-sm ${announcement.author === 'Admin' ? 'bg-gradient-to-br from-amber-400 to-amber-600 text-white' :
                                    announcement.role === 'Human Resources' ? 'bg-gradient-to-br from-pink-500 to-rose-600 text-white' :
                                        'bg-gradient-to-br from-slate-600 to-slate-800 text-white'
                                    }`}>
                                    {announcement.initial}
                                </div>

                                <div className="flex-1 space-y-2 w-full">
                                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
                                        <div className="flex items-center gap-3 flex-wrap">
                                            <h3 className="text-lg font-bold text-foreground hover:text-primary cursor-pointer transition-colors">
                                                {announcement.title}
                                            </h3>
                                            <Badge variant="outline" className="text-[10px] uppercase tracking-wider">
                                                {announcement.category}
                                            </Badge>
                                        </div>
                                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                            <CalendarDays className="w-3 h-3" />
                                            <span>{announcement.date}</span>
                                        </div>
                                    </div>

                                    <div className="flex flex-col gap-1">
                                        <div className="text-xs font-semibold text-primary/80">
                                            {announcement.role} <span className="text-muted-foreground font-normal">• Posted by {announcement.author}</span>
                                        </div>
                                        <p className="text-sm text-muted-foreground leading-relaxed">
                                            {announcement.text}
                                        </p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))
                ) : (
                    <div className="text-center py-12 text-muted-foreground bg-muted/20 rounded-xl border border-dashed border-muted">
                        <Megaphone className="w-12 h-12 mx-auto mb-4 opacity-20" />
                        <p className="text-lg font-medium">No announcements found</p>
                        <p className="text-sm">Try adjusting your search terms</p>
                    </div>
                )}
            </div>
        </div>
    );
}
