"use client";

import React, { memo } from "react";
import type { AttendanceStatus, Task, TaskPriority, StatusConfigItem } from "../_types/dashboard.types";

interface DashboardModalsProps {
    // Update Plan Modal
    showUpdatePlanModal: boolean;
    setShowUpdatePlanModal: (v: boolean) => void;
    dailyPlan: Task[];
    newTaskText: string;
    setNewTaskText: (v: string) => void;
    newTaskPriority: TaskPriority;
    newTaskProject: string;
    setNewTaskProject: (v: string) => void;
    addTask: (text: string, priority: "high" | "medium" | "low") => void;
    handleToggleTask: (id: number | string) => void;
    removeTask: (id: number | string) => void;

    // Change Status Modal
    showChangeStatusModal: boolean;
    setShowChangeStatusModal: (v: boolean) => void;
    currentStatus: AttendanceStatus;
    handleStatusChange: (status: AttendanceStatus) => void;
    STATUS_CONFIG: Record<AttendanceStatus, StatusConfigItem>;
    getStatusIcon: (status: string) => React.ReactNode;

    // Clock Out Modal
    showClockOutModal: boolean;
    setShowClockOutModal: (v: boolean) => void;
    executeClockOut: () => void;
}

const DashboardModals = memo(function DashboardModals(props: DashboardModalsProps) {
    const {
        showUpdatePlanModal, setShowUpdatePlanModal,
        dailyPlan, newTaskText, setNewTaskText, newTaskPriority, newTaskProject, setNewTaskProject,
        addTask, handleToggleTask, removeTask,
        showChangeStatusModal, setShowChangeStatusModal,
        currentStatus, handleStatusChange, STATUS_CONFIG, getStatusIcon,
        showClockOutModal, setShowClockOutModal, executeClockOut,
    } = props;

    return (
        <>
            {/* Update Plan Modal */}
            {showUpdatePlanModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-card border-border border rounded-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl relative">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-xl font-bold text-[var(--text-primary)] flex items-center gap-2">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-[#e8c559]" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-9 14l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                                </svg>
                                Update Daily Plan
                            </h2>
                            <button
                                onClick={() => setShowUpdatePlanModal(false)}
                                className="p-2 hover:bg-black/10 dark:hover:bg-white/10 rounded-lg transition-colors"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-[var(--text-secondary)]" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
                                </svg>
                            </button>
                        </div>

                        {/* Add New Task */}
                        <div className="flex gap-2 mb-6">
                            <input
                                type="text"
                                placeholder="Add a new task..."
                                value={newTaskText}
                                onChange={(e) => setNewTaskText(e.target.value)}
                                onKeyPress={(e) => {
                                    if (e.key === 'Enter') {
                                        addTask(newTaskText, newTaskPriority as "high" | "medium" | "low");
                                        setNewTaskText("");
                                    }
                                }}
                                className="flex-1 p-3 rounded-lg bg-black/10 dark:bg-black/30 border border-[var(--glass-border)] text-[var(--text-primary)] placeholder-[var(--text-secondary)] focus:border-[#e8c559] focus:ring-1 focus:ring-[#e8c559] outline-none"
                            />
                            <select
                                value={newTaskProject}
                                onChange={(e) => setNewTaskProject(e.target.value)}
                                className="px-3 rounded-lg bg-black/10 dark:bg-black/30 border border-[var(--glass-border)] text-[var(--text-primary)] focus:border-[#e8c559] focus:ring-1 focus:ring-[#e8c559] outline-none"
                            >
                                <option value="General">General</option>
                                <option value="Project ABC">Project ABC</option>
                                <option value="Project XYZ">Project XYZ</option>
                            </select>
                            <button
                                onClick={() => {
                                    addTask(newTaskText, newTaskPriority as "high" | "medium" | "low");
                                    setNewTaskText("");
                                }}
                                className="px-4 rounded-lg bg-[#e8c559] text-[#1c2120] font-bold hover:bg-[#ebd07a] transition-colors"
                            >
                                Add
                            </button>
                        </div>

                        {/* Task List */}
                        <div className="space-y-3 mb-6">
                            {dailyPlan.map(task => (
                                <div
                                    key={task.id}
                                    className="flex items-center gap-3 p-3 bg-black/10 dark:bg-black/20 rounded-lg border border-[var(--glass-border)]"
                                >
                                    <input
                                        type="checkbox"
                                        checked={task.completed}
                                        onChange={() => handleToggleTask(task.id)}
                                        className="h-5 w-5 rounded border-[var(--glass-border)] border-2 bg-transparent text-[#e8c559] checked:bg-[#e8c559] checked:border-[#e8c559] focus:ring-0"
                                    />
                                    <div className="flex-1">
                                        <p className={`text-[var(--text-primary)] font-medium ${task.completed ? 'line-through opacity-60' : ''}`}>
                                            {task.text}
                                        </p>
                                        <p className="text-xs text-[var(--text-secondary)]">{task.project}</p>
                                    </div>
                                    <button
                                        onClick={() => removeTask(task.id)}
                                        className="p-1 hover:bg-rose-500/20 rounded text-[var(--text-secondary)] hover:text-rose-400 transition-colors"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                                            <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" />
                                        </svg>
                                    </button>
                                </div>
                            ))}
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowUpdatePlanModal(false)}
                                className="flex-1 py-3 rounded-lg border border-[var(--glass-border)] text-[var(--text-secondary)] hover:bg-black/5 dark:hover:bg-white/5 font-medium transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => setShowUpdatePlanModal(false)}
                                className="flex-1 py-3 rounded-lg bg-[#e8c559] text-[#1c2120] font-bold hover:bg-[#ebd07a] transition-colors"
                            >
                                Save Plan
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Change Status Modal */}
            {showChangeStatusModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-card border-border border rounded-2xl p-6 w-full max-w-md shadow-2xl relative">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-xl font-bold text-[var(--text-primary)] flex items-center gap-2">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-[#e8c559]" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M6.99 11L3 15l3.99 4v-3H14v-2H6.99v-3zM21 9l-3.99-4v3H10v2h7.01v3L21 9z" />
                                </svg>
                                Change Status
                            </h2>
                            <button
                                onClick={() => setShowChangeStatusModal(false)}
                                className="p-2 hover:bg-black/10 dark:hover:bg-white/10 rounded-lg transition-colors"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-[var(--text-secondary)]" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
                                </svg>
                            </button>
                        </div>

                        <p className="text-[var(--text-secondary)] text-sm mb-4">
                            Current status: <span className={`font-bold ${STATUS_CONFIG[currentStatus].textClass}`}>{STATUS_CONFIG[currentStatus].label}</span>
                        </p>

                        {/* Status Options */}
                        <div className="space-y-3">
                            {(Object.entries(STATUS_CONFIG) as [AttendanceStatus, typeof STATUS_CONFIG[AttendanceStatus]][]).map(([key, config]) => (
                                <button
                                    key={key}
                                    onClick={() => handleStatusChange(key)}
                                    className={`w-full flex items-center gap-4 p-4 rounded-xl border transition-all ${currentStatus === key
                                        ? 'bg-[var(--primary-main)]/10 dark:bg-[var(--primary)]/10 border-[var(--primary-main)]/30 dark:border-[var(--primary)]/30'
                                        : 'bg-black/5 dark:bg-white/5 border-[var(--glass-border)] hover:border-[var(--primary-main)]/30 dark:hover:border-[var(--primary)]/30'
                                        }`}
                                >
                                    <div className={`size-10 rounded-full flex items-center justify-center ${config.bgClass}`}>
                                        {getStatusIcon(key)}
                                    </div>
                                    <div className="text-left flex-1">
                                        <p className={`font-bold ${currentStatus === key ? 'text-[var(--primary-main)] dark:text-[var(--primary)]' : 'text-[var(--text-primary)]'}`}>
                                            {config.label}
                                        </p>
                                        <p className="text-xs text-[var(--text-secondary)]">{config.description}</p>
                                    </div>
                                    {currentStatus === key && (
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-[var(--primary-main)] dark:text-[var(--primary)]" viewBox="0 0 24 24" fill="currentColor">
                                            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                                        </svg>
                                    )}
                                </button>
                            ))}
                        </div>

                        <p className="text-xs text-[var(--text-secondary)] mt-4 text-center">
                            Note: Some statuses may require approval from HR
                        </p>
                    </div>
                </div>
            )}

            {/* Clock Out Confirmation Modal */}
            {showClockOutModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-sm shadow-2xl relative animate-in fade-in zoom-in-95 duration-200">
                        <div className="text-center">
                            <div className="w-16 h-16 bg-rose-500/10 text-rose-500 rounded-full flex items-center justify-center mx-auto mb-4">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
                                </svg>
                            </div>
                            <h3 className="text-xl font-bold text-[var(--text-primary)] mb-2">Konfirmasi Clock Out</h3>
                            <p className="text-[var(--text-secondary)] text-sm mb-6">
                                Apakah anda yakin ingin mengakhiri sesi kerja hari ini? Pastikan semua tugas sudah selesai.
                            </p>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setShowClockOutModal(false)}
                                    className="flex-1 py-3 rounded-xl border border-[var(--glass-border)] text-[var(--text-secondary)] hover:bg-black/5 dark:hover:bg-white/5 font-bold transition-colors"
                                >
                                    Batal
                                </button>
                                <button
                                    onClick={executeClockOut}
                                    className="flex-1 py-3 rounded-xl bg-rose-500 hover:bg-rose-600 text-white font-bold transition-colors shadow-lg"
                                >
                                    Ya, Clock Out
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
});

export default DashboardModals;
