"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
    Loader2,
    Calendar,
    ShieldAlert,
    ChevronRight,
    Plus,
    Pencil,
    Trash2,
    X,
    Save,
} from "lucide-react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

interface CompanyHoliday {
    id: string;
    date: string;
    name: string;
    type: "national_holiday" | "collective_leave";
}

type HolidayType = "national_holiday" | "collective_leave";

const TYPE_LABELS: Record<HolidayType, string> = {
    national_holiday: "Hari Libur Nasional",
    collective_leave: "Cuti Bersama",
};

const TYPE_COLORS: Record<HolidayType, string> = {
    national_holiday: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30",
    collective_leave: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30",
};

function formatDisplayDate(dateStr: string): string {
    const d = new Date(dateStr + "T00:00:00");
    return d.toLocaleDateString("id-ID", {
        weekday: "short",
        year: "numeric",
        month: "long",
        day: "numeric",
    });
}

export default function DayOffManagementPage() {
    const { profile, isLoading: isAuthLoading } = useAuth();
    const supabase = createClient();

    // RBAC — same as leave-management page
    const isFullHR =
        profile?.role === "hr" ||
        profile?.role === "ceo" ||
        profile?.role === "super_admin" ||
        profile?.role === "owner";

    // Data state
    const [holidays, setHolidays] = useState<CompanyHoliday[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Add form state
    const [newDate, setNewDate] = useState("");
    const [newName, setNewName] = useState("");
    const [newType, setNewType] = useState<HolidayType>("national_holiday");
    const [isAdding, setIsAdding] = useState(false);

    // Edit state
    const [editingHoliday, setEditingHoliday] = useState<CompanyHoliday | null>(null);
    const [editDate, setEditDate] = useState("");
    const [editName, setEditName] = useState("");
    const [editType, setEditType] = useState<HolidayType>("national_holiday");
    const [isSaving, setIsSaving] = useState(false);

    // Delete state
    const [deletingId, setDeletingId] = useState<string | null>(null);

    // Year filter
    const currentYear = new Date().getFullYear();
    const [selectedYear, setSelectedYear] = useState(currentYear);

    // ─── Fetch ────────────────────────────────────────────────
    const fetchHolidays = useCallback(async () => {
        const { data, error } = await supabase
            .from("company_holidays")
            .select("id, date, name, type")
            .gte("date", `${selectedYear}-01-01`)
            .lte("date", `${selectedYear}-12-31`)
            .order("date", { ascending: true });

        if (error) {
            console.error("Failed to fetch company holidays:", error);
        } else {
            setHolidays((data || []) as CompanyHoliday[]);
        }
        setIsLoading(false);
    }, [selectedYear, supabase]);

    useEffect(() => {
        if (!isAuthLoading && isFullHR) {
            fetchHolidays();
        } else if (!isAuthLoading && !isFullHR) {
            setIsLoading(false);
        }
    }, [isAuthLoading, isFullHR, fetchHolidays]);

    // ─── Add ──────────────────────────────────────────────────
    const handleAdd = async () => {
        if (!newDate || !newName.trim()) return;
        setIsAdding(true);

        const { data, error } = await supabase
            .from("company_holidays")
            .insert({ date: newDate, name: newName.trim(), type: newType })
            .select("id, date, name, type")
            .single();

        if (error) {
            console.error("Error adding holiday:", error);
            alert(error.message?.includes("duplicate")
                ? "Tanggal tersebut sudah terdaftar."
                : "Gagal menambahkan hari libur.");
        } else if (data) {
            // Insert into local state sorted by date
            setHolidays((prev) => {
                const updated = [...prev, data as CompanyHoliday];
                updated.sort((a, b) => a.date.localeCompare(b.date));
                return updated;
            });
            setNewDate("");
            setNewName("");
            setNewType("national_holiday");
        }

        setIsAdding(false);
    };

    // ─── Edit ─────────────────────────────────────────────────
    const openEdit = (h: CompanyHoliday) => {
        setEditingHoliday(h);
        setEditDate(h.date);
        setEditName(h.name);
        setEditType(h.type);
    };

    const handleSaveEdit = async () => {
        if (!editingHoliday || !editDate || !editName.trim()) return;
        setIsSaving(true);

        const { error } = await supabase
            .from("company_holidays")
            .update({
                date: editDate,
                name: editName.trim(),
                type: editType,
                updated_at: new Date().toISOString(),
            })
            .eq("id", editingHoliday.id);

        if (error) {
            console.error("Error updating holiday:", error);
            alert("Gagal menyimpan perubahan.");
        } else {
            setHolidays((prev) => {
                const updated = prev.map((h) =>
                    h.id === editingHoliday.id
                        ? { ...h, date: editDate, name: editName.trim(), type: editType }
                        : h
                );
                updated.sort((a, b) => a.date.localeCompare(b.date));
                return updated;
            });
            setEditingHoliday(null);
        }

        setIsSaving(false);
    };

    // ─── Delete ───────────────────────────────────────────────
    const handleDelete = async (id: string) => {
        if (!confirm("Yakin ingin menghapus hari libur ini?")) return;
        setDeletingId(id);

        const { error } = await supabase
            .from("company_holidays")
            .delete()
            .eq("id", id);

        if (error) {
            console.error("Error deleting holiday:", error);
            alert("Gagal menghapus hari libur.");
        } else {
            setHolidays((prev) => prev.filter((h) => h.id !== id));
        }

        setDeletingId(null);
    };

    // ─── Loading & Access Guards ──────────────────────────────
    if (isAuthLoading || (isLoading && isFullHR)) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            </div>
        );
    }

    if (!isFullHR) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
                <div className="p-4 rounded-full bg-rose-500/10">
                    <ShieldAlert className="w-12 h-12 text-rose-500" />
                </div>
                <h2 className="text-xl font-bold text-[var(--text-primary)]">Access Denied</h2>
                <Link href="/dashboard" className="px-4 py-2 bg-[#e8c559] text-black rounded-lg font-bold">
                    Back to Dashboard
                </Link>
            </div>
        );
    }

    // ─── Render ───────────────────────────────────────────────
    return (
        <div className="space-y-6 pb-10">
            {/* ── Header ──────────────────────────────────── */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center">
                        <Calendar className="w-6 h-6 text-amber-500" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2 mb-1 text-sm text-[var(--text-secondary)]">
                            <Link href="/dashboard" className="hover:text-[var(--text-primary)] transition-colors">Dashboard</Link>
                            <ChevronRight className="h-4 w-4" />
                            <Link href="/dashboard/hr" className="hover:text-[var(--text-primary)] transition-colors">Human Resource</Link>
                            <ChevronRight className="h-4 w-4" />
                            <Link href="/dashboard/hr/leave-management" className="hover:text-[var(--text-primary)] transition-colors">Leave Management</Link>
                            <ChevronRight className="h-4 w-4" />
                            <span>Day Off</span>
                        </div>
                        <h1 className="text-2xl font-bold text-[var(--text-primary)]">Kalender Hari Libur Kantor</h1>
                        <p className="text-sm text-[var(--text-secondary)]">Kelola tanggal merah dan cuti bersama perusahaan</p>
                    </div>
                </div>

                {/* Year Filter */}
                <div className="flex items-center gap-2">
                    <label className="text-sm text-[var(--text-secondary)]">Tahun:</label>
                    <select
                        value={selectedYear}
                        onChange={(e) => { setSelectedYear(Number(e.target.value)); setIsLoading(true); }}
                        className="h-10 rounded-md bg-white/5 border border-white/10 focus:outline-none focus:ring-1 focus:ring-[#e8c559] text-sm px-3 text-[var(--text-primary)]"
                    >
                        {[currentYear - 1, currentYear, currentYear + 1, currentYear + 2].map((y) => (
                            <option key={y} value={y}>{y}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* ── Add Form ─────────────────────────────────── */}
            <Card className="bg-card border-border shadow-sm">
                <CardHeader className="pb-4 border-b border-border">
                    <CardTitle className="text-lg flex items-center gap-2">
                        <Plus className="w-5 h-5 text-amber-500" />
                        Tambah Hari Libur
                    </CardTitle>
                </CardHeader>
                <CardContent className="pt-4">
                    <div className="flex flex-col md:flex-row gap-3 items-end">
                        <div className="flex-1 space-y-1">
                            <label className="text-xs font-medium text-[var(--text-secondary)]">Tanggal</label>
                            <input
                                type="date"
                                value={newDate}
                                onChange={(e) => setNewDate(e.target.value)}
                                className="w-full h-10 rounded-md bg-white/5 border border-white/10 focus:outline-none focus:ring-1 focus:ring-amber-500 px-3 text-sm text-[var(--text-primary)]"
                            />
                        </div>
                        <div className="flex-[2] space-y-1">
                            <label className="text-xs font-medium text-[var(--text-secondary)]">Nama Hari Libur</label>
                            <input
                                type="text"
                                placeholder="Contoh: Hari Raya Natal"
                                value={newName}
                                onChange={(e) => setNewName(e.target.value)}
                                className="w-full h-10 rounded-md bg-white/5 border border-white/10 focus:outline-none focus:ring-1 focus:ring-amber-500 px-3 text-sm text-[var(--text-primary)]"
                            />
                        </div>
                        <div className="flex-1 space-y-1">
                            <label className="text-xs font-medium text-[var(--text-secondary)]">Tipe</label>
                            <select
                                value={newType}
                                onChange={(e) => setNewType(e.target.value as HolidayType)}
                                className="w-full h-10 rounded-md bg-white/5 border border-white/10 focus:outline-none focus:ring-1 focus:ring-amber-500 px-3 text-sm text-[var(--text-primary)]"
                            >
                                <option value="national_holiday">Hari Libur Nasional</option>
                                <option value="collective_leave">Cuti Bersama</option>
                            </select>
                        </div>
                        <button
                            onClick={handleAdd}
                            disabled={isAdding || !newDate || !newName.trim()}
                            className="h-10 px-5 rounded-md bg-[#e8c559] text-black text-sm font-bold hover:bg-[#d6b54e] transition-colors flex items-center gap-2 disabled:opacity-50 whitespace-nowrap"
                        >
                            {isAdding ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <Plus className="w-4 h-4" />
                            )}
                            Tambah
                        </button>
                    </div>
                </CardContent>
            </Card>

            {/* ── Holiday Table ─────────────────────────────── */}
            <Card className="bg-card border-border shadow-sm">
                <CardHeader className="pb-4 border-b border-border">
                    <CardTitle className="text-lg">Daftar Hari Libur {selectedYear}</CardTitle>
                    <CardDescription>{holidays.length} hari libur terdaftar</CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-[var(--glass-bg)] bg-black/5 dark:bg-white/5">
                                <tr>
                                    <th className="text-left py-4 px-6 text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider w-10">#</th>
                                    <th className="text-left py-4 px-6 text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider">Tanggal</th>
                                    <th className="text-left py-4 px-6 text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider">Nama</th>
                                    <th className="text-left py-4 px-6 text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider">Tipe</th>
                                    <th className="text-right py-4 px-6 text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider">Aksi</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[var(--glass-border)]">
                                {holidays.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="py-12 text-center text-[var(--text-secondary)]">
                                            Belum ada hari libur terdaftar untuk tahun {selectedYear}
                                        </td>
                                    </tr>
                                ) : (
                                    holidays.map((h, idx) => {
                                        const isPast = new Date(h.date + "T00:00:00") < new Date(new Date().toDateString());
                                        return (
                                            <tr
                                                key={h.id}
                                                className={`hover:bg-black/5 dark:hover:bg-white/5 transition-colors group ${isPast ? "opacity-60" : ""}`}
                                            >
                                                <td className="py-3 px-6 text-sm text-[var(--text-muted)]">{idx + 1}</td>
                                                <td className="py-3 px-6">
                                                    <span className="text-sm font-medium text-[var(--text-primary)]">{formatDisplayDate(h.date)}</span>
                                                </td>
                                                <td className="py-3 px-6">
                                                    <span className="text-sm text-[var(--text-primary)]">{h.name}</span>
                                                </td>
                                                <td className="py-3 px-6">
                                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${TYPE_COLORS[h.type]}`}>
                                                        {TYPE_LABELS[h.type]}
                                                    </span>
                                                </td>
                                                <td className="py-3 px-6 text-right">
                                                    <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <button
                                                            onClick={() => openEdit(h)}
                                                            className="p-2 rounded-lg hover:bg-black/10 dark:hover:bg-white/10 text-gray-400 hover:text-amber-500 transition-colors"
                                                            title="Edit"
                                                        >
                                                            <Pencil className="w-4 h-4" />
                                                        </button>
                                                        <button
                                                            onClick={() => handleDelete(h.id)}
                                                            disabled={deletingId === h.id}
                                                            className="p-2 rounded-lg hover:bg-black/10 dark:hover:bg-white/10 text-gray-400 hover:text-rose-500 transition-colors disabled:opacity-50"
                                                            title="Hapus"
                                                        >
                                                            {deletingId === h.id ? (
                                                                <Loader2 className="w-4 h-4 animate-spin" />
                                                            ) : (
                                                                <Trash2 className="w-4 h-4" />
                                                            )}
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>

            {/* ── Edit Modal ────────────────────────────────── */}
            {editingHoliday && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                    <Card className="w-full max-w-md bg-card border-border shadow-xl">
                        <CardHeader className="flex flex-row items-center justify-between">
                            <div>
                                <CardTitle>Edit Hari Libur</CardTitle>
                                <CardDescription>{editingHoliday.name}</CardDescription>
                            </div>
                            <button onClick={() => setEditingHoliday(null)} className="text-gray-400 hover:text-white">
                                <X className="w-5 h-5" />
                            </button>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-1">
                                <label className="text-xs font-medium text-[var(--text-secondary)]">Tanggal</label>
                                <input
                                    type="date"
                                    value={editDate}
                                    onChange={(e) => setEditDate(e.target.value)}
                                    className="w-full h-10 rounded-md bg-white/5 border border-white/10 focus:outline-none focus:ring-1 focus:ring-amber-500 px-3 text-sm text-[var(--text-primary)]"
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-medium text-[var(--text-secondary)]">Nama Hari Libur</label>
                                <input
                                    type="text"
                                    value={editName}
                                    onChange={(e) => setEditName(e.target.value)}
                                    className="w-full h-10 rounded-md bg-white/5 border border-white/10 focus:outline-none focus:ring-1 focus:ring-amber-500 px-3 text-sm text-[var(--text-primary)]"
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-medium text-[var(--text-secondary)]">Tipe</label>
                                <select
                                    value={editType}
                                    onChange={(e) => setEditType(e.target.value as HolidayType)}
                                    className="w-full h-10 rounded-md bg-white/5 border border-white/10 focus:outline-none focus:ring-1 focus:ring-amber-500 px-3 text-sm text-[var(--text-primary)]"
                                >
                                    <option value="national_holiday">Hari Libur Nasional</option>
                                    <option value="collective_leave">Cuti Bersama</option>
                                </select>
                            </div>
                            <div className="flex justify-end gap-3 mt-6">
                                <button
                                    onClick={() => setEditingHoliday(null)}
                                    className="px-4 py-2 rounded-lg text-sm font-medium hover:bg-white/5 text-gray-400 hover:text-white transition-colors"
                                >
                                    Batal
                                </button>
                                <button
                                    onClick={handleSaveEdit}
                                    disabled={isSaving || !editDate || !editName.trim()}
                                    className="px-4 py-2 rounded-lg bg-[#e8c559] text-black text-sm font-bold hover:bg-[#d6b54e] transition-colors flex items-center gap-2 disabled:opacity-50"
                                >
                                    {isSaving ? (
                                        <>
                                            <Loader2 className="w-4 h-4 animate-spin" /> Menyimpan...
                                        </>
                                    ) : (
                                        <>
                                            <Save className="w-4 h-4" /> Simpan
                                        </>
                                    )}
                                </button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}
        </div>
    );
}
