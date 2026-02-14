"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Thermometer, Plus, Calendar, User, Trash2, Edit2, X, Check, ArrowLeft, FileText, Loader2 } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface SickReport {
    id: string;
    profile_id: string;
    leave_type: string;
    start_date: string;
    end_date: string;
    reason: string;
    status: string;
    attachment_url?: string;
    created_at: string;
    profile?: {
        full_name: string;
        avatar_url: string;
        job_type: string;
    };
}

interface Profile {
    id: string;
    full_name: string;
    avatar_url: string;
    job_type: string;
    role: string;
}

export default function SickReportsPage() {
    const supabase = createClient();
    const [reports, setReports] = useState<SickReport[]>([]);
    const [profiles, setProfiles] = useState<Profile[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);

    // Form state
    const [formData, setFormData] = useState({
        profile_id: "",
        start_date: "",
        end_date: "",
        reason: "",
        has_doctor_note: false,
        attachment_url: "",
    });

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);

        // Fetch sick reports
        const { data: reportsData } = await supabase
            .from("leave_requests")
            .select(`
                *,
                profile:profiles!profile_id(full_name, avatar_url, job_type)
            `)
            .eq("leave_type", "sick_leave")
            .order("start_date", { ascending: false });

        // Fetch all profiles for dropdown (exclude HR, CEO, Owner)
        const { data: profilesData } = await supabase
            .from("profiles")
            .select("id, full_name, avatar_url, job_type, role")
            .eq("is_active", true)
            .not("role", "in", '("hr","ceo","owner")')
            .order("full_name");

        setReports(reportsData || []);
        setProfiles(profilesData || []);
        setLoading(false);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);

        try {
            const insertData = {
                profile_id: formData.profile_id,
                leave_type: "sick_leave",
                start_date: formData.start_date,
                end_date: formData.end_date || formData.start_date,
                reason: `${formData.reason}${formData.has_doctor_note ? "\n\n✓ Surat dokter tersedia" : ""}`,
                attachment_url: formData.attachment_url || null,
                status: "pending", // Pending for CEO/super_admin approval
            };

            let error;
            if (editingId) {
                const result = await supabase
                    .from("leave_requests")
                    .update(insertData)
                    .eq("id", editingId);
                error = result.error;
            } else {
                const result = await supabase
                    .from("leave_requests")
                    .insert(insertData);
                error = result.error;
            }

            if (error) {
                alert("Gagal menyimpan: " + error.message);
            } else {
                alert(editingId ? "Laporan berhasil diperbarui" : "Laporan sakit berhasil diajukan. Menunggu approval.");
                resetForm();
                fetchData();
            }
        } catch (err) {
            alert("Terjadi kesalahan. Silakan coba lagi.");
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (confirm("Yakin ingin menghapus data laporan sakit ini?")) {
            await supabase.from("leave_requests").delete().eq("id", id);
            fetchData();
        }
    };

    const handleEdit = (report: SickReport) => {
        setFormData({
            profile_id: report.profile_id,
            start_date: report.start_date,
            end_date: report.end_date,
            reason: report.reason.replace("\n\n✓ Surat dokter tersedia", ""),
            has_doctor_note: report.reason.includes("Surat dokter tersedia"),
            attachment_url: report.attachment_url || "",
        });
        setEditingId(report.id);
        setShowForm(true);
    };

    const resetForm = () => {
        setFormData({ profile_id: "", start_date: "", end_date: "", reason: "", has_doctor_note: false, attachment_url: "" });
        setEditingId(null);
        setShowForm(false);
    };

    const calculateDuration = (start: string, end: string) => {
        const startDate = new Date(start);
        const endDate = new Date(end);
        const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
        return diffDays;
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case "approved":
                return <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">Approved</Badge>;
            case "pending":
                return <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">Pending</Badge>;
            case "rejected":
                return <Badge className="bg-rose-500/20 text-rose-400 border-rose-500/30">Rejected</Badge>;
            default:
                return <Badge>{status}</Badge>;
        }
    };

    return (
        <div className="space-y-6 pb-20">
            {/* Header */}
            <header className="flex flex-col gap-4 md:flex-row md:items-end justify-between">
                <div className="flex items-center gap-3">
                    <Link href="/dashboard/hr" className="p-2 rounded-lg hover:bg-white/5 transition-colors">
                        <ArrowLeft className="w-5 h-5 text-gray-400" />
                    </Link>
                    <div className="w-12 h-12 rounded-xl bg-rose-500/10 flex items-center justify-center">
                        <Thermometer className="w-6 h-6 text-rose-500" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-[var(--text-primary)]">Laporan Sakit</h1>
                        <p className="text-sm text-[var(--text-secondary)]">Kelola data sick leave karyawan</p>
                    </div>
                </div>
                <Button
                    onClick={() => setShowForm(!showForm)}
                    className="bg-rose-500 hover:bg-rose-600 text-white"
                >
                    <Plus className="w-4 h-4 mr-2" />
                    Tambah Laporan
                </Button>
            </header>

            {/* Form */}
            {showForm && (
                <Card className="glass-panel border-rose-500/20">
                    <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                            <Thermometer className="w-5 h-5 text-rose-500" />
                            {editingId ? "Edit Laporan Sakit" : "Tambah Laporan Sakit"}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-400">Karyawan</label>
                                <select
                                    value={formData.profile_id}
                                    onChange={(e) => setFormData({ ...formData, profile_id: e.target.value })}
                                    required
                                    className="w-full p-2 rounded-lg bg-white/5 border border-white/10 text-white focus:border-rose-500 focus:ring-1 focus:ring-rose-500 outline-none"
                                >
                                    <option value="">Pilih Karyawan</option>
                                    {profiles.map((p) => (
                                        <option key={p.id} value={p.id}>{p.full_name}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-400">Tanggal Mulai Sakit</label>
                                <input
                                    type="date"
                                    value={formData.start_date}
                                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                                    required
                                    className="w-full p-2 rounded-lg bg-white/5 border border-white/10 text-white focus:border-rose-500 focus:ring-1 focus:ring-rose-500 outline-none"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-400">Tanggal Selesai</label>
                                <input
                                    type="date"
                                    value={formData.end_date}
                                    onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                                    min={formData.start_date}
                                    className="w-full p-2 rounded-lg bg-white/5 border border-white/10 text-white focus:border-rose-500 focus:ring-1 focus:ring-rose-500 outline-none"
                                />
                                <p className="text-xs text-gray-500">Kosongkan jika hanya 1 hari</p>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-400">Surat Dokter</label>
                                <div
                                    onClick={() => setFormData({ ...formData, has_doctor_note: !formData.has_doctor_note })}
                                    className={`p-2 rounded-lg border cursor-pointer transition-colors ${formData.has_doctor_note ? "border-rose-500 bg-rose-500/10" : "border-white/10 bg-white/5"}`}
                                >
                                    <div className="flex items-center gap-2">
                                        <div className={`w-4 h-4 rounded border ${formData.has_doctor_note ? "bg-rose-500 border-rose-500" : "border-gray-500"} flex items-center justify-center`}>
                                            {formData.has_doctor_note && <Check className="w-3 h-3 text-white" />}
                                        </div>
                                        <span className="text-sm text-gray-300">Ada surat dokter</span>
                                    </div>
                                </div>
                            </div>
                            <div className="space-y-2 md:col-span-2">
                                <label className="text-sm font-medium text-gray-400">Keluhan / Gejala</label>
                                <textarea
                                    value={formData.reason}
                                    onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                                    placeholder="Contoh: Demam, batuk, pilek..."
                                    rows={2}
                                    required
                                    className="w-full p-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder:text-gray-500 focus:border-rose-500 focus:ring-1 focus:ring-rose-500 outline-none resize-none"
                                />
                            </div>
                            <div className="space-y-2 md:col-span-2">
                                <label className="text-sm font-medium text-gray-400">Link Bukti (Opsional)</label>
                                <input
                                    type="url"
                                    value={formData.attachment_url}
                                    onChange={(e) => setFormData({ ...formData, attachment_url: e.target.value })}
                                    placeholder="https://drive.google.com/..."
                                    className="w-full p-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder:text-gray-500 focus:border-rose-500 focus:ring-1 focus:ring-rose-500 outline-none"
                                />
                            </div>
                            <div className="md:col-span-2 flex gap-2 justify-end">
                                <Button type="button" variant="ghost" onClick={resetForm}>
                                    <X className="w-4 h-4 mr-1" /> Batal
                                </Button>
                                <Button type="submit" className="bg-rose-500 hover:bg-rose-600" disabled={submitting}>
                                    {submitting ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Check className="w-4 h-4 mr-1" />} {editingId ? "Simpan" : "Ajukan"}
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            )}

            {/* Reports List */}
            <div className="space-y-4">
                {loading ? (
                    <div className="text-center py-12 text-gray-400 flex flex-col items-center">
                        <Loader2 className="w-8 h-8 animate-spin mb-2" />
                        <p>Memuat data...</p>
                    </div>
                ) : reports.length === 0 ? (
                    <Card className="glass-panel">
                        <CardContent className="py-12 text-center">
                            <Thermometer className="w-12 h-12 mx-auto text-gray-600 mb-4" />
                            <p className="text-gray-400">Belum ada data laporan sakit</p>
                            <p className="text-sm text-gray-500">Klik tombol "Tambah Laporan" untuk menambahkan</p>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="grid gap-4">
                        {reports.map((report) => (
                            <Card key={report.id} className="glass-panel transition-colors">
                                <CardContent className="p-4">
                                    <div className="flex items-start justify-between">
                                        <div className="flex items-start gap-4">
                                            <div className="w-10 h-10 rounded-full bg-rose-500/10 flex items-center justify-center text-rose-500 font-bold">
                                                {report.profile?.full_name?.charAt(0) || "?"}
                                            </div>
                                            <div className="space-y-1">
                                                <div className="flex items-center gap-2">
                                                    <h3 className="font-bold text-white">{report.profile?.full_name}</h3>
                                                    {getStatusBadge(report.status)}
                                                </div>
                                                <div className="flex items-center gap-4 text-sm text-gray-400">
                                                    <span className="flex items-center gap-1">
                                                        <User className="w-3.5 h-3.5" />
                                                        {report.profile?.job_type}
                                                    </span>
                                                    <span className="flex items-center gap-1">
                                                        <Calendar className="w-3.5 h-3.5" />
                                                        {new Date(report.start_date).toLocaleDateString("id-ID")}
                                                        {report.start_date !== report.end_date && ` - ${new Date(report.end_date).toLocaleDateString("id-ID")}`}
                                                    </span>
                                                    <span className="text-rose-400 font-medium">
                                                        {calculateDuration(report.start_date, report.end_date)} hari
                                                    </span>
                                                </div>
                                                {report.reason && (
                                                    <p className="text-sm text-gray-500 mt-1">{report.reason}</p>
                                                )}
                                                {report.attachment_url && (
                                                    <a href={report.attachment_url} target="_blank" rel="noopener noreferrer" className="text-xs text-rose-400 hover:underline flex items-center gap-1">
                                                        <FileText className="w-3 h-3" /> Lihat Bukti
                                                    </a>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => handleEdit(report)}
                                                className="p-2 rounded-lg hover:bg-white/5 text-gray-400 hover:text-rose-400 transition-colors"
                                            >
                                                <Edit2 className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(report.id)}
                                                className="p-2 rounded-lg hover:bg-white/5 text-gray-400 hover:text-rose-400 transition-colors"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
