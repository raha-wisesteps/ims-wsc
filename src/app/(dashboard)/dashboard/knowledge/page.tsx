"use client";

import { useState, useEffect } from "react";

// Access Levels - from basic to confidential
const ACCESS_LEVELS = [
    { id: "all", label: "All Levels", icon: "🔓", color: "text-gray-500" },
    { id: "intern", label: "Intern", icon: "🟢", color: "text-green-500", description: "Basic materials for everyone" },
    { id: "staff", label: "Staff", icon: "🔵", color: "text-blue-500", description: "Standard procedures" },
    { id: "senior", label: "Senior", icon: "🟠", color: "text-orange-500", description: "Confidential materials" },
    { id: "owner", label: "Owner Only", icon: "🔴", color: "text-red-500", description: "Highly confidential" },
];

// Tabs for navigation
const TABS = [
    { id: "all", label: "All Resources", icon: "📚" },
    { id: "documents", label: "Documents", icon: "📄" },
    { id: "videos", label: "Videos", icon: "🎬" },
    { id: "sops", label: "SOPs", icon: "📋" },
    { id: "moms", label: "MoMs", icon: "📝" },
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
];

// Mock Resources Data with access levels
const mockResources = [
    // Documents
    {
        id: "1",
        title: "Panduan Penggunaan IMS System",
        type: "document",
        description: "Dokumentasi lengkap cara menggunakan sistem Internal Management System termasuk fitur-fitur utama.",
        fileSize: "5.2 MB",
        addedBy: "Admin IT",
        addedDate: "Dec 20, 2024",
        tags: ["ims", "tutorial", "onboarding"],
        accessLevel: "intern",
        roles: ["all"],
    },
    {
        id: "3",
        title: "Template Laporan Audit",
        type: "template",
        description: "Template standar untuk menyusun laporan audit sesuai format perusahaan.",
        fileSize: "850 KB",
        addedBy: "Budi Santoso",
        addedDate: "Dec 15, 2024",
        tags: ["audit", "template", "laporan"],
        accessLevel: "senior",
        roles: ["analyst"],
    },
    {
        id: "4",
        title: "Link: Portal KAP Indonesia",
        type: "link",
        description: "Portal resmi Kantor Akuntan Publik Indonesia untuk referensi standar audit.",
        url: "https://example.com/kap",
        addedBy: "Sarah Jenkins",
        addedDate: "Dec 10, 2024",
        tags: ["audit", "referensi", "external"],
        accessLevel: "staff",
        roles: ["analyst"],
    },
    {
        id: "6",
        title: "Kebijakan WFH & Hybrid Working",
        type: "document",
        description: "Dokumen kebijakan resmi tentang work from home dan hybrid working arrangements.",
        fileSize: "1.2 MB",
        addedBy: "HR Admin",
        addedDate: "Nov 20, 2024",
        tags: ["policy", "wfh", "hr"],
        accessLevel: "intern",
        roles: ["all"],
    },
    {
        id: "8",
        title: "Link: Perpajakan Indonesia",
        type: "link",
        description: "Link ke portal DJP Online untuk referensi perpajakan.",
        url: "https://djponline.pajak.go.id",
        addedBy: "Finance Team",
        addedDate: "Nov 10, 2024",
        tags: ["tax", "finance", "external"],
        accessLevel: "staff",
        roles: ["analyst"],
    },
    {
        id: "9",
        title: "Template Proposal Project",
        type: "template",
        description: "Template proposal project untuk keperluan bisdev dan pitching klien.",
        fileSize: "2.1 MB",
        addedBy: "BisDev Team",
        addedDate: "Oct 28, 2024",
        tags: ["bisdev", "proposal", "template"],
        accessLevel: "staff",
        roles: ["bisdev", "sales"],
    },
    {
        id: "mom-1",
        title: "MoM Kickoff Meeting Q1 2025",
        type: "mom",
        description: "Catatan pertemuan kickoff strategi awal tahun 2025.",
        fileSize: "950 KB",
        addedBy: "Secretary",
        addedDate: "Jan 10, 2025",
        tags: ["meeting", "kickoff", "mom"],
        accessLevel: "staff",
        roles: ["all"],
    },
    {
        id: "17",
        title: "Financial Projections Template",
        type: "template",
        description: "Template proyeksi keuangan perusahaan - hanya untuk owner.",
        fileSize: "1.5 MB",
        addedBy: "Finance Director",
        addedDate: "Dec 01, 2024",
        tags: ["finance", "projection", "confidential"],
        accessLevel: "owner",
        roles: ["owner"],
    },
    // Videos
    {
        id: "2",
        title: "bagaimana - Gustiwiw",
        type: "video",
        description: "Video pelatihan tentang best practices dalam melakukan audit internal. Pelajari teknik-teknik audit modern.",
        duration: "3:45",
        addedBy: "Admin",
        addedDate: "Jan 19, 2025",
        tags: ["audit", "training", "video"],
        accessLevel: "senior",
        roles: ["analyst"],
        thumbnail: "https://imgsrv2.voi.id/qxhHlohckoBeMEX7_5p_di3nBqNkNE8ji0iAMhmkp3A/auto/1280/853/sm/1/bG9jYWw6Ly8vcHVibGlzaGVycy80OTI5NjEvMjAyNTA3MDcwOTU1LW1haW4uY3JvcHBlZF8xNzUxODU2OTIzLmpwZw.jpg",
        resourceUrl: "https://youtu.be/EX28N1Rskz4?si=pwQ4x0AvaKGJvVKP",
        progress: 0,
    },
    {
        id: "5",
        title: "Onboarding Karyawan Baru",
        type: "video",
        description: "Video orientasi untuk karyawan baru tentang kultur dan prosedur perusahaan. Wajib ditonton oleh semua pegawai baru.",
        duration: "30 min",
        totalLessons: 5,
        addedBy: "HR Team",
        addedDate: "Nov 25, 2024",
        tags: ["onboarding", "hr", "video"],
        accessLevel: "intern",
        roles: ["all"],
        thumbnail: "https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=400",
        progress: 100,
    },
    {
        id: "7",
        title: "Cara Submit Timesheet",
        type: "video",
        description: "Video tutorial langkah demi langkah cara mengisi dan submit timesheet dengan benar.",
        duration: "10 min",
        totalLessons: 3,
        addedBy: "Admin IT",
        addedDate: "Nov 15, 2024",
        tags: ["timesheet", "tutorial", "video"],
        accessLevel: "intern",
        roles: ["all"],
        thumbnail: "https://images.unsplash.com/photo-1611532736597-de2d4265fba3?w=400",
        progress: 0,
    },
    {
        id: "18",
        title: "Advanced Financial Analysis",
        type: "video",
        description: "Kursus lengkap tentang analisis keuangan tingkat lanjut untuk decision making strategis.",
        duration: "2h 15min",
        totalLessons: 12,
        addedBy: "Finance Director",
        addedDate: "Dec 05, 2024",
        tags: ["finance", "analysis", "advanced"],
        accessLevel: "owner",
        roles: ["owner"],
        thumbnail: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=400",
        progress: 25,
    },
    {
        id: "19",
        title: "Client Pitching Masterclass",
        type: "video",
        description: "Teknik pitching klien yang efektif untuk meningkatkan conversion rate bisnis development.",
        duration: "1h 30min",
        totalLessons: 10,
        addedBy: "BisDev Director",
        addedDate: "Nov 28, 2024",
        tags: ["bisdev", "pitching", "sales"],
        accessLevel: "staff",
        roles: ["bisdev", "sales"],
        thumbnail: "https://images.unsplash.com/photo-1557804506-669a67965ba0?w=400",
        progress: 0,
    },
    // SOPs
    {
        id: "10",
        title: "SOP Audit Internal - Prosedur Lengkap",
        type: "sop",
        description: "Panduan lengkap untuk melaksanakan audit internal sesuai standar perusahaan.",
        fileSize: "2.4 MB",
        addedBy: "Andi Pratama",
        addedDate: "Dec 15, 2024",
        tags: ["audit", "internal", "prosedur"],
        accessLevel: "senior",
        roles: ["analyst"],
    },
    {
        id: "11",
        title: "SOP Onboarding Karyawan Baru",
        type: "sop",
        description: "Prosedur standar untuk proses onboarding karyawan baru dari hari pertama hingga minggu ketiga.",
        fileSize: "1.8 MB",
        addedBy: "Sarah Jenkins",
        addedDate: "Nov 20, 2024",
        tags: ["onboarding", "hr", "karyawan baru"],
        accessLevel: "intern",
        roles: ["all"],
    },
    {
        id: "12",
        title: "SOP Pengajuan Reimbursement",
        type: "sop",
        description: "Panduan pengajuan reimbursement termasuk dokumen yang diperlukan dan alur approval.",
        fileSize: "890 KB",
        addedBy: "Michael Chen",
        addedDate: "Dec 01, 2024",
        tags: ["reimbursement", "finance", "approval"],
        accessLevel: "intern",
        roles: ["all"],
    },
    {
        id: "13",
        title: "SOP Proses Rekrutmen End-to-End",
        type: "sop",
        description: "Prosedur rekrutmen dari posting lowongan hingga offering letter.",
        fileSize: "3.1 MB",
        addedBy: "Citra Lestari",
        addedDate: "Nov 05, 2024",
        tags: ["rekrutmen", "hr", "hiring"],
        accessLevel: "staff",
        roles: ["bisdev", "sales", "analyst"],
    },
    {
        id: "14",
        title: "SOP Quality Control Audit Report",
        type: "sop",
        description: "Standar quality control untuk penyusunan dan review laporan audit.",
        fileSize: "1.5 MB",
        addedBy: "Budi Santoso",
        addedDate: "Dec 10, 2024",
        tags: ["audit", "quality", "laporan"],
        accessLevel: "senior",
        roles: ["analyst"],
    },
    {
        id: "15",
        title: "SOP Daily Operations Checklist",
        type: "sop",
        description: "Checklist operasional harian untuk memastikan kelancaran aktivitas kantor.",
        fileSize: "650 KB",
        addedBy: "Eva Wijaya",
        addedDate: "Sep 25, 2024",
        tags: ["operations", "checklist", "harian"],
        accessLevel: "intern",
        roles: ["all"],
    },
    {
        id: "16",
        title: "SOP Proposal & Pitching Klien",
        type: "sop",
        description: "Prosedur standar pembuatan proposal dan pitching untuk klien potensial.",
        fileSize: "2.0 MB",
        addedBy: "BisDev Team",
        addedDate: "Oct 15, 2024",
        tags: ["bisdev", "proposal", "pitching"],
        accessLevel: "staff",
        roles: ["bisdev", "sales"],
    },
];

// Video Card Component (Simple Link)
function VideoCard({ resource }: { resource: typeof mockResources[0] }) {
    const accessLevel = ACCESS_LEVELS.find(l => l.id === resource.accessLevel);

    const handleVideoClick = () => {
        if (resource.resourceUrl) {
            window.open(resource.resourceUrl, '_blank');
        }
    };

    return (
        <div
            onClick={handleVideoClick}
            className="glass-panel rounded-xl overflow-hidden hover:border-[#e8c559]/30 transition-all group cursor-pointer bg-black/20"
        >
            {/* Thumbnail Section */}
            <div className="relative aspect-video bg-black overflow-hidden">
                {resource.thumbnail ? (
                    <img
                        src={resource.thumbnail}
                        alt={resource.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 opacity-80 group-hover:opacity-60"
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gray-800">
                        <span className="text-6xl opacity-50">🎬</span>
                    </div>
                )}

                {/* Play Button Overlay */}
                <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-14 h-14 rounded-full bg-[#e8c559]/90 text-[#171611] flex items-center justify-center shadow-[0_0_20px_rgba(232,197,89,0.4)] group-hover:scale-110 transition-transform">
                        <svg className="w-6 h-6 ml-1" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M8 5v14l11-7z" />
                        </svg>
                    </div>
                </div>

                {/* Access Level Badge */}
                <div className={`absolute top-2 left-2 px-2 py-1 rounded text-xs font-medium flex items-center gap-1 backdrop-blur-md ${resource.accessLevel === 'owner' ? 'bg-red-500/80 text-white' :
                    resource.accessLevel === 'senior' ? 'bg-orange-500/80 text-white' :
                        resource.accessLevel === 'staff' ? 'bg-blue-500/80 text-white' :
                            'bg-green-500/80 text-white'
                    }`}>
                    <span>{accessLevel?.icon}</span>
                    <span className="hidden sm:inline">{accessLevel?.label}</span>
                </div>

                {/* Duration Badge */}
                <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded bg-black/60 text-white text-[10px] font-medium backdrop-blur-sm border border-white/10">
                    {resource.duration}
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
                        👤 {resource.addedBy}
                    </span>
                    <span>{resource.addedDate}</span>
                </div>
            </div>
        </div>
    );
}

// Document Card Component (Simple)
function DocumentCard({ resource }: { resource: typeof mockResources[0] }) {
    const accessLevel = ACCESS_LEVELS.find(l => l.id === resource.accessLevel);

    const getTypeIcon = (type: string) => {
        switch (type) {
            case "document": return "📄";
            case "template": return "📋";
            case "link": return "🔗";
            case "mom": return "📝";
            default: return "📁";
        }
    };

    return (
        <div className="glass-panel p-4 rounded-xl hover:border-[#e8c559]/30 transition-all group cursor-pointer">
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
                        <span className={`flex-shrink-0 px-2 py-0.5 rounded text-[10px] font-medium flex items-center gap-1 ${resource.accessLevel === 'owner' ? 'bg-red-500/20 text-red-500' :
                            resource.accessLevel === 'senior' ? 'bg-orange-500/20 text-orange-500' :
                                resource.accessLevel === 'staff' ? 'bg-blue-500/20 text-blue-500' :
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
                        {resource.fileSize && <span>{resource.fileSize}</span>}
                        <span>{resource.addedDate}</span>
                        <span>{resource.addedBy}</span>
                    </div>
                </div>

                {/* Action */}
                <div className="flex-shrink-0">
                    {resource.type === "link" ? (
                        <button className="p-2 rounded-lg text-[var(--text-muted)] hover:text-blue-500 hover:bg-blue-500/10 transition-colors">
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M19 19H5V5h7V3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2v-7h-2v7zM14 3v2h3.59l-9.83 9.83 1.41 1.41L19 6.41V10h2V3h-7z" />
                            </svg>
                        </button>
                    ) : (
                        <button className="p-2 rounded-lg text-[var(--text-muted)] hover:text-[#e8c559] hover:bg-[#e8c559]/10 transition-colors">
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z" />
                            </svg>
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}

// SOP Card Component
function SOPCard({ resource }: { resource: typeof mockResources[0] }) {
    const accessLevel = ACCESS_LEVELS.find(l => l.id === resource.accessLevel);

    return (
        <div className="glass-panel p-4 rounded-xl hover:border-[#e8c559]/30 transition-all group cursor-pointer border-l-4 border-l-[#e8c559]">
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
                        <span className={`flex-shrink-0 px-2 py-0.5 rounded text-[10px] font-medium flex items-center gap-1 ${resource.accessLevel === 'owner' ? 'bg-red-500/20 text-red-500' :
                            resource.accessLevel === 'senior' ? 'bg-orange-500/20 text-orange-500' :
                                resource.accessLevel === 'staff' ? 'bg-blue-500/20 text-blue-500' :
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
                        {resource.tags.slice(0, 3).map(tag => (
                            <span key={tag} className="text-[10px] px-2 py-0.5 rounded-full bg-[#e8c559]/10 text-[#e8c559]">
                                #{tag}
                            </span>
                        ))}
                        <span className="text-[10px] text-[var(--text-muted)] ml-auto">
                            {resource.fileSize} • {resource.addedDate}
                        </span>
                    </div>
                </div>

                {/* Download Button */}
                <button className="flex-shrink-0 p-2 rounded-lg text-[var(--text-muted)] hover:text-[#e8c559] hover:bg-[#e8c559]/10 transition-colors">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z" />
                    </svg>
                </button>
            </div>
        </div>
    );
}

export default function KnowledgeHubPage() {
    // Mock user for access control (Simulating 'staff' to see Add Resource)
    // Change to 'intern' to test restriction
    const currentUser = { role: "staff" as "intern" | "staff" | "senior" | "owner" };

    const [searchQuery, setSearchQuery] = useState("");
    const [activeTab, setActiveTab] = useState("all");
    const [selectedType, setSelectedType] = useState("all");
    const [selectedRole, setSelectedRole] = useState("all");
    const [selectedAccessLevel, setSelectedAccessLevel] = useState("all");
    const [showAddModal, setShowAddModal] = useState(false);
    const [modalMode, setModalMode] = useState<"general" | "mom">("general");

    // Resources state (starts with mock data)
    const [resources, setResources] = useState(mockResources);

    // Effect to update useState with mock data if mock changes (hot reload support)
    useEffect(() => {
        setResources(mockResources);
    }, []);

    // Form state for Add Resource Modal
    const [newResource, setNewResource] = useState({
        type: "document" as "document" | "video" | "template" | "link" | "sop" | "mom",
        accessLevel: "intern",
        title: "",
        description: "",
        resourceUrl: "",
        thumbnailUrl: "",
        duration: "",
        tags: "",
    });

    // Handle form submission
    const handleAddResource = () => {
        if (!newResource.title || !newResource.resourceUrl) {
            alert("Judul dan URL Resource wajib diisi!");
            return;
        }

        const resourceToAdd = {
            id: String(Date.now()),
            title: newResource.title,
            type: newResource.type,
            // category: newResource.type, // Implicitly same
            description: newResource.description || "No description",
            fileSize: "N/A",
            url: newResource.resourceUrl,
            addedBy: "You",
            addedDate: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
            tags: newResource.tags ? newResource.tags.split(",").map(t => t.trim()).filter(t => t) : [],
            accessLevel: newResource.accessLevel,
            roles: ["all"],
            thumbnail: newResource.thumbnailUrl || "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=400",
            duration: newResource.type === "video" ? (newResource.duration || "N/A") : undefined,
            totalLessons: newResource.type === "video" ? 1 : undefined,
            progress: newResource.type === "video" ? 0 : undefined,
        } as unknown as typeof mockResources[0];

        setResources([resourceToAdd, ...resources]);
        setShowAddModal(false);
        setNewResource({
            type: "document",
            accessLevel: "intern",
            title: "",
            description: "",
            resourceUrl: "",
            thumbnailUrl: "",
            duration: "",
            tags: "",
        });
    };

    // Filter resources based on all criteria
    const filteredResources = resources.filter((resource) => {
        const matchesSearch = resource.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            resource.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
            resource.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));

        const matchesTab = activeTab === "all" ||
            (activeTab === "documents" && ["document", "template", "link", "mom"].includes(resource.type)) ||
            (activeTab === "videos" && resource.type === "video") ||
            (activeTab === "sops" && resource.type === "sop") ||
            (activeTab === "moms" && resource.type === "mom");

        const matchesType = selectedType === "all" || resource.type === selectedType;

        const matchesRole = selectedRole === "all" ||
            !resource.roles ||
            resource.roles.includes("all") ||
            resource.roles.includes(selectedRole);

        const matchesAccessLevel = selectedAccessLevel === "all" || resource.accessLevel === selectedAccessLevel;

        return matchesSearch && matchesTab && matchesType && matchesRole && matchesAccessLevel;
    });

    // Separate resources by type for rendering sections
    const videoResources = filteredResources.filter(r => r.type === "video");
    const sopResources = filteredResources.filter(r => r.type === "sop");
    const documentResources = filteredResources.filter(r => ["document", "template", "link", "mom"].includes(r.type));

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
                    {/* Tambah Resource - Hidden for Interns */}
                    {currentUser.role !== "intern" && (
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

            {/* Tab Navigation */}
            <div className="flex gap-1 p-1 bg-[var(--glass-bg)] rounded-xl mb-6 w-fit">
                {TABS.map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === tab.id
                            ? "bg-[#e8c559] text-[#171611] shadow-sm"
                            : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-white/5"
                            }`}
                    >
                        <span>{tab.icon}</span>
                        <span>{tab.label}</span>
                    </button>
                ))}
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

                {/* Type Filter (Formerly Category) */}
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
                    <span className="text-[#e8c559] font-bold text-lg">{filteredResources.length}</span>
                    <span className="text-[var(--text-secondary)] text-sm">resources</span>
                </div>
                <div className="flex gap-3 text-xs text-[var(--text-muted)]">
                    <span>📄 {documentResources.length} docs</span>
                    <span>🎬 {videoResources.length} videos</span>
                    <span>📋 {sopResources.length} SOPs</span>
                </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-auto">
                {/* All Tab - Mixed content */}
                {activeTab === "all" && (
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
                        {documentResources.length > 0 && (
                            <div>
                                <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4 flex items-center gap-2">
                                    📄 Documents & Templates
                                </h3>
                                <div className="space-y-3">
                                    {documentResources.map((resource) => (
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

                {/* Documents Tab */}
                {activeTab === "documents" && (
                    <div className="space-y-3">
                        {documentResources.map((resource) => (
                            <DocumentCard key={resource.id} resource={resource} />
                        ))}
                        {documentResources.length === 0 && (
                            <div className="text-center py-12 text-[var(--text-muted)]">
                                No documents found matching your filters.
                            </div>
                        )}
                    </div>
                )}

                {/* Videos Tab */}
                {activeTab === "videos" && (
                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                        {videoResources.map((resource) => (
                            <VideoCard key={resource.id} resource={resource} />
                        ))}
                        {videoResources.length === 0 && (
                            <div className="col-span-full text-center py-12 text-[var(--text-muted)]">
                                No videos found matching your filters.
                            </div>
                        )}
                    </div>
                )}

                {/* SOPs Tab */}
                {activeTab === "sops" && (
                    <div className="space-y-3">
                        {sopResources.map((resource) => (
                            <SOPCard key={resource.id} resource={resource} />
                        ))}
                        {sopResources.length === 0 && (
                            <div className="text-center py-12 text-[var(--text-muted)]">
                                No SOPs found matching your filters.
                            </div>
                        )}
                    </div>
                )}

                {/* MoMs Tab */}
                {activeTab === "moms" && (
                    <div className="space-y-3">
                        {filteredResources.filter(r => r.type === "mom").map((resource) => (
                            <DocumentCard key={resource.id} resource={resource} />
                        ))}
                        {filteredResources.filter(r => r.type === "mom").length === 0 && (
                            <div className="text-center py-12 text-[var(--text-muted)]">
                                No MoMs found matching your filters.
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Add Resource Modal - Functional */}
            {showAddModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="glass-panel w-full max-w-lg rounded-2xl p-6 max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-bold text-[var(--text-primary)]">Tambah Resource Baru</h2>
                            <button
                                onClick={() => setShowAddModal(false)}
                                className="p-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 text-[var(--text-muted)]"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
                                </svg>
                            </button>
                        </div>

                        <div className="space-y-4">
                            {/* Resource Type Selection */}
                            <div>
                                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">Tipe / Kategori Resource</label>
                                <div className="grid grid-cols-3 gap-2">
                                    {RESOURCE_TYPES.filter(t => {
                                        if (modalMode === 'mom') return t.id === 'mom';
                                        return ['document', 'video', 'sop'].includes(t.id);
                                    }).map((type) => (
                                        <button
                                            key={type.id}
                                            type="button"
                                            onClick={() => setNewResource({ ...newResource, type: type.id as any })}
                                            className={`p-3 rounded-lg border text-center transition-all flex flex-col items-center gap-1 ${newResource.type === type.id
                                                ? "border-[#e8c559] bg-[#e8c559]/10"
                                                : "border-[var(--glass-border)] hover:border-[#e8c559]/50"
                                                }`}
                                        >
                                            <span className="text-xl">{type.icon}</span>
                                            <span className={`text-xs block ${newResource.type === type.id ? "text-[#e8c559] font-bold" : "text-[var(--text-secondary)]"}`}>
                                                {type.label}
                                            </span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Access Level (Hidden for MoM, defaults to Intern/All) */}
                            {modalMode !== 'mom' && (
                                <div>
                                    <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Access Level</label>
                                    <select
                                        value={newResource.accessLevel}
                                        onChange={(e) => setNewResource({ ...newResource, accessLevel: e.target.value })}
                                        className="w-full p-3 rounded-lg border border-[var(--glass-border)] bg-white dark:bg-[#1c2120] text-gray-900 dark:text-white focus:border-[#e8c559] outline-none"
                                    >
                                        {ACCESS_LEVELS.filter(l => l.id !== "all").map((level) => (
                                            <option key={level.id} value={level.id} className="bg-white dark:bg-[#1c2120]">{level.icon} {level.label}</option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            {/* Title */}
                            <div>
                                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Judul <span className="text-red-500">*</span></label>
                                <input
                                    type="text"
                                    value={newResource.title}
                                    onChange={(e) => setNewResource({ ...newResource, title: e.target.value })}
                                    className="w-full p-3 rounded-lg border border-[var(--glass-border)] bg-white dark:bg-[#1c2120] text-gray-900 dark:text-white focus:border-[#e8c559] outline-none"
                                    placeholder="Masukkan judul resource"
                                />
                            </div>

                            {/* Description */}
                            <div>
                                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Deskripsi</label>
                                <textarea
                                    value={newResource.description}
                                    onChange={(e) => setNewResource({ ...newResource, description: e.target.value })}
                                    className="w-full p-3 rounded-lg border border-[var(--glass-border)] bg-white dark:bg-[#1c2120] text-gray-900 dark:text-white focus:border-[#e8c559] outline-none resize-none"
                                    rows={2}
                                    placeholder="Deskripsi singkat resource"
                                />
                            </div>

                            {/* Resource URL */}
                            <div>
                                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                                    URL Resource <span className="text-red-500">*</span>
                                    <span className="text-xs text-[var(--text-muted)] ml-1">
                                        (Link ke {newResource.type})
                                    </span>
                                </label>
                                <input
                                    type="url"
                                    value={newResource.resourceUrl}
                                    onChange={(e) => setNewResource({ ...newResource, resourceUrl: e.target.value })}
                                    className="w-full p-3 rounded-lg border border-[var(--glass-border)] bg-white dark:bg-[#1c2120] text-gray-900 dark:text-white focus:border-[#e8c559] outline-none"
                                    placeholder="https://..."
                                />
                            </div>

                            {/* Thumbnail URL */}
                            <div>
                                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                                    URL Thumbnail
                                    <span className="text-xs text-[var(--text-muted)] ml-1">(Opsional - URL gambar preview)</span>
                                </label>
                                <input
                                    type="url"
                                    value={newResource.thumbnailUrl}
                                    onChange={(e) => setNewResource({ ...newResource, thumbnailUrl: e.target.value })}
                                    className="w-full p-3 rounded-lg border border-[var(--glass-border)] bg-white dark:bg-[#1c2120] text-gray-900 dark:text-white focus:border-[#e8c559] outline-none"
                                    placeholder="https://... (gambar preview)"
                                />
                            </div>

                            {/* Duration (only for video) */}
                            {newResource.type === "video" && (
                                <div>
                                    <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Durasi Video</label>
                                    <input
                                        type="text"
                                        value={newResource.duration}
                                        onChange={(e) => setNewResource({ ...newResource, duration: e.target.value })}
                                        className="w-full p-3 rounded-lg border border-[var(--glass-border)] bg-white dark:bg-[#1c2120] text-gray-900 dark:text-white focus:border-[#e8c559] outline-none"
                                        placeholder="contoh: 45 min atau 1h 30m"
                                    />
                                </div>
                            )}

                            {/* Tags */}
                            <div>
                                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                                    Tags
                                    <span className="text-xs text-[var(--text-muted)] ml-1">(pisahkan dengan koma)</span>
                                </label>
                                <input
                                    type="text"
                                    value={newResource.tags}
                                    onChange={(e) => setNewResource({ ...newResource, tags: e.target.value })}
                                    className="w-full p-3 rounded-lg border border-[var(--glass-border)] bg-white dark:bg-[#1c2120] text-gray-900 dark:text-white focus:border-[#e8c559] outline-none"
                                    placeholder="contoh: training, onboarding, tutorial"
                                />
                            </div>

                            {/* Action Buttons */}
                            <div className="flex gap-3 mt-6">
                                <button
                                    onClick={() => setShowAddModal(false)}
                                    className="flex-1 px-4 py-3 rounded-lg border border-[var(--glass-border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] font-medium transition-colors"
                                >
                                    Batal
                                </button>
                                <button
                                    onClick={handleAddResource}
                                    className="flex-1 px-4 py-3 rounded-lg bg-[#e8c559] hover:bg-[#dcb33e] text-[#171611] font-bold transition-colors"
                                >
                                    Simpan Resource
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div >
    );
}
