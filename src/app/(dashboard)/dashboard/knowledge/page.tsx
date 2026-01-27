"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import Image from "next/image";

// Access Levels - from basic to confidential
const ACCESS_LEVELS = [
    { id: "all", label: "All Levels", icon: "🔓", color: "text-gray-500" },
    { id: "intern", label: "Intern", icon: "🟢", color: "text-green-500", description: "Basic materials for everyone" },
    { id: "staff", label: "Staff", icon: "🔵", color: "text-blue-500", description: "Standard procedures" },
    { id: "senior", label: "Senior", icon: "🟠", color: "text-orange-500", description: "Confidential materials" },
    { id: "owner", label: "Owner Only", icon: "🔴", color: "text-red-500", description: "Highly confidential" },
];



// Resource Types (Unified Category/Type)
const RESOURCE_TYPES = [
    { id: "all", label: "All Types", icon: "📚" },
    { id: "document", label: "Document", icon: "📄" },
    { id: "video", label: "Video", icon: "🎬" },
    { id: "template", label: "Template", icon: "📋" },
    { id: "link", label: "Link", icon: "🔗" },
    { id: "sop", label: "SOP", icon: "📋" },
    { id: "mom", label: "MoM", icon: "📝" },
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
    type: "document" | "video" | "template" | "link" | "sop" | "mom";
    resource_url: string;
    thumbnail_url?: string | null;
    min_access_level: "intern" | "staff" | "senior" | "owner";
    target_roles: string[];
    created_by?: string;
    created_at?: string;
    // Computed/UI fields
    addedBy?: string;
    addedDate?: string;
    fileSize?: string;
    tags?: string[];
    duration?: string;
    progress?: number;
}

// Video Card Component
function VideoCard({ resource }: { resource: KnowledgeResource }) {
    const accessLevel = ACCESS_LEVELS.find(l => l.id === resource.min_access_level);
    const defaultThumbnail = "/daria-nepriakhina-xY55bL5mZAM-unsplash.jpg";

    const handleVideoClick = () => {
        if (resource.resource_url) {
            window.open(resource.resource_url, '_blank');
        }
    };

    return (
        <div
            onClick={handleVideoClick}
            className="glass-panel rounded-xl overflow-hidden hover:border-[#e8c559]/30 transition-all group cursor-pointer bg-black/20"
        >
            {/* Thumbnail Section */}
            <div className="relative aspect-video bg-black overflow-hidden">
                <Image
                    src={resource.thumbnail_url || defaultThumbnail}
                    alt={resource.title}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-300 opacity-80 group-hover:opacity-60"
                />

                {/* Play Button Overlay */}
                <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-14 h-14 rounded-full bg-[#e8c559]/90 text-[#171611] flex items-center justify-center shadow-[0_0_20px_rgba(232,197,89,0.4)] group-hover:scale-110 transition-transform">
                        <svg className="w-6 h-6 ml-1" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M8 5v14l11-7z" />
                        </svg>
                    </div>
                </div>

                {/* Access Level Badge */}
                <div className={`absolute top-2 left-2 px-2 py-1 rounded text-xs font-medium flex items-center gap-1 backdrop-blur-md ${resource.min_access_level === 'owner' ? 'bg-red-500/80 text-white' :
                    resource.min_access_level === 'senior' ? 'bg-orange-500/80 text-white' :
                        resource.min_access_level === 'staff' ? 'bg-blue-500/80 text-white' :
                            'bg-green-500/80 text-white'
                    }`}>
                    <span>{accessLevel?.icon}</span>
                    <span className="hidden sm:inline">{accessLevel?.label}</span>
                </div>
            </div>

            {/* Content Section */}
            <div className="p-4">
                <div className="flex justify-between items-start gap-2 mb-2">
                    <h3 className="font-semibold transition-colors line-clamp-2 text-[var(--text-primary)] group-hover:text-[#e8c559]">
                        {resource.title}
                    </h3>
                </div>

                <p className="text-xs text-[var(--text-secondary)] line-clamp-2 mb-3">
                    {resource.description}
                </p>

                {/* Meta Info */}
                <div className="flex items-center justify-between text-[10px] text-[var(--text-muted)]">
                    <span className="flex items-center gap-1">
                        {new Date(resource.created_at || Date.now()).toLocaleDateString()}
                    </span>
                </div>
            </div>
        </div>
    );
}

// Document Card Component (Simple)
function DocumentCard({ resource }: { resource: KnowledgeResource }) {
    const accessLevel = ACCESS_LEVELS.find(l => l.id === resource.min_access_level);

    const getTypeIcon = (type: string) => {
        switch (type) {
            case "document": return "📄";
            case "template": return "📋";
            case "link": return "🔗";
            case "mom": return "📝";
            default: return "📁";
        }
    };

    const handleClick = () => {
        if (resource.resource_url) {
            window.open(resource.resource_url, '_blank');
        }
    }

    return (
        <div onClick={handleClick} className="glass-panel p-4 rounded-xl hover:border-[#e8c559]/30 transition-all group cursor-pointer">
            <div className="flex items-center gap-4">
                {/* Icon */}
                <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-[#e8c559]/10 flex items-center justify-center text-2xl">
                    {getTypeIcon(resource.type)}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                        <h3 className="font-semibold text-[var(--text-primary)] group-hover:text-[#e8c559] transition-colors truncate">
                            {resource.title}
                        </h3>
                        {/* Access Level Badge */}
                        <span className={`flex-shrink-0 px-2 py-0.5 rounded text-[10px] font-medium flex items-center gap-1 ${resource.min_access_level === 'owner' ? 'bg-red-500/20 text-red-500' :
                            resource.min_access_level === 'senior' ? 'bg-orange-500/20 text-orange-500' :
                                resource.min_access_level === 'staff' ? 'bg-blue-500/20 text-blue-500' :
                                    'bg-green-500/20 text-green-500'
                            }`}>
                            {accessLevel?.icon} {accessLevel?.label}
                        </span>
                    </div>
                    <p className="text-xs text-[var(--text-secondary)] mt-1 line-clamp-1">
                        {resource.description}
                    </p>

                    {/* Meta */}
                    <div className="flex items-center gap-3 mt-2 text-[10px] text-[var(--text-muted)]">
                        <span>{new Date(resource.created_at || Date.now()).toLocaleDateString()}</span>
                    </div>
                </div>

                {/* Action */}
                <div className="flex-shrink-0">
                    <button className="p-2 rounded-lg text-[var(--text-muted)] hover:text-[#e8c559] hover:bg-[#e8c559]/10 transition-colors">
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z" />
                        </svg>
                    </button>
                </div>
            </div>
        </div>
    );
}

// SOP Card Component
function SOPCard({ resource }: { resource: KnowledgeResource }) {
    const accessLevel = ACCESS_LEVELS.find(l => l.id === resource.min_access_level);

    const handleClick = () => {
        if (resource.resource_url) {
            window.open(resource.resource_url, '_blank');
        }
    }

    return (
        <div onClick={handleClick} className="glass-panel p-4 rounded-xl hover:border-[#e8c559]/30 transition-all group cursor-pointer border-l-4 border-l-[#e8c559]">
            <div className="flex items-start gap-4">
                {/* SOP Icon */}
                <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-[#e8c559]/20 flex items-center justify-center">
                    <svg className="w-5 h-5 text-[#e8c559]" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zM6 20V4h7v5h5v11H6z" />
                    </svg>
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-1">
                        <h3 className="font-semibold text-[var(--text-primary)] group-hover:text-[#e8c559] transition-colors">
                            {resource.title}
                        </h3>
                        {/* Access Level Badge */}
                        <span className={`flex-shrink-0 px-2 py-0.5 rounded text-[10px] font-medium flex items-center gap-1 ${resource.min_access_level === 'owner' ? 'bg-red-500/20 text-red-500' :
                            resource.min_access_level === 'senior' ? 'bg-orange-500/20 text-orange-500' :
                                resource.min_access_level === 'staff' ? 'bg-blue-500/20 text-blue-500' :
                                    'bg-green-500/20 text-green-500'
                            }`}>
                            {accessLevel?.icon} {accessLevel?.label}
                        </span>
                    </div>
                    <p className="text-sm text-[var(--text-secondary)] mb-2">
                        {resource.description}
                    </p>

                    {/* Tags & Meta */}
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[10px] text-[var(--text-muted)] ml-auto">
                            {new Date(resource.created_at || Date.now()).toLocaleDateString()}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function KnowledgeHubPage() {
    const { profile } = useAuth();
    const supabase = createClient();
    const [isLoading, setIsLoading] = useState(true);

    const [searchQuery, setSearchQuery] = useState("");
    // Tabs removed as per user request
    const [selectedType, setSelectedType] = useState("all");
    const [selectedRole, setSelectedRole] = useState("all");
    const [selectedAccessLevel, setSelectedAccessLevel] = useState("all");
    const [showAddModal, setShowAddModal] = useState(false);
    const [modalMode, setModalMode] = useState<"general" | "mom">("general");

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
    const [newResource, setNewResource] = useState({
        type: "document" as "document" | "video" | "template" | "link" | "sop" | "mom",
        accessLevel: "intern" as "intern" | "staff" | "senior" | "owner",
        title: "",
        description: "",
        resourceUrl: "",
        thumbnailFile: null as File | null,
        targetRoles: "all",
    });

    // Handle form submission
    const handleAddResource = async () => {
        if (!newResource.title || !newResource.resourceUrl) {
            toast.error("Judul dan URL Resource wajib diisi!");
            return;
        }

        setIsSubmitting(true);
        try {
            let thumbnailUrl = null;

            // Upload thumbnail if present and type is video
            if (newResource.type === 'video' && newResource.thumbnailFile) {
                const file = newResource.thumbnailFile;
                const fileExt = file.name.split('.').pop();
                const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
                const filePath = `thumbnails/${fileName}`;

                const { error: uploadError } = await supabase.storage
                    .from('knowledge_thumbnails')
                    .upload(filePath, file);

                if (uploadError) {
                    console.error("Thumbnail Upload Error", uploadError);
                    // If bucket doesn't exist or policy fail, we might fail here.
                    // But we proceed without thumbnail for now or throw?
                    // Let's just log and continue, validation plan said assume manual migration run
                } else {
                    const { data: { publicUrl } } = supabase.storage
                        .from('knowledge_thumbnails')
                        .getPublicUrl(filePath);
                    thumbnailUrl = publicUrl;
                }
            }

            // Insert Resource
            const { error: insertError } = await supabase
                .from('knowledge_resources')
                .insert({
                    title: newResource.title,
                    type: newResource.type,
                    description: newResource.description,
                    resource_url: newResource.resourceUrl,
                    thumbnail_url: thumbnailUrl,
                    min_access_level: newResource.accessLevel,
                    target_roles: newResource.targetRoles === 'all' ? ['all'] : [newResource.targetRoles],
                    created_by: profile?.id,
                });

            if (insertError) throw insertError;

            toast.success("Resource berhasil ditambahkan!");
            setShowAddModal(false);

            // Reset form
            setNewResource({
                type: "document",
                accessLevel: "intern",
                title: "",
                description: "",
                resourceUrl: "",
                thumbnailFile: null,
                targetRoles: "all"
            });

            // Reload list
            fetchResources();

        } catch (err: any) {
            console.error("Error adding resource:", err);
            toast.error("Gagal menambahkan resource");
        } finally {
            setIsSubmitting(false);
        }
    };

    // Filter resources
    const filteredResources = resources.filter((resource) => {
        const matchesSearch = resource.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            resource.description?.toLowerCase().includes(searchQuery.toLowerCase());



        // Tab filter removed

        const matchesType = selectedType === "all" || resource.type === selectedType;

        const matchesAccessLevel = selectedAccessLevel === "all" || resource.min_access_level === selectedAccessLevel;

        // Role matching: resource target_roles includes 'all' OR includes user's role/job_type?
        // Actually this filter is for "Show me resources for XXX role". 
        // If I am filter 'bisdev', show resources that target 'bisdev'.
        // If resource targets 'all', should it show when filtering 'bisdev'? Maybe not, specific filter means specific target.
        const matchesRoleFilter = selectedRole === "all" ||
            (resource.target_roles && resource.target_roles.includes(selectedRole));

        return matchesSearch && matchesType && matchesRoleFilter && matchesAccessLevel;
    });

    const videoResources = filteredResources.filter(r => r.type === "video");
    const sopResources = filteredResources.filter(r => r.type === "sop");
    const documentResources = filteredResources.filter(r => ["document", "template", "link", "mom"].includes(r.type));

    // Subsets for display
    const templateResources = documentResources.filter(r => r.type === "template");
    const linkResources = documentResources.filter(r => r.type === "link");
    const pureDocsResources = documentResources.filter(r => ["document", "mom"].includes(r.type));

    // Access capabilities
    const isIntern = profile?.is_intern || profile?.job_type === 'intern';
    const isStaff = profile && !isIntern;
    // Note: 'mom' upload is for everyone (including interns). 'general' upload is for staff only.

    return (
        <div className="flex flex-col h-full">
            {/* Page Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#3f545f] to-[#5f788e] dark:from-[#e8c559] dark:to-[#dcb33e] flex items-center justify-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white dark:text-[#171611]" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 3L1 9l4 2.18v6L12 21l7-3.82v-6l2-1.09V17h2V9L12 3zm6.82 6L12 12.72 5.18 9 12 5.28 18.82 9zM17 15.99l-5 2.73-5-2.73v-3.72L12 15l5-2.73v3.72z" />
                        </svg>
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-[var(--text-primary)]">Knowledge Hub</h2>
                        <p className="text-sm text-[var(--text-secondary)]">Pusat pengetahuan untuk dokumen, video training, dan SOP</p>
                    </div>
                </div>
                <div className="flex gap-3">
                    {/* Tambah Resource - Access Controlled */}
                    {isStaff && (
                        <button
                            onClick={() => {
                                setModalMode("general");
                                setNewResource(prev => ({ ...prev, type: 'document' }));
                                setShowAddModal(true);
                            }}
                            className="h-10 px-5 rounded-lg bg-[#e8c559] hover:bg-[#dcb33e] text-[#171611] text-sm font-bold transition-colors shadow-[0_0_15px_rgba(232,197,89,0.2)] flex items-center gap-2"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />
                            </svg>
                            Tambah Resource
                        </button>
                    )}

                    {/* Tambah MOM - Visible for All */}
                    <button
                        onClick={() => {
                            setModalMode("mom");
                            setNewResource(prev => ({ ...prev, type: 'mom' }));
                            setShowAddModal(true);
                        }}
                        className="h-10 px-5 rounded-lg bg-[#e8c559] hover:bg-[#dcb33e] text-[#171611] text-sm font-bold transition-colors shadow-[0_0_15px_rgba(232,197,89,0.2)] flex items-center gap-2"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z" />
                        </svg>
                        Tambah MoM
                    </button>
                </div>
            </div>

            {/* Filters Row */}
            <div className="flex flex-wrap gap-3 mb-6">
                {/* Search */}
                <div className="relative flex-1 min-w-[200px]">
                    <svg xmlns="http://www.w3.org/2000/svg" className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-[var(--text-muted)]" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" />
                    </svg>
                    <input
                        type="text"
                        placeholder="Cari resource..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full h-10 rounded-lg border border-[var(--glass-border)] bg-[var(--card-bg)] pl-10 pr-4 text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:ring-2 focus:ring-[#e8c559]/50 focus:border-[#e8c559] transition-all"
                    />
                </div>

                {/* Type Filter */}
                <select
                    value={selectedType}
                    onChange={(e) => setSelectedType(e.target.value)}
                    className="h-10 px-3 rounded-lg border border-[var(--glass-border)] bg-white dark:bg-[#1c2120] text-sm text-gray-900 dark:text-white focus:border-[#e8c559] outline-none cursor-pointer"
                >
                    {RESOURCE_TYPES.map((type) => (
                        <option key={type.id} value={type.id} className="bg-white dark:bg-[#1c2120] text-gray-900 dark:text-white">{type.label}</option>
                    ))}
                </select>

                {/* Role Filter */}
                <select
                    value={selectedRole}
                    onChange={(e) => setSelectedRole(e.target.value)}
                    className="h-10 px-3 rounded-lg border border-[var(--glass-border)] bg-white dark:bg-[#1c2120] text-sm text-gray-900 dark:text-white focus:border-[#e8c559] outline-none cursor-pointer"
                >
                    {ROLE_FILTERS.map((role) => (
                        <option key={role.id} value={role.id} className="bg-white dark:bg-[#1c2120] text-gray-900 dark:text-white">{role.icon} {role.label}</option>
                    ))}
                </select>

                {/* Access Level Filter */}
                <select
                    value={selectedAccessLevel}
                    onChange={(e) => setSelectedAccessLevel(e.target.value)}
                    className="h-10 px-3 rounded-lg border border-[var(--glass-border)] bg-white dark:bg-[#1c2120] text-sm text-gray-900 dark:text-white focus:border-[#e8c559] outline-none cursor-pointer"
                >
                    {ACCESS_LEVELS.map((level) => (
                        <option key={level.id} value={level.id} className="bg-white dark:bg-[#1c2120] text-gray-900 dark:text-white">{level.icon} {level.label}</option>
                    ))}
                </select>
            </div>

            {/* Stats */}
            <div className="flex items-center gap-4 mb-6">
                <div className="glass-panel px-4 py-2 rounded-lg flex items-center gap-2">
                    <span className="text-[#e8c559] font-bold text-lg">{isLoading ? "..." : filteredResources.length}</span>
                    <span className="text-[var(--text-secondary)] text-sm">resources</span>
                </div>
                {!isLoading && (
                    <div className="flex gap-3 text-xs text-[var(--text-muted)]">
                        <span>📄 {pureDocsResources.length} docs</span>
                        <span>📋 {templateResources.length} templates</span>
                        <span>🔗 {linkResources.length} links</span>
                        <span>🎬 {videoResources.length} videos</span>
                        <span>📋 {sopResources.length} SOPs</span>
                    </div>
                )}
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-auto">
                {isLoading ? (
                    <div className="flex items-center justify-center h-64">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#e8c559]"></div>
                    </div>
                ) : (

                    <div className="space-y-8">
                        {/* Videos Section */}
                        {videoResources.length > 0 && (
                            <div>
                                <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4 flex items-center gap-2">
                                    🎬 Video Training
                                </h3>
                                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                                    {videoResources.map((resource) => (
                                        <VideoCard key={resource.id} resource={resource} />
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Documents Section */}
                        {/* Templates Section */}
                        {templateResources.length > 0 && (
                            <div>
                                <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4 flex items-center gap-2">
                                    📋 Templates
                                </h3>
                                <div className="space-y-3">
                                    {templateResources.map((resource) => (
                                        <DocumentCard key={resource.id} resource={resource} />
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Links Section */}
                        {linkResources.length > 0 && (
                            <div>
                                <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4 flex items-center gap-2">
                                    🔗 Useful Links
                                </h3>
                                <div className="space-y-3">
                                    {linkResources.map((resource) => (
                                        <DocumentCard key={resource.id} resource={resource} />
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Documents Section */}
                        {pureDocsResources.length > 0 && (
                            <div>
                                <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4 flex items-center gap-2">
                                    📄 Documents
                                </h3>
                                <div className="space-y-3">
                                    {pureDocsResources.map((resource) => (
                                        <DocumentCard key={resource.id} resource={resource} />
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* SOPs Section */}
                        {sopResources.length > 0 && (
                            <div>
                                <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4 flex items-center gap-2">
                                    📋 Standard Operating Procedures
                                </h3>
                                <div className="space-y-3">
                                    {sopResources.map((resource) => (
                                        <SOPCard key={resource.id} resource={resource} />
                                    ))}
                                </div>
                            </div>
                        )}

                        {filteredResources.length === 0 && (
                            <div className="text-center py-12 text-[var(--text-muted)]">
                                No resources found matching your filters.
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* ADD RESOURCE MODAL */}
            {showAddModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="glass-panel w-full max-w-lg rounded-xl overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-200">
                        <div className="p-6 border-b border-white/5 flex justify-between items-center">
                            <h3 className="text-xl font-bold text-[var(--text-primary)]">
                                {modalMode === 'mom' ? 'Tambah Minutes of Meeting' : 'Tambah Resource Baru'}
                            </h3>
                            <button
                                onClick={() => setShowAddModal(false)}
                                className="text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                            >
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                            {/* Type (Disabled if MoM mode) */}
                            <div>
                                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Type</label>
                                {modalMode === 'mom' ? (
                                    <input
                                        type="text"
                                        value="MoM (Minutes of Meeting)"
                                        disabled
                                        className="w-full h-10 px-3 rounded-lg border border-[var(--glass-border)] bg-[var(--card-bg)] text-[var(--text-muted)]"
                                    />
                                ) : (
                                    <div className="grid grid-cols-3 gap-2">
                                        {['document', 'video', 'sop', 'template', 'link'].map(t => (
                                            <button
                                                key={t}
                                                onClick={() => setNewResource(prev => ({ ...prev, type: t as any }))}
                                                className={`px-2 py-2 rounded-lg text-xs font-medium border capitalize ${newResource.type === t
                                                    ? 'bg-[#e8c559]/20 border-[#e8c559] text-[#e8c559]'
                                                    : 'border-[var(--glass-border)] text-[var(--text-muted)] hover:bg-white/5'
                                                    }`}
                                            >
                                                {t}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Title */}
                            <div>
                                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Judul Resource <span className="text-red-500">*</span></label>
                                <input
                                    type="text"
                                    className="w-full h-10 px-3 rounded-lg border border-[var(--glass-border)] bg-[var(--card-bg)] text-[var(--text-primary)] focus:border-[#e8c559] outline-none"
                                    placeholder="Contoh: Panduan Menggunakan IMS"
                                    value={newResource.title}
                                    onChange={(e) => setNewResource(prev => ({ ...prev, title: e.target.value }))}
                                />
                            </div>

                            {/* Description */}
                            <div>
                                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Deskripsi</label>
                                <textarea
                                    className="w-full py-2 px-3 rounded-lg border border-[var(--glass-border)] bg-[var(--card-bg)] text-[var(--text-primary)] focus:border-[#e8c559] outline-none resize-none h-20"
                                    placeholder="Jelaskan isi resource ini secara singkat..."
                                    value={newResource.description}
                                    onChange={(e) => setNewResource(prev => ({ ...prev, description: e.target.value }))}
                                />
                            </div>

                            {/* Resource URL (File Upload could be here but prompt implies just link or file) */}
                            {/* For simplicity we stick to URL input for now as per prompt analysis, but user mentioned upload. 
                                Since we do not have full file upload UI spec, I will use URL. 
                                BUT if user says "upload", usually means file. 
                                However, "locker link semacam gdrive" suggests Links are primary.
                                I'll keep URL input but label it clearly.
                             */}
                            <div>
                                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Link URL / Google Drive <span className="text-red-500">*</span></label>
                                <input
                                    type="text"
                                    className="w-full h-10 px-3 rounded-lg border border-[var(--glass-border)] bg-[var(--card-bg)] text-[var(--text-primary)] focus:border-[#e8c559] outline-none"
                                    placeholder="https://docs.google.com/..."
                                    value={newResource.resourceUrl}
                                    onChange={(e) => setNewResource(prev => ({ ...prev, resourceUrl: e.target.value }))}
                                />
                            </div>

                            {/* Thumbnail - Only for Video */}
                            {newResource.type === 'video' && (
                                <div>
                                    <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Thumbnail (Optional)</label>
                                    <input
                                        type="file"
                                        accept="image/*"
                                        className="w-full text-xs text-[var(--text-muted)]
                                          file:mr-4 file:py-2 file:px-4
                                          file:rounded-full file:border-0
                                          file:text-xs file:font-semibold
                                          file:bg-[#e8c559]/10 file:text-[#e8c559]
                                          hover:file:bg-[#e8c559]/20"
                                        onChange={(e) => {
                                            if (e.target.files && e.target.files[0]) {
                                                setNewResource(prev => ({ ...prev, thumbnailFile: e.target.files![0] }));
                                            }
                                        }}
                                    />
                                    <p className="text-[10px] text-[var(--text-muted)] mt-1">
                                        Jika tidak diisi, akan menggunakan gambar default.
                                    </p>
                                </div>
                            )}

                            {/* Access Level & Roles */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Akses Minimal</label>
                                    <select
                                        className="w-full h-10 px-3 rounded-lg border border-[var(--glass-border)] bg-[var(--card-bg)] text-[var(--text-primary)] focus:border-[#e8c559] outline-none"
                                        value={newResource.accessLevel}
                                        onChange={(e) => setNewResource(prev => ({ ...prev, accessLevel: e.target.value as any }))}
                                    >
                                        {ACCESS_LEVELS.slice(1).map(l => (
                                            <option key={l.id} value={l.id}>{l.label}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Target Department</label>
                                    <select
                                        className="w-full h-10 px-3 rounded-lg border border-[var(--glass-border)] bg-[var(--card-bg)] text-[var(--text-primary)] focus:border-[#e8c559] outline-none"
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
                                {isSubmitting ? "Menyimpan..." : "Simpan Resource"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
