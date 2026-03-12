"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
    CalendarDays, ChevronRight, Plus, Trash2, Check,
    Home, Briefcase, Umbrella, ClipboardList, Stethoscope,
    Loader2, AlertCircle, CheckCircle2, Globe,
} from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useCompanyHolidays } from "@/hooks/useCompanyHolidays";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

// --- Status Config (Office, Remote, Lembur hidden per requirement) ---
const STATUS_OPTIONS = [
    { id: "wfh", label: "WFH", Icon: Home, color: "bg-purple-500", textColor: "text-purple-600 dark:text-purple-400", bgLight: "bg-purple-500/10", border: "border-purple-500/20" },
    { id: "wfa", label: "WFA", Icon: Globe, color: "bg-sky-500", textColor: "text-sky-600 dark:text-sky-400", bgLight: "bg-sky-500/10", border: "border-sky-500/20" },
    { id: "dinas", label: "Dinas", Icon: Briefcase, color: "bg-blue-500", textColor: "text-blue-600 dark:text-blue-400", bgLight: "bg-blue-500/10", border: "border-blue-500/20" },
    { id: "cuti", label: "Cuti", Icon: Umbrella, color: "bg-amber-500", textColor: "text-amber-600 dark:text-amber-400", bgLight: "bg-amber-500/10", border: "border-amber-500/20" },
    { id: "izin", label: "Izin", Icon: ClipboardList, color: "bg-rose-500", textColor: "text-rose-600 dark:text-rose-400", bgLight: "bg-rose-500/10", border: "border-rose-500/20" },
    { id: "sakit", label: "Sakit", Icon: Stethoscope, color: "bg-pink-500", textColor: "text-pink-600 dark:text-pink-400", bgLight: "bg-pink-500/10", border: "border-pink-500/20" },
];

interface PlanEntry {
    id: string;
    checkin_date: string;
    status: string;
    notes: string | null;
}

// --- Helpers ---
function toDateStr(d: Date): string {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function formatDateLabel(dateStr: string): string {
    const d = new Date(dateStr + "T00:00:00");
    return d.toLocaleDateString("id-ID", { weekday: "short", day: "numeric", month: "short" });
}

export default function CeoPlanPage() {
    const supabase = createClient();
    const { profile } = useAuth();
    const { holidayMap } = useCompanyHolidays();

    // State
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [selectedStatus, setSelectedStatus] = useState("wfh");
    const [skipWeekends, setSkipWeekends] = useState(true);
    const [skipHolidays, setSkipHolidays] = useState(true);
    const [existingPlans, setExistingPlans] = useState<PlanEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState<string | null>(null);
    const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

    // Default dates: tomorrow to 2 weeks from now
    useEffect(() => {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const twoWeeks = new Date();
        twoWeeks.setDate(twoWeeks.getDate() + 14);
        setStartDate(toDateStr(tomorrow));
        setEndDate(toDateStr(twoWeeks));
    }, []);

    // Fetch existing plans
    const fetchPlans = async () => {
        if (!profile?.id) return;
        setLoading(true);
        try {
            const today = toDateStr(new Date());
            const { data, error } = await supabase
                .from("daily_checkins")
                .select("id, checkin_date, status, notes")
                .eq("profile_id", profile.id)
                .eq("source", "ceo_schedule_plan")
                .gte("checkin_date", today)
                .order("checkin_date", { ascending: true });

            if (error) throw error;
            setExistingPlans(data || []);
        } catch (err) {
            console.error("Fetch plans error:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPlans();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [profile?.id]);

    // Generate dates for the selected range
    const datesToPlan = useMemo(() => {
        if (!startDate || !endDate) return [];
        const dates: string[] = [];
        const start = new Date(startDate + "T00:00:00");
        const end = new Date(endDate + "T00:00:00");
        const curr = new Date(start);

        while (curr <= end) {
            const dateStr = toDateStr(curr);
            const dayOfWeek = curr.getDay();
            const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
            const isHoliday = !!holidayMap[dateStr];

            if (skipWeekends && isWeekend) {
                curr.setDate(curr.getDate() + 1);
                continue;
            }
            if (skipHolidays && isHoliday) {
                curr.setDate(curr.getDate() + 1);
                continue;
            }

            dates.push(dateStr);
            curr.setDate(curr.getDate() + 1);
        }
        return dates;
    }, [startDate, endDate, skipWeekends, skipHolidays, holidayMap]);

    // Save plan
    const handleSavePlan = async () => {
        if (!profile?.id || datesToPlan.length === 0) return;
        setSaving(true);
        setFeedback(null);

        try {
            const rows = datesToPlan.map((dateStr) => ({
                profile_id: profile.id,
                employee_id: profile.employee_id || null,
                checkin_date: dateStr,
                status: selectedStatus,
                is_late: false,
                source: "ceo_schedule_plan",
                notes: "Scheduled via CEO Plan",
            }));

            // Upsert one by one to handle conflicts properly
            let successCount = 0;
            for (const row of rows) {
                // Check if exists
                const { data: existing, error: checkErr } = await supabase
                    .from("daily_checkins")
                    .select("id")
                    .eq("profile_id", profile.id)
                    .eq("checkin_date", row.checkin_date)
                    .maybeSingle();

                if (checkErr) {
                    console.error(`Check error for ${row.checkin_date}:`, checkErr);
                    continue;
                }

                if (existing) {
                    const { error: updateErr } = await supabase
                        .from("daily_checkins")
                        .update({
                            status: row.status,
                            source: "ceo_schedule_plan",
                            notes: row.notes,
                        })
                        .eq("id", existing.id);
                    if (updateErr) {
                        console.error(`Update error for ${row.checkin_date}:`, updateErr);
                    } else {
                        successCount++;
                    }
                } else {
                    const { error: insertErr } = await supabase.from("daily_checkins").insert(row);
                    if (insertErr) {
                        console.error(`Insert error for ${row.checkin_date}:`, insertErr);
                    } else {
                        successCount++;
                    }
                }
            }

            setFeedback({ type: successCount === datesToPlan.length ? "success" : "error", message: `${successCount}/${datesToPlan.length} hari berhasil dijadwalkan.${successCount < datesToPlan.length ? " Cek console untuk detail error." : ""}` });
            await fetchPlans();
        } catch (err) {
            console.error("Save plan error:", err);
            setFeedback({ type: "error", message: "Gagal menyimpan jadwal." });
        } finally {
            setSaving(false);
        }
    };

    // Delete single plan entry
    const handleDeletePlan = async (id: string) => {
        setDeleting(id);
        try {
            const { error } = await supabase.from("daily_checkins").delete().eq("id", id);
            if (error) throw error;
            setExistingPlans((prev) => prev.filter((p) => p.id !== id));
        } catch (err) {
            console.error("Delete plan error:", err);
        } finally {
            setDeleting(null);
        }
    };

    // Find status config by id
    const getStatusConfig = (statusId: string) =>
        STATUS_OPTIONS.find((s) => s.id === statusId) || STATUS_OPTIONS[0];

    // Access guard
    if (profile && profile.role !== "ceo") {
        return (
            <div className="flex items-center justify-center h-[60vh]">
                <Card className="max-w-md w-full">
                    <CardContent className="p-8 text-center">
                        <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
                        <h2 className="text-lg font-bold mb-2">Access Denied</h2>
                        <p className="text-sm text-muted-foreground">Halaman ini hanya untuk CEO.</p>
                        <Link href="/dashboard">
                            <Button className="mt-4">Kembali ke Dashboard</Button>
                        </Link>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-6 pb-8">
            {/* Breadcrumb & Title */}
            <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-sky-500 to-sky-600 flex items-center justify-center shadow-lg shadow-sky-500/20">
                    <CalendarDays className="h-6 w-6 text-white" />
                </div>
                <div>
                    <div className="flex items-center gap-2 mb-1 text-sm text-muted-foreground">
                        <Link href="/dashboard" className="hover:text-foreground transition-colors">Dashboard</Link>
                        <ChevronRight className="h-4 w-4" />
                        <span>My Schedule Plan</span>
                    </div>
                    <h1 className="text-2xl font-black tracking-tight text-foreground">My Schedule Plan</h1>
                    <p className="text-sm text-muted-foreground">Atur jadwal kerja Anda untuk hari-hari mendatang.</p>
                </div>
            </div>

            {/* Plan Form */}
            <Card className="border-border/50 shadow-sm">
                <CardHeader className="pb-4">
                    <CardTitle className="flex items-center gap-2 text-lg">
                        <Plus className="h-5 w-5 text-sky-500" />
                        Buat Jadwal Baru
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                    {/* Date Range */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-semibold mb-2 text-foreground">Tanggal Mulai</label>
                            <input
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                className="w-full h-10 px-3 bg-background border border-border rounded-lg focus:ring-2 focus:ring-sky-500/30 focus:border-sky-500 transition-all outline-none text-sm"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold mb-2 text-foreground">Tanggal Selesai</label>
                            <input
                                type="date"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                className="w-full h-10 px-3 bg-background border border-border rounded-lg focus:ring-2 focus:ring-sky-500/30 focus:border-sky-500 transition-all outline-none text-sm"
                            />
                        </div>
                    </div>

                    {/* Skip Options */}
                    <div className="flex flex-wrap gap-4">
                        <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
                            <input
                                type="checkbox"
                                checked={skipWeekends}
                                onChange={(e) => setSkipWeekends(e.target.checked)}
                                className="w-4 h-4 rounded border-border accent-sky-500"
                            />
                            <span className="text-foreground">Lewati Weekend</span>
                        </label>
                        <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
                            <input
                                type="checkbox"
                                checked={skipHolidays}
                                onChange={(e) => setSkipHolidays(e.target.checked)}
                                className="w-4 h-4 rounded border-border accent-sky-500"
                            />
                            <span className="text-foreground">Lewati Hari Libur</span>
                        </label>
                    </div>

                    {/* Status Selector */}
                    <div>
                        <label className="block text-sm font-semibold mb-3 text-foreground">Pilih Status</label>
                        <div className="grid grid-cols-3 md:grid-cols-5 lg:grid-cols-9 gap-2">
                            {STATUS_OPTIONS.map((opt) => {
                                const isActive = selectedStatus === opt.id;
                                return (
                                    <button
                                        key={opt.id}
                                        onClick={() => setSelectedStatus(opt.id)}
                                        className={`
                                            flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all duration-200 cursor-pointer
                                            ${isActive
                                                ? `${opt.bgLight} ${opt.border} ${opt.textColor} scale-105 shadow-md`
                                                : "border-border/50 hover:border-border bg-background hover:bg-muted/30"
                                            }
                                        `}
                                    >
                                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isActive ? opt.color : "bg-muted"} transition-colors`}>
                                            <opt.Icon className={`h-4 w-4 ${isActive ? "text-white" : "text-muted-foreground"}`} />
                                        </div>
                                        <span className={`text-xs font-bold ${isActive ? opt.textColor : "text-muted-foreground"}`}>{opt.label}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Preview */}
                    {datesToPlan.length > 0 && (
                        <div className="rounded-xl bg-muted/30 border border-border/50 p-4">
                            <div className="text-sm font-semibold text-foreground mb-2">
                                Preview: <span className="text-sky-500">{datesToPlan.length}</span> hari akan dijadwalkan sebagai <Badge variant="secondary">
                                    {getStatusConfig(selectedStatus).label}
                                </Badge>
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                                {datesToPlan.map((d) => (
                                    <span key={d} className="text-xs px-2 py-1 rounded-md bg-background border border-border/50 text-muted-foreground">
                                        {formatDateLabel(d)}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Feedback */}
                    {feedback && (
                        <div className={`flex items-center gap-2 p-3 rounded-lg border text-sm ${
                            feedback.type === "success"
                                ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400"
                                : "bg-red-500/10 border-red-500/20 text-red-600 dark:text-red-400"
                        }`}>
                            {feedback.type === "success" ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
                            {feedback.message}
                        </div>
                    )}

                    {/* Submit */}
                    <Button
                        onClick={handleSavePlan}
                        disabled={saving || datesToPlan.length === 0}
                        className="w-full md:w-auto bg-gradient-to-r from-sky-500 to-sky-600 hover:from-sky-600 hover:to-sky-700 text-white shadow-lg shadow-sky-500/20"
                    >
                        {saving ? (
                            <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Menyimpan...
                            </>
                        ) : (
                            <>
                                <Check className="h-4 w-4 mr-2" />
                                Simpan Jadwal ({datesToPlan.length} hari)
                            </>
                        )}
                    </Button>
                </CardContent>
            </Card>

            {/* Existing Plans */}
            <Card className="border-border/50 shadow-sm">
                <CardHeader className="pb-4">
                    <CardTitle className="flex items-center gap-2 text-lg">
                        <CalendarDays className="h-5 w-5 text-sky-500" />
                        Jadwal Mendatang
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="flex items-center justify-center py-12">
                            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                        </div>
                    ) : existingPlans.length === 0 ? (
                        <div className="text-center py-12">
                            <CalendarDays className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
                            <p className="text-sm text-muted-foreground">Belum ada jadwal mendatang.</p>
                        </div>
                    ) : (
                        <div className="grid gap-2">
                            {existingPlans.map((plan) => {
                                const cfg = getStatusConfig(plan.status);
                                return (
                                    <div
                                        key={plan.id}
                                        className="flex items-center justify-between p-3 rounded-lg border border-border/50 bg-background hover:bg-muted/30 transition-colors"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${cfg.color}`}>
                                                <cfg.Icon className="h-4 w-4 text-white" />
                                            </div>
                                            <div>
                                                <p className="text-sm font-semibold text-foreground">
                                                    {formatDateLabel(plan.checkin_date)}
                                                </p>
                                                <p className="text-xs text-muted-foreground">{plan.checkin_date}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <Badge className={`${cfg.bgLight} ${cfg.textColor} ${cfg.border} border`}>
                                                {cfg.label}
                                            </Badge>
                                            <button
                                                onClick={() => handleDeletePlan(plan.id)}
                                                disabled={deleting === plan.id}
                                                className="p-1.5 rounded-lg hover:bg-red-500/10 text-muted-foreground hover:text-red-500 transition-colors disabled:opacity-50"
                                                title="Hapus jadwal"
                                            >
                                                {deleting === plan.id ? (
                                                    <Loader2 className="h-4 w-4 animate-spin" />
                                                ) : (
                                                    <Trash2 className="h-4 w-4" />
                                                )}
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
