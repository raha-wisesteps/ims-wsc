"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
    Calendar,
    Clock,
    AlertCircle,
    CheckCircle2,
    ArrowLeft,
    Edit2,
    X,
    Check
} from "lucide-react";
import Link from "next/link";

// Status badge colors
const STATUS_COLORS: Record<string, { bg: string; text: string; label: string }> = {
    office: { bg: "bg-emerald-500/20", text: "text-emerald-400", label: "Office" },
    wfh: { bg: "bg-purple-500/20", text: "text-purple-400", label: "WFH" },
    wfa: { bg: "bg-sky-500/20", text: "text-sky-400", label: "WFA" },
    sick: { bg: "bg-rose-500/20", text: "text-rose-400", label: "Sakit" },
    sakit: { bg: "bg-rose-500/20", text: "text-rose-400", label: "Sakit" },
    leave: { bg: "bg-amber-500/20", text: "text-amber-400", label: "Cuti" },
    cuti: { bg: "bg-pink-500/20", text: "text-pink-400", label: "Cuti" },
    izin: { bg: "bg-orange-500/20", text: "text-orange-400", label: "Izin" },
    field: { bg: "bg-blue-500/20", text: "text-blue-400", label: "Dinas" },
    dinas: { bg: "bg-blue-500/20", text: "text-blue-400", label: "Dinas" },
    lembur: { bg: "bg-orange-500/20", text: "text-orange-400", label: "Lembur" },
};

interface AttendanceRecord {
    id: string;
    checkin_date: string;
    clock_in_time: string | null;
    clock_out_time: string | null;
    is_late: boolean;
    status: string | null;
}

interface TargetProfile {
    id: string;
    full_name: string;
    job_title: string;
    department: string;
}

export default function PersonalAttendancePage() {
    const supabase = createClient();
    const searchParams = useSearchParams();
    const { profile: currentUserProfile, isLoading: authLoading } = useAuth();

    const [targetProfile, setTargetProfile] = useState<TargetProfile | null>(null);
    const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [isViewingOthers, setIsViewingOthers] = useState(false);
    const [canEdit, setCanEdit] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);

    // Determine target user and fetch data
    useEffect(() => {
        const loadData = async () => {
            if (authLoading || !currentUserProfile) return;

            const targetId = searchParams.get('id') || currentUserProfile.id;
            const viewingOthers = targetId !== currentUserProfile.id;
            setIsViewingOthers(viewingOthers);

            // Check if current user can edit (CEO, Super Admin, Director)
            const userLevel = (currentUserProfile.job_level || '').toLowerCase();
            const userRole = (currentUserProfile.role || '').toLowerCase();

            const isSuperUser =
                userRole === 'super_admin' ||
                userRole === 'ceo' ||
                userLevel.includes('ceo') ||
                userLevel.includes('super admin') ||
                userLevel.includes('director');

            setCanEdit(isSuperUser && viewingOthers);

            try {
                // Fetch target profile
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('id, full_name, job_title, department')
                    .eq('id', targetId)
                    .single();

                if (profile) {
                    setTargetProfile(profile);
                }

                // Fetch attendance
                const { data: attendanceData } = await supabase
                    .from('daily_checkins')
                    .select('id, checkin_date, clock_in_time, clock_out_time, is_late, status')
                    .eq('profile_id', targetId)
                    .gte('checkin_date', '2026-01-01')
                    .order('checkin_date', { ascending: false });

                setAttendance(attendanceData || []);
            } catch (err) {
                console.error('Error loading data:', err);
            } finally {
                setLoading(false);
            }
        };

        loadData();
    }, [authLoading, currentUserProfile, searchParams, supabase]);

    // Toggle is_late status
    const handleToggleLate = async (record: AttendanceRecord) => {
        if (!canEdit) return;

        setSaving(true);
        try {
            const newValue = !record.is_late;
            const { error } = await supabase
                .from('daily_checkins')
                .update({ is_late: newValue })
                .eq('id', record.id);

            if (error) throw error;

            // Update local state
            setAttendance(prev => prev.map(r =>
                r.id === record.id ? { ...r, is_late: newValue } : r
            ));
            setEditingId(null);
        } catch (err) {
            console.error('Error updating:', err);
            alert('Gagal mengupdate status');
        } finally {
            setSaving(false);
        }
    };

    // Calculate stats
    const totalDays = attendance.length;
    const lateDays = attendance.filter(a => a.is_late).length;
    const onTimeDays = totalDays - lateDays;
    const latePercentage = totalDays > 0 ? (lateDays / totalDays) * 100 : 0;

    // Format time
    const formatTime = (isoTime: string | null): string => {
        if (!isoTime) return "-";
        const date = new Date(isoTime);
        return date.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
    };

    // Get status badge
    const getStatusBadge = (status: string | null) => {
        const key = (status || 'office').toLowerCase();
        const config = STATUS_COLORS[key] || STATUS_COLORS.office;
        return (
            <span className={`px-2 py-1 rounded text-xs font-medium uppercase ${config.bg} ${config.text}`}>
                {config.label}
            </span>
        );
    };

    if (authLoading || loading) {
        return <div className="p-10 text-white text-center">Loading attendance data...</div>;
    }

    if (!targetProfile) {
        return <div className="p-8 text-white">User not found.</div>;
    }

    return (
        <div className="p-6 max-w-5xl mx-auto pb-20">
            {/* Standardized Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                <div>
                    <div className="flex items-center gap-2 text-sm text-[var(--text-muted)] mb-1">
                        <Link href="/dashboard" className="hover:text-[#3f545f] dark:hover:text-[#e8c559]">Dashboard</Link>
                        <span>/</span>
                        <span className="text-[var(--text-primary)]">Attendance</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-2xl text-white shadow-lg">
                            <Clock className="w-6 h-6" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold tracking-tight text-[var(--text-primary)]">
                                Attendance Log
                            </h1>
                            <p className="text-[var(--text-secondary)] text-sm">
                                {isViewingOthers ? `Viewing records for ` : `Riwayat Kehadiran`}
                                {isViewingOthers && <span className="text-[#e8c559] font-bold"> {targetProfile.full_name}</span>}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    {/* Department Badge (existing) */}
                    <div className="hidden md:block text-right mr-2">
                        <div className="text-sm font-bold text-[var(--text-primary)]">{targetProfile.department}</div>
                        <div className="text-xs text-[var(--text-muted)]">{targetProfile.job_title}</div>
                    </div>

                    <Link
                        href={isViewingOthers ? `/dashboard/command-center/kpi-assessment/${targetProfile.id}` : "/dashboard"}
                        className="px-4 py-2 rounded-lg bg-[var(--glass-bg)] hover:bg-[var(--glass-border)] text-[var(--text-secondary)] font-medium transition-colors flex items-center gap-2"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Kembali
                    </Link>
                </div>
            </div>

            {/* Edit Notice for CEO/Admin */}
            {canEdit && (
                <div className="mb-6 p-3 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs flex items-center gap-2">
                    <Edit2 className="w-4 h-4" />
                    <span>Anda dapat mengedit status keterlambatan (Late/On Time) jika terdapat kesalahan sistem absen.</span>
                </div>
            )}

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                {/* Total Present */}
                <div className="p-6 rounded-2xl bg-white/5 border border-white/10 flex items-center gap-4">
                    <div className="p-3 bg-blue-500/20 text-blue-400 rounded-xl">
                        <Calendar className="w-8 h-8" />
                    </div>
                    <div>
                        <p className="text-sm text-gray-400 uppercase font-bold">Total Days</p>
                        <p className="text-3xl font-black text-white">{totalDays}</p>
                    </div>
                </div>

                {/* On Time */}
                <div className="p-6 rounded-2xl bg-white/5 border border-white/10 flex items-center gap-4">
                    <div className="p-3 bg-emerald-500/20 text-emerald-400 rounded-xl">
                        <CheckCircle2 className="w-8 h-8" />
                    </div>
                    <div>
                        <p className="text-sm text-gray-400 uppercase font-bold">On Time</p>
                        <p className="text-3xl font-black text-white">{onTimeDays}</p>
                    </div>
                </div>

                {/* Late */}
                <div className="p-6 rounded-2xl bg-white/5 border border-white/10 flex items-center gap-4">
                    <div className="p-3 bg-rose-500/20 text-rose-400 rounded-xl">
                        <AlertCircle className="w-8 h-8" />
                    </div>
                    <div>
                        <p className="text-sm text-gray-400 uppercase font-bold">Late Arrival</p>
                        <p className="text-3xl font-black text-white">{lateDays}</p>
                        <p className="text-xs text-rose-400 font-bold mt-1">{latePercentage.toFixed(1)}% Rate</p>
                    </div>
                </div>
            </div>

            {/* Attendance Table */}
            <div className="glass-panel rounded-2xl border border-white/10 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-white">
                        <thead className="bg-white/5 border-b border-white/10">
                            <tr>
                                <th className="p-4 text-left font-bold text-gray-400 uppercase text-xs">Date</th>
                                <th className="p-4 text-left font-bold text-gray-400 uppercase text-xs">Type</th>
                                <th className="p-4 text-left font-bold text-gray-400 uppercase text-xs">Clock In</th>
                                <th className="p-4 text-left font-bold text-gray-400 uppercase text-xs">Clock Out</th>
                                <th className="p-4 text-center font-bold text-gray-400 uppercase text-xs">Late Status</th>
                                {canEdit && <th className="p-4 text-center font-bold text-gray-400 uppercase text-xs">Action</th>}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/10">
                            {attendance.length > 0 ? (
                                attendance.map((log) => (
                                    <tr key={log.id} className="hover:bg-white/5 transition-colors">
                                        <td className="p-4 font-mono text-gray-300">
                                            {new Date(log.checkin_date).toLocaleDateString('id-ID', {
                                                weekday: 'long',
                                                day: 'numeric',
                                                month: 'short',
                                                year: 'numeric'
                                            })}
                                        </td>
                                        <td className="p-4">
                                            {getStatusBadge(log.status)}
                                        </td>
                                        <td className="p-4 font-mono font-bold">
                                            {formatTime(log.clock_in_time)}
                                        </td>
                                        <td className="p-4 font-mono text-gray-400">
                                            {formatTime(log.clock_out_time)}
                                        </td>
                                        <td className="p-4 text-center">
                                            {log.is_late ? (
                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-500/20 text-rose-400 text-xs font-bold border border-rose-500/20">
                                                    <AlertCircle className="w-3 h-3" /> LATE
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-bold border border-emerald-500/20">
                                                    <CheckCircle2 className="w-3 h-3" /> ON TIME
                                                </span>
                                            )}
                                        </td>
                                        {canEdit && (
                                            <td className="p-4 text-center">
                                                {editingId === log.id ? (
                                                    <div className="flex items-center justify-center gap-2">
                                                        <button
                                                            onClick={() => handleToggleLate(log)}
                                                            disabled={saving}
                                                            className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 transition-colors"
                                                            title="Confirm change"
                                                        >
                                                            <Check className="w-4 h-4" />
                                                        </button>
                                                        <button
                                                            onClick={() => setEditingId(null)}
                                                            className="p-1.5 rounded-lg bg-rose-500/20 text-rose-400 hover:bg-rose-500/30 transition-colors"
                                                            title="Cancel"
                                                        >
                                                            <X className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <button
                                                        onClick={() => setEditingId(log.id)}
                                                        className="p-1.5 rounded-lg bg-white/10 text-gray-400 hover:bg-white/20 hover:text-white transition-colors"
                                                        title={`Ubah ke ${log.is_late ? 'On Time' : 'Late'}`}
                                                    >
                                                        <Edit2 className="w-4 h-4" />
                                                    </button>
                                                )}
                                            </td>
                                        )}
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={canEdit ? 6 : 5} className="p-8 text-center text-gray-500 italic">
                                        No attendance records found for 2026.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
