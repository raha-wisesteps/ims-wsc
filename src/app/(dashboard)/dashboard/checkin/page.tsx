"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

// Status configurations
const STATUS_CONFIG = {
    office: { label: "Work From Office", icon: "🏢", color: "bg-blue-500", textColor: "text-blue-500" },
    wfh: { label: "Work From Home", icon: "🏠", color: "bg-purple-500", textColor: "text-purple-500" },
    dinas: { label: "Business Trip", icon: "✈️", color: "bg-amber-500", textColor: "text-amber-500" },
    cuti: { label: "Cuti", icon: "🌴", color: "bg-emerald-500", textColor: "text-emerald-500" },
    sakit: { label: "Sakit", icon: "🤒", color: "bg-rose-500", textColor: "text-rose-500" },
    izin: { label: "Izin", icon: "🚨", color: "bg-orange-500", textColor: "text-orange-500" },
};

type StatusType = keyof typeof STATUS_CONFIG;

interface TodoItem {
    id: string;
    text: string;
    priority: "high" | "medium" | "low";
    completed: boolean;
}

interface CheckinRecord {
    id: string;
    date: string;
    status: StatusType;
    checkInTime: string;
    checkOutTime?: string;
    todos: TodoItem[];
    notes?: string;
}

// Mock data
const mockTodayCheckin: CheckinRecord | null = null; // No check-in yet today

const mockHistory: CheckinRecord[] = [
    {
        id: "1",
        date: "2024-12-25",
        status: "office",
        checkInTime: "08:55",
        checkOutTime: "17:30",
        todos: [
            { id: "t1", text: "Review proposal PT ABC", priority: "high", completed: true },
            { id: "t2", text: "Meeting dengan tim marketing", priority: "medium", completed: true },
            { id: "t3", text: "Update dokumentasi project", priority: "low", completed: false },
        ],
    },
    {
        id: "2",
        date: "2024-12-24",
        status: "wfh",
        checkInTime: "09:10",
        checkOutTime: "18:00",
        todos: [
            { id: "t4", text: "Develop feature login", priority: "high", completed: true },
            { id: "t5", text: "Code review PR #123", priority: "medium", completed: true },
        ],
    },
    {
        id: "3",
        date: "2024-12-23",
        status: "dinas",
        checkInTime: "07:00",
        checkOutTime: "20:00",
        todos: [
            { id: "t6", text: "Visit client - PT XYZ", priority: "high", completed: true },
        ],
        notes: "Perjalanan ke Bandung",
    },
];

// Pending approved requests (auto-status)
const mockPendingApproved = {
    hasApprovedWFH: false, // Set to true to test WFH flow
    hasApprovedLeave: false,
};

export default function CheckinPage() {
    const [showCheckinModal, setShowCheckinModal] = useState(false);
    const [todayCheckin, setTodayCheckin] = useState<CheckinRecord | null>(mockTodayCheckin);
    const [selectedStatus, setSelectedStatus] = useState<StatusType | null>(null);
    const [modalStep, setModalStep] = useState(1);
    const [todos, setTodos] = useState<TodoItem[]>([]);
    const [newTodo, setNewTodo] = useState("");
    const [newTodoPriority, setNewTodoPriority] = useState<"high" | "medium" | "low">("medium");
    const [notes, setNotes] = useState("");

    const now = new Date();
    const currentTime = now.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
    const currentDate = now.toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

    // Check punctuality
    const getPunctualityStatus = (time: string) => {
        const [hours, minutes] = time.split(":").map(Number);
        const totalMinutes = hours * 60 + minutes;
        const nineAM = 9 * 60;

        if (totalMinutes <= nineAM) return { status: "ontime", label: "On Time", color: "text-emerald-500" };
        if (totalMinutes <= nineAM + 15) return { status: "grace", label: "Grace Period", color: "text-amber-500" };
        return { status: "late", label: "Terlambat", color: "text-rose-500" };
    };

    const handleAddTodo = () => {
        if (!newTodo.trim()) return;
        setTodos([...todos, {
            id: `new-${Date.now()}`,
            text: newTodo,
            priority: newTodoPriority,
            completed: false,
        }]);
        setNewTodo("");
    };

    const handleRemoveTodo = (id: string) => {
        setTodos(todos.filter(t => t.id !== id));
    };

    const handleToggleTodo = (id: string) => {
        setTodos(todos.map(t => t.id === id ? { ...t, completed: !t.completed } : t));
    };

    const handleCheckin = () => {
        if (!selectedStatus) return;

        const newCheckin: CheckinRecord = {
            id: `checkin-${Date.now()}`,
            date: now.toISOString().split("T")[0],
            status: selectedStatus,
            checkInTime: currentTime,
            todos: todos,
            notes: notes || undefined,
        };

        setTodayCheckin(newCheckin);
        setShowCheckinModal(false);
        resetModal();
    };

    const handleCheckout = () => {
        if (!todayCheckin) return;
        setTodayCheckin({
            ...todayCheckin,
            checkOutTime: currentTime,
        });
    };

    const resetModal = () => {
        setSelectedStatus(null);
        setModalStep(1);
        setTodos([]);
        setNewTodo("");
        setNotes("");
    };

    const openCheckinModal = (preselectedStatus?: StatusType) => {
        if (preselectedStatus) {
            setSelectedStatus(preselectedStatus);
            setModalStep(2);
        }
        setShowCheckinModal(true);
    };

    // Available statuses for direct check-in
    const directStatuses: StatusType[] = ["office", "wfh", "dinas"];
    const forceMajeureStatuses: StatusType[] = ["sakit", "izin"];

    return (
        <div className="flex flex-col gap-6">
            {/* Page Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-[var(--text-primary)] flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#3f545f] to-[#5f788e] dark:from-[#e8c559] dark:to-[#dcb33e] flex items-center justify-center">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white dark:text-[#171611]" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z" />
                            </svg>
                        </div>
                        Daily Check-in
                    </h2>
                    <p className="text-[var(--text-secondary)] text-sm mt-1 ml-[52px]">{currentDate}</p>
                </div>
                <Link
                    href="/dashboard/my-request"
                    className="text-sm font-medium text-[#3f545f] dark:text-[#e8c559] hover:underline flex items-center gap-2 px-4 py-2 rounded-lg bg-[#3f545f]/10 dark:bg-[#e8c559]/10 border border-[#3f545f]/20 dark:border-[#e8c559]/20 transition-all hover:bg-[#3f545f]/20 dark:hover:bg-[#e8c559]/20"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M19 3h-4.18C14.4 1.84 13.3 1 12 1c-1.3 0-2.4.84-2.82 2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 0c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1z" />
                    </svg>
                    Ajukan Izin/Cuti
                </Link>
            </div>

            {/* Today's Status Card */}
            <div className="glass-panel rounded-2xl overflow-hidden">
                {!todayCheckin ? (
                    // Not checked in yet - Modern Design
                    <div className="relative">
                        {/* Gradient Header */}
                        <div className="bg-gradient-to-r from-[#3f545f] to-[#5f788e] dark:from-[#1c2120] dark:to-[#2a2f2e] p-8 text-center">
                            <div className="w-20 h-20 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center mx-auto mb-4">
                                <span className="text-4xl">👋</span>
                            </div>
                            <h3 className="text-2xl font-bold text-white mb-2">Selamat Datang!</h3>
                            <p className="text-white/80">
                                Kamu belum check-in hari ini
                            </p>
                            <div className="inline-flex items-center gap-2 mt-4 px-4 py-2 rounded-full bg-white/20 backdrop-blur-sm">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z" />
                                </svg>
                                <span className="text-white font-bold text-lg">{currentTime}</span>
                            </div>
                        </div>

                        {/* Check-in Options */}
                        <div className="p-6">
                            <p className="text-center text-sm text-[var(--text-secondary)] mb-4">Pilih status kehadiran:</p>

                            {/* Quick Check-in Buttons */}
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
                                {directStatuses.map((status) => {
                                    const config = STATUS_CONFIG[status];
                                    return (
                                        <button
                                            key={status}
                                            onClick={() => openCheckinModal(status)}
                                            className={`p-4 rounded-xl ${config.color} text-white font-medium flex flex-col items-center gap-2 hover:opacity-90 hover:scale-[1.02] transition-all shadow-lg`}
                                        >
                                            <span className="text-3xl">{config.icon}</span>
                                            <span className="text-sm">{config.label}</span>
                                        </button>
                                    );
                                })}
                            </div>

                            {/* Approved WFH notification */}
                            {mockPendingApproved.hasApprovedWFH && (
                                <div className="p-4 rounded-xl bg-purple-500/10 border border-purple-500/20 mb-4">
                                    <p className="text-sm text-purple-600 dark:text-purple-400 font-medium flex items-center gap-2">
                                        <span className="text-lg">🏠</span>
                                        Kamu punya WFH approved untuk hari ini
                                    </p>
                                    <button
                                        onClick={() => openCheckinModal("wfh")}
                                        className="mt-3 w-full px-4 py-2.5 rounded-lg bg-purple-500 text-white text-sm font-medium hover:bg-purple-600 transition-colors"
                                    >
                                        Check In as WFH
                                    </button>
                                </div>
                            )}

                            {/* Force Majeure Options */}
                            <div className="border-t border-[var(--glass-border)] pt-4">
                                <p className="text-xs text-[var(--text-muted)] mb-3 text-center">Atau jika ada kondisi darurat:</p>
                                <div className="flex justify-center gap-3">
                                    {forceMajeureStatuses.map((status) => {
                                        const config = STATUS_CONFIG[status];
                                        return (
                                            <button
                                                key={status}
                                                onClick={() => openCheckinModal(status)}
                                                className="px-4 py-2.5 rounded-xl border-2 border-[var(--glass-border)] text-[var(--text-secondary)] text-sm font-medium hover:border-[#3f545f]/50 dark:hover:border-[#e8c559]/50 hover:bg-black/5 dark:hover:bg-white/5 transition-all flex items-center gap-2"
                                            >
                                                <span className="text-lg">{config.icon}</span>
                                                {config.label}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (
                    // Already checked in
                    <div>
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                            <div className="flex items-center gap-4">
                                <div className={`w-16 h-16 rounded-xl ${STATUS_CONFIG[todayCheckin.status].color} flex items-center justify-center text-3xl`}>
                                    {STATUS_CONFIG[todayCheckin.status].icon}
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold text-[var(--text-primary)]">
                                        {STATUS_CONFIG[todayCheckin.status].label}
                                    </h3>
                                    <div className="flex items-center gap-3 text-sm text-[var(--text-secondary)]">
                                        <span>Check-in: {todayCheckin.checkInTime}</span>
                                        <span className={getPunctualityStatus(todayCheckin.checkInTime).color}>
                                            ({getPunctualityStatus(todayCheckin.checkInTime).label})
                                        </span>
                                    </div>
                                    {todayCheckin.checkOutTime && (
                                        <p className="text-sm text-[var(--text-muted)]">Check-out: {todayCheckin.checkOutTime}</p>
                                    )}
                                </div>
                            </div>
                            {!todayCheckin.checkOutTime && (
                                <button
                                    onClick={handleCheckout}
                                    className="px-5 py-2 rounded-lg border-2 border-rose-500 text-rose-500 font-medium hover:bg-rose-500/10 transition-colors"
                                >
                                    🚪 Check Out
                                </button>
                            )}
                        </div>

                        {/* Today's To-Do List */}
                        {todayCheckin.todos.length > 0 && (
                            <div className="border-t border-[var(--glass-border)] pt-4">
                                <h4 className="font-medium text-[var(--text-primary)] mb-3">📝 Today's Plan</h4>
                                <div className="space-y-2">
                                    {todayCheckin.todos.map((todo) => (
                                        <div
                                            key={todo.id}
                                            className={`flex items-center gap-3 p-3 rounded-lg ${todo.completed ? "bg-emerald-500/10" : "bg-[var(--glass-bg)]"}`}
                                        >
                                            <button
                                                onClick={() => {
                                                    setTodayCheckin({
                                                        ...todayCheckin,
                                                        todos: todayCheckin.todos.map(t =>
                                                            t.id === todo.id ? { ...t, completed: !t.completed } : t
                                                        ),
                                                    });
                                                }}
                                                className={`w-5 h-5 rounded border-2 flex items-center justify-center ${todo.completed
                                                    ? "bg-emerald-500 border-emerald-500 text-white"
                                                    : "border-[var(--glass-border)]"
                                                    }`}
                                            >
                                                {todo.completed && "✓"}
                                            </button>
                                            <span className={`flex-1 ${todo.completed ? "line-through text-[var(--text-muted)]" : "text-[var(--text-primary)]"}`}>
                                                {todo.text}
                                            </span>
                                            <span className={`text-xs px-2 py-0.5 rounded-full ${todo.priority === "high" ? "bg-rose-500/10 text-rose-500" :
                                                todo.priority === "medium" ? "bg-amber-500/10 text-amber-500" :
                                                    "bg-gray-500/10 text-gray-500"
                                                }`}>
                                                {todo.priority}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                                <p className="text-xs text-[var(--text-muted)] mt-2">
                                    Progress: {todayCheckin.todos.filter(t => t.completed).length}/{todayCheckin.todos.length} tasks
                                </p>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* History */}
            <div className="glass-panel rounded-xl overflow-hidden flex-1">
                <div className="p-4 border-b border-[var(--glass-border)]">
                    <h3 className="font-semibold text-[var(--text-primary)]">📅 Riwayat Check-in</h3>
                </div>
                <div className="divide-y divide-[var(--glass-border)]">
                    {mockHistory.map((record) => {
                        const config = STATUS_CONFIG[record.status];
                        const punctuality = getPunctualityStatus(record.checkInTime);
                        return (
                            <div key={record.id} className="p-4 hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-10 h-10 rounded-lg ${config.color} flex items-center justify-center text-lg`}>
                                            {config.icon}
                                        </div>
                                        <div>
                                            <p className="font-medium text-[var(--text-primary)]">
                                                {new Date(record.date).toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "short" })}
                                            </p>
                                            <p className="text-sm text-[var(--text-secondary)]">
                                                {config.label} • {record.checkInTime} - {record.checkOutTime || "..."}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <span className={`text-xs ${punctuality.color}`}>{punctuality.label}</span>
                                        {record.todos.length > 0 && (
                                            <p className="text-xs text-[var(--text-muted)]">
                                                {record.todos.filter(t => t.completed).length}/{record.todos.length} tasks
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Check-in Modal */}
            {showCheckinModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="glass-panel w-full max-w-lg rounded-2xl p-6 max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-bold text-[var(--text-primary)]">
                                {modalStep === 1 ? "Pilih Status" : "Check In"}
                            </h2>
                            <button
                                onClick={() => { setShowCheckinModal(false); resetModal(); }}
                                className="p-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 text-[var(--text-muted)]"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
                                </svg>
                            </button>
                        </div>

                        {modalStep === 1 ? (
                            // Step 1: Status Selection
                            <div className="space-y-4">
                                <p className="text-sm text-[var(--text-muted)]">Pilih status kehadiran Anda hari ini:</p>
                                <div className="grid grid-cols-2 gap-3">
                                    {[...directStatuses, ...forceMajeureStatuses].map((status) => {
                                        const config = STATUS_CONFIG[status];
                                        const isForce = forceMajeureStatuses.includes(status);
                                        return (
                                            <button
                                                key={status}
                                                onClick={() => { setSelectedStatus(status); setModalStep(2); }}
                                                className={`p-4 rounded-xl border-2 text-center transition-all hover:border-[#e8c559]/50 ${selectedStatus === status
                                                    ? "border-[#e8c559] bg-[#e8c559]/10"
                                                    : "border-[var(--glass-border)]"
                                                    }`}
                                            >
                                                <span className="text-3xl block mb-2">{config.icon}</span>
                                                <span className="text-sm font-medium text-[var(--text-primary)]">{config.label}</span>
                                                {isForce && (
                                                    <span className="block text-xs text-[var(--text-muted)] mt-1">Force Majeure</span>
                                                )}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        ) : (
                            // Step 2: Details
                            <div className="space-y-4">
                                {/* Selected Status */}
                                <div className={`p-4 rounded-xl ${STATUS_CONFIG[selectedStatus!].color}/10 border border-${STATUS_CONFIG[selectedStatus!].color}/20`}>
                                    <div className="flex items-center gap-3">
                                        <span className="text-3xl">{STATUS_CONFIG[selectedStatus!].icon}</span>
                                        <div>
                                            <p className="font-semibold text-[var(--text-primary)]">{STATUS_CONFIG[selectedStatus!].label}</p>
                                            <p className="text-sm text-[var(--text-muted)]">Check-in: {currentTime}</p>
                                        </div>
                                    </div>
                                </div>

                                {/* For Force Majeure: Notes required */}
                                {forceMajeureStatuses.includes(selectedStatus!) && (
                                    <div>
                                        <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                                            Keterangan <span className="text-rose-500">*</span>
                                        </label>
                                        <textarea
                                            value={notes}
                                            onChange={(e) => setNotes(e.target.value)}
                                            className="w-full p-3 rounded-lg border border-[var(--glass-border)] bg-[var(--card-bg)] text-[var(--text-primary)] resize-none"
                                            rows={3}
                                            placeholder="Jelaskan alasan Anda..."
                                            required
                                        />
                                    </div>
                                )}

                                {/* For working statuses: To-Do List */}
                                {["office", "wfh", "dinas"].includes(selectedStatus!) && (
                                    <div>
                                        <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                                            📝 Today's To-Do List
                                        </label>

                                        {/* Add Todo */}
                                        <div className="flex gap-2 mb-3">
                                            <input
                                                type="text"
                                                value={newTodo}
                                                onChange={(e) => setNewTodo(e.target.value)}
                                                onKeyPress={(e) => e.key === "Enter" && handleAddTodo()}
                                                className="flex-1 p-2 rounded-lg border border-[var(--glass-border)] bg-[var(--card-bg)] text-[var(--text-primary)] text-sm"
                                                placeholder="Tambah task..."
                                            />
                                            <select
                                                value={newTodoPriority}
                                                onChange={(e) => setNewTodoPriority(e.target.value as "high" | "medium" | "low")}
                                                className="px-2 rounded-lg border border-[var(--glass-border)] bg-[var(--card-bg)] text-sm"
                                            >
                                                <option value="high">🔴 High</option>
                                                <option value="medium">🟡 Medium</option>
                                                <option value="low">🟢 Low</option>
                                            </select>
                                            <button
                                                onClick={handleAddTodo}
                                                className="px-3 py-2 rounded-lg bg-[#e8c559] text-[#171611] font-medium"
                                            >
                                                +
                                            </button>
                                        </div>

                                        {/* Todo List */}
                                        <div className="space-y-2 max-h-48 overflow-y-auto">
                                            {todos.map((todo) => (
                                                <div key={todo.id} className="flex items-center gap-2 p-2 rounded-lg bg-[var(--glass-bg)]">
                                                    <span className={`text-xs px-2 py-0.5 rounded-full ${todo.priority === "high" ? "bg-rose-500/20 text-rose-500" :
                                                        todo.priority === "medium" ? "bg-amber-500/20 text-amber-500" :
                                                            "bg-gray-500/20 text-gray-500"
                                                        }`}>
                                                        {todo.priority === "high" ? "🔴" : todo.priority === "medium" ? "🟡" : "🟢"}
                                                    </span>
                                                    <span className="flex-1 text-sm text-[var(--text-primary)]">{todo.text}</span>
                                                    <button
                                                        onClick={() => handleRemoveTodo(todo.id)}
                                                        className="text-rose-500 hover:text-rose-600"
                                                    >
                                                        ×
                                                    </button>
                                                </div>
                                            ))}
                                        </div>

                                        {todos.length === 0 && (
                                            <p className="text-xs text-[var(--text-muted)] text-center py-4">
                                                Tambahkan task yang akan dikerjakan hari ini
                                            </p>
                                        )}
                                    </div>
                                )}

                                {/* Business Trip: Reminder message */}
                                {selectedStatus === "dinas" && (
                                    <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                                        <p className="text-sm text-amber-600 dark:text-amber-400 flex items-center gap-2">
                                            ✈️ <strong>Jangan lupa masukan report terkait perjalananmu!</strong>
                                        </p>
                                    </div>
                                )}

                                {/* Action Buttons */}
                                <div className="flex gap-3 mt-6">
                                    <button
                                        onClick={() => { setModalStep(1); setSelectedStatus(null); }}
                                        className="flex-1 px-4 py-3 rounded-lg border border-[var(--glass-border)] text-[var(--text-secondary)] font-medium"
                                    >
                                        Kembali
                                    </button>
                                    <button
                                        onClick={handleCheckin}
                                        disabled={forceMajeureStatuses.includes(selectedStatus!) && !notes.trim()}
                                        className="flex-1 px-4 py-3 rounded-lg bg-[#e8c559] hover:bg-[#dcb33e] text-[#171611] font-bold disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        ✓ Check In
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
