"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Briefcase, Home, MapPin, Plus, Calendar, User, Eye, Edit2, X, Check, Loader2, ChevronRight, AlertCircle } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";

interface Request {
    id: string;
    profile_id: string;
    leave_type: 'wfh' | 'wfa' | 'business_trip';
    start_date: string;
    end_date: string;
    reason: string;
    status: string;
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

const REQUEST_TYPES = [
    { id: 'wfh', label: 'Work From Home (WFH)', icon: Home },
    { id: 'wfa', label: 'Work From Anywhere (WFA)', icon: MapPin },
    { id: 'business_trip', label: 'Perjalanan Dinas', icon: Briefcase },
];

export default function WFHRequestsPage() {
    const supabase = createClient();
    const { profile: authProfile } = useAuth();

    // Access control
    const isFullHR = authProfile?.role === 'hr' || authProfile?.role === 'ceo' || authProfile?.role === 'super_admin' || authProfile?.role === 'owner';

    const [requests, setRequests] = useState<Request[]>([]);
    const [profiles, setProfiles] = useState<Profile[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    // Form state
    const [formData, setFormData] = useState({
        profile_id: "",
        leave_type: "wfh",
        start_date: "",
        end_date: "",
        reason: "",
        destination: "", // Only for business_trip
    });

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);

        // Fetch requests (wfh, wfa, business_trip)
        const { data: requestsData } = await supabase
            .from("leave_requests")
            .select(`
                *,
                profile:profiles!profile_id(full_name, avatar_url, job_type)
            `)
            .in("leave_type", ["wfh", "wfa", "business_trip"])
            .order("created_at", { ascending: false })
            .limit(50); // Limit to recent 50 for performance

        // Fetch all profiles for dropdown
        const { data: profilesData } = await supabase
            .from("profiles")
            .select("id, full_name, avatar_url, job_type, role")
            .eq("is_active", true)
            .not('role', 'in', '("hr","ceo","owner")') // Exclude HR, CEO, Owner
            .order("full_name");

        setRequests(requestsData as any || []);
        setProfiles(profilesData || []);
        setLoading(false);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);

        try {
            let finalReason = formData.reason;
            if (formData.leave_type === 'business_trip') {
                finalReason = `Destination: ${formData.destination}\n\n${formData.reason}`;
            }

            const insertData = {
                profile_id: formData.profile_id,
                leave_type: formData.leave_type,
                start_date: formData.start_date,
                end_date: formData.end_date || formData.start_date,
                reason: finalReason,
                status: "pending", // Always pending for approval
            };

            const { error } = await supabase
                .from("leave_requests")
                .insert(insertData);

            if (error) {
                alert("Gagal menyimpan: " + error.message);
            } else {
                alert("Request berhasil dibuatkan. Menunggu approval.");
                resetForm();
                fetchData();
            }
        } catch (err) {
            alert("Terjadi kesalahan. Silakan coba lagi.");
        } finally {
            setSubmitting(false);
        }
    };

    const resetForm = () => {
        setFormData({
            profile_id: "",
            leave_type: "wfh",
            start_date: "",
            end_date: "",
            reason: "",
            destination: ""
        });
        setShowForm(false);
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

    const getTypeIcon = (type: string) => {
        switch (type) {
            case 'wfh': return <Home className="w-4 h-4" />;
            case 'wfa': return <MapPin className="w-4 h-4" />;
            case 'business_trip': return <Briefcase className="w-4 h-4" />;
            default: return <Calendar className="w-4 h-4" />;
        }
    };

    const getTypeLabel = (type: string) => {
        const found = REQUEST_TYPES.find(t => t.id === type);
        return found ? found.label : type.toUpperCase();
    };

    return (
        <div className="space-y-6 pb-20">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-violet-500/10 flex items-center justify-center">
                        <MapPin className="w-6 h-6 text-violet-500" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2 mb-1 text-sm text-[var(--text-secondary)]">
                            <Link href="/dashboard" className="hover:text-[var(--text-primary)] transition-colors">Dashboard</Link>
                            <ChevronRight className="h-4 w-4" />
                            <Link href="/dashboard/hr" className="hover:text-[var(--text-primary)] transition-colors">Human Resource</Link>
                            <ChevronRight className="h-4 w-4" />
                            <span>WFH/WFA/Dinas Report</span>
                        </div>
                        <h1 className="text-2xl font-bold text-[var(--text-primary)]">WFH/WFA/Dinas Report</h1>
                        <p className="text-sm text-[var(--text-secondary)]">Kelola laporan WFH/WFA/Dinas untuk karyawan</p>
                    </div>
                </div>
                {isFullHR && (
                    <Button
                        onClick={() => setShowForm(!showForm)}
                        className="bg-violet-500 hover:bg-violet-600 text-white"
                    >
                        <Plus className="w-4 h-4 mr-2" />
                        Buat Request Baru
                    </Button>
                )}
            </div>

            {/* Form */}
            {showForm && isFullHR && (
                <Card className="glass-panel border-violet-500/20">
                    <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                            <Plus className="w-5 h-5 text-violet-500" />
                            Form Request Baru
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Employee Select */}
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-400">Karyawan</label>
                                <select
                                    value={formData.profile_id}
                                    onChange={(e) => setFormData({ ...formData, profile_id: e.target.value })}
                                    required
                                    className="w-full p-2 rounded-lg bg-white/5 border border-white/10 text-white focus:border-violet-500 focus:ring-1 focus:ring-violet-500 outline-none"
                                >
                                    <option value="">Pilih Karyawan</option>
                                    {profiles.map((p) => (
                                        <option key={p.id} value={p.id}>{p.full_name} ({p.role})</option>
                                    ))}
                                </select>
                            </div>

                            {/* Type Select */}
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-400">Tipe Request</label>
                                <select
                                    value={formData.leave_type}
                                    onChange={(e) => setFormData({ ...formData, leave_type: e.target.value })}
                                    required
                                    className="w-full p-2 rounded-lg bg-white/5 border border-white/10 text-white focus:border-violet-500 focus:ring-1 focus:ring-violet-500 outline-none"
                                >
                                    {REQUEST_TYPES.map(t => (
                                        <option key={t.id} value={t.id}>{t.label}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Dates */}
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-400">Tanggal Mulai</label>
                                <input
                                    type="date"
                                    value={formData.start_date}
                                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                                    required
                                    className="w-full p-2 rounded-lg bg-white/5 border border-white/10 text-white focus:border-violet-500 focus:ring-1 focus:ring-violet-500 outline-none"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-400">Tanggal Selesai</label>
                                <input
                                    type="date"
                                    value={formData.end_date}
                                    onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                                    min={formData.start_date}
                                    className="w-full p-2 rounded-lg bg-white/5 border border-white/10 text-white focus:border-violet-500 focus:ring-1 focus:ring-violet-500 outline-none"
                                />
                                <p className="text-xs text-gray-500">Kosongkan jika hanya 1 hari</p>
                            </div>

                            {/* Destination (Only for Business Trip) */}
                            {formData.leave_type === 'business_trip' && (
                                <div className="space-y-2 md:col-span-2">
                                    <label className="text-sm font-medium text-gray-400">Destinasi</label>
                                    <input
                                        type="text"
                                        value={formData.destination}
                                        onChange={(e) => setFormData({ ...formData, destination: e.target.value })}
                                        placeholder="Kota Tujuan"
                                        required
                                        className="w-full p-2 rounded-lg bg-white/5 border border-white/10 text-white focus:border-violet-500 focus:ring-1 focus:ring-violet-500 outline-none"
                                    />
                                </div>
                            )}

                            {/* Reason */}
                            <div className="space-y-2 md:col-span-2">
                                <label className="text-sm font-medium text-gray-400">Alasan / Keperluan</label>
                                <textarea
                                    value={formData.reason}
                                    onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                                    placeholder="Jelaskan alasan..."
                                    rows={3}
                                    required
                                    className="w-full p-2 rounded-lg bg-white/5 border border-white/10 text-white focus:border-violet-500 focus:ring-1 focus:ring-violet-500 outline-none resize-none"
                                />
                            </div>

                            {/* Buttons */}
                            <div className="md:col-span-2 flex gap-2 justify-end pt-2">
                                <Button type="button" variant="ghost" onClick={resetForm}>
                                    <X className="w-4 h-4 mr-1" /> Batal
                                </Button>
                                <Button type="submit" className="bg-violet-500 hover:bg-violet-600" disabled={submitting}>
                                    {submitting ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Check className="w-4 h-4 mr-1" />}
                                    Buatkan Request
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            )}

            {/* List */}
            <div className="space-y-4">
                <h3 className="text-lg font-bold text-[var(--text-primary)]">Riwayat Request Terkini</h3>
                {loading ? (
                    <div className="text-center py-12 text-gray-400 flex flex-col items-center">
                        <Loader2 className="w-8 h-8 animate-spin mb-2" />
                        <p>Memuat data...</p>
                    </div>
                ) : requests.length === 0 ? (
                    <Card className="glass-panel">
                        <CardContent className="py-12 text-center">
                            <MapPin className="w-12 h-12 mx-auto text-gray-600 mb-4" />
                            <p className="text-gray-400">Belum ada data request WFH/WFA/Dinas terbaru</p>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="grid gap-4">
                        {requests.map((req) => (
                            <Card key={req.id} className="glass-panel hover:bg-white/5 transition-colors">
                                <CardContent className="p-4">
                                    <div className="flex items-start justify-between">
                                        <div className="flex items-start gap-4">
                                            <div className="w-10 h-10 rounded-full bg-violet-500/10 flex items-center justify-center text-violet-500 font-bold">
                                                {req.profile?.full_name?.charAt(0) || "?"}
                                            </div>
                                            <div className="space-y-1">
                                                <div className="flex items-center gap-2">
                                                    <h3 className="font-bold text-white">{req.profile?.full_name}</h3>
                                                    {getStatusBadge(req.status)}
                                                </div>
                                                <div className="flex items-center gap-4 text-sm text-gray-400">
                                                    <span className="flex items-center gap-1 text-violet-400">
                                                        {getTypeIcon(req.leave_type)}
                                                        {getTypeLabel(req.leave_type)}
                                                    </span>
                                                    <span className="flex items-center gap-1">
                                                        <Calendar className="w-3.5 h-3.5" />
                                                        {new Date(req.start_date).toLocaleDateString("id-ID")}
                                                        {req.start_date !== req.end_date && ` - ${new Date(req.end_date).toLocaleDateString("id-ID")}`}
                                                    </span>
                                                </div>
                                                <p className="text-sm text-gray-500 mt-1 line-clamp-2">{req.reason}</p>
                                            </div>
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
