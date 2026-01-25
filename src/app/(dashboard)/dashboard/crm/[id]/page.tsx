"use client";

import React, { useState, use } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import Link from "next/link";

// --- Types ---

type TimelineEvent = {
    id: string;
    date: string;
    title: string;
    description: string;
    type: "milestone" | "interaction" | "system";
    icon: string;
};

type Meeting = {
    id: string;
    date: string;
    time: string;
    type: "Online" | "Offline";
    title: string;
    attendees: string[];
    summary: string;
    outcome: "Positive" | "Neutral" | "Negative" | "Pending";
};

type Note = {
    id: string;
    author: string;
    role: string;
    date: string;
    content: string;
    type: "internal" | "update";
};

type ClientData = {
    id: string;
    name: string;
    industry: string;
    status: "Lead" | "Prospect" | "Hot" | "Deal" | "Lost";
    contact: {
        name: string;
        role: string;
        email: string;
        phone: string;
    };
    stats: {
        totalPotency: string;
        lastContact: string;
        engagementScore: number; // 0-100
    };
    timeline: TimelineEvent[];
    meetings: Meeting[];
    notes: Note[];
};

// --- Mock Data ---

const MOCK_CLIENT: ClientData = {
    id: "1",
    name: "PT Maju Jaya",
    industry: "Manufacturing",
    status: "Hot",
    contact: {
        name: "Budi Santoso",
        role: "Operational Manager",
        email: "budi.s@majujaya.com",
        phone: "+62 812 3456 7890",
    },
    stats: {
        totalPotency: "IDR 150.000.000",
        lastContact: "2 Days ago",
        engagementScore: 85,
    },
    timeline: [
        { id: "t1", date: "2024-01-10", title: "Project Deal Signed", description: "Contract signed for HRIS implementation.", type: "milestone", icon: "✍️" },
        { id: "t2", date: "2023-12-28", title: "Negotiation Phase", description: "Discussing final pricing and modular options.", type: "interaction", icon: "🤝" },
        { id: "t3", date: "2023-12-15", title: "Proposal Sent", description: "Sent comprehensive proposal v1.2 via email.", type: "milestone", icon: "📄" },
        { id: "t4", date: "2023-12-01", title: "First Meeting", description: "Initial requirements gathering with Pak Budi.", type: "interaction", icon: "👋" },
        { id: "t5", date: "2023-11-20", title: "Introductory Call", description: "Brief call to establish interest.", type: "interaction", icon: "📞" },
    ],
    meetings: [
        { id: "m1", date: "2023-12-28", time: "14:00", type: "Offline", title: "Final Negotiation", attendees: ["Budi S.", "Rahadian", "Rega"], summary: "Agreed on 150jt price with 30% down payment.", outcome: "Positive" },
        { id: "m2", date: "2023-12-01", time: "10:00", type: "Online", title: "Requirement Gathering", attendees: ["Budi S.", "IT Team", "Rahadian"], summary: "Client needs custom attendance module.", outcome: "Neutral" },
    ],
    notes: [
        { id: "n1", author: "Rega Aldiaz", role: "BisDev", date: "2024-01-05 09:30", content: "Client requested invoice for DP. Finance team notified.", type: "update" },
        { id: "n2", author: "Rahadian M.", role: "Analyst", date: "2023-12-29 16:00", content: "Technical feasibility for custom module confirmed. No extra cost needed.", type: "internal" },
    ]
};

// --- Components ---

function StatusBadge({ status }: { status: string }) {
    const colors: Record<string, string> = {
        "Lead": "bg-blue-500/10 text-blue-500 border-blue-500/20",
        "Prospect": "bg-purple-500/10 text-purple-500 border-purple-500/20",
        "Hot": "bg-orange-500/10 text-orange-500 border-orange-500/20",
        "Deal": "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
        "Lost": "bg-rose-500/10 text-rose-500 border-rose-500/20",
    };
    return (
        <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${colors[status] || "bg-gray-500/10 text-gray-500"}`}>
            {status}
        </span>
    );
}

export default function ClientDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    // In a real app, fetch client by id
    const client = MOCK_CLIENT;
    const [activeTab, setActiveTab] = useState<"timeline" | "meetings" | "notes">("timeline");
    const [newNote, setNewNote] = useState("");

    return (
        <div className="p-6 max-w-[1600px] mx-auto min-h-screen pb-20 space-y-6">
            {/* Back Button */}
            <div className="flex items-center">
                <Link
                    href="/dashboard/crm"
                    className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors px-3 py-2 rounded-lg hover:bg-white/5"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="19" y1="12" x2="5" y2="12"></line>
                        <polyline points="12 19 5 12 12 5"></polyline>
                    </svg>
                    <span className="font-medium">Back to Database</span>
                </Link>
            </div>

            {/* Header / Profile Card */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card className="lg:col-span-1 border-amber-500/20 bg-card/50 backdrop-blur-sm">
                    <CardHeader>
                        <div className="flex justify-between items-start">
                            <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-3xl font-bold text-white shadow-lg shadow-amber-500/20">
                                {client.name.substring(0, 2).toUpperCase()}
                            </div>
                            <StatusBadge status={client.status} />
                        </div>
                        <div className="mt-4">
                            <CardTitle className="text-2xl font-bold">{client.name}</CardTitle>
                            <CardDescription className="text-base">{client.industry}</CardDescription>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="bg-secondary/30 p-4 rounded-lg space-y-3 border border-white/5">
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-full bg-secondary/50">👤</div>
                                <div>
                                    <p className="text-xs text-muted-foreground uppercase font-bold">Key Contact</p>
                                    <p className="font-medium text-sm">{client.contact.name}</p>
                                    <p className="text-xs text-muted-foreground">{client.contact.role}</p>
                                </div>
                            </div>
                            <Separator className="bg-white/10" />
                            <div className="space-y-1">
                                <p className="text-xs flex items-center gap-2 text-muted-foreground">
                                    <span>📧</span> {client.contact.email}
                                </p>
                                <p className="text-xs flex items-center gap-2 text-muted-foreground">
                                    <span>📱</span> {client.contact.phone}
                                </p>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div className="bg-secondary/20 p-3 rounded-lg border border-white/5">
                                <p className="text-[10px] text-muted-foreground uppercase font-bold text-center">Potency</p>
                                <p className="text-sm font-bold text-center text-emerald-400">{client.stats.totalPotency}</p>
                            </div>
                            <div className="bg-secondary/20 p-3 rounded-lg border border-white/5">
                                <p className="text-[10px] text-muted-foreground uppercase font-bold text-center">Engagement</p>
                                <p className="text-sm font-bold text-center text-amber-500">{client.stats.engagementScore}%</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Right Column: Interaction Hub */}
                <Card className="lg:col-span-2 border-white/5 bg-card/30">
                    <CardHeader className="pb-2">
                        <div className="flex items-center gap-4 border-b border-white/10 pb-4">
                            <button
                                onClick={() => setActiveTab("timeline")}
                                className={`text-sm font-bold px-4 py-2 rounded-lg transition-all ${activeTab === 'timeline' ? 'bg-amber-500 text-black shadow-md' : 'text-muted-foreground hover:bg-white/5'}`}
                            >
                                🗺️ Journey
                            </button>
                            <button
                                onClick={() => setActiveTab("meetings")}
                                className={`text-sm font-bold px-4 py-2 rounded-lg transition-all ${activeTab === 'meetings' ? 'bg-amber-500 text-black shadow-md' : 'text-muted-foreground hover:bg-white/5'}`}
                            >
                                📅 Meetings
                            </button>
                            <button
                                onClick={() => setActiveTab("notes")}
                                className={`text-sm font-bold px-4 py-2 rounded-lg transition-all ${activeTab === 'notes' ? 'bg-amber-500 text-black shadow-md' : 'text-muted-foreground hover:bg-white/5'}`}
                            >
                                💬 Internal Notes
                            </button>
                        </div>
                    </CardHeader>
                    <CardContent className="pt-6 min-h-[500px]">

                        {/* VIEW: TIMELINE */}
                        {activeTab === "timeline" && (
                            <div className="space-y-0 relative border-l-2 border-white/10 ml-3">
                                {client.timeline.map((event, idx) => (
                                    <div key={event.id} className="mb-8 ml-6 relative group">
                                        <div className={`absolute -left-[31px] top-0 w-8 h-8 rounded-full border-4 border-background flex items-center justify-center text-sm shadow-sm transition-transform group-hover:scale-110 ${event.type === 'milestone' ? 'bg-amber-500 text-black' : 'bg-secondary text-white'
                                            }`}>
                                            {event.icon}
                                        </div>
                                        <div className="bg-white/5 p-4 rounded-xl border border-white/5 hover:border-white/10 transition-colors">
                                            <div className="flex justify-between items-start mb-1">
                                                <h4 className={`font-bold text-sm ${event.type === 'milestone' ? 'text-amber-400' : 'text-white'}`}>
                                                    {event.title}
                                                </h4>
                                                <span className="text-xs text-muted-foreground">{event.date}</span>
                                            </div>
                                            <p className="text-xs text-white/70 leading-relaxed">{event.description}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* VIEW: MEETINGS */}
                        {activeTab === "meetings" && (
                            <div className="space-y-4">
                                {client.meetings.map(meeting => (
                                    <div key={meeting.id} className="flex gap-4 p-4 rounded-xl border border-white/5 bg-white/5 hover:bg-white/10 transition-colors">
                                        <div className="flex flex-col items-center justify-center w-16 bg-secondary/30 rounded-lg p-2 h-fit">
                                            <span className="text-xs font-bold uppercase text-muted-foreground">{meeting.date.split('-')[1]}</span> {/* Month (Mock) */}
                                            <span className="text-xl font-bold text-white">{meeting.date.split('-')[2]}</span>
                                        </div>
                                        <div className="flex-1 space-y-2">
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <h4 className="font-bold text-white text-sm">{meeting.title}</h4>
                                                    <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                                                        <span>🕒 {meeting.time}</span>
                                                        <span>•</span>
                                                        <span className={meeting.type === 'Online' ? 'text-blue-400' : 'text-amber-400'}>{meeting.type}</span>
                                                    </div>
                                                </div>
                                                <Badge variant="outline" className={
                                                    meeting.outcome === 'Positive' ? 'text-emerald-400 border-emerald-500/30' :
                                                        meeting.outcome === 'Neutral' ? 'text-blue-400 border-blue-500/30' : 'text-rose-400'
                                                }>
                                                    {meeting.outcome}
                                                </Badge>
                                            </div>
                                            <p className="text-xs text-white/70 bg-black/20 p-2 rounded border border-white/5">
                                                "{meeting.summary}"
                                            </p>
                                            <div className="flex gap-2">
                                                {meeting.attendees.map(attendee => (
                                                    <span key={attendee} className="text-[10px] px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground">
                                                        {attendee}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                <Button className="w-full bg-secondary/50 hover:bg-secondary text-xs" variant="outline">+ Log New Meeting</Button>
                            </div>
                        )}

                        {/* VIEW: NOTES */}
                        {activeTab === "notes" && (
                            <div className="flex flex-col h-full">
                                <div className="space-y-4 mb-6 flex-1 max-h-[400px] overflow-y-auto pr-2">
                                    {client.notes.map(note => (
                                        <div key={note.id} className={`flex gap-3 ${note.type === 'internal' ? '' : ''}`}>
                                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
                                                {note.author.split(' ').map(n => n[0]).join('')}
                                            </div>
                                            <div className="flex-1 space-y-1">
                                                <div className="flex items-baseline justify-between">
                                                    <span className="text-xs font-bold text-white">{note.author} <span className="text-white/40 font-normal">• {note.role}</span></span>
                                                    <span className="text-[10px] text-muted-foreground">{note.date}</span>
                                                </div>
                                                <div className="bg-secondary/40 p-3 rounded-lg rounded-tl-none border border-white/5 text-sm text-white/80">
                                                    {note.content}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <div className="mt-auto pt-4 border-t border-white/10">
                                    <p className="text-xs text-muted-foreground mb-2">Internal Team Comment</p>
                                    <div className="flex gap-2">
                                        <input
                                            value={newNote}
                                            onChange={(e) => setNewNote(e.target.value)}
                                            className="flex-1 bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-amber-500 outline-none"
                                            placeholder="Type your strategic note here..."
                                        />
                                        <Button size="icon" className="bg-amber-500 text-black hover:bg-amber-600">
                                            ➤
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        )}

                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
