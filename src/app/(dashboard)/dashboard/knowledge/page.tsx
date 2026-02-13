"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import Image from "next/image";
import { BookOpen } from "lucide-react";

// Access Levels - from basic to confidential
const ACCESS_LEVELS = [
    { id: "all", label: "All Levels", icon: "🔓", color: "text-gray-500", badgeClass: "bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-white/10" },
    { id: "intern", label: "Intern", icon: "🟢", color: "text-green-500", description: "Basic materials for everyone", badgeClass: "bg-green-100 text-green-700 border-green-200 dark:bg-green-500/20 dark:text-green-300 dark:border-green-500/30" },
    { id: "staff", label: "Staff", icon: "🔵", color: "text-blue-500", description: "Standard procedures", badgeClass: "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-500/20 dark:text-blue-300 dark:border-blue-500/30" },
    { id: "senior", label: "Senior", icon: "🟠", color: "text-orange-500", description: "Confidential materials", badgeClass: "bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-500/20 dark:text-orange-300 dark:border-orange-500/30" },
    { id: "owner", label: "Owner Only", icon: "🔴", color: "text-red-500", description: "Highly confidential", badgeClass: "bg-red-100 text-red-700 border-red-200 dark:bg-red-500/20 dark:text-red-300 dark:border-red-500/30" },
];

// Resource Types (Unified Category/Type)
const RESOURCE_TYPES = [
    { id: "all", label: "All Types", icon: "📚" },
    { id: "video", label: "Video", icon: "🎬" },
    { id: "document", label: "Document", icon: "📄" },
    { id: "link", label: "Link", icon: "🔗" },
    { id: "mom", label: "MoM", icon: "📝" },
];

// Document Subtypes (shown when type === 'document')
const DOCUMENT_SUBTYPES = [
    { id: "sop", label: "SOP", icon: "📋" },
    { id: "ebook", label: "E-Book", icon: "📖" },
    { id: "template", label: "Template & Guide", icon: "📑" },
    { id: "whitepaper", label: "Whitepaper & Research Paper", icon: "📄" },
    { id: "other", label: "Lainnya", icon: "📁" },
];

// Role-based filters
const ROLE_FILTERS = [
    { id: "all", label: "All Roles", icon: "👥" },
    { id: "bisdev", label: "Business Development", icon: "📈" },
    { id: "sales", label: "Marketing & Sales", icon: "🎯" },
    { id: "analyst", label: "Analyst", icon: "📊" },
    { id: "hr", label: "HR", icon: "👥" },
];

export interface KnowledgeResource {
    id: string;
    title: string;
    description: string;
    type: "document" | "video" | "link" | "mom";
    document_subtype?: "sop" | "ebook" | "template" | "whitepaper" | "other" | null;
    resource_url: string;
    thumbnail_url?: string | null;
    min_access_level: "intern" | "staff" | "senior" | "owner";
    target_roles: string[];
    tags?: string[];
    created_by?: string;
    created_at?: string;
    // Library Fields
    is_library_item?: boolean;
    stock_total?: number;
    current_borrowers?: { user_id: string; user_name: string; borrowed_at: string }[];
    // Computed/UI fields
    addedBy?: string;
    addedDate?: string;
    fileSize?: string;
    duration?: string;
    progress?: number;
}

const DEFAULT_THUMBNAIL = "/daria-nepriakhina-xY55bL5mZAM-unsplash.jpg";

const getThumbnail = (url?: string | null) => {
    if (!url || url.trim() === "" || url === "null" || url === "undefined") {
        return DEFAULT_THUMBNAIL;
    }
    // Simple extension check or assume valid if strictly non-empty
    // But let's check if it looks like a URL
    try {
        new URL(url);
        return url;
    } catch {
        return DEFAULT_THUMBNAIL;
    }
};

const getTypeBadgeClass = (type: string) => {
    switch (type) {
        case 'video': return "bg-red-100 text-red-700 border-red-200 dark:bg-red-500/20 dark:text-red-300 dark:border-red-500/30";
        case 'document': return "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-500/20 dark:text-blue-300 dark:border-blue-500/30";
        case 'link': return "bg-green-100 text-green-700 border-green-200 dark:bg-green-500/20 dark:text-green-300 dark:border-green-500/30";
        case 'mom': return "bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-500/20 dark:text-purple-300 dark:border-purple-500/30";
        default: return "bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-500/20 dark:text-gray-300 dark:border-gray-500/30";
    }
};

const getSubtypeBadgeClass = (subtype: string) => {
    switch (subtype) {
        case 'sop': return "bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-500/20 dark:text-orange-300 dark:border-orange-500/30";
        case 'ebook': return "bg-indigo-100 text-indigo-700 border-indigo-200 dark:bg-indigo-500/20 dark:text-indigo-300 dark:border-indigo-500/30";
        case 'template': return "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/30";
        case 'whitepaper': return "bg-cyan-100 text-cyan-700 border-cyan-200 dark:bg-cyan-500/20 dark:text-cyan-300 dark:border-cyan-500/30";
        default: return "bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-500/20 dark:text-gray-300 dark:border-gray-500/30";
    }
};

const isValidUrl = (string: string) => {
    try {
        new URL(string);
        return true;
    } catch (_) {
        return false;
    }
};

// Parse comma/space separated tags string into clean array
const parseTags = (input: string): string[] => {
    if (!input.trim()) return [];
    return input
        .split(/[,\s]+/)
        .map(t => t.replace(/^#/, '').trim())
        .filter(t => t.length > 0);
};

// --- Components ---

// Detail Popup Modal
function ResourceDetailModal({
    resource,
    isOpen,
    onClose,
    canManage,
    onEdit,
    onDelete,
    onBorrow,
    onReturn,
    currentUserId
}: {
    resource: KnowledgeResource | null;
    isOpen: boolean;
    onClose: () => void;
    canManage: boolean;
    onEdit: (r: KnowledgeResource) => void;
    onDelete: (id: string) => void;
    onBorrow: (r: KnowledgeResource) => void;
    onReturn: (r: KnowledgeResource) => void;
    currentUserId?: string;
}) {
    if (!isOpen || !resource) return null;

    const accessLevel = ACCESS_LEVELS.find(l => l.id === resource.min_access_level);
    const totalStock = resource.stock_total || 0;
    const currentBorrowers = resource.current_borrowers || [];
    const availableStock = Math.max(0, totalStock - currentBorrowers.length);
    const isOut = availableStock === 0;
    const isBorrowing = currentBorrowers.some(b => b.user_id === currentUserId);

    const handleAction = () => {
        if (resource.resource_url) {
            window.open(resource.resource_url, '_blank');
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white dark:bg-[#171611] border border-gray-200 dark:border-[var(--glass-border)] rounded-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh] shadow-[0_0_50px_rgba(0,0,0,0.5)]">
                {/* Header Image / Thumbnail */}
                <div className="relative aspect-video w-full bg-gray-100 dark:bg-black">
                    <Image
                        src={getThumbnail(resource.thumbnail_url)}
                        alt={resource.title}
                        fill
                        className="object-cover opacity-100 dark:opacity-80"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-white dark:from-[#171611] to-transparent" />
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 p-2 rounded-full bg-black/50 hover:bg-black/70 text-white transition-colors"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>

                    {/* Type & Access Badge */}
                    <div className="absolute top-4 left-4 flex gap-2 flex-wrap">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium backdrop-blur-md flex items-center gap-1 border uppercase tracking-wider ${getTypeBadgeClass(resource.type)}`}>
                            {resource.type}
                        </span>
                        {resource.type === 'document' && resource.document_subtype && (
                            <span className={`px-3 py-1 rounded-full text-xs font-medium backdrop-blur-md flex items-center gap-1 border uppercase tracking-wider ${getSubtypeBadgeClass(resource.document_subtype)}`}>
                                {DOCUMENT_SUBTYPES.find(s => s.id === resource.document_subtype)?.label || resource.document_subtype}
                            </span>
                        )}
                        <span className={`px-3 py-1 rounded-full text-xs font-medium backdrop-blur-md flex items-center gap-1 border ${accessLevel?.badgeClass || 'bg-gray-500 text-white'}`}>
                            {accessLevel?.icon} <span className="hidden sm:inline">{accessLevel?.label}</span>
                        </span>
                    </div>
                </div>

                {/* Content */}
                <div className="p-8 space-y-6 overflow-y-auto">
                    <div>
                        <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-2 leading-tight">
                            {resource.title}
                        </h2>
                        <div className="flex items-center gap-4 text-xs text-[var(--text-muted)]">
                            <span>Posted {new Date(resource.created_at || Date.now()).toLocaleDateString()}</span>
                            {resource.is_library_item && (
                                <span className={`${isOut ? 'text-red-500' : 'text-green-500'} font-medium`}>
                                    Stock: {availableStock}/{totalStock}
                                </span>
                            )}
                        </div>
                    </div>

                    <div className="prose prose-invert prose-sm max-w-none text-[var(--text-secondary)]">
                        <p className="whitespace-pre-line">{resource.description}</p>
                    </div>

                    {/* Tags */}
                    {resource.tags && resource.tags.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                            {resource.tags.map((tag, i) => (
                                <span key={i} className="px-2.5 py-1 rounded-full text-xs font-medium bg-[#e8c559]/10 text-[#e8c559] border border-[#e8c559]/20">
                                    #{tag.replace(/^#/, '')}
                                </span>
                            ))}
                        </div>
                    )}

                    {/* Borrower Info */}
                    {resource.is_library_item && currentBorrowers.length > 0 && (
                        <div className="p-4 rounded-xl bg-white/5 border border-white/5">
                            <h4 className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider mb-3">Current Borrowers</h4>
                            <div className="flex flex-wrap gap-2">
                                {currentBorrowers.map((b, i) => (
                                    <div key={i} className="px-3 py-1.5 rounded-lg bg-black/40 border border-white/10 text-xs text-[var(--text-secondary)] flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full bg-[#e8c559]"></div>
                                        {b.user_name}
                                        <span className="text-[var(--text-muted)] opacity-50">
                                            ({new Date(b.borrowed_at).toLocaleDateString()})
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Actions */}
                    <div className="flex items-center justify-between pt-4 border-t border-[var(--glass-border)]">
                        <div className="flex gap-2">
                            {canManage && (
                                <>
                                    <button
                                        onClick={() => {
                                            onEdit(resource);
                                            onClose();
                                        }}
                                        className="p-2 rounded-lg text-[var(--text-muted)] hover:text-[#e8c559] hover:bg-[#e8c559]/10 transition-colors tooltip"
                                        title="Edit"
                                    >
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                                    </button>
                                    <button
                                        onClick={() => {
                                            onDelete(resource.id);
                                            onClose();
                                        }}
                                        className="p-2 rounded-lg text-[var(--text-muted)] hover:text-red-500 hover:bg-red-500/10 transition-colors tooltip"
                                        title="Delete"
                                    >
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                    </button>
                                </>
                            )}
                        </div>

                        <div className="flex gap-3">
                            {/* Library Actions */}
                            {resource.is_library_item && isBorrowing && (
                                <button
                                    onClick={() => onReturn(resource)}
                                    className="px-5 py-2.5 rounded-xl border border-[#e8c559] text-[#e8c559] font-bold text-sm hover:bg-[#e8c559]/10 transition-colors"
                                >
                                    Return Book
                                </button>
                            )}
                            {resource.is_library_item && !isBorrowing && !isOut && (
                                <button
                                    onClick={() => onBorrow(resource)}
                                    className="px-5 py-2.5 rounded-xl border border-[#e8c559] text-[#e8c559] font-bold text-sm hover:bg-[#e8c559]/10 transition-colors"
                                >
                                    Borrow
                                </button>
                            )}

                            {/* View Action */}
                            {resource.resource_url && (
                                <button
                                    onClick={handleAction}
                                    className="px-6 py-2.5 rounded-xl bg-[#e8c559] hover:bg-[#dcb33e] text-[#171611] font-bold text-sm shadow-[0_0_20px_rgba(232,197,89,0.3)] transition-all transform hover:scale-105"
                                >
                                    {resource.type === 'video' ? 'Watch Video' : 'View Resource'}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div >
    );
}

// Video Card Component
function VideoCard({ resource, onViewDetail }: { resource: KnowledgeResource; onViewDetail: (r: KnowledgeResource) => void; }) {
    const accessLevel = ACCESS_LEVELS.find(l => l.id === resource.min_access_level);

    return (
        <div className="glass-panel rounded-xl overflow-hidden hover:border-[#e8c559]/30 transition-all group relative bg-white border border-gray-200 dark:bg-black/20 dark:border-[var(--glass-border)]">
            {/* Thumbnail Section */}
            <div className="relative aspect-video bg-gray-100 dark:bg-black overflow-hidden">
                <Image
                    src={getThumbnail(resource.thumbnail_url)}
                    alt={resource.title}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-300 opacity-100 dark:opacity-80 group-hover:opacity-90 dark:group-hover:opacity-60"
                />

                {/* Play Icon */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="w-12 h-12 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center text-white group-hover:scale-110 transition-transform">
                        <svg className="w-5 h-5 ml-1" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                    </div>
                </div>

                {/* Access Level Badge */}
                <div className={`absolute top-2 left-2 px-2 py-1 rounded text-xs font-medium flex items-center gap-1 backdrop-blur-md border ${accessLevel?.badgeClass || 'bg-gray-500 text-white'}`}>
                    <span>{accessLevel?.icon}</span>
                </div>

                {/* Detail Trigger - Eye Icon */}
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onViewDetail(resource);
                    }}
                    className="absolute bottom-2 right-2 p-2 rounded-full bg-[#e8c559] text-[#171611] opacity-0 group-hover:opacity-100 transition-all transform translate-y-2 group-hover:translate-y-0 shadow-lg z-10 hover:bg-[#dcb33e]"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                </button>
            </div>

            {/* Content Section */}
            <div className="p-4">
                <h3 className="font-semibold text-[var(--text-primary)] line-clamp-1 mb-1 group-hover:text-[#e8c559] transition-colors" title={resource.title}>
                    {resource.title}
                </h3>
                <p className="text-xs text-[var(--text-secondary)] line-clamp-2">
                    {resource.description}
                </p>
            </div>
        </div>
    );
}

// Digital Document Card (Thumbnail-only, like LibraryCard but without stock)
// Used for: All Documents (with subtypes)
function DigitalDocCard({ resource, onViewDetail }: { resource: KnowledgeResource; onViewDetail: (r: KnowledgeResource) => void; }) {
    const accessLevel = ACCESS_LEVELS.find(l => l.id === resource.min_access_level);
    const subtypeInfo = DOCUMENT_SUBTYPES.find(s => s.id === resource.document_subtype);
    const typeIcon = subtypeInfo?.icon || '📄';

    return (
        <div className="flex-shrink-0 w-[160px] flex flex-col group h-full relative">
            {/* Cover Thumbnail */}
            <div className="relative aspect-[2/3] rounded-lg overflow-hidden shadow-lg mb-3 bg-gray-100 dark:bg-black/40 border border-gray-200 dark:border-[var(--glass-border)] group-hover:border-[#e8c559]/50 transition-all group-hover:-translate-y-1">
                <Image
                    src={getThumbnail(resource.thumbnail_url)}
                    alt={resource.title}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-300"
                />

                {/* Access Badge */}
                <div className={`absolute top-2 right-2 px-1.5 py-0.5 rounded text-[10px] font-bold backdrop-blur-md border ${accessLevel?.badgeClass || 'bg-gray-500 text-white'}`}>
                    {accessLevel?.icon}
                </div>

                {/* Type Icon (Top Left) */}
                <div className="absolute top-2 left-2 w-7 h-7 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/20">
                    <span className="text-xs">{typeIcon}</span>
                </div>

                {/* Overlay Eye Icon */}
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <button
                        onClick={() => onViewDetail(resource)}
                        className="p-3 rounded-full bg-[#e8c559] text-[#171611] shadow-lg transform scale-90 group-hover:scale-100 transition-transform hover:bg-[#dcb33e]"
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                    </button>
                </div>
            </div>

            {/* Title only, no description */}
            <h4 className="text-sm font-semibold text-[var(--text-primary)] line-clamp-2 leading-tight group-hover:text-[#e8c559] transition-colors" title={resource.title}>
                {resource.title}
            </h4>
        </div>
    );
}

// Simple List Card (No thumbnail, clickable, expandable description)
// Used for: MoM, Useful Links
function SimpleListCard({ resource, onViewDetail }: { resource: KnowledgeResource; onViewDetail: (r: KnowledgeResource) => void; }) {
    const [expanded, setExpanded] = useState(false);
    const accessLevel = ACCESS_LEVELS.find(l => l.id === resource.min_access_level);
    const typeIcon = resource.type === 'mom' ? '📝' : '🔗';
    const descriptionLong = (resource.description || '').length > 120;

    return (
        <div className="glass-panel p-4 rounded-xl hover:border-[#e8c559]/30 transition-all group relative border-l-4 border-l-[#e8c559] bg-white border-y border-r border-gray-200 dark:bg-black/20 dark:border-y-[var(--glass-border)] dark:border-r-[var(--glass-border)]">
            <div className="flex items-start gap-3">
                {/* Type Icon */}
                <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-[#e8c559]/10 flex items-center justify-center text-xl">
                    {typeIcon}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                        <a
                            href={resource.resource_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-semibold text-[var(--text-primary)] group-hover:text-[#e8c559] transition-colors hover:underline cursor-pointer"
                            title={resource.title}
                        >
                            {resource.title}
                        </a>
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${accessLevel?.badgeClass || 'bg-gray-500 text-white'}`}>
                            {accessLevel?.icon}
                        </span>
                    </div>

                    {resource.description && (
                        <div className="text-sm text-[var(--text-secondary)]">
                            <p className={expanded ? '' : 'line-clamp-1'}>
                                {resource.description}
                            </p>
                            {descriptionLong && (
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setExpanded(!expanded);
                                    }}
                                    className="text-xs font-medium text-[#e8c559] hover:underline mt-0.5"
                                >
                                    {expanded ? 'Show Less' : 'View More'}
                                </button>
                            )}
                        </div>
                    )}

                    <div className="flex items-center gap-3 mt-1.5 text-[10px] text-[var(--text-muted)]">
                        <span>{new Date(resource.created_at || '').toLocaleDateString()}</span>
                        {resource.type === 'link' && resource.resource_url && (
                            <span className="truncate max-w-[200px] opacity-60">{resource.resource_url}</span>
                        )}
                    </div>
                </div>

                {/* Eye Icon (detail) */}
                <div className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity self-center">
                    <button
                        onClick={() => onViewDetail(resource)}
                        className="p-2 rounded-full bg-[#e8c559] text-[#171611] shadow-lg hover:bg-[#dcb33e]"
                        title="View Details"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                    </button>
                </div>
            </div>
        </div>
    );
}

// Library Card Component (Portrait Book Style)
function LibraryCard({ resource, onViewDetail, onReturn, currentUserId }: { resource: KnowledgeResource; onViewDetail: (r: KnowledgeResource) => void; onReturn: (r: KnowledgeResource) => void; currentUserId?: string }) {
    const accessLevel = ACCESS_LEVELS.find(l => l.id === resource.min_access_level);
    const thumbnail = resource.thumbnail_url || DEFAULT_THUMBNAIL;
    const totalStock = resource.stock_total || 0;
    const currentBorrowers = resource.current_borrowers || [];
    const availableStock = Math.max(0, totalStock - currentBorrowers.length);
    const isOut = availableStock === 0;
    const isBorrowing = currentBorrowers.some(b => b.user_id === currentUserId);

    return (
        <div className="flex-shrink-0 w-[160px] flex flex-col group h-full relative">
            {/* Book Cover */}
            <div className="relative aspect-[2/3] rounded-lg overflow-hidden shadow-lg mb-3 bg-[#e8c559]/5 border border-[#e8c559]/20 group-hover:border-[#e8c559]/50 transition-all group-hover:-translate-y-1">
                <Image
                    src={getThumbnail(resource.thumbnail_url)}
                    alt={resource.title}
                    fill
                    className="object-cover"
                />

                {/* Access Badge */}
                <div className={`absolute top-2 right-2 px-1.5 py-0.5 rounded text-[10px] font-bold backdrop-blur-md border ${accessLevel?.badgeClass || 'bg-gray-500 text-white'}`}>
                    {accessLevel?.icon}
                </div>

                {/* Overlay Eye Icon */}
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <button
                        onClick={() => onViewDetail(resource)}
                        className="p-3 rounded-full bg-[#e8c559] text-[#171611] shadow-lg transform scale-90 group-hover:scale-100 transition-transform hover:bg-[#dcb33e]"
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                    </button>
                </div>
            </div>

            {/* Title & Info */}
            <h4 className="text-sm font-semibold text-[var(--text-primary)] line-clamp-2 leading-tight mb-1" title={resource.title}>
                {resource.title}
            </h4>

            <div className="flex flex-col gap-1 mt-auto">
                <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded w-fit ${isOut ? 'bg-red-500/10 text-red-500' : 'bg-green-500/10 text-green-500'}`}>
                    Stock: {availableStock}/{totalStock}
                </span>

                {isBorrowing && (
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onReturn(resource);
                        }}
                        className="mt-1 w-full py-1 rounded bg-[#e8c559]/20 text-[#e8c559] text-xs font-bold border border-[#e8c559]/50 hover:bg-[#e8c559] hover:text-[#171611] transition-colors"
                    >
                        Return Book
                    </button>
                )}
            </div>
        </div>
    );
}

export default function KnowledgeHubPage() {
    const { profile } = useAuth();
    const supabase = createClient();
    const [isLoading, setIsLoading] = useState(true);

    const [searchQuery, setSearchQuery] = useState("");
    const [selectedType, setSelectedType] = useState("all");
    const [selectedRole, setSelectedRole] = useState("all");
    const [selectedAccessLevel, setSelectedAccessLevel] = useState("all");
    const [showAddModal, setShowAddModal] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);

    // Detail Modal State
    const [selectedResource, setSelectedResource] = useState<KnowledgeResource | null>(null);
    const [showDetailModal, setShowDetailModal] = useState(false);

    // Resources state
    const [resources, setResources] = useState<KnowledgeResource[]>([]);

    // Load data
    const fetchResources = async () => {
        setIsLoading(true);
        try {
            const { data, error } = await supabase
                .from('knowledge_resources')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;
            setResources(data || []);
        } catch (err: any) {
            console.error("Error fetching resources:", err);
            toast.error("Failed to load resources: " + err.message);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (profile) fetchResources();
    }, [profile]);

    // Form state for Add Resource Modal
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [thumbnailError, setThumbnailError] = useState("");
    const [newResource, setNewResource] = useState({
        type: "document" as "document" | "video" | "link" | "mom",
        documentSubtype: "" as string,
        accessLevel: "intern" as "intern" | "staff" | "senior" | "owner",
        title: "",
        description: "",
        resourceUrl: "",
        thumbnailUrl: "",
        targetRoles: "all",
        tags: [] as string[],
        // Library Features
        isLibraryItem: false,
        stockTotal: 0,
    });
    const [tagInput, setTagInput] = useState("");

    const resetForm = () => {
        setNewResource({
            type: "document",
            documentSubtype: "",
            accessLevel: "intern",
            title: "",
            description: "",
            resourceUrl: "",
            thumbnailUrl: "",
            targetRoles: "all",
            tags: [],
            isLibraryItem: false,
            stockTotal: 0
        });
        setEditingId(null);
        setThumbnailError("");
        setTagInput("");
    };

    const handleEdit = (resource: KnowledgeResource) => {
        setNewResource({
            type: resource.type,
            documentSubtype: resource.document_subtype || "",
            accessLevel: resource.min_access_level,
            title: resource.title,
            description: resource.description,
            resourceUrl: resource.resource_url,
            thumbnailUrl: resource.thumbnail_url || "",
            targetRoles: resource.target_roles.includes('all') ? 'all' : resource.target_roles[0] || 'all',
            tags: resource.tags || [],
            isLibraryItem: resource.is_library_item || false,
            stockTotal: resource.stock_total || 0,
        });
        setEditingId(resource.id);
        setShowAddModal(true);
    };

    const handleAddTag = () => {
        const cleaned = tagInput.replace(/^#/, '').trim();
        if (cleaned && !newResource.tags.includes(cleaned)) {
            setNewResource(prev => ({ ...prev, tags: [...prev.tags, cleaned] }));
        }
        setTagInput("");
    };

    const handleRemoveTag = (tagToRemove: string) => {
        setNewResource(prev => ({ ...prev, tags: prev.tags.filter(t => t !== tagToRemove) }));
    };

    const handleBorrow = async (resource: KnowledgeResource) => {
        if (!profile) return;
        const currentBorrowers = resource.current_borrowers || [];

        const newBorrower = {
            user_id: profile.id,
            user_name: profile.full_name || profile.email,
            borrowed_at: new Date().toISOString()
        };

        const updatedBorrowers = [...currentBorrowers, newBorrower];

        try {
            const { error } = await supabase
                .from('knowledge_resources')
                .update({ current_borrowers: updatedBorrowers })
                .eq('id', resource.id);

            if (error) throw error;
            toast.success("Berhasil meminjam buku!");
            fetchResources();
            // Update selected resource for modal
            if (selectedResource && selectedResource.id === resource.id) {
                setSelectedResource({ ...selectedResource, current_borrowers: updatedBorrowers });
            }
        } catch (err: any) {
            console.error("Error borrowing:", err);
            toast.error("Gagal meminjam buku");
        }
    };

    const handleReturn = async (resource: KnowledgeResource) => {
        if (!profile) return;
        const currentBorrowers = resource.current_borrowers || [];
        const updatedBorrowers = currentBorrowers.filter(b => b.user_id !== profile.id);

        try {
            const { error } = await supabase
                .from('knowledge_resources')
                .update({ current_borrowers: updatedBorrowers })
                .eq('id', resource.id);

            if (error) throw error;
            toast.success("Buku berhasil dikembalikan!");
            fetchResources();
            // Update selected resource for modal
            if (selectedResource && selectedResource.id === resource.id) {
                setSelectedResource({ ...selectedResource, current_borrowers: updatedBorrowers });
            }
        } catch (err: any) {
            console.error("Error returning:", err);
            toast.error("Gagal mengembalikan buku");
        }
    }

    const handleDelete = async (id: string) => {
        if (!confirm("Apakah Anda yakin ingin menghapus resource ini?")) return;
        try {
            const { error } = await supabase.from('knowledge_resources').delete().eq('id', id);
            if (error) throw error;
            toast.success("Resource berhasil dihapus");
            fetchResources();
        } catch (err: any) {
            console.error("Error deleting resource:", err);
            toast.error("Gagal menghapus resource");
        }
    };

    const handleOpenDetail = (resource: KnowledgeResource) => {
        setSelectedResource(resource);
        setShowDetailModal(true);
    };

    // Handle form submission
    const handleAddResource = async () => {
        if (!newResource.title || !newResource.resourceUrl) {
            toast.error("Judul dan URL Resource wajib diisi!");
            return;
        }

        if (newResource.thumbnailUrl && !isValidUrl(newResource.thumbnailUrl)) {
            // Non-blocking warning
            toast.warning("Thumbnail URL mungkin tidak valid, namun tetap disimpan.");
        }

        setIsSubmitting(true);
        try {
            // Use user input URL or null. Default thumbnail logic is handled at render time, not DB.
            let thumbnailUrl = newResource.thumbnailUrl || null;

            if (editingId) {
                // Update existing
                const updateData: any = {
                    title: newResource.title,
                    type: newResource.type,
                    description: newResource.description,
                    resource_url: newResource.resourceUrl,
                    min_access_level: newResource.accessLevel,
                    target_roles: newResource.targetRoles === 'all' ? ['all'] : [newResource.targetRoles],
                    is_library_item: newResource.isLibraryItem,
                    stock_total: newResource.stockTotal,
                };
                // Only include new columns if they have values (graceful if migration not yet applied)
                if (newResource.type === 'document' && newResource.documentSubtype) {
                    updateData.document_subtype = newResource.documentSubtype;
                }
                if (newResource.tags.length > 0) {
                    updateData.tags = newResource.tags;
                }
                // Explicitly update thumbnail (even if empty to clear it)
                updateData.thumbnail_url = thumbnailUrl;

                const { error: updateError } = await supabase
                    .from('knowledge_resources')
                    .update(updateData)
                    .eq('id', editingId);

                if (updateError) throw updateError;
                toast.success("Resource berhasil diperbarui!");
            } else {
                // Insert Resource
                const insertData: any = {
                    title: newResource.title,
                    type: newResource.type,
                    description: newResource.description,
                    resource_url: newResource.resourceUrl,
                    thumbnail_url: thumbnailUrl,
                    min_access_level: newResource.accessLevel,
                    target_roles: newResource.targetRoles === 'all' ? ['all'] : [newResource.targetRoles],
                    is_library_item: newResource.isLibraryItem,
                    stock_total: newResource.stockTotal,
                    created_by: profile?.id,
                };
                // Only include new columns if they have values
                if (newResource.type === 'document' && newResource.documentSubtype) {
                    insertData.document_subtype = newResource.documentSubtype;
                }
                if (newResource.tags.length > 0) {
                    insertData.tags = newResource.tags;
                }

                const { error: insertError } = await supabase
                    .from('knowledge_resources')
                    .insert(insertData);

                if (insertError) throw insertError;
                toast.success("Resource berhasil ditambahkan!");
            }
            setShowAddModal(false);
            resetForm();
            fetchResources();

        } catch (err: any) {
            console.error("Error adding resource:", err?.message || err?.details || JSON.stringify(err));
            toast.error(err?.message || "Gagal menambahkan resource");
        } finally {
            setIsSubmitting(false);
        }
    };

    // Determine the user's effective access level from their profile
    const isIntern = profile?.is_intern || profile?.job_type === 'intern';

    const getUserAccessLevel = (): string => {
        if (!profile) return 'intern';
        // Owner-tier: ceo, super_admin, owner roles
        if (['ceo', 'super_admin', 'owner'].includes(profile.role)) return 'owner';
        // Senior-tier: hr role or senior job levels
        if (profile.role === 'hr') return 'senior';
        // Intern-tier
        if (isIntern) return 'intern';
        // Default employee = staff-tier
        return 'staff';
    };

    const userAccessLevel = getUserAccessLevel();

    // Access level hierarchy for comparison
    const ACCESS_HIERARCHY: Record<string, number> = {
        'intern': 0,
        'staff': 1,
        'senior': 2,
        'owner': 3,
    };

    const userAccessRank = ACCESS_HIERARCHY[userAccessLevel] ?? 0;

    // Filter resources
    const filteredResources = resources.filter((resource) => {
        const lowerSearch = searchQuery.toLowerCase();
        const matchesSearch = resource.title.toLowerCase().includes(lowerSearch) ||
            resource.description?.toLowerCase().includes(lowerSearch) ||
            (resource.tags || []).some(tag => tag.toLowerCase().includes(lowerSearch));

        const matchesType = selectedType === "all" || resource.type === selectedType;
        const matchesAccessLevel = selectedAccessLevel === "all" || resource.min_access_level === selectedAccessLevel;
        const matchesRoleFilter = selectedRole === "all" ||
            (resource.target_roles && resource.target_roles.includes(selectedRole));

        // Access level enforcement: user can only see resources at or below their level
        const resourceAccessRank = ACCESS_HIERARCHY[resource.min_access_level] ?? 0;
        const canAccess = userAccessRank >= resourceAccessRank;

        return matchesSearch && matchesType && matchesRoleFilter && matchesAccessLevel && canAccess;
    });

    const videoResources = filteredResources.filter(r => r.type === "video");
    const libraryResources = filteredResources.filter(r => r.is_library_item);
    const linkResources = filteredResources.filter(r => r.type === "link");
    const momResources = filteredResources.filter(r => r.type === "mom");
    // All documents (including former SOP/Template), excluding library items
    const documentResources = filteredResources.filter(r => r.type === "document" && !r.is_library_item);

    const canManageResource = (resource: KnowledgeResource) => {
        if (!profile) return false;
        // CEO, Super Admin, Owner, or Creator
        if (profile.role === 'ceo' || profile.role === 'super_admin' || profile.role === 'owner') return true;
        return resource.created_by === profile.id;
    };

    return (
        <div className="space-y-8 font-poppins text-[var(--text-primary)]">
            {/* Header & Controls */}
            {/* Header & Controls */}
            <header className="flex flex-col gap-4 md:flex-row md:items-end justify-between">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#e8c559] to-[#b88e22] flex items-center justify-center shadow-lg shadow-[#e8c559]/20">
                        <BookOpen className="h-6 w-6 text-[#171611]" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-[var(--text-primary)]">Knowledge Hub</h1>
                        <p className="text-sm text-[var(--text-secondary)]">Pusat pembelajaran dan sumber daya perusahaan.</p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    {/* Add Resource - Visible to ALL authenticated users */}
                    {profile && (
                        <button
                            onClick={() => {
                                // optional: reset to default type if needed, or keep previous state
                                // setNewResource(prev => ({ ...prev, type: 'document' })); 
                                setShowAddModal(true);
                            }}
                            className="px-5 py-2.5 rounded-xl bg-[#e8c559] hover:bg-[#dcb33e] text-[#171611] font-bold shadow-[0_0_20px_rgba(232,197,89,0.3)] transition-all flex items-center gap-2"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                            Add Resource
                        </button>
                    )}
                </div>
            </header>

            {/* Stats Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                {[
                    { label: 'Total', count: filteredResources.length, icon: '📚', color: 'from-blue-500/20 to-blue-600/10' },
                    { label: 'Videos', count: videoResources.length, icon: '🎬', color: 'from-red-500/20 to-red-600/10' },
                    { label: 'Documents', count: documentResources.length, icon: '📄', color: 'from-indigo-500/20 to-indigo-600/10' },
                    { label: 'Links', count: linkResources.length, icon: '🔗', color: 'from-green-500/20 to-green-600/10' },
                    { label: 'MoM', count: momResources.length, icon: '📝', color: 'from-purple-500/20 to-purple-600/10' },
                ].map(stat => (
                    <div key={stat.label} className={`flex items-center gap-3 p-3 rounded-xl border border-[var(--glass-border)] bg-gradient-to-br ${stat.color} backdrop-blur-sm`}>
                        <span className="text-xl">{stat.icon}</span>
                        <div>
                            <p className="text-lg font-bold text-[var(--text-primary)] leading-none">{stat.count}</p>
                            <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider">{stat.label}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-3">
                {/* Search */}
                <div className="relative min-w-[200px] flex-1">
                    <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                    <input
                        type="text"
                        placeholder="Cari resource atau #tag..."
                        className="w-full pl-9 pr-4 py-2 rounded-lg bg-[var(--card-bg)] border border-[var(--glass-border)] text-sm focus:border-[#e8c559] outline-none placeholder-[var(--text-muted)]"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
                {/* Type Filter */}
                <select
                    className="px-3 py-2 rounded-lg bg-[var(--card-bg)] border border-[var(--glass-border)] text-sm outline-none focus:border-[#e8c559]"
                    value={selectedType}
                    onChange={(e) => setSelectedType(e.target.value)}
                >
                    {RESOURCE_TYPES.map(t => (
                        <option key={t.id} value={t.id}>{t.icon} {t.label}</option>
                    ))}
                </select>
                {/* Access Level Filter */}
                <select
                    className="px-3 py-2 rounded-lg bg-[var(--card-bg)] border border-[var(--glass-border)] text-sm outline-none focus:border-[#e8c559]"
                    value={selectedAccessLevel}
                    onChange={(e) => setSelectedAccessLevel(e.target.value)}
                >
                    {ACCESS_LEVELS.map(l => (
                        <option key={l.id} value={l.id}>{l.icon} {l.label}</option>
                    ))}
                </select>
                {/* Role Filter */}
                <select
                    className="px-3 py-2 rounded-lg bg-[var(--card-bg)] border border-[var(--glass-border)] text-sm outline-none focus:border-[#e8c559]"
                    value={selectedRole}
                    onChange={(e) => setSelectedRole(e.target.value)}
                >
                    {ROLE_FILTERS.map(r => (
                        <option key={r.id} value={r.id}>{r.icon} {r.label}</option>
                    ))}
                </select>
            </div>

            {/* 1. Video Section */}
            {
                videoResources.length > 0 && (
                    <section className="space-y-4">
                        <div className="flex items-center gap-2 mb-4">
                            <span className="text-2xl">🎬</span>
                            <h2 className="text-xl font-bold">Video Pembelajaran</h2>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                            {videoResources.map(resource => (
                                <VideoCard
                                    key={resource.id}
                                    resource={resource}
                                    onViewDetail={handleOpenDetail}
                                />
                            ))}
                        </div>
                    </section>
                )
            }

            {/* 2. Perpustakaan (Fisik) */}
            {
                libraryResources.length > 0 && (
                    <section className="space-y-4">
                        <div className="flex items-center gap-2 mb-4">
                            <span className="text-2xl">📚</span>
                            <h2 className="text-xl font-bold">Perpustakaan (Fisik)</h2>
                        </div>
                        <div className="relative -mx-4 px-4">
                            <div className="overflow-x-auto pb-6 pt-2 hide-scrollbar">
                                <div className="flex gap-6 w-max">
                                    {libraryResources.map(resource => (
                                        <LibraryCard
                                            key={resource.id}
                                            resource={resource}
                                            onReturn={handleReturn}
                                            onViewDetail={handleOpenDetail}
                                            currentUserId={profile?.id}
                                        />
                                    ))}
                                </div>
                            </div>
                            <div className="absolute right-0 top-0 bottom-6 w-24 bg-gradient-to-l from-[var(--background)] to-transparent pointer-events-none" />
                        </div>
                    </section>
                )
            }

            {/* 3. Dokumen Digital — Grouped by Subtype */}
            {
                documentResources.length > 0 && (
                    <section className="space-y-6">
                        <div className="flex items-center gap-2">
                            <span className="text-2xl">📄</span>
                            <h2 className="text-xl font-bold">Dokumen Digital</h2>
                            <span className="ml-2 px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20">
                                {documentResources.length}
                            </span>
                        </div>

                        {/* Render each subtype as its own sub-section */}
                        {DOCUMENT_SUBTYPES.map(subtype => {
                            const subtypeDocs = documentResources.filter(
                                r => r.document_subtype === subtype.id
                            );
                            if (subtypeDocs.length === 0) return null;
                            return (
                                <div key={subtype.id} className="space-y-3">
                                    <div className="flex items-center gap-2 pl-1">
                                        <span className="text-lg">{subtype.icon}</span>
                                        <h3 className="text-base font-semibold text-[var(--text-secondary)]">{subtype.label}</h3>
                                        <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-white/5 text-[var(--text-muted)] border border-[var(--glass-border)]">
                                            {subtypeDocs.length}
                                        </span>
                                    </div>
                                    <div className="relative -mx-4 px-4">
                                        <div className="overflow-x-auto pb-4 pt-1 hide-scrollbar">
                                            <div className="flex gap-6 w-max">
                                                {subtypeDocs.map(resource => (
                                                    <DigitalDocCard
                                                        key={resource.id}
                                                        resource={resource}
                                                        onViewDetail={handleOpenDetail}
                                                    />
                                                ))}
                                            </div>
                                        </div>
                                        <div className="absolute right-0 top-0 bottom-4 w-24 bg-gradient-to-l from-[var(--background)] to-transparent pointer-events-none" />
                                    </div>
                                </div>
                            );
                        })}

                        {/* Uncategorized documents (no subtype) */}
                        {(() => {
                            const uncategorized = documentResources.filter(r => !r.document_subtype);
                            if (uncategorized.length === 0) return null;
                            return (
                                <div className="space-y-3">
                                    <div className="flex items-center gap-2 pl-1">
                                        <span className="text-lg">📁</span>
                                        <h3 className="text-base font-semibold text-[var(--text-secondary)]">Umum</h3>
                                        <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-white/5 text-[var(--text-muted)] border border-[var(--glass-border)]">
                                            {uncategorized.length}
                                        </span>
                                    </div>
                                    <div className="relative -mx-4 px-4">
                                        <div className="overflow-x-auto pb-4 pt-1 hide-scrollbar">
                                            <div className="flex gap-6 w-max">
                                                {uncategorized.map(resource => (
                                                    <DigitalDocCard
                                                        key={resource.id}
                                                        resource={resource}
                                                        onViewDetail={handleOpenDetail}
                                                    />
                                                ))}
                                            </div>
                                        </div>
                                        <div className="absolute right-0 top-0 bottom-4 w-24 bg-gradient-to-l from-[var(--background)] to-transparent pointer-events-none" />
                                    </div>
                                </div>
                            );
                        })()}
                    </section>
                )
            }

            {/* (SOP & Template sections removed — now consolidated under Documents with subtypes) */}

            {/* 6. MoM Section (List format, no thumbnail) */}
            {
                momResources.length > 0 && (
                    <section className="space-y-4">
                        <div className="flex items-center gap-2 mb-4">
                            <span className="text-2xl">📝</span>
                            <h2 className="text-xl font-bold">Minutes of Meeting (MoM)</h2>
                        </div>
                        <div className="space-y-3">
                            {momResources.map(resource => (
                                <SimpleListCard
                                    key={resource.id}
                                    resource={resource}
                                    onViewDetail={handleOpenDetail}
                                />
                            ))}
                        </div>
                    </section>
                )
            }

            {/* 7. Useful Links (List format, no thumbnail) */}
            {
                linkResources.length > 0 && (
                    <section className="space-y-4">
                        <div className="flex items-center gap-2 mb-4">
                            <span className="text-2xl">🔗</span>
                            <h2 className="text-xl font-bold">Useful Links</h2>
                        </div>
                        <div className="space-y-3">
                            {linkResources.map(resource => (
                                <SimpleListCard
                                    key={resource.id}
                                    resource={resource}
                                    onViewDetail={handleOpenDetail}
                                />
                            ))}
                        </div>
                    </section>
                )
            }


            {/* Detail Popup */}
            <ResourceDetailModal
                resource={selectedResource}
                isOpen={showDetailModal}
                onClose={() => setShowDetailModal(false)}
                canManage={selectedResource ? canManageResource(selectedResource) : false}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onBorrow={handleBorrow}
                onReturn={handleReturn}
                currentUserId={profile?.id}
            />


            {/* Add/Edit Modal */}
            {/* Add/Edit Modal */}
            {showAddModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-[#171611] border border-gray-200 dark:border-[var(--glass-border)] rounded-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh] shadow-[0_0_50px_rgba(0,0,0,0.5)]">
                        <div className="p-6 border-b border-gray-200 dark:border-[var(--glass-border)] flex justify-between items-center bg-gray-50 dark:bg-[#171611]">
                            <h2 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-[#e8c559] to-[#dcb33e]">
                                {editingId ? "Edit Resource" : "Add Resource"}
                            </h2>
                            <button onClick={() => setShowAddModal(false)} className="text-[var(--text-muted)] hover:text-gray-900 dark:hover:text-white transition-colors">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>

                        <div className="p-6 overflow-y-auto space-y-6 custom-scrollbar">
                            {/* Form Fields */}
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Judul Resource</label>
                                    <input
                                        type="text"
                                        className="w-full h-10 px-3 rounded-lg border border-gray-200 dark:border-[var(--glass-border)] bg-gray-50 dark:bg-[var(--card-bg)] text-gray-900 dark:text-[var(--text-primary)] focus:border-[#e8c559] outline-none"
                                        value={newResource.title}
                                        onChange={(e) => setNewResource(prev => ({ ...prev, title: e.target.value }))}
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Tipe</label>
                                        <select
                                            className="w-full h-10 px-3 rounded-lg border border-gray-200 dark:border-[var(--glass-border)] bg-gray-50 dark:bg-[var(--card-bg)] text-gray-900 dark:text-[var(--text-primary)] focus:border-[#e8c559] outline-none disabled:opacity-60 disabled:cursor-not-allowed"
                                            value={newResource.type}
                                            onChange={(e) => setNewResource(prev => ({ ...prev, type: e.target.value as any }))}
                                        >
                                            {RESOURCE_TYPES.filter(t => t.id !== 'all').map(t => (
                                                <option key={t.id} value={t.id}>{t.label}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">URL / Link</label>
                                        <input
                                            type="text"
                                            placeholder="https://..."
                                            className="w-full h-10 px-3 rounded-lg border border-gray-200 dark:border-[var(--glass-border)] bg-gray-50 dark:bg-[var(--card-bg)] text-gray-900 dark:text-[var(--text-primary)] focus:border-[#e8c559] outline-none"
                                            value={newResource.resourceUrl}
                                            onChange={(e) => setNewResource(prev => ({ ...prev, resourceUrl: e.target.value }))}
                                        />
                                    </div>
                                </div>

                                {/* Document Subtype (conditional) */}
                                {newResource.type === 'document' && (
                                    <div className="animate-in fade-in slide-in-from-top-2 duration-200">
                                        <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Tipe Dokumen</label>
                                        <select
                                            className="w-full h-10 px-3 rounded-lg border border-gray-200 dark:border-[var(--glass-border)] bg-gray-50 dark:bg-[var(--card-bg)] text-gray-900 dark:text-[var(--text-primary)] focus:border-[#e8c559] outline-none"
                                            value={newResource.documentSubtype}
                                            onChange={(e) => setNewResource(prev => ({ ...prev, documentSubtype: e.target.value }))}
                                        >
                                            <option value="">-- Pilih Subtype --</option>
                                            {DOCUMENT_SUBTYPES.map(s => (
                                                <option key={s.id} value={s.id}>{s.icon} {s.label}</option>
                                            ))}
                                        </select>
                                    </div>
                                )}

                                {/* Tags Input — Add Button Style */}
                                <div>
                                    <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Tags</label>
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            placeholder="Type a tag..."
                                            className="flex-1 h-10 px-3 rounded-lg border border-gray-200 dark:border-[var(--glass-border)] bg-gray-50 dark:bg-[var(--card-bg)] text-gray-900 dark:text-[var(--text-primary)] focus:border-[#e8c559] outline-none"
                                            value={tagInput}
                                            onChange={(e) => setTagInput(e.target.value)}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') {
                                                    e.preventDefault();
                                                    handleAddTag();
                                                }
                                            }}
                                        />
                                        <button
                                            type="button"
                                            onClick={handleAddTag}
                                            className="px-4 h-10 rounded-lg bg-[#e8c559] hover:bg-[#dcb33e] text-[#171611] font-bold text-sm transition-colors flex items-center gap-1 shrink-0"
                                        >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                                            Add
                                        </button>
                                    </div>
                                    {newResource.tags.length > 0 && (
                                        <div className="flex flex-wrap gap-1.5 mt-2">
                                            {newResource.tags.map((tag, i) => (
                                                <span key={i} className="px-2.5 py-1 rounded-full text-xs font-medium bg-[#e8c559]/10 text-[#e8c559] border border-[#e8c559]/20 flex items-center gap-1.5 group/tag">
                                                    #{tag}
                                                    <button
                                                        type="button"
                                                        onClick={() => handleRemoveTag(tag)}
                                                        className="w-3.5 h-3.5 rounded-full bg-[#e8c559]/20 hover:bg-red-500/30 flex items-center justify-center transition-colors"
                                                    >
                                                        <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>
                                                    </button>
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                <div>
                                    <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Deskripsi</label>
                                    <textarea
                                        rows={3}
                                        className="w-full p-3 rounded-lg border border-gray-200 dark:border-[var(--glass-border)] bg-gray-50 dark:bg-[var(--card-bg)] text-gray-900 dark:text-[var(--text-primary)] focus:border-[#e8c559] outline-none resize-none"
                                        value={newResource.description}
                                        onChange={(e) => setNewResource(prev => ({ ...prev, description: e.target.value }))}
                                    />
                                </div>

                                {/* Thumbnail URL Input with Validation & Preview */}
                                <div className="space-y-2">
                                    <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Thumbnail URL (Opsional)</label>
                                    <input
                                        type="text"
                                        placeholder="https://images.unsplash.com/..."
                                        className={`w-full h-10 px-3 rounded-lg border bg-gray-50 dark:bg-[var(--card-bg)] text-gray-900 dark:text-[var(--text-primary)] outline-none ${thumbnailError ? 'border-amber-500 focus:border-amber-500' : 'border-gray-200 dark:border-[var(--glass-border)] focus:border-[#e8c559]'}`}
                                        value={newResource.thumbnailUrl}
                                        onChange={(e) => {
                                            setNewResource(prev => ({ ...prev, thumbnailUrl: e.target.value }));
                                            if (e.target.value && !isValidUrl(e.target.value)) {
                                                setThumbnailError("Format URL mungkin tidak valid (tetap bisa disimpan)");
                                            } else {
                                                setThumbnailError("");
                                            }
                                        }}
                                    />
                                    {thumbnailError && <p className="text-xs text-amber-500">⚠️ {thumbnailError}</p>}

                                    {/* Thumbnail Preview */}
                                    {(newResource.thumbnailUrl && !thumbnailError) && (
                                        <div className="mt-2 relative rounded-lg overflow-hidden border border-gray-200 dark:border-[var(--glass-border)] bg-gray-100 dark:bg-black/20">
                                            <div className={`relative w-full ${newResource.type === 'video' ? 'aspect-video' : 'aspect-[3/4]'} mx-auto max-w-[200px]`}>
                                                {/* Use standard img for preview to handle arbitrary URLs better during input */}
                                                <img
                                                    src={newResource.thumbnailUrl}
                                                    alt="Thumbnail Preview"
                                                    className="w-full h-full object-cover"
                                                    onError={() => setThumbnailError("Gagal memuat gambar dari URL ini")}
                                                />
                                            </div>
                                            <p className="text-center text-[10px] text-[var(--text-muted)] py-1">Preview ({newResource.type === 'video' ? 'Landscape' : 'Portrait'})</p>
                                        </div>
                                    )}
                                </div>

                                {/* Library Options (Only for Docs/MOM) */}
                                {['document', 'mom'].includes(newResource.type) && (
                                    <div className="p-4 rounded-xl bg-[var(--card-bg)] border border-[var(--glass-border)] space-y-4">
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={newResource.isLibraryItem}
                                                onChange={(e) => setNewResource(prev => ({ ...prev, isLibraryItem: e.target.checked }))}
                                                className="w-4 h-4 rounded border-[#e8c559] text-[#e8c559] focus:ring-[#e8c559] bg-[var(--card-bg)]"
                                            />
                                            <span className="text-sm font-medium text-[var(--text-primary)]">Tersedia Offline (Buku Fisik)</span>
                                        </label>

                                        {newResource.isLibraryItem && (
                                            <div className="animate-in fade-in slide-in-from-top-2 duration-200">
                                                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Total Stock</label>
                                                <input
                                                    type="number"
                                                    min="0"
                                                    className="w-full h-10 px-3 rounded-lg border border-gray-200 dark:border-[var(--glass-border)] bg-gray-50 dark:bg-[var(--card-bg)] text-[var(--text-primary)] focus:border-[#e8c559] outline-none"
                                                    value={newResource.stockTotal}
                                                    onChange={(e) => setNewResource(prev => ({ ...prev, stockTotal: parseInt(e.target.value) || 0 }))}
                                                />
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Access Level & Roles */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Akses Minimal</label>
                                        {isIntern ? (
                                            <div className="w-full h-10 px-3 rounded-lg border border-gray-200 dark:border-[var(--glass-border)] bg-gray-100 dark:bg-white/5 text-[var(--text-muted)] flex items-center text-sm cursor-not-allowed">
                                                Intern (Locked)
                                            </div>
                                        ) : (
                                            <select
                                                className="w-full h-10 px-3 rounded-lg border border-gray-200 dark:border-[var(--glass-border)] bg-gray-50 dark:bg-[var(--card-bg)] text-gray-900 dark:text-[var(--text-primary)] focus:border-[#e8c559] outline-none"
                                                value={newResource.accessLevel}
                                                onChange={(e) => setNewResource(prev => ({ ...prev, accessLevel: e.target.value as any }))}
                                            >
                                                {ACCESS_LEVELS.slice(1).map(l => (
                                                    <option key={l.id} value={l.id}>{l.label}</option>
                                                ))}
                                            </select>
                                        )}
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Target Department</label>
                                        <select
                                            className="w-full h-10 px-3 rounded-lg border border-gray-200 dark:border-[var(--glass-border)] bg-gray-50 dark:bg-[var(--card-bg)] text-gray-900 dark:text-[var(--text-primary)] focus:border-[#e8c559] outline-none"
                                            value={newResource.targetRoles}
                                            onChange={(e) => setNewResource(prev => ({ ...prev, targetRoles: e.target.value }))}
                                        >
                                            {ROLE_FILTERS.map(r => (
                                                <option key={r.id} value={r.id}>{r.label}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="p-6 pt-0 flex justify-end gap-3">
                            <button
                                onClick={() => setShowAddModal(false)}
                                className="px-5 py-2 rounded-lg text-sm font-medium text-[var(--text-secondary)] hover:bg-white/5 transition-colors"
                            >
                                Batal
                            </button>
                            <button
                                disabled={isSubmitting}
                                onClick={handleAddResource}
                                className="px-5 py-2 rounded-lg bg-[#e8c559] hover:bg-[#dcb33e] text-[#171611] text-sm font-bold shadow-[0_0_15px_rgba(232,197,89,0.2)] disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isSubmitting ? "Menyimpan..." : (editingId ? "Update Resource" : "Simpan Resource")}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div >
    );
}
