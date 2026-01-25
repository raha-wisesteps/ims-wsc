"use client";

import { useState } from "react";
import Link from "next/link";
import {
    ChevronLeft,
    Send,
    Users,
    User,
    Bell,
    Search,
    Clock,
    CheckCircle2
} from "lucide-react";

// Mock Data for Roles and Users
const ROLES = [
    { id: "all", label: "Example: All Employees (Broadcast)" },
    { id: "hr", label: "HR Team" },
    { id: "sales", label: "Sales Team" },
    { id: "analyst", label: "Analyst Team" },
    { id: "intern", label: "Interns" },
];

const USERS = [
    { id: "1", name: "Andi Pratama", role: "Business Development" },
    { id: "2", name: "Budi Santoso", role: "Sales" },
    { id: "3", name: "Citra Lestari", role: "Analyst" },
    { id: "4", name: "David Chen", role: "Analyst" },
];

export default function MessageCenterPage() {
    const [activeTab, setActiveTab] = useState<"compose" | "history">("compose");

    // Compose State
    const [messageType, setMessageType] = useState<"broadcast" | "private">("broadcast");
    const [targetAudience, setTargetAudience] = useState("all"); // For broadcast/role
    const [specificUser, setSpecificUser] = useState(""); // For private
    const [subject, setSubject] = useState("");
    const [messageBody, setMessageBody] = useState("");
    const [isSending, setIsSending] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);

    // Mock History State
    const [messageHistory, setMessageHistory] = useState([
        {
            id: 1,
            type: "broadcast",
            target: "All Employees",
            subject: "Update Kebijakan WFH",
            date: "2026-01-10 09:00",
            status: "Sent"
        },
        {
            id: 2,
            type: "private",
            target: "Andi Pratama",
            subject: "Feedback Presentasi Client",
            date: "2026-01-08 14:30",
            status: "Read"
        },
    ]);

    const handleSend = (e: React.FormEvent) => {
        e.preventDefault();
        setIsSending(true);

        // Simulate API call
        setTimeout(() => {
            const newMessage = {
                id: messageHistory.length + 1,
                type: messageType,
                target: messageType === "broadcast"
                    ? ROLES.find(r => r.id === targetAudience)?.label || "Everyone"
                    : USERS.find(u => u.id === specificUser)?.name || "User",
                subject: subject,
                date: new Date().toLocaleString("id-ID"),
                status: "Sent"
            };

            setMessageHistory([newMessage, ...messageHistory]);
            setIsSending(false);
            setShowSuccess(true);

            // Reset form
            setSubject("");
            setMessageBody("");
            setTimeout(() => setShowSuccess(false), 3000);
        }, 1500);
    };

    return (
        <div className="space-y-6 pb-20">
            {/* Header */}
            <header>
                <Link
                    href="/dashboard/hr"
                    className="inline-flex items-center gap-2 text-gray-400 hover:text-white mb-2 transition-colors group"
                >
                    <ChevronLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                    Back to Human Resource
                </Link>
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-black tracking-tight text-white flex items-center gap-3">
                            <Send className="w-8 h-8 text-purple-500" /> Message Center
                        </h1>
                        <p className="text-gray-400">Kirim broadcast atau pesan privat ke tim.</p>
                    </div>
                </div>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Panel: Compose or Menu */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Tabs */}
                    <div className="flex p-1 bg-white/5 rounded-xl border border-white/10 w-fit">
                        <button
                            onClick={() => setActiveTab("compose")}
                            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === "compose"
                                ? "bg-purple-500 text-white shadow-lg"
                                : "text-gray-400 hover:text-white"
                                }`}
                        >
                            Compose Message
                        </button>
                        <button
                            onClick={() => setActiveTab("history")}
                            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === "history"
                                ? "bg-purple-500 text-white shadow-lg"
                                : "text-gray-400 hover:text-white"
                                }`}
                        >
                            Sent History
                        </button>
                    </div>

                    {activeTab === "compose" ? (
                        <div className="glass-panel p-6 rounded-2xl border border-white/10 relative overflow-hidden">
                            {showSuccess && (
                                <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-10 animate-in fade-in">
                                    <div className="text-center">
                                        <div className="w-16 h-16 bg-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4">
                                            <CheckCircle2 className="w-8 h-8 text-white" />
                                        </div>
                                        <h3 className="text-2xl font-bold text-white mb-1">Message Sent!</h3>
                                        <p className="text-gray-400">Pesan anda berhasil dikirim.</p>
                                    </div>
                                </div>
                            )}

                            <form onSubmit={handleSend} className="space-y-6">
                                {/* Message Type Selection */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div
                                        onClick={() => setMessageType("broadcast")}
                                        className={`cursor-pointer p-4 rounded-xl border transition-all ${messageType === "broadcast"
                                            ? "bg-purple-500/20 border-purple-500 ring-1 ring-purple-500"
                                            : "bg-white/5 border-white/10 hover:bg-white/10"
                                            }`}
                                    >
                                        <div className="flex items-center gap-3 mb-2">
                                            <div className={`p-2 rounded-lg ${messageType === "broadcast" ? "bg-purple-500" : "bg-gray-700"} text-white`}>
                                                <Bell className="w-5 h-5" />
                                            </div>
                                            <span className={`font-bold ${messageType === "broadcast" ? "text-purple-400" : "text-gray-300"}`}>Company Broadcast</span>
                                        </div>
                                        <p className="text-xs text-gray-400">Kirim notifikasi ke Department atau Semua Karyawan (Company News).</p>
                                    </div>

                                    <div
                                        onClick={() => setMessageType("private")}
                                        className={`cursor-pointer p-4 rounded-xl border transition-all ${messageType === "private"
                                            ? "bg-blue-500/20 border-blue-500 ring-1 ring-blue-500"
                                            : "bg-white/5 border-white/10 hover:bg-white/10"
                                            }`}
                                    >
                                        <div className="flex items-center gap-3 mb-2">
                                            <div className={`p-2 rounded-lg ${messageType === "private" ? "bg-blue-500" : "bg-gray-700"} text-white`}>
                                                <User className="w-5 h-5" />
                                            </div>
                                            <span className={`font-bold ${messageType === "private" ? "text-blue-400" : "text-gray-300"}`}>Private Message</span>
                                        </div>
                                        <p className="text-xs text-gray-400">Kirim pesan personal langsung ke satu karyawan tertentu.</p>
                                    </div>
                                </div>

                                {/* Target Selection */}
                                <div>
                                    <label className="block text-sm font-bold text-gray-300 mb-2">
                                        {messageType === "broadcast" ? "Target Audience (Department)" : "Select Recipient"}
                                    </label>

                                    {messageType === "broadcast" ? (
                                        <select
                                            value={targetAudience}
                                            onChange={(e) => setTargetAudience(e.target.value)}
                                            className="w-full h-12 rounded-xl bg-black/40 border border-white/10 text-white px-4 focus:border-purple-500 outline-none transition-colors"
                                        >
                                            {ROLES.map(role => (
                                                <option key={role.id} value={role.id}>{role.label}</option>
                                            ))}
                                        </select>
                                    ) : (
                                        <select
                                            value={specificUser}
                                            onChange={(e) => setSpecificUser(e.target.value)}
                                            required={messageType === "private"}
                                            className="w-full h-12 rounded-xl bg-black/40 border border-white/10 text-white px-4 focus:border-blue-500 outline-none transition-colors"
                                        >
                                            <option value="" disabled>-- Select Employee --</option>
                                            {USERS.map(user => (
                                                <option key={user.id} value={user.id}>{user.name} - {user.role}</option>
                                            ))}
                                        </select>
                                    )}
                                </div>

                                {/* Subject */}
                                <div>
                                    <label className="block text-sm font-bold text-gray-300 mb-2">Subject / Title</label>
                                    <input
                                        type="text"
                                        value={subject}
                                        onChange={(e) => setSubject(e.target.value)}
                                        placeholder="Judul pesan..."
                                        required
                                        className="w-full h-12 rounded-xl bg-black/40 border border-white/10 text-white px-4 focus:border-purple-500 outline-none transition-colors"
                                    />
                                </div>

                                {/* Body */}
                                <div>
                                    <label className="block text-sm font-bold text-gray-300 mb-2">Message Content</label>
                                    <textarea
                                        value={messageBody}
                                        onChange={(e) => setMessageBody(e.target.value)}
                                        placeholder="Tulis pesan anda disini..."
                                        required
                                        className="w-full h-40 rounded-xl bg-black/40 border border-white/10 text-white p-4 focus:border-purple-500 outline-none transition-colors resize-none"
                                    />
                                </div>

                                {/* Action Buttons */}
                                <div className="pt-4 border-t border-white/5 flex items-center justify-end gap-3">
                                    <button
                                        type="button"
                                        className="px-6 py-3 rounded-xl border border-white/10 text-gray-400 hover:text-white hover:bg-white/5 font-medium transition-colors"
                                    >
                                        Draft
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={isSending}
                                        className="px-6 py-3 rounded-xl bg-purple-500 hover:bg-purple-600 text-white font-bold shadow-lg shadow-purple-500/20 flex items-center gap-2 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {isSending ? (
                                            <>Converting...</>
                                        ) : (
                                            <>Send Message <Send className="w-4 h-4" /></>
                                        )}
                                    </button>
                                </div>
                            </form>
                        </div>
                    ) : (
                        // History View
                        <div className="glass-panel rounded-2xl border border-white/10 overflow-hidden">
                            <div className="p-4 bg-white/5 border-b border-white/10 flex items-center justify-between">
                                <h3 className="font-bold text-white">History Pesan Terkirim</h3>
                                <div className="relative">
                                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                                    <input
                                        type="text"
                                        placeholder="Search..."
                                        className="h-9 w-48 rounded-lg bg-black/20 border border-white/10 pl-9 text-xs text-white focus:border-purple-500 outline-none"
                                    />
                                </div>
                            </div>
                            <div className="divide-y divide-white/5">
                                {messageHistory.map((msg) => (
                                    <div key={msg.id} className="p-4 hover:bg-white/5 transition-colors flex items-center justify-between group">
                                        <div className="flex items-center gap-4">
                                            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${msg.type === "broadcast" ? "bg-purple-500/20 text-purple-400" : "bg-blue-500/20 text-blue-400"
                                                }`}>
                                                {msg.type === "broadcast" ? <Bell className="w-5 h-5" /> : <User className="w-5 h-5" />}
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-white text-sm mb-0.5">{msg.subject}</h4>
                                                <div className="flex items-center gap-2 text-xs text-gray-400">
                                                    <span>To: {msg.target}</span>
                                                    <span>•</span>
                                                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {msg.date}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <span className="px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-bold border border-emerald-500/20">
                                            {msg.status}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Right Panel: Hints/Templates */}
                <div className="space-y-6">
                    <div className="glass-panel p-6 rounded-2xl border border-white/10">
                        <h3 className="font-bold text-white mb-4 flex items-center gap-2">
                            💡 Tips & Templates
                        </h3>
                        <div className="space-y-4">
                            <div className="p-4 rounded-xl bg-white/5 border border-white/5 hover:border-purple-500/50 transition-colors cursor-pointer group">
                                <h4 className="font-bold text-gray-200 text-sm mb-1 group-hover:text-purple-400">Company Announcement</h4>
                                <p className="text-xs text-gray-500 line-clamp-2">Template standar untuk pengumuman libur, kebijakan baru, dll.</p>
                            </div>
                            <div className="p-4 rounded-xl bg-white/5 border border-white/5 hover:border-blue-500/50 transition-colors cursor-pointer group">
                                <h4 className="font-bold text-gray-200 text-sm mb-1 group-hover:text-blue-400">Performance Feedback</h4>
                                <p className="text-xs text-gray-500 line-clamp-2">Format untuk memberikan feedback personal 1-on-1.</p>
                            </div>
                            <div className="p-4 rounded-xl bg-white/5 border border-white/5 hover:border-amber-500/50 transition-colors cursor-pointer group">
                                <h4 className="font-bold text-gray-200 text-sm mb-1 group-hover:text-amber-400">Team Appreciation</h4>
                                <p className="text-xs text-gray-500 line-clamp-2">Ucapan selamat atas pencapaian target tim.</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
