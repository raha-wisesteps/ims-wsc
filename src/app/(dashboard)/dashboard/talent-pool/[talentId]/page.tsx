"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
    ChevronRight,
    User,
    Mail,
    Phone,
    MapPin,
    Calendar,
    Briefcase,
    Star,
    Edit3,
    ArrowLeft,
    Plus,
    Trash2,
    Save,
    X,
    ExternalLink,
    FileText,
    Hash
} from "lucide-react";
import Image from "next/image";

// Reusing configs from main page (ideally should be in a shared config file)
const CATEGORY_CONFIG = {
    'Hospitality & Operations': { label: "Hospitality & Operations", color: "bg-blue-500" },
    'Destination Management & Policy': { label: "Destination Mgmt & Policy", color: "bg-green-500" },
    'Planning & Infrastructure': { label: "Planning & Infrastructure", color: "bg-purple-500" },
    'Business & Investment': { label: "Business & Investment", color: "bg-amber-500" },
    'Marketing & Sales': { label: "Marketing & Sales", color: "bg-cyan-500" },
    'IT, Data & Smart Tourism': { label: "IT, Data & Smart Tourism", color: "bg-red-500" },
    'Sustainability & Environment': { label: "Sustainability & Env", color: "bg-emerald-500" },
    'Community, Culture & Heritage': { label: "Community, Culture & Heritage", color: "bg-indigo-500" },
    'MICE & Events': { label: "MICE & Events", color: "bg-orange-500" },
    'Etc.': { label: "Etc.", color: "bg-gray-500" },
};

const GROUP_CONFIG = {
    'Proven & Trusted': { label: "Proven & Trusted", color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300" },
    'Warm Leads': { label: "Warm Leads", color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300" },
    'Cold Leads': { label: "Cold Leads", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300" },
};

const STATUS_CONFIG = {
    'Recommended': { label: "Recommended", color: "text-green-500" },
    'Not recommended': { label: "Not recommended", color: "text-red-500" },
    'Potential': { label: "Potential", color: "text-blue-500" },
};

export default function TalentDetailPage() {
    const params = useParams();
    const router = useRouter();
    const supabase = createClient();
    const [talent, setTalent] = useState<any>(null);
    const [logs, setLogs] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isEditing, setIsEditing] = useState(false);

    // Edit Form State
    const [editForm, setEditForm] = useState<any>({});
    const [tagInput, setTagInput] = useState("");

    // Project Log Modal
    const [showLogModal, setShowLogModal] = useState(false);
    const [logForm, setLogForm] = useState({
        project_name: "",
        role: "",
        performance_rating: 3,
        notes: ""
    });

    useEffect(() => {
        if (params.talentId) fetchTalentDetails();
    }, [params.talentId]);

    const fetchTalentDetails = async () => {
        try {
            const { data: talentData, error: talentError } = await supabase
                .from("talent_profiles")
                .select("*")
                .eq("id", params.talentId)
                .single();

            if (talentError) throw talentError;
            setTalent(talentData);
            setEditForm(talentData);

            // Fetch Logs
            const { data: logsData, error: logsError } = await supabase
                .from("talent_project_logs")
                .select("*")
                .eq("talent_id", params.talentId)
                .order("created_at", { ascending: false });

            if (logsError) throw logsError;
            setLogs(logsData || []);
        } catch (error) {
            console.error("Error fetching talent details:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSaveProfile = async () => {
        try {
            const { error } = await supabase
                .from("talent_profiles")
                .update({
                    name: editForm.name,
                    category: editForm.category,
                    group_classification: editForm.group_classification,
                    status: editForm.status,
                    phone: editForm.phone,
                    email: editForm.email,
                    linkedin: editForm.linkedin,
                    cv_link: editForm.cv_link,
                    tags: editForm.tags,
                    updated_at: new Date().toISOString()
                })
                .eq("id", talent.id);

            if (error) throw error;
            setTalent(editForm);
            setIsEditing(false);
        } catch (error) {
            console.error("Error updating profile:", error);
            alert("Error updating profile");
        }
    };

    const handleAddTag = () => {
        const cleaned = tagInput.replace(/^#/, '').trim();
        if (cleaned && !editForm.tags?.includes(cleaned)) {
            setEditForm((prev: any) => ({ ...prev, tags: [...(prev.tags || []), cleaned] }));
        }
        setTagInput("");
    };

    const handleRemoveTag = (tag: string) => {
        setEditForm((prev: any) => ({ ...prev, tags: prev.tags.filter((t: string) => t !== tag) }));
    };

    const handleSaveLog = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const { error } = await supabase.from("talent_project_logs").insert({
                talent_id: talent.id,
                project_name: logForm.project_name,
                role: logForm.role,
                performance_rating: logForm.performance_rating,
                notes: logForm.notes
            });

            if (error) throw error;
            setShowLogModal(false);
            setLogForm({ project_name: "", role: "", performance_rating: 3, notes: "" });
            fetchTalentDetails(); // Refresh logs
        } catch (error) {
            console.error("Error saving log:", error);
            alert("Error saving log");
        }
    };

    const handleDeleteLog = async (logId: string) => {
        if (!confirm("Are you sure you want to delete this log?")) return;
        try {
            const { error } = await supabase.from("talent_project_logs").delete().eq("id", logId);
            if (error) throw error;
            fetchTalentDetails();
        } catch (error) {
            console.error("Error deleting log:", error);
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#e8c559]"></div>
            </div>
        );
    }

    if (!talent) return <div>Talent not found</div>;

    return (
        <div className="flex flex-col h-full space-y-6">
            {/* Header / Breadcrumbs */}
            <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                <Link href="/dashboard" className="hover:text-[var(--text-primary)]">Dashboard</Link>
                <ChevronRight className="h-4 w-4" />
                <Link href="/dashboard/talent-pool" className="hover:text-[var(--text-primary)]">Talent Pool</Link>
                <ChevronRight className="h-4 w-4" />
                <span className="text-[var(--text-primary)]">{talent.name}</span>
            </div>

            <div className="flex items-center gap-4">
                <Link href="/dashboard/talent-pool" className="p-2 rounded-xl bg-white dark:bg-[#1c2120] border border-[var(--glass-border)] hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                    <ArrowLeft className="h-5 w-5 text-[var(--text-primary)]" />
                </Link>
                <h1 className="text-2xl font-bold text-[var(--text-primary)]">Talent Profile</h1>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column: Info Card */}
                <div className="lg:col-span-1 space-y-6">
                    <div className="bg-white dark:bg-[#1c2120] rounded-2xl border border-[var(--glass-border)] p-6 shadow-sm">
                        <div className="flex justify-between items-start mb-6">
                            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-3xl font-bold text-white shadow-lg">
                                {talent.name.charAt(0)}
                            </div>
                            <button
                                onClick={() => isEditing ? handleSaveProfile() : setIsEditing(true)}
                                className={`p-2 rounded-lg transition-colors ${isEditing ? 'bg-[#e8c559] text-[#171611] hover:bg-[#d4b44e]' : 'text-[var(--text-secondary)] hover:bg-black/5 dark:hover:bg-white/5'}`}
                            >
                                {isEditing ? <Save className="w-5 h-5" /> : <Edit3 className="w-5 h-5" />}
                            </button>
                        </div>

                        {isEditing ? (
                            <div className="space-y-4">
                                <div>
                                    <label className="text-xs font-bold text-[var(--text-secondary)] uppercase">Name</label>
                                    <input
                                        type="text"
                                        value={editForm.name}
                                        onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                                        className="w-full mt-1 px-3 py-2 rounded-lg border border-[var(--glass-border)] bg-[var(--glass-bg)] text-[var(--text-primary)]"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-[var(--text-secondary)] uppercase">Category</label>
                                    <select
                                        value={editForm.category}
                                        onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
                                        className="w-full mt-1 px-3 py-2 rounded-lg border border-[var(--glass-border)] bg-[var(--glass-bg)] text-[var(--text-primary)]"
                                    >
                                        {Object.keys(CATEGORY_CONFIG).map(cat => (
                                            <option key={cat} value={cat}>{cat}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-[var(--text-secondary)] uppercase">Group</label>
                                    <select
                                        value={editForm.group_classification}
                                        onChange={(e) => setEditForm({ ...editForm, group_classification: e.target.value })}
                                        className="w-full mt-1 px-3 py-2 rounded-lg border border-[var(--glass-border)] bg-[var(--glass-bg)] text-[var(--text-primary)]"
                                    >
                                        {Object.keys(GROUP_CONFIG).map(grp => (
                                            <option key={grp} value={grp}>{grp}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-[var(--text-secondary)] uppercase">Status</label>
                                    <select
                                        value={editForm.status}
                                        onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                                        className="w-full mt-1 px-3 py-2 rounded-lg border border-[var(--glass-border)] bg-[var(--glass-bg)] text-[var(--text-primary)]"
                                    >
                                        {Object.keys(STATUS_CONFIG).map(stat => (
                                            <option key={stat} value={stat}>{stat}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="border-t border-[var(--glass-border)] my-4 pt-4"></div>

                                <div>
                                    <label className="text-xs font-bold text-[var(--text-secondary)] uppercase">Email</label>
                                    <input
                                        type="email"
                                        value={editForm.email || ""}
                                        onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                                        className="w-full mt-1 px-3 py-2 rounded-lg border border-[var(--glass-border)] bg-[var(--glass-bg)] text-[var(--text-primary)]"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-[var(--text-secondary)] uppercase">Phone</label>
                                    <input
                                        type="tel"
                                        value={editForm.phone || ""}
                                        onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                                        className="w-full mt-1 px-3 py-2 rounded-lg border border-[var(--glass-border)] bg-[var(--glass-bg)] text-[var(--text-primary)]"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-[var(--text-secondary)] uppercase">LinkedIn</label>
                                    <input
                                        type="url"
                                        value={editForm.linkedin || ""}
                                        onChange={(e) => setEditForm({ ...editForm, linkedin: e.target.value })}
                                        className="w-full mt-1 px-3 py-2 rounded-lg border border-[var(--glass-border)] bg-[var(--glass-bg)] text-[var(--text-primary)]"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-[var(--text-secondary)] uppercase">CV Link</label>
                                    <input
                                        type="url"
                                        value={editForm.cv_link || ""}
                                        onChange={(e) => setEditForm({ ...editForm, cv_link: e.target.value })}
                                        className="w-full mt-1 px-3 py-2 rounded-lg border border-[var(--glass-border)] bg-[var(--glass-bg)] text-[var(--text-primary)]"
                                    />
                                </div>

                                <div className="border-t border-[var(--glass-border)] my-4 pt-4"></div>

                                <div>
                                    <label className="text-xs font-bold text-[var(--text-secondary)] uppercase mb-2 block">Tags</label>
                                    <div className="flex gap-2 mb-2">
                                        <input
                                            type="text"
                                            value={tagInput}
                                            onChange={(e) => setTagInput(e.target.value)}
                                            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
                                            className="flex-1 px-3 py-1 text-sm rounded-lg border border-[var(--glass-border)] bg-[var(--glass-bg)] text-[var(--text-primary)]"
                                            placeholder="Add tag"
                                        />
                                        <button type="button" onClick={handleAddTag} className="px-3 py-1 text-sm rounded-lg bg-[#e8c559] text-[#171611]">Add</button>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        {editForm.tags?.map((tag: string, i: number) => (
                                            <span key={i} className="flex items-center gap-1 px-2 py-1 rounded text-xs bg-gray-100 dark:bg-zinc-800 text-[var(--text-primary)]">
                                                #{tag}
                                                <button type="button" onClick={() => handleRemoveTag(tag)} className="hover:text-red-500"><X className="w-3 h-3" /></button>
                                            </span>
                                        ))}
                                    </div>
                                </div>

                            </div>
                        ) : (
                            <div className="space-y-6">
                                <div>
                                    <h2 className="text-xl font-bold text-[var(--text-primary)] mb-1">{talent.name}</h2>
                                    <span className={`px-2.5 py-1 rounded-full text-xs font-bold text-white ${CATEGORY_CONFIG[talent.category as keyof typeof CATEGORY_CONFIG]?.color || "bg-gray-500"}`}>
                                        {CATEGORY_CONFIG[talent.category as keyof typeof CATEGORY_CONFIG]?.label || talent.category}
                                    </span>
                                </div>

                                <div className="flex flex-col gap-3">
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="text-[var(--text-secondary)]">Group</span>
                                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${GROUP_CONFIG[talent.group_classification as keyof typeof GROUP_CONFIG]?.color}`}>
                                            {talent.group_classification}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="text-[var(--text-secondary)]">Status</span>
                                        <span className={`font-medium ${STATUS_CONFIG[talent.status as keyof typeof STATUS_CONFIG]?.color}`}>
                                            {talent.status}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="text-[var(--text-secondary)]">First Met</span>
                                        <span className="text-[var(--text-primary)]">
                                            {talent.first_met_date ? new Date(talent.first_met_date).toLocaleDateString() : '-'}
                                        </span>
                                    </div>
                                </div>

                                <div className="border-t border-[var(--glass-border)] pt-4 space-y-3">
                                    <div className="flex items-center gap-3 text-sm">
                                        <Mail className="w-4 h-4 text-[var(--text-secondary)]" />
                                        <span className="text-[var(--text-primary)]">{talent.email || "-"}</span>
                                    </div>
                                    <div className="flex items-center gap-3 text-sm">
                                        <Phone className="w-4 h-4 text-[var(--text-secondary)]" />
                                        <span className="text-[var(--text-primary)]">{talent.phone || "-"}</span>
                                    </div>
                                    {talent.linkedin && (
                                        <div className="flex items-center gap-3 text-sm">
                                            <Image src="/LinkedIn_Logo.svg" alt="LinkedIn" width={16} height={16} className="w-4 h-4 opacity-70" />
                                            <a href={talent.linkedin} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline truncate">
                                                LinkedIn Profile
                                            </a>
                                        </div>
                                    )}
                                    {talent.cv_link && (
                                        <div className="flex items-center gap-3 text-sm">
                                            <FileText className="w-4 h-4 text-blue-500" />
                                            <a href={talent.cv_link} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline truncate">
                                                View CV / Portfolio
                                            </a>
                                        </div>
                                    )}
                                </div>

                                {talent.tags && talent.tags.length > 0 && (
                                    <div className="border-t border-[var(--glass-border)] pt-4">
                                        <p className="text-xs font-bold text-[var(--text-secondary)] uppercase mb-2">Skills / Tags</p>
                                        <div className="flex flex-wrap gap-2">
                                            {talent.tags.map((tag: string, i: number) => (
                                                <span key={i} className="px-2.5 py-1 rounded-full text-xs bg-[#e8c559]/10 text-[#e8c559] border border-[#e8c559]/20">
                                                    #{tag}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Column: Project Logs */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="flex items-center justify-between">
                        <h2 className="text-xl font-bold text-[var(--text-primary)]">Project History</h2>
                        <button
                            onClick={() => setShowLogModal(true)}
                            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#e8c559] text-[#171611] font-bold hover:bg-[#d4b44e] transition-colors"
                        >
                            <Plus className="h-4 w-4" />
                            Add Project Log
                        </button>
                    </div>

                    <div className="space-y-4">
                        {logs.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-12 bg-white dark:bg-[#1c2120] rounded-2xl border border-[var(--glass-border)] border-dashed">
                                <Briefcase className="w-10 h-10 text-[var(--text-muted)] mb-3" />
                                <p className="text-[var(--text-secondary)]">No project history recorded yet.</p>
                            </div>
                        ) : (
                            logs.map((log) => (
                                <div key={log.id} className="bg-white dark:bg-[#1c2120] rounded-xl border border-[var(--glass-border)] p-5 relative group">
                                    <button
                                        onClick={() => handleDeleteLog(log.id)}
                                        className="absolute top-4 right-4 p-2 text-[var(--text-secondary)] hover:text-red-500 hover:bg-red-500/10 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>

                                    <div className="flex items-start justify-between mb-3">
                                        <div>
                                            <h3 className="font-bold text-[var(--text-primary)] text-lg mb-1">{log.project_name}</h3>
                                            <div className="flex items-center gap-2">
                                                <span className="text-sm text-[var(--text-secondary)] font-medium bg-gray-100 dark:bg-zinc-800 px-2 py-0.5 rounded">
                                                    {log.role || "Role not specified"}
                                                </span>
                                                <span className="text-xs text-[var(--text-muted)]">
                                                    • {new Date(log.created_at).toLocaleDateString()}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-1 bg-amber-50 dark:bg-amber-900/10 px-2 py-1 rounded-lg">
                                            <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                                            <span className="font-bold text-amber-700 dark:text-amber-400">{log.performance_rating}/5</span>
                                        </div>
                                    </div>

                                    {log.notes && (
                                        <p className="text-sm text-[var(--text-secondary)] mt-3 leading-relaxed border-t border-[var(--glass-border)] pt-3">
                                            {log.notes}
                                        </p>
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>

            {/* Log Modal */}
            {showLogModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="w-full max-w-lg bg-white dark:bg-[#1c2120] rounded-2xl shadow-2xl">
                        <div className="flex items-center justify-between p-6 border-b border-[var(--glass-border)]">
                            <h2 className="text-xl font-bold text-[var(--text-primary)]">Add Project Log</h2>
                            <button onClick={() => setShowLogModal(false)} className="p-2 rounded-lg hover:bg-black/10">
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                        <form onSubmit={handleSaveLog} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-bold text-[var(--text-primary)] mb-1">Project Name *</label>
                                <input
                                    type="text"
                                    required
                                    value={logForm.project_name}
                                    onChange={(e) => setLogForm({ ...logForm, project_name: e.target.value })}
                                    className="w-full px-4 py-2 rounded-xl border border-[var(--glass-border)] bg-white dark:bg-[#232b2a] text-[var(--text-primary)]"
                                    placeholder="e.g. Annual Gala 2024"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-[var(--text-primary)] mb-1">Role</label>
                                <input
                                    type="text"
                                    value={logForm.role}
                                    onChange={(e) => setLogForm({ ...logForm, role: e.target.value })}
                                    className="w-full px-4 py-2 rounded-xl border border-[var(--glass-border)] bg-white dark:bg-[#232b2a] text-[var(--text-primary)]"
                                    placeholder="e.g. Event Coordinator"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-[var(--text-primary)] mb-1">Performance Rating (1-5)</label>
                                <div className="flex gap-4">
                                    {[1, 2, 3, 4, 5].map((rating) => (
                                        <button
                                            key={rating}
                                            type="button"
                                            onClick={() => setLogForm({ ...logForm, performance_rating: rating })}
                                            className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${logForm.performance_rating === rating
                                                    ? "bg-[#e8c559] text-[#171611] font-bold shadow-lg scale-110"
                                                    : "bg-gray-100 dark:bg-zinc-800 text-[var(--text-secondary)] hover:bg-gray-200"
                                                }`}
                                        >
                                            {rating}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-[var(--text-primary)] mb-1">Notes / Feedback</label>
                                <textarea
                                    rows={3}
                                    value={logForm.notes}
                                    onChange={(e) => setLogForm({ ...logForm, notes: e.target.value })}
                                    className="w-full px-4 py-2 rounded-xl border border-[var(--glass-border)] bg-white dark:bg-[#232b2a] text-[var(--text-primary)] resize-none"
                                    placeholder="Add details about their performance..."
                                />
                            </div>
                            <div className="flex justify-end gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setShowLogModal(false)}
                                    className="px-6 py-2 rounded-xl border border-[var(--glass-border)] text-[var(--text-primary)] hover:bg-black/5 dark:hover:bg-white/5"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-6 py-2 rounded-xl bg-[#e8c559] text-[#171611] font-bold hover:bg-[#d4b44e]"
                                >
                                    Save Log
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
