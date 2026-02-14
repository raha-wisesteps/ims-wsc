"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import {
    Clock, CalendarDays, Users, Filter, Search,
    ChevronDown, MapPin, AlertCircle, CheckCircle,
    ChevronRight, FileSpreadsheet
} from "lucide-react";
import * as XLSX from "xlsx";

// Types
interface Profile {
    id: string;
    full_name: string;
    employee_id: number | null;
    job_type: string;
    job_level: string;
}

interface AttendanceRecord {
    id: string;
    profile_id: string;
    employee_id: number | null;
    checkin_date: string;
    status: string;
    clock_in_time: string | null;
    clock_out_time: string | null;
    is_late: boolean;
    source: string;
    notes: string | null;
    profiles?: Profile;
}

// Status badge colors
const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
    office: { bg: "bg-emerald-500/10", text: "text-emerald-500" },
    wfh: { bg: "bg-purple-500/10", text: "text-purple-500" },
    wfa: { bg: "bg-sky-500/10", text: "text-sky-500" },
    sick: { bg: "bg-rose-500/10", text: "text-rose-500" },
    leave: { bg: "bg-amber-500/10", text: "text-amber-500" },
    cuti: { bg: "bg-pink-500/10", text: "text-pink-500" },
    izin: { bg: "bg-orange-500/10", text: "text-orange-500" },
    field: { bg: "bg-blue-500/10", text: "text-blue-500" },
    dinas: { bg: "bg-blue-500/10", text: "text-blue-500" },
    lembur: { bg: "bg-orange-500/10", text: "text-orange-500" },
    remote: { bg: "bg-purple-500/10", text: "text-purple-500" },
};

// Format time for display
const formatTime = (isoTime: string | null): string => {
    if (!isoTime) return "-";
    const date = new Date(isoTime);
    return date.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
};

// Format date for display
const formatDate = (dateStr: string): string => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("id-ID", { weekday: "short", day: "numeric", month: "short", year: "numeric" });
};

// Calculate duration
const calculateDuration = (clockIn: string | null, clockOut: string | null): string => {
    if (!clockIn || !clockOut) return "-";
    const inTime = new Date(clockIn);
    const outTime = new Date(clockOut);
    const diffMs = outTime.getTime() - inTime.getTime();
    if (diffMs <= 0) return "-";
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
};

export default function AttendanceHistoryPage() {
    const supabase = createClient();

    // State
    const [profiles, setProfiles] = useState<Profile[]>([]);
    const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Filters
    const [selectedProfile, setSelectedProfile] = useState<string>("all");
    const [startDate, setStartDate] = useState<string>(() => {
        const date = new Date();
        date.setMonth(date.getMonth() - 1);
        return date.toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' }).split('T')[0];
    });
    const [endDate, setEndDate] = useState<string>(() => {
        return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' }).split('T')[0];
    });
    const [statusFilter, setStatusFilter] = useState<string>("all");
    const [searchQuery, setSearchQuery] = useState<string>("");
    const [isFilterOpen, setIsFilterOpen] = useState(false);

    // Fetch profiles
    useEffect(() => {
        const fetchProfiles = async () => {
            const { data, error } = await supabase
                .from("profiles")
                .select("id, full_name, employee_id, job_type, job_level")

                .eq("is_active", true)
                .neq("role", "hr") // Exclude HR role
                .order("full_name");

            if (error) {
                console.error("Error fetching profiles:", error);
                setError("Gagal memuat data karyawan");
            } else {
                setProfiles(data || []);
            }
        };
        fetchProfiles();
    }, [supabase]);

    // Fetch attendance records
    useEffect(() => {
        const fetchAttendance = async () => {
            setIsLoading(true);
            setError(null);

            let query = supabase
                .from("daily_checkins")
                .select(`
                    id,
                    profile_id,
                    employee_id,
                    checkin_date,
                    status,
                    clock_in_time,
                    clock_out_time,
                    is_late,
                    source,
                    notes,
                    profiles:profile_id (
                        id,
                        full_name,
                        employee_id,
                        job_type,
                        job_level
                    )
                `)
                .gte("checkin_date", startDate)
                .lte("checkin_date", endDate)
                .order("checkin_date", { ascending: false });

            if (selectedProfile !== "all") {
                query = query.eq("profile_id", selectedProfile);
            }

            if (statusFilter !== "all") {
                query = query.eq("status", statusFilter);
            }

            const { data, error } = await query;

            if (error) {
                console.error("Error fetching attendance:", error);
                setError("Gagal memuat data absensi");
            } else {
                setAttendanceRecords(data || []);
            }
            setIsLoading(false);
        };

        fetchAttendance();
    }, [supabase, selectedProfile, startDate, endDate, statusFilter]);

    // Filtered data with search
    const filteredRecords = useMemo(() => {
        if (!searchQuery) return attendanceRecords;
        const query = searchQuery.toLowerCase();
        return attendanceRecords.filter(record => {
            const profile = record.profiles as unknown as Profile;
            return profile?.full_name?.toLowerCase().includes(query);
        });
    }, [attendanceRecords, searchQuery]);

    // Stats
    const stats = useMemo(() => {
        const total = filteredRecords.length;
        const late = filteredRecords.filter(r => r.is_late).length;
        const complete = filteredRecords.filter(r => r.clock_in_time && r.clock_out_time).length;
        const uniqueDays = new Set(filteredRecords.map(r => r.checkin_date)).size;
        return { total, late, complete, uniqueDays };
    }, [filteredRecords]);

    // Export to Excel
    const exportToExcel = () => {
        const headers = ["Tanggal", "Nama", "Employee ID", "Status", "Clock In", "Clock Out", "Durasi", "Late", "Source"];
        const rows = filteredRecords.map(record => {
            const profile = record.profiles as unknown as Profile;
            return {
                "Tanggal": record.checkin_date,
                "Nama": profile?.full_name || "-",
                "Employee ID": record.employee_id || "-",
                "Status": record.status || "-",
                "Clock In": formatTime(record.clock_in_time),
                "Clock Out": formatTime(record.clock_out_time),
                "Durasi": calculateDuration(record.clock_in_time, record.clock_out_time),
                "Late": record.is_late ? "Ya" : "Tidak",
                "Source": record.source || "-"
            };
        });

        const worksheet = XLSX.utils.json_to_sheet(rows);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Attendance Data");
        XLSX.writeFile(workbook, `attendance_${startDate}_to_${endDate}.xlsx`);
    };

    return (
        <div className="space-y-6 pb-20">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-600 to-indigo-800 flex items-center justify-center shadow-lg shadow-indigo-900/20">
                        <Clock className="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2 mb-1 text-sm text-[var(--text-secondary)]">
                            <Link href="/dashboard" className="hover:text-[var(--text-primary)] transition-colors">Dashboard</Link>
                            <ChevronRight className="h-4 w-4" />
                            <Link href="/dashboard/hr" className="hover:text-[var(--text-primary)] transition-colors">Human Resource</Link>
                            <ChevronRight className="h-4 w-4" />
                            <span>Attendance History</span>
                        </div>
                        <h1 className="text-2xl font-bold text-[var(--text-primary)]">Attendance History</h1>
                        <p className="text-sm text-[var(--text-secondary)]">Riwayat absensi karyawan</p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={exportToExcel}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg border border-[var(--glass-border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--glass-border)]/50 transition-colors"
                    >
                        <FileSpreadsheet className="w-4 h-4" />
                        Export Excel
                    </button>
                </div>
            </div>

            {/* Filters */}
            <div className="glass-panel p-4 rounded-xl space-y-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Filter className="w-5 h-5 text-[var(--text-muted)]" />
                        <span className="font-medium text-[var(--text-primary)]">Filter</span>
                    </div>
                    <button
                        onClick={() => setIsFilterOpen(!isFilterOpen)}
                        className="md:hidden flex items-center gap-1 text-sm text-[var(--accent-gold)]"
                    >
                        {isFilterOpen ? "Tutup" : "Buka"} Filter
                        <ChevronDown className={`w-4 h-4 transition-transform ${isFilterOpen ? "rotate-180" : ""}`} />
                    </button>
                </div>

                <div className={`grid grid-cols-1 md:grid-cols-5 gap-4 ${isFilterOpen ? "block" : "hidden md:grid"}`}>
                    {/* Search */}
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Cari nama..."
                            className="w-full pl-10 pr-4 py-2 rounded-lg bg-[var(--glass-bg)] border border-[var(--glass-border)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-gold)]/50"
                        />
                    </div>

                    {/* User Selector */}
                    <div className="relative">
                        <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
                        <select
                            value={selectedProfile}
                            onChange={(e) => setSelectedProfile(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 rounded-lg bg-[var(--glass-bg)] border border-[var(--glass-border)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-gold)]/50 appearance-none cursor-pointer"
                        >
                            <option value="all">Semua Karyawan</option>
                            {profiles.map((profile) => (
                                <option key={profile.id} value={profile.id}>
                                    {profile.full_name}
                                </option>
                            ))}
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)] pointer-events-none" />
                    </div>

                    {/* Start Date */}
                    <div className="relative">
                        <CalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
                        <input
                            type="date"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 rounded-lg bg-[var(--glass-bg)] border border-[var(--glass-border)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-gold)]/50"
                        />
                    </div>

                    {/* End Date */}
                    <div className="relative">
                        <CalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
                        <input
                            type="date"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 rounded-lg bg-[var(--glass-bg)] border border-[var(--glass-border)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-gold)]/50"
                        />
                    </div>

                    {/* Status Filter */}
                    <div className="relative">
                        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 rounded-lg bg-[var(--glass-bg)] border border-[var(--glass-border)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-gold)]/50 appearance-none cursor-pointer"
                        >
                            <option value="all">SEMUA STATUS</option>
                            <option value="office">OFFICE</option>
                            <option value="wfh">WFH</option>
                            <option value="wfa">WFA</option>
                            <option value="sick">SAKIT</option>
                            <option value="cuti">CUTI</option>
                            <option value="izin">IZIN</option>
                            <option value="dinas">DINAS</option>
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)] pointer-events-none" />
                    </div>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="glass-panel p-4 rounded-xl">
                    <p className="text-xs text-[var(--text-muted)] uppercase tracking-wider mb-1">Total Records</p>
                    <p className="text-2xl font-bold text-[var(--text-primary)]">{stats.total}</p>
                </div>
                <div className="glass-panel p-4 rounded-xl">
                    <p className="text-xs text-[var(--text-muted)] uppercase tracking-wider mb-1">Hari</p>
                    <p className="text-2xl font-bold text-[var(--text-primary)]">{stats.uniqueDays}</p>
                </div>
                <div className="glass-panel p-4 rounded-xl">
                    <p className="text-xs text-[var(--text-muted)] uppercase tracking-wider mb-1">Lengkap</p>
                    <p className="text-2xl font-bold text-emerald-500">{stats.complete}</p>
                </div>
                <div className="glass-panel p-4 rounded-xl">
                    <p className="text-xs text-[var(--text-muted)] uppercase tracking-wider mb-1">Terlambat</p>
                    <p className="text-2xl font-bold text-rose-500">{stats.late}</p>
                </div>
            </div>

            {/* Error State */}
            {
                error && (
                    <div className="glass-panel p-4 rounded-xl border-l-4 border-rose-500 bg-rose-500/10">
                        <div className="flex items-center gap-3">
                            <AlertCircle className="w-5 h-5 text-rose-500 flex-shrink-0" />
                            <p className="text-sm text-rose-500">{error}</p>
                        </div>
                    </div>
                )
            }

            {/* Loading State */}
            {
                isLoading && (
                    <div className="glass-panel p-8 rounded-xl flex items-center justify-center">
                        <div className="w-8 h-8 border-4 border-[var(--accent-gold)] border-t-transparent rounded-full animate-spin" />
                    </div>
                )
            }

            {/* Data Table */}
            {
                !isLoading && !error && (
                    <div className="glass-panel rounded-xl overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="text-left text-[var(--text-muted)] border-b border-[var(--glass-border)] bg-black/5 dark:bg-white/5">
                                        <th className="p-3 font-medium">Tanggal</th>
                                        <th className="p-3 font-medium">Nama</th>
                                        <th className="p-3 font-medium">Status</th>
                                        <th className="p-3 font-medium">Clock In</th>
                                        <th className="p-3 font-medium">Clock Out</th>
                                        <th className="p-3 font-medium">Durasi</th>
                                        <th className="p-3 font-medium">Late</th>
                                        <th className="p-3 font-medium">Source</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[var(--glass-border)]">
                                    {filteredRecords.length === 0 ? (
                                        <tr>
                                            <td colSpan={8} className="p-8 text-center text-[var(--text-muted)]">
                                                Tidak ada data absensi untuk filter yang dipilih
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredRecords.map((record) => {
                                            const profile = record.profiles as unknown as Profile;
                                            // Case-insensitive lookup
                                            const statusKey = (record.status || "").toLowerCase();
                                            // Map synonymous keys
                                            let finalKey = statusKey;
                                            if (statusKey === 'sakit') finalKey = 'sick';
                                            if (statusKey === 'dinas') finalKey = 'dinas';
                                            if (statusKey === 'lembur') finalKey = 'lembur';

                                            const statusColor = STATUS_COLORS[finalKey] || { bg: "bg-gray-500/10", text: "text-gray-500" };

                                            return (
                                                <tr key={record.id} className="hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                                                    <td className="p-3 text-[var(--text-secondary)]">
                                                        {formatDate(record.checkin_date)}
                                                    </td>
                                                    <td className="p-3 font-medium text-[var(--text-primary)]">
                                                        {profile?.full_name || "-"}
                                                        {record.employee_id && (
                                                            <span className="ml-2 text-xs text-[var(--text-muted)]">#{record.employee_id}</span>
                                                        )}
                                                    </td>
                                                    <td className="p-3">
                                                        <span className={`px-2 py-1 rounded text-xs font-medium uppercase ${statusColor.bg} ${statusColor.text}`}>
                                                            {record.status}
                                                        </span>
                                                    </td>
                                                    <td className="p-3">
                                                        {record.clock_in_time ? (
                                                            <span className="px-2 py-1 rounded bg-emerald-500/10 text-emerald-500 font-medium">
                                                                {formatTime(record.clock_in_time)}
                                                            </span>
                                                        ) : (
                                                            <span className="text-[var(--text-muted)]">-</span>
                                                        )}
                                                    </td>
                                                    <td className="p-3">
                                                        {record.clock_out_time ? (
                                                            <span className="px-2 py-1 rounded bg-rose-500/10 text-rose-500 font-medium">
                                                                {formatTime(record.clock_out_time)}
                                                            </span>
                                                        ) : (
                                                            <span className="text-[var(--text-muted)]">-</span>
                                                        )}
                                                    </td>
                                                    <td className="p-3 text-[var(--text-secondary)]">
                                                        {calculateDuration(record.clock_in_time, record.clock_out_time)}
                                                    </td>
                                                    <td className="p-3">
                                                        {record.is_late ? (
                                                            <span className="flex items-center gap-1 text-rose-500">
                                                                <AlertCircle className="w-4 h-4" />
                                                                Ya
                                                            </span>
                                                        ) : (
                                                            <span className="flex items-center gap-1 text-emerald-500">
                                                                <CheckCircle className="w-4 h-4" />
                                                                Tidak
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td className="p-3">
                                                        <span className="px-2 py-1 rounded bg-[var(--accent-gold)]/10 text-[var(--accent-gold)] text-xs">
                                                            {record.source || "web"}
                                                        </span>
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )
            }
        </div >
    );
}
