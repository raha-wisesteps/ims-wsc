"use client";

import { useState } from "react";
import Link from "next/link";

// Status configurations
const STATUS_CONFIG: Record<string, { label: string; shortLabel: string; color: string; textColor: string; bgLight: string }> = {
    office: { label: "Work From Office", shortLabel: "OFFICE", color: "bg-emerald-500", textColor: "text-emerald-500", bgLight: "bg-emerald-500/10" },
    remote: { label: "Remote", shortLabel: "REMOTE", color: "bg-indigo-500", textColor: "text-indigo-500", bgLight: "bg-indigo-500/10" },
    wfh: { label: "Work From Home", shortLabel: "WFH", color: "bg-sky-500", textColor: "text-sky-500", bgLight: "bg-sky-500/10" },
    wfa: { label: "Work From Anywhere", shortLabel: "WFA", color: "bg-purple-500", textColor: "text-purple-500", bgLight: "bg-purple-500/10" },
    cuti: { label: "Cuti", shortLabel: "CUTI", color: "bg-amber-500", textColor: "text-amber-500", bgLight: "bg-amber-500/10" },
    sakit: { label: "Sakit", shortLabel: "SAKIT", color: "bg-rose-500", textColor: "text-rose-500", bgLight: "bg-rose-500/10" },
    izin: { label: "Izin", shortLabel: "IZIN", color: "bg-orange-500", textColor: "text-orange-500", bgLight: "bg-orange-500/10" },
    dinas: { label: "Dinas Luar", shortLabel: "DINAS", color: "bg-blue-500", textColor: "text-blue-500", bgLight: "bg-blue-500/10" },
    lembur: { label: "Lembur", shortLabel: "LEMBUR", color: "bg-orange-600", textColor: "text-orange-600", bgLight: "bg-orange-600/10" },
    away: { label: "Away", shortLabel: "AWAY", color: "bg-gray-500", textColor: "text-gray-500", bgLight: "bg-gray-500/10" },
    // Compatibility keys
    wfo: { label: "Work From Office", shortLabel: "WFO", color: "bg-emerald-500", textColor: "text-emerald-500", bgLight: "bg-emerald-500/10" },
    sick: { label: "Sakit", shortLabel: "SAKIT", color: "bg-rose-500", textColor: "text-rose-500", bgLight: "bg-rose-500/10" },
    leave: { label: "Cuti", shortLabel: "CUTI", color: "bg-amber-500", textColor: "text-amber-500", bgLight: "bg-amber-500/10" },
};

type StatusType = keyof typeof STATUS_CONFIG;

interface TodoItem {
    id: string;
    text: string;
    completed: boolean;
    priority: "high" | "medium" | "low";
}

interface Project {
    id: string;
    name: string;
    role: "lead" | "member" | "helper";
    progress: number;
    dueDate: string;
}

interface Employee {
    id: string;
    name: string;
    role: string;
    department: string;
    email: string;
    phone: string;
    avatar?: string;
    status: StatusType;
    checkInTime?: string;
    projects: Project[];
    todayTodos: TodoItem[];
}

// Mock employee data
const mockEmployees: Employee[] = [
    {
        id: "1",
        name: "Andi Pratama",
        role: "Senior Auditor",
        department: "Audit",
        email: "andi.pratama@company.com",
        phone: "+62 812-1234-5678",
        status: "wfo",
        checkInTime: "08:15",
        projects: [
            { id: "p1", name: "Project ABC - Audit PT Maju Jaya", role: "lead", progress: 75, dueDate: "Oct 24, 2024" },
            { id: "p2", name: "Annual Employee Survey", role: "member", progress: 15, dueDate: "Dec 15, 2024" },
        ],
        todayTodos: [
            { id: "t1", text: "Review laporan audit chapter 3", completed: false, priority: "high" },
            { id: "t2", text: "Meeting dengan klien PT ABC - 14:00", completed: false, priority: "high" },
            { id: "t3", text: "Finalize audit working paper", completed: true, priority: "medium" },
        ],
    },
    {
        id: "2",
        name: "Sarah Jenkins",
        role: "HR Manager",
        department: "Human Resources",
        email: "sarah.jenkins@company.com",
        phone: "+62 813-2345-6789",
        status: "wfh",
        checkInTime: "08:32",
        projects: [
            { id: "p3", name: "Q4 Recruitment Drive - Tech Division", role: "lead", progress: 92, dueDate: "Nov 01, 2024" },
        ],
        todayTodos: [
            { id: "t4", text: "Interview kandidat Senior Developer", completed: false, priority: "high" },
            { id: "t5", text: "Review CV batch terbaru", completed: false, priority: "medium" },
            { id: "t6", text: "Update job posting", completed: true, priority: "low" },
        ],
    },
    {
        id: "3",
        name: "Michael Chen",
        role: "Finance Analyst",
        department: "Finance",
        email: "michael.chen@company.com",
        phone: "+62 814-3456-7890",
        status: "leave",
        projects: [
            { id: "p4", name: "Budget Planning 2025", role: "member", progress: 45, dueDate: "Jan 30, 2025" },
        ],
        todayTodos: [],
    },
    {
        id: "4",
        name: "Citra Lestari",
        role: "Business Development",
        department: "BisDev",
        email: "citra.lestari@company.com",
        phone: "+62 815-4567-8901",
        status: "wfo",
        checkInTime: "08:45",
        projects: [
            { id: "p5", name: "Client XYZ Proposal", role: "lead", progress: 60, dueDate: "Nov 15, 2024" },
            { id: "p6", name: "Partnership Expansion", role: "member", progress: 30, dueDate: "Dec 30, 2024" },
        ],
        todayTodos: [
            { id: "t7", text: "Follow up proposal ke klien XYZ", completed: false, priority: "high" },
            { id: "t8", text: "Prepare presentasi pitching", completed: false, priority: "medium" },
        ],
    },
    {
        id: "5",
        name: "Budi Santoso",
        role: "Junior Auditor",
        department: "Audit",
        email: "budi.santoso@company.com",
        phone: "+62 816-5678-9012",
        status: "wfo",
        checkInTime: "08:20",
        projects: [
            { id: "p1", name: "Project ABC - Audit PT Maju Jaya", role: "member", progress: 75, dueDate: "Oct 24, 2024" },
        ],
        todayTodos: [
            { id: "t9", text: "Input data vouching", completed: false, priority: "high" },
            { id: "t10", text: "Cross-check dokumen AP", completed: true, priority: "medium" },
        ],
    },
    {
        id: "6",
        name: "Eva Wijaya",
        role: "Admin Staff",
        department: "Operations",
        email: "eva.wijaya@company.com",
        phone: "+62 817-6789-0123",
        status: "sick",
        projects: [],
        todayTodos: [],
    },
    {
        id: "7",
        name: "David Lee",
        role: "IT Specialist",
        department: "IT",
        email: "david.lee@company.com",
        phone: "+62 818-7890-1234",
        status: "wfh",
        checkInTime: "09:00",
        projects: [
            { id: "p7", name: "System Upgrade Phase 2", role: "lead", progress: 40, dueDate: "Feb 28, 2025" },
        ],
        todayTodos: [
            { id: "t11", text: "Deploy hotfix ke production", completed: false, priority: "high" },
            { id: "t12", text: "Review code PR #234", completed: false, priority: "medium" },
        ],
    },
];

const DEPARTMENTS = ["All", "Audit", "Human Resources", "Finance", "BisDev", "Operations", "IT"];

export default function TeamDirectoryPage() {
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedDepartment, setSelectedDepartment] = useState("All");
    const [selectedStatus, setSelectedStatus] = useState<string>("all");
    const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);

    const filteredEmployees = mockEmployees.filter((emp) => {
        const matchesSearch = emp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            emp.role.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesDept = selectedDepartment === "All" || emp.department === selectedDepartment;
        const matchesStatus = selectedStatus === "all" || emp.status === selectedStatus;
        return matchesSearch && matchesDept && matchesStatus;
    });

    const statusCounts = {
        office: mockEmployees.filter(e => e.status === "office" || e.status === "wfo").length,
        wfh: mockEmployees.filter(e => e.status === "wfh").length,
        cuti: mockEmployees.filter(e => e.status === "cuti" || e.status === "leave").length,
        sakit: mockEmployees.filter(e => e.status === "sakit" || e.status === "sick").length,
    };

    const getRoleColor = (role: "lead" | "member" | "helper") => {
        switch (role) {
            case "lead": return "text-[#e8c559]";
            case "member": return "text-sky-400";
            case "helper": return "text-purple-400";
        }
    };

    const getPriorityColor = (priority: "high" | "medium" | "low") => {
        switch (priority) {
            case "high": return "bg-rose-500";
            case "medium": return "bg-amber-500";
            case "low": return "bg-gray-500";
        }
    };

    return (
        <div className="flex flex-col h-full">
            {/* Page Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight text-[var(--text-primary)]">Team Directory</h2>
                    <p className="text-[var(--text-secondary)] text-sm mt-1">Lihat status, project, dan aktivitas seluruh tim.</p>
                </div>
                <Link
                    href="/dashboard/workspace/board"
                    className="h-10 px-5 rounded-lg border border-[var(--glass-border)] bg-[var(--glass-bg)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] text-sm font-medium transition-colors flex items-center gap-2"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11z" />
                    </svg>
                    Weekly Board
                </Link>
            </div>

            {/* Status Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="glass-panel p-4 rounded-xl">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                            <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-[var(--text-primary)]">{statusCounts.office}</p>
                            <p className="text-xs text-[var(--text-muted)]">Work From Office</p>
                        </div>
                    </div>
                </div>
                <div className="glass-panel p-4 rounded-xl">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-sky-500/10 flex items-center justify-center">
                            <div className="w-3 h-3 rounded-full bg-sky-500"></div>
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-[var(--text-primary)]">{statusCounts.wfh}</p>
                            <p className="text-xs text-[var(--text-muted)]">Work From Home</p>
                        </div>
                    </div>
                </div>
                <div className="glass-panel p-4 rounded-xl">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
                            <div className="w-3 h-3 rounded-full bg-amber-500"></div>
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-[var(--text-primary)]">{statusCounts.cuti}</p>
                            <p className="text-xs text-[var(--text-muted)]">On Leave</p>
                        </div>
                    </div>
                </div>
                <div className="glass-panel p-4 rounded-xl">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-rose-500/10 flex items-center justify-center">
                            <div className="w-3 h-3 rounded-full bg-rose-500"></div>
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-[var(--text-primary)]">{statusCounts.sakit}</p>
                            <p className="text-xs text-[var(--text-muted)]">Sick Leave</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Search & Filters */}
            <div className="flex flex-col lg:flex-row gap-4 mb-6">
                {/* Search */}
                <div className="relative flex-1">
                    <svg xmlns="http://www.w3.org/2000/svg" className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-[var(--text-muted)]" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" />
                    </svg>
                    <input
                        type="text"
                        placeholder="Cari nama atau role..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full h-11 rounded-xl border border-[var(--glass-border)] bg-[var(--card-bg)] pl-10 pr-4 text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:ring-2 focus:ring-[#e8c559]/50 focus:border-[#e8c559] transition-all"
                    />
                </div>

                {/* Department Filter */}
                <select
                    value={selectedDepartment}
                    onChange={(e) => setSelectedDepartment(e.target.value)}
                    className="h-11 px-4 rounded-xl border border-[var(--glass-border)] bg-[var(--card-bg)] text-sm text-[var(--text-primary)] focus:border-[#e8c559] focus:ring-1 focus:ring-[#e8c559] outline-none"
                >
                    {DEPARTMENTS.map((dept) => (
                        <option key={dept} value={dept}>{dept === "All" ? "All Departments" : dept}</option>
                    ))}
                </select>

                {/* Status Filter */}
                <select
                    value={selectedStatus}
                    onChange={(e) => setSelectedStatus(e.target.value)}
                    className="h-11 px-4 rounded-xl border border-[var(--glass-border)] bg-[var(--card-bg)] text-sm text-[var(--text-primary)] focus:border-[#e8c559] focus:ring-1 focus:ring-[#e8c559] outline-none"
                >
                    <option value="all">All Status</option>
                    <option value="office">Office</option>
                    <option value="remote">Remote</option>
                    <option value="wfh">WFH</option>
                    <option value="wfa">WFA</option>
                    <option value="cuti">Leave/Cuti</option>
                    <option value="sakit">Sick/Sakit</option>
                    <option value="dinas">Dinas</option>
                    <option value="lembur">Lembur</option>
                    <option value="away">Away</option>
                </select>
            </div>

            {/* Employee Grid */}
            <div className="flex-1 overflow-auto">
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {filteredEmployees.map((employee) => {
                        const statusConfig = STATUS_CONFIG[employee.status];
                        return (
                            <div
                                key={employee.id}
                                onClick={() => setSelectedEmployee(employee)}
                                className="glass-panel p-5 rounded-xl hover:border-[#e8c559]/30 transition-all cursor-pointer group"
                            >
                                {/* Header */}
                                <div className="flex items-start justify-between mb-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#e8c559]/30 to-[#b89530]/30 flex items-center justify-center text-[#e8c559] font-bold text-lg">
                                            {employee.name.split(" ").map(n => n[0]).join("")}
                                        </div>
                                        <div>
                                            <h3 className="font-semibold text-[var(--text-primary)] group-hover:text-[#e8c559] transition-colors">
                                                {employee.name}
                                            </h3>
                                            <p className="text-xs text-[var(--text-muted)]">{employee.role}</p>
                                        </div>
                                    </div>
                                    <div className={`flex items-center gap-1.5 px-2 py-1 rounded-full ${statusConfig.bgLight}`}>
                                        <div className={`w-2 h-2 rounded-full ${statusConfig.color}`}></div>
                                        <span className={`text-xs font-medium ${statusConfig.textColor}`}>{statusConfig.shortLabel}</span>
                                    </div>
                                </div>

                                {/* Check-in Time */}
                                {employee.checkInTime && (
                                    <div className="flex items-center gap-2 text-xs text-[var(--text-muted)] mb-3">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor">
                                            <path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z" />
                                        </svg>
                                        Check-in: {employee.checkInTime}
                                    </div>
                                )}

                                {/* Projects */}
                                <div className="mb-3">
                                    <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] mb-2">Projects ({employee.projects.length})</p>
                                    {employee.projects.length > 0 ? (
                                        <div className="space-y-1.5">
                                            {employee.projects.slice(0, 2).map((project) => (
                                                <div key={project.id} className="flex items-center justify-between text-xs">
                                                    <span className="text-[var(--text-secondary)] truncate max-w-[180px]">{project.name.split(" - ")[0]}</span>
                                                    <span className={`text-[10px] font-medium ${getRoleColor(project.role)}`}>{project.role}</span>
                                                </div>
                                            ))}
                                            {employee.projects.length > 2 && (
                                                <p className="text-[10px] text-[var(--text-muted)]">+{employee.projects.length - 2} more</p>
                                            )}
                                        </div>
                                    ) : (
                                        <p className="text-xs text-[var(--text-muted)] italic">No active projects</p>
                                    )}
                                </div>

                                {/* Today's To-Do */}
                                <div>
                                    <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] mb-2">Today&apos;s To-Do ({employee.todayTodos.length})</p>
                                    {employee.todayTodos.length > 0 ? (
                                        <div className="space-y-1">
                                            {employee.todayTodos.slice(0, 2).map((todo) => (
                                                <div key={todo.id} className="flex items-center gap-2 text-xs">
                                                    <div className={`w-1.5 h-1.5 rounded-full ${getPriorityColor(todo.priority)}`}></div>
                                                    <span className={`truncate ${todo.completed ? "line-through text-[var(--text-muted)]" : "text-[var(--text-secondary)]"}`}>
                                                        {todo.text}
                                                    </span>
                                                </div>
                                            ))}
                                            {employee.todayTodos.length > 2 && (
                                                <p className="text-[10px] text-[var(--text-muted)]">+{employee.todayTodos.length - 2} more</p>
                                            )}
                                        </div>
                                    ) : (
                                        <p className="text-xs text-[var(--text-muted)] italic">No tasks today</p>
                                    )}
                                </div>

                                {/* View Detail Link */}
                                <div className="mt-4 pt-3 border-t border-[var(--glass-border)] text-center">
                                    <span className="text-xs text-[#e8c559] font-medium group-hover:underline">Click for details →</span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Employee Detail Modal */}
            {selectedEmployee && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setSelectedEmployee(null)}>
                    <div className="glass-panel w-full max-w-2xl rounded-2xl p-6 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                        {/* Modal Header */}
                        <div className="flex justify-between items-start mb-6">
                            <div className="flex items-center gap-4">
                                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#e8c559]/30 to-[#b89530]/30 flex items-center justify-center text-[#e8c559] font-bold text-2xl">
                                    {selectedEmployee.name.split(" ").map(n => n[0]).join("")}
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold text-[var(--text-primary)]">{selectedEmployee.name}</h2>
                                    <p className="text-sm text-[var(--text-secondary)]">{selectedEmployee.role}</p>
                                    <p className="text-xs text-[var(--text-muted)]">{selectedEmployee.department}</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setSelectedEmployee(null)}
                                className="p-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 text-[var(--text-muted)]"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
                                </svg>
                            </button>
                        </div>

                        {/* Status & Contact */}
                        <div className="grid grid-cols-2 gap-4 mb-6">
                            <div className="glass-panel p-4 rounded-xl">
                                <p className="text-xs text-[var(--text-muted)] mb-2">Status Hari Ini</p>
                                <div className="flex items-center gap-2">
                                    <div className={`w-3 h-3 rounded-full ${STATUS_CONFIG[selectedEmployee.status].color}`}></div>
                                    <span className="font-medium text-[var(--text-primary)]">{STATUS_CONFIG[selectedEmployee.status].label}</span>
                                </div>
                                {selectedEmployee.checkInTime && (
                                    <p className="text-xs text-[var(--text-muted)] mt-1">Check-in: {selectedEmployee.checkInTime}</p>
                                )}
                            </div>
                            <div className="glass-panel p-4 rounded-xl">
                                <p className="text-xs text-[var(--text-muted)] mb-2">Contact</p>
                                <p className="text-sm text-[var(--text-primary)]">{selectedEmployee.email}</p>
                                <p className="text-xs text-[var(--text-muted)]">{selectedEmployee.phone}</p>
                            </div>
                        </div>

                        {/* Projects */}
                        <div className="mb-6">
                            <h3 className="text-sm font-bold text-[var(--text-primary)] mb-3">📊 Active Projects</h3>
                            {selectedEmployee.projects.length > 0 ? (
                                <div className="space-y-3">
                                    {selectedEmployee.projects.map((project) => (
                                        <div key={project.id} className="glass-panel p-4 rounded-lg">
                                            <div className="flex items-center justify-between mb-2">
                                                <span className="font-medium text-[var(--text-primary)]">{project.name}</span>
                                                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${project.role === "lead" ? "bg-[#e8c559]/20 text-[#e8c559]" :
                                                    project.role === "member" ? "bg-sky-500/20 text-sky-400" :
                                                        "bg-purple-500/20 text-purple-400"
                                                    }`}>
                                                    {project.role.toUpperCase()}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-4 text-xs text-[var(--text-muted)]">
                                                <span>Due: {project.dueDate}</span>
                                                <span>Progress: {project.progress}%</span>
                                            </div>
                                            <div className="mt-2 h-1.5 w-full bg-[var(--glass-bg)] rounded-full overflow-hidden">
                                                <div
                                                    className="h-full bg-[#e8c559] rounded-full transition-all"
                                                    style={{ width: `${project.progress}%` }}
                                                />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-sm text-[var(--text-muted)] italic">No active projects</p>
                            )}
                        </div>

                        {/* Today's To-Do */}
                        <div>
                            <h3 className="text-sm font-bold text-[var(--text-primary)] mb-3">✅ Today&apos;s To-Do</h3>
                            {selectedEmployee.todayTodos.length > 0 ? (
                                <div className="space-y-2">
                                    {selectedEmployee.todayTodos.map((todo) => (
                                        <div key={todo.id} className="flex items-center gap-3 p-3 rounded-lg bg-[var(--glass-bg)]">
                                            <div className={`w-2 h-2 rounded-full flex-shrink-0 ${getPriorityColor(todo.priority)}`}></div>
                                            <span className={`text-sm flex-1 ${todo.completed ? "line-through text-[var(--text-muted)]" : "text-[var(--text-primary)]"}`}>
                                                {todo.text}
                                            </span>
                                            {todo.completed && (
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-emerald-500" viewBox="0 0 24 24" fill="currentColor">
                                                    <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                                                </svg>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-sm text-[var(--text-muted)] italic">No tasks scheduled for today</p>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
