"use client";

import { useState, useMemo } from "react";
import Link from "next/link";

// Status configurations
const STATUS_CONFIG = {
    active: { label: "Active", bgClass: "bg-emerald-500/10", textClass: "text-emerald-600 dark:text-emerald-400", barClass: "bg-emerald-500", borderClass: "border-emerald-500" },
    review: { label: "In Review", bgClass: "bg-amber-500/10", textClass: "text-amber-600 dark:text-amber-400", barClass: "bg-amber-500", borderClass: "border-amber-500" },
    planning: { label: "Planning", bgClass: "bg-blue-500/10", textClass: "text-blue-600 dark:text-blue-400", barClass: "bg-blue-500", borderClass: "border-blue-500" },
    completed: { label: "Completed", bgClass: "bg-gray-500/10", textClass: "text-gray-600 dark:text-gray-400", barClass: "bg-gray-500", borderClass: "border-gray-500" },
    onhold: { label: "On Hold", bgClass: "bg-rose-500/10", textClass: "text-rose-600 dark:text-rose-400", barClass: "bg-rose-500", borderClass: "border-rose-500" },
};

type ProjectStatus = keyof typeof STATUS_CONFIG;

interface ProjectMock {
    id: string;
    name: string;
    status: ProjectStatus;
    startDate: string;
    dueDate: string;
    expectedFinishDate: string;
    progress: number;
    lead: string;
}

const mockProjects: ProjectMock[] = [
    {
        id: "1",
        name: "Project ABC - Audit PT Maju Jaya",
        status: "active",
        startDate: "2024-10-01",
        dueDate: "2024-10-24",
        expectedFinishDate: "2024-10-20",
        progress: 75,
        lead: "Andi Pratama"
    },
    {
        id: "2",
        name: "Q4 Recruitment Drive - Tech Division",
        status: "review",
        startDate: "2024-10-15",
        dueDate: "2024-11-01",
        expectedFinishDate: "2024-10-30",
        progress: 92,
        lead: "Sarah Jenkins"
    },
    {
        id: "3",
        name: "Annual Employee Satisfaction Survey",
        status: "planning",
        startDate: "2024-11-01",
        dueDate: "2024-12-15",
        expectedFinishDate: "2024-12-10",
        progress: 15,
        lead: "Michael Chen"
    },
    {
        id: "4",
        name: "Digital Transformation Phase 2",
        status: "active",
        startDate: "2024-12-01",
        dueDate: "2025-01-30",
        expectedFinishDate: "2025-01-25",
        progress: 45,
        lead: "David Lee"
    },
    {
        id: "5",
        name: "Office Renovation Project",
        status: "onhold",
        startDate: "2025-02-01",
        dueDate: "2025-03-15",
        expectedFinishDate: "2025-03-20",
        progress: 30,
        lead: "Citra Lestari"
    },
    {
        id: "6",
        name: "Client XYZ Contract Renewal",
        status: "completed",
        startDate: "2024-09-01",
        dueDate: "2024-09-30",
        expectedFinishDate: "2024-09-28",
        progress: 100,
        lead: "Budi Santoso"
    },
];

// Helper functions
const parseDate = (dateStr: string): Date => {
    return new Date(dateStr);
};

const formatDate = (date: Date): string => {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

const formatMonthYear = (date: Date): string => {
    return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
};

const getDaysBetween = (start: Date, end: Date): number => {
    return Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
};

const addDays = (date: Date, days: number): Date => {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
};

export default function ProjectTimelinePage() {
    const [selectedProject, setSelectedProject] = useState<ProjectMock | null>(null);
    const [viewMode, setViewMode] = useState<'month' | 'quarter'>('month');

    // Calculate timeline boundaries
    const { timelineStart, timelineEnd, totalDays, months, quarters, sortedProjects } = useMemo(() => {
        const sorted = [...mockProjects].sort((a, b) => parseDate(a.startDate).getTime() - parseDate(b.startDate).getTime());

        // Find earliest start and latest end
        let earliest = parseDate(sorted[0].startDate);
        let latest = parseDate(sorted[0].dueDate);

        sorted.forEach(p => {
            const start = parseDate(p.startDate);
            const due = parseDate(p.dueDate);
            if (start < earliest) earliest = start;
            if (due > latest) latest = due;
        });

        // Add padding (1 week before and after)
        const timelineStart = addDays(earliest, -7);
        const timelineEnd = addDays(latest, 14);
        const totalDays = getDaysBetween(timelineStart, timelineEnd);

        // Generate month markers
        const months: { date: Date; position: number; label: string }[] = [];
        const currentMonth = new Date(timelineStart.getFullYear(), timelineStart.getMonth(), 1);
        while (currentMonth <= timelineEnd) {
            const dayOffset = getDaysBetween(timelineStart, currentMonth);
            months.push({
                date: new Date(currentMonth),
                position: (dayOffset / totalDays) * 100,
                label: currentMonth.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
            });
            currentMonth.setMonth(currentMonth.getMonth() + 1);
        }

        // Generate quarter markers
        const quarters: { date: Date; position: number; label: string }[] = [];
        const getQuarter = (month: number) => Math.floor(month / 3) + 1;
        const startYear = timelineStart.getFullYear();
        const startQuarter = getQuarter(timelineStart.getMonth());
        let currentQuarter = new Date(startYear, (startQuarter - 1) * 3, 1);

        while (currentQuarter <= timelineEnd) {
            const dayOffset = getDaysBetween(timelineStart, currentQuarter);
            const q = getQuarter(currentQuarter.getMonth());
            quarters.push({
                date: new Date(currentQuarter),
                position: Math.max(0, (dayOffset / totalDays) * 100),
                label: `Q${q} ${currentQuarter.getFullYear()}`
            });
            currentQuarter.setMonth(currentQuarter.getMonth() + 3);
        }

        return { timelineStart, timelineEnd, totalDays, months, quarters, sortedProjects: sorted };
    }, []);

    // Calculate bar position and width for a project
    const getBarStyle = (project: ProjectMock) => {
        const start = parseDate(project.startDate);
        const end = parseDate(project.dueDate);

        const startOffset = getDaysBetween(timelineStart, start);
        const duration = getDaysBetween(start, end);

        const left = (startOffset / totalDays) * 100;
        const width = (duration / totalDays) * 100;

        return { left: `${left}%`, width: `${Math.max(width, 2)}%` };
    };

    // Get today's position
    const todayPosition = useMemo(() => {
        const today = new Date();
        if (today < timelineStart || today > timelineEnd) return null;
        const offset = getDaysBetween(timelineStart, today);
        return (offset / totalDays) * 100;
    }, [timelineStart, timelineEnd, totalDays]);

    return (
        <div className="flex flex-col h-full">
            {/* Header */}
            <div className="mb-6 flex flex-col justify-between gap-4 md:flex-row md:items-end">
                <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-2 mb-2">
                        <Link href="/dashboard/projects" className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                            </svg>
                        </Link>
                        <h1 className="text-3xl font-black tracking-tight text-[var(--text-primary)]">Gantt Chart Timeline</h1>
                    </div>
                    <p className="text-sm text-[var(--text-secondary)] max-w-2xl">
                        Interactive view of all project schedules. Hover over bars for details.
                    </p>
                </div>

                {/* View Toggle */}
                <div className="flex items-center gap-2">
                    <span className="text-xs text-[var(--text-muted)]">View:</span>
                    <div className="flex rounded-lg border border-[var(--glass-border)] overflow-hidden">
                        <button
                            onClick={() => setViewMode('month')}
                            className={`px-3 py-1.5 text-xs font-bold transition-colors ${viewMode === 'month' ? 'bg-[#e8c559] text-[#171611]' : 'bg-white dark:bg-[#1c2120] text-[var(--text-secondary)] hover:bg-gray-100 dark:hover:bg-white/5'}`}
                        >
                            Monthly
                        </button>
                        <button
                            onClick={() => setViewMode('quarter')}
                            className={`px-3 py-1.5 text-xs font-bold transition-colors ${viewMode === 'quarter' ? 'bg-[#e8c559] text-[#171611]' : 'bg-white dark:bg-[#1c2120] text-[var(--text-secondary)] hover:bg-gray-100 dark:hover:bg-white/5'}`}
                        >
                            Quarter
                        </button>
                    </div>
                </div>
            </div>

            {/* Legend */}
            <div className="mb-4 flex flex-wrap gap-3">
                {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                    <div key={key} className="flex items-center gap-1.5">
                        <div className={`h-3 w-3 rounded-full ${config.barClass}`}></div>
                        <span className="text-xs text-[var(--text-secondary)]">{config.label}</span>
                    </div>
                ))}
            </div>

            {/* Gantt Chart Container */}
            <div className="rounded-2xl border border-[var(--glass-border)] bg-white dark:bg-[#1c2120] shadow-lg overflow-hidden flex-1">
                <div className="flex h-full">
                    {/* Project Names Column (Fixed) */}
                    <div className="w-64 flex-shrink-0 border-r border-[var(--glass-border)] bg-gray-50 dark:bg-[#171714]">
                        {/* Header */}
                        <div className="h-14 border-b border-[var(--glass-border)] flex items-center px-4">
                            <span className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">Project</span>
                        </div>

                        {/* Project List */}
                        <div className="divide-y divide-[var(--glass-border)]">
                            {sortedProjects.map((project) => (
                                <div
                                    key={project.id}
                                    className={`h-16 px-4 flex flex-col justify-center cursor-pointer transition-colors hover:bg-black/5 dark:hover:bg-white/5 ${selectedProject?.id === project.id ? 'bg-[#e8c559]/10' : ''}`}
                                    onClick={() => setSelectedProject(selectedProject?.id === project.id ? null : project)}
                                >
                                    <h4 className="text-sm font-bold text-[var(--text-primary)] truncate">{project.name}</h4>
                                    <p className="text-xs text-[var(--text-secondary)] truncate">{project.lead}</p>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Timeline Chart Area */}
                    <div className="flex-1 overflow-x-auto">
                        <div className="min-w-[800px] h-full relative">
                            {/* Timeline Header with Month/Quarter markers */}
                            <div className="h-14 border-b border-[var(--glass-border)] relative bg-gray-50 dark:bg-[#171714]">
                                {(viewMode === 'month' ? months : quarters).map((marker, idx) => (
                                    <div
                                        key={idx}
                                        className="absolute top-0 h-full flex items-center border-l border-[var(--glass-border)]"
                                        style={{ left: `${marker.position}%` }}
                                    >
                                        <span className={`font-bold text-[var(--text-muted)] px-2 whitespace-nowrap ${viewMode === 'quarter' ? 'text-sm' : 'text-xs'}`}>
                                            {marker.label}
                                        </span>
                                    </div>
                                ))}
                            </div>

                            {/* Chart Grid and Bars */}
                            <div className="relative">
                                {/* Vertical Grid Lines */}
                                {(viewMode === 'month' ? months : quarters).map((marker, idx) => (
                                    <div
                                        key={idx}
                                        className="absolute top-0 bottom-0 border-l border-[var(--glass-border)]/50"
                                        style={{ left: `${marker.position}%`, height: `${sortedProjects.length * 64}px` }}
                                    ></div>
                                ))}

                                {/* Today Marker */}
                                {todayPosition !== null && (
                                    <div
                                        className="absolute top-0 z-10 flex flex-col items-center"
                                        style={{ left: `${todayPosition}%`, height: `${sortedProjects.length * 64}px` }}
                                    >
                                        <div className="px-1.5 py-0.5 bg-rose-500 text-white text-[10px] font-bold rounded-b">TODAY</div>
                                        <div className="w-0.5 flex-1 bg-rose-500"></div>
                                    </div>
                                )}

                                {/* Project Bars */}
                                {sortedProjects.map((project, idx) => {
                                    const barStyle = getBarStyle(project);
                                    const config = STATUS_CONFIG[project.status];

                                    return (
                                        <div
                                            key={project.id}
                                            className="h-16 relative flex items-center border-b border-[var(--glass-border)]"
                                        >
                                            {/* Project Bar */}
                                            <div
                                                className={`absolute h-8 rounded-lg ${config.barClass} shadow-md cursor-pointer transition-all hover:scale-[1.02] hover:shadow-lg group`}
                                                style={{ ...barStyle }}
                                                onClick={() => setSelectedProject(selectedProject?.id === project.id ? null : project)}
                                            >
                                                {/* Progress Fill */}
                                                <div
                                                    className="absolute inset-0 rounded-lg bg-white/30"
                                                    style={{ width: `${project.progress}%` }}
                                                ></div>

                                                {/* Bar Content */}
                                                <div className="relative h-full px-2 flex items-center justify-between">
                                                    <span className="text-[10px] font-bold text-white truncate">{project.progress}%</span>
                                                </div>

                                            </div>

                                            {/* Expected Finish Date Marker */}
                                            {project.expectedFinishDate && (
                                                <div
                                                    className="absolute h-8 w-1 bg-white/50 rounded"
                                                    style={{
                                                        left: `${(getDaysBetween(timelineStart, parseDate(project.expectedFinishDate)) / totalDays) * 100}%`
                                                    }}
                                                    title={`Expected: ${formatDate(parseDate(project.expectedFinishDate))}`}
                                                ></div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Selected Project Details Panel */}
            {selectedProject && (
                <div className="mt-4 p-6 rounded-2xl border border-[var(--glass-border)] bg-white dark:bg-[#1c2120] shadow-lg animate-in slide-in-from-bottom-4">
                    <div className="flex items-start justify-between mb-4">
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <h3 className="text-xl font-bold text-[var(--text-primary)]">{selectedProject.name}</h3>
                                <span className={`inline-flex items-center gap-1.5 rounded-full ${STATUS_CONFIG[selectedProject.status].bgClass} px-2.5 py-1 text-xs font-bold ${STATUS_CONFIG[selectedProject.status].textClass}`}>
                                    {STATUS_CONFIG[selectedProject.status].label}
                                </span>
                            </div>
                            <p className="text-sm text-[var(--text-secondary)]">Lead: {selectedProject.lead}</p>
                        </div>
                        <button
                            onClick={() => setSelectedProject(null)}
                            className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="p-3 rounded-xl bg-black/5 dark:bg-white/5">
                            <p className="text-xs text-[var(--text-muted)] mb-1">Start Date</p>
                            <p className="text-sm font-bold text-[var(--text-primary)]">{formatDate(parseDate(selectedProject.startDate))}</p>
                        </div>
                        <div className="p-3 rounded-xl bg-black/5 dark:bg-white/5">
                            <p className="text-xs text-[var(--text-muted)] mb-1">Due Date</p>
                            <p className="text-sm font-bold text-[var(--text-primary)]">{formatDate(parseDate(selectedProject.dueDate))}</p>
                        </div>
                        <div className="p-3 rounded-xl bg-black/5 dark:bg-white/5">
                            <p className="text-xs text-[var(--text-muted)] mb-1">Expected Finish</p>
                            <p className="text-sm font-bold text-[var(--text-primary)]">{formatDate(parseDate(selectedProject.expectedFinishDate))}</p>
                        </div>
                        <div className="p-3 rounded-xl bg-black/5 dark:bg-white/5">
                            <p className="text-xs text-[var(--text-muted)] mb-1">Progress</p>
                            <div className="flex items-center gap-2">
                                <div className="flex-1 h-2 bg-black/10 dark:bg-white/10 rounded-full overflow-hidden">
                                    <div className={`h-full ${STATUS_CONFIG[selectedProject.status].barClass}`} style={{ width: `${selectedProject.progress}%` }}></div>
                                </div>
                                <span className="text-sm font-bold text-[#b89530] dark:text-[#e8c559]">{selectedProject.progress}%</span>
                            </div>
                        </div>
                    </div>

                    {/* Duration Info */}
                    <div className="mt-4 flex items-center gap-6 text-xs text-[var(--text-secondary)]">
                        <span>
                            <span className="font-bold text-[var(--text-primary)]">{getDaysBetween(parseDate(selectedProject.startDate), parseDate(selectedProject.dueDate))}</span> days total
                        </span>
                        <span>
                            <span className="font-bold text-[var(--text-primary)]">
                                {Math.max(0, getDaysBetween(new Date(), parseDate(selectedProject.dueDate)))}
                            </span> days remaining
                        </span>
                    </div>
                </div>
            )}
        </div>
    );
}
