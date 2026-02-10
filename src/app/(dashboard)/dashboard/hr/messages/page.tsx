"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
    ChevronRight,
    Send,
    Users,
    User,
    Bell,
    Search,
    Clock,
    CheckCircle2,
    Loader2,
    Megaphone,
    AlertCircle,
    FileText,
    Calendar,
    Wrench,
    Lightbulb,
    Trash2
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { announcementService } from "@/services/announcement";
import { Announcement } from "@/types/announcement";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ANNOUNCEMENT_CATEGORIES, ANNOUNCEMENT_TEMPLATES } from "@/lib/constants";

export default function MessageCenterPage() {
    const [activeTab, setActiveTab] = useState<"compose" | "history">("compose");
    const supabase = createClient();

    // Compose State
    const [messageType, setMessageType] = useState<"broadcast" | "department" | "private">("broadcast");
    const [targetAudience, setTargetAudience] = useState("all");
    const [specificUser, setSpecificUser] = useState("");
    const [category, setCategory] = useState("General");
    const [subject, setSubject] = useState("");
    const [messageBody, setMessageBody] = useState("");
    const [isSending, setIsSending] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);

    // Data State
    const [departments, setDepartments] = useState<{ id: string; label: string }[]>([
        { id: "all", label: "All Employees (Broadcast)" }
    ]);
    const [users, setUsers] = useState<{ id: string; full_name: string; role: string; department: string }[]>([]);
    const [messageHistory, setMessageHistory] = useState<Announcement[]>([]);
    const [loadingHistory, setLoadingHistory] = useState(false);
    const [currentUser, setCurrentUser] = useState<string | null>(null);

    // Filter State for History
    const [searchQuery, setSearchQuery] = useState("");

    // Initial Data Fetch
    useEffect(() => {
        const fetchInitialData = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) setCurrentUser(user.id);

            // Fetch Profiles (Active Only)
            // RLS policies typically only return active users anyway
            const { data: profiles, error: profilesError } = await supabase
                .from('profiles')
                .select('id, full_name, role, department')
                .order('full_name');

            if (profiles) {
                // @ts-ignore - Supabase types might not include department yet
                setUsers(profiles);

                // Extract Unique Departments
                // @ts-ignore - Supabase types might not include department yet
                const uniqueDepts = Array.from(new Set(profiles.map((p: any) => p.department).filter(Boolean))).sort();
                const deptOptions = [
                    { id: "all", label: "All Employees (Broadcast)" },
                    ...uniqueDepts.map((d: any) => ({ id: d, label: d }))
                ];
                setDepartments(deptOptions);
            }

            if (profilesError) {
                console.error("Error fetching profiles:", profilesError);
            }
        };

        fetchInitialData();
    }, []);

    // Fetch History when tab changes
    useEffect(() => {
        if (activeTab === "history") {
            loadHistory();
        }
    }, [activeTab]);

    const loadHistory = async () => {
        setLoadingHistory(true);
        try {
            const data = await announcementService.fetchAnnouncements();
            setMessageHistory(data);
        } catch (error) {
            console.error("Failed to load history", error);
        } finally {
            setLoadingHistory(false);
        }
    };

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!currentUser) return;

        setIsSending(true);

        try {
            let audience_type: 'broadcast' | 'department' | 'individual' = 'broadcast';
            let target_departments: string[] | undefined = undefined;
            let target_users: string[] | undefined = undefined;

            if (messageType === 'broadcast') {
                if (targetAudience === 'all') {
                    audience_type = 'broadcast';
                } else {
                    audience_type = 'department';
                    target_departments = [targetAudience];
                }
            } else if (messageType === 'private') {
                audience_type = 'individual';
                target_users = [specificUser];
            }

            await announcementService.createAnnouncement({
                title: subject,
                content: messageBody,
                audience_type,
                target_departments,
                target_users,
                author_id: currentUser,
                category: category
            });

            setShowSuccess(true);
            setSubject("");
            setMessageBody("");
            setSpecificUser("");
            setTargetAudience("all");
            setCategory("General");

            setTimeout(() => setShowSuccess(false), 3000);
        } catch (error) {
            console.error("Failed to send message", error);
            alert("Failed to send message. Please try again.");
        } finally {
            setIsSending(false);
        }
    };

    const applyTemplate = (template: typeof ANNOUNCEMENT_TEMPLATES[0]) => {
        setSubject(template.subject);
        setMessageBody(template.body);
        setCategory(template.category);
        if (activeTab !== "compose") setActiveTab("compose");
    };

    const filteredHistory = messageHistory.filter(msg =>
        msg.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        msg.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (msg.author?.full_name || "").toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="flex flex-col space-y-8 pb-20">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center shadow-lg shadow-purple-500/20">
                        <Send className="h-6 w-6 text-white" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2 mb-1 text-sm text-[var(--text-secondary)]">
                            <Link href="/dashboard" className="hover:text-[var(--text-primary)] transition-colors">Dashboard</Link>
                            <ChevronRight className="h-4 w-4" />
                            <Link href="/dashboard/hr" className="hover:text-[var(--text-primary)] transition-colors">Human Resource</Link>
                            <ChevronRight className="h-4 w-4" />
                            <span>Message Center</span>
                        </div>
                        <h2 className="text-2xl font-bold text-[var(--text-primary)]">Message Center</h2>
                        <p className="text-sm text-[var(--text-secondary)]">Send broadcasts, announcements, and private messages to your team.</p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Panel: Compose or Menu */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Tabs */}
                    <div className="flex p-1 bg-[var(--card-bg)] rounded-xl border border-[var(--glass-border)] w-fit backdrop-blur-sm">
                        <button
                            onClick={() => setActiveTab("compose")}
                            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === "compose"
                                ? "bg-purple-500 text-white shadow-lg"
                                : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                                }`}
                        >
                            Compose Message
                        </button>
                        <button
                            onClick={() => setActiveTab("history")}
                            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === "history"
                                ? "bg-purple-500 text-white shadow-lg"
                                : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                                }`}
                        >
                            Sent History
                        </button>
                    </div>

                    {activeTab === "compose" ? (
                        <Card className="border-[var(--glass-border)] bg-[var(--card-bg)] backdrop-blur-sm relative overflow-hidden">
                            {showSuccess && (
                                <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-10 animate-in fade-in">
                                    <div className="text-center">
                                        <div className="w-16 h-16 bg-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4 text-white">
                                            <CheckCircle2 className="w-8 h-8" />
                                        </div>
                                        <h3 className="text-2xl font-bold text-foreground mb-1">Message Sent!</h3>
                                        <p className="text-muted-foreground">Your message has been successfully broadcasted.</p>
                                    </div>
                                </div>
                            )}

                            <CardContent className="p-6">
                                <form onSubmit={handleSend} className="space-y-6">
                                    {/* Message Type Selection */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div
                                            onClick={() => setMessageType("broadcast")}
                                            className={`cursor-pointer p-4 rounded-xl border transition-all ${messageType === "broadcast" || messageType === "department"
                                                ? "bg-purple-500/10 border-purple-500 ring-1 ring-purple-500"
                                                : "bg-[var(--glass-bg)] border-[var(--glass-border)] hover:bg-[var(--glass-border)]"
                                                }`}
                                        >
                                            <div className="flex items-center gap-3 mb-2">
                                                <div className={`p-2 rounded-lg ${messageType === "broadcast" || messageType === "department" ? "bg-purple-500 text-white" : "bg-[var(--glass-border)] text-muted-foreground"}`}>
                                                    <Bell className="w-5 h-5" />
                                                </div>
                                                <span className={`font-bold ${messageType === "broadcast" || messageType === "department" ? "text-purple-600 dark:text-purple-400" : "text-[var(--text-secondary)]"}`}>Company Broadcast</span>
                                            </div>
                                            <p className="text-xs text-[var(--text-muted)]">Send notifications to a Department or All Employees.</p>
                                        </div>

                                        <div
                                            onClick={() => setMessageType("private")}
                                            className={`cursor-pointer p-4 rounded-xl border transition-all ${messageType === "private"
                                                ? "bg-blue-500/10 border-blue-500 ring-1 ring-blue-500"
                                                : "bg-[var(--glass-bg)] border-[var(--glass-border)] hover:bg-[var(--glass-border)]"
                                                }`}
                                        >
                                            <div className="flex items-center gap-3 mb-2">
                                                <div className={`p-2 rounded-lg ${messageType === "private" ? "bg-blue-500 text-white" : "bg-[var(--glass-border)] text-muted-foreground"}`}>
                                                    <User className="w-5 h-5" />
                                                </div>
                                                <span className={`font-bold ${messageType === "private" ? "text-blue-600 dark:text-blue-400" : "text-[var(--text-secondary)]"}`}>Private Message</span>
                                            </div>
                                            <p className="text-xs text-[var(--text-muted)]">Send a direct message to a specific employee.</p>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        {/* Target Selection */}
                                        <div className="space-y-2">
                                            <label className="text-sm font-bold text-[var(--text-primary)]">
                                                {messageType === "private" ? "Recipient" : "Target Audience"}
                                            </label>

                                            {messageType !== "private" ? (
                                                <select
                                                    value={targetAudience}
                                                    onChange={(e) => setTargetAudience(e.target.value)}
                                                    className="w-full h-10 rounded-md bg-background border border-input px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                                                >
                                                    {departments.map(dept => (
                                                        <option key={dept.id} value={dept.id}>{dept.label}</option>
                                                    ))}
                                                </select>
                                            ) : (
                                                <select
                                                    value={specificUser}
                                                    onChange={(e) => setSpecificUser(e.target.value)}
                                                    required={messageType === "private"}
                                                    className="w-full h-10 rounded-md bg-background border border-input px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                                                >
                                                    <option value="" disabled>-- Select Employee --</option>
                                                    {users.map(user => (
                                                        <option key={user.id} value={user.id}>{user.full_name} - {user.role} ({user.department || 'No Dept'})</option>
                                                    ))}
                                                </select>
                                            )}
                                        </div>

                                        {/* Category Selection */}
                                        <div className="space-y-2">
                                            <label className="text-sm font-bold text-[var(--text-primary)]">Category</label>
                                            <select
                                                value={category}
                                                onChange={(e) => setCategory(e.target.value)}
                                                className="w-full h-10 rounded-md bg-background border border-input px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                                            >
                                                {ANNOUNCEMENT_CATEGORIES.map(cat => (
                                                    <option key={cat.id} value={cat.id}>{cat.label}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>

                                    {/* Subject */}
                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-[var(--text-primary)]">Subject</label>
                                        <input
                                            type="text"
                                            value={subject}
                                            onChange={(e) => setSubject(e.target.value)}
                                            placeholder="Enter message subject..."
                                            required
                                            className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                        />
                                    </div>

                                    {/* Body */}
                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-[var(--text-primary)]">Message Content</label>
                                        <textarea
                                            value={messageBody}
                                            onChange={(e) => setMessageBody(e.target.value)}
                                            placeholder="Type your message here..."
                                            required
                                            className="flex min-h-[150px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-y"
                                        />
                                    </div>

                                    {/* Action Buttons */}
                                    <div className="pt-4 border-t border-[var(--glass-border)] flex items-center justify-end gap-3">
                                        <Button
                                            type="button"
                                            variant="outline"
                                            onClick={() => {
                                                setSubject("");
                                                setMessageBody("");
                                            }}
                                        >
                                            Clear Form
                                        </Button>
                                        <Button
                                            type="submit"
                                            disabled={isSending || (messageType === 'private' && !specificUser)}
                                            className="bg-purple-600 hover:bg-purple-700 text-white !text-white min-w-[120px]"
                                        >
                                            {isSending ? (
                                                <>
                                                    <Loader2 className="w-4 h-4 animate-spin mr-2 text-white" />
                                                    <span className="text-white">Sending...</span>
                                                </>
                                            ) : (
                                                <>
                                                    <span className="text-white">Send Message</span> <Send className="w-4 h-4 ml-2 text-white" />
                                                </>
                                            )}
                                        </Button>
                                    </div>
                                </form>
                            </CardContent>
                        </Card>
                    ) : (
                        // History View
                        <Card className="border-[var(--glass-border)] bg-[var(--card-bg)] backdrop-blur-sm">
                            <CardHeader className="flex flex-row items-center justify-between pb-2 border-b border-[var(--glass-border)]">
                                <div>
                                    <CardTitle>Sent History</CardTitle>
                                    <CardDescription>View all previously sent announcements.</CardDescription>
                                </div>
                                <div className="relative w-64">
                                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                                    <input
                                        type="text"
                                        placeholder="Search history..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring pl-9"
                                    />
                                </div>
                            </CardHeader>
                            <CardContent className="p-0">
                                {loadingHistory ? (
                                    <div className="p-12 text-center text-muted-foreground">
                                        <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2" />
                                        Loading message history...
                                    </div>
                                ) : filteredHistory.length === 0 ? (
                                    <div className="p-12 text-center text-muted-foreground flex flex-col items-center">
                                        <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-3">
                                            <Bell className="w-6 h-6 opacity-30" />
                                        </div>
                                        <p>No messages found matching your search.</p>
                                    </div>
                                ) : (
                                    <div className="divide-y divide-[var(--glass-border)] max-h-[600px] overflow-y-auto custom-scrollbar">
                                        {filteredHistory.map((msg) => {
                                            const catParams = ANNOUNCEMENT_CATEGORIES.find(c => c.id === msg.category) || ANNOUNCEMENT_CATEGORIES[0];
                                            const CatIcon = catParams.icon;

                                            return (
                                                <div key={msg.id} className="p-5 hover:bg-black/5 dark:hover:bg-white/5 transition-colors group relative">
                                                    <div className="flex items-start justify-between mb-2">
                                                        <div className="flex items-center gap-2">
                                                            <Badge variant="outline" className={`${catParams.bg} ${catParams.color} ${catParams.border} hover:${catParams.bg} gap-1`}>
                                                                <CatIcon className="w-3 h-3" />
                                                                {msg.category || "General"}
                                                            </Badge>
                                                            <span className="text-xs text-[var(--text-muted)] flex items-center gap-1">
                                                                <Clock className="w-3 h-3" />
                                                                {new Date(msg.created_at).toLocaleDateString()}
                                                            </span>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <Badge variant="secondary" className="text-[10px] uppercase">
                                                                {msg.audience_type === 'individual' ? 'Private' : msg.audience_type}
                                                            </Badge>
                                                            <button
                                                                onClick={async (e) => {
                                                                    e.stopPropagation();
                                                                    if (confirm("Are you sure you want to delete this message?")) {
                                                                        try {
                                                                            // Optimistic update
                                                                            setMessageHistory(prev => prev.filter(m => m.id !== msg.id));
                                                                            await announcementService.deleteAnnouncement(msg.id);
                                                                        } catch (error) {
                                                                            console.error("Failed to delete", error);
                                                                            alert("Failed to delete message");
                                                                            loadHistory(); // Revert
                                                                        }
                                                                    }
                                                                }}
                                                                className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-500/10 opacity-0 group-hover:opacity-100 transition-opacity"
                                                                title="Delete Message"
                                                            >
                                                                <Trash2 className="w-4 h-4" />
                                                            </button>
                                                        </div>
                                                    </div>

                                                    <h4 className="font-bold text-[var(--text-primary)] text-sm mb-1">{msg.title}</h4>
                                                    <p className="text-xs text-[var(--text-secondary)] line-clamp-2 mb-2">
                                                        {msg.content}
                                                    </p>

                                                    <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
                                                        <div className="flex -space-x-2">
                                                            <div className="w-6 h-6 rounded-full bg-purple-500/20 border border-[var(--card-bg)] flex items-center justify-center text-[10px] font-bold text-purple-600">
                                                                {msg.author?.full_name ? msg.author.full_name[0] : "A"}
                                                            </div>
                                                        </div>
                                                        <span>To: {msg.audience_type === 'department' ? msg.target_departments?.join(', ') : msg.audience_type === 'broadcast' ? 'All' : 'Recipient'}</span>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    )}
                </div>

                {/* Right Panel: Hints/Templates */}
                <div className="space-y-6">
                    <Card className="border-[var(--glass-border)] bg-[var(--card-bg)] backdrop-blur-sm">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Lightbulb className="w-5 h-5 text-yellow-500" />
                                Quick Templates
                            </CardTitle>
                            <CardDescription>Click a template to pre-fill the form.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            {ANNOUNCEMENT_TEMPLATES.map((template, idx) => (
                                <div
                                    key={idx}
                                    onClick={() => applyTemplate(template)}
                                    className="p-3 rounded-xl bg-[var(--glass-bg)] border border-[var(--glass-border)] hover:border-purple-500/50 hover:bg-purple-500/5 transition-all cursor-pointer group"
                                >
                                    <div className="flex items-center justify-between mb-1">
                                        <h4 className="font-bold text-[var(--text-primary)] text-sm group-hover:text-purple-500 transition-colors">
                                            {template.title}
                                        </h4>
                                        <Badge variant="secondary" className="text-[10px] h-5 px-1.5">
                                            {template.category}
                                        </Badge>
                                    </div>
                                    <p className="text-xs text-[var(--text-secondary)] line-clamp-2">
                                        {template.subject}
                                    </p>
                                </div>
                            ))}
                        </CardContent>
                    </Card>

                    <Card className="border-[var(--glass-border)] bg-gradient-to-br from-purple-500/5 to-blue-500/5 backdrop-blur-sm">
                        <CardHeader>
                            <CardTitle className="text-base">Best Practices</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4 text-sm text-[var(--text-secondary)]">
                            <ul className="list-disc pl-4 space-y-1">
                                <li>Use <strong>Broadcast</strong> for major company updates.</li>
                                <li>Select proper <strong>Category</strong> to help employees filter news.</li>
                                <li>Keep titles concise and action-oriented.</li>
                                <li>Use <strong>Private</strong> messages for sensitive 1-on-1 communication.</li>
                            </ul>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}

// Icon component helper if needed, but imported directly
// Removed unused icon to keep file clean
