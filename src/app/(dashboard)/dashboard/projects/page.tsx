"use client";

import { useState } from "react";
import Link from "next/link";

// Status configurations
const STATUS_CONFIG = {
    active: { label: "Active", bgClass: "bg-emerald-500/10", textClass: "text-emerald-600 dark:text-emerald-400", borderClass: "border-emerald-500/20", dotClass: "bg-emerald-500", animate: true },
    review: { label: "In Review", bgClass: "bg-amber-500/10", textClass: "text-amber-600 dark:text-amber-400", borderClass: "border-amber-500/20", dotClass: "bg-amber-500", animate: false },
    planning: { label: "Planning", bgClass: "bg-blue-500/10", textClass: "text-blue-600 dark:text-blue-400", borderClass: "border-blue-500/20", dotClass: "bg-blue-500", animate: false },
    completed: { label: "Completed", bgClass: "bg-gray-500/10", textClass: "text-gray-600 dark:text-gray-400", borderClass: "border-gray-500/20", dotClass: "bg-gray-500", animate: false },
    onhold: { label: "On Hold", bgClass: "bg-rose-500/10", textClass: "text-rose-600 dark:text-rose-400", borderClass: "border-rose-500/20", dotClass: "bg-rose-500", animate: false },
};

type ProjectStatus = keyof typeof STATUS_CONFIG;

interface Helper {
    name: string;
    startDate: string;
    endDate: string;
    color: string;
}

interface Project {
    id: string;
    name: string;
    status: ProjectStatus;
    progress: number;
    dueDate: string;
    expectedFinishDate: string;
    lead: { name: string; initials: string };
    team: { name: string; initials: string }[];
    helpers: Helper[];
}

// Mock data
const mockProjects: Project[] = [
    {
        id: "1",
        name: "Project ABC - Audit PT Maju Jaya",
        status: "active",
        progress: 75,
        dueDate: "Oct 24, 2024",
        expectedFinishDate: "Oct 20, 2024",
        lead: { name: "Andi Pratama", initials: "AP" },
        team: [
            { name: "Dewi", initials: "DW" },
            { name: "Eko", initials: "EK" },
            { name: "Fitri", initials: "FT" },
        ],
        helpers: [
            { name: "Budi", startDate: "Oct 1, 2024", endDate: "Oct 5, 2024", color: "indigo" },
            { name: "Gita", startDate: "Oct 10, 2024", endDate: "Oct 12, 2024", color: "pink" },
        ],
    },
    {
        id: "2",
        name: "Q4 Recruitment Drive - Tech Division",
        status: "review",
        progress: 92,
        dueDate: "Nov 01, 2024",
        expectedFinishDate: "Oct 30, 2024",
        lead: { name: "Sarah Jenkins", initials: "SJ" },
        team: [
            { name: "Tom", initials: "TM" },
            { name: "Jerry", initials: "JR" },
        ],
        helpers: [],
    },
    {
        id: "3",
        name: "Annual Employee Satisfaction Survey",
        status: "planning",
        progress: 15,
        dueDate: "Dec 15, 2024",
        expectedFinishDate: "Dec 10, 2024",
        lead: { name: "Michael Chen", initials: "MC" },
        team: [
            { name: "Lisa", initials: "LS" },
            { name: "Mark", initials: "MK" },
            { name: "Nina", initials: "NN" },
        ],
        helpers: [
            { name: "Kevin", startDate: "Nov 20, 2024", endDate: "Nov 30, 2024", color: "cyan" },
        ],
    },
    {
        id: "4",
        name: "Digital Transformation Phase 2",
        status: "active",
        progress: 45,
        dueDate: "Jan 30, 2025",
        expectedFinishDate: "Jan 25, 2025",
        lead: { name: "David Lee", initials: "DL" },
        team: [
            { name: "Anna", initials: "AN" },
            { name: "Ben", initials: "BN" },
        ],
        helpers: [],
    },
    {
        id: "5",
        name: "Office Renovation Project",
        status: "onhold",
        progress: 30,
        dueDate: "Mar 15, 2025",
        expectedFinishDate: "Mar 20, 2025",
        lead: { name: "Citra Lestari", initials: "CL" },
        team: [
            { name: "Joko", initials: "JK" },
        ],
        helpers: [],
    },
    {
        id: "6",
        name: "Client XYZ Contract Renewal",
        status: "completed",
        progress: 100,
        dueDate: "Sep 30, 2024",
        expectedFinishDate: "Sep 28, 2024",
        lead: { name: "Budi Santoso", initials: "BS" },
        team: [
            { name: "Rina", initials: "RN" },
            { name: "Sari", initials: "SR" },
        ],
        helpers: [],
    },
];

// Mock Users for Selection
const mockUsers = [
    { id: 1, name: "Mochamad Nalendra", initials: "MN" },
    { id: 2, name: "Milla Omarsaid", initials: "MO" },
    { id: 3, name: "Rega Aldiaz Wahyundi", initials: "RA" },
    { id: 4, name: "Muhammad Sofyan Hadi", initials: "MS" },
    { id: 5, name: "Annisa Dwi Febrianty", initials: "AD" },
    { id: 6, name: "Rahadian Muhammad S.", initials: "RM" },
    { id: 7, name: "Shafa Nurfaizah", initials: "SN" },
    { id: 8, name: "Selma Ana Asriani", initials: "SA" },
    { id: 9, name: "Seprian Setiawan", initials: "SS" },
];

export default function ProjectBoardPage() {
    const [searchQuery, setSearchQuery] = useState("");
    const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
    const [projects, setProjects] = useState<Project[]>(mockProjects);

    // Modal & Action State
    const [isAssignmentModalOpen, setIsAssignmentModalOpen] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);
    const [activeActionDropdown, setActiveActionDropdown] = useState<string | null>(null);
    const [selectedProject, setSelectedProject] = useState<Project | null>(null);
    const [isDetailsOpen, setIsDetailsOpen] = useState(false);

    // Form State for Assignment (Create & Edit)
    const [formData, setFormData] = useState({
        name: "",
        leadId: "",
        teamIds: [] as number[],
        dueDate: "",
        expectedFinishDate: "",
        status: "planning" as ProjectStatus,
        progress: 0,
        helpers: [] as Helper[]
    });

    const [newHelper, setNewHelper] = useState({ name: "", startDate: "", endDate: "" });

    // Filter & Sort State
    const [statusFilter, setStatusFilter] = useState<ProjectStatus | "all">("all");
    const [leadFilter, setLeadFilter] = useState<string | "all">("all");
    const [sortOrder, setSortOrder] = useState<"earliest" | "latest" | null>(null);
    const [activeDropdown, setActiveDropdown] = useState<"status" | "lead" | "date" | null>(null);

    // Inline Edit State (for table view quick edit)
    const [inlineEditId, setInlineEditId] = useState<string | null>(null);
    const [inlineEditData, setInlineEditData] = useState<{ progress: number; status: ProjectStatus }>({ progress: 0, status: "planning" });

    // Details Modal Edit State
    const [detailsEditData, setDetailsEditData] = useState<{ progress: number; status: ProjectStatus; helpers: Helper[] }>({ progress: 0, status: "planning", helpers: [] });
    const [detailsNewHelper, setDetailsNewHelper] = useState({ name: "", startDate: "", endDate: "" });

    // Actions
    const handleSaveProject = () => {
        if (!formData.name || !formData.leadId || !formData.dueDate) {
            alert("Please fill in all required fields.");
            return;
        }

        const leadUser = mockUsers.find(u => u.id === parseInt(formData.leadId));
        const teamUsers = mockUsers.filter(u => formData.teamIds.includes(u.id));

        const leadData = { name: leadUser?.name || "Unknown", initials: leadUser?.initials || "??" };
        const teamData = teamUsers.map(u => ({ name: u.name, initials: u.initials }));

        if (isEditing && currentProjectId) {
            setProjects(projects.map(p => p.id === currentProjectId ? {
                ...p,
                name: formData.name,
                status: formData.status,
                progress: formData.progress,
                dueDate: new Date(formData.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
                expectedFinishDate: formData.expectedFinishDate ? new Date(formData.expectedFinishDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : "",
                lead: leadData,
                team: teamData,
                helpers: formData.helpers
            } : p));
        } else {
            const newProject: Project = {
                id: Math.random().toString(),
                name: formData.name,
                status: formData.status,
                progress: 0,
                dueDate: new Date(formData.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
                expectedFinishDate: formData.expectedFinishDate ? new Date(formData.expectedFinishDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : "",
                lead: leadData,
                team: teamData,
                helpers: []
            };
            setProjects([newProject, ...projects]);
        }
        closeModal();
    };

    const openCreateModal = () => {
        setIsEditing(false);
        setFormData({
            name: "",
            leadId: "",
            teamIds: [],
            dueDate: "",
            expectedFinishDate: "",
            status: "planning",
            progress: 0,
            helpers: []
        });
        setIsAssignmentModalOpen(true);
    };

    const openEditModal = (project: Project) => {
        setIsEditing(true);
        setCurrentProjectId(project.id);
        const leadUser = mockUsers.find(u => u.name === project.lead.name);
        const teamUserIds = project.team.map(m => mockUsers.find(u => u.name === m.name)?.id).filter(id => id !== undefined) as number[];

        // Parse dates for inputs (YYYY-MM-DD)
        const parseDate = (dateStr: string) => {
            if (!dateStr) return "";
            const date = new Date(dateStr);
            // Check if valid date
            if (isNaN(date.getTime())) return "";
            return date.toISOString().split('T')[0];
        };

        setFormData({
            name: project.name,
            leadId: leadUser?.id.toString() || "",
            teamIds: teamUserIds,
            dueDate: parseDate(project.dueDate),
            expectedFinishDate: parseDate(project.expectedFinishDate),
            status: project.status,
            progress: project.progress,
            helpers: project.helpers
        });
        setIsAssignmentModalOpen(true);
        setActiveActionDropdown(null);
    };

    const closeModal = () => {
        setIsAssignmentModalOpen(false);
        setIsEditing(false);
        setCurrentProjectId(null);
    };

    const addHelper = () => {
        if (!newHelper.name || !newHelper.startDate || !newHelper.endDate) return;
        setFormData({
            ...formData,
            helpers: [...formData.helpers, { ...newHelper, color: 'indigo' }]
        });
        setNewHelper({ name: "", startDate: "", endDate: "" });
    };

    const removeHelper = (idx: number) => {
        const newHelpers = [...formData.helpers];
        newHelpers.splice(idx, 1);
        setFormData({ ...formData, helpers: newHelpers });
    };

    const handleDeleteProject = (id: string) => {
        setProjects(projects.filter(p => p.id !== id));
        setActiveActionDropdown(null);
    };

    // Inline Edit Functions (for table view quick edit)
    const openInlineEdit = (project: Project) => {
        setInlineEditId(project.id);
        setInlineEditData({ progress: project.progress, status: project.status });
    };

    const saveInlineEdit = () => {
        if (!inlineEditId) return;
        setProjects(projects.map(p => p.id === inlineEditId ? {
            ...p,
            progress: inlineEditData.progress,
            status: inlineEditData.status
        } : p));
        setInlineEditId(null);
    };

    const cancelInlineEdit = () => {
        setInlineEditId(null);
    };

    // Details Modal Functions
    const openDetailsModal = (project: Project) => {
        setSelectedProject(project);
        setDetailsEditData({ progress: project.progress, status: project.status, helpers: [...project.helpers] });
        setDetailsNewHelper({ name: "", startDate: "", endDate: "" });
        setIsDetailsOpen(true);
    };

    const saveDetailsEdit = () => {
        if (!selectedProject) return;
        setProjects(projects.map(p => p.id === selectedProject.id ? {
            ...p,
            progress: detailsEditData.progress,
            status: detailsEditData.status,
            helpers: detailsEditData.helpers
        } : p));
        // Update selectedProject to reflect changes
        setSelectedProject({ ...selectedProject, progress: detailsEditData.progress, status: detailsEditData.status, helpers: detailsEditData.helpers });
    };

    const addDetailsHelper = () => {
        if (!detailsNewHelper.name || !detailsNewHelper.startDate || !detailsNewHelper.endDate) return;
        setDetailsEditData({
            ...detailsEditData,
            helpers: [...detailsEditData.helpers, { ...detailsNewHelper, color: 'indigo' }]
        });
        setDetailsNewHelper({ name: "", startDate: "", endDate: "" });
    };

    const removeDetailsHelper = (idx: number) => {
        const newHelpers = [...detailsEditData.helpers];
        newHelpers.splice(idx, 1);
        setDetailsEditData({ ...detailsEditData, helpers: newHelpers });
    };

    // Derived Data
    const uniqueLeads = Array.from(new Set(projects.map(p => p.lead.name)));

    const filteredProjects = projects
        .filter((project) =>
            project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            project.lead.name.toLowerCase().includes(searchQuery.toLowerCase())
        )
        .filter((project) => {
            if (statusFilter !== "all" && project.status !== statusFilter) return false;
            if (leadFilter !== "all" && project.lead.name !== leadFilter) return false;
            return true;
        })
        .sort((a, b) => {
            if (!sortOrder) return 0;
            const dateA = new Date(a.dueDate).getTime();
            const dateB = new Date(b.dueDate).getTime();
            return sortOrder === "earliest" ? dateA - dateB : dateB - dateA;
        });

    // Helper to close dropdowns
    const toggleDropdown = (dropdown: "status" | "lead" | "date") => {
        if (activeDropdown === dropdown) {
            setActiveDropdown(null);
        } else {
            setActiveDropdown(dropdown);
        }
    };

    const getHelperColor = (color: string) => {
        const colors: Record<string, string> = {
            indigo: "bg-indigo-500/20 text-indigo-600 dark:text-indigo-300",
            pink: "bg-pink-500/20 text-pink-600 dark:text-pink-300",
            cyan: "bg-cyan-500/20 text-cyan-600 dark:text-cyan-300",
            purple: "bg-purple-500/20 text-purple-600 dark:text-purple-300",
            orange: "bg-orange-500/20 text-orange-600 dark:text-orange-300",
        };
        return colors[color] || colors.indigo;
    };

    return (
        <div className="flex flex-col" >
            {/* Page Header */}
            < header className="mb-8 flex flex-col justify-between gap-6 md:flex-row md:items-end" >
                <div className="flex flex-col gap-2">
                    <h1 className="text-4xl font-black tracking-tight text-[var(--text-primary)]">Assignment Management</h1>
                    <p className="text-lg text-[var(--text-secondary)] max-w-2xl">
                        Manage and track all ongoing assignments, team allocations, and timelines.
                    </p>
                </div>
                <button
                    onClick={openCreateModal}
                    className="group relative flex items-center justify-center gap-2 rounded-xl bg-[#e8c559] px-6 py-3 text-sm font-bold text-[#171611] shadow-[0_0_20px_rgba(232,197,89,0.2)] transition-all hover:bg-[#ebd07a] hover:shadow-[0_0_30px_rgba(232,197,89,0.4)] active:scale-95">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />
                    </svg>
                    New Assignment
                </button>
            </header >

            {/* Toolbar / Filter Bar */}
            < div className="mb-8 relative z-[100] flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-[var(--glass-border)] bg-[var(--glass-bg)] p-2 backdrop-blur-md" >
                {/* Search */}
                < div className="relative flex-1 min-w-[280px]" >
                    <svg xmlns="http://www.w3.org/2000/svg" className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-[var(--text-muted)]" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" />
                    </svg>
                    <input
                        type="text"
                        placeholder="Search assignments, leads, or tags..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="h-11 w-full rounded-xl border border-[var(--glass-border)] bg-[var(--card-bg)] pl-10 pr-4 text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:ring-2 focus:ring-[#e8c559]/50 focus:border-[#e8c559] transition-all"
                    />
                </div >

                {/* Filters */}
                < div className="flex items-center gap-2 flex-wrap pb-2 md:pb-0" >
                    {/* Status Filter */}
                    < div className="relative" >
                        <button
                            onClick={() => toggleDropdown("status")}
                            className={`flex items-center gap-2 whitespace-nowrap rounded-lg border px-4 py-2.5 text-sm font-medium transition-colors ${statusFilter !== "all" ? "bg-[#e8c559]/20 border-[#e8c559] text-[#b89530] dark:text-[#e8c559]" : "border-[var(--glass-border)] bg-[var(--glass-bg)] text-[var(--text-secondary)] hover:bg-black/5 dark:hover:bg-white/10 hover:text-[var(--text-primary)]"}`}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M10 18h4v-2h-4v2zM3 6v2h18V6H3zm3 7h12v-2H6v2z" />
                            </svg>
                            Status {statusFilter !== "all" && `(${STATUS_CONFIG[statusFilter].label})`}
                        </button>
                        {
                            activeDropdown === "status" && (
                                <>
                                    <div className="fixed inset-0 z-10" onClick={() => setActiveDropdown(null)} />
                                    <div className="absolute top-full left-0 mt-2 w-48 rounded-xl border border-[var(--glass-border)] bg-white dark:bg-[#1c2120] shadow-xl z-[100] p-1 flex flex-col gap-0.5">
                                        <button
                                            onClick={() => { setStatusFilter("all"); setActiveDropdown(null); }}
                                            className={`px-3 py-2 text-sm text-left rounded-lg transition-colors ${statusFilter === "all" ? "bg-black/5 dark:bg-white/5 font-bold text-[var(--text-primary)]" : "text-[var(--text-secondary)] hover:bg-black/5 dark:hover:bg-white/5 hover:text-[var(--text-primary)]"}`}
                                        >
                                            All Statuses
                                        </button>
                                        {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                                            <button
                                                key={key}
                                                onClick={() => { setStatusFilter(key as ProjectStatus); setActiveDropdown(null); }}
                                                className={`px-3 py-2 text-sm text-left rounded-lg transition-colors flex items-center gap-2 ${statusFilter === key ? "bg-black/5 dark:bg-white/5 font-bold text-[var(--text-primary)]" : "text-[var(--text-secondary)] hover:bg-black/5 dark:hover:bg-white/5 hover:text-[var(--text-primary)]"}`}
                                            >
                                                <span className={`h-2 w-2 rounded-full ${config.dotClass}`} />
                                                {config.label}
                                            </button>
                                        ))}
                                    </div>
                                </>
                            )
                        }
                    </div >

                    {/* Lead Filter */}
                    < div className="relative" >
                        <button
                            onClick={() => toggleDropdown("lead")}
                            className={`flex items-center gap-2 whitespace-nowrap rounded-lg border px-4 py-2.5 text-sm font-medium transition-colors ${leadFilter !== "all" ? "bg-[#e8c559]/20 border-[#e8c559] text-[#b89530] dark:text-[#e8c559]" : "border-[var(--glass-border)] bg-[var(--glass-bg)] text-[var(--text-secondary)] hover:bg-black/5 dark:hover:bg-white/10 hover:text-[var(--text-primary)]"}`}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                            </svg>
                            Lead {leadFilter !== "all" && `(${leadFilter.split(' ')[0]})`}
                        </button>
                        {
                            activeDropdown === "lead" && (
                                <>
                                    <div className="fixed inset-0 z-10" onClick={() => setActiveDropdown(null)} />
                                    <div className="absolute top-full left-0 mt-2 w-56 rounded-xl border border-[var(--glass-border)] bg-white dark:bg-[#1c2120] shadow-xl z-[100] p-1 flex flex-col gap-0.5 max-h-64 overflow-y-auto custom-scrollbar">
                                        <button
                                            onClick={() => { setLeadFilter("all"); setActiveDropdown(null); }}
                                            className={`px-3 py-2 text-sm text-left rounded-lg transition-colors ${leadFilter === "all" ? "bg-black/5 dark:bg-white/5 font-bold text-[var(--text-primary)]" : "text-[var(--text-secondary)] hover:bg-black/5 dark:hover:bg-white/5 hover:text-[var(--text-primary)]"}`}
                                        >
                                            All Leads
                                        </button>
                                        {uniqueLeads.map((lead) => (
                                            <button
                                                key={lead}
                                                onClick={() => { setLeadFilter(lead); setActiveDropdown(null); }}
                                                className={`px-3 py-2 text-sm text-left rounded-lg transition-colors ${leadFilter === lead ? "bg-black/5 dark:bg-white/5 font-bold text-[var(--text-primary)]" : "text-[var(--text-secondary)] hover:bg-black/5 dark:hover:bg-white/5 hover:text-[var(--text-primary)]"}`}
                                            >
                                                {lead}
                                            </button>
                                        ))}
                                    </div>
                                </>
                            )
                        }
                    </div >

                    {/* Due Date Sort */}
                    < div className="relative" >
                        <button
                            onClick={() => toggleDropdown("date")}
                            className={`flex items-center gap-2 whitespace-nowrap rounded-lg border px-4 py-2.5 text-sm font-medium transition-colors ${sortOrder ? "bg-[#e8c559]/20 border-[#e8c559] text-[#b89530] dark:text-[#e8c559]" : "border-[var(--glass-border)] bg-[var(--glass-bg)] text-[var(--text-secondary)] hover:bg-black/5 dark:hover:bg-white/10 hover:text-[var(--text-primary)]"}`}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM9 10H7v2h2v-2zm4 0h-2v2h2v-2zm4 0h-2v2h2v-2z" />
                            </svg>
                            Due Date {sortOrder && `(${sortOrder === 'earliest' ? 'Asc' : 'Desc'})`}
                        </button>
                        {
                            activeDropdown === "date" && (
                                <>
                                    <div className="fixed inset-0 z-10" onClick={() => setActiveDropdown(null)} />
                                    <div className="absolute top-full left-0 mt-2 w-48 rounded-xl border border-[var(--glass-border)] bg-white dark:bg-[#1c2120] shadow-xl z-[100] p-1 flex flex-col gap-0.5">
                                        <button
                                            onClick={() => { setSortOrder(null); setActiveDropdown(null); }}
                                            className={`px-3 py-2 text-sm text-left rounded-lg transition-colors ${!sortOrder ? "bg-black/5 dark:bg-white/5 font-bold text-[var(--text-primary)]" : "text-[var(--text-secondary)] hover:bg-black/5 dark:hover:bg-white/5 hover:text-[var(--text-primary)]"}`}
                                        >
                                            Default
                                        </button>
                                        <button
                                            onClick={() => { setSortOrder("earliest"); setActiveDropdown(null); }}
                                            className={`px-3 py-2 text-sm text-left rounded-lg transition-colors ${sortOrder === "earliest" ? "bg-black/5 dark:bg-white/5 font-bold text-[var(--text-primary)]" : "text-[var(--text-secondary)] hover:bg-black/5 dark:hover:bg-white/5 hover:text-[var(--text-primary)]"}`}
                                        >
                                            Earliest First
                                        </button>
                                        <button
                                            onClick={() => { setSortOrder("latest"); setActiveDropdown(null); }}
                                            className={`px-3 py-2 text-sm text-left rounded-lg transition-colors ${sortOrder === "latest" ? "bg-black/5 dark:bg-white/5 font-bold text-[var(--text-primary)]" : "text-[var(--text-secondary)] hover:bg-black/5 dark:hover:bg-white/5 hover:text-[var(--text-primary)]"}`}
                                        >
                                            Latest First
                                        </button>
                                    </div>
                                </>
                            )
                        }
                    </div >

                    {/* Clear Filters */}
                    {
                        (statusFilter !== "all" || leadFilter !== "all" || sortOrder) && (
                            <button
                                onClick={() => { setStatusFilter("all"); setLeadFilter("all"); setSortOrder(null); }}
                                className="text-xs text-rose-500 hover:text-rose-600 font-medium px-2 py-2"
                            >
                                Reset
                            </button>
                        )
                    }
                    <div className="mx-2 h-6 w-px bg-[var(--glass-border)]" />
                    <div className="flex rounded-lg bg-[var(--glass-bg)] p-1 border border-[var(--glass-border)]">
                        <button
                            onClick={() => setViewMode("grid")}
                            className={`rounded p-1.5 transition-colors ${viewMode === "grid" ? "bg-[#e8c559]/20 text-[#e8c559] shadow-sm" : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"}`}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M3 3v8h8V3H3zm6 6H5V5h4v4zm-6 4v8h8v-8H3zm6 6H5v-4h4v4zm4-16v8h8V3h-8zm6 6h-4V5h4v4zm-6 4v8h8v-8h-8zm6 6h-4v-4h4v4z" />
                            </svg>
                        </button>
                        <button
                            onClick={() => setViewMode("list")}
                            className={`rounded p-1.5 transition-colors ${viewMode === "list" ? "bg-[#e8c559]/20 text-[#e8c559] shadow-sm" : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"}`}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M3 13h2v-2H3v2zm0 4h2v-2H3v2zm0-8h2V7H3v2zm4 4h14v-2H7v2zm0 4h14v-2H7v2zM7 7v2h14V7H7z" />
                            </svg>
                        </button>
                    </div>
                </div >
            </div >

            {/* Content View */}
            {
                viewMode === "grid" ? (
                    /* Grid View */
                    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3 relative z-0">
                        {filteredProjects.map((project) => {
                            const statusConfig = STATUS_CONFIG[project.status];
                            return (
                                <div
                                    key={project.id}
                                    className="group flex flex-col justify-between rounded-2xl border border-[var(--glass-border)] bg-[var(--card-bg)] p-6 backdrop-blur-md transition-all hover:border-[#e8c559]/30 hover:shadow-xl shadow-lg"
                                >
                                    <div>
                                        {/* Card Header */}
                                        <div className="mb-4 flex items-start justify-between">
                                            <div className="flex flex-col gap-2">
                                                <span className={`inline-flex w-fit items-center gap-1.5 rounded-full ${statusConfig.bgClass} px-2.5 py-1 text-xs font-bold ${statusConfig.textClass} border ${statusConfig.borderClass}`}>
                                                    <span className="relative flex h-2 w-2">
                                                        {statusConfig.animate && (
                                                            <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${statusConfig.dotClass} opacity-75`} />
                                                        )}
                                                        <span className={`relative inline-flex rounded-full h-2 w-2 ${statusConfig.dotClass}`} />
                                                    </span>
                                                    {statusConfig.label}
                                                </span>
                                                <h3 className="text-xl font-bold text-[var(--text-primary)] leading-tight">{project.name}</h3>
                                            </div>
                                            <div className="relative">
                                                <button
                                                    onClick={() => setActiveActionDropdown(activeActionDropdown === project.id ? null : project.id)}
                                                    className="rounded-full p-1 text-[var(--text-muted)] hover:bg-black/5 dark:hover:bg-white/10 hover:text-[var(--text-primary)] transition-colors">
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                                                        <path d="M6 10c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm12 0c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm-6 0c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" />
                                                    </svg>
                                                </button>
                                                {activeActionDropdown === project.id && (
                                                    <>
                                                        <div className="fixed inset-0 z-30" onClick={() => setActiveActionDropdown(null)} />
                                                        <div className="absolute right-0 top-full mt-1 w-32 rounded-xl border border-[var(--glass-border)] bg-white dark:bg-[#1c2120] shadow-xl z-40 overflow-hidden flex flex-col">
                                                            <button
                                                                onClick={() => openEditModal(project)}
                                                                className="px-4 py-2 text-sm text-left hover:bg-black/5 dark:hover:bg-white/5 text-[var(--text-primary)] transition-colors">
                                                                Edit
                                                            </button>
                                                            <div className="h-px bg-[var(--glass-border)]" />
                                                            <button
                                                                onClick={() => handleDeleteProject(project.id)}
                                                                className="px-4 py-2 text-sm text-left hover:bg-rose-500/10 text-rose-500 transition-colors">
                                                                Delete
                                                            </button>
                                                        </div>
                                                    </>
                                                )}
                                            </div>
                                        </div>

                                        {/* Progress Bar */}
                                        <div className="mb-6">
                                            <div className="mb-2 flex justify-between text-xs font-medium">
                                                <span className="text-[var(--text-secondary)]">Progress</span>
                                                <span className="text-[#b89530] dark:text-[#e8c559]">{project.progress}%</span>
                                            </div>
                                            <div className="h-2 w-full overflow-hidden rounded-full bg-black/5 dark:bg-white/5">
                                                <div
                                                    className="h-full rounded-full bg-[#e8c559] shadow-[0_0_10px_rgba(232,197,89,0.5)] transition-all duration-500"
                                                    style={{ width: `${project.progress}%` }}
                                                />
                                            </div>
                                        </div>

                                        {/* Meta Info */}
                                        <div className="mb-6 flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-[var(--text-muted)]" viewBox="0 0 24 24" fill="currentColor">
                                                <path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM9 10H7v2h2v-2zm4 0h-2v2h2v-2zm4 0h-2v2h2v-2z" />
                                            </svg>
                                            <span>Due: <span className="text-[var(--text-primary)] font-medium">{project.dueDate}</span></span>
                                        </div>

                                        {/* Team Section */}
                                        <div className="mb-6 space-y-4 rounded-xl bg-black/5 dark:bg-black/20 p-4 border border-[var(--glass-border)]">
                                            {/* Project Lead */}
                                            <div className="flex items-center justify-between">
                                                <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)]">PM (Lead)</span>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs font-medium text-[#b89530] dark:text-[#e8c559]">{project.lead.name}</span>
                                                    <div className="relative">
                                                        <div className="absolute -top-3 -right-2 text-xs">👑</div>
                                                        <div className="h-8 w-8 rounded-full border border-[var(--glass-border)] bg-gradient-to-br from-[#e8c559]/30 to-[#b89530]/30 flex items-center justify-center text-[#b89530] dark:text-[#e8c559] font-bold text-xs">
                                                            {project.lead.initials}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="h-px w-full bg-[var(--glass-border)]" />

                                            {/* Team Members */}
                                            <div className="flex items-center justify-between">
                                                <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)]">Team</span>
                                                <div className="flex -space-x-2">
                                                    {project.team.slice(0, 3).map((member, idx) => (
                                                        <div
                                                            key={idx}
                                                            className="h-7 w-7 rounded-full border border-[var(--card-bg)] bg-gradient-to-br from-gray-400 to-gray-600 dark:from-gray-600 dark:to-gray-800 ring-1 ring-[var(--glass-border)] flex items-center justify-center text-[10px] font-bold text-white"
                                                            title={member.name}
                                                        >
                                                            {member.initials}
                                                        </div>
                                                    ))}
                                                    {project.team.length > 3 && (
                                                        <div className="flex h-7 w-7 items-center justify-center rounded-full border border-[var(--card-bg)] bg-black/10 dark:bg-white/10 ring-1 ring-[var(--glass-border)] text-[10px] font-bold text-[var(--text-primary)] hover:bg-black/20 dark:hover:bg-white/20 cursor-pointer">
                                                            +{project.team.length - 3}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Helpers */}
                                            {project.helpers.length > 0 && (
                                                <>
                                                    <div className="h-px w-full bg-[var(--glass-border)]" />
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)]">Helpers</span>
                                                        <div className="flex -space-x-2">
                                                            {project.helpers.slice(0, 2).map((helper, idx) => (
                                                                <div
                                                                    key={idx}
                                                                    className="h-6 w-6 rounded-full border border-[var(--card-bg)] bg-gradient-to-br from-indigo-400 to-purple-600 ring-1 ring-[var(--glass-border)] flex items-center justify-center text-[8px] font-bold text-white"
                                                                    title={`${helper.name} (${helper.startDate} - ${helper.endDate})`}
                                                                >
                                                                    {helper.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                                                                </div>
                                                            ))}
                                                            {project.helpers.length > 2 && (
                                                                <div className="flex h-6 w-6 items-center justify-center rounded-full border border-[var(--card-bg)] bg-black/10 dark:bg-white/10 ring-1 ring-[var(--glass-border)] text-[8px] font-bold text-[var(--text-primary)]">
                                                                    +{project.helpers.length - 2}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    </div>

                                    {/* Footer Actions */}
                                    <div className="mt-4 flex items-center gap-2 pt-4 border-t border-[var(--glass-border)]">
                                        <button
                                            onClick={() => openDetailsModal(project)}
                                            className="flex items-center justify-center rounded-lg p-2 text-[var(--text-muted)] hover:bg-black/5 dark:hover:bg-white/10 hover:text-[var(--text-primary)] transition-colors" title="View Details">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                                                <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z" />
                                            </svg>
                                        </button>
                                        <Link
                                            href="/dashboard/projects/timeline"
                                            className="ml-auto flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold text-[#b89530] dark:text-[#e8c559] hover:bg-[#e8c559]/10 transition-colors">
                                            Timeline
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                                                <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z" />
                                            </svg>
                                        </Link>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    /* Table View */
                    <div className="rounded-2xl border border-[var(--glass-border)] bg-[var(--card-bg)] backdrop-blur-md overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-[#e8c559]/10 text-[var(--text-secondary)] uppercase tracking-wider text-xs font-bold border-b border-[var(--glass-border)]">
                                    <tr>
                                        <th className="px-6 py-4">Assignment Name</th>
                                        <th className="px-6 py-4">PM (Lead)</th>
                                        <th className="px-6 py-4">Team</th>
                                        <th className="px-6 py-4 w-1/4">Progress</th>
                                        <th className="px-6 py-4">Status</th>
                                        <th className="px-6 py-4">Due Date</th>
                                        <th className="px-6 py-4 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[var(--glass-border)]">
                                    {filteredProjects.map((project) => {
                                        const statusConfig = STATUS_CONFIG[project.status];
                                        return (
                                            <tr key={project.id} className="hover:bg-black/5 dark:hover:bg-white/5 transition-colors group">
                                                <td className="px-6 py-4 font-bold text-[var(--text-primary)]">
                                                    {project.name}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-2">
                                                        <div className="h-8 w-8 rounded-full border border-[var(--glass-border)] bg-gradient-to-br from-[#e8c559]/30 to-[#b89530]/30 flex items-center justify-center text-[#b89530] dark:text-[#e8c559] font-bold text-xs">
                                                            {project.lead.initials}
                                                        </div>
                                                        <div className="flex flex-col">
                                                            <span className="font-medium text-[var(--text-primary)]">{project.lead.name}</span>
                                                            <span className="text-[10px] text-[var(--text-muted)]">PM</span>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex -space-x-2">
                                                        {project.team.slice(0, 3).map((member, idx) => (
                                                            <div
                                                                key={idx}
                                                                className="h-8 w-8 rounded-full border border-[var(--card-bg)] bg-gradient-to-br from-gray-400 to-gray-600 dark:from-gray-600 dark:to-gray-800 ring-1 ring-[var(--glass-border)] flex items-center justify-center text-[10px] font-bold text-white shadow-sm"
                                                                title={member.name}
                                                            >
                                                                {member.initials}
                                                            </div>
                                                        ))}
                                                        {project.team.length > 3 && (
                                                            <div className="flex h-8 w-8 items-center justify-center rounded-full border border-[var(--card-bg)] bg-black/10 dark:bg-white/10 ring-1 ring-[var(--glass-border)] text-[10px] font-bold text-[var(--text-primary)] hover:bg-black/20 dark:hover:bg-white/20 cursor-pointer">
                                                                +{project.team.length - 3}
                                                            </div>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    {inlineEditId === project.id ? (
                                                        <div className="flex flex-col gap-1">
                                                            <div className="flex justify-between text-xs font-medium">
                                                                <span className="text-[var(--text-secondary)]">{inlineEditData.progress}%</span>
                                                            </div>
                                                            <input
                                                                type="range"
                                                                min="0"
                                                                max="100"
                                                                step="5"
                                                                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700 accent-[#e8c559]"
                                                                value={inlineEditData.progress}
                                                                onChange={(e) => setInlineEditData({ ...inlineEditData, progress: parseInt(e.target.value) })}
                                                            />
                                                        </div>
                                                    ) : (
                                                        <div className="flex flex-col gap-1">
                                                            <div className="flex justify-between text-xs font-medium">
                                                                <span className="text-[var(--text-secondary)]">{project.progress}%</span>
                                                            </div>
                                                            <div className="h-2 w-full overflow-hidden rounded-full bg-black/5 dark:bg-white/5">
                                                                <div
                                                                    className="h-full rounded-full bg-[#e8c559] shadow-[0_0_10px_rgba(232,197,89,0.5)] transition-all duration-500"
                                                                    style={{ width: `${project.progress}%` }}
                                                                />
                                                            </div>
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4">
                                                    {inlineEditId === project.id ? (
                                                        <select
                                                            className="w-full rounded-lg border border-[var(--glass-border)] bg-white dark:bg-[#1c2120] px-2 py-1 text-xs font-medium text-[var(--text-primary)] focus:ring-2 focus:ring-[#e8c559]/50"
                                                            value={inlineEditData.status}
                                                            onChange={(e) => setInlineEditData({ ...inlineEditData, status: e.target.value as ProjectStatus })}
                                                        >
                                                            {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                                                                <option key={key} value={key}>{config.label}</option>
                                                            ))}
                                                        </select>
                                                    ) : (
                                                        <span className={`inline-flex items-center gap-1.5 rounded-full ${statusConfig.bgClass} px-2.5 py-1 text-xs font-bold ${statusConfig.textClass} border ${statusConfig.borderClass}`}>
                                                            <span className={`h-1.5 w-1.5 rounded-full ${statusConfig.dotClass}`} />
                                                            {statusConfig.label}
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4 text-sm text-[var(--text-secondary)] font-mono">
                                                    {project.dueDate}
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    {inlineEditId === project.id ? (
                                                        <div className="flex items-center justify-end gap-2">
                                                            <button
                                                                onClick={saveInlineEdit}
                                                                className="p-1.5 text-emerald-500 hover:bg-emerald-500/10 rounded-lg transition-colors"
                                                                title="Save"
                                                            >
                                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                                                                    <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                                                                </svg>
                                                            </button>
                                                            <button
                                                                onClick={cancelInlineEdit}
                                                                className="p-1.5 text-rose-500 hover:bg-rose-500/10 rounded-lg transition-colors"
                                                                title="Cancel"
                                                            >
                                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                                                                    <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
                                                                </svg>
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <button
                                                            onClick={() => openInlineEdit(project)}
                                                            className="p-2 text-[var(--text-muted)] hover:text-[#e8c559] transition-colors rounded-lg hover:bg-[#e8c559]/10"
                                                            title="Quick Edit Progress & Status"
                                                        >
                                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                                                                <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" />
                                                            </svg>
                                                        </button>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )
            }

            {/* Load More */}
            <div className="mt-8 flex justify-center">
                <button className="text-sm font-medium text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors">
                    Load more assignments...
                </button>
            </div>

            {/* New Assignment Modal */}
            {
                isAssignmentModalOpen && (
                    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 p-4">
                        <div className="w-full max-w-md rounded-2xl bg-white dark:bg-[#1c2120] border border-[var(--glass-border)] shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
                            <div className="p-6 border-b border-[var(--glass-border)] flex justify-between items-center bg-white dark:bg-[#1c2120] sticky top-0 z-10">
                                <h2 className="text-xl font-bold text-[var(--text-primary)]">{isEditing ? "Edit Assignment" : "New Assignment"}</h2>
                                <button onClick={() => setIsAssignmentModalOpen(false)} className="text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>

                            <div className="p-6 space-y-5 overflow-y-auto custom-scrollbar flex-1">
                                {/* Name */}
                                <div>
                                    <label className="block text-sm font-semibold text-[var(--text-primary)] mb-2">Assignment Name</label>
                                    <input
                                        type="text"
                                        className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#252523] px-4 py-3 text-sm text-[var(--text-primary)] placeholder:text-gray-400 focus:ring-2 focus:ring-[#e8c559]/50 focus:border-[#e8c559] focus:bg-white dark:focus:bg-[#1c2120] transition-all"
                                        placeholder="e.g. Q1 Marketing Campaign"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    />
                                </div>

                                {/* Lead Select */}
                                <div>
                                    <label className="block text-sm font-semibold text-[var(--text-primary)] mb-2">Lead</label>
                                    <select
                                        className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#252523] px-4 py-3 text-sm text-[var(--text-primary)] focus:ring-2 focus:ring-[#e8c559]/50 focus:border-[#e8c559] focus:bg-white dark:focus:bg-[#1c2120] transition-all appearance-none cursor-pointer"
                                        value={formData.leadId}
                                        onChange={(e) => setFormData({ ...formData, leadId: e.target.value })}
                                    >
                                        <option value="">Select Project Lead</option>
                                        {mockUsers.map(user => (
                                            <option key={user.id} value={user.id}>{user.name}</option>
                                        ))}
                                    </select>
                                </div>

                                {/* Team Select (Multi-select style) */}
                                <div>
                                    <label className="block text-sm font-semibold text-[var(--text-primary)] mb-2">Team Members</label>
                                    <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#252523] p-3 h-36 overflow-y-auto custom-scrollbar space-y-1">
                                        {mockUsers.map(user => (
                                            <label key={user.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-white dark:hover:bg-[#1c2120] cursor-pointer transition-colors">
                                                <input
                                                    type="checkbox"
                                                    className="w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-[#e8c559] focus:ring-[#e8c559] focus:ring-offset-0"
                                                    checked={formData.teamIds.includes(user.id)}
                                                    onChange={(e) => {
                                                        if (e.target.checked) {
                                                            setFormData({ ...formData, teamIds: [...formData.teamIds, user.id] });
                                                        } else {
                                                            setFormData({ ...formData, teamIds: formData.teamIds.filter(id => id !== user.id) });
                                                        }
                                                    }}
                                                />
                                                <span className="text-sm text-[var(--text-primary)]">{user.name}</span>
                                            </label>
                                        ))}
                                    </div>
                                    <p className="text-xs text-[var(--text-muted)] mt-2">{formData.teamIds.length} member{formData.teamIds.length !== 1 ? 's' : ''} selected</p>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    {/* Due Date */}
                                    <div>
                                        <label className="block text-sm font-semibold text-[var(--text-primary)] mb-2">Due Date</label>
                                        <input
                                            type="date"
                                            className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#252523] px-4 py-3 text-sm text-[var(--text-primary)] focus:ring-2 focus:ring-[#e8c559]/50 focus:border-[#e8c559] focus:bg-white dark:focus:bg-[#1c2120] transition-all"
                                            value={formData.dueDate}
                                            onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                                        />
                                    </div>

                                    {/* Status */}
                                    <div>
                                        <label className="block text-sm font-semibold text-[var(--text-primary)] mb-2">Status</label>
                                        <select
                                            className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#252523] px-4 py-3 text-sm text-[var(--text-primary)] focus:ring-2 focus:ring-[#e8c559]/50 focus:border-[#e8c559] focus:bg-white dark:focus:bg-[#1c2120] transition-all appearance-none cursor-pointer"
                                            value={formData.status}
                                            onChange={(e) => setFormData({ ...formData, status: e.target.value as ProjectStatus })}
                                        >
                                            {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                                                <option key={key} value={key}>{config.label}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>



                            </div>

                            {/* Modal Footer */}
                            <div className="p-4 border-t border-[var(--glass-border)] flex justify-end gap-3 bg-gray-50 dark:bg-[#171714]">
                                <button
                                    onClick={() => setIsAssignmentModalOpen(false)}
                                    className="px-5 py-2.5 rounded-xl text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleSaveProject}
                                    className="px-5 py-2.5 rounded-xl bg-[#e8c559] text-[#171611] text-sm font-bold shadow-lg hover:bg-[#ebd07a] transition-all active:scale-95"
                                >
                                    {isEditing ? "Save Changes" : "Create Assignment"}
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }


            {/* Details Modal - Editable */}
            {
                isDetailsOpen && selectedProject && (
                    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 p-4">
                        <div className="w-full max-w-2xl rounded-2xl bg-white dark:bg-[#1c2120] border border-[var(--glass-border)] shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
                            {/* Header */}
                            <div className="p-6 border-b border-[var(--glass-border)] flex justify-between items-start">
                                <div>
                                    <h2 className="text-2xl font-black text-[var(--text-primary)] mb-1">{selectedProject.name}</h2>
                                    <p className="text-sm text-[var(--text-secondary)]">Project Lead: {selectedProject.lead.name}</p>
                                </div>
                                <button onClick={() => setIsDetailsOpen(false)} className="text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>

                            {/* Content */}
                            <div className="p-6 space-y-6 overflow-y-auto custom-scrollbar flex-1">
                                {/* Progress Section */}
                                <div>
                                    <h3 className="text-sm font-bold text-[var(--text-muted)] uppercase tracking-wider mb-3">Progress</h3>
                                    <div className="bg-black/5 dark:bg-white/5 rounded-xl p-4 border border-[var(--glass-border)]">
                                        <div className="flex justify-between text-sm font-medium mb-2">
                                            <span className="text-[var(--text-secondary)]">Completion</span>
                                            <span className="text-[#b89530] dark:text-[#e8c559]">{detailsEditData.progress}%</span>
                                        </div>
                                        <input
                                            type="range"
                                            min="0"
                                            max="100"
                                            step="5"
                                            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700 accent-[#e8c559]"
                                            value={detailsEditData.progress}
                                            onChange={(e) => setDetailsEditData({ ...detailsEditData, progress: parseInt(e.target.value) })}
                                        />
                                        <div className="flex items-center gap-2 text-sm mt-3">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-[var(--text-muted)]" viewBox="0 0 24 24" fill="currentColor">
                                                <path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM9 10H7v2h2v-2zm4 0h-2v2h2v-2zm4 0h-2v2h2v-2z" />
                                            </svg>
                                            <span className="text-[var(--text-secondary)]">Due: <span className="text-[var(--text-primary)] font-bold">{selectedProject.dueDate}</span></span>
                                        </div>
                                    </div>
                                </div>

                                {/* Status Section */}
                                <div>
                                    <h3 className="text-sm font-bold text-[var(--text-muted)] uppercase tracking-wider mb-3">Status</h3>
                                    <select
                                        className="w-full rounded-xl border border-[var(--glass-border)] bg-white dark:bg-[#2a2f2e] px-4 py-3 text-sm font-medium text-[var(--text-primary)] focus:ring-2 focus:ring-[#e8c559]/50 focus:border-[#e8c559]"
                                        value={detailsEditData.status}
                                        onChange={(e) => setDetailsEditData({ ...detailsEditData, status: e.target.value as ProjectStatus })}
                                    >
                                        {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                                            <option key={key} value={key}>{config.label}</option>
                                        ))}
                                    </select>
                                </div>

                                {/* Team Section (Read Only) */}
                                <div>
                                    <h3 className="text-sm font-bold text-[var(--text-muted)] uppercase tracking-wider mb-3">Team Members</h3>
                                    <div className="flex flex-wrap gap-2">
                                        {selectedProject.team.map((member, idx) => (
                                            <div key={idx} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-black/5 dark:bg-white/5 border border-[var(--glass-border)]">
                                                <div className="h-7 w-7 rounded-full bg-gray-500/20 flex items-center justify-center text-xs font-bold text-[var(--text-secondary)]">
                                                    {member.initials}
                                                </div>
                                                <span className="text-sm text-[var(--text-primary)]">{member.name}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Helpers Section - Editable */}
                                <div>
                                    <h3 className="text-sm font-bold text-[var(--text-muted)] uppercase tracking-wider mb-3">Helpers</h3>

                                    {/* Add Helper Form */}
                                    <div className="flex flex-wrap gap-2 mb-3 p-3 rounded-xl bg-black/5 dark:bg-white/5 border border-[var(--glass-border)]">
                                        <input
                                            type="text"
                                            placeholder="Helper Name"
                                            className="flex-1 min-w-[120px] rounded-lg border border-[var(--glass-border)] bg-white dark:bg-[#2a2f2e] px-3 py-2 text-sm text-[var(--text-primary)] focus:ring-2 focus:ring-[#e8c559]/50"
                                            value={detailsNewHelper.name}
                                            onChange={(e) => setDetailsNewHelper({ ...detailsNewHelper, name: e.target.value })}
                                        />
                                        <input
                                            type="date"
                                            className="rounded-lg border border-[var(--glass-border)] bg-white dark:bg-[#2a2f2e] px-3 py-2 text-sm text-[var(--text-primary)] focus:ring-2 focus:ring-[#e8c559]/50"
                                            value={detailsNewHelper.startDate}
                                            onChange={(e) => setDetailsNewHelper({ ...detailsNewHelper, startDate: e.target.value })}
                                        />
                                        <input
                                            type="date"
                                            className="rounded-lg border border-[var(--glass-border)] bg-white dark:bg-[#2a2f2e] px-3 py-2 text-sm text-[var(--text-primary)] focus:ring-2 focus:ring-[#e8c559]/50"
                                            value={detailsNewHelper.endDate}
                                            onChange={(e) => setDetailsNewHelper({ ...detailsNewHelper, endDate: e.target.value })}
                                        />
                                        <button
                                            onClick={addDetailsHelper}
                                            className="px-4 py-2 rounded-lg bg-[#e8c559] text-[#171611] text-sm font-bold hover:bg-[#ebd07a] transition-colors"
                                        >
                                            + Add
                                        </button>
                                    </div>

                                    {/* Helper List */}
                                    <div className="space-y-2 max-h-32 overflow-y-auto custom-scrollbar">
                                        {detailsEditData.helpers.map((helper, idx) => (
                                            <div key={idx} className="flex items-center justify-between p-3 rounded-lg bg-black/5 dark:bg-white/5 border border-[var(--glass-border)]">
                                                <div>
                                                    <p className="text-sm font-bold text-[var(--text-primary)]">{helper.name}</p>
                                                    <p className="text-xs text-[var(--text-secondary)]">{helper.startDate} - {helper.endDate}</p>
                                                </div>
                                                <button onClick={() => removeDetailsHelper(idx)} className="text-rose-500 hover:text-rose-600 p-1 hover:bg-rose-500/10 rounded-lg transition-colors">
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                                                        <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
                                                    </svg>
                                                </button>
                                            </div>
                                        ))}
                                        {detailsEditData.helpers.length === 0 && (
                                            <p className="text-sm text-[var(--text-secondary)] italic text-center py-2">No helpers assigned.</p>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Footer */}
                            <div className="p-4 border-t border-[var(--glass-border)] flex justify-end gap-3 bg-gray-50 dark:bg-[#171714]">
                                <button
                                    onClick={() => setIsDetailsOpen(false)}
                                    className="px-5 py-2.5 rounded-xl text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={() => { saveDetailsEdit(); setIsDetailsOpen(false); }}
                                    className="px-5 py-2.5 rounded-xl bg-[#e8c559] text-[#171611] text-sm font-bold shadow-lg hover:bg-[#ebd07a] transition-all active:scale-95"
                                >
                                    Save Changes
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }
        </div >
    );
}
