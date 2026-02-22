"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
    Users,
    ChevronRight,
    Plus,
    Search,
    LayoutGrid,
    List,
    Phone,
    Mail,
    FileText,
    Calendar,
    X,
    Filter,
    Edit3,
    Trash2,
    Briefcase,
    MapPin,
    Hash,
    FileDown
} from "lucide-react";
import Image from "next/image";
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

// Enums & Configs
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

export interface TalentProfile {
    id: string;
    name: string;
    email: string | null;
    linkedin: string | null;
    phone: string | null;
    cv_link: string | null;
    first_met_date: string | null;
    category: string;
    group_classification: string;
    status: string;
    tags: string[] | null;
    created_at: string;
}

export default function TalentPoolPage() {
    const supabase = createClient();
    const { profile } = useAuth(); // Assuming basic auth needed, specific role checks can be added if required
    const [talents, setTalents] = useState<TalentProfile[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

    // Filters
    const [filterCategory, setFilterCategory] = useState("");
    const [filterGroup, setFilterGroup] = useState("");
    const [filterStatus, setFilterStatus] = useState("");

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 9;

    // Modal State
    const [showForm, setShowForm] = useState(false);
    const [tagInput, setTagInput] = useState("");
    const [formData, setFormData] = useState({
        name: "",
        email: "",
        linkedin: "",
        phone: "",
        cv_link: "",
        first_met_date: "",
        category: "Hospitality & Operations",
        group_classification: "Cold Leads",
        status: "Potential",
        tags: [] as string[]
    });

    useEffect(() => {
        fetchTalents();
    }, []);

    const fetchTalents = async () => {
        try {
            const { data, error } = await supabase
                .from("talent_profiles")
                .select("*")
                .order("created_at", { ascending: false });

            if (error) throw error;
            setTalents(data || []);
        } catch (error) {
            console.error("Error fetching talents:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleAddTag = () => {
        const cleaned = tagInput.replace(/^#/, '').trim();
        if (cleaned && !formData.tags.includes(cleaned)) {
            setFormData(prev => ({ ...prev, tags: [...prev.tags, cleaned] }));
        }
        setTagInput("");
    };

    const handleRemoveTag = (tagToRemove: string) => {
        setFormData(prev => ({ ...prev, tags: prev.tags.filter(t => t !== tagToRemove) }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const { error } = await supabase.from("talent_profiles").insert({
                name: formData.name,
                email: formData.email || null,
                linkedin: formData.linkedin || null,
                phone: formData.phone || null,
                cv_link: formData.cv_link || null,
                first_met_date: formData.first_met_date || null,
                category: formData.category,
                group_classification: formData.group_classification,
                status: formData.status,
                tags: formData.tags,
                created_by: profile?.id
            });

            if (error) throw error;

            setShowForm(false);
            resetForm();
            fetchTalents();
        } catch (error) {
            console.error("Error creating talent:", error);
            alert("Error creating talent");
        }
    };

    const resetForm = () => {
        setFormData({
            name: "",
            email: "",
            linkedin: "",
            phone: "",
            cv_link: "",
            first_met_date: "",
            category: "Hospitality & Operations",
            group_classification: "Cold Leads",
            status: "Potential",
            tags: []
        });
        setTagInput("");
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure you want to delete this talent profile?")) return;
        try {
            const { error } = await supabase.from("talent_profiles").delete().eq("id", id);
            if (error) throw error;
            fetchTalents();
        } catch (error) {
            console.error("Error deleting talent:", error);
            alert("Error deleting talent");
        }
    };

    // Filter Logic
    const filteredTalents = useMemo(() => {
        return talents.filter(talent => {
            const matchesSearch = talent.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                talent.tags?.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
            const matchesCategory = !filterCategory || talent.category === filterCategory;
            const matchesGroup = !filterGroup || talent.group_classification === filterGroup;
            const matchesStatus = !filterStatus || talent.status === filterStatus;

            return matchesSearch && matchesCategory && matchesGroup && matchesStatus;
        });
    }, [talents, searchQuery, filterCategory, filterGroup, filterStatus]);

    // Pagination Logic
    const totalPages = Math.max(1, Math.ceil(filteredTalents.length / itemsPerPage));
    const paginatedTalents = useMemo(() => {
        const start = (currentPage - 1) * itemsPerPage;
        return filteredTalents.slice(start, start + itemsPerPage);
    }, [filteredTalents, currentPage]);

    // Reset pagination when filters change
    useEffect(() => {
        setCurrentPage(1);
    }, [searchQuery, filterCategory, filterGroup, filterStatus]);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#e8c559]"></div>
            </div>
        );
    }

    const handleExport = () => {
        const exportData = filteredTalents.map(talent => ({
            "Name": talent.name,
            "Category": CATEGORY_CONFIG[talent.category as keyof typeof CATEGORY_CONFIG]?.label || talent.category,
            "Group": talent.group_classification,
            "Status": talent.status,
            "Email": talent.email || "-",
            "Phone": talent.phone || "-",
            "LinkedIn URL": talent.linkedin || "-",
            "CV Link": talent.cv_link || "-",
            "First Met Date": talent.first_met_date ? new Date(talent.first_met_date).toLocaleDateString() : "-",
            "Tags": talent.tags?.join(", ") || "-",
            "Added On": new Date(talent.created_at).toLocaleDateString()
        }));

        const workbook = XLSX.utils.book_new();
        const worksheet = XLSX.utils.json_to_sheet(exportData);
        XLSX.utils.book_append_sheet(workbook, worksheet, "Talents");

        const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
        const data = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8' });

        saveAs(data, `talent_pool_${new Date().toISOString().split('T')[0]}.xlsx`);
    };

    return (
        <div className="flex flex-col h-full">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
                        <Users className="h-6 w-6 text-white" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2 mb-1 text-sm text-[var(--text-secondary)]">
                            <Link href="/dashboard" className="hover:text-[var(--text-primary)]">Dashboard</Link>
                            <ChevronRight className="h-4 w-4" />
                            <span className="text-[var(--text-primary)]">Talent Pool</span>
                        </div>
                        <h1 className="text-2xl font-bold text-[var(--text-primary)]">Talent Pool</h1>
                        <p className="text-sm text-[var(--text-secondary)]">
                            {filteredTalents.length} talents found
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={handleExport}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white dark:bg-[#1c2120] border border-[var(--glass-border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[#e8c559] transition-colors"
                        title="Export to Excel"
                    >
                        <FileDown className="h-4 w-4" />
                        <span className="hidden sm:inline">Export</span>
                    </button>
                    <button
                        onClick={() => setShowForm(true)}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#e8c559] text-[#171611] font-bold hover:bg-[#d4b44e] transition-colors"
                    >
                        <Plus className="h-4 w-4" />
                        Add Talent
                    </button>
                </div>
            </div>

            {/* Controls */}
            <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-6">
                <div className="flex flex-wrap gap-3 w-full md:w-auto">
                    <div className="relative flex-1 min-w-[200px]">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-muted)]" />
                        <input
                            type="text"
                            placeholder="Search talents or tags..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 rounded-xl border border-[var(--glass-border)] bg-white dark:bg-[#1c2120] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[#e8c559]"
                        />
                    </div>
                    <select
                        value={filterCategory}
                        onChange={(e) => setFilterCategory(e.target.value)}
                        className="px-4 py-2 rounded-xl border border-[var(--glass-border)] bg-white dark:bg-[#1c2120] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[#e8c559]"
                    >
                        <option value="">All Categories</option>
                        {Object.keys(CATEGORY_CONFIG).map(cat => (
                            <option key={cat} value={cat}>{cat}</option>
                        ))}
                    </select>
                    <select
                        value={filterGroup}
                        onChange={(e) => setFilterGroup(e.target.value)}
                        className="px-4 py-2 rounded-xl border border-[var(--glass-border)] bg-white dark:bg-[#1c2120] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[#e8c559]"
                    >
                        <option value="">All Groups</option>
                        {Object.keys(GROUP_CONFIG).map(grp => (
                            <option key={grp} value={grp}>{grp}</option>
                        ))}
                    </select>
                </div>

                {/* View Toggle */}
                <div className="flex items-center gap-1 bg-white dark:bg-[#1c2120] border border-[var(--glass-border)] p-1 rounded-lg">
                    <button
                        onClick={() => setViewMode("grid")}
                        className={`p-2 rounded-md transition-colors ${viewMode === "grid" ? "bg-[#e8c559] text-[#171611]" : "text-[var(--text-secondary)] hover:bg-black/5 dark:hover:bg-white/5"}`}
                    >
                        <LayoutGrid className="w-4 h-4" />
                    </button>
                    <button
                        onClick={() => setViewMode("list")}
                        className={`p-2 rounded-md transition-colors ${viewMode === "list" ? "bg-[#e8c559] text-[#171611]" : "text-[var(--text-secondary)] hover:bg-black/5 dark:hover:bg-white/5"}`}
                    >
                        <List className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* Content */}
            {filteredTalents.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                    <Users className="h-12 w-12 text-[var(--text-muted)] mb-4" />
                    <h3 className="text-lg font-bold text-[var(--text-primary)] mb-2">No talents found</h3>
                    <p className="text-[var(--text-secondary)]">Add your first talent profile to get started</p>
                </div>
            ) : (
                <>
                    {viewMode === "grid" ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {paginatedTalents.map((talent) => (
                                <div
                                    key={talent.id}
                                    className="group relative flex flex-col p-5 rounded-2xl bg-white dark:bg-[#1c2120] border border-[var(--glass-border)] hover:border-[#e8c559]/50 hover:shadow-xl transition-all duration-300"
                                >
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="flex-1">
                                            <div className="flex flex-wrap items-center gap-2 mb-2">
                                                <span className={`px-2.5 py-1 rounded-full text-[10px] uppercase tracking-wider font-bold text-white ${CATEGORY_CONFIG[talent.category as keyof typeof CATEGORY_CONFIG]?.color || "bg-gray-500"}`}>
                                                    {CATEGORY_CONFIG[talent.category as keyof typeof CATEGORY_CONFIG]?.label || talent.category}
                                                </span>
                                                <span className={`px-2.5 py-1 rounded-full text-[10px] uppercase tracking-wider font-bold ${GROUP_CONFIG[talent.group_classification as keyof typeof GROUP_CONFIG]?.color || "bg-gray-100 text-gray-700"}`}>
                                                    {talent.group_classification}
                                                </span>
                                            </div>
                                            <Link href={`/dashboard/talent-pool/${talent.id}`} className="block">
                                                <h3 className="text-lg font-bold text-[var(--text-primary)] group-hover:text-[#e8c559] transition-colors line-clamp-1 mb-1">
                                                    {talent.name}
                                                </h3>
                                            </Link>
                                            <p className={`text-xs font-medium ${STATUS_CONFIG[talent.status as keyof typeof STATUS_CONFIG]?.color || "text-gray-500"}`}>
                                                {talent.status}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Contact & Links */}
                                    <div className="flex flex-col gap-2 mb-4">
                                        {talent.email && (
                                            <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                                                <Mail className="w-4 h-4 shrink-0" />
                                                <span className="truncate">{talent.email}</span>
                                            </div>
                                        )}
                                        {talent.phone && (
                                            <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                                                <Phone className="w-4 h-4 shrink-0" />
                                                <span className="truncate">{talent.phone}</span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Links Row */}
                                    <div className="flex items-center gap-3 mb-4">
                                        {talent.linkedin && (
                                            <a
                                                href={talent.linkedin}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="hover:opacity-80 transition-opacity"
                                                title="LinkedIn Profile"
                                            >
                                                <Image src="/LinkedIn_icon.svg.png" alt="LinkedIn" width={20} height={20} className="w-5 h-5" />
                                            </a>
                                        )}
                                        {talent.cv_link && (
                                            <a
                                                href={talent.cv_link}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="flex items-center gap-1 text-xs font-medium text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300 bg-blue-50 dark:bg-blue-900/20 px-2 py-1 rounded-lg"
                                            >
                                                <FileText className="w-3 h-3" /> CV
                                            </a>
                                        )}
                                    </div>

                                    {/* Tags */}
                                    {talent.tags && talent.tags.length > 0 && (
                                        <div className="flex flex-wrap gap-1 mb-4">
                                            {talent.tags.slice(0, 3).map((tag, i) => (
                                                <span key={i} className="px-2 py-0.5 rounded text-[10px] bg-gray-100 dark:bg-gray-800 text-[var(--text-secondary)]">
                                                    #{tag}
                                                </span>
                                            ))}
                                            {talent.tags.length > 3 && (
                                                <span className="px-2 py-0.5 rounded text-[10px] bg-gray-100 dark:bg-gray-800 text-[var(--text-secondary)]">
                                                    +{talent.tags.length - 3}
                                                </span>
                                            )}
                                        </div>
                                    )}

                                    {/* Footer */}
                                    <div className="mt-auto pt-4 border-t border-[var(--glass-border)] flex items-center justify-between">
                                        <div className="text-xs text-[var(--text-secondary)] flex items-center gap-1">
                                            <Calendar className="w-3 h-3" />
                                            {talent.first_met_date ? new Date(talent.first_met_date).toLocaleDateString() : 'No Date'}
                                        </div>
                                        <Link href={`/dashboard/talent-pool/${talent.id}`} className="flex items-center gap-1 text-xs font-medium hover:text-[#e8c559] transition-colors ml-2">
                                            Details <ChevronRight className="w-3 h-3" />
                                        </Link>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        /* List View */
                        <div className="bg-white dark:bg-[#1c2120] rounded-2xl border border-[var(--glass-border)] overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-[var(--glass-bg)] border-b border-[var(--glass-border)]">
                                        <tr>
                                            <th className="px-6 py-4 font-semibold text-[var(--text-primary)]">Name</th>
                                            <th className="px-6 py-4 font-semibold text-[var(--text-primary)]">Category</th>
                                            <th className="px-6 py-4 font-semibold text-[var(--text-primary)]">Group</th>
                                            <th className="px-6 py-4 font-semibold text-[var(--text-primary)]">Status</th>
                                            <th className="px-6 py-4 font-semibold text-[var(--text-primary)]">Contact</th>
                                            <th className="px-6 py-4 font-semibold text-[var(--text-primary)]">Tags</th>
                                            <th className="px-6 py-4 font-semibold text-[var(--text-primary)] text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-[var(--glass-border)]">
                                        {paginatedTalents.map((talent) => (
                                            <tr key={talent.id} className="hover:bg-[var(--glass-bg)] transition-colors">
                                                <td className="px-6 py-4">
                                                    <Link href={`/dashboard/talent-pool/${talent.id}`} className="font-semibold text-[var(--text-primary)] hover:text-[#e8c559]">
                                                        {talent.name}
                                                    </Link>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className={`px-2 py-1 rounded-full text-xs font-medium text-white ${CATEGORY_CONFIG[talent.category as keyof typeof CATEGORY_CONFIG]?.color || "bg-gray-500"}`}>
                                                        {CATEGORY_CONFIG[talent.category as keyof typeof CATEGORY_CONFIG]?.label || talent.category}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className={`text-xs ${GROUP_CONFIG[talent.group_classification as keyof typeof GROUP_CONFIG]?.color.replace('bg-', 'text-')}`}>
                                                        {talent.group_classification}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className={`text-xs font-medium ${STATUS_CONFIG[talent.status as keyof typeof STATUS_CONFIG]?.color}`}>
                                                        {talent.status}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex gap-2">
                                                        {talent.email && (
                                                            <a href={`mailto:${talent.email}`} title={talent.email} className="hover:opacity-80">
                                                                <Mail className="w-4 h-4 text-[var(--text-secondary)]" />
                                                            </a>
                                                        )}
                                                        {talent.linkedin && (
                                                            <a href={talent.linkedin} target="_blank" rel="noopener noreferrer" title="LinkedIn" className="hover:opacity-80">
                                                                <Image src="/LinkedIn_icon.svg.png" alt="LinkedIn" width={16} height={16} className="w-4 h-4 opacity-70" />
                                                            </a>
                                                        )}
                                                        {talent.cv_link && (
                                                            <a href={talent.cv_link} target="_blank" rel="noopener noreferrer" title="View CV" className="hover:opacity-80">
                                                                <FileText className="w-4 h-4 text-blue-500" />
                                                            </a>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex flex-wrap gap-1 max-w-[200px]">
                                                        {talent.tags && talent.tags.slice(0, 2).map((tag, i) => (
                                                            <span key={i} className="text-xs text-[var(--text-secondary)] bg-gray-100 dark:bg-zinc-800 px-1 rounded">#{tag}</span>
                                                        ))}
                                                        {talent.tags && talent.tags.length > 2 && (
                                                            <span className="text-xs text-[var(--text-muted)]">+{talent.tags.length - 2}</span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <div className="flex items-center justify-end gap-2">
                                                        <button
                                                            onClick={() => handleDelete(talent.id)}
                                                            className="p-2 text-[var(--text-secondary)] hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* Pagination */}
                    {filteredTalents.length > 0 && (
                        <div className="flex items-center justify-between mt-6 border-t border-[var(--glass-border)] pt-4">
                            <p className="text-sm text-[var(--text-secondary)]">
                                Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredTalents.length)} of {filteredTalents.length} talents
                            </p>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                    disabled={currentPage === 1}
                                    className="px-3 py-1 rounded-lg border border-[var(--glass-border)] text-[var(--text-secondary)] hover:bg-black/5 dark:hover:bg-white/5 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    Previous
                                </button>
                                <div className="flex items-center gap-1">
                                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                                        <button
                                            key={page}
                                            onClick={() => setCurrentPage(page)}
                                            className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-medium transition-colors ${currentPage === page
                                                ? 'bg-[#e8c559] text-[#171611]'
                                                : 'text-[var(--text-secondary)] hover:bg-black/5 dark:hover:bg-white/5'
                                                }`}
                                        >
                                            {page}
                                        </button>
                                    ))}
                                </div>
                                <button
                                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                    disabled={currentPage === totalPages}
                                    className="px-3 py-1 rounded-lg border border-[var(--glass-border)] text-[var(--text-secondary)] hover:bg-black/5 dark:hover:bg-white/5 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    Next
                                </button>
                            </div>
                        </div>
                    )}
                </>
            )}

            {/* Modal */}
            {showForm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="w-full max-w-2xl bg-white dark:bg-[#1c2120] rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between p-6 border-b border-[var(--glass-border)]">
                            <h2 className="text-xl font-bold text-[var(--text-primary)]">Add New Talent</h2>
                            <button onClick={() => setShowForm(false)} className="p-2 rounded-lg hover:bg-black/10">
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Name */}
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-bold text-[var(--text-primary)] mb-1">Full Name *</label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        className="w-full px-4 py-2 rounded-xl border border-[var(--glass-border)] bg-white dark:bg-[#232b2a] text-[var(--text-primary)]"
                                        placeholder="e.g. John Doe"
                                    />
                                </div>

                                {/* Contact Info */}
                                <div>
                                    <label className="block text-sm font-bold text-[var(--text-primary)] mb-1">Email</label>
                                    <input
                                        type="email"
                                        value={formData.email}
                                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                        className="w-full px-4 py-2 rounded-xl border border-[var(--glass-border)] bg-white dark:bg-[#232b2a] text-[var(--text-primary)]"
                                        placeholder="john@example.com"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-[var(--text-primary)] mb-1">Phone</label>
                                    <input
                                        type="tel"
                                        value={formData.phone}
                                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                        className="w-full px-4 py-2 rounded-xl border border-[var(--glass-border)] bg-white dark:bg-[#232b2a] text-[var(--text-primary)]"
                                        placeholder="+62..."
                                    />
                                </div>

                                {/* Links */}
                                <div>
                                    <label className="block text-sm font-bold text-[var(--text-primary)] mb-1">LinkedIn URL</label>
                                    <input
                                        type="url"
                                        value={formData.linkedin}
                                        onChange={(e) => setFormData({ ...formData, linkedin: e.target.value })}
                                        className="w-full px-4 py-2 rounded-xl border border-[var(--glass-border)] bg-white dark:bg-[#232b2a] text-[var(--text-primary)]"
                                        placeholder="https://linkedin.com/in/..."
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-[var(--text-primary)] mb-1">CV Link</label>
                                    <input
                                        type="url"
                                        value={formData.cv_link}
                                        onChange={(e) => setFormData({ ...formData, cv_link: e.target.value })}
                                        className="w-full px-4 py-2 rounded-xl border border-[var(--glass-border)] bg-white dark:bg-[#232b2a] text-[var(--text-primary)]"
                                        placeholder="https://drive.google.com/..."
                                    />
                                </div>

                                {/* Classification */}
                                <div>
                                    <label className="block text-sm font-bold text-[var(--text-primary)] mb-1">Category</label>
                                    <select
                                        value={formData.category}
                                        onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                        className="w-full px-4 py-2 rounded-xl border border-[var(--glass-border)] bg-white dark:bg-[#232b2a] text-[var(--text-primary)]"
                                    >
                                        {Object.keys(CATEGORY_CONFIG).map(cat => (
                                            <option key={cat} value={cat}>{cat}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-[var(--text-primary)] mb-1">Group</label>
                                    <select
                                        value={formData.group_classification}
                                        onChange={(e) => setFormData({ ...formData, group_classification: e.target.value })}
                                        className="w-full px-4 py-2 rounded-xl border border-[var(--glass-border)] bg-white dark:bg-[#232b2a] text-[var(--text-primary)]"
                                    >
                                        {Object.keys(GROUP_CONFIG).map(grp => (
                                            <option key={grp} value={grp}>{grp}</option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-bold text-[var(--text-primary)] mb-1">Status</label>
                                    <select
                                        value={formData.status}
                                        onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                                        className="w-full px-4 py-2 rounded-xl border border-[var(--glass-border)] bg-white dark:bg-[#232b2a] text-[var(--text-primary)]"
                                    >
                                        {Object.keys(STATUS_CONFIG).map(stat => (
                                            <option key={stat} value={stat}>{stat}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-[var(--text-primary)] mb-1">First Met Date</label>
                                    <input
                                        type="date"
                                        value={formData.first_met_date}
                                        onChange={(e) => setFormData({ ...formData, first_met_date: e.target.value })}
                                        className="w-full px-4 py-2 rounded-xl border border-[var(--glass-border)] bg-white dark:bg-[#232b2a] text-[var(--text-primary)]"
                                    />
                                </div>

                                {/* Tags */}
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-bold text-[var(--text-primary)] mb-1">Skills / Tags</label>
                                    <div className="flex gap-2 mb-2">
                                        <input
                                            type="text"
                                            value={tagInput}
                                            onChange={(e) => setTagInput(e.target.value)}
                                            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
                                            className="flex-1 px-4 py-2 rounded-xl border border-[var(--glass-border)] bg-white dark:bg-[#232b2a] text-[var(--text-primary)]"
                                            placeholder="Type tag and press Enter"
                                        />
                                        <button
                                            type="button"
                                            onClick={handleAddTag}
                                            className="px-4 py-2 rounded-xl bg-gray-100 dark:bg-zinc-800 text-[var(--text-primary)] hover:bg-gray-200 dark:hover:bg-zinc-700"
                                        >
                                            Add
                                        </button>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        {formData.tags.map((tag, i) => (
                                            <span key={i} className="flex items-center gap-1 px-3 py-1 rounded-full bg-[#e8c559]/10 text-[#e8c559] border border-[#e8c559]/20 text-sm">
                                                #{tag}
                                                <button type="button" onClick={() => handleRemoveTag(tag)} className="hover:text-red-500">
                                                    <X className="w-3 h-3" />
                                                </button>
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div className="flex justify-end gap-3 pt-6 border-t border-[var(--glass-border)]">
                                <button
                                    type="button"
                                    onClick={() => setShowForm(false)}
                                    className="px-6 py-2 rounded-xl border border-[var(--glass-border)] text-[var(--text-primary)] hover:bg-black/5 dark:hover:bg-white/5"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-6 py-2 rounded-xl bg-[#e8c559] text-[#171611] font-bold hover:bg-[#d4b44e]"
                                >
                                    Save Talent
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

